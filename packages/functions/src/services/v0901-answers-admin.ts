/**
 * Ops edit the per-case V0901 answers (5.1/6.1/6.3/8.1) on the admin claim
 * page. Editable only for DRV refund cases whose submission pack has not
 * been generated yet: the pack is frozen at the firm's first download and
 * never rebuilt, so a later change would not reach the DRV.
 */

import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { auditLogs } from '../drizzle/schema/shared';
import {
  claimsTable,
  claimWorkflowStates,
  resolveCaseType,
} from '../drizzle/schema/claims';
import {
  applyV0901Answers,
  v0901AnswerViews,
  type V0901AnswerOverrides,
  type V0901AnswersInput,
  type V0901AnswerView,
} from './drv-pack/v0901-answers';

export interface V0901AnswersState {
  /** False for case types that have no V0901 (VBL, bAV). */
  applicable: boolean;
  /** True once the submission pack exists; answers are then read-only. */
  frozen: boolean;
  packGeneratedAt: string | null;
  questions: V0901AnswerView[];
}

export class V0901AnswersError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409
  ) {
    super(message);
  }
}

async function loadClaim(claimId: string) {
  const [claim] = await db
    .select({
      id: claimsTable.id,
      status: claimsTable.status,
      caseType: claimsTable.caseType,
      pensionType: claimsTable.pensionType,
      applicationId: claimsTable.applicationId,
      v0901Answers: claimsTable.v0901Answers,
      submissionPackS3Key: claimsTable.submissionPackS3Key,
      submissionPackGeneratedAt: claimsTable.submissionPackGeneratedAt,
    })
    .from(claimsTable)
    .where(eq(claimsTable.id, claimId))
    .limit(1);
  if (!claim) throw new V0901AnswersError('Claim not found', 404);
  return claim;
}

function stateOf(
  claim: Awaited<ReturnType<typeof loadClaim>>
): V0901AnswersState {
  return {
    applicable: resolveCaseType(claim) === 'drv_refund',
    frozen: !!claim.submissionPackS3Key,
    packGeneratedAt: claim.submissionPackGeneratedAt?.toISOString() ?? null,
    questions: v0901AnswerViews(claim.v0901Answers as V0901AnswerOverrides),
  };
}

export class V0901AnswersService {
  static async get(claimId: string): Promise<V0901AnswersState> {
    return stateOf(await loadClaim(claimId));
  }

  static async update(
    claimId: string,
    adminUserId: string,
    input: V0901AnswersInput
  ): Promise<V0901AnswersState> {
    const claim = await loadClaim(claimId);
    if (resolveCaseType(claim) !== 'drv_refund') {
      throw new V0901AnswersError('Only DRV refund cases have a V0901', 409);
    }
    if (claim.submissionPackS3Key) {
      throw new V0901AnswersError(
        'The submission pack is already generated and frozen; the V0901 answers can no longer change',
        409
      );
    }
    const before = (claim.v0901Answers as V0901AnswerOverrides) ?? null;
    const after = applyV0901Answers(before, input);
    const now = new Date();
    await db.transaction(async (tx: any) => {
      await tx
        .update(claimsTable)
        .set({ v0901Answers: after, updatedAt: now })
        .where(eq(claimsTable.id, claimId));
      await tx.insert(claimWorkflowStates).values({
        claimId,
        state: claim.status,
        previousState: claim.status,
        triggeredBy: 'admin',
        metadata: {
          adminUserId,
          action: 'v0901_answers_update',
          before,
          after,
        },
      });
      await tx.insert(auditLogs).values({
        userId: adminUserId,
        action: 'claim_v0901_answers_updated',
        resource: 'claim',
        resourceId: claimId,
        details: { before, after },
      });
    });
    return stateOf({ ...claim, v0901Answers: after });
  }
}
