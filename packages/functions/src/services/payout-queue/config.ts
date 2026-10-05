/**
 * Payout-queue configuration. Fee rate / cap / law-firm fee and the
 * ATLAES IBAN come from the single source in services/payout-flow/config
 * (brief Part 2 §1); the rest is environment with brief defaults.
 */

import { atlaesIban, payoutFeeConfig } from '../payout-flow/config';

export { payoutFeeConfig };

export interface AtlaesAccount {
  holder: string;
  iban: string | null;
  bic: string | null;
  bank: string | null;
}

export function atlaesAccount(): AtlaesAccount {
  return {
    holder: process.env.ATLAES_ACCOUNT_HOLDER?.trim() || 'ATLAES GmbH',
    iban: atlaesIban(),
    bic: process.env.ATLAES_BIC?.trim() || null,
    bank: process.env.ATLAES_BANK?.trim() || null,
  };
}

/** The firm's daily online-banking transfer limit (brief §5: EUR 50,000). */
export function dailyTransferLimitEur(): number {
  const n = Number(process.env.LAW_FIRM_DAILY_TRANSFER_LIMIT_EUR);
  return Number.isFinite(n) && n > 0 ? n : 50000;
}

/** Statement uploads: size cap. */
export const STATEMENT_MAX_BYTES = 5 * 1024 * 1024;
