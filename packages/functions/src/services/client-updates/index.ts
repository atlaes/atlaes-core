/**
 * Client-update engine ("Rules for Karl", 16 Sep 2026).
 *
 * One clock: submissionDate, set from the law firm's "submitted" event
 * (`onSubmitted`). The engine keeps the promised client date, drafts the
 * matching e-mail as a task for the communication owner ≥ 1 working day
 * before it is due, records contacts with the office, raises the admin
 * warnings, and stops when a decision or funds event arrives
 * (`onDecision` / `onFundsReceived`, after which the A1–A3 payout mails
 * in `services/gpr-payout` take over).
 *
 * Hooks the coordinator wires from other streams' files:
 *   - `ClientUpdatesService.onSubmitted(claimId, date)` from
 *     `LawFirmService.recordCaseEvent` when event === 'submitted';
 *   - `ClientUpdatesService.onHandedToLawFirm(claimId)` from
 *     `LawFirmService.releaseToFirm` / `assignClaimToDefaultFirm` (T1);
 *   - `onDecision` / `onFundsReceived` from wherever ops record those.
 */

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { env } from '../../utils/env';
import { uploadFile, getPresignedUrl } from '../../utils/s3';
import { auditLogs, documents, users } from '../../drizzle/schema/shared';
import { claimDocuments } from '../../drizzle/schema/claims';
import {
  clientContactLog,
  clientLetters,
  clientTaskDocuments,
  clientUpdateTasks,
  type ClientUpdateTemplate,
  type ContactChannel,
  type ContactType,
  type InfoRequestSource,
  type M4StatusParagraph,
  type NextOfficeAction,
  type OfficeActionType,
  type OpenCustomerTask,
} from '../../drizzle/schema/client-updates';
import {
  claimCase,
  DEFAULT_COMMUNICATION_OWNER,
  type ClaimCaseRow,
} from './case-columns';
import {
  addDays,
  computeWarnings,
  formatLongDate,
  initialNextUpdateDue,
  isDraftDue,
  isFortnightlyPhase,
  isSequenceActive,
  milestones,
  nextScheduledOfficeAction,
  nextUpdateDueAfterSend,
  latestNextUpdate,
  stageFor,
  todayIso,
  toIsoDate,
  transferConfirmReceiptDue,
  type CaseWarning,
  type IsoDate,
} from './schedule';
import {
  checkBeforeSend,
  eventReplacesScheduledDraft,
  isRoutineAcknowledgement,
  renderTemplate,
  selectContactTemplate,
  selectScheduledTemplate,
  selectSeniorReviewTemplate,
  templateVariables,
  type TemplateVariables,
} from './templates';
import { ACCOUNT_COPY, BUTTON_UPLOAD, TEMPLATES } from './emails/templates';
import { sendClientUpdateEmail, sendTaskNoticeEmail } from './emails/send';
import { sendOpsLawFirmActivityEmail } from '../email';

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** GPR client account (apps/gpr `/account`). Falls back to FRONTEND_URL. */
export function accountUrl(): string {
  const base = (process.env.GPR_FRONTEND_URL || env.FRONTEND_URL).replace(
    /\/$/,
    ''
  );
  return `${base}/account`;
}

export function adminCaseUrl(claimId: string): string {
  return `${env.ADMIN_URL.replace(/\/$/, '')}/claims/${claimId}/client-updates`;
}

function isoFromDate(d: Date | string | null | undefined): IsoDate | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return toIsoDate(d);
}

function claimantFirstName(row: ClaimCaseRow): string | null {
  return row.firstName?.trim() || null;
}

function claimantName(row: ClaimCaseRow): string {
  return (
    [row.firstName, row.lastName].filter(Boolean).join(' ').trim() ||
    row.id.slice(0, 8)
  );
}

function officeActionOf(row: ClaimCaseRow): NextOfficeAction | null {
  return (row.nextOfficeAction as NextOfficeAction | null) ?? null;
}

