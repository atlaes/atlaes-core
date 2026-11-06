/**
 * Ops view and complete the DRV pack data of a GPR (drv_refund) case on the
 * admin claim page: the VSNR, sex and German contribution months the
 * V0901/A1310/A1002 need, and the move-out date and last German address
 * when the client uploaded an Abmeldebestätigung instead of typing them.
 *
 * The GPR wizard collects most of this (sv_nummer → vsnr, gender → sex,
 * german_contribution_months), but the SV number is optional and the
 * Abmeldung upload path skips the address fields, so without this the pack
 * could stay blocked with no way for ops to unblock it.
 *
 * Editable until the pack is frozen: the law firm's first download
 * (submission_pack_s3_key) or, on the direct route, the release for
 * dispatch (the draft direct pack is rebuilt on regenerate).
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../utils/db';
import { auditLogs } from '../drizzle/schema/shared';
import {
  claimsTable,
  claimWorkflowStates,
  resolveCaseType,
} from '../drizzle/schema/claims';
import { drvPackClientFromClaim } from './law-firm-pack';

export const DRV_PACK_SEXES = ['male', 'female', 'diverse', 'none'] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const drvPackDataSchema = z
  .object({
    vsnr: z
      .string()
      .transform((v) => v.replace(/\s+/g, '').toUpperCase())
      .pipe(
        z
          .string()
          .regex(
            /^(\d{8}[A-Z]\d{3})?$/,
            'A VSNR has 12 characters: 8 digits, a letter, 3 digits'
          )
      )
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .optional(),
    sex: z.enum(DRV_PACK_SEXES).nullable().optional(),
    germanContributionMonths: z
      .number()
      .int()
      .min(1)
      .max(600)
      .nullable()
      .optional(),
    moveOutDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
      .nullable()
      .optional(),
    germanStreet: optionalText(255),
    germanPostalCode: optionalText(20),
    germanCity: optionalText(100),
  })
  .strict();
export type DrvPackDataInput = z.infer<typeof drvPackDataSchema>;

const FIELDS = [
  'vsnr',
  'sex',
  'germanContributionMonths',
  'moveOutDate',
  'germanStreet',
  'germanPostalCode',
  'germanCity',
] as const;
type Field = (typeof FIELDS)[number];

export interface DrvPackDataState {
  /** False for VBL / bAV cases, which have no DRV pack. */
  applicable: boolean;
  frozen: boolean;
  frozenReason: string | null;
  values: Record<Field, string | number | null>;
  /** What the client typed, for reference next to the pack values. */
  intake: { svNummer: string | null; gender: string | null };
  /** Labels the pack builder still reports as missing. */
  missing: string[];
}

export class DrvPackDataError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409
  ) {
    super(message);
  }
}

async function loadClaim(claimId: string) {
  const [claim] = await db
    .select()
    .from(claimsTable)
    .where(eq(claimsTable.id, claimId))
    .limit(1);
  if (!claim) throw new DrvPackDataError('Claim not found', 404);
  return claim;
}
type ClaimRow = Awaited<ReturnType<typeof loadClaim>>;

function frozenReason(claim: ClaimRow): string | null {
  if (claim.directPackReleasedAt)
    return 'The direct pack is released for dispatch.';
  if (claim.handlingRoute !== 'direct' && claim.submissionPackS3Key)
    return 'The law firm has downloaded the submission pack, which is frozen.';
  return null;
}

function stateOf(claim: ClaimRow): DrvPackDataState {
  const applicable = resolveCaseType(claim) === 'drv_refund';
  const reason = frozenReason(claim);
  const values = Object.fromEntries(
    FIELDS.map((f) => [f, (claim[f] as string | number | null) ?? null])
  ) as Record<Field, string | number | null>;
  return {
    applicable,
    frozen: reason !== null,
    frozenReason: reason,
    values,
    intake: { svNummer: claim.svNummer, gender: claim.gender },
    missing: applicable ? drvPackClientFromClaim(claim).missing : [],
  };
}

export class DrvPackDataService {
  static async get(claimId: string): Promise<DrvPackDataState> {
    return stateOf(await loadClaim(claimId));
  }

  static async update(
    claimId: string,
    adminUserId: string,
    input: DrvPackDataInput
  ): Promise<DrvPackDataState> {
    const claim = await loadClaim(claimId);
    if (resolveCaseType(claim) !== 'drv_refund')
      throw new DrvPackDataError('Only DRV refund cases have a DRV pack', 409);
    const reason = frozenReason(claim);
    if (reason) throw new DrvPackDataError(reason, 409);

    const patch: Partial<Record<Field, string | number | null>> = {};
    const before: Partial<Record<Field, unknown>> = {};
    for (const f of FIELDS) {
      if (input[f] === undefined) continue;
      if ((claim[f] ?? null) === input[f]) continue;
      patch[f] = input[f] as string | number | null;
      before[f] = claim[f] ?? null;
    }
    if (Object.keys(patch).length === 0) return stateOf(claim);

    const now = new Date();
    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({ ...patch, updatedAt: now })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'admin',
        metadata: {
          adminUserId,
          action: 'drv_pack_data_update',
          before,
          after: patch,
        },
      });
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'claim_drv_pack_data_updated',
        resource: 'claim',
        resourceId: claimId,
        details: { before, after: patch },
      });
    });
    return stateOf({ ...claim, ...patch } as ClaimRow);
  }
}
