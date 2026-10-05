/**
 * Release-screen split panel (brief Part 3 C; Figma 10 standard / 13 small
 * refund). Labels verbatim from text C; figures from `computeFeeSplit`
 * with the configured rate, cap and law-firm fee.
 *
 *  - standard: refund · fee · two "Included:" lines · amount available ·
 *    expander "What does the service fee cover?"
 *  - small refund (fee ≤ law-firm fee): refund · fee · amount available;
 *    no "Included:" lines, no expander. The case is flagged
 *    "small refund – annual settlement".
 *
 * "capped at €2,500" appears only when the cap applies.
 */

import {
  computeFeeSplit,
  DEFAULT_FEE_CONFIG,
  type FeeConfig,
  type FeeSplit,
} from '../drv-pack/fee';

export const SMALL_REFUND_FLAG = 'small refund – annual settlement';

const EUR = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** €29,601.90 */
export function eur(n: number): string {
  return `€${EUR.format(n)}`;
}

/** €2,500 / €2,500.50 — whole euros without decimals (cap wording). */
export function eurShort(n: number): string {
  return Number.isInteger(n)
    ? `€${new Intl.NumberFormat('en-GB').format(n)}`
    : eur(n);
}

/** 0.0975 → "9.75%" */
export function percent(rate: number): string {
  return `${Number((rate * 100).toFixed(2))}%`;
}

export type FeePanelRowKind = 'refund' | 'fee' | 'included' | 'total';

export interface FeePanelRow {
  kind: FeePanelRowKind;
  label: string;
  amount: string; // formatted, incl. "− " for the fee
  value: number;
}

export interface FeePanel {
  variant: 'standard' | 'small';
  title: string;
  rows: FeePanelRow[];
  note: string;
  expander: { title: string; paragraphs: string[] } | null;
  split: FeeSplit;
  flags: string[];
}

export const FEE_PANEL_TITLE = 'Your refund and payout';
export const FEE_PANEL_NOTE =
  'Any currency-conversion or bank charges depend on your chosen payout option.';
export const EXPANDER_TITLE = 'What does the service fee cover?';

export function expanderParagraphs(cfg: FeeConfig): string[] {
  return [
    `One service fee covers our service and our partner law firm’s legal and escrow services. It is ${percent(cfg.rate)} of your approved refund, capped at ${eurShort(cfg.capEur)}, including VAT.`,
    `Our partner law firm, Vividius Rechtsanwälte, checks and submits your application and provides a German client escrow account to receive your refund from the pension office and arrange your payout. Its fixed fee of ${eur(cfg.lawFirmFeeEur)} including VAT is already included in the service fee shown above.`,
    'The remainder goes to ATLAES GmbH, the company behind Germany Pension Refund, for preparing and coordinating your case, handling day-to-day communication and supporting you through to payout.',
    'The payment instruction you sign shows the exact amount paid to each company. Both amounts are deducted directly from your refund.',
    'Any currency-conversion or bank charges depend on your payout option. Separate representation in an objection, appeal or court proceeding is not automatically included and would be agreed separately.',
  ];
}

export function feeLabel(split: FeeSplit, cfg: FeeConfig): string {
  return split.capped
    ? `Service fee — capped at ${eurShort(cfg.capEur)}, including VAT`
    : `Service fee — ${percent(cfg.rate)}, including VAT`;
}

export function buildFeePanel(
  amountReceivedEur: number,
  cfg: FeeConfig = DEFAULT_FEE_CONFIG
): FeePanel {
  const split = computeFeeSplit(amountReceivedEur, cfg);
  const rows: FeePanelRow[] = [
    {
      kind: 'refund',
      label: 'Refund paid by the pension office',
      amount: eur(split.amountReceived),
      value: split.amountReceived,
    },
    {
      kind: 'fee',
      label: feeLabel(split, cfg),
      amount: `− ${eur(split.fee)}`,
      value: split.fee,
    },
  ];
  if (!split.smallRefund) {
    rows.push(
      {
        kind: 'included',
        label: 'Included: legal and escrow services — Vividius Rechtsanwälte',
        amount: eur(split.lawFirmFee),
        value: split.lawFirmFee,
      },
      {
        kind: 'included',
        label: 'Included: Germany Pension Refund service — ATLAES GmbH',
        amount: eur(split.atlaesShare),
        value: split.atlaesShare,
      }
    );
  }
  rows.push({
    kind: 'total',
    label: 'Amount available for payout',
    amount: eur(split.clientAmount),
    value: split.clientAmount,
  });
  return {
    variant: split.smallRefund ? 'small' : 'standard',
    title: FEE_PANEL_TITLE,
    rows,
    note: FEE_PANEL_NOTE,
    expander: split.smallRefund
      ? null
      : { title: EXPANDER_TITLE, paragraphs: expanderParagraphs(cfg) },
    split,
    flags: split.smallRefund ? [SMALL_REFUND_FLAG] : [],
  };
}
