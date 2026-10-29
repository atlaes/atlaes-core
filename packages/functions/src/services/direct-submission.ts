/**
 * Direct client submission of a DRV refund (owner spec "GPR direct
 * route", 29 Oct 2026). Admin workflow on a case whose submission route
 * is "Direct client submission" (handling_route 'direct'):
 *
 *   1. generate  — builds the direct pack (drv-pack/direct-pack) from the
 *                  case data, the client's bank record, the online
 *                  signature and the uploads; stored on the case
 *                  (submission_pack_*) with route 'direct' in the manifest.
 *                  Regenerating replaces it until the pack is released.
 *   2. download  — preview for admin; never marks anything submitted.
 *   3. release   — freezes the completed pack for dispatch. Blocked while
 *                  unsigned, incomplete, superseded by later case changes,
 *                  on hold, or not on the direct route.
 *   4. dispatch  — admin records who sent it, how and the actual
 *                  submission date. This is the "submitted to the DRV"
 *                  event (mirrors the firm saving its posting date): it
 *                  writes the workflow/audit rows and starts the
 *                  client-update clock (ClientUpdatesService.onSubmitted).
 *   5. payment   — the DRV pays the client directly; admin records the
 *                  client's confirmation of receipt (separate from the
 *                  Bescheid, which stays in the payout decision flow).
 *
 * No escrow release, payout queue line or ZE exists on this route
 * (payout-flow / payout-queue refuse them).
 */

import { and, desc, eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { logger, toErrorMeta } from '../utils/logger';
import { getPresignedUrl, uploadFile } from '../utils/s3';
import { auditLogs } from '../drizzle/schema/shared';
import {
  claimsTable,
  claimWorkflowStates,
  resolveCaseType,
} from '../drizzle/schema/claims';
import {
  drvDirectPackClientFromClaim,
  submissionPackKey,
} from './law-firm-pack';
import { resolveCarrier } from './drv-pack/resolve-carrier';
import {
  buildDirectSubmissionPack,
  DirectPackIncompleteError,
  type DirectPackManifest,
} from './drv-pack/direct-pack';
import {
  SUBMISSION_ROUTE_LABELS,
  submissionRouteOf,
  submittedToDrv,
  type SubmissionRoute,
} from './drv-pack/route';
import { OpsSettingsService, type PostalAgent } from './ops-settings';
import { isIsoDate, todayBerlin } from './payout-flow/deadlines';

export const DISPATCH_METHODS = [
  'post',
  'einschreiben',
  'fax',
  'drv_online',
  'courier',
  'other',
] as const;
export type DispatchMethod = (typeof DISPATCH_METHODS)[number];

export const DISPATCH_METHOD_LABELS: Record<DispatchMethod, string> = {
  post: 'Post',
  einschreiben: 'Einschreiben',
  fax: 'Fax',
  drv_online: 'DRV online service',
  courier: 'Courier',
  other: 'Other',
};

/** Presigned admin download links expire after 15 minutes. */
const DOWNLOAD_TTL_SECONDS = 15 * 60;

export class DirectSubmissionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = 'DirectSubmissionError';
  }
}

export interface Actor {
  id: string;
  email?: string;
}

type ClaimRow = typeof claimsTable.$inferSelect;

