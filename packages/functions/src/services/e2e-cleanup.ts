import { and, ilike, inArray, isNotNull, lt, or } from 'drizzle-orm';
import { db } from '../utils/db';
import { logger, toErrorMeta } from '../utils/logger';
import { deleteFile } from '../utils/s3';
import { E2E_EMAIL_DOMAIN, isE2eTestAddress } from '../utils/e2e';
import { LettershopService } from './lettershop';
import {
  auditLogs,
  documents,
  lawFirmMembers,
  profiles,
  signatures,
  users,
} from '../drizzle/schema/shared';
import {
  claimCorrespondence,
  claimsTable,
  contractWithdrawals,
} from '../drizzle/schema/claims';
import {
  clientContactLog,
  clientLetters,
  clientTaskDocuments,
  clientUpdateTasks,
} from '../drizzle/schema/client-updates';
import {
  applications as gprApplications,
  calculationLogs as gprCalculationLogs,
  pendingSessions as gprPendingSessions,
  workflowStates as gprWorkflowStates,
} from '../drizzle/schema/gpr';
import {
  applications as vblApplications,
  calculationLogs as vblCalculationLogs,
  pendingCalculatorSessions,
  workflowStates as vblWorkflowStates,
} from '../drizzle/schema/vbl';
import { leads } from '../drizzle/schema/leads';

/**
 * Deletes the data the staging e2e suite creates. Only ever touches rows
 * tied to an @e2e.test address (reserved TLD, see utils/e2e.ts): users with
 * their profiles, claims (+ everything that cascades from a claim),
 * documents, signatures, applications, audit rows, plus anonymous pending
 * sessions and leads carrying such an address.
 *
 * Every FK into shared.users / claims.claims / shared.documents /
 * shared.signatures / gpr+vbl applications was taken from the migrated
 * database (information_schema), not just the Drizzle schema, so the
 * transaction does not fail halfway. Order inside the transaction:
 *   1. null "actor" columns that point at a test user from rows that
 *      survive (e.g. a test user recorded as uploader) — defensive, these
 *      only ever reference test users on test claims;
 *   2. claims (cascades claim_documents, claim_workflow_states,
 *      claim_correspondence, client_* tables, contract_withdrawals);
 *   3. applications + their logs/workflow states (gpr and vbl);
 *   4. documents, signatures, audit rows, law-firm membership, profiles,
 *      users;
 *   5. pending sessions and leads.
 * S3 objects and lettershop cart jobs are removed after the commit, so a
 * rolled-back transaction never loses files.
 */

export interface E2eCleanupInput {
  emails?: string[];
  olderThanMinutes?: number;
}

export interface E2eCleanupResult {
  users: number;
  profiles: number;
  claims: number;
  documents: number;
  signatures: number;
  auditLogs: number;
  contractWithdrawals: number;
  gprApplications: number;
  vblApplications: number;
  pendingSessions: number;
  pendingCalculatorSessions: number;
  leads: number;
  s3ObjectsDeleted: number;
  s3Failures: string[];
  lettershop: {
    deletedJobIds: string[];
    // Jobs ops has to delete by hand in the Kundencenter (Warenkorb).
    manualJobIds: { id: string; claimId: string; reason: string }[];
  };
  // Addresses in `emails` that were ignored (not @e2e.test).
  rejectedEmails: string[];
}

const LIKE_PATTERN = `%@${E2E_EMAIL_DOMAIN}`;

function emptyResult(rejectedEmails: string[]): E2eCleanupResult {
  return {
    users: 0,
    profiles: 0,
    claims: 0,
    documents: 0,
    signatures: 0,
    auditLogs: 0,
    contractWithdrawals: 0,
    gprApplications: 0,
    vblApplications: 0,
    pendingSessions: 0,
    pendingCalculatorSessions: 0,
    leads: 0,
    s3ObjectsDeleted: 0,
    s3Failures: [],
    lettershop: { deletedJobIds: [], manualJobIds: [] },
    rejectedEmails,
  };
}

