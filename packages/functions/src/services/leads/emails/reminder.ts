/**
 * Waiting-period reminder (checkGuideReminders in the Apps Script): plain
 * text, one per opted-in lead, sent on the 1st of month +23.
 */
import type { GuideKey } from '../config';
import { GUIDE_COPY } from './guides';

export interface ReminderEmailInput {
  guide: GuideKey;
  /** e.g. '1. März 2027' — see formatApplyLabel(). */
  applyLabel: string;
  pageUrl: string;
  siteUrl: string;
  senderName: string;
}

export function renderReminderEmail(input: ReminderEmailInput): {
  subject: string;
  text: string;
} {
  const g = GUIDE_COPY[input.guide];
  return {
    subject: g.reminderSubject,
    text: g.reminderBody(input.applyLabel, {
      pageUrl: input.pageUrl,
      siteUrl: input.siteUrl,
      senderName: input.senderName,
    }),
  };
}
