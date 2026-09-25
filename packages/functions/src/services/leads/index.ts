import { and, eq, isNull, isNotNull, lte, inArray } from 'drizzle-orm';
import { db } from '../../utils/db';
import { logger, toErrorMeta } from '../../utils/logger';
import { getPresignedUrl } from '../../utils/s3';
import { leads, type Lead, type NewLead } from '../../drizzle/schema/leads';
import {
  leadsConfig,
  guideKeyForType,
  type GuideKey,
  type LeadType,
} from './config';
import {
  applyFromDate,
  formatApplyLabel,
  parseContributionMonth,
  reminderDueOnFor,
  toIsoDate,
} from './reminder';
import { renderGuideDeliveryEmail } from './emails/delivery';
import { renderReminderEmail } from './emails/reminder';
import {
  renderClaimLeadTeamNotice,
  renderGuideTeamNotice,
} from './emails/team-notice';
import { renderWelcomeEmail } from './emails/welcome';
import { sendLeadMail } from './emails/send';

export interface CreateLeadInput {
  type: LeadType;
  placement?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  reminderOptIn?: boolean;
  lastContributionMonth?: string | null; // YYYY-MM
  verdict?: string | null;
  verdictTitle?: string | null;
  citizenship?: string | null;
  residence?: string | null;
  canApplyFrom?: string | null;
  estimateEur?: number | null;
  incomeEntered?: string | null;
  widget?: string | null;
  via?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  consentPrivacy?: boolean;
  consentMarketing?: boolean;
  submittedAt?: string | null; // ISO, client clock
}

export interface CreateLeadMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Presigned S3 links are valid for the SigV4 maximum of 7 days. */
const GUIDE_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Resolves the guide location from env: an https URL is used as-is, any
 * other value is an S3 key in the platform bucket. Returns null when
 * nothing is configured or the bucket is unavailable (local dev).
 */
