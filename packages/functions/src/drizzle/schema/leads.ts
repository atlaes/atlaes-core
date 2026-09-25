import {
  boolean,
  date,
  index,
  integer,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { gpr } from './gpr';

/**
 * Lead capture (replaces the Google Apps Script endpoint v7.3 and its
 * "V0900" / "Wegzug" / "Leads" sheet tabs).
 *
 * type:
 *   'v0900-guide'  — German V0900 guide PDF request (widget gpr-v0900-capture)
 *   'wegzug-guide' — German Wegzugs-Checkliste PDF request (gpr-wegzug-capture)
 *   'claim-lead'   — English refund-widget lead (gpr-refund-widget, verdict etc.)
 *
 * Reminder rule (guides only, explicit opt-in): the 24-month waiting period
 * ends 24 full calendar months after the last contribution month, so the
 * application is possible from the 1st of month +25. The reminder goes out
 * on the 1st of month +23 (`reminder_due_on`), exactly once
 * (`reminder_sent_at`).
 */
export const leads = gpr.table(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 30 }).notNull(),
    placement: varchar('placement', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),

    // Waiting-period reminder (§ 7 UWG: only with the explicit opt-in)
    reminderOptIn: boolean('reminder_opt_in').notNull().default(false),
    lastContributionMonth: varchar('last_contribution_month', { length: 7 }), // YYYY-MM
    reminderDueOn: date('reminder_due_on'), // 1st of month +23
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),

    // Refund-widget context (claim-lead only)
    verdict: varchar('verdict', { length: 20 }), // 'ok' | 'warn' | 'no'
    verdictTitle: varchar('verdict_title', { length: 255 }),
    citizenship: varchar('citizenship', { length: 255 }),
    residence: varchar('residence', { length: 255 }),
    canApplyFrom: varchar('can_apply_from', { length: 50 }),
    estimateEur: integer('estimate_eur'),
    incomeEntered: varchar('income_entered', { length: 50 }),

    // Attribution
    widget: varchar('widget', { length: 100 }),
    via: varchar('via', { length: 100 }),
    referrer: varchar('referrer', { length: 2000 }),
    landingPage: varchar('landing_page', { length: 2000 }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    gclid: varchar('gclid', { length: 255 }),
    fbclid: varchar('fbclid', { length: 255 }),

    // Consent flags as ticked in the widget/form
    consentPrivacy: boolean('consent_privacy').notNull().default(false),
    consentMarketing: boolean('consent_marketing').notNull().default(false),

    // Delivery bookkeeping
    deliveryEmailSentAt: timestamp('delivery_email_sent_at', {
      withTimezone: true,
    }),
    teamNoticeSentAt: timestamp('team_notice_sent_at', { withTimezone: true }),

    // Sheet columns kept for the import ("Replied", "Status")
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    status: varchar('status', { length: 50 }),

    // Request metadata
    source: varchar('source', { length: 30 }).notNull().default('api'), // 'api' | 'sheet-import'
    submittedAt: timestamp('submitted_at', { withTimezone: true }), // client clock
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: index('leads_email_idx').on(table.email),
    reminderIdx: index('leads_reminder_due_idx').on(
      table.reminderOptIn,
      table.reminderSentAt,
      table.reminderDueOn
    ),
  })
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
