import { jsonb, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { shared, users } from './shared';

/**
 * Plain configuration ops edit in the admin (migration 0031), one JSON
 * value per key. Keys: "postal_agent" (the postal authority's name and
 * correspondence address, used in direct-route cover letters and the
 * Postempfangsvollmacht) and "direct_dispatch_operator". See
 * services/ops-settings.ts.
 */
export const opsSettings = shared.table('ops_settings', {
  key: varchar('key', { length: 60 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OpsSettingRow = typeof opsSettings.$inferSelect;
