/**
 * Payout accounts that ops manage in the admin (Settings → Payout
 * accounts). Account data is configuration entered by people, never code.
 *
 * - "atlaes": the ATLAES share (payout queue line 1, Verwendungszweck =
 *   invoice number) and the IBAN printed on the payment declaration.
 *   Until it is set, clients cannot sign (blocker atlaes_iban_missing).
 * - "summitfx_collection": route B collection account (SummitFX via
 *   TransferMate); queue line 2 for route B.
 * - "wise_collection": stored for the queue once the owner says which
 *   payouts go to Wise; not used for routing yet.
 *
 * Lookup: the admin row, else the legacy ATLAES_* env values (atlaes only),
 * else null. Cached 30 s per container and cleared on change. Every change
 * writes an audit row and mails ops.
 */

import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { env } from '../utils/env';
import { logger, toErrorMeta } from '../utils/logger';
import { auditLogs, users } from '../drizzle/schema/shared';
import { payoutAccounts } from '../drizzle/schema/payout-accounts';
import { sendOpsPayoutAccountChangedEmail } from './email';
import {
  compact,
  formatIban,
  isValidBic,
  isValidIban,
} from './payout-flow/bank-validation';

export const PAYOUT_ACCOUNT_KEYS = [
  'atlaes',
  'summitfx_collection',
  'wise_collection',
] as const;
export type PayoutAccountKey = (typeof PAYOUT_ACCOUNT_KEYS)[number];

export const PAYOUT_ACCOUNT_LABELS: Record<PayoutAccountKey, string> = {
  atlaes: 'ATLAES account',
  summitfx_collection: 'SummitFX (TransferMate) collection account',
  wise_collection: 'Wise collection account',
};

export interface PayoutAccount {
  holder: string;
  /** Grouped in fours for display ("DE51 1007 …"). */
  iban: string;
  bic: string | null;
  bank: string | null;
  reference: string | null;
}

export interface PayoutAccountView extends PayoutAccount {
  key: PayoutAccountKey;
  source: 'admin' | 'env';
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export interface PayoutAccountInput {
  holder: string;
  iban: string;
  bic?: string | null;
  bank?: string | null;
  reference?: string | null;
}

export interface Actor {
  id: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class PayoutAccountError extends Error {
  constructor(
    message: string,
    readonly field?: string
  ) {
    super(message);
  }
}

const CACHE_MS = 30_000;
let cache: {
  at: number;
  rows: Map<PayoutAccountKey, PayoutAccountView>;
} | null = null;

/** Tests only (and after every change). */
export function clearPayoutAccountCache(): void {
  cache = null;
}

/** The pre-admin configuration: ATLAES_* env values, atlaes only. */
function envAtlaes(): PayoutAccountView | null {
  const iban = process.env.ATLAES_IBAN?.trim();
  if (!iban) return null;
  return {
    key: 'atlaes',
    source: 'env',
    holder: process.env.ATLAES_ACCOUNT_HOLDER?.trim() || 'ATLAES GmbH',
    iban: formatIban(iban),
    bic: process.env.ATLAES_BIC?.trim() || null,
    bank: process.env.ATLAES_BANK?.trim() || null,
    reference: null,
    updatedAt: null,
    updatedByEmail: null,
  };
}

async function load(): Promise<Map<PayoutAccountKey, PayoutAccountView>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await db
    .select({
      key: payoutAccounts.key,
      holder: payoutAccounts.holder,
      iban: payoutAccounts.iban,
      bic: payoutAccounts.bic,
      bank: payoutAccounts.bank,
      reference: payoutAccounts.reference,
      updatedAt: payoutAccounts.updatedAt,
      updatedByEmail: users.email,
    })
    .from(payoutAccounts)
    .leftJoin(users, eq(users.id, payoutAccounts.updatedBy));
  const map = new Map<PayoutAccountKey, PayoutAccountView>();
  for (const r of rows) {
    if (!(PAYOUT_ACCOUNT_KEYS as readonly string[]).includes(r.key)) continue;
    map.set(r.key as PayoutAccountKey, {
      key: r.key as PayoutAccountKey,
      source: 'admin',
      holder: r.holder,
      iban: formatIban(r.iban),
      bic: r.bic,
      bank: r.bank,
      reference: r.reference,
      updatedAt: r.updatedAt.toISOString(),
      updatedByEmail: r.updatedByEmail ?? null,
    });
  }
  if (!map.has('atlaes')) {
    const fallback = envAtlaes();
    if (fallback) map.set('atlaes', fallback);
  }
  cache = { at: Date.now(), rows: map };
  return map;
}

const clean = (v: string | null | undefined, max: number) => {
  const t = (v ?? '').trim().replace(/\s+/g, ' ');
  return t ? t.slice(0, max) : null;
};

/** Validates and normalises admin input; throws PayoutAccountError. */
export function normalizePayoutAccount(
  input: PayoutAccountInput
): PayoutAccount {
  const holder = clean(input.holder, 200);
  if (!holder)
    throw new PayoutAccountError('Enter the account holder', 'holder');
  if (!isValidIban(input.iban)) {
    throw new PayoutAccountError('This IBAN is not valid', 'iban');
  }
  const bic = clean(input.bic, 11)?.replace(/\s/g, '').toUpperCase() ?? null;
  if (bic && !isValidBic(bic)) {
    throw new PayoutAccountError('This BIC is not valid', 'bic');
  }
  return {
    holder,
    iban: formatIban(input.iban),
    bic,
    bank: clean(input.bank, 200),
    reference: clean(input.reference, 140),
  };
}

const ibanTail = (iban: string | null | undefined) =>
  iban ? `…${compact(iban).slice(-4)}` : '—';

export class PayoutAccountsService {
  static async get(key: PayoutAccountKey): Promise<PayoutAccountView | null> {
    try {
      return (await load()).get(key) ?? null;
    } catch (error) {
      // No database answer must never invent an account; callers treat
      // null as "not configured" (signing blocked, queue line flagged).
      logger.error('[PayoutAccounts] load failed', toErrorMeta(error));
      return null;
    }
  }

