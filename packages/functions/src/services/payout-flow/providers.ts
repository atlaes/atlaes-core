/**
 * Payout provider register (brief Part 2 §3 and §5, Part 3 F) — config
 * constant. Route A = SEPA in euros, B = conversion through SummitFX,
 * C = euros by SWIFT, converted by the receiving bank.
 *
 * Option 2 is offered for every currency on the TransferMate list (owner
 * routing file, 30 Oct 2026, see currency-routing.ts); the estimate in the
 * client's currency is shown only when a mid-market reference rate (daily
 * ECB rate) is available. TransferMate executes the payment. The
 * collection account for route B lines is set by ops in the admin
 * (services/payout-accounts.ts, key summitfx_collection);
 * `collectionAccount` here stays null.
 */

import { round2 } from '../drv-pack/fee';
import { normaliseCurrency, TRANSFERMATE_CURRENCIES } from './currency-routing';

export type PayoutRouteCode = 'A' | 'B' | 'C';

export interface ConversionTier {
  /** Applies while amountEur < `belowEur` (last tier: no bound). */
  belowEur: number | null;
  /** Inclusive upper bound alternative (brief: "from 15,000 to 25,000"). */
  upToEur?: number;
  rate: number;
}

export interface ProviderCurrency {
  currency: string; // ISO 4217
  /** "[regulated payment institution]" in text F; null = not yet supplied. */
  executedBy: string | null;
  /** Collection account the law firm pays into for route B (queue line 2). */
  collectionAccount: {
    holder: string;
    iban: string;
    bic: string | null;
    reference: string | null;
  } | null;
}

export const SUMMITFX = {
  name: 'SummitFX',
  // Tier rule (text F): 1.5% below EUR 15,000 · 1.0% from EUR 15,000 to
  // 25,000 · 0.7% above EUR 25,000, applied to the amount available.
  tiers: [
    { belowEur: 15000, rate: 0.015 },
    { belowEur: null, upToEur: 25000, rate: 0.01 },
    { belowEur: null, rate: 0.007 },
  ] as ConversionTier[],
  currencies: Object.keys(TRANSFERMATE_CURRENCIES).map(
    (currency): ProviderCurrency => ({
      currency,
      executedBy: 'TransferMate',
      collectionAccount: null,
    })
  ),
} as const;

export const PROVIDER_REGISTER = {
  A: { route: 'A' as const, label: 'SEPA', provider: null },
  B: { route: 'B' as const, label: 'SummitFX', provider: SUMMITFX },
  C: { route: 'C' as const, label: 'SWIFT', provider: null },
};

export function summitFxCurrency(currency: string): ProviderCurrency | null {
  const c = normaliseCurrency(currency);
  return SUMMITFX.currencies.find((x) => x.currency === c) ?? null;
}

/** Conversion cost rate for the amount available for payout (EUR). */
export function conversionCostRate(amountEur: number): number {
  if (amountEur < 15000) return 0.015;
  if (amountEur <= 25000) return 0.01;
  return 0.007;
}

export interface ReferenceRate {
  /** Units of `currency` per 1 EUR (ECB convention). */
  rate: number;
  /** Rate date (YYYY-MM-DD) — "[date/time]" in the footnote. */
  date: string;
}

export interface RouteOption {
  option: 1 | 2 | 3;
  route: PayoutRouteCode;
  available: boolean;
  costRate: number | null;
  costEur: number | null;
  estimatedTargetAmount: number | null;
  executedBy: string | null;
}

export interface RouteOptions {
  currency: string;
  amountAvailableEur: number;
  /** false for EUR accounts: SEPA, no route choice. */
  choiceNeeded: boolean;
  options: RouteOption[];
  referenceRate: ReferenceRate | null;
}

export function buildRouteOptions(input: {
  amountAvailableEur: number;
  currency: string;
  referenceRate: ReferenceRate | null;
}): RouteOptions {
  const currency = normaliseCurrency(input.currency);
  const amount = input.amountAvailableEur;
  if (currency === 'EUR') {
    return {
      currency,
      amountAvailableEur: amount,
      choiceNeeded: false,
      options: [
        {
          option: 1,
          route: 'A',
          available: true,
          costRate: null,
          costEur: null,
          estimatedTargetAmount: null,
          executedBy: null,
        },
      ],
      referenceRate: null,
    };
  }
  const reg = summitFxCurrency(currency);
  const rate = input.referenceRate;
  const option2Available = !!reg;
  const hasRate = !!rate && rate.rate > 0;
  const p = conversionCostRate(amount);
  const cost = round2(amount * p);
  return {
    currency,
    amountAvailableEur: amount,
    choiceNeeded: true,
    referenceRate: rate,
    options: [
      {
        option: 1,
        route: 'A',
        available: true,
        costRate: null,
        costEur: null,
        estimatedTargetAmount: null,
        executedBy: null,
      },
      {
        option: 2,
        route: 'B',
        available: option2Available,
        costRate: option2Available ? p : null,
        costEur: option2Available ? cost : null,
        estimatedTargetAmount:
          option2Available && hasRate && rate
            ? round2((amount - cost) * rate.rate)
            : null,
        executedBy: reg?.executedBy ?? null,
      },
      {
        option: 3,
        route: 'C',
        available: true,
        costRate: null,
        costEur: null,
        estimatedTargetAmount: null,
        executedBy: null,
      },
    ],
  };
}

/** Option number → ZE route letter. */
export function routeForOption(option: 1 | 2 | 3): PayoutRouteCode {
  return option === 1 ? 'A' : option === 2 ? 'B' : 'C';
}
