/**
 * Ops home: what needs attention right now, and what happened last.
 * Read-only aggregation over claims and their workflow entries.
 */

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../utils/db';
import { claimsTable, claimWorkflowStates } from '../drizzle/schema/claims';
import { users } from '../drizzle/schema/shared';

export interface AttentionItem {
  id: string;
  claimantName: string | null;
  email: string | null;
  pensionType: string | null;
  status: string | null;
  handlingRoute: string;
  lawFirmCaseState: string | null;
  lawFirmRef: string | null;
  paymentStatus: string | null;
  submittedAt: Date | null;
  updatedAt: Date | null;
  /** Age in whole days of the thing that needs attention. */
  ageDays: number;
}

export interface ActivityItem {
  id: string;
  claimId: string;
  claimantName: string | null;
  state: string;
  previousState: string | null;
  triggeredBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date | null;
}

export interface AdminOverview {
  attention: {
    submitted: AttentionItem[];
    responses: AttentionItem[];
    missingPackage: AttentionItem[];
    paymentIssues: AttentionItem[];
  };
  activity: ActivityItem[];
  counts: {
    submitted: number;
    processing: number;
    lawFirm: number;
    completedThisWeek: number;
  };
}

const ATTENTION_COLUMNS = {
  id: claimsTable.id,
  firstName: claimsTable.firstName,
  lastName: claimsTable.lastName,
  email: users.email,
  pensionType: claimsTable.pensionType,
  status: claimsTable.status,
  handlingRoute: claimsTable.handlingRoute,
  lawFirmCaseState: claimsTable.lawFirmCaseState,
  lawFirmRef: claimsTable.lawFirmRef,
  paymentStatus: claimsTable.paymentStatus,
  submittedAt: claimsTable.submittedAt,
  updatedAt: claimsTable.updatedAt,
  lawFirmResponseAt: claimsTable.lawFirmResponseAt,
};

function daysSince(d: Date | null | undefined, now: Date): number {
  if (!d) return 0;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

function toItem(
  row: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    pensionType: string | null;
    status: string | null;
    handlingRoute: string | null;
    lawFirmCaseState: string | null;
    lawFirmRef: string | null;
    paymentStatus: string | null;
    submittedAt: Date | null;
    updatedAt: Date | null;
    lawFirmResponseAt?: Date | null;
  },
  ageFrom: Date | null | undefined,
  now: Date
): AttentionItem {
  return {
    id: row.id,
    claimantName:
      row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : null,
    email: row.email,
    pensionType: row.pensionType,
    status: row.status,
    handlingRoute: row.handlingRoute ?? 'direct',
    lawFirmCaseState: row.lawFirmCaseState,
    lawFirmRef: row.lawFirmRef,
    paymentStatus: row.paymentStatus,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
    ageDays: daysSince(ageFrom, now),
  };
}

export class AdminOverviewService {
  static async getOverview(limit = 8): Promise<AdminOverview> {
    const now = new Date();
    // Drizzle builders mutate in place, so each query gets a fresh one.
    const base = () =>
      db
        .select(ATTENTION_COLUMNS)
        .from(claimsTable)
        .leftJoin(users, eq(claimsTable.userId, users.id));

    // Submitted and untouched by ops, oldest first.
    const submitted = await base()
      .where(eq(claimsTable.status, 'submitted'))
      .orderBy(sql`${claimsTable.submittedAt} asc nulls last`)
      .limit(limit);
    // The firm recorded a provider response; ops decide what follows.
    const responses = await base()
      .where(
        and(
          eq(claimsTable.handlingRoute, 'law_firm'),
          eq(claimsTable.lawFirmCaseState, 'response_received')
        )
      )
      .orderBy(desc(claimsTable.lawFirmResponseAt))
      .limit(limit);
    // bAV claims past draft with no generated package.
    const missingPackage = await base()
      .where(
        and(
          eq(claimsTable.pensionType, 'private'),
          sql`${claimsTable.status} in ('submitted', 'processing')`,
          isNull(claimsTable.pdfS3Key)
        )
      )
      .orderBy(sql`${claimsTable.submittedAt} asc nulls last`)
      .limit(limit);
    // Past draft but payment not through.
    const paymentIssues = await base()
      .where(
        and(
          sql`${claimsTable.status} in ('ready', 'submitted', 'processing')`,
          sql`coalesce(${claimsTable.paymentStatus}, 'pending') in ('failed', 'pending')`
        )
      )
      .orderBy(desc(claimsTable.updatedAt))
      .limit(limit);

    const activityRows = await db
      .select({
        id: claimWorkflowStates.id,
        claimId: claimWorkflowStates.claimId,
        firstName: claimsTable.firstName,
        lastName: claimsTable.lastName,
        state: claimWorkflowStates.state,
        previousState: claimWorkflowStates.previousState,
        triggeredBy: claimWorkflowStates.triggeredBy,
        metadata: claimWorkflowStates.metadata,
        createdAt: claimWorkflowStates.createdAt,
      })
      .from(claimWorkflowStates)
      .innerJoin(claimsTable, eq(claimWorkflowStates.claimId, claimsTable.id))
      .orderBy(desc(claimWorkflowStates.createdAt))
      .limit(20);

    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const [counts] = await db
      .select({
        submitted: sql<number>`count(*) filter (where ${claimsTable.status} = 'submitted')`,
        processing: sql<number>`count(*) filter (where ${claimsTable.status} = 'processing')`,
        lawFirm: sql<number>`count(*) filter (where ${claimsTable.handlingRoute} = 'law_firm' and ${claimsTable.status} <> 'draft')`,
        completedThisWeek: sql<number>`count(*) filter (where ${claimsTable.status} = 'completed' and ${claimsTable.updatedAt} >= ${weekAgo.toISOString()}::timestamptz)`,
      })
      .from(claimsTable);

    return {
      attention: {
        submitted: submitted.map((r) => toItem(r, r.submittedAt, now)),
        responses: responses.map((r) => toItem(r, r.lawFirmResponseAt, now)),
        missingPackage: missingPackage.map((r) =>
          toItem(r, r.submittedAt, now)
        ),
        paymentIssues: paymentIssues.map((r) => toItem(r, r.updatedAt, now)),
      },
      activity: activityRows.map((r) => ({
        id: r.id,
        claimId: r.claimId,
        claimantName:
          r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : null,
        state: r.state,
        previousState: r.previousState,
        triggeredBy: r.triggeredBy,
        metadata: (r.metadata as Record<string, unknown> | null) ?? null,
        createdAt: r.createdAt,
      })),
      counts: {
        submitted: Number(counts?.submitted ?? 0),
        processing: Number(counts?.processing ?? 0),
        lawFirm: Number(counts?.lawFirm ?? 0),
        completedThisWeek: Number(counts?.completedThisWeek ?? 0),
      },
    };
  }
}
