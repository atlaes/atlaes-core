import { eq, sql } from 'drizzle-orm';
import { db } from '../utils/db';
import {
  claimsTable,
  contractWithdrawals,
  ClaimStatus,
} from '../drizzle/schema/claims';
import { auditLogs, users, profiles } from '../drizzle/schema/shared';
import { logger, toErrorMeta } from '../utils/logger';

// Immutable version of the withdrawal policy / terms in force when the record
// is written. Bump this constant (never mutate historical rows) whenever the
// legal wording below changes.
export const WITHDRAWAL_POLICY_VERSION = 'withdrawal-policy-2026-06-v1';

// A withdrawal is only ever created against a real claim, so we never leak
// whether an account exists — non-matching identification returns this exact
// generic message and nothing else.
export const WITHDRAWAL_NOT_FOUND_MESSAGE =
  'We could not identify the contract from the information provided. Please log in to your account or contact support.';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface IdentifyInput {
  fullName: string;
  email: string;
  claimId: string;
  pensionTypeOrInstitution: string;
}

export interface WithdrawalContractDetails {
  claimId: string;
  fullName: string;
  email: string;
  pensionTypeOrInstitution: string;
  contractDate: string | null; // ISO — when the CompanyPension contract/claim was created
  paymentDate: string | null; // ISO — claim.paidAt
  applicationAlreadySubmitted: boolean;
  declarationText: string;
  alreadyWithdrawn: boolean;
}

export interface ConfirmResult {
  contract: WithdrawalContractDetails;
  emailUsed: string;
  revocationRequired: boolean;
}

// Reasonable name normalization: lowercase, strip accents, drop everything
// that is not a letter/number/space, collapse whitespace. Good enough to
// tolerate casing, punctuation and diacritic differences without being so
// loose that unrelated names match.
function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(value: string): string[] {
  const norm = normalizeName(value);
  return norm ? norm.split(' ') : [];
}

// The provided name matches a candidate when, after normalization, one token
// set is a subset of the other (order-independent) and both are non-empty.
// This tolerates a missing/extra middle name in either direction.
function namesMatch(provided: string, candidate: string): boolean {
  const a = nameTokens(provided);
  const b = nameTokens(candidate);
  if (a.length === 0 || b.length === 0) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  const subset = (small: Set<string>, big: Set<string>) =>
    [...small].every((t) => big.has(t));
  return subset(setA, setB) || subset(setB, setA);
}

function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// A claim counts as "application already submitted" once it has left the
// pre-submission states. This drives both the confirmation copy and whether a
// provider correspondence-authorization (Postempfangsvollmacht) revocation
// task is created.
function isApplicationSubmitted(claim: {
  status: string | null;
  submittedAt: Date | null;
}): boolean {
  if (claim.submittedAt) return true;
  const s = (claim.status || 'draft') as ClaimStatus;
  return s === 'submitted' || s === 'processing' || s === 'completed';
}

// Builds the EXACT declaration wording shown to (and stored for) the user.
// The frontend confirmation screen renders the same verbatim copy; this
// server-side builder is the authoritative source persisted with the record.
export function buildWithdrawalDeclaration(params: {
  pensionTypeOrInstitution: string;
  applicationAlreadySubmitted: boolean;
}): string {
  const institution =
    params.pensionTypeOrInstitution.trim() || 'your pension institution';

  const paragraphs: string[] = [
    `I hereby withdraw my CompanyPension contract associated with ${institution}.`,
  ];

  if (params.applicationAlreadySubmitted) {
    paragraphs.push(
      `Your refund application has already been submitted to ${institution}. ` +
        'Withdrawing your CompanyPension contract does not reverse steps ' +
        'already completed or withdraw the submitted refund application.'
    );
    paragraphs.push(
      "Under the pension institution's rules that you confirmed before " +
        'submission, the refund application may no longer be withdrawn. The ' +
        'pension institution may therefore continue processing it.'
    );
    paragraphs.push(
      "CompanyPension's authorization to receive correspondence and " +
        'communicate with the pension institution will be revoked. Any ' +
        'applicable refund, fee or outstanding amount under your ' +
        'CompanyPension contract will be confirmed separately.'
    );
  } else {
    paragraphs.push(
      'CompanyPension will stop processing your application. Any applicable ' +
        'refund or amount payable will be determined according to the ' +
        'services already provided and the withdrawal terms applicable to ' +
        'your contract.'
    );
  }

  return paragraphs.join('\n\n');
}

type ResolvedClaim = {
  claim: typeof claimsTable.$inferSelect;
  ownerEmail: string;
  profileFirstName: string | null;
  profileLastName: string | null;
};

