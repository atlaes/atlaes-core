import { jsonb, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { shared, users } from './shared';

/**
 * Integration credentials managed in the admin (migration 0024). One row
 * per integration key ("lexoffice"). `secret_encrypted` is sealed with
 * services/totp/secret-box.ts; `last4` is all the UI ever shows.
 * `details` holds what the last connection check returned (company name).
 */
export const integrationSettings = shared.table('integration_settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  secretEncrypted: text('secret_encrypted').notNull(),
  last4: varchar('last4', { length: 4 }).notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  updatedBy: uuid('updated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IntegrationSettingRow = typeof integrationSettings.$inferSelect;