export interface DirectSubmissionState {
  claimId: string;
  caseType: string;
  route: SubmissionRoute;
  routeLabel: string;
  /** Direct submission applies (DRV refund on the direct route). */
  applicable: boolean;
  notApplicableReason: string | null;
  /** Case data still missing for the pack (incl. the bank record). */
  missing: string[];
  bankBranch: string | null;
  bankWarnings: string[];
  pack: {
    generatedAt: string | null;
    route: string | null;
    signed: boolean;
    totalPages: number | null;
    documents: { key: string; label: string; pages: number }[];
    anlagen: string[];
    warnings: string[];
    recipient: { carrierName: string; mailingAddress: string[] } | null;
    signatureDate: string | null;
  } | null;
  release: { releasedAt: string; releasedBy: string | null } | null;
  dispatch: {
    dispatchedAt: string;
    sender: string | null;
    method: string | null;
    recordedAt: string | null;
    recordedBy: string | null;
  } | null;
  paymentConfirmedAt: string | null;
  /** Why the pack cannot be released right now (empty = releasable). */
  releaseBlockers: string[];
  submittedToDrv: boolean;
  postalAgent: PostalAgent;
  defaultSender: string | null;
  dispatchMethods: { value: DispatchMethod; label: string }[];
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

function directManifest(claim: ClaimRow): DirectPackManifest | null {
  const m = claim.submissionPackManifest as DirectPackManifest | null;
  return m && m.route === 'direct' ? m : null;
}

function notApplicableReason(claim: ClaimRow): string | null {
  if (resolveCaseType(claim) !== 'drv_refund')
    return 'Direct client submission applies to DRV refund cases only.';
  if (submissionRouteOf(claim) !== 'direct')
    return 'Set the submission route to "Direct client submission" first.';
  return null;
}

/** Release checks, pure over the claim row and the current data mapping. */
export function directReleaseBlockers(
  claim: ClaimRow,
  missing: string[]
): string[] {
  const out: string[] = [];
  const na = notApplicableReason(claim);
  if (na) return [na];
  if (claim.status === 'draft')
    out.push('The client has not submitted the application yet.');
  if (claim.submissionHold)
    out.push(`The case is on hold (${claim.submissionHold}).`);
  if (missing.length) out.push(`Case data missing: ${missing.join(', ')}.`);
  const m = directManifest(claim);
  if (!claim.submissionPackS3Key || !m) {
    out.push('Generate the direct pack first.');
  } else {
    if (!m.signed)
      out.push(
        'The client has not signed online: the pack carries empty signature lines.'
      );
    if (!m.documents.some((d) => d.key === 'id'))
      out.push('The passport/ID copy is missing from the pack.');
    const generated = claim.submissionPackGeneratedAt;
    if (generated && claim.updatedAt && claim.updatedAt > generated)
      out.push(
        'The case changed after the pack was generated; regenerate it so the client signs the current content.'
      );
  }
  if (claim.directPackReleasedAt) out.push('The pack is already released.');
  if (claim.submissionDispatchedAt)
    out.push('The dispatch is already recorded.');
  return out;
}

export class DirectSubmissionService {
  private static async claim(claimId: string): Promise<ClaimRow> {
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId))
      .limit(1);
    if (!row) throw new DirectSubmissionError('Claim not found', 404);
    return row;
  }

  private static requireApplicable(claim: ClaimRow): void {
    const reason = notApplicableReason(claim);
    if (reason) throw new DirectSubmissionError(reason, 409);
  }

  private static async record(
    claim: ClaimRow,
    actor: Actor,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await db.transaction(async (tx: any) => {
      await tx.insert(claimWorkflowStates).values({
        claimId: claim.id,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'admin',
        metadata: {
          type: 'direct_submission',
          action,
          adminUserId: actor.id,
          ...details,
        },
      });
      await tx.insert(auditLogs).values({
        userId: actor.id,
        action,
        resource: 'claim',
        resourceId: claim.id,
        details,
      });
    });
  }

  private static async paymentConfirmedAt(
    claimId: string
  ): Promise<string | null> {
    const rows = await db
      .select({
        metadata: claimWorkflowStates.metadata,
        createdAt: claimWorkflowStates.createdAt,
      })
      .from(claimWorkflowStates)
      .where(eq(claimWorkflowStates.claimId, claimId))
      .orderBy(desc(claimWorkflowStates.createdAt));
    for (const r of rows) {
      const m = (r.metadata ?? {}) as Record<string, unknown>;
      if (
        m.type === 'direct_submission' &&
        m.action === 'direct_refund_payment_confirmed'
      )
        return typeof m.date === 'string' ? m.date : iso(r.createdAt);
    }
    return null;
  }

  static async getState(claimId: string): Promise<DirectSubmissionState> {
    const claim = await this.claim(claimId);
    const route = submissionRouteOf(claim);
    const reason = notApplicableReason(claim);
    const mapping = drvDirectPackClientFromClaim(claim);
    const m = directManifest(claim);
    const operator = await OpsSettingsService.dispatchOperator();
    return {
      claimId: claim.id,
      caseType: resolveCaseType(claim),
      route,
      routeLabel: SUBMISSION_ROUTE_LABELS[route],
      applicable: reason === null,
      notApplicableReason: reason,
      missing: mapping.missing,
      bankBranch: mapping.bankMapping.branch,
      bankWarnings: mapping.bankMapping.warnings,
      pack:
        claim.submissionPackS3Key && m
          ? {
              generatedAt: iso(claim.submissionPackGeneratedAt),
              route: m.route,
              signed: m.signed,
              totalPages: m.totalPages,
              documents: m.documents,
              anlagen: m.anlagen,
              warnings: m.warnings,
              recipient: {
                carrierName: m.recipient.carrierName,
                mailingAddress: m.recipient.mailingAddress,
              },
              signatureDate: m.signatureDate,
            }
          : null,
      release: claim.directPackReleasedAt
        ? {
            releasedAt: claim.directPackReleasedAt.toISOString(),
            releasedBy: claim.directPackReleasedBy,
          }
        : null,
      dispatch: claim.submissionDispatchedAt
        ? {
            dispatchedAt: claim.submissionDispatchedAt.toISOString(),
            sender: claim.submissionDispatchedBy,
            method: claim.submissionDispatchMethod,
            recordedAt: iso(claim.submissionDispatchRecordedAt),
            recordedBy: claim.submissionDispatchRecordedBy,
          }
        : null,
      paymentConfirmedAt: claim.submissionDispatchedAt
        ? await this.paymentConfirmedAt(claim.id)
        : null,
      releaseBlockers: directReleaseBlockers(claim, mapping.missing),
      submittedToDrv: submittedToDrv(claim),
      postalAgent: await OpsSettingsService.postalAgent(),
      defaultSender: operator?.name ?? null,
      dispatchMethods: DISPATCH_METHODS.map((value) => ({
        value,
        label: DISPATCH_METHOD_LABELS[value],
      })),
    };
  }

  /**
   * Builds the direct pack and stores it on the case (replacing an earlier
   * unreleased one). Refused once released or dispatched.
   */
  static async generate(
    claimId: string,
    actor: Actor
  ): Promise<DirectSubmissionState> {
    const claim = await this.claim(claimId);
    this.requireApplicable(claim);
    if (claim.status === 'draft')
      throw new DirectSubmissionError(
        'The client has not submitted the application yet',
        409
      );
    if (claim.submissionDispatchedAt)
      throw new DirectSubmissionError(
        'The pack was already dispatched; changes go through the correction workflow',
        409
      );
    if (claim.directPackReleasedAt)
      throw new DirectSubmissionError(
        'The pack is released for dispatch; withdraw the release before regenerating',
        409
      );

    const mapping = drvDirectPackClientFromClaim(claim);
    if (!mapping.client)
      throw new DirectSubmissionError(
        `The direct pack cannot be built: ${mapping.missing.join(', ')}`,
        400,
        mapping.missing
      );
    const resolution = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: mapping.client.vsnr,
      citizenship: mapping.citizenshipIso!,
      residence: mapping.residenceIso!,
    });
    if (!resolution.entry)
      throw new DirectSubmissionError(
        'The responsible DRV office could not be determined; set it before generating',
        400
      );

    // Lazy import: law-firm.ts imports claims-application, which imports
    // this module's callers.
    const { LawFirmService } = await import('./law-firm');
    const docs = await LawFirmService.loadClaimAttachments(claim.id);
    const signature = await LawFirmService.loadClientSignature(
      claim.signatureId
    );
    const generatedAt = new Date();
    let pack;
    try {
      pack = await buildDirectSubmissionPack({
        date: generatedAt,
        client: {
          ...mapping.client,
          signaturePng: signature?.png ?? null,
          signedAt: signature?.signedAt ?? null,
        },
        bank: mapping.bank,
        resolution,
        postalAgent: await OpsSettingsService.postalAgent(),
        payslipPdf: docs.payslip,
        idCopyPdf: docs.passport,
        abmeldebestaetigungPdf: docs.abmeldung,
      });
    } catch (error) {
      if (error instanceof DirectPackIncompleteError)
        throw new DirectSubmissionError(error.message, 400, error.missing);
      throw error;
    }

    const key = submissionPackKey(claim.id, generatedAt);
    await uploadFile(key, Buffer.from(pack.pdf), 'application/pdf');
    await db
      .update(claimsTable)
      .set({
        submissionPackS3Key: key,
        submissionPackGeneratedAt: generatedAt,
        submissionPackManifest: pack.manifest,
        updatedAt: generatedAt,
      })
      .where(eq(claimsTable.id, claim.id));
    await this.record(claim, actor, 'direct_pack_generated', {
      s3Key: key,
      previousKey: claim.submissionPackS3Key,
      signed: pack.manifest.signed,
      documents: pack.manifest.documents.map((d) => d.key),
      bankBranch: pack.manifest.bankBranch,
    });
    return this.getState(claim.id);
  }

  /** Admin preview/download of the stored pack. Never marks submitted. */
  static async downloadUrl(
    claimId: string,
    actor: Actor
  ): Promise<{ downloadUrl: string | null; fileName: string }> {
    const claim = await this.claim(claimId);
    this.requireApplicable(claim);
    if (!claim.submissionPackS3Key || !directManifest(claim))
      throw new DirectSubmissionError('Generate the direct pack first', 404);
    const downloadUrl = await getPresignedUrl(
      claim.submissionPackS3Key,
      DOWNLOAD_TTL_SECONDS
    );
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'direct_pack_downloaded',
      resource: 'claim',
      resourceId: claim.id,
      details: { s3Key: claim.submissionPackS3Key },
    });
    const name = [claim.lastName, claim.firstName]
      .filter(Boolean)
      .join('_')
      .replace(/\s+/g, '_');
    return {
      downloadUrl,
      fileName: `DRV_Direktantrag_${name || claim.id.slice(0, 8)}.pdf`,
    };
  }

  /** Freezes the completed pack for dispatch. */
  static async release(
    claimId: string,
    actor: Actor
  ): Promise<DirectSubmissionState> {
    const claim = await this.claim(claimId);
    this.requireApplicable(claim);
    const mapping = drvDirectPackClientFromClaim(claim);
    const blockers = directReleaseBlockers(claim, mapping.missing);
    if (blockers.length)
      throw new DirectSubmissionError(
        `The pack cannot be released: ${blockers.join(' ')}`,
        409,
        blockers
      );
    const now = new Date();
    // Conditional update: a concurrent release or regeneration loses.
    const updated = await db
      .update(claimsTable)
      // updatedAt untouched: it is the "case changed since generation"
      // signal of directReleaseBlockers.
      .set({ directPackReleasedAt: now, directPackReleasedBy: actor.id })
      .where(
        and(
          eq(claimsTable.id, claim.id),
          eq(claimsTable.submissionPackS3Key, claim.submissionPackS3Key!)
        )
      )
      .returning({ id: claimsTable.id });
    if (!updated.length)
      throw new DirectSubmissionError(
        'The pack changed while releasing; reload and try again',
        409
      );
    await this.record(claim, actor, 'direct_pack_released', {
      s3Key: claim.submissionPackS3Key,
    });
    return this.getState(claim.id);
  }

  /** Takes a released pack out of dispatch (before the dispatch is recorded). */
  static async withdrawRelease(
    claimId: string,
    actor: Actor,
    note?: string | null
  ): Promise<DirectSubmissionState> {
    const claim = await this.claim(claimId);
    this.requireApplicable(claim);
    if (!claim.directPackReleasedAt)
      throw new DirectSubmissionError('The pack is not released', 409);
    if (claim.submissionDispatchedAt)
      throw new DirectSubmissionError(
        'The pack was already dispatched; changes go through the correction workflow',
        409
      );
    await db
      .update(claimsTable)
      // updatedAt untouched: withdrawing changes no signed content, so the
      // same pack can be released again.
      .set({ directPackReleasedAt: null, directPackReleasedBy: null })
      .where(eq(claimsTable.id, claim.id));
    await this.record(claim, actor, 'direct_pack_release_withdrawn', {
      note: note ?? null,
    });
    return this.getState(claim.id);
  }

  /**
   * Records the actual dispatch: sender, method, submission date. This
   * marks the case submitted to the DRV (and locks the route switch).
   */
  static async recordDispatch(
    claimId: string,
    actor: Actor,
    input: {
      sender: string;
      method: DispatchMethod;
      date: string;
      note?: string | null;
    }
  ): Promise<DirectSubmissionState> {
    const claim = await this.claim(claimId);
    this.requireApplicable(claim);
    if (!claim.directPackReleasedAt)
      throw new DirectSubmissionError(
        'Release the completed pack for dispatch first',
        409
      );
    if (claim.submissionDispatchedAt)
      throw new DirectSubmissionError(
        'The dispatch is already recorded; changes go through the correction workflow',
        409
      );
    const sender = input.sender.trim();
    if (!sender) throw new DirectSubmissionError('Enter who sent the pack');
    if (!DISPATCH_METHODS.includes(input.method))
      throw new DirectSubmissionError('Unknown dispatch method');
    if (!isIsoDate(input.date))
      throw new DirectSubmissionError('Submission date must be YYYY-MM-DD');
    if (input.date > todayBerlin())
      throw new DirectSubmissionError(
        'The submission date cannot be in the future'
      );
    const releasedDay = todayBerlin(claim.directPackReleasedAt);
    if (input.date < releasedDay)
      throw new DirectSubmissionError(
        `The submission date cannot be before the release (${releasedDay})`
      );

    const now = new Date();
    const dispatchedAt = new Date(`${input.date}T12:00:00Z`);
    const updated = await db
      .update(claimsTable)
      .set({
        submissionDispatchedAt: dispatchedAt,
        submissionDispatchedBy: sender.slice(0, 200),
        submissionDispatchMethod: input.method,
        submissionDispatchRecordedAt: now,
        submissionDispatchRecordedBy: actor.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(claimsTable.id, claim.id),
          eq(claimsTable.submissionPackS3Key, claim.submissionPackS3Key!)
        )
      )
      .returning({ id: claimsTable.id });
    if (!updated.length)
      throw new DirectSubmissionError(
        'The pack changed while recording; reload and try again',
        409
      );
    await this.record(claim, actor, 'direct_submission_dispatched', {
      date: input.date,
      sender,
      method: input.method,
      note: input.note ?? null,
      s3Key: claim.submissionPackS3Key,
    });

    // Client-update engine: the actual submission date is the one clock
    // (same hook as the firm's posting date). Non-fatal.
    try {
      const { ClientUpdatesService } = await import('./client-updates');
      await ClientUpdatesService.onSubmitted(claim.id, input.date);
    } catch (error) {
      logger.error('Client-update schedule not started on direct dispatch', {
        claimId: claim.id,
        ...toErrorMeta(error),
      });
    }
    return this.getState(claim.id);
  }

  /**
   * The client confirmed the refund arrived on their account (the DRV
   * pays them directly). Separate from the Bescheid.
   */
  static async confirmPayment(
    claimId: string,
    actor: Actor,
    input: { date: string; note?: string | null }
  ): Promise<DirectSubmissionState> {
    const claim = await this.claim(claimId);
    this.requireApplicable(claim);
    if (!claim.submissionDispatchedAt)
      throw new DirectSubmissionError(
        'Record the dispatch before the payment',
        409
      );
    if (!isIsoDate(input.date) || input.date > todayBerlin())
      throw new DirectSubmissionError('Enter a valid date (not in the future)');
    await this.record(claim, actor, 'direct_refund_payment_confirmed', {
      date: input.date,
      note: input.note ?? null,
    });
    try {
      const { ClientUpdatesService } = await import('./client-updates');
      await ClientUpdatesService.onFundsReceived(
        claim.id,
        new Date(`${input.date}T12:00:00Z`),
        { id: actor.id, email: actor.email ?? '' }
      );
    } catch (error) {
      logger.error('Client-update funds hook failed (direct route)', {
        claimId: claim.id,
        ...toErrorMeta(error),
      });
    }
    return this.getState(claim.id);
  }
}
