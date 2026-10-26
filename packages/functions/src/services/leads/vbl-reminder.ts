import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { leads, type Lead } from '../../drizzle/schema/leads';

/**
 * VBL waiting-period reminders ("Set reminder" on the calculator and the
 * get-started result: VddB/VddKO refunds can only start 24 months after
 * the employment ended).
 *
 * Stored as a lead row of type 'vbl-reminder' with `reminder_due_on` = the
 * first day the refund can start. Deliberately NOT in LEAD_TYPES: the
 * public /api/leads endpoint and createLead() send GPR-branded mails, and
 * processDueReminders() only picks up the two GPR guide types, so these
 * rows are stored and nothing is sent yet. The reminder e-mail itself is
 * still owed by the owner (open item "waiting-period reminder e-mail").
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
  return lead;
}