  static async list(): Promise<
    Array<{
      key: PayoutAccountKey;
      label: string;
      account: PayoutAccountView | null;
    }>
  > {
    const map = await load();
    return PAYOUT_ACCOUNT_KEYS.map((key) => ({
      key,
      label: PAYOUT_ACCOUNT_LABELS[key],
      account: map.get(key) ?? null,
    }));
  }

  static async set(
    key: PayoutAccountKey,
    input: PayoutAccountInput,
    actor: Actor
  ): Promise<PayoutAccountView> {
    const next = normalizePayoutAccount(input);
    const before = (await load()).get(key) ?? null;
    const values = {
      holder: next.holder,
      iban: compact(next.iban),
      bic: next.bic,
      bank: next.bank,
      reference: next.reference,
      updatedBy: actor.id,
      updatedAt: new Date(),
    };
    await db
      .insert(payoutAccounts)
      .values({ key, ...values })
      .onConflictDoUpdate({ target: payoutAccounts.key, set: values });

    const changes = (['holder', 'iban', 'bic', 'bank', 'reference'] as const)
      .filter((f) => (before?.[f] ?? null) !== (next[f] ?? null))
      .map((f) => ({
        field: f,
        from: f === 'iban' ? ibanTail(before?.iban) : (before?.[f] ?? null),
        to: f === 'iban' ? ibanTail(next.iban) : (next[f] ?? null),
      }));
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'payout_account_set',
      resource: 'payout_account',
      details: { key, changes },
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    clearPayoutAccountCache();

    if (changes.length > 0) {
      await sendOpsPayoutAccountChangedEmail({
        accountLabel: PAYOUT_ACCOUNT_LABELS[key],
        changedBy: actor.email,
        detailLines: changes.map(
          (c) => `${c.field}: ${c.from ?? '—'} → ${c.to ?? '—'}`
        ),
        settingsUrl: `${env.ADMIN_URL.replace(/\/$/, '')}/settings`,
      }).catch((error: unknown) =>
        logger.error('[PayoutAccounts] change mail failed', toErrorMeta(error))
      );
    }
    const saved = await this.get(key);
    if (!saved) throw new Error('Payout account not readable after save');
    return saved;
  }
}
