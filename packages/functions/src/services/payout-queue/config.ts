/**
 * Payout-queue configuration. Fee rate / cap / law-firm fee come from the
 * single source in services/payout-flow/config (brief Part 2 §1); the
 * ATLAES and collection accounts are set by ops in the admin
 * (services/payout-accounts.ts); the rest is environment with brief
 * defaults.
 */

import { payoutFeeConfig } from '../payout-flow/config';
import {
  PayoutAccountsService,
  type PayoutAccountKey,
} from '../payout-accounts';
import type { CollectionAccount } from './lines';

export { payoutFeeConfig };

export interface AtlaesAccount {
  holder: string;
  iban: string | null;
  bic: string | null;
  bank: string | null;
}

export async function atlaesAccount(): Promise<AtlaesAccount> {
  const a = await PayoutAccountsService.get('atlaes');
  return {
    holder: a?.holder || 'ATLAES GmbH',
    iban: a?.iban ?? null,
    bic: a?.bic ?? null,
    bank: a?.bank ?? null,
  };
}

/** A provider collection account from the admin, in queue-line form. */
export async function collectionAccount(
  key: Exclude<PayoutAccountKey, 'atlaes'>
): Promise<CollectionAccount | null> {
  const a = await PayoutAccountsService.get(key);
  return a
    ? {
        holder: a.holder,
        iban: a.iban,
        bic: a.bic,
        bank: a.bank,
        reference: a.reference,
      }
    : null;
}

/** The firm's daily online-banking transfer limit (brief §5: EUR 50,000). */
export function dailyTransferLimitEur(): number {
  const n = Number(process.env.LAW_FIRM_DAILY_TRANSFER_LIMIT_EUR);
  return Number.isFinite(n) && n > 0 ? n : 50000;
}

/** Statement uploads: size cap. */
export const STATEMENT_MAX_BYTES = 5 * 1024 * 1024;
