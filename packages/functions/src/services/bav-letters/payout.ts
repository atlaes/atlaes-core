/**
 * bAV cash-out payout recording (client answer item 5): when the Abfindung
 * arrives on the law firm's Anderkonto, ops enter the amount and value
 * date; the fee split follows drv-pack/fee.ts (9.75 %, cap EUR 2,500 incl.
 * VAT, law-firm fee EUR 178.50, small-refund rule). Pure mapping from the
 * entered figures to the claim columns; the claims service stores it.
 */

import {
  computeFeeSplit,
  DEFAULT_FEE_CONFIG,
  type FeeConfig,
  type FeeSplit,
} from '../drv-pack/fee';

export interface BavPayoutInput {
  amountEur: number;
  /** YYYY-MM-DD */
  valueDate: string;
}

/** Columns written on the claim row (decimal columns as strings). */
export interface BavPayoutColumns {
  bavPayoutAmount: string;
  bavPayoutValueDate: string;
  bavFeeEur: string;
  bavLawFirmFeeDeducted: boolean;
  bavSettlementList: boolean;
}

export interface BavPayoutRecord {
  columns: BavPayoutColumns;
  split: FeeSplit;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Maps the entered payout to the claim columns. The law-firm fee is
 * deducted whenever the split carries one; below the small-refund
 * threshold nothing is deducted and the case is flagged for the annual
 * settlement list instead.
 */
export function buildBavPayoutRecord(
  input: BavPayoutInput,
  cfg: FeeConfig = DEFAULT_FEE_CONFIG
): BavPayoutRecord {
  if (!isValidIsoDate(input.valueDate)) {
    throw new Error('Invalid payout: valueDate must be YYYY-MM-DD');
  }
  if (!(input.amountEur > 0) || !Number.isFinite(input.amountEur)) {
    throw new Error('Invalid payout: amountEur must be a positive number');
  }
  const split = computeFeeSplit(input.amountEur, cfg);
  return {
    split,
    columns: {
      bavPayoutAmount: split.amountReceived.toFixed(2),
      bavPayoutValueDate: input.valueDate,
      bavFeeEur: split.fee.toFixed(2),
      bavLawFirmFeeDeducted: !split.smallRefund,
      bavSettlementList: split.smallRefund,
    },
  };
}

export interface SettlementListRow {
  claimId: string;
  claimantName: string | null;
  lawFirmRef: string | null;
  bavProviderName: string | null;
  payoutAmount: number;
  feeEur: number;
  valueDate: string;
}

export interface SettlementList {
  year: number;
  rows: SettlementListRow[];
  totals: { payoutAmount: number; feeEur: number; count: number };
}

/** Sums the year-end list; rows are expected to be pre-filtered by year. */
export function summarizeSettlementList(
  year: number,
  rows: SettlementListRow[]
): SettlementList {
  const totals = rows.reduce(
    (acc, r) => ({
      payoutAmount: Math.round((acc.payoutAmount + r.payoutAmount) * 100) / 100,
      feeEur: Math.round((acc.feeEur + r.feeEur) * 100) / 100,
      count: acc.count + 1,
    }),
    { payoutAmount: 0, feeEur: 0, count: 0 }
  );
  return { year, rows, totals };
}