export class E2eCleanupService {
  static async cleanup(input: E2eCleanupInput): Promise<E2eCleanupResult> {
    const requested = (input.emails ?? []).map((e) => e.trim().toLowerCase());
    const emails = requested.filter(isE2eTestAddress);
    const rejectedEmails = requested.filter((e) => !isE2eTestAddress(e));
    const cutoff =
      input.olderThanMinutes !== undefined
        ? new Date(Date.now() - input.olderThanMinutes * 60_000)
        : null;

    const result = emptyResult(rejectedEmails);
    if (emails.length === 0 && !cutoff) return result;

    // Rows carrying an e-mail column match on "@e2e.test" AND (listed
    // address OR created before the cutoff).
    const emailScope = <T extends Parameters<typeof ilike>[0]>(
      emailCol: T,
      createdCol: Parameters<typeof lt>[0]
    ) => {
      const selectors = [];
      if (emails.length) selectors.push(inArray(emailCol, emails));
      if (cutoff) selectors.push(lt(createdCol, cutoff));
      return and(ilike(emailCol, LIKE_PATTERN), or(...selectors));
    };

    const targetUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(emailScope(users.email, users.createdAt));
    // Belt and braces: never act on a row whose address is not @e2e.test.
    const userRows = targetUsers.filter((u) => isE2eTestAddress(u.email));
    const userIds = userRows.map((u) => u.id);

    const claimRows = userIds.length
      ? await db
          .select({
            id: claimsTable.id,
            pdfS3Key: claimsTable.pdfS3Key,
            submissionPackS3Key: claimsTable.submissionPackS3Key,
            copyPdfS3Key: claimsTable.copyPdfS3Key,
            lettershopSubmissionId: claimsTable.lettershopSubmissionId,
          })
          .from(claimsTable)
          .where(inArray(claimsTable.userId, userIds))
      : [];
    const claimIds = claimRows.map((c) => c.id);

    const documentRows = userIds.length
      ? await db
          .select({ id: documents.id, s3Key: documents.s3Key })
          .from(documents)
          .where(inArray(documents.userId, userIds))
      : [];
    const signatureRows = userIds.length
      ? await db
          .select({ id: signatures.id, s3Key: signatures.s3Key })
          .from(signatures)
          .where(inArray(signatures.userId, userIds))
      : [];

    // Lettershop jobs: the claim's main job plus labelled copies, both
    // recorded in the audit log by LettershopService.sendClaimPdf.
    const lettershopJobs = new Map<string, string>(); // jobId -> claimId
    for (const c of claimRows) {
      if (c.lettershopSubmissionId) {
        lettershopJobs.set(c.lettershopSubmissionId, c.id);
      }
    }
    if (claimIds.length) {
      const jobAudits = await db
        .select({
          resourceId: auditLogs.resourceId,
          details: auditLogs.details,
        })
        .from(auditLogs)
        .where(
          and(
            inArray(auditLogs.resourceId, claimIds),
            inArray(auditLogs.action, [
              'lettershop_submitted',
              'lettershop_copy_submitted',
            ])
          )
        );
      for (const row of jobAudits) {
        const details = (
          typeof row.details === 'string'
            ? JSON.parse(row.details)
            : row.details
        ) as { submissionId?: string } | null;
        if (details?.submissionId && row.resourceId) {
          lettershopJobs.set(String(details.submissionId), row.resourceId);
        }
      }
    }

    await db.transaction(async (tx: any) => {
      if (userIds.length) {
        // 1. Actor columns on rows that may survive.
        const actorColumns: Array<[any, any, string]> = [
          [claimsTable, claimsTable.handlingRouteSetBy, 'handlingRouteSetBy'],
          [claimsTable, claimsTable.lawFirmReleasedBy, 'lawFirmReleasedBy'],
          [claimsTable, claimsTable.bavPayoutRecordedBy, 'bavPayoutRecordedBy'],
          [claimCorrespondence, claimCorrespondence.uploadedBy, 'uploadedBy'],
          [clientContactLog, clientContactLog.loggedBy, 'loggedBy'],
          [clientLetters, clientLetters.uploadedBy, 'uploadedBy'],
          [clientLetters, clientLetters.reviewedBy, 'reviewedBy'],
          [clientTaskDocuments, clientTaskDocuments.uploadedBy, 'uploadedBy'],
          [clientUpdateTasks, clientUpdateTasks.sentBy, 'sentBy'],
          [lawFirmMembers, lawFirmMembers.invitedBy, 'invitedBy'],
        ];
        for (const [table, column, key] of actorColumns) {
          await tx
            .update(table)
            .set({ [key]: null })
            .where(inArray(column, userIds));
        }
      }

      // 2. Claims. Tasks reference the contact log without a cascade, so
      // drop them first; the rest cascades from claims.claims.
      if (claimIds.length) {
        await tx
          .delete(clientUpdateTasks)
          .where(inArray(clientUpdateTasks.claimId, claimIds));
        const withdrawals = await tx
          .delete(contractWithdrawals)
          .where(
            or(
              inArray(contractWithdrawals.claimId, claimIds),
              inArray(contractWithdrawals.userId, userIds)
            )
          )
          .returning({ id: contractWithdrawals.id });
        result.contractWithdrawals = withdrawals.length;
        const deletedClaims = await tx
          .delete(claimsTable)
          .where(inArray(claimsTable.id, claimIds))
          .returning({ id: claimsTable.id });
        result.claims = deletedClaims.length;
      }

      if (userIds.length) {
        // 3. Applications (gpr + vbl) and their logs/workflow states.
        const gprApps = await tx
          .select({ id: gprApplications.id })
          .from(gprApplications)
          .where(inArray(gprApplications.userId, userIds));
        const gprAppIds = gprApps.map((a: { id: string }) => a.id);
        if (gprAppIds.length) {
          // A surviving claim must not keep pointing at a deleted app.
          await tx
            .update(claimsTable)
            .set({ applicationId: null })
            .where(inArray(claimsTable.applicationId, gprAppIds));
          await tx
            .delete(gprCalculationLogs)
            .where(inArray(gprCalculationLogs.applicationId, gprAppIds));
          await tx
            .delete(gprWorkflowStates)
            .where(inArray(gprWorkflowStates.applicationId, gprAppIds));
          await tx
            .delete(gprApplications)
            .where(inArray(gprApplications.id, gprAppIds));
        }
        result.gprApplications = gprAppIds.length;

        const vblApps = await tx
          .select({ id: vblApplications.id })
          .from(vblApplications)
          .where(inArray(vblApplications.userId, userIds));
        const vblAppIds = vblApps.map((a: { id: string }) => a.id);
        if (vblAppIds.length) {
          await tx
            .delete(vblCalculationLogs)
            .where(inArray(vblCalculationLogs.applicationId, vblAppIds));
          await tx
            .delete(vblWorkflowStates)
            .where(inArray(vblWorkflowStates.applicationId, vblAppIds));
          await tx
            .delete(vblApplications)
            .where(inArray(vblApplications.id, vblAppIds));
        }
        result.vblApplications = vblAppIds.length;

        // 4. Documents, signatures, audit rows, membership, profile, user.
        const docIds = documentRows.map((d) => d.id);
        if (docIds.length) {
          const deletedDocs = await tx
            .delete(documents)
            .where(inArray(documents.id, docIds))
            .returning({ id: documents.id });
          result.documents = deletedDocs.length;
        }
        const deletedSignatures = await tx
          .delete(signatures)
          .where(inArray(signatures.userId, userIds))
          .returning({ id: signatures.id });
        result.signatures = deletedSignatures.length;

        const auditScope = claimIds.length
          ? or(
              inArray(auditLogs.userId, userIds),
              inArray(auditLogs.resourceId, claimIds)
            )
          : inArray(auditLogs.userId, userIds);
        const deletedAudits = await tx
          .delete(auditLogs)
          .where(auditScope)
          .returning({ id: auditLogs.id });
        result.auditLogs = deletedAudits.length;

        await tx
          .delete(lawFirmMembers)
          .where(inArray(lawFirmMembers.userId, userIds));
        const deletedProfiles = await tx
          .delete(profiles)
          .where(inArray(profiles.userId, userIds))
          .returning({ id: profiles.id });
        result.profiles = deletedProfiles.length;
        const deletedUsers = await tx
          .delete(users)
          .where(inArray(users.id, userIds))
          .returning({ id: users.id });
        result.users = deletedUsers.length;
      }

      // 5. Anonymous rows keyed by e-mail.
      const sessions = await tx
        .select({ id: gprPendingSessions.id })
        .from(gprPendingSessions)
        .where(
          emailScope(gprPendingSessions.email, gprPendingSessions.createdAt)
        );
      const sessionIds = sessions.map((s: { id: string }) => s.id);
      if (sessionIds.length) {
        await tx
          .delete(gprCalculationLogs)
          .where(inArray(gprCalculationLogs.sessionId, sessionIds));
        await tx
          .delete(gprPendingSessions)
          .where(inArray(gprPendingSessions.id, sessionIds));
      }
      result.pendingSessions = sessionIds.length;

      const calcSessions = await tx
        .delete(pendingCalculatorSessions)
        .where(
          and(
            isNotNull(pendingCalculatorSessions.email),
            emailScope(
              pendingCalculatorSessions.email,
              pendingCalculatorSessions.createdAt
            )
          )
        )
        .returning({ id: pendingCalculatorSessions.id });
      result.pendingCalculatorSessions = calcSessions.length;

      const deletedLeads = await tx
        .delete(leads)
        .where(emailScope(leads.email, leads.createdAt))
        .returning({ id: leads.id });
      result.leads = deletedLeads.length;
    });

    // After the commit: S3 objects (no-op without a bucket, i.e. locally).
    const s3Keys = new Set<string>();
    for (const c of claimRows) {
      for (const key of [c.pdfS3Key, c.submissionPackS3Key, c.copyPdfS3Key]) {
        if (key) s3Keys.add(key);
      }
    }
    for (const d of documentRows) if (d.s3Key) s3Keys.add(d.s3Key);
    for (const s of signatureRows) if (s.s3Key) s3Keys.add(s.s3Key);
    for (const key of s3Keys) {
      try {
        await deleteFile(key);
        result.s3ObjectsDeleted += 1;
      } catch (error) {
        result.s3Failures.push(key);
        logger.warn('E2E cleanup: S3 delete failed', {
          key,
          ...toErrorMeta(error),
        });
      }
    }

    // Lettershop cart jobs of the deleted claims.
    for (const [jobId, claimId] of lettershopJobs) {
      const outcome = await LettershopService.deleteTestPrintjob(jobId);
      if (outcome.deleted) {
        result.lettershop.deletedJobIds.push(jobId);
      } else {
        result.lettershop.manualJobIds.push({
          id: jobId,
          claimId,
          reason: outcome.reason ?? 'unknown',
        });
      }
    }

    logger.info('E2E cleanup finished', {
      users: result.users,
      claims: result.claims,
      documents: result.documents,
      s3ObjectsDeleted: result.s3ObjectsDeleted,
      lettershopDeleted: result.lettershop.deletedJobIds.length,
      lettershopManual: result.lettershop.manualJobIds.length,
    });
    return result;
  }
}
