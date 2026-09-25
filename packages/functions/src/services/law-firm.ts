/**
 * Partner law-firm portal: firm entity, membership, firm-scoped claim
 * access, case events and document exchange.
 *
 * Every claim query for a firm goes through `firmClaimScope()`, which
 * requires handling_route = 'law_firm' AND law_firm_id = <firm>. A route
 * that forgets the scope sees nothing, which is the safe failure.
 */

import { and, desc, eq, ilike, or, sql, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import { AuthService } from '../utils/auth';
import { downloadFile, getPresignedUrl, uploadFile } from '../utils/s3';
import {
  auditLogs,
  documents,
  lawFirmMembers,
  lawFirms,
  profiles,
  users,
  type LawFirmMemberRole,
} from '../drizzle/schema/shared';
import {
  caseIdentifier,
  caseTypeLabel,
  claimCorrespondence,
  claimDocuments,
  claimsTable,
  claimWorkflowStates,
  isBavCashout,
  resolveCaseType,
  type ClaimCaseType,
  type LawFirmCaseEvent,
  type LawFirmCaseState,
  type LawFirmSubmissionChannel,
} from '../drizzle/schema/claims';
import {
  sendLawFirmInviteEmail,
  sendLawFirmNewCaseEmail,
  sendOpsLawFirmActivityEmail,
} from './email';
import { UserService } from './user';
import { ClaimsApplicationService } from './claims-application';
import {
  caseCopyBlock,
  caseVisibility,
  downloadGate,
  isSubmissionOverdue,
  isValidAktenzeichen,
  normalizeAktenzeichen,
  rereleaseUntil,
  submissionDeadline,
  submissionPackFileName,
  type CaseVisibility,
} from './law-firm-rules';
import {
  attachmentAsPdf,
  drvPackClientFromClaim,
  submissionPackKey,
} from './law-firm-pack';
import { buildSubmissionPack, type PackManifest } from './drv-pack/pack';
import { resolveCarrier } from './drv-pack/resolve-carrier';

/** Seeded by migration 0010; the single firm the UI assumes for now. */
export const DEFAULT_LAW_FIRM_ID = '4d7c1a2e-5b3f-4c8a-9e1d-2f6b7a8c9d01';

/** Presigned download URLs handed to the firm expire after 15 minutes. */
export const LAW_FIRM_DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

export const CORRESPONDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const CORRESPONDENCE_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

// ---------------------------------------------------------------------------
// Case state machine (pure)
// ---------------------------------------------------------------------------

const CASE_STATE_ORDER: LawFirmCaseState[] = [
  'new',
  'downloaded',
  'submitted',
  'response_received',
  'closed',
];

const EVENT_TARGET_STATE: Record<LawFirmCaseEvent, LawFirmCaseState> = {
  downloaded: 'downloaded',
  submitted: 'submitted',
  response_received: 'response_received',
  closed: 'closed',
};

/**
 * Case state after an event. Events only move forward; recording an
 * earlier event again (a second download, a second reply) keeps the
 * current state. `null` current state counts as 'new'.
 */
export function nextCaseState(
  current: LawFirmCaseState | null | undefined,
  event: LawFirmCaseEvent
): LawFirmCaseState {
  const from = current ?? 'new';
  const target = EVENT_TARGET_STATE[event];
  return CASE_STATE_ORDER.indexOf(target) > CASE_STATE_ORDER.indexOf(from)
    ? target
    : from;
}

/**
 * Whether an event makes sense from the current state. Submitting before
 * downloading is allowed (the firm may have printed from an earlier
 * download session); closing a case that never reached the provider is
 * allowed too (e.g. withdrawn). Only 'response_received' needs a prior
 * submission, and nothing can be recorded on a closed case.
 */
export function canRecordEvent(
  current: LawFirmCaseState | null | undefined,
  event: LawFirmCaseEvent
): { ok: true } | { ok: false; reason: string } {
  const from = current ?? 'new';
  if (from === 'closed') {
    return { ok: false, reason: 'The case is closed' };
  }
  if (
    event === 'response_received' &&
    CASE_STATE_ORDER.indexOf(from) < CASE_STATE_ORDER.indexOf('submitted')
  ) {
    return {
      ok: false,
      reason: 'Record the submission to the provider before a response',
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LawFirmSummary {
  id: string;
  name: string;
  contactEmail: string | null;
  notificationEmail: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  active: boolean;
}

export interface LawFirmMembership {
  id: string;
  lawFirmId: string;
  userId: string;
  role: LawFirmMemberRole;
  active: boolean;
  firstSignInAt: Date | null;
  createdAt: Date | null;
}

export interface FirmQueueSummary {
  total: number;
  new: number;
  missingRef: number;
  awaitingProvider: number;
  responseReceived: number;
  closed: number;
}

export interface FirmContext {
  firm: LawFirmSummary;
  membership: LawFirmMembership;
}

export interface FirmClaimListItem {
  id: string;
  claimantName: string | null;
  status: string | null;
  pensionType: string | null;
  /** Case type and its portal label ("DRV refund" / "Company pension"). */
  caseType: ClaimCaseType;
  caseTypeLabel: string;
  /** VSNR (DRV refund) or contract number (bAV); null for VBL refunds. */
  caseIdentifier: { label: string; value: string | null } | null;
  bavRoute: 'A' | 'B' | null;
  lawFirmRef: string | null;
  caseState: LawFirmCaseState;
  assignedAt: Date | null;
  submittedAt: Date | null;
  packageReady: boolean;
  updatedAt: Date | null;
}

export interface CorrespondenceItem {
  id: string;
  claimId: string;
  direction: string;
  source: string;
  note: string | null;
  receivedDate: string | null;
  createdAt: Date | null;
  uploadedBy: { id: string; email: string | null } | null;
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null;
}

export interface CaseEventEntry {
  id: string;
  event: string;
  actor: string | null;
  note: string | null;
  date: string | null;
  channel: string | null;
  createdAt: Date | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapFirm(row: typeof lawFirms.$inferSelect): LawFirmSummary {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactEmail,
    notificationEmail: row.notificationEmail,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    active: row.active,
  };
}

function mapMembership(
  row: typeof lawFirmMembers.$inferSelect
): LawFirmMembership {
  return {
    id: row.id,
    lawFirmId: row.lawFirmId,
    userId: row.userId,
    role: row.role as LawFirmMemberRole,
    active: row.active,
    firstSignInAt: row.firstSignInAt ?? null,
    createdAt: row.createdAt,
  };
}

/** The firm filter every portal query must carry. */
export function firmClaimScope(firmId: string) {
  return and(
    eq(claimsTable.handlingRoute, 'law_firm'),
    eq(claimsTable.lawFirmId, firmId)
  );
}

/**
 * What the firm can see: released, and either not yet submitted or inside
 * an ops re-release window (see `caseVisibility` in law-firm-rules).
 */
export function firmVisibleScope(firmId: string) {
  return and(
    firmClaimScope(firmId),
    sql`${claimsTable.lawFirmReleasedAt} is not null`,
    sql`(${claimsTable.lawFirmSubmittedAt} is null or ${claimsTable.lawFirmRereleasedUntil} > now())`
  );
}

type ClaimRow = typeof claimsTable.$inferSelect;

function visibilityOf(claim: ClaimRow, now = new Date()): CaseVisibility {
  return caseVisibility({
    releasedAt: claim.lawFirmReleasedAt,
    firmSubmittedAt: claim.lawFirmSubmittedAt,
    rereleasedUntil: claim.lawFirmRereleasedUntil,
    now,
  });
}

/** "Copy all" block for the firm's own system (field order = case screen). */
export function caseCopyBlockFor(claim: ClaimRow): string {
  const ident = caseIdentifier(claim);
  return caseCopyBlock([
    { label: 'Case type', value: caseTypeLabel(resolveCaseType(claim)) },
    ...(ident && ident.label !== 'VSNR'
      ? [{ label: ident.label, value: ident.value }]
      : []),
    { label: 'Name', value: claimantName(claim) },
    { label: 'Date of birth', value: claim.dateOfBirth },
    { label: 'Nationality', value: claim.nationality },
    {
      label: 'Address',
      value: [
        claim.currentAddressLine1,
        claim.currentAddressLine2,
        [claim.currentPostalCode, claim.currentCity].filter(Boolean).join(' '),
        claim.currentCountry,
      ]
        .filter(Boolean)
        .join(', '),
    },
    { label: 'Insurance number (VSNR)', value: claim.vsnr },
    {
      label: 'Last German address',
      value: [
        claim.germanStreet,
        [claim.germanPostalCode, claim.germanCity].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(', '),
    },
    { label: 'Left Germany', value: claim.moveOutDate },
    { label: 'Aktenzeichen', value: claim.lawFirmRef },
  ]);
}

function claimantName(row: {
  firstName: string | null;
  lastName: string | null;
}): string | null {
  return row.firstName && row.lastName
    ? `${row.firstName} ${row.lastName}`
    : null;
}

function bavRoute(drvRefundReceived: boolean | null): 'A' | 'B' | null {
  if (drvRefundReceived === true) return 'A';
  if (drvRefundReceived === false) return 'B';
  return null;
}

export function maskIban(iban: string | null): string | null {
  if (!iban) return null;
  const compact = iban.replace(/\s+/g, '');
  if (compact.length <= 8) return compact;
  return `${compact.slice(0, 4)} **** **** ${compact.slice(-4)}`;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function adminClaimUrl(claimId: string): string {
  return `${env.ADMIN_URL.replace(/\/$/, '')}/claims/${claimId}`;
}

function portalCaseUrl(claimId: string): string {
  return `${env.ADMIN_URL.replace(/\/$/, '')}/portal/claims/${claimId}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class LawFirmService {
  // ---------------- firms & membership ----------------

  static async listFirms(): Promise<LawFirmSummary[]> {
    const rows = await db.select().from(lawFirms).orderBy(lawFirms.name);
    return rows.map(mapFirm);
  }

  static async getFirm(firmId: string): Promise<LawFirmSummary | null> {
    const [row] = await db
      .select()
      .from(lawFirms)
      .where(eq(lawFirms.id, firmId))
      .limit(1);
    return row ? mapFirm(row) : null;
  }

  /** The firm new law-firm claims are assigned to: the only active one. */
  static async getDefaultFirm(): Promise<LawFirmSummary | null> {
    const [seeded] = await db
      .select()
      .from(lawFirms)
      .where(
        and(eq(lawFirms.id, DEFAULT_LAW_FIRM_ID), eq(lawFirms.active, true))
      )
      .limit(1);
    if (seeded) return mapFirm(seeded);
    const [anyActive] = await db
      .select()
      .from(lawFirms)
      .where(eq(lawFirms.active, true))
      .orderBy(lawFirms.createdAt)
      .limit(1);
    return anyActive ? mapFirm(anyActive) : null;
  }

  /** Firm + membership for a signed-in user, or null when they have none. */
  static async getFirmContext(userId: string): Promise<FirmContext | null> {
    const [row] = await db
      .select({ member: lawFirmMembers, firm: lawFirms })
      .from(lawFirmMembers)
      .innerJoin(lawFirms, eq(lawFirmMembers.lawFirmId, lawFirms.id))
      .where(
        and(
          eq(lawFirmMembers.userId, userId),
          eq(lawFirmMembers.active, true),
          eq(lawFirms.active, true)
        )
      )
      .limit(1);
    if (!row) return null;
    return { firm: mapFirm(row.firm), membership: mapMembership(row.member) };
  }

  static async listMembers(firmId: string): Promise<
    Array<
      LawFirmMembership & {
        email: string;
        firstName: string | null;
        lastName: string | null;
        invitedBy: string | null;
      }
    >
  > {
    const rows = await db
      .select({
        member: lawFirmMembers,
        email: users.email,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
      })
      .from(lawFirmMembers)
      .innerJoin(users, eq(lawFirmMembers.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(lawFirmMembers.lawFirmId, firmId))
      .orderBy(desc(lawFirmMembers.createdAt));
    return rows.map((r) => ({
      ...mapMembership(r.member),
      email: r.email,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      invitedBy: r.member.invitedBy,
    }));
  }

  /**
   * Ops invites a named person at the firm. Finds or creates the user,
   * sets role = 'law_firm', records the membership and mails a sign-in
   * link that opens the admin app (which routes law-firm users to the
   * portal). An existing admin keeps the admin role and gains the
   * membership, so ops/developers can check the portal with one account.
   */
  static async inviteMember(
    firmId: string,
    adminUserId: string,
    input: {
      email: string;
      firstName: string;
      lastName: string;
      role?: LawFirmMemberRole;
    }
  ): Promise<LawFirmMembership & { email: string; magicLinkUrl?: string }> {
    const firm = await this.getFirm(firmId);
    if (!firm) throw new Error('Law firm not found');
    if (!firm.active) throw new Error('Law firm is inactive');

    const email = input.email.trim().toLowerCase();
    let user = await UserService.findByEmail(email);
    const keepsAdminRole = user?.role === 'admin';
    if (!user) {
      user = await UserService.createUser({
        email,
        password: '',
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        skipPasswordHash: true,
      });
    }

    const [existing] = await db
      .select()
      .from(lawFirmMembers)
      .where(eq(lawFirmMembers.userId, user.id))
      .limit(1);
    if (existing && existing.lawFirmId !== firmId) {
      throw new Error('Invalid invite: this user belongs to another firm');
    }

    const role: LawFirmMemberRole = input.role ?? 'member';
    const membership = await db.transaction(async (tx: any) => {
      if (!keepsAdminRole) {
        await tx
          .update(users)
          .set({ role: 'law_firm', updatedAt: new Date() })
          .where(eq(users.id, user!.id));
      }

      let row: typeof lawFirmMembers.$inferSelect;
      if (existing) {
        [row] = await tx
          .update(lawFirmMembers)
          .set({ role, active: true, updatedAt: new Date() })
          .where(eq(lawFirmMembers.id, existing.id))
          .returning();
      } else {
        [row] = await tx
          .insert(lawFirmMembers)
          .values({
            lawFirmId: firmId,
            userId: user!.id,
            role,
            invitedBy: adminUserId,
          })
          .returning();
      }

      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'law_firm_member_invited',
        resource: 'law_firm',
        resourceId: firmId,
        details: {
          memberUserId: user!.id,
          email,
          role,
          reinvite: !!existing,
          keepsAdminRole,
        },
      });
      return row;
    });

    const token = AuthService.generateMagicLinkToken(email);
    const magicLinkUrl = AuthService.generateMagicLinkUrl(token, env.ADMIN_URL);
    await sendLawFirmInviteEmail(email, { firmName: firm.name, magicLinkUrl });
    logger.info(`Law-firm member invited: ${email} -> ${firm.name}`);

    return {
      ...mapMembership(membership),
      email,
      ...(env.NODE_ENV === 'development' ? { magicLinkUrl } : {}),
    };
  }

  /** Deactivates a membership and drops the user's law_firm role. */
  static async removeMember(
    firmId: string,
    memberId: string,
    adminUserId: string
  ): Promise<boolean> {
    const [row] = await db
      .select()
      .from(lawFirmMembers)
      .where(
        and(
          eq(lawFirmMembers.id, memberId),
          eq(lawFirmMembers.lawFirmId, firmId)
        )
      )
      .limit(1);
    if (!row) return false;
    await db.transaction(async (tx: any) => {
      await tx
        .update(lawFirmMembers)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(lawFirmMembers.id, memberId));
      await tx
        .update(users)
        .set({ role: 'user', updatedAt: new Date() })
        .where(and(eq(users.id, row.userId), eq(users.role, 'law_firm')));
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'law_firm_member_removed',
        resource: 'law_firm',
        resourceId: firmId,
        details: { memberUserId: row.userId, membershipId: memberId },
      });
    });
    return true;
  }

  // ---------------- assignment (called from the routing switch) ----------------

  /**
   * Assign a claim to the default firm when ops switch handling to the law
   * firm. Regenerates the bAV package as the LAW variant when the claim is
   * past draft (non-fatal) and notifies the firm. Returns the firm id.
   */
  static async assignClaimToDefaultFirm(
    claimId: string,
    adminUserId: string
  ): Promise<string | null> {
    const firm = await this.getDefaultFirm();
    if (!firm) {
      logger.warn('No active law firm to assign the claim to', { claimId });
      return null;
    }
    const now = new Date();
    await db
      .update(claimsTable)
      .set({
        lawFirmId: firm.id,
        lawFirmAssignedAt: now,
        lawFirmCaseState: 'new',
        // Assignment releases the case to the firm (visible until submitted).
        lawFirmReleasedAt: now,
        lawFirmReleasedBy: adminUserId,
        lawFirmRereleasedUntil: null,
        updatedAt: now,
      })
      .where(eq(claimsTable.id, claimId));

    const claim = await ClaimsApplicationService.getClaimAsAdmin(claimId);
    if (!claim) return firm.id;

    if (isBavCashout(claim) && claim.status !== 'draft') {
      try {
        const { BavLetterPackageService } = await import('./bav-letters');
        await BavLetterPackageService.generateAndStoreForClaim(
          claimId,
          adminUserId,
          { asAdmin: true }
        );
      } catch (error) {
        logger.warn('LAW package regeneration on assignment failed', {
          claimId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const to = firm.notificationEmail ?? firm.contactEmail;
    if (to && claim.status !== 'draft') {
      await sendLawFirmNewCaseEmail(to, {
        firmName: firm.name,
        claimantName: claimantName(claim) ?? 'a claimant',
        claimId,
        caseUrl: portalCaseUrl(claimId),
        lawFirmRef: claim.lawFirmRef,
      }).catch(() => false);
    }
    return firm.id;
  }

  /**
   * Clears the assignment when handling goes back to direct and, for bAV
   * claims past draft, regenerates the package as the DIRECT variant so
   * the stored letter no longer carries the firm's letterhead and
   * Vollmacht (non-fatal, ops can regenerate from the admin).
   */
  static async unassignClaim(
    claimId: string,
    adminUserId: string
  ): Promise<void> {
    await db
      .update(claimsTable)
      .set({
        lawFirmId: null,
        lawFirmAssignedAt: null,
        lawFirmCaseState: null,
        updatedAt: new Date(),
      })
      .where(eq(claimsTable.id, claimId));

    const claim = await ClaimsApplicationService.getClaimAsAdmin(claimId);
    if (claim && isBavCashout(claim) && claim.status !== 'draft') {
      try {
        const { BavLetterPackageService } = await import('./bav-letters');
        await BavLetterPackageService.generateAndStoreForClaim(
          claimId,
          adminUserId,
          { asAdmin: true }
        );
      } catch (error) {
        logger.warn('DIRECT package regeneration on unassignment failed', {
          claimId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /** Stamps the member's first sign-in (called from magic-link verify). */
  static async markSignedIn(userId: string): Promise<void> {
    await db
      .update(lawFirmMembers)
      .set({ firstSignInAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(lawFirmMembers.userId, userId),
          sql`${lawFirmMembers.firstSignInAt} IS NULL`
        )
      );
  }

  // ---------------- firm-scoped claims ----------------

  /** Counts for the portal's header strip. */
  static async getQueueSummary(firmId: string): Promise<FirmQueueSummary> {
    const scope = and(
      firmVisibleScope(firmId),
      sql`${claimsTable.status} <> 'draft'`
    );
    const [row] = await db
      .select({
        total: count(),
        new: sql<number>`count(*) filter (where coalesce(${claimsTable.lawFirmCaseState}, 'new') = 'new')`,
        missingRef: sql<number>`count(*) filter (where coalesce(${claimsTable.lawFirmRef}, '') = '' and coalesce(${claimsTable.lawFirmCaseState}, 'new') <> 'closed')`,
        awaitingProvider: sql<number>`count(*) filter (where ${claimsTable.lawFirmCaseState} = 'submitted')`,
        responseReceived: sql<number>`count(*) filter (where ${claimsTable.lawFirmCaseState} = 'response_received')`,
        closed: sql<number>`count(*) filter (where ${claimsTable.lawFirmCaseState} = 'closed')`,
      })
      .from(claimsTable)
      .where(scope);
    return {
      total: Number(row?.total ?? 0),
      new: Number(row?.new ?? 0),
      missingRef: Number(row?.missingRef ?? 0),
      awaitingProvider: Number(row?.awaitingProvider ?? 0),
      responseReceived: Number(row?.responseReceived ?? 0),
      closed: Number(row?.closed ?? 0),
    };
  }

  static async listClaimsForFirm(
    firmId: string,
    filters: {
      caseState?: string;
      missingRef?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    claims: FirmClaimListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [
      firmVisibleScope(firmId),
      // Drafts are the claimant's; the firm sees a case once it is in.
      // Released-only, hidden once the submission date is saved.
      sql`${claimsTable.status} <> 'draft'`,
    ];
    if (filters.caseState) {
      conditions.push(
        filters.caseState === 'new'
          ? sql`coalesce(${claimsTable.lawFirmCaseState}, 'new') = 'new'`
          : eq(claimsTable.lawFirmCaseState, filters.caseState)
      );
    }
    if (filters.missingRef) {
      conditions.push(
        sql`coalesce(${claimsTable.lawFirmRef}, '') = '' and coalesce(${claimsTable.lawFirmCaseState}, 'new') <> 'closed'`
      );
    }
    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(claimsTable.firstName, pattern),
          ilike(claimsTable.lastName, pattern),
          sql`concat(${claimsTable.firstName}, ' ', ${claimsTable.lastName}) ILIKE ${pattern}`,
          ilike(claimsTable.lawFirmRef, pattern)
        )!
      );
    }
    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ value: count() })
      .from(claimsTable)
      .where(whereClause);

    const rows = await db
      .select({
        id: claimsTable.id,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
        status: claimsTable.status,
        pensionType: claimsTable.pensionType,
        caseType: claimsTable.caseType,
        applicationId: claimsTable.applicationId,
        vsnr: claimsTable.vsnr,
        bavContractReference: claimsTable.bavContractReference,
        drvRefundReceived: claimsTable.drvRefundReceived,
        lawFirmRef: claimsTable.lawFirmRef,
        lawFirmCaseState: claimsTable.lawFirmCaseState,
        lawFirmAssignedAt: claimsTable.lawFirmAssignedAt,
        submittedAt: claimsTable.submittedAt,
        pdfS3Key: claimsTable.pdfS3Key,
        updatedAt: claimsTable.updatedAt,
      })
      .from(claimsTable)
      .where(whereClause)
      .orderBy(desc(claimsTable.lawFirmAssignedAt), desc(claimsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      claims: rows.map((r) => ({
        id: r.id,
        claimantName: claimantName(r),
        status: r.status,
        pensionType: r.pensionType,
        caseType: resolveCaseType(r),
        caseTypeLabel: caseTypeLabel(resolveCaseType(r)),
        caseIdentifier: caseIdentifier(r),
        bavRoute: bavRoute(r.drvRefundReceived),
        lawFirmRef: r.lawFirmRef,
        caseState: (r.lawFirmCaseState ?? 'new') as LawFirmCaseState,
        assignedAt: r.lawFirmAssignedAt,
        submittedAt: r.submittedAt,
        packageReady: !!r.pdfS3Key,
        updatedAt: r.updatedAt,
      })),
      total: countRow?.value ?? 0,
      page,
      limit,
    };
  }

  /**
   * Full claim row, only if it is in the firm's scope. `visibleOnly`
   * additionally applies the release/submission visibility rule (case
   * screen and downloads); events and correspondence keep the wider scope.
   */
  static async getClaimRowForFirm(
    firmId: string,
    claimId: string,
    opts: { visibleOnly?: boolean } = {}
  ) {
    const scope = opts.visibleOnly
      ? firmVisibleScope(firmId)
      : firmClaimScope(firmId);
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(and(scope, eq(claimsTable.id, claimId)))
      .limit(1);
    return row ?? null;
  }

  /** What the firm sees on the case screen. No bank account beyond a mask. */
  static async getCaseDetailForFirm(firmId: string, claimId: string) {
    const claim = await this.getClaimRowForFirm(firmId, claimId, {
      visibleOnly: true,
    });
    if (!claim || claim.status === 'draft') return null;
    const gate = downloadGate({
      releasedAt: claim.lawFirmReleasedAt,
      firmSubmittedAt: claim.lawFirmSubmittedAt,
      rereleasedUntil: claim.lawFirmRereleasedUntil,
      lawFirmRef: claim.lawFirmRef,
    });
    const drv = isBavCashout(claim) ? null : drvPackClientFromClaim(claim);

    const [correspondence, events, userInfo] = await Promise.all([
      this.listCorrespondence(claimId),
      this.listCaseEvents(claimId),
      ClaimsApplicationService.getClaimUserInfo(claimId),
    ]);

    return {
      claim: {
        id: claim.id,
        status: claim.status,
        pensionType: claim.pensionType,
        caseType: resolveCaseType(claim),
        caseTypeLabel: caseTypeLabel(resolveCaseType(claim)),
        caseIdentifier: caseIdentifier(claim),
        caseState: (claim.lawFirmCaseState ?? 'new') as LawFirmCaseState,
        lawFirmRef: claim.lawFirmRef,
        payoutTarget: claim.payoutTarget,
        assignedAt: claim.lawFirmAssignedAt,
        downloadedAt: claim.lawFirmDownloadedAt,
        firmSubmittedAt: claim.lawFirmSubmittedAt,
        submissionChannel: claim.lawFirmSubmissionChannel,
        responseAt: claim.lawFirmResponseAt,
        closedAt: claim.lawFirmClosedAt,
        submittedAt: claim.submittedAt,
        packageReady: !!claim.pdfS3Key,
        copyReady: !!claim.copyPdfS3Key,
        visibility: visibilityOf(claim),
        releasedAt: claim.lawFirmReleasedAt,
        rereleasedUntil: claim.lawFirmRereleasedUntil,
        submissionDeadline: claim.lawFirmDownloadedAt
          ? submissionDeadline(claim.lawFirmDownloadedAt)
          : null,
        aktenzeichenValid: isValidAktenzeichen(claim.lawFirmRef),
        download: gate.ok
          ? { allowed: true as const }
          : { allowed: false as const, reason: gate.reason },
        pack: {
          frozen: !!claim.submissionPackS3Key,
          generatedAt: claim.submissionPackGeneratedAt,
          manifest: (claim.submissionPackManifest ??
            null) as PackManifest | null,
          missingData: drv?.missing ?? [],
        },
        copyBlock: caseCopyBlockFor(claim),
        claimant: {
          name: claimantName(claim),
          salutation: claim.salutation,
          firstName: claim.firstName,
          lastName: claim.lastName,
          dateOfBirth: claim.dateOfBirth,
          nationality: claim.nationality,
          email: userInfo?.email ?? null,
          address: {
            line1: claim.currentAddressLine1,
            line2: claim.currentAddressLine2,
            city: claim.currentCity,
            postalCode: claim.currentPostalCode,
            country: claim.currentCountry,
          },
          germanAddress: {
            street: claim.germanStreet,
            postalCode: claim.germanPostalCode,
            city: claim.germanCity,
            moveOutDate: claim.moveOutDate,
          },
          taxId: claim.taxId,
          ibanMasked: maskIban(claim.iban),
          accountHolderName: claim.accountHolderName,
        },
        bav: {
          route: bavRoute(claim.drvRefundReceived),
          employerName: claim.employerName,
          employmentEndDate: claim.employmentEndDate,
          providerName: claim.bavProviderName,
          durchfuehrungsweg: claim.bavDurchfuehrungsweg,
          contractReferenceLabel: claim.bavContractReferenceLabel,
          contractReference: claim.bavContractReference,
          drvOffice: claim.drvOffice,
          drvDecisionDate: claim.drvDecisionDate,
          statementType: claim.bavStatementType,
          statementDate: claim.bavStatementDate,
          benefitForm: claim.bavBenefitForm,
          benefitAmount: claim.bavBenefitAmount,
          addresseeType: claim.bavAddresseeType,
          recipient: {
            name: claim.bavRecipientName,
            department: claim.bavRecipientDepartment,
            street: claim.bavRecipientStreet,
            postalCode: claim.bavRecipientPostalCode,
            city: claim.bavRecipientCity,
            ref: claim.bavRecipientRef,
          },
        },
      },
      correspondence,
      events,
    };
  }

  /**
   * Presigned URL for the package or the copy print. The first package
   * download moves the case to 'downloaded'.
   */
  static async getDownloadForFirm(
    firmId: string,
    claimId: string,
    userId: string,
    kind: 'package' | 'copy',
    ip: string | null = null
  ): Promise<{ downloadUrl: string | null; fileName: string } | null> {
    const claim = await this.getClaimRowForFirm(firmId, claimId, {
      visibleOnly: true,
    });
    if (!claim || claim.status === 'draft') return null;

    let key: string | null;
    let fileName: string;
    if (kind === 'package') {
      const gate = downloadGate({
        releasedAt: claim.lawFirmReleasedAt,
        firmSubmittedAt: claim.lawFirmSubmittedAt,
        rereleasedUntil: claim.lawFirmRereleasedUntil,
        lawFirmRef: claim.lawFirmRef,
      });
      if (!gate.ok) throw new Error(`Invalid download: ${gate.reason}`);
      key = await this.ensureSubmissionPack(claim, userId);
      fileName = submissionPackFileName(
        claim.lawFirmRef!,
        claim.lastName,
        claim.firstName
      );
    } else {
      key = claim.copyPdfS3Key;
      const name =
        claimantName(claim)?.replace(/\s+/g, '_') ?? claim.id.slice(0, 8);
      fileName = `Kopie_${name}.pdf`;
    }
    if (!key) return null;

    const downloadUrl = await getPresignedUrl(
      key,
      LAW_FIRM_DOWNLOAD_URL_TTL_SECONDS
    );

    // Every download is logged with user, time and IP (portal brief).
    await db.insert(auditLogs).values({
      userId,
      action: 'law_firm_package_downloaded',
      resource: 'claim',
      resourceId: claimId,
      details: { firmId, kind, s3Key: key, ip, lawFirmRef: claim.lawFirmRef },
    });

    if (kind === 'package' && (claim.lawFirmCaseState ?? 'new') === 'new') {
      await this.recordCaseEvent(firmId, claimId, userId, {
        event: 'downloaded',
      }).catch((error) =>
        logger.warn('Auto download event failed', {
          claimId,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }

    return { downloadUrl, fileName };
  }

  /**
   * Returns the frozen submission pack key, generating and storing the
   * pack on first download. bAV cases reuse the existing letter package
   * (regenerated with the AZ, then frozen under its own key); DRV refund
   * cases build the DRV pack from the claim data and attached documents.
   */
  static async ensureSubmissionPack(
    claim: ClaimRow,
    userId: string
  ): Promise<string | null> {
    if (claim.submissionPackS3Key) return claim.submissionPackS3Key;
    const generatedAt = new Date();
    const key = submissionPackKey(claim.id, generatedAt);
    let bytes: Uint8Array;
    let manifest: PackManifest | Record<string, unknown>;

    if (isBavCashout(claim)) {
      const { BavLetterPackageService } = await import('./bav-letters');
      try {
        await BavLetterPackageService.generateAndStoreForClaim(
          claim.id,
          userId,
          { asAdmin: true }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'package generation failed';
        throw new Error(`Invalid download: ${message}`);
      }
      const [fresh] = await db
        .select({ pdfS3Key: claimsTable.pdfS3Key })
        .from(claimsTable)
        .where(eq(claimsTable.id, claim.id))
        .limit(1);
      if (!fresh?.pdfS3Key) return null;
      bytes = new Uint8Array(await downloadFile(fresh.pdfS3Key));
      manifest = { kind: 'bav_letter_package', sourceKey: fresh.pdfS3Key };
    } else {
      const mapping = drvPackClientFromClaim(claim);
      if (!mapping.client) {
        throw new Error(
          `Invalid download: case data incomplete for the DRV pack (${mapping.missing.join(', ')})`
        );
      }
      const resolution = resolveCarrier({
        lastOffice: 'UNKNOWN',
        vsnr: mapping.client.vsnr,
        citizenship: mapping.citizenshipIso!,
        residence: mapping.residenceIso!,
      });
      const docs = await this.loadClaimAttachments(claim.id);
      const pack = await buildSubmissionPack({
        aktenzeichen: claim.lawFirmRef!,
        date: generatedAt,
        client: mapping.client,
        resolution,
        payslipPdf: docs.payslip,
        idCopyPdf: docs.passport,
        abmeldebestaetigungPdf: docs.abmeldung,
      });
      bytes = pack.pdf;
      manifest = pack.manifest;
    }

    await uploadFile(key, Buffer.from(bytes), 'application/pdf');
    await db
      .update(claimsTable)
      .set({
        submissionPackS3Key: key,
        submissionPackGeneratedAt: generatedAt,
        submissionPackManifest: manifest,
        updatedAt: generatedAt,
      })
      .where(eq(claimsTable.id, claim.id));
    return key;
  }

  /** Passport, payslip and Abmeldung uploads as PDF bytes (images wrapped). */
  private static async loadClaimAttachments(claimId: string): Promise<{
    passport: Uint8Array | null;
    payslip: Uint8Array | null;
    abmeldung: Uint8Array | null;
  }> {
    const rows = await db
      .select({
        role: claimDocuments.documentRole,
        s3Key: documents.s3Key,
        fileType: documents.fileType,
        createdAt: claimDocuments.createdAt,
      })
      .from(claimDocuments)
      .innerJoin(documents, eq(documents.id, claimDocuments.documentId))
      .where(eq(claimDocuments.claimId, claimId))
      .orderBy(desc(claimDocuments.createdAt));
    const out = {
      passport: null as Uint8Array | null,
      payslip: null as Uint8Array | null,
      abmeldung: null as Uint8Array | null,
    };
    for (const role of ['passport', 'payslip', 'abmeldung'] as const) {
      const row = rows.find((r) => r.role === role);
      if (!row) continue;
      try {
        const raw = new Uint8Array(await downloadFile(row.s3Key));
        out[role] = await attachmentAsPdf(raw, row.fileType);
      } catch (error) {
        logger.warn('Pack attachment unavailable', {
          claimId,
          role,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return out;
  }

  /** Raw claim row for ops actions (the admin view omits the release columns). */
  private static async getClaimRow(claimId: string): Promise<ClaimRow | null> {
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);
    return row ?? null;
  }

  /** Ops: (re)release a case to the firm; clears any earlier re-release window. */
  static async releaseToFirm(
    claimId: string,
    adminUserId: string
  ): Promise<{ releasedAt: Date }> {
    const claim = await this.getClaimRow(claimId);
    if (!claim) throw new Error('Claim not found');
    if (claim.handlingRoute !== 'law_firm' || !claim.lawFirmId) {
      throw new Error('Invalid release: the case is not routed to a law firm');
    }
    const now = new Date();
    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({
          lawFirmReleasedAt: now,
          lawFirmReleasedBy: adminUserId,
          lawFirmRereleasedUntil: null,
          updatedAt: now,
        })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'law_firm_case_released',
        resource: 'claim',
        resourceId: claimId,
        details: { firmId: claim.lawFirmId },
      });
    });
    // Client-update engine: drafts the "documents ready" mail (T1) and
    // starts the 7-day posting-date watch. Non-fatal.
    try {
      const { ClientUpdatesService } = await import('./client-updates');
      await ClientUpdatesService.onHandedToLawFirm(claimId, now);
    } catch (error) {
      logger.error('Client-update handoff hook failed', { claimId, error });
    }
    return { releasedAt: now };
  }

  /** Ops: make a submitted case visible again for 48 hours. */
  static async rereleaseToFirm(
    claimId: string,
    adminUserId: string
  ): Promise<{ rereleasedUntil: Date }> {
    const claim = await this.getClaimRow(claimId);
    if (!claim) throw new Error('Claim not found');
    if (!claim.lawFirmReleasedAt) {
      throw new Error('Invalid re-release: the case was never released');
    }
    if (!claim.lawFirmSubmittedAt) {
      throw new Error(
        'Invalid re-release: the case is still visible to the firm'
      );
    }
    const now = new Date();
    const until = rereleaseUntil(now);
    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({ lawFirmRereleasedUntil: until, updatedAt: now })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'law_firm_case_rereleased',
        resource: 'claim',
        resourceId: claimId,
        details: { firmId: claim.lawFirmId, until: until.toISOString() },
      });
    });
    return { rereleasedUntil: until };
  }

  /**
   * Warns ops once per case when the firm downloaded the pack but saved no
   * submission date within 7 days. Meant for a daily scheduler; returns the
   * number of warnings sent.
   */
  static async warnOverdueSubmissions(now = new Date()): Promise<number> {
    const candidates = await db
      .select()
      .from(claimsTable)
      .where(
        and(
          eq(claimsTable.handlingRoute, 'law_firm'),
          sql`${claimsTable.lawFirmDownloadedAt} is not null`,
          sql`${claimsTable.lawFirmSubmittedAt} is null`,
          sql`${claimsTable.lawFirmOverdueWarnedAt} is null`
        )
      );
    let sent = 0;
    for (const claim of candidates) {
      if (
        !isSubmissionOverdue({
          downloadedAt: claim.lawFirmDownloadedAt,
          firmSubmittedAt: claim.lawFirmSubmittedAt,
          overdueWarnedAt: claim.lawFirmOverdueWarnedAt,
          now,
        })
      ) {
        continue;
      }
      const name = claimantName(claim) ?? claim.id.slice(0, 8);
      await sendOpsLawFirmActivityEmail({
        subject: `Law firm: no submission date for ${name} after 7 days`,
        summary: `The firm downloaded the pack for ${name} on ${claim.lawFirmDownloadedAt!.toISOString().slice(0, 10)} and has not saved a submission date.`,
        detailLines: [
          claim.lawFirmRef ? `AZ ${claim.lawFirmRef}.` : 'No AZ recorded.',
          'The case stays visible to the firm.',
        ],
        claimUrl: adminClaimUrl(claim.id),
      }).catch(() => false);
      await db
        .update(claimsTable)
        .set({ lawFirmOverdueWarnedAt: now })
        .where(eq(claimsTable.id, claim.id));
      sent += 1;
    }
    return sent;
  }

  /** Firm sets/edits its file number; the bAV letter regenerates with it. */
  static async setFirmReference(
    firmId: string,
    claimId: string,
    userId: string,
    lawFirmRef: string
  ): Promise<{ lawFirmRef: string; regenerated: boolean }> {
    const claim = await this.getClaimRowForFirm(firmId, claimId, {
      visibleOnly: true,
    });
    if (!claim || claim.status === 'draft') throw new Error('Claim not found');
    const ref = normalizeAktenzeichen(lawFirmRef);
    if (!ref) {
      throw new Error('Invalid reference: Aktenzeichen must match 12345-YY');
    }
    if (claim.submissionPackS3Key && claim.lawFirmRef !== ref) {
      throw new Error(
        `Invalid reference: the submission pack was already generated with AZ ${claim.lawFirmRef}; ask ATLAES to reset it`
      );
    }
    const previous = claim.lawFirmRef;

    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({ lawFirmRef: ref, updatedAt: new Date() })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'law_firm',
        metadata: {
          type: 'law_firm_event',
          event: 'reference_set',
          previousRef: previous,
          lawFirmRef: ref,
          userId,
          firmId,
        },
      });
      await tx.insert(auditLogs).values({
        userId,
        action: 'law_firm_reference_set',
        resource: 'claim',
        resourceId: claimId,
        details: { firmId, previousRef: previous, lawFirmRef: ref },
      });
    });

    let regenerated = false;
    if (isBavCashout(claim)) {
      try {
        const { BavLetterPackageService } = await import('./bav-letters');
        await BavLetterPackageService.generateAndStoreForClaim(
          claimId,
          userId,
          {
            asAdmin: true,
          }
        );
        regenerated = true;
      } catch (error) {
        logger.warn('Package regeneration after reference change failed', {
          claimId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { lawFirmRef: ref, regenerated };
  }

  // ---------------- case events ----------------

  static async recordCaseEvent(
    firmId: string,
    claimId: string,
    userId: string,
    input: {
      event: LawFirmCaseEvent;
      date?: string | null;
      channel?: LawFirmSubmissionChannel | null;
      note?: string | null;
    }
  ): Promise<{ caseState: LawFirmCaseState }> {
    const claim = await this.getClaimRowForFirm(firmId, claimId);
    if (!claim || claim.status === 'draft') throw new Error('Claim not found');
    const current = (claim.lawFirmCaseState ?? 'new') as LawFirmCaseState;
    const check = canRecordEvent(current, input.event);
    if (!check.ok) throw new Error(`Invalid event: ${check.reason}`);
    if (input.event === 'submitted' && !input.date) {
      throw new Error('Invalid event: submission date is required');
    }

    const next = nextCaseState(current, input.event);
    const now = new Date();
    const when = input.date ? new Date(`${input.date}T12:00:00Z`) : now;
    const patch: Partial<typeof claimsTable.$inferInsert> = {
      lawFirmCaseState: next,
      updatedAt: now,
    };
    if (input.event === 'downloaded' && !claim.lawFirmDownloadedAt) {
      patch.lawFirmDownloadedAt = now;
    }
    if (input.event === 'submitted') {
      patch.lawFirmSubmittedAt = when;
      patch.lawFirmSubmissionChannel = input.channel ?? null;
    }
    if (input.event === 'response_received') patch.lawFirmResponseAt = when;
    if (input.event === 'closed') patch.lawFirmClosedAt = now;

    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set(patch)
        .where(eq(claimsTable.id, claimId));
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'law_firm',
        metadata: {
          type: 'law_firm_event',
          event: input.event,
          previousCaseState: current,
          caseState: next,
          date: input.date ?? null,
          channel: input.channel ?? null,
          note: input.note ?? null,
          userId,
          firmId,
        },
      });
      await tx.insert(auditLogs).values({
        userId,
        action: `law_firm_case_${input.event}`,
        resource: 'claim',
        resourceId: claimId,
        details: {
          firmId,
          previousCaseState: current,
          caseState: next,
          date: input.date ?? null,
          channel: input.channel ?? null,
          note: input.note ?? null,
        },
      });
    });

    if (input.event !== 'downloaded') {
      const name = claimantName(claim) ?? claim.id.slice(0, 8);
      await sendOpsLawFirmActivityEmail({
        subject: `Law firm: ${input.event.replace('_', ' ')} on ${name}`,
        summary: `The law firm recorded "${input.event.replace('_', ' ')}" on ${name}`,
        detailLines: [
          `Case state is now ${next}.`,
          input.date ? `Date given: ${input.date}.` : '',
          input.channel ? `Channel: ${input.channel}.` : '',
          input.note ? `Note: ${input.note}` : '',
        ].filter(Boolean),
        claimUrl: adminClaimUrl(claimId),
      }).catch(() => false);
    }

    // Client-update engine: the law firm's posting date is the one clock
    // for the update schedule (Rules for Karl). Non-fatal: the event stands
    // even if the schedule cannot be started.
    if (input.event === 'submitted' && input.date) {
      try {
        const { ClientUpdatesService } = await import('./client-updates');
        await ClientUpdatesService.onSubmitted(claimId, input.date);
      } catch (error) {
        logger.error('Client-update schedule not started on submission', {
          claimId,
          error,
        });
      }
    }
    return { caseState: next };
  }

  static async listCaseEvents(claimId: string): Promise<CaseEventEntry[]> {
    // Filtered in JS rather than with a jsonb operator so it works no
    // matter how the driver serialised the metadata column.
    const rows = await db
      .select()
      .from(claimWorkflowStates)
      .where(eq(claimWorkflowStates.claimId, claimId))
      .orderBy(desc(claimWorkflowStates.createdAt));
    const events: CaseEventEntry[] = [];
    for (const r of rows) {
      const m = parseMetadata(r.metadata);
      if (m.type !== 'law_firm_event') continue;
      events.push({
        id: r.id,
        event: String(m.event ?? ''),
        actor: r.triggeredBy,
        note: (m.note as string | null) ?? null,
        date: (m.date as string | null) ?? null,
        channel: (m.channel as string | null) ?? null,
        createdAt: r.createdAt,
      });
    }
    return events;
  }

  // ---------------- correspondence ----------------

  /**
   * Firm uploads incoming provider mail. Same size/type gate as claimant
   * uploads; the file goes under the claim's S3 prefix and the document
   * row belongs to the uploader.
   */
  static async addCorrespondence(
    firmId: string,
    claimId: string,
    userId: string,
    file: File,
    input: { note?: string | null; receivedDate?: string | null }
  ): Promise<CorrespondenceItem> {
    const claim = await this.getClaimRowForFirm(firmId, claimId);
    if (!claim || claim.status === 'draft') throw new Error('Claim not found');
    if (file.size > CORRESPONDENCE_MAX_BYTES) {
      throw new Error('Invalid file: size exceeds 10MB limit');
    }
    if (!CORRESPONDENCE_ALLOWED_TYPES.has(file.type)) {
      throw new Error('Invalid file: allowed types are PDF, JPG, PNG');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const s3Key = `claims/${claimId}/correspondence/${randomUUID()}.${ext}`;
    await uploadFile(s3Key, Buffer.from(await file.arrayBuffer()), file.type);

    const item = await db.transaction(async (tx: any) => {
      const [doc] = await tx
        .insert(documents)
        .values({
          userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          s3Key,
          documentType: 'correspondence',
          status: 'completed',
        })
        .returning();
      const [row] = await tx
        .insert(claimCorrespondence)
        .values({
          claimId,
          documentId: doc.id,
          direction: 'provider_in',
          source: 'portal_upload',
          lawFirmId: firmId,
          uploadedBy: userId,
          receivedDate: input.receivedDate ?? null,
          note: input.note?.trim() || null,
        })
        .returning();
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'law_firm',
        metadata: {
          type: 'law_firm_event',
          event: 'correspondence_uploaded',
          correspondenceId: row.id,
          fileName: file.name,
          note: input.note ?? null,
          date: input.receivedDate ?? null,
          userId,
          firmId,
        },
      });
      await tx.insert(auditLogs).values({
        userId,
        action: 'law_firm_correspondence_uploaded',
        resource: 'claim',
        resourceId: claimId,
        details: {
          firmId,
          correspondenceId: row.id,
          documentId: doc.id,
          fileName: file.name,
          fileSize: file.size,
          receivedDate: input.receivedDate ?? null,
        },
      });
      return { row, doc };
    });

    const name = claimantName(claim) ?? claim.id.slice(0, 8);
    await sendOpsLawFirmActivityEmail({
      subject: `Law firm uploaded correspondence on ${name}`,
      summary: `New provider correspondence on ${name}`,
      detailLines: [
        `File: ${file.name} (${Math.round(file.size / 1024)} KB).`,
        input.receivedDate ? `Received: ${input.receivedDate}.` : '',
        input.note ? `Note from the firm: ${input.note}` : '',
      ].filter(Boolean),
      claimUrl: adminClaimUrl(claimId),
    }).catch(() => false);

    return {
      id: item.row.id,
      claimId,
      direction: item.row.direction,
      source: item.row.source,
      note: item.row.note,
      receivedDate: item.row.receivedDate,
      createdAt: item.row.createdAt,
      uploadedBy: { id: userId, email: null },
      document: {
        id: item.doc.id,
        fileName: item.doc.fileName,
        fileType: item.doc.fileType,
        fileSize: item.doc.fileSize,
      },
    };
  }

  static async listCorrespondence(
    claimId: string
  ): Promise<CorrespondenceItem[]> {
    const rows = await db
      .select({
        row: claimCorrespondence,
        doc: {
          id: documents.id,
          fileName: documents.fileName,
          fileType: documents.fileType,
          fileSize: documents.fileSize,
        },
        uploaderEmail: users.email,
      })
      .from(claimCorrespondence)
      .leftJoin(documents, eq(claimCorrespondence.documentId, documents.id))
      .leftJoin(users, eq(claimCorrespondence.uploadedBy, users.id))
      .where(eq(claimCorrespondence.claimId, claimId))
      .orderBy(desc(claimCorrespondence.createdAt));
    return rows.map((r) => ({
      id: r.row.id,
      claimId: r.row.claimId,
      direction: r.row.direction,
      source: r.row.source,
      note: r.row.note,
      receivedDate: r.row.receivedDate,
      createdAt: r.row.createdAt,
      uploadedBy: r.row.uploadedBy
        ? { id: r.row.uploadedBy, email: r.uploaderEmail ?? null }
        : null,
      document: r.doc?.id
        ? {
            id: r.doc.id,
            fileName: r.doc.fileName,
            fileType: r.doc.fileType,
            fileSize: r.doc.fileSize,
          }
        : null,
    }));
  }

  /**
   * Presigned URL for one correspondence file. `firmId` restricts to the
   * firm's own claims; admins pass null.
   */
  static async getCorrespondenceDownload(
    claimId: string,
    correspondenceId: string,
    firmId: string | null
  ): Promise<{
    downloadUrl: string | null;
    fileName: string;
    fileType: string;
  } | null> {
    if (firmId) {
      const claim = await this.getClaimRowForFirm(firmId, claimId);
      if (!claim) return null;
    }
    const [row] = await db
      .select({
        s3Key: documents.s3Key,
        fileName: documents.fileName,
        fileType: documents.fileType,
      })
      .from(claimCorrespondence)
      .innerJoin(documents, eq(claimCorrespondence.documentId, documents.id))
      .where(
        and(
          eq(claimCorrespondence.id, correspondenceId),
          eq(claimCorrespondence.claimId, claimId)
        )
      )
      .limit(1);
    if (!row) return null;
    const downloadUrl = await getPresignedUrl(
      row.s3Key,
      firmId ? LAW_FIRM_DOWNLOAD_URL_TTL_SECONDS : 3600
    );
    return { downloadUrl, fileName: row.fileName, fileType: row.fileType };
  }
}
