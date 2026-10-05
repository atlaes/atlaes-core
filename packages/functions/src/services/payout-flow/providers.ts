/**
 * Payout provider register (brief Part 2 §3 and §5, Part 3 F) — config
 * constant. Route A = SEPA in euros, B = conversion through SummitFX,
 * C = euros by SWIFT, converted by the receiving bank.
 *
 * Option 2 is offered only for currencies the register lists, and only
 * when a mid-market reference rate is available at display time (daily
 * ECB rate). The currency list, executing institution and collection
 * accounts are PROVISIONAL until the client supplies the register; the
 * payout queue reads `collectionAccount` for route B lines.
 */

import { round2 } from '../drv-pack/fee';

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
  currencies: [
    'USD',
    'GBP',
    'AUD',
    'CAD',
    'NZD',
    'CHF',
    'INR',
    'ZAR',
    'BRL',
    'MXN',
    'TRY',
    'PLN',
    'CZK',
    'HUF',
    'SEK',
    'NOK',
    'DKK',
    'JPY',
    'SGD',
    'HKD',
  ].map(
    (currency): ProviderCurrency => ({
      currency,
      executedBy: null,
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
  const c = currency.toUpperCase();
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
  const currency = input.currency.toUpperCase();
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
  const option2Available = !!reg && !!rate && rate.rate > 0;
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
          option2Available && rate ? round2((amount - cost) * rate.rate) : null,
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