export async function resolveGuideUrl(key: GuideKey): Promise<string | null> {
  const location = leadsConfig.guides[key].location?.trim();
  if (!location) return null;
  if (/^https?:\/\//i.test(location)) return location;
  try {
    return await getPresignedUrl(location, GUIDE_LINK_TTL_SECONDS);
  } catch (error) {
    logger.error('Guide presign failed', { key, ...toErrorMeta(error) });
    return null;
  }
}

function parseClientTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function blank(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/**
 * Stores the lead, then sends the delivery/welcome e-mail and the team
 * notice. Mail failures are logged and leave the *_sent_at stamps null;
 * they never fail the request (the lead is already stored).
 */
export async function createLead(
  input: CreateLeadInput,
  meta: CreateLeadMeta = {}
): Promise<Lead> {
  const guide = guideKeyForType(input.type);
  const reminderOptIn = guide !== null && !!input.reminderOptIn;
  const lastContributionMonth = reminderOptIn
    ? blank(input.lastContributionMonth)
    : null;
  const widget =
    blank(input.widget) ??
    (guide ? leadsConfig.guides[guide].defaultWidget : 'REFUND-WIDGET');

  const row: NewLead = {
    type: input.type,
    placement: blank(input.placement),
    email: input.email.trim().toLowerCase(),
    firstName: blank(input.firstName),
    lastName: blank(input.lastName),
    reminderOptIn,
    lastContributionMonth,
    reminderDueOn: reminderOptIn
      ? reminderDueOnFor(lastContributionMonth)
      : null,
    verdict: blank(input.verdict),
    verdictTitle: blank(input.verdictTitle),
    citizenship: blank(input.citizenship),
    residence: blank(input.residence),
    canApplyFrom: blank(input.canApplyFrom),
    estimateEur: input.estimateEur ?? null,
    incomeEntered: blank(input.incomeEntered),
    widget,
    via: blank(input.via),
    referrer: blank(input.referrer),
    landingPage: blank(input.landingPage),
    utmSource: blank(input.utmSource),
    utmMedium: blank(input.utmMedium),
    utmCampaign: blank(input.utmCampaign),
    utmTerm: blank(input.utmTerm),
    utmContent: blank(input.utmContent),
    gclid: blank(input.gclid),
    fbclid: blank(input.fbclid),
    consentPrivacy: !!input.consentPrivacy,
    consentMarketing: !!input.consentMarketing,
    source: 'api',
    submittedAt: parseClientTimestamp(input.submittedAt),
    ipAddress: blank(meta.ipAddress),
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 500) : null,
  };

  const [lead] = await db.insert(leads).values(row).returning();
  logger.info('Lead stored', { id: lead.id, type: lead.type, widget });

  const delivered = guide
    ? await sendGuideDelivery(lead, guide)
    : await sendWelcome(lead);
  const noticed = guide
    ? await sendGuideTeamNotice(lead, guide)
    : await sendClaimLeadTeamNotice(lead);

  if (delivered || noticed) {
    const now = new Date();
    const [updated] = await db
      .update(leads)
      .set({
        deliveryEmailSentAt: delivered ? now : null,
        teamNoticeSentAt: noticed ? now : null,
        updatedAt: now,
      })
      .where(eq(leads.id, lead.id))
      .returning();
    return updated;
  }
  return lead;
}

async function sendGuideDelivery(
  lead: Lead,
  guide: GuideKey
): Promise<boolean> {
  const guideUrl = await resolveGuideUrl(guide);
  const mail = renderGuideDeliveryEmail({
    guide,
    reminderOptIn: lead.reminderOptIn,
    guideUrl,
    pageUrl: leadsConfig.guides[guide].pageUrl,
    senderName: leadsConfig.senderName,
  });
  return sendLeadMail({ to: lead.email, ...mail }, `${guide} guide delivery`);
}

async function sendWelcome(lead: Lead): Promise<boolean> {
  const mail = renderWelcomeEmail({
    firstName: lead.firstName ?? '',
    isWaiting: lead.verdict === 'warn',
    canApplyFrom: lead.canApplyFrom,
    signaturePhotoUrl: leadsConfig.signaturePhotoUrl ?? null,
    calendlyUrl: leadsConfig.calendlyUrl,
    reviewsUrl: leadsConfig.reviewsUrl,
    siteUrl: leadsConfig.siteUrl,
  });
  return sendLeadMail({ to: lead.email, ...mail }, 'widget welcome');
}

async function sendGuideTeamNotice(
  lead: Lead,
  guide: GuideKey
): Promise<boolean> {
  const to = leadsConfig.notifyEmail;
  const mail = renderGuideTeamNotice({
    guide,
    email: lead.email,
    reminderOptIn: lead.reminderOptIn,
    lastContributionMonth: lead.lastContributionMonth,
    widget: lead.widget ?? leadsConfig.guides[guide].defaultWidget,
    referrer: lead.referrer,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
  });
  if (!to) {
    logger.info('[Email] LEADS_NOTIFY_EMAIL unset; team notice not mailed', {
      subject: mail.subject,
    });
    return false;
  }
  return sendLeadMail({ to, ...mail }, 'guide team notice');
}

async function sendClaimLeadTeamNotice(lead: Lead): Promise<boolean> {
  const to = leadsConfig.notifyEmail;
  const mail = renderClaimLeadTeamNotice({
    firstName: lead.firstName ?? '',
    lastName: lead.lastName ?? '',
    email: lead.email,
    verdict: lead.verdict ?? '',
    verdictTitle: lead.verdictTitle ?? '',
    citizenship: lead.citizenship ?? '',
    residence: lead.residence ?? '',
    canApplyFrom: lead.canApplyFrom,
    estimateEur: lead.estimateEur,
    incomeEntered: lead.incomeEntered,
    widget: lead.widget ?? '',
    referrer: lead.referrer,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    submittedAt: lead.submittedAt?.toISOString() ?? '',
  });
  if (!to) {
    logger.info('[Email] LEADS_NOTIFY_EMAIL unset; team notice not mailed', {
      subject: mail.subject,
    });
    return false;
  }
  return sendLeadMail({ to, ...mail }, 'widget lead team notice');
}

export interface ReminderRunResult {
  due: number;
  sent: number;
  failed: number;
}

/**
 * Daily job (checkGuideReminders): every opted-in guide lead whose
 * `reminder_due_on` (1st of month +23) is on or before today's calendar
 * day and that has not been reminded yet gets exactly one reminder.
 */
export async function processDueReminders(
  now: Date = new Date()
): Promise<ReminderRunResult> {
  const today = toIsoDate(now);
  const due = await db
    .select()
    .from(leads)
    .where(
      and(
        inArray(leads.type, ['v0900-guide', 'wegzug-guide']),
        eq(leads.reminderOptIn, true),
        isNull(leads.reminderSentAt),
        isNotNull(leads.reminderDueOn),
        lte(leads.reminderDueOn, today)
      )
    );

  const result: ReminderRunResult = { due: due.length, sent: 0, failed: 0 };
  for (const lead of due) {
    const guide = guideKeyForType(lead.type as LeadType);
    const cm = parseContributionMonth(lead.lastContributionMonth);
    if (!guide || !cm) {
      logger.warn('Reminder skipped: unusable lead row', { id: lead.id });
      result.failed += 1;
      continue;
    }
    const mail = renderReminderEmail({
      guide,
      applyLabel: formatApplyLabel(applyFromDate(cm)),
      pageUrl: leadsConfig.guides[guide].pageUrl,
      siteUrl: leadsConfig.siteUrl,
      senderName: leadsConfig.senderName,
    });
    const ok = await sendLeadMail(
      { to: lead.email, ...mail },
      `${guide} waiting-period reminder`
    );
    if (!ok) {
      result.failed += 1;
      continue;
    }
    await db
      .update(leads)
      .set({ reminderSentAt: now, updatedAt: now })
      .where(eq(leads.id, lead.id));
    result.sent += 1;
  }
  logger.info('Lead reminder run finished', { today, ...result });
  return result;
}
