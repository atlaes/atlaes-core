/**
 * Drizzle view of the claim columns added by migration 0021
 * (invoice_number, paid_out_at). `drizzle/schema/claims.ts` is owned by
 * another stream and drizzle-kit rejects a second table object for the
 * same physical table inside its schema glob, so this lives outside
 * `drizzle/schema/` and is never exported from the schema index (same
 * pattern as services/client-updates/case-columns.ts).
 */

import { pgSchema, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const claimsSchema = pgSchema('claims');

export const claimPayoutColumns = claimsSchema.table('claims', {
  id: uuid('id').primaryKey(),
  // Current ATLAES invoice number (latest non-cancelled invoice).
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  // Event "Paid out": every payout line marked paid.
  paidOutAt: timestamp('paid_out_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});
