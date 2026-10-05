import {
  bigint,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { lawFirms, shared, users } from './shared';

/**
 * Two-factor sign-in for the law-firm portal (migration 0022).
 *
 * One row per user. `secret_encrypted` is the TOTP key sealed with
 * AES-256-GCM (services/totp/secret-box.ts, key TOTP_ENCRYPTION_KEY).
 * The row exists with enabled = false between "start enrolment" and the
 * first confirmed code. `last_used_step` blocks replay of an accepted
 * code; `failed_attempts`/`locked_until` throttle guessing.
 */
export interface StoredRecoveryCode {
  hash: string;
  usedAt: string | null;
}

export const userTotp = shared.table('user_totp', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  secretEncrypted: text('secret_encrypted').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  enabledAt: timestamp('enabled_at', { withTimezone: true }),
  lastUsedStep: bigint('last_used_step', { mode: 'number' }),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  recoveryCodes: jsonb('recovery_codes')
    .$type<StoredRecoveryCode[]>()
    .notNull()
    .default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Optional per-firm IP allowlist. No rows for a firm = no restriction.
 * `cidr` is an IPv4/IPv6 address or CIDR range ("203.0.113.0/24").
 */
export const lawFirmIpAllowlist = shared.table(
  'law_firm_ip_allowlist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lawFirmId: uuid('law_firm_id')
      .notNull()
      .references(() => lawFirms.id, { onDelete: 'cascade' }),
    cidr: varchar('cidr', { length: 64 }).notNull(),
    label: varchar('label', { length: 255 }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    firmCidrUnique: unique('law_firm_ip_allowlist_firm_cidr_unique').on(
      t.lawFirmId,
      t.cidr
    ),
  })
);