async function resolveClaim(claimId: string): Promise<ResolvedClaim | null> {
  if (!UUID_RE.test(claimId)) return null;

  const [row] = await db
    .select({
      claim: claimsTable,
      ownerEmail: users.email,
      profileFirstName: profiles.firstName,
      profileLastName: profiles.lastName,
    })
    .from(claimsTable)
    .innerJoin(users, eq(claimsTable.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(claimsTable.id, claimId))
    .limit(1);

  if (!row) return null;
  return {
    claim: row.claim,
    ownerEmail: row.ownerEmail,
    profileFirstName: row.profileFirstName,
    profileLastName: row.profileLastName,
  };
}

function buildContractDetails(
  resolved: ResolvedClaim,
  pensionTypeOrInstitution: string,
  alreadyWithdrawn: boolean
): WithdrawalContractDetails {
  const { claim, ownerEmail, profileFirstName, profileLastName } = resolved;
  const applicationAlreadySubmitted = isApplicationSubmitted(claim);
  const fullName =
    [profileFirstName, profileLastName].filter(Boolean).join(' ').trim() ||
    [claim.firstName, claim.lastName].filter(Boolean).join(' ').trim();

  return {
    claimId: claim.id,
    fullName,
    email: ownerEmail,
    pensionTypeOrInstitution: pensionTypeOrInstitution.trim(),
    contractDate: claim.createdAt ? claim.createdAt.toISOString() : null,
    paymentDate: claim.paidAt ? claim.paidAt.toISOString() : null,
    applicationAlreadySubmitted,
    declarationText: buildWithdrawalDeclaration({
      pensionTypeOrInstitution,
      applicationAlreadySubmitted,
    }),
    alreadyWithdrawn,
  };
}

async function hasExistingWithdrawal(claimId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: contractWithdrawals.id })
    .from(contractWithdrawals)
    .where(eq(contractWithdrawals.claimId, claimId))
    .limit(1);
  return !!existing;
}

export class ContractWithdrawalService {
  /**
   * Public identification step. Matches a claim ONLY when the email
   * (case-insensitive, against the claim owner), the claim id (exact) and the
   * name (normalized, against the profile or passport name) are all
   * consistent. On any mismatch — including a non-existent claim — returns
   * null so the caller can respond with a single generic message that never
   * reveals which field (or whether the claim) exists.
   *
   * pensionTypeOrInstitution is collected and echoed back for the confirmation
   * screen but is NOT used as a hard matcher: the claim has no reliable
   * institution column to compare it against, and the spec's authoritative
   * matchers are email + claim id + name.
   */
  static async identify(
    input: IdentifyInput
  ): Promise<WithdrawalContractDetails | null> {
    try {
      const resolved = await resolveClaim(input.claimId);
      if (!resolved) return null;

      if (!emailsMatch(input.email, resolved.ownerEmail)) return null;

      const candidates = [
        [resolved.profileFirstName, resolved.profileLastName]
          .filter(Boolean)
          .join(' '),
        [resolved.claim.firstName, resolved.claim.lastName]
          .filter(Boolean)
          .join(' '),
      ].filter((c) => c.trim().length > 0);

      const nameOk = candidates.some((c) => namesMatch(input.fullName, c));
      if (!nameOk) return null;

      const alreadyWithdrawn = await hasExistingWithdrawal(resolved.claim.id);
      return buildContractDetails(
        resolved,
        input.pensionTypeOrInstitution,
        alreadyWithdrawn
      );
    } catch (error) {
      logger.error(
        'Error identifying contract for withdrawal:',
        toErrorMeta(error)
      );
      throw new Error('Failed to identify contract');
    }
  }

