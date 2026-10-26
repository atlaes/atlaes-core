/**
 * Periods table on the Bescheid (Figma 08 "Periods and amounts on your
 * decision"). `extractDrvRefundDecisionDetails` returns the office, date
 * and amount but not the table, so the rows are parsed from its raw OCR
 * text: a line with a date range (dd.mm.yyyy – dd.mm.yyyy) followed by up
 * to two German-formatted euro amounts (Entgelt, contributions). Admin can
 * correct every row. Pure.
 */

import type { PayoutDecisionPeriod } from '../../drizzle/schema/payout';

const DATE = String.raw`(\d{2})\.(\d{2})\.(\d{4})`;
const RANGE = new RegExp(`${DATE}\\s*(?:-|–|—|bis)\\s*${DATE}`);
const AMOUNT = /(?<![\d.,])(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})(?![\d])/g;

/** "29.601,90" → 29601.9 */
export function parseGermanAmount(s: string): number | null {
  const m = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/.exec(
    s.trim().replace(/\s*(EUR|€)\s*$/i, '')
  );
  if (!m) return null;
  return Number(`${m[1].replace(/\./g, '')}.${m[2]}`);
}

export function parsePeriodsFromOcr(rawText: string): PayoutDecisionPeriod[] {
  const rows: PayoutDecisionPeriod[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const r = RANGE.exec(line);
    if (!r) continue;
    const rest = line.slice((r.index ?? 0) + r[0].length);
    const amounts: number[] = [];
    let m: RegExpExecArray | null;
    AMOUNT.lastIndex = 0;
    while ((m = AMOUNT.exec(rest)) && amounts.length < 2) {
      amounts.push(Number(`${m[1].replace(/\./g, '')}.${m[2]}`));
    }
    rows.push({
      from: `${r[3]}-${r[2]}-${r[1]}`,
      to: `${r[6]}-${r[5]}-${r[4]}`,
      entgeltEur: amounts[0] ?? null,
      contributionsEur: amounts[1] ?? null,
    });
  }
  // De-duplicate identical ranges (headers repeated across pages).
  const seen = new Set<string>();
  return rows.filter((p) => {
    const k = `${p.from}|${p.to}|${p.entgeltEur}|${p.contributionsEur}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
