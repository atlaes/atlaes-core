/**
 * Transfer lines per released case (platform brief Part 2 §5), pure:
 *  (1) ATLAES share → ATLAES IBAN, Verwendungszweck = invoice number;
 *  (2) client remainder → client account (SEPA, route A), the provider
 *      collection account for route B (provider register), or the client
 *      account by SWIFT (route C); Verwendungszweck "Beitragserstattung
 *      [client name]" or the provider's required reference.
 * The law-firm fee is retained — no line.
 */

import { round2 } from '../drv-pack/fee';
import type { PayoutAccount } from '../../drizzle/schema/payout';
import type { PayoutLineKind } from '../../drizzle/schema/payout-queue';
import type { AtlaesAccount } from './config';

export type RouteCode = 'A' | 'B' | 'C';

export interface CollectionAccount {
  holder: string;
  iban: string;
  bic: string | null;
  reference: string | null;
}

export interface ReleaseFigures {
  amountReceived: number;
  fee: number;
  feeCapped: boolean;
  smallRefund: boolean;
  lawFirmFee: number;
  atlaesShare: number;
  clientAmount: number;
  invoiceNumber: string | null;
  route: RouteCode | null;
  account: PayoutAccount | null;
}

export interface PayoutLineDraft {
  kind: PayoutLineKind;
  route: RouteCode | null;
  recipient: string;
  amount: number;
  account: string;
  bic: string | null;
  bank: string | null;
  transferMethod: 'SEPA' | 'SWIFT';
  reference: string;
  currency: string | null;
  remarks: string | null;
}

export const MISSING = {
  atlaesIban: 'ATLAES IBAN not configured',
  collection: 'Collection account not in provider register',
  invoice: 'Invoice number pending',
  account: 'No account on the payment instruction',
} as const;

const fmtEur = (n: number) =>
  `€${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(n)}`;

export function sumCheck(f: {
  amountReceived: number;
  lawFirmFee: number;
  atlaesShare: number;
  clientAmount: number;
}): boolean {
  return (
    round2(f.lawFirmFee + f.atlaesShare + f.clientAmount) ===
    round2(f.amountReceived)
  );
}

/** OCR amount vs statement amount; non-blocking flag (brief Part 2). */
export function isAmountMismatch(
  decisionAmount: number | null | undefined,
  received: number
): boolean {
  if (decisionAmount == null || !Number.isFinite(decisionAmount)) return false;
  return Math.abs(round2(decisionAmount) - round2(received)) >= 0.01;
}

export function clientReference(clientName: string): string {
  return `Beitragserstattung ${clientName}`.slice(0, 140);
}

export function routeRemark(
  route: RouteCode | null,
  currency: string | null
): string | null {
  const cur = (currency || 'EUR').toUpperCase();
  if (route === 'A') return `${cur} account — route 1`;
  if (route === 'B') return `Route 2 — conversion to ${cur}`;
  if (route === 'C') return `${cur} account — route 3 (SWIFT)`;
  return null;
}

export function buildPayoutLines(input: {
  clientName: string;
  figures: ReleaseFigures;
  atlaes: AtlaesAccount;
  feeCapEur: number;
  /** Route B: the provider's collection account for the account currency. */
  collectionAccount?: CollectionAccount | null;
  providerName?: string;
}): PayoutLineDraft[] {
  const { figures: f, atlaes } = input;
  const atlaesRemarks: string[] = [];
  if (f.feeCapped)
    atlaesRemarks.push(`Fee capped at ${fmtEur(input.feeCapEur)}`);
  if (f.smallRefund) atlaesRemarks.push('Small refund — annual settlement');

  const lines: PayoutLineDraft[] = [
    {
      kind: 'atlaes',
      route: null,
      recipient: atlaes.holder,
      amount: round2(f.atlaesShare),
      account: atlaes.iban ?? MISSING.atlaesIban,
      bic: atlaes.bic,
      bank: atlaes.bank,
      transferMethod: 'SEPA',
      reference: f.invoiceNumber ?? MISSING.invoice,
      currency: 'EUR',
      remarks: atlaesRemarks.join(' · ') || null,
    },
  ];

  const acc = f.account;
  const route: RouteCode = f.route ?? 'A';
  const currency = acc?.currency?.toUpperCase() ?? 'EUR';
  if (route === 'B') {
    const col = input.collectionAccount ?? null;
    const provider = input.providerName ?? 'SummitFX';
    lines.push({
      kind: 'client',
      route,
      recipient: col?.holder ?? `${provider} collection account`,
      amount: round2(f.clientAmount),
      account: col?.iban ?? MISSING.collection,
      bic: col?.bic ?? null,
      bank: null,
      transferMethod: 'SEPA',
      reference: col?.reference ?? clientReference(input.clientName),
      currency,
      remarks: routeRemark(route, currency),
    });
  } else {
    lines.push({
      kind: 'client',
      route,
      recipient: acc?.accountHolder || input.clientName,
      amount: round2(f.clientAmount),
      account:
        (acc?.iban || acc?.accountNumber || '').replace(/\s+/g, ' ').trim() ||
        MISSING.account,
      bic: acc?.bic ?? null,
      bank: acc?.bank ?? null,
      transferMethod: route === 'C' ? 'SWIFT' : 'SEPA',
      reference: clientReference(input.clientName),
      currency,
      remarks:
        [
          routeRemark(route, currency),
          route === 'C' && acc?.routingLabel && acc.routingValue
            ? `${acc.routingLabel}: ${acc.routingValue}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
    });
  }
  return lines;
}

/** CSV export (semicolon, German Excel), columns as in the queue. */
export interface ExportRow {
  clientName: string;
  zeSigned: boolean;
  valueDate: string;
  totalReceived: number;
  lawFirmFee: number;
  atlaesShare: number;
  sumOk: boolean;
  recipient: string;
  amount: number;
  account: string;
  bic: string | null;
  bank: string | null;
  transferMethod: string;
  reference: string;
  status: string;
  remarks: string | null;
}

const csvCell = (v: string) =>
  /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const deNum = (n: number) =>
  n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function exportCsv(rows: ExportRow[]): string {
  const header = [
    'Client name',
    'ZE',
    'Value date',
    'Total received',
    'Law-firm fee',
    'ATLAES share',
    'Sum',
    'Recipient',
    'Amount',
    'IBAN / account',
    'BIC',
    'Bank',
    'SEPA/SWIFT',
    'Verwendungszweck',
    'Status',
    'Remarks',
  ];
  const lines = rows.map((r) =>
    [
      r.clientName,
      r.zeSigned ? '✓' : '',
      r.valueDate,
      deNum(r.totalReceived),
      deNum(r.lawFirmFee),
      deNum(r.atlaesShare),
      r.sumOk ? '✓' : '✗',
      r.recipient,
      deNum(r.amount),
      r.account,
      r.bic ?? '',
      r.bank ?? '',
      r.transferMethod,
      r.reference,
      r.status,
      r.remarks ?? '',
    ]
      .map((c) => csvCell(String(c)))
      .join(';')
  );
  return `﻿${[header.join(';'), ...lines].join('\r\n')}\r\n`;
}
