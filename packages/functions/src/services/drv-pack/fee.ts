/**
 * Service-fee split on "funds received" (platform brief 16 Sep 2026,
 * Part 2 §1). Amounts are EUR with two decimals.
 *
 * Fee = 9.75 % of the amount received in escrow, capped at EUR 2,500
 * including VAT. The law-firm fee of EUR 178.50 is part of the fee;
 * the ATLAES share is fee − 178.50. Small-refund rule: when the fee is
 * ≤ 178.50 (amount ≤ 1,830.77) there is no law-firm line, ATLAES receives
 * the full fee and the case is flagged for the annual settlement.
 *
 * Rate, cap, law-firm fee and the ATLAES IBAN are configuration values —
 * pass them in; the defaults below mirror the brief.
 */

export interface FeeConfig {
  rate: number; // 0.0975
  capEur: number; // 2500
  lawFirmFeeEur: number; // 178.50
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  rate: 0.0975,
  capEur: 2500,
  lawFirmFeeEur: 178.5,
};

export interface FeeSplit {
  amountReceived: number;
  fee: number;
  capped: boolean;
  smallRefund: boolean;
  lawFirmFee: number;
  atlaesShare: number;
  clientAmount: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Amount at or below which the small-refund rule applies. */
export function smallRefundThreshold(cfg: FeeConfig = DEFAULT_FEE_CONFIG): number {
  return round2(cfg.lawFirmFeeEur / cfg.rate);
}

export function computeFeeSplit(
  amountReceived: number,
  cfg: FeeConfig = DEFAULT_FEE_CONFIG
): FeeSplit {
  if (!(amountReceived > 0)) {
    throw new Error('amountReceived must be a positive number');
  }
  const raw = round2(amountReceived * cfg.rate);
  const capped = raw > cfg.capEur;
  const fee = capped ? round2(cfg.capEur) : raw;
  const smallRefund = fee <= cfg.lawFirmFeeEur;
  const lawFirmFee = smallRefund ? 0 : round2(cfg.lawFirmFeeEur);
  const atlaesShare = round2(fee - lawFirmFee);
  const clientAmount = round2(amountReceived - fee);
  return {
    amountReceived: round2(amountReceived),
    fee,
    capped,
    smallRefund,
    lawFirmFee,
    atlaesShare,
    clientAmount,
  };
}

/** Conversion-cost tier for the SummitFX route (route panel F). */
export function conversionRateForAmount(amountEur: number): number {
  if (amountEur < 15000) return 0.015;
  if (amountEur <= 25000) return 0.01;
  return 0.007;
}
