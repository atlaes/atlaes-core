import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { leads, type Lead } from '../../drizzle/schema/leads';
import { sendVblReminderDueEmail, sendVblReminderSetEmail } from '../email';

/**
 * VBL waiting-period reminders ("Set reminder" on the calculator and the
 * get-started result: VddB/VddKO refunds can only start 24 months after
 * the employment ended).
 *
 * Stored as a lead row of type 'vbl-reminder' with `reminder_due_on` = the
 * first day the refund can start. Deliberately NOT in LEAD_TYPES: the
 * public /api/leads endpoint and createLead() send GPR-branded mails.
 * These rows get CompanyPension-branded mail instead: a confirmation on
 * creation (`delivery_email_sent_at`) and, from the daily leads cron
 * (processDueReminders), the "you can start now" e-mail on the due date
 * (`reminder_sent_at`).
 */
export const VBL_REMINDER_TYPE = 'vbl-reminder';
export type VblReminderSource = 'calculator' | 'get-started';

export interface VblReminderInput {
  email: string;
  /** YYYY-MM-DD, the first day the refund can be started. */
  eligibleOn: string;
  source: VblReminderSource;
  pensionProvider?: string | null;
}

export interface VblReminderMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Stores the reminder. Idempotent per e-mail + due date: asking twice for
 * the same date returns the stored row instead of a duplicate.
 */
export async function createVblReminder(
  input: VblReminderInput,
  meta: VblReminderMeta = {}
): Promise<Lead> {
  const email = input.email.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.type, VBL_REMINDER_TYPE),
        eq(leads.email, email),
        eq(leads.reminderDueOn, input.eligibleOn),
        isNull(leads.reminderSentAt)
      )
    )
    .limit(1);
  if (existing) return existing;

  const [lead] = await db
    .insert(leads)
    .values({
      type: VBL_REMINDER_TYPE,
      email,
      placement: input.pensionProvider?.trim() || null,
      widget:
        input.source === 'calculator' ? 'VBL-CALCULATOR' : 'VBL-GET-STARTED',
      reminderOptIn: true,
      reminderDueOn: input.eligibleOn,
      canApplyFrom: input.eligibleOn,
      consentPrivacy: true,
      source: 'api',
      ipAddress: meta.ipAddress?.trim() || null,
      userAgent: meta.userAgent ? meta.userAgent.slice(0, 500) : null,
    })
    .returning();
  logger.info('VBL reminder stored', {
    id: lead.id,
    dueOn: input.eligibleOn,
    source: input.source,
  });

  // Confirmation now; the start e-mail comes from the cron on the due date.
  // A mail failure is logged and leaves the stamp null; the row stands.
  const confirmed = await sendVblReminderSetEmail(email, {
    eligibleOn: input.eligibleOn,
    pensionProvider: lead.placement,
  });
  if (!confirmed) return lead;

  const now = new Date();
  const [updated] = await db
    .update(leads)
    .set({ deliveryEmailSentAt: now, updatedAt: now })
    .where(eq(leads.id, lead.id))
    .returning();
  return updated;
}

/** The due-date e-mail for one VBL reminder row; true when sent. */
export async function sendVblReminderDue(lead: Lead): Promise<boolean> {
  if (!lead.reminderDueOn) return false;
  return sendVblReminderDueEmail(lead.email, {
    eligibleOn: lead.reminderDueOn,
    pensionProvider: lead.placement,
  });
}