  /**
   * Second-step confirmation. Works for both paths:
   *  - Authenticated: `actorUserId` owns the claim → identity is trusted, no
   *    name/email re-check needed.
   *  - Public: the identify payload (fullName + email) is re-validated here so
   *    the record is only ever created against a freshly re-matched claim.
   *    Re-sending the payload (rather than minting a short-lived token) keeps
   *    the flow stateless — no token store / expiry infra — and re-checks the
   *    match at commit time.
   *
   * Creates the (duplicate-guarded) withdrawal record, stores the exact
   * declaration wording + policy version, flags the claim to stop new
   * automated processing WITHOUT deleting data, cancelling a submitted
   * pension application, or touching Stripe, auto-creates the provider
   * revocation task when the application was already submitted, writes an
   * audit entry flagged for urgent operational review, and returns the data
   * the confirmation email + success screen need. Email sending is left to the
   * caller (route) as a best-effort side effect.
   */
  static async confirm(input: {
    claimId: string;
    actorUserId?: string;
    fullName?: string;
    email?: string;
    pensionTypeOrInstitution?: string;
  }): Promise<ConfirmResult> {
    const resolved = await resolveClaim(input.claimId);

    // Authenticated owner shortcut, otherwise fall back to the public identity
    // match. Either way a failure yields the same generic not-found error.
    const isOwner =
      !!input.actorUserId && resolved?.claim.userId === input.actorUserId;

    if (!resolved) {
      throw new WithdrawalNotFoundError();
    }

    const pensionLabel = (input.pensionTypeOrInstitution || '').trim();

    if (!isOwner) {
      const emailOk =
        !!input.email && emailsMatch(input.email, resolved.ownerEmail);
      const candidates = [
        [resolved.profileFirstName, resolved.profileLastName]
          .filter(Boolean)
          .join(' '),
        [resolved.claim.firstName, resolved.claim.lastName]
          .filter(Boolean)
          .join(' '),
      ].filter((c) => c.trim().length > 0);
      const nameOk =
        !!input.fullName &&
        candidates.some((c) => namesMatch(input.fullName as string, c));
      if (!emailOk || !nameOk) {
        throw new WithdrawalNotFoundError();
      }
    }

    // Duplicate guard (unique constraint on claim_id is the backstop).
    if (await hasExistingWithdrawal(resolved.claim.id)) {
      throw new WithdrawalDuplicateError();
    }

    const details = buildContractDetails(resolved, pensionLabel, false);
    const applicationAlreadySubmitted = details.applicationAlreadySubmitted;
    const now = new Date();
    const path = isOwner ? 'authenticated' : 'public';

    try {
      await db.transaction(async (tx: any) => {
        await tx.insert(contractWithdrawals).values({
          claimId: resolved.claim.id,
          userId: resolved.claim.userId,
          fullName: details.fullName || null,
          email: details.email,
          pensionTypeOrInstitution: pensionLabel || null,
          contractDate: resolved.claim.createdAt ?? null,
          paymentDate: resolved.claim.paidAt ?? null,
          policyVersion: WITHDRAWAL_POLICY_VERSION,
          declarationText: details.declarationText,
          applicationAlreadySubmitted,
          revocationRequired: applicationAlreadySubmitted,
          revocationTaskCreatedAt: applicationAlreadySubmitted ? now : null,
          receivedAt: now,
        });

        // Flag the claim to halt any new automated processing. For a claim
        // that has NOT been submitted we reuse the terminal 'rejected' status
        // (same mechanism the confirm-step stop uses), disambiguated by the
        // workflow metadata + audit action below. For an already-submitted
        // claim we DO NOT change its status — that would reverse the submitted
        // pension application — we only append an informational history entry.
        if (!applicationAlreadySubmitted) {
          await tx
            .update(claimsTable)
            .set({
              status: 'rejected',
              workflowState: 'rejected',
              workflowHistory: appendHistory(resolved.claim.workflowState, now),
              updatedAt: now,
            })
            .where(eq(claimsTable.id, resolved.claim.id));
        } else {
          await tx
            .update(claimsTable)
            .set({
              workflowHistory: appendHistory(resolved.claim.workflowState, now),
              updatedAt: now,
            })
            .where(eq(claimsTable.id, resolved.claim.id));
        }

        await tx.insert(auditLogs).values({
          userId: resolved.claim.userId,
          action: 'contract_withdrawal_confirmed',
          resource: 'claim',
          resourceId: resolved.claim.id,
          details: {
            urgent: true,
            path,
            applicationAlreadySubmitted,
            revocationRequired: applicationAlreadySubmitted,
            policyVersion: WITHDRAWAL_POLICY_VERSION,
          },
        });
      });
    } catch (error) {
      // Unique-violation backstop in case of a race between the pre-check and
      // the insert.
      const message = error instanceof Error ? error.message : String(error);
      if (/duplicate key|unique/i.test(message)) {
        throw new WithdrawalDuplicateError();
      }
      logger.error('Error confirming contract withdrawal:', toErrorMeta(error));
      throw error;
    }

    logger.info(
      `Contract withdrawal confirmed for claim ${resolved.claim.id} (path: ${path}, submitted: ${applicationAlreadySubmitted})`
    );

    return {
      contract: { ...details, alreadyWithdrawn: true },
      emailUsed: details.email,
      revocationRequired: applicationAlreadySubmitted,
    };
  }
}

// Appends a withdrawal marker onto the claim's jsonb workflow_history without
// clobbering prior entries (matches the `|| jsonb` append pattern used across
// claims-application.ts).
function appendHistory(previousState: string | null, now: Date) {
  return sql`${claimsTable.workflowHistory} || ${JSON.stringify([
    {
      state: previousState,
      timestamp: now.toISOString(),
      triggeredBy: 'user',
      note: 'Contract withdrawal confirmed',
      action: 'contract_withdrawal',
    },
  ])}::jsonb`;
}

export class WithdrawalNotFoundError extends Error {
  constructor() {
    super(WITHDRAWAL_NOT_FOUND_MESSAGE);
    this.name = 'WithdrawalNotFoundError';
  }
}

export class WithdrawalDuplicateError extends Error {
  constructor() {
    super('This contract has already been withdrawn.');
    this.name = 'WithdrawalDuplicateError';
  }
}