function customerTaskOf(row: ClaimCaseRow): OpenCustomerTask | null {
  return (row.openCustomerTask as OpenCustomerTask | null) ?? null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactInput {
  contactDate: IsoDate;
  channel: ContactChannel;
  type: ContactType;
  outcome: string;
  summaryEn?: string | null;
  uncertain?: boolean;
  customerAction?: string | null;
  customerActionDue?: IsoDate | null;
  updateWarranted?: boolean;
  statusParagraph?: M4StatusParagraph | null;
  infoRequestSource?: InfoRequestSource | null;
  newOffice?: string | null;
  /** Free e-mail variables for the draft (dates as ISO; formatted on render). */
  details?: Record<string, string | null> | null;
  loggedByName?: string | null;
}

export interface Actor {
  id: string;
  email: string;
}

export interface AccountPanel {
  claimId: string;
  stage: ReturnType<typeof stageFor>;
  heading: string;
  intro: string | null;
  submissionDate: IsoDate | null;
  pensionOffice: string | null;
  nextUpdate: { heading: string; text: string | null; date: IsoDate | null };
  anythingToDo: {
    heading: string;
    task: (OpenCustomerTask & { uploadUrl: string }) | null;
    text: string;
  };
  whatWeAreDoingNext: {
    heading: string;
    text: string | null;
    action: { label: string; date: IsoDate } | null;
  };
  latest: {
    heading: string;
    text: string | null;
    date: IsoDate | null;
    summary: string | null;
  };
  howLong: typeof ACCOUNT_COPY.howLong;
  howWeKeepYouUpdated: typeof ACCOUNT_COPY.howWeKeepYouUpdated;
  receivedALetter: typeof ACCOUNT_COPY.receivedALetter;
  questions: typeof ACCOUNT_COPY.questions;
  activity: Array<{
    date: IsoDate;
    kind:
      | 'submitted'
      | 'update_sent'
      | 'contact'
      | 'letter_uploaded'
      | 'documents_uploaded'
      | 'decision'
      | 'funds';
    text: string;
  }>;
  updates: Array<{
    id: string;
    date: IsoDate;
    subject: string;
    body: string;
    template: string | null;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    kind: 'claim' | 'letter' | 'task';
    role: string | null;
    createdAt: Date | null;
    url: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ClientUpdatesService {
  // ---------------- case access ----------------

  static async getCase(claimId: string): Promise<ClaimCaseRow | null> {
    const [row] = await db
      .select()
      .from(claimCase)
      .where(eq(claimCase.id, claimId))
      .limit(1);
    return row ?? null;
  }

  private static async requireCase(claimId: string): Promise<ClaimCaseRow> {
    const row = await this.getCase(claimId);
    if (!row) throw new Error('Claim not found');
    return row;
  }

  private static async patchCase(
    claimId: string,
    patch: Partial<typeof claimCase.$inferInsert>
  ): Promise<void> {
    await db
      .update(claimCase)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(claimCase.id, claimId));
  }

  private static async claimantEmail(
    row: ClaimCaseRow
  ): Promise<string | null> {
    const [u] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    return u?.email ?? null;
  }

  private static ownerEmail(row: ClaimCaseRow): string | null {
    return row.communicationOwnerEmail || env.OPS_NOTIFICATION_EMAIL || null;
  }

  private static owner(row: ClaimCaseRow): string {
    return row.communicationOwner || DEFAULT_COMMUNICATION_OWNER;
  }

  private static signature(row: ClaimCaseRow): string {
    return row.caseManagerSignature || this.owner(row);
  }

  /** Base variables every template can use, formatted for the client. */
  private static baseVariables(row: ClaimCaseRow): TemplateVariables {
    return {
      firstName: claimantFirstName(row),
      pensionOffice: row.pensionOffice || row.drvOffice || null,
      submissionDate: row.submissionDate
        ? formatLongDate(row.submissionDate)
        : null,
      caseManagerSignature: this.signature(row),
      reviewerName: row.reviewerName || null,
      reviewerRole: row.reviewerRole || null,
    };
  }

  private static async audit(
    actor: Actor | null,
    action: string,
    claimId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await db.insert(auditLogs).values({
      userId: actor?.id ?? null,
      action,
      resource: 'claim',
      resourceId: claimId,
      details,
    });
  }

  // ---------------- hooks ----------------

  /**
   * T1: the completed case was handed to the law firm. The promised date
   * covers any delay before posting; the posting warning fires at 7 days.
   */
  static async onHandedToLawFirm(
    claimId: string,
    handoffDate: Date | IsoDate = new Date()
  ): Promise<{ taskId: string } | null> {
    const row = await this.requireCase(claimId);
    if (row.submissionDate) return null; // already posted; nothing to announce
    const handoff = isoFromDate(handoffDate)!;
    const promised = addDays(handoff, 14);
    await this.patchCase(claimId, {
      nextClientUpdateDue: row.nextClientUpdateDue ?? promised,
      communicationOwner: this.owner(row),
    });
    const task = await this.createDraftTask({
      row: { ...row, nextClientUpdateDue: row.nextClientUpdateDue ?? promised },
      template: 'T1',
      trigger: 'handoff',
      dueDate: handoff,
      variables: { date: formatLongDate(promised) },
    });
    return { taskId: task.id };
  }

  /**
   * The law firm saved its posting date. Sets the one clock, the first
   * promised client date (+ 28 days), the first office action (+ 3 months)
   * and drafts M0 for today. Called from LawFirmService.recordCaseEvent
   * (event 'submitted') — wiring is the coordinator's.
   */
  static async onSubmitted(
    claimId: string,
    submissionDate: Date | IsoDate
  ): Promise<{ submissionDate: IsoDate; nextClientUpdateDue: IsoDate }> {
    const row = await this.requireCase(claimId);
    const posted = isoFromDate(submissionDate)!;

    if (row.submissionDate && row.submissionDate !== posted) {
      // Never restart the clock once a client date has been promised on it.
      if (row.lastClientUpdateSent) {
        logger.warn('Submission date already set; keeping the original', {
          claimId,
          existing: row.submissionDate,
          offered: posted,
        });
        return {
          submissionDate: row.submissionDate,
          nextClientUpdateDue: row.nextClientUpdateDue ?? '',
        };
      }
    }

    const nextDue = initialNextUpdateDue(posted);
    const today = todayIso();
    const action = nextScheduledOfficeAction(posted, today);
    const existing = officeActionOf(row);
    const nextOfficeAction: NextOfficeAction | null =
      existing && existing.status !== 'done'
        ? existing
        : action
          ? {
              id: randomUUID(),
              type: action.type,
              label: action.label,
              dueDate: action.dueDate,
              owner: this.owner(row),
              status: 'open',
            }
          : null;

    await this.patchCase(claimId, {
      submissionDate: posted,
      nextClientUpdateDue: nextDue,
      pensionOffice: row.pensionOffice || row.drvOffice || null,
      communicationOwner: this.owner(row),
      nextOfficeAction,
    });

    // A pending T1 draft is replaced by M0.
    await this.supersedeOpenDrafts(claimId, ['T1']);

    const fresh = await this.requireCase(claimId);
    await this.createDraftTask({
      row: fresh,
      template: 'M0',
      trigger: 'submitted',
      dueDate: today,
      variables: { date: formatLongDate(nextDue) },
    });
    await this.audit(null, 'client_updates_submitted', claimId, {
      submissionDate: posted,
      nextClientUpdateDue: nextDue,
    });
    return { submissionDate: posted, nextClientUpdateDue: nextDue };
  }

  /** A decision arrived: stop the waiting sequence (A2/A3 take over). */
  static async onDecision(
    claimId: string,
    receivedAt: Date = new Date(),
    actor: Actor | null = null
  ): Promise<void> {
    const row = await this.requireCase(claimId);
    await this.patchCase(claimId, {
      decisionReceivedAt: receivedAt,
      // Funds already in → reconciled now that the decision exists.
      fundsBeforeDecision: false,
      clientUpdateStoppedAt: row.clientUpdateStoppedAt ?? receivedAt,
      clientUpdateStopReason: row.clientUpdateStopReason ?? 'decision',
    });
    await this.cancelOpenTasks(claimId, 'decision received');
    await this.audit(actor, 'client_updates_decision', claimId, {
      receivedAt: receivedAt.toISOString(),
    });
  }

  /**
   * Funds arrived: stop the sequence. Without a decision on file this is
   * the "funds before decision" reconciliation flag (no decision-review
   * e-mail without a decision).
   */
  static async onFundsReceived(
    claimId: string,
    receivedAt: Date = new Date(),
    actor: Actor | null = null
  ): Promise<{ fundsBeforeDecision: boolean }> {
    const row = await this.requireCase(claimId);
    const fundsBeforeDecision = !row.decisionReceivedAt;
    await this.patchCase(claimId, {
      fundsReceivedAt: receivedAt,
      fundsBeforeDecision,
      clientUpdateStoppedAt: row.clientUpdateStoppedAt ?? receivedAt,
      clientUpdateStopReason: row.clientUpdateStopReason ?? 'funds',
    });
    await this.cancelOpenTasks(claimId, 'funds received');
    if (fundsBeforeDecision) {
      await sendOpsLawFirmActivityEmail({
        subject: `Funds before decision: ${claimantName(row)}`,
        summary: `Funds were recorded for ${claimantName(row)} before a decision is on file.`,
        detailLines: [
          'Reconcile the case and explain the actual position to the client.',
          'Do not send a decision-review e-mail with no decision to review.',
        ],
        claimUrl: adminCaseUrl(claimId),
      }).catch(() => false);
    }
    await this.audit(actor, 'client_updates_funds', claimId, {
      receivedAt: receivedAt.toISOString(),
      fundsBeforeDecision,
    });
    return { fundsBeforeDecision };
  }

  // ---------------- case fields (admin) ----------------

  static async updateCaseFields(
    claimId: string,
    patch: {
      pensionOffice?: string | null;
      communicationOwner?: string | null;
      communicationOwnerEmail?: string | null;
      reviewerName?: string | null;
      reviewerRole?: string | null;
      caseManagerSignature?: string | null;
      /** Ops confirmation of the posting date when the firm did not save one. */
      submissionDate?: IsoDate | null;
      openCustomerTask?: OpenCustomerTask | null;
    },
    actor: Actor
  ): Promise<ClaimCaseRow> {
    const row = await this.requireCase(claimId);
    const { submissionDate, ...rest } = patch;
    const clean = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined)
    ) as Partial<typeof claimCase.$inferInsert>;
    if (Object.keys(clean).length) await this.patchCase(claimId, clean);
    if (submissionDate && !row.submissionDate) {
      await this.onSubmitted(claimId, submissionDate);
    }
    await this.audit(actor, 'client_updates_case_updated', claimId, patch);
    return this.requireCase(claimId);
  }

  /**
   * Set or reschedule the next office action. Rescheduling needs an owner
   * and a reason; completing it is the only thing that clears its warning.
   */
  static async setOfficeAction(
    claimId: string,
    input: {
      type: OfficeActionType;
      label: string;
      dueDate: IsoDate;
      owner: string;
      status?: 'open' | 'done' | 'rescheduled';
      reason?: string | null;
    },
    actor: Actor
  ): Promise<NextOfficeAction> {
    const row = await this.requireCase(claimId);
    const current = officeActionOf(row);
    const status = input.status ?? 'open';
    if (status === 'rescheduled' && !input.reason?.trim()) {
      throw new Error('Rescheduling an office action needs a reason');
    }
    const action: NextOfficeAction = {
      id: current?.type === input.type ? current.id : randomUUID(),
      type: input.type,
      label: input.label,
      dueDate: input.dueDate,
      owner: input.owner,
      status,
      reason: input.reason ?? null,
      completedAt: status === 'done' ? new Date().toISOString() : null,
    };
    await this.patchCase(claimId, { nextOfficeAction: action });
    await this.audit(actor, 'client_updates_office_action', claimId, action);
    if (status === 'done') await this.ensureOfficeAction(claimId);
    return (await this.requireCase(claimId))
      .nextOfficeAction as NextOfficeAction;
  }

  /** Re-derive the schedule-driven office action when none is open. */
  private static async ensureOfficeAction(claimId: string): Promise<void> {
    const row = await this.requireCase(claimId);
    if (
      !isSequenceActive({
        submissionDate: row.submissionDate,
        stoppedAt: isoFromDate(row.clientUpdateStoppedAt),
      })
    )
      return;
    const current = officeActionOf(row);
    if (current && current.status !== 'done') return;
    const today = todayIso();
    const next = nextScheduledOfficeAction(row.submissionDate!, today);
    if (!next) return;
    if (current && current.type === next.type && current.status === 'done') {
      // Already completed this milestone; look past it.
      const after = nextScheduledOfficeAction(
        row.submissionDate!,
        addDays(next.dueDate, 1)
      );
      if (!after) return;
      await this.patchCase(claimId, {
        nextOfficeAction: {
          id: randomUUID(),
          type: after.type,
          label: after.label,
          dueDate: after.dueDate,
          owner: this.owner(row),
          status: 'open',
        },
      });
      return;
    }
    await this.patchCase(claimId, {
      nextOfficeAction: {
        id: randomUUID(),
        type: next.type,
        label: next.label,
        dueDate: next.dueDate,
        owner: this.owner(row),
        status: 'open',
      },
    });
  }

  // ---------------- contact log ----------------

  static async listContacts(claimId: string) {
    return db
      .select()
      .from(clientContactLog)
      .where(eq(clientContactLog.claimId, claimId))
      .orderBy(
        desc(clientContactLog.contactDate),
        desc(clientContactLog.createdAt)
      );
  }

  static async getContact(contactId: string) {
    const [row] = await db
      .select()
      .from(clientContactLog)
      .where(eq(clientContactLog.id, contactId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Record a contact with the office and apply its side effects: office
   * actions completed, customer task opened, transfer recorded, and — when
   * updateWarranted — the matching e-mail drafted as a task.
   */
  static async logContact(
    claimId: string,
    input: ContactInput,
    actor: Actor
  ): Promise<{
    contactId: string;
    template: ClientUpdateTemplate | null;
    taskId: string | null;
  }> {
    const row = await this.requireCase(claimId);
    if (
      input.type === 'office_reply' &&
      input.updateWarranted &&
      !input.statusParagraph
    ) {
      throw new Error('An office reply needs one M4 status paragraph');
    }
    if (input.type === 'transfer' && !input.newOffice?.trim()) {
      throw new Error('A transfer needs the new office');
    }

    const template = selectContactTemplate({
      type: input.type,
      channel: input.channel,
      updateWarranted: !!input.updateWarranted,
      infoRequestSource: input.infoRequestSource ?? null,
    });

    const [contact] = await db
      .insert(clientContactLog)
      .values({
        claimId,
        contactDate: input.contactDate,
        loggedBy: actor.id,
        loggedByName: input.loggedByName ?? actor.email,
        channel: input.channel,
        type: input.type,
        outcome: input.outcome,
        summaryEn: input.summaryEn ?? null,
        uncertain: !!input.uncertain,
        customerAction: input.customerAction ?? null,
        customerActionDue: input.customerActionDue ?? null,
        updateWarranted: !!input.updateWarranted,
        statusParagraph: input.statusParagraph ?? null,
        infoRequestSource: input.infoRequestSource ?? null,
        newOffice: input.newOffice ?? null,
        details: input.details ?? null,
        templateKey: template,
      })
      .returning();

    // unsuccessful_attempt: logged; no email; no date change.
    if (input.type === 'unsuccessful_attempt') {
      await this.audit(actor, 'client_updates_contact', claimId, {
        contactId: contact.id,
        type: input.type,
      });
      return { contactId: contact.id, template: null, taskId: null };
    }

    const patch: Partial<typeof claimCase.$inferInsert> = {};
    const action = officeActionOf(row);

    // Office actions completed by this contact (only the matching one).
    const completes: Partial<Record<ContactType, OfficeActionType[]>> = {
      status_enquiry: [
        'status_enquiry',
        'follow_up',
        'confirm_receipt_new_office',
      ],
      written_reminder: ['written_reminder_review'],
      complaint: ['senior_review'],
      documents_forwarded: ['send_response'],
    };
    if (
      action &&
      action.status !== 'done' &&
      completes[input.type]?.includes(action.type)
    ) {
      patch.nextOfficeAction = {
        ...action,
        status: 'done',
        completedAt: new Date().toISOString(),
        contactLogId: contact.id,
      };
    }

    // Transfer: nothing restarts; add "confirm receipt at new office".
    if (input.type === 'transfer') {
      patch.pensionOffice = input.newOffice!.trim();
      patch.nextOfficeAction = {
        id: randomUUID(),
        type: 'confirm_receipt_new_office',
        label: 'Confirm that the new office has received the application',
        dueDate: transferConfirmReceiptDue(input.contactDate),
        owner: this.owner(row),
        status: 'open',
        contactLogId: contact.id,
      };
    }

    // Customer task (info request from the customer, or any action given).
    const needsCustomer =
      input.type === 'info_request' && input.infoRequestSource !== 'file';
    if (
      input.customerAction?.trim() &&
      (needsCustomer || input.type !== 'info_request')
    ) {
      patch.openCustomerTask = {
        id: randomUUID(),
        text: input.customerAction.trim(),
        dueDate: input.customerActionDue ?? null,
        button: BUTTON_UPLOAD,
        contactLogId: contact.id,
        createdAt: new Date().toISOString(),
      };
    }
    // Documents forwarded to the office close the customer's part.
    if (input.type === 'documents_forwarded' && customerTaskOf(row)) {
      patch.openCustomerTask = null;
    }
    // E2B: the team answers from the file; the response is our next action.
    if (input.type === 'info_request' && input.infoRequestSource === 'file') {
      const due = input.details?.actionDate ?? addDays(input.contactDate, 7);
      patch.nextOfficeAction = {
        id: randomUUID(),
        type: 'send_response',
        label: 'Send the requested information to the pension office',
        dueDate: due,
        owner: this.owner(row),
        status: 'open',
        contactLogId: contact.id,
      };
    }
    if (Object.keys(patch).length) await this.patchCase(claimId, patch);

    let taskId: string | null = null;
    if (template) {
      const fresh = await this.requireCase(claimId);
      if (eventReplacesScheduledDraft(template)) {
        await this.supersedeOpenDrafts(claimId);
      }
      const task = await this.createDraftTask({
        row: fresh,
        template,
        trigger: 'contact',
        contactLogId: contact.id,
        dueDate: todayIso(),
        variables: this.contactVariables(fresh, contact, input),
        statusParagraph: input.statusParagraph ?? null,
      });
      taskId = task.id;
      await db
        .update(clientContactLog)
        .set({ draftTaskId: task.id, updatedAt: new Date() })
        .where(eq(clientContactLog.id, contact.id));
    }

    await this.audit(actor, 'client_updates_contact', claimId, {
      contactId: contact.id,
      type: input.type,
      template,
      taskId,
    });
    return { contactId: contact.id, template, taskId };
  }

  /** Variables the contact supplies to its e-mail. */
  private static contactVariables(
    row: ClaimCaseRow,
    contact: typeof clientContactLog.$inferSelect,
    input: ContactInput
  ): TemplateVariables {
    const d = input.details ?? {};
    const fmt = (v: string | null | undefined) =>
      v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatLongDate(v) : (v ?? null);
    const contactDate = formatLongDate(contact.contactDate);
    const action = officeActionOf(row);
    const promised = row.nextClientUpdateDue
      ? formatLongDate(row.nextClientUpdateDue)
      : null;
    const nextPromise = formatLongDate(
      latestNextUpdate(row.submissionDate ?? contact.contactDate, todayIso())
    );
    const vars: TemplateVariables = {
      contactDate,
      date: fmt(d.date) ?? contactDate,
      sentDate: fmt(d.sentDate) ?? contactDate,
      explanation: input.summaryEn ?? null,
      // Event mails state the next date; E3 keeps the existing promise.
      customerUpdateDate:
        input.type === 'documents_forwarded'
          ? (promised ?? nextPromise)
          : nextPromise,
      followUpDate: fmt(d.followUpDate),
      actionDate:
        fmt(d.actionDate) ??
        (action && action.status !== 'done'
          ? formatLongDate(action.dueDate)
          : null),
      nextAction:
        d.nextAction ??
        (action && action.status !== 'done'
          ? action.label.charAt(0).toLowerCase() + action.label.slice(1)
          : null),
      specificNextAction: d.nextAction ?? null,
      requestedReplyDate: fmt(d.requestedReplyDate),
      estimatedDate: fmt(d.estimatedDate),
      dates: d.dates ?? null,
      item: d.item ?? input.customerAction ?? null,
      reason: d.reason ?? null,
      plainEnglishReason: d.plainEnglishReason ?? d.reason ?? null,
      documentOrDetail: d.documentOrDetail ?? d.item ?? null,
      documents: d.documents ?? null,
      customerActionDate:
        fmt(input.customerActionDue) ?? fmt(d.customerActionDate),
      requestedItems: d.requestedItems ?? input.customerAction ?? null,
      oldOffice:
        row.pensionOffice &&
        input.newOffice &&
        row.pensionOffice !== input.newOffice
          ? row.pensionOffice
          : (d.oldOffice ?? null),
      newOffice: input.newOffice ?? null,
      replySummary: d.replySummary ?? null,
      responseSummary: d.responseSummary ?? null,
      reviewOutcome: d.reviewOutcome ?? input.summaryEn ?? null,
      latestDevelopment: d.latestDevelopment ?? null,
      waitLength: d.waitLength ?? null,
      officeDeadline: fmt(d.officeDeadline) ?? fmt(d.date) ?? null,
      residencePensionName: d.residencePensionName ?? null,
      residencePensionAuthority: d.residencePensionAuthority ?? null,
      residencePensionAdjective: d.residencePensionAdjective ?? null,
    };
    return vars;
  }

  static async updateContact(
    contactId: string,
    patch: Partial<ContactInput>,
    actor: Actor
  ) {
    const existing = await this.getContact(contactId);
    if (!existing) throw new Error('Contact not found');
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    const [row] = await db
      .update(clientContactLog)
      .set({ ...(clean as any), updatedAt: new Date() })
      .where(eq(clientContactLog.id, contactId))
      .returning();
    await this.audit(
      actor,
      'client_updates_contact_updated',
      existing.claimId,
      { contactId, patch }
    );
    return row;
  }

  static async deleteContact(contactId: string, actor: Actor): Promise<void> {
    const existing = await this.getContact(contactId);
    if (!existing) throw new Error('Contact not found');
    if (existing.draftTaskId) {
      await db
        .update(clientUpdateTasks)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(
          and(
            eq(clientUpdateTasks.id, existing.draftTaskId),
            eq(clientUpdateTasks.status, 'open')
          )
        );
    }
    await db.delete(clientContactLog).where(eq(clientContactLog.id, contactId));
    await this.audit(
      actor,
      'client_updates_contact_deleted',
      existing.claimId,
      { contactId }
    );
  }

  // ---------------- tasks / drafts ----------------

  private static async createDraftTask(input: {
    row: ClaimCaseRow;
    template: ClientUpdateTemplate;
    trigger: 'scheduled' | 'submitted' | 'handoff' | 'contact' | 'milestone';
    dueDate: IsoDate;
    variables: TemplateVariables;
    contactLogId?: string | null;
    statusParagraph?: M4StatusParagraph | null;
    lastContactKind?: 'confirmed' | 'asked' | null;
    includeBlockB?: boolean;
  }) {
    const row = input.row;
    const customerTaskOpen = !!customerTaskOf(row);
    const variables = { ...this.baseVariables(row), ...input.variables };
    const rendered = renderTemplate({
      template: input.template,
      variables,
      accountUrl: accountUrl(),
      customerTaskOpen,
      statusParagraph: input.statusParagraph ?? null,
      lastContactKind: input.lastContactKind ?? null,
      includeBlockB: input.includeBlockB ?? false,
    });
    const [task] = await db
      .insert(clientUpdateTasks)
      .values({
        claimId: row.id,
        kind: 'client_update_draft',
        templateKey: input.template,
        trigger: input.trigger,
        contactLogId: input.contactLogId ?? null,
        assignedTo: this.owner(row),
        assignedToEmail: this.ownerEmail(row),
        dueDate: input.dueDate,
        draftSubject: rendered.subject,
        draftBody: rendered.body,
        unresolvedPlaceholders: rendered.unresolved,
        variables: Object.fromEntries(
          Object.entries(variables).map(([k, v]) => [k, v ?? null])
        ),
        status: 'open',
      })
      .returning();

    const notified = await sendTaskNoticeEmail({
      to: this.ownerEmail(row),
      subject: `Client update to send: ${claimantName(row)} — ${TEMPLATES[input.template].title} (${input.template}), due ${input.dueDate}`,
      lines: [
        `A draft of "${rendered.subject}" is ready for ${claimantName(row)}.`,
        rendered.unresolved.length
          ? `Placeholders to resolve before sending: ${rendered.unresolved.join(', ')}.`
          : 'Every placeholder is resolved; review and send.',
        `Promised client date: ${row.nextClientUpdateDue ?? input.dueDate}.`,
      ],
      caseUrl: adminCaseUrl(row.id),
    }).catch((e) => {
      logger.error('Task notice failed', toErrorMeta(e));
      return false;
    });
    if (notified) {
      await db
        .update(clientUpdateTasks)
        .set({ notifiedAt: new Date() })
        .where(eq(clientUpdateTasks.id, task.id));
    }
    return task;
  }

  /** Overlapping drafts are combined into one: older open drafts step aside. */
  private static async supersedeOpenDrafts(
    claimId: string,
    onlyTemplates?: ClientUpdateTemplate[]
  ): Promise<number> {
    const open = await db
      .select({
        id: clientUpdateTasks.id,
        templateKey: clientUpdateTasks.templateKey,
      })
      .from(clientUpdateTasks)
      .where(
        and(
          eq(clientUpdateTasks.claimId, claimId),
          eq(clientUpdateTasks.kind, 'client_update_draft'),
          eq(clientUpdateTasks.status, 'open')
        )
      );
    const ids = open
      .filter(
        (t) =>
          !onlyTemplates ||
          onlyTemplates.includes(t.templateKey as ClientUpdateTemplate)
      )
      .map((t) => t.id);
    if (!ids.length) return 0;
    await db
      .update(clientUpdateTasks)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(inArray(clientUpdateTasks.id, ids));
    return ids.length;
  }

  private static async cancelOpenTasks(
    claimId: string,
    reason: string
  ): Promise<void> {
    await db
      .update(clientUpdateTasks)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
        variables: sql`coalesce(${clientUpdateTasks.variables}, '{}'::jsonb) || ${JSON.stringify({ cancelledBecause: reason })}::jsonb`,
      })
      .where(
        and(
          eq(clientUpdateTasks.claimId, claimId),
          eq(clientUpdateTasks.status, 'open')
        )
      );
  }

  static async listTasks(
    filter: { status?: string; claimId?: string; assignedTo?: string } = {}
  ) {
    const conds = [];
    if (filter.status) conds.push(eq(clientUpdateTasks.status, filter.status));
    if (filter.claimId)
      conds.push(eq(clientUpdateTasks.claimId, filter.claimId));
    if (filter.assignedTo)
      conds.push(eq(clientUpdateTasks.assignedTo, filter.assignedTo));
    const rows = await db
      .select({
        task: clientUpdateTasks,
        firstName: claimCase.firstName,
        lastName: claimCase.lastName,
        nextClientUpdateDue: claimCase.nextClientUpdateDue,
      })
      .from(clientUpdateTasks)
      .innerJoin(claimCase, eq(claimCase.id, clientUpdateTasks.claimId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(clientUpdateTasks.dueDate, clientUpdateTasks.createdAt);
    return rows.map((r) => ({
      ...r.task,
      claimantName: [r.firstName, r.lastName].filter(Boolean).join(' '),
      nextClientUpdateDue: r.nextClientUpdateDue,
    }));
  }

  static async getTask(taskId: string) {
    const [row] = await db
      .select()
      .from(clientUpdateTasks)
      .where(eq(clientUpdateTasks.id, taskId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Admin edits a draft: pick the template part, fill variables, or edit
   * the text directly. Changing template/variables re-renders; editing the
   * text keeps it as typed (placeholders are still checked on send).
   */
  static async updateTaskDraft(
    taskId: string,
    patch: {
      templateKey?: ClientUpdateTemplate;
      variables?: TemplateVariables;
      statusParagraph?: M4StatusParagraph | null;
      lastContactKind?: 'confirmed' | 'asked' | null;
      includeBlockB?: boolean;
      draftSubject?: string;
      draftBody?: string;
    },
    actor: Actor
  ) {
    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'open') throw new Error('Task is not open');
    const row = await this.requireCase(task.claimId);

    const set: Partial<typeof clientUpdateTasks.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (
      patch.templateKey ||
      patch.variables ||
      patch.statusParagraph !== undefined ||
      patch.lastContactKind !== undefined ||
      patch.includeBlockB !== undefined
    ) {
      const template =
        patch.templateKey ?? (task.templateKey as ClientUpdateTemplate);
      const variables = {
        ...this.baseVariables(row),
        ...(task.variables ?? {}),
        ...(patch.variables ?? {}),
      };
      const rendered = renderTemplate({
        template,
        variables,
        accountUrl: accountUrl(),
        customerTaskOpen: !!customerTaskOf(row),
        statusParagraph:
          patch.statusParagraph ??
          (task.variables?.__statusParagraph as
            | M4StatusParagraph
            | undefined) ??
          null,
        lastContactKind:
          patch.lastContactKind ??
          (task.variables?.__lastContactKind as
            | 'confirmed'
            | 'asked'
            | undefined) ??
          null,
        includeBlockB:
          patch.includeBlockB ?? task.variables?.__includeBlockB === 'true',
      });
      set.templateKey = template;
      set.variables = {
        ...Object.fromEntries(
          Object.entries(variables).map(([k, v]) => [k, v ?? null])
        ),
        __statusParagraph:
          patch.statusParagraph ?? task.variables?.__statusParagraph ?? null,
        __lastContactKind:
          patch.lastContactKind ?? task.variables?.__lastContactKind ?? null,
        __includeBlockB: String(
          patch.includeBlockB ?? task.variables?.__includeBlockB === 'true'
        ),
      };
      set.draftSubject = rendered.subject;
      set.draftBody = rendered.body;
      set.unresolvedPlaceholders = rendered.unresolved;
    }
    if (patch.draftSubject !== undefined) set.draftSubject = patch.draftSubject;
    if (patch.draftBody !== undefined) {
      set.draftBody = patch.draftBody;
      set.unresolvedPlaceholders = [
        ...patch.draftBody.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g),
      ].map((m) => m[1]);
    }
    const [updated] = await db
      .update(clientUpdateTasks)
      .set(set)
      .where(eq(clientUpdateTasks.id, taskId))
      .returning();
    await this.audit(actor, 'client_updates_draft_edited', task.claimId, {
      taskId,
    });
    return updated;
  }

  /**
   * Send the draft. Refuses with the pre-send problems when a placeholder
   * is unresolved, "nothing needed" appears while a task is open, or a
   * stated contact has no log entry. On success: task closed,
   * lastClientUpdateSent = today, nextClientUpdateDue = the promised date
   * (≤ 28 / ≤ 14 days); a routine acknowledgement keeps the existing date.
   */
  static async sendTask(
    taskId: string,
    actor: Actor,
    options: {
      promisedUpdateDate?: IsoDate | null;
      routineAcknowledgement?: boolean;
      statedContactDates?: IsoDate[];
    } = {}
  ): Promise<{
    sent: boolean;
    problems: string[];
    nextClientUpdateDue: IsoDate | null;
  }> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'open') throw new Error('Task is not open');
    if (task.kind !== 'client_update_draft')
      throw new Error('Not an e-mail task');
    const row = await this.requireCase(task.claimId);

    // Replace a stale draft: a decision or funds event closes the sequence.
    if (row.clientUpdateStoppedAt && task.trigger !== 'contact') {
      await this.cancelOpenTasks(row.id, 'sequence stopped');
      return {
        sent: false,
        problems: [
          'The waiting sequence has stopped (decision/funds recorded); use the A1–A3 mails',
        ],
        nextClientUpdateDue: row.nextClientUpdateDue,
      };
    }

    const contacts = await this.listContacts(row.id);
    const check = checkBeforeSend({
      subject: task.draftSubject ?? '',
      body: task.draftBody ?? '',
      customerTaskOpen: !!customerTaskOf(row),
      statedContactDates: options.statedContactDates,
      loggedContactDates: contacts.map((c) => c.contactDate),
    });
    if (!check.ok) {
      return {
        sent: false,
        problems: check.problems,
        nextClientUpdateDue: row.nextClientUpdateDue,
      };
    }

    const to = await this.claimantEmail(row);
    if (!to)
      return {
        sent: false,
        problems: ['Client has no e-mail address'],
        nextClientUpdateDue: row.nextClientUpdateDue,
      };

    const paragraphs = (task.draftBody ?? '').split(/\n\n/);
    const buttonLabel =
      TEMPLATES[task.templateKey as ClientUpdateTemplate]?.button;
    const ok = await sendClientUpdateEmail({
      to,
      subject: task.draftSubject ?? '',
      paragraphs,
      button: buttonLabel ? { label: buttonLabel, url: accountUrl() } : null,
      fromName: `${this.owner(row)} — Germany Pension Refund`,
      replyTo:
        row.communicationOwnerEmail || env.OPS_NOTIFICATION_EMAIL || null,
    });
    if (!ok) {
      return {
        sent: false,
        problems: ['E-mail delivery failed; the task stays open'],
        nextClientUpdateDue: row.nextClientUpdateDue,
      };
    }

    const today = todayIso();
    const template = task.templateKey as ClientUpdateTemplate;
    const routine =
      options.routineAcknowledgement ??
      (isRoutineAcknowledgement(template) && !options.promisedUpdateDate);
    let nextDue: IsoDate | null = row.nextClientUpdateDue;
    if (row.submissionDate) {
      if (template === 'M0') {
        nextDue = initialNextUpdateDue(row.submissionDate);
      } else if (!routine) {
        nextDue = nextUpdateDueAfterSend({
          submissionDate: row.submissionDate,
          sentOn: today,
          promisedDate: options.promisedUpdateDate ?? null,
        });
      }
    } else if (template === 'T1' && options.promisedUpdateDate) {
      nextDue = options.promisedUpdateDate;
    }

    await db.transaction(async (tx: any) => {
      await tx
        .update(clientUpdateTasks)
        .set({
          status: 'sent',
          sentAt: new Date(),
          sentBy: actor.id,
          sentSubject: task.draftSubject,
          sentBody: task.draftBody,
          promisedUpdateDate: nextDue,
          updatedAt: new Date(),
        })
        .where(eq(clientUpdateTasks.id, taskId));
      await tx
        .update(claimCase)
        .set({
          lastClientUpdateSent: today,
          nextClientUpdateDue: nextDue,
          updatedAt: new Date(),
        })
        .where(eq(claimCase.id, row.id));
    });
    await this.audit(actor, 'client_update_sent', row.id, {
      taskId,
      template,
      promisedUpdateDate: nextDue,
      routineAcknowledgement: routine,
    });
    return { sent: true, problems: [], nextClientUpdateDue: nextDue };
  }

  /** Close a non-e-mail task (senior review) with its outcome. */
  static async completeTask(
    taskId: string,
    actor: Actor,
    outcome: { complaintFiled: boolean; note?: string | null }
  ): Promise<{ template: ClientUpdateTemplate }> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');
    if (task.kind !== 'senior_review') throw new Error('Not a review task');
    await db
      .update(clientUpdateTasks)
      .set({
        status: 'done',
        sentAt: new Date(),
        sentBy: actor.id,
        sentBody: outcome.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(clientUpdateTasks.id, taskId));
    const template = selectSeniorReviewTemplate(outcome);
    await this.audit(actor, 'client_updates_senior_review_done', task.claimId, {
      taskId,
      ...outcome,
      template,
    });
    return { template };
  }

  // ---------------- daily run ----------------

  /**
   * Daily: draft the scheduled update ≥ 1 working day before it is due,
   * create the senior review task at + 6 months, keep the office action
   * current, and mail ops the warnings.
   */
  static async runDaily(now: Date = new Date()): Promise<{
    today: IsoDate;
    casesChecked: number;
    draftsCreated: number;
    seniorReviewsCreated: number;
    warnings: Array<CaseWarning & { claimId: string; claimant: string }>;
  }> {
    const today = todayIso(now);
    const rows = await db
      .select()
      .from(claimCase)
      .where(
        and(
          sql`${claimCase.status} <> 'draft'`,
          sql`(${claimCase.submissionDate} is not null or ${claimCase.lawFirmReleasedAt} is not null or ${claimCase.nextClientUpdateDue} is not null)`
        )
      );

    let draftsCreated = 0;
    let seniorReviewsCreated = 0;
    const warnings: Array<CaseWarning & { claimId: string; claimant: string }> =
      [];

    for (const row of rows) {
      const stoppedAt = isoFromDate(row.clientUpdateStoppedAt);
      const active = isSequenceActive({
        submissionDate: row.submissionDate,
        stoppedAt,
      });

      if (active) {
        await this.ensureOfficeAction(row.id).catch((e) =>
          logger.error('ensureOfficeAction failed', toErrorMeta(e))
        );

        // Senior review at + 6 months, once, to the named reviewer.
        const m = milestones(row.submissionDate!);
        if (today >= m.seniorReviewDue && !row.seniorReviewTaskCreatedAt) {
          await db.insert(clientUpdateTasks).values({
            claimId: row.id,
            kind: 'senior_review',
            trigger: 'milestone',
            assignedTo: row.reviewerName || 'Reviewer',
            assignedToEmail: env.OPS_NOTIFICATION_EMAIL ?? null,
            dueDate: m.seniorReviewDue,
            status: 'open',
          });
          await this.patchCase(row.id, { seniorReviewTaskCreatedAt: now });
          await sendTaskNoticeEmail({
            to: env.OPS_NOTIFICATION_EMAIL,
            subject: `Senior review due: ${claimantName(row)} (six months without a decision)`,
            lines: [
              `${claimantName(row)}'s application was submitted on ${row.submissionDate}; no decision has been recorded.`,
              'Review the case and the follow-up so far and decide the next step (complaint → M6A, otherwise M6B). Fortnightly updates apply from now on.',
            ],
            caseUrl: adminCaseUrl(row.id),
          }).catch(() => false);
          seniorReviewsCreated += 1;
        }

        // Scheduled draft.
        if (
          row.nextClientUpdateDue &&
          isDraftDue(row.nextClientUpdateDue, today)
        ) {
          const [open] = await db
            .select({ id: clientUpdateTasks.id })
            .from(clientUpdateTasks)
            .where(
              and(
                eq(clientUpdateTasks.claimId, row.id),
                eq(clientUpdateTasks.kind, 'client_update_draft'),
                eq(clientUpdateTasks.status, 'open')
              )
            )
            .limit(1);
          if (!open) {
            const [{ n }] = await db
              .select({ n: sql<number>`count(*)::int` })
              .from(clientUpdateTasks)
              .where(
                and(
                  eq(clientUpdateTasks.claimId, row.id),
                  eq(clientUpdateTasks.status, 'sent'),
                  eq(clientUpdateTasks.trigger, 'scheduled')
                )
              );
            const template = selectScheduledTemplate({
              submissionDate: row.submissionDate!,
              today,
              scheduledUpdatesSent: Number(n),
            });
            const latest = await this.latestVerifiedContact(row.id);
            const action = officeActionOf(row);
            const promise = formatLongDate(
              latestNextUpdate(row.submissionDate!, row.nextClientUpdateDue)
            );
            await this.createDraftTask({
              row,
              template,
              trigger: 'scheduled',
              dueDate: row.nextClientUpdateDue,
              variables: {
                date: promise,
                customerUpdateDate: promise,
                followUpDate:
                  action && action.status !== 'done'
                    ? formatLongDate(action.dueDate)
                    : null,
                actionDate:
                  action && action.status !== 'done'
                    ? formatLongDate(action.dueDate)
                    : null,
                specificNextAction:
                  action && action.status !== 'done'
                    ? action.label.charAt(0).toLowerCase() +
                      action.label.slice(1)
                    : null,
                status:
                  latest?.type === 'office_reply'
                    ? (latest.summaryEn ?? null)
                    : null,
                question:
                  latest?.type === 'status_enquiry'
                    ? (latest.summaryEn ?? null)
                    : null,
                ...(latest ? { date: formatLongDate(latest.contactDate) } : {}),
                ...(template === 'M1' || template === 'M2'
                  ? { date: promise }
                  : {}),
              },
              lastContactKind: latest
                ? latest.type === 'office_reply'
                  ? 'confirmed'
                  : 'asked'
                : null,
            });
            draftsCreated += 1;
          }
        }
      }

      for (const w of computeWarnings(
        {
          handoffDate: isoFromDate(
            row.lawFirmReleasedAt ?? row.lawFirmAssignedAt
          ),
          submissionDate: row.submissionDate,
          nextClientUpdateDue: row.nextClientUpdateDue,
          lastClientUpdateSent: row.lastClientUpdateSent,
          nextOfficeAction: officeActionOf(row),
          decisionReceivedAt: isoFromDate(row.decisionReceivedAt),
          fundsReceivedAt: isoFromDate(row.fundsReceivedAt),
          stoppedAt,
        },
        today
      )) {
        warnings.push({ ...w, claimId: row.id, claimant: claimantName(row) });
      }
    }

    if (warnings.length && env.OPS_NOTIFICATION_EMAIL) {
      await sendOpsLawFirmActivityEmail({
        subject: `Client updates: ${warnings.length} warning${warnings.length === 1 ? '' : 's'} on ${today}`,
        summary: 'Cases needing attention in the client-update engine',
        detailLines: warnings.map(
          (w) => `${w.claimant}: ${w.kind.replace(/_/g, ' ')} — ${w.detail}`
        ),
        claimUrl: `${env.ADMIN_URL.replace(/\/$/, '')}/client-updates`,
      }).catch(() => false);
    }

    logger.info('Client updates daily run', {
      today,
      cases: rows.length,
      draftsCreated,
      seniorReviewsCreated,
      warnings: warnings.length,
    });
    return {
      today,
      casesChecked: rows.length,
      draftsCreated,
      seniorReviewsCreated,
      warnings,
    };
  }

  /** All current admin warnings (computed live). */
  static async listWarnings(now: Date = new Date()) {
    const today = todayIso(now);
    const rows = await db
      .select()
      .from(claimCase)
      .where(
        sql`${claimCase.status} <> 'draft' and (${claimCase.submissionDate} is not null or ${claimCase.lawFirmReleasedAt} is not null or ${claimCase.fundsReceivedAt} is not null)`
      );
    const out: Array<CaseWarning & { claimId: string; claimant: string }> = [];
    for (const row of rows) {
      for (const w of computeWarnings(
        {
          handoffDate: isoFromDate(
            row.lawFirmReleasedAt ?? row.lawFirmAssignedAt
          ),
          submissionDate: row.submissionDate,
          nextClientUpdateDue: row.nextClientUpdateDue,
          lastClientUpdateSent: row.lastClientUpdateSent,
          nextOfficeAction: officeActionOf(row),
          decisionReceivedAt: isoFromDate(row.decisionReceivedAt),
          fundsReceivedAt: isoFromDate(row.fundsReceivedAt),
          stoppedAt: isoFromDate(row.clientUpdateStoppedAt),
        },
        today
      )) {
        out.push({ ...w, claimId: row.id, claimant: claimantName(row) });
      }
    }
    return out;
  }

  private static async latestVerifiedContact(claimId: string) {
    const [row] = await db
      .select()
      .from(clientContactLog)
      .where(
        and(
          eq(clientContactLog.claimId, claimId),
          eq(clientContactLog.uncertain, false),
          sql`${clientContactLog.type} <> 'unsuccessful_attempt'`
        )
      )
      .orderBy(
        desc(clientContactLog.contactDate),
        desc(clientContactLog.createdAt)
      )
      .limit(1);
    return row ?? null;
  }

  // ---------------- admin case view ----------------

  static async getAdminCase(claimId: string, now: Date = new Date()) {
    const row = await this.requireCase(claimId);
    const today = todayIso(now);
    const [contacts, tasks, letters, taskDocs] = await Promise.all([
      this.listContacts(claimId),
      this.listTasks({ claimId }),
      db
        .select({ letter: clientLetters, document: documents })
        .from(clientLetters)
        .innerJoin(documents, eq(documents.id, clientLetters.documentId))
        .where(eq(clientLetters.claimId, claimId))
        .orderBy(desc(clientLetters.createdAt)),
      db
        .select({ doc: clientTaskDocuments, document: documents })
        .from(clientTaskDocuments)
        .innerJoin(documents, eq(documents.id, clientTaskDocuments.documentId))
        .where(eq(clientTaskDocuments.claimId, claimId))
        .orderBy(desc(clientTaskDocuments.createdAt)),
    ]);
    const stoppedAt = isoFromDate(row.clientUpdateStoppedAt);
    const warnings = computeWarnings(
      {
        handoffDate: isoFromDate(
          row.lawFirmReleasedAt ?? row.lawFirmAssignedAt
        ),
        submissionDate: row.submissionDate,
        nextClientUpdateDue: row.nextClientUpdateDue,
        lastClientUpdateSent: row.lastClientUpdateSent,
        nextOfficeAction: officeActionOf(row),
        decisionReceivedAt: isoFromDate(row.decisionReceivedAt),
        fundsReceivedAt: isoFromDate(row.fundsReceivedAt),
        stoppedAt,
      },
      today
    );
    return {
      case: {
        claimId: row.id,
        claimant: claimantName(row),
        stage: stageFor({
          submissionDate: row.submissionDate,
          decisionReceivedAt: isoFromDate(row.decisionReceivedAt),
          fundsReceivedAt: isoFromDate(row.fundsReceivedAt),
        }),
        pensionOffice: row.pensionOffice || row.drvOffice || null,
        submissionDate: row.submissionDate,
        handoffDate: isoFromDate(
          row.lawFirmReleasedAt ?? row.lawFirmAssignedAt
        ),
        communicationOwner: this.owner(row),
        communicationOwnerEmail: row.communicationOwnerEmail,
        reviewerName: row.reviewerName,
        reviewerRole: row.reviewerRole,
        caseManagerSignature: row.caseManagerSignature,
        nextClientUpdateDue: row.nextClientUpdateDue,
        lastClientUpdateSent: row.lastClientUpdateSent,
        openCustomerTask: customerTaskOf(row),
        nextOfficeAction: officeActionOf(row),
        decisionReceivedAt: row.decisionReceivedAt,
        fundsReceivedAt: row.fundsReceivedAt,
        fundsBeforeDecision: row.fundsBeforeDecision,
        sequenceStoppedAt: row.clientUpdateStoppedAt,
        sequenceStopReason: row.clientUpdateStopReason,
        fortnightly: row.submissionDate
          ? isFortnightlyPhase(row.submissionDate, today)
          : false,
        milestones: row.submissionDate ? milestones(row.submissionDate) : null,
      },
      warnings,
      latestContact: contacts[0] ?? null,
      contacts,
      tasks,
      letters: letters.map((l) => ({
        ...l.letter,
        fileName: l.document.fileName,
        fileType: l.document.fileType,
        fileSize: l.document.fileSize,
        s3Key: l.document.s3Key,
      })),
      taskDocuments: taskDocs.map((d) => ({
        ...d.doc,
        fileName: d.document.fileName,
        fileType: d.document.fileType,
        fileSize: d.document.fileSize,
        s3Key: d.document.s3Key,
      })),
      templates: Object.values(TEMPLATES).map((t) => ({
        key: t.key,
        title: t.title,
        note: t.note,
        subject: t.subject,
        variables: templateVariables(t.key),
      })),
    };
  }

  // ---------------- client account ----------------

  /** The client's case: the latest non-draft claim of this user. */
  static async findCaseForUser(userId: string): Promise<ClaimCaseRow | null> {
    const [row] = await db
      .select()
      .from(claimCase)
      .where(
        and(eq(claimCase.userId, userId), sql`${claimCase.status} <> 'draft'`)
      )
      .orderBy(desc(claimCase.updatedAt))
      .limit(1);
    return row ?? null;
  }

  static async getAccountCase(userId: string): Promise<AccountPanel | null> {
    const row = await this.findCaseForUser(userId);
    if (!row) return null;
    const stage = stageFor({
      submissionDate: row.submissionDate,
      decisionReceivedAt: isoFromDate(row.decisionReceivedAt),
      fundsReceivedAt: isoFromDate(row.fundsReceivedAt),
    });
    const office = row.pensionOffice || row.drvOffice || 'the pension office';
    const fill = (s: string, v: Record<string, string>) =>
      s.replace(/\{\{(\w+)\}\}/g, (_m, k) => v[k] ?? '');

    const [sent, contacts, letters, taskDocs, claimDocs] = await Promise.all([
      db
        .select()
        .from(clientUpdateTasks)
        .where(
          and(
            eq(clientUpdateTasks.claimId, row.id),
            eq(clientUpdateTasks.status, 'sent')
          )
        )
        .orderBy(desc(clientUpdateTasks.sentAt)),
      db
        .select()
        .from(clientContactLog)
        .where(
          and(
            eq(clientContactLog.claimId, row.id),
            eq(clientContactLog.uncertain, false),
            sql`${clientContactLog.type} <> 'unsuccessful_attempt'`
          )
        )
        .orderBy(desc(clientContactLog.contactDate)),
      db
        .select({ letter: clientLetters, document: documents })
        .from(clientLetters)
        .innerJoin(documents, eq(documents.id, clientLetters.documentId))
        .where(eq(clientLetters.claimId, row.id)),
      db
        .select({ doc: clientTaskDocuments, document: documents })
        .from(clientTaskDocuments)
        .innerJoin(documents, eq(documents.id, clientTaskDocuments.documentId))
        .where(eq(clientTaskDocuments.claimId, row.id)),
      db
        .select({ cd: claimDocuments, document: documents })
        .from(claimDocuments)
        .innerJoin(documents, eq(documents.id, claimDocuments.documentId))
        .where(eq(claimDocuments.claimId, row.id)),
    ]);

    const task = customerTaskOf(row);
    const action = officeActionOf(row);
    const latestContact = contacts.find((c) => c.summaryEn) ?? null;

    const activity: AccountPanel['activity'] = [];
    if (row.submissionDate) {
      activity.push({
        date: row.submissionDate,
        kind: 'submitted',
        text: `Your application was sent to ${office}.`,
      });
    }
    for (const t of sent) {
      if (t.sentAt)
        activity.push({
          date: toIsoDate(t.sentAt),
          kind: 'update_sent',
          text: t.sentSubject ?? 'Update sent',
        });
    }
    for (const c of contacts) {
      if (c.summaryEn)
        activity.push({
          date: c.contactDate,
          kind: 'contact',
          text: c.summaryEn,
        });
    }
    for (const l of letters) {
      activity.push({
        date:
          isoFromDate(l.letter.receivedDate) ??
          toIsoDate(l.letter.createdAt ?? new Date()),
        kind: 'letter_uploaded',
        text: `You uploaded a letter: ${l.document.fileName}`,
      });
    }
    for (const d of taskDocs) {
      activity.push({
        date: toIsoDate(d.doc.createdAt ?? new Date()),
        kind: 'documents_uploaded',
        text: `You uploaded ${d.document.fileName}`,
      });
    }
    if (row.decisionReceivedAt)
      activity.push({
        date: toIsoDate(row.decisionReceivedAt),
        kind: 'decision',
        text: 'The decision arrived.',
      });
    if (row.fundsReceivedAt)
      activity.push({
        date: toIsoDate(row.fundsReceivedAt),
        kind: 'funds',
        text: 'Your refund reached the client escrow account.',
      });
    activity.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const withUrl = async (s3Key: string) =>
      getPresignedUrl(s3Key, 900).catch(() => null);
    const documentsOut: AccountPanel['documents'] = [];
    for (const d of claimDocs)
      documentsOut.push({
        id: d.document.id,
        fileName: d.document.fileName,
        fileType: d.document.fileType,
        fileSize: d.document.fileSize,
        kind: 'claim',
        role: d.cd.documentRole,
        createdAt: d.document.createdAt,
        url: await withUrl(d.document.s3Key),
      });
    for (const l of letters)
      documentsOut.push({
        id: l.document.id,
        fileName: l.document.fileName,
        fileType: l.document.fileType,
        fileSize: l.document.fileSize,
        kind: 'letter',
        role: 'letter',
        createdAt: l.document.createdAt,
        url: await withUrl(l.document.s3Key),
      });
    for (const d of taskDocs)
      documentsOut.push({
        id: d.document.id,
        fileName: d.document.fileName,
        fileType: d.document.fileType,
        fileSize: d.document.fileSize,
        kind: 'task',
        role: 'task_document',
        createdAt: d.document.createdAt,
        url: await withUrl(d.document.s3Key),
      });

    const nextUpdateDate = row.clientUpdateStoppedAt
      ? null
      : row.nextClientUpdateDue;
    return {
      claimId: row.id,
      stage,
      heading: ACCOUNT_COPY.heading,
      intro: row.submissionDate
        ? fill(ACCOUNT_COPY.intro, {
            pensionOffice: office,
            submissionDate: formatLongDate(row.submissionDate),
          })
        : null,
      submissionDate: row.submissionDate,
      pensionOffice: row.pensionOffice || row.drvOffice || null,
      nextUpdate: {
        heading: ACCOUNT_COPY.nextUpdate.heading,
        text: nextUpdateDate
          ? fill(ACCOUNT_COPY.nextUpdate.text, {
              date: formatLongDate(nextUpdateDate),
            })
          : null,
        date: nextUpdateDate,
      },
      anythingToDo: {
        heading: ACCOUNT_COPY.anythingToDo.heading,
        task: task
          ? { ...task, uploadUrl: `/api/account/tasks/${task.id}/documents` }
          : null,
        // Never "nothing" alongside an open task.
        text: task ? task.text : ACCOUNT_COPY.anythingToDo.nothing,
      },
      whatWeAreDoingNext: {
        heading: ACCOUNT_COPY.whatWeAreDoingNext.heading,
        text:
          action && action.status !== 'done' && !row.clientUpdateStoppedAt
            ? fill(ACCOUNT_COPY.whatWeAreDoingNext.text, {
                specificNextAction: action.label,
                date: formatLongDate(action.dueDate),
              })
            : null,
        action:
          action && action.status !== 'done' && !row.clientUpdateStoppedAt
            ? { label: action.label, date: action.dueDate }
            : null,
      },
      latest: {
        heading: ACCOUNT_COPY.latest.heading,
        text: latestContact
          ? fill(ACCOUNT_COPY.latest.text, {
              date: formatLongDate(latestContact.contactDate),
              summary: latestContact.summaryEn!,
            })
          : null,
        date: latestContact?.contactDate ?? null,
        summary: latestContact?.summaryEn ?? null,
      },
      howLong: ACCOUNT_COPY.howLong,
      howWeKeepYouUpdated: ACCOUNT_COPY.howWeKeepYouUpdated,
      receivedALetter: ACCOUNT_COPY.receivedALetter,
      questions: ACCOUNT_COPY.questions,
      activity,
      updates: sent.map((t) => ({
        id: t.id,
        date: toIsoDate(t.sentAt ?? new Date()),
        subject: t.sentSubject ?? '',
        body: t.sentBody ?? '',
        template: t.templateKey,
      })),
      documents: documentsOut,
    };
  }

  private static validateUpload(file: File): string | null {
    if (file.size > 10 * 1024 * 1024) return 'File size exceeds 10MB limit';
    if (
      !['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(
        file.type
      )
    )
      return 'Invalid file type. Allowed: PDF, JPG, PNG';
    return null;
  }

  /** A letter the client received directly from the pension office. */
  static async uploadLetter(
    userId: string,
    file: File,
    meta: { receivedDate?: IsoDate | null; note?: string | null }
  ): Promise<{ letterId: string; documentId: string }> {
    const row = await this.findCaseForUser(userId);
    if (!row) throw new Error('No application found');
    const invalid = this.validateUpload(file);
    if (invalid) throw new Error(invalid);
    const ext = file.name.split('.').pop() || 'bin';
    const s3Key = `claims/${row.id}/letters/${randomUUID()}.${ext}`;
    await uploadFile(s3Key, Buffer.from(await file.arrayBuffer()), file.type);
    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key,
        documentType: 'office_letter',
        status: 'completed',
      })
      .returning();
    const [letter] = await db
      .insert(clientLetters)
      .values({
        claimId: row.id,
        documentId: doc.id,
        uploadedBy: userId,
        receivedDate: meta.receivedDate ?? null,
        note: meta.note ?? null,
      })
      .returning();
    await sendOpsLawFirmActivityEmail({
      subject: `Client uploaded a letter: ${claimantName(row)}`,
      summary: `${claimantName(row)} uploaded a letter received directly from the pension office.`,
      detailLines: [
        `File: ${file.name}.`,
        meta.receivedDate ? `Received on ${meta.receivedDate}.` : '',
        meta.note ? `Note: ${meta.note}` : '',
        'Check it and handle any deadline.',
      ].filter(Boolean),
      claimUrl: adminCaseUrl(row.id),
    }).catch(() => false);
    await this.audit(
      { id: userId, email: '' },
      'client_letter_uploaded',
      row.id,
      { letterId: letter.id, documentId: doc.id }
    );
    return { letterId: letter.id, documentId: doc.id };
  }

  /** Documents for the open customer task (E2A / originals). */
  static async uploadTaskDocument(
    userId: string,
    customerTaskId: string,
    file: File
  ): Promise<{ documentId: string; taskId: string }> {
    const row = await this.findCaseForUser(userId);
    if (!row) throw new Error('No application found');
    const task = customerTaskOf(row);
    if (!task || task.id !== customerTaskId) throw new Error('Task not found');
    const invalid = this.validateUpload(file);
    if (invalid) throw new Error(invalid);
    const ext = file.name.split('.').pop() || 'bin';
    const s3Key = `claims/${row.id}/tasks/${customerTaskId}/${randomUUID()}.${ext}`;
    await uploadFile(s3Key, Buffer.from(await file.arrayBuffer()), file.type);
    const [doc] = await db
      .insert(documents)
      .values({
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key,
        documentType: 'task_document',
        status: 'completed',
      })
      .returning();
    await db
      .insert(clientTaskDocuments)
      .values({
        claimId: row.id,
        customerTaskId,
        documentId: doc.id,
        uploadedBy: userId,
      });
    await this.patchCase(row.id, {
      openCustomerTask: {
        ...task,
        documentsReceivedAt: new Date().toISOString(),
      },
    });
    await sendOpsLawFirmActivityEmail({
      subject: `Client uploaded requested documents: ${claimantName(row)}`,
      summary: `${claimantName(row)} uploaded ${file.name} for "${task.text}".`,
      detailLines: [
        'Forward it to the office and log "documents forwarded" (E3) when done.',
      ],
      claimUrl: adminCaseUrl(row.id),
    }).catch(() => false);
    await this.audit(
      { id: userId, email: '' },
      'client_task_document_uploaded',
      row.id,
      { customerTaskId, documentId: doc.id }
    );
    return { documentId: doc.id, taskId: customerTaskId };
  }
}
