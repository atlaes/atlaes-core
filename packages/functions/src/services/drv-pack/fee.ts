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
 * Deregistration surcharge (owner answer 9, 20 Oct 2026): when the client
 * cannot provide a German deregistration certificate (Abmeldebestätigung)
 * ATLAES adds EUR 50 including VAT to its gross service fee. It is added on
 * top of the percentage fee whether or not the cap applies, goes to ATLAES
 * in full (never to the law firm) and does not change the small-refund
 * decision, which looks at the percentage fee only. It never takes the
 * client amount below zero.
 *
 * Rate, cap, law-firm fee, surcharge and the ATLAES IBAN are configuration
 * values — pass them in; the defaults below mirror the brief.
 */

export interface FeeConfig {
  rate: number; // 0.0975
  capEur: number; // 2500
  lawFirmFeeEur: number; // 178.50
  deregistrationSurchargeEur?: number; // 50
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  rate: 0.0975,
  capEur: 2500,
  lawFirmFeeEur: 178.5,
  deregistrationSurchargeEur: 50,
};

export interface FeeSplit {
  amountReceived: number;
  /** Total fee: percentage fee (capped) + deregistration surcharge. */
  fee: number;
  /** Percentage part of the fee; `capped` refers to this part. */
  percentageFee: number;
  /** Deregistration surcharge included in `fee` and `atlaesShare`. */
  deregistrationSurcharge: number;
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
export function smallRefundThreshold(
  cfg: FeeConfig = DEFAULT_FEE_CONFIG
): number {
  return round2(cfg.lawFirmFeeEur / cfg.rate);
}

/** Surcharge amount for a claim flagged for the deregistration service. */
export function deregistrationSurchargeFor(
  flagged: boolean | null | undefined,
  cfg: FeeConfig = DEFAULT_FEE_CONFIG
): number {
  return flagged
    ? round2(
        cfg.deregistrationSurchargeEur ??
          DEFAULT_FEE_CONFIG.deregistrationSurchargeEur ??
          0
      )
    : 0;
}

export interface FeeSplitOptions {
  /** EUR added to the fee for the deregistration service (0 = none). */
  deregistrationSurchargeEur?: number;
}

export function computeFeeSplit(
  amountReceived: number,
  cfg: FeeConfig = DEFAULT_FEE_CONFIG,
  opts: FeeSplitOptions = {}
): FeeSplit {
  if (!(amountReceived > 0)) {
    throw new Error('amountReceived must be a positive number');
  }
  const raw = round2(amountReceived * cfg.rate);
  const capped = raw > cfg.capEur;
  const percentageFee = capped ? round2(cfg.capEur) : raw;
  const smallRefund = percentageFee <= cfg.lawFirmFeeEur;
  const lawFirmFee = smallRefund ? 0 : round2(cfg.lawFirmFeeEur);
  const deregistrationSurcharge = Math.max(
    0,
    Math.min(
      round2(opts.deregistrationSurchargeEur ?? 0),
      round2(amountReceived - percentageFee)
    )
  );
  const fee = round2(percentageFee + deregistrationSurcharge);
  const atlaesShare = round2(fee - lawFirmFee);
  const clientAmount = round2(amountReceived - fee);
  return {
    amountReceived: round2(amountReceived),
    fee,
    percentageFee,
    deregistrationSurcharge,
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
