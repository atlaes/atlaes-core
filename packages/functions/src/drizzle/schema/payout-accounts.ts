import { timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { shared, users } from './shared';

/**
 * Payout accounts entered by ops in the admin (migration 0027). Keys:
 * "atlaes" (ATLAES share, queue line 1, payment declaration),
 * "summitfx_collection" (route B, SummitFX via TransferMate) and
 * "wise_collection" (stored; routing to Wise is not decided yet).
 */
export const payoutAccounts = shared.table('payout_accounts', {
  key: varchar('key', { length: 40 }).primaryKey(),
  holder: varchar('holder', { length: 200 }).notNull(),
  iban: varchar('iban', { length: 42 }).notNull(),
  bic: varchar('bic', { length: 11 }),
  bank: varchar('bank', { length: 200 }),
  reference: varchar('reference', { length: 140 }),
  updatedBy: uuid('updated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PayoutAccountRow = typeof payoutAccounts.$inferSelect;
