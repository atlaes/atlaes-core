/**
 * Payout configuration (brief Part 2 §1: rate, cap, law-firm fee and the
 * ATLAES IBAN are configuration values, rendered into the ZE, the release
 * panel and the payout queue from this single source). Environment
 * overrides; defaults mirror the brief. The ATLAES IBAN has no default —
 * signing is refused until it is configured.
 */

import { DEFAULT_FEE_CONFIG, type FeeConfig } from '../drv-pack/fee';

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function payoutFeeConfig(): FeeConfig {
  return {
    rate: num('PAYOUT_FEE_RATE', DEFAULT_FEE_CONFIG.rate),
    capEur: num('PAYOUT_FEE_CAP_EUR', DEFAULT_FEE_CONFIG.capEur),
    lawFirmFeeEur: num(
      'PAYOUT_LAW_FIRM_FEE_EUR',
      DEFAULT_FEE_CONFIG.lawFirmFeeEur
    ),
  };
}

export function atlaesIban(): string | null {
  const v = process.env.ATLAES_IBAN?.trim();
  return v ? v : null;
}

/** Version tag of the route-panel disclosure text (text F, provisional). */
export const ROUTE_DISCLOSURE_VERSION = 'F-2026-09-16-provisional';
