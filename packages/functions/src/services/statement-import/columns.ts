/**
 * Account-statement column mapping. The firm's export layout is not known
 * yet (platform brief Part 2, E1), so the four fields we need — value
 * date, amount, payment reference, payer — are mapped to header labels:
 * auto-suggested from `STATEMENT_COLUMN_CANDIDATES`, confirmed or changed
 * per upload in the portal, and the last mapping is remembered per firm.
 */

import type { CellValue } from './xlsx';

export const STATEMENT_FIELDS = [
  'valueDate',
  'amount',
  'reference',
  'payer',
] as const;
export type StatementField = (typeof STATEMENT_FIELDS)[number];

/** Header label per field; `payer` may be left unmapped. */
export interface StatementColumnMap {
  valueDate: string;
  amount: string;
  reference: string;
  payer: string | null;
}

/**
 * Configuration: header labels tried in order when suggesting a mapping
 * (case- and accent-insensitive, exact label first, then "contains").
 * Covers the usual German bank exports (Sparkasse CSV-CAMT / MT940 Excel)
 * and English labels. Adjust here once the firm's real export is known.
 */
export const STATEMENT_COLUMN_CANDIDATES: Record<StatementField, string[]> = {
  valueDate: [
    'Valutadatum',
    'Valuta',
    'Wertstellung',
    'Wertstellungsdatum',
    'Value date',
    'Buchungstag',
    'Buchungsdatum',
    'Datum',
    'Booking date',
    'Date',
  ],
  amount: [
    'Betrag',
    'Betrag (EUR)',
    'Umsatz',
    'Haben',
    'Gutschrift',
    'Amount',
    'Amount (EUR)',
    'Credit',
  ],
  reference: [
    'Verwendungszweck',
    'Buchungstext',
    'Zahlungsreferenz',
    'Payment reference',
    'Reference',
    'Purpose',
    'Description',
  ],
  payer: [
    'Beguenstigter/Zahlungspflichtiger',
    'Begünstigter/Zahlungspflichtiger',
    'Zahlungspflichtiger',
    'Auftraggeber',
    'Name Zahlungsbeteiligter',
    'Zahler',
    'Payer',
    'Counterparty',
    'Name',
  ],
};

export function normalizeLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function cellText(v: CellValue | undefined): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

/**
 * Header row = the first row (within the first 20) that matches at least
 * two candidate labels; statements often start with a title block.
 * Falls back to the first non-empty row.
 */
export function findHeaderRow(rows: CellValue[][]): number {
  const all = new Set(
    Object.values(STATEMENT_COLUMN_CANDIDATES).flat().map(normalizeLabel)
  );
  let firstNonEmpty = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const labels = (rows[i] ?? []).map((c) => normalizeLabel(cellText(c)));
    if (firstNonEmpty < 0 && labels.some(Boolean)) firstNonEmpty = i;
    if (labels.filter((l) => l && all.has(l)).length >= 2) return i;
  }
  return Math.max(firstNonEmpty, 0);
}

/** Header labels, de-duplicated ("Betrag", "Betrag (2)") and non-empty. */
export function headerLabels(row: CellValue[]): string[] {
  const seen = new Map<string, number>();
  return row.map((c, i) => {
    const base = cellText(c) || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

export function suggestColumnMap(
  headers: string[],
  preferred?: Partial<StatementColumnMap> | null
): Partial<StatementColumnMap> {
  const norm = headers.map(normalizeLabel);
  const used = new Set<number>();
  const pick = (field: StatementField): string | undefined => {
    const pref = preferred?.[field];
    if (pref && headers.includes(pref)) {
      used.add(headers.indexOf(pref));
      return pref;
    }
    const cands = STATEMENT_COLUMN_CANDIDATES[field].map(normalizeLabel);
    for (const c of cands) {
      const i = norm.findIndex((h, idx) => h === c && !used.has(idx));
      if (i >= 0) {
        used.add(i);
        return headers[i];
      }
    }
    for (const c of cands) {
      const i = norm.findIndex(
        (h, idx) => !used.has(idx) && h.length > 0 && h.includes(c)
      );
      if (i >= 0) {
        used.add(i);
        return headers[i];
      }
    }
    return undefined;
  };
  const out: Partial<StatementColumnMap> = {};
  // Reference before payer so "Name" does not steal a reference column.
  for (const f of ['valueDate', 'amount', 'reference', 'payer'] as const) {
    const v = pick(f);
    if (v) (out as Record<string, string>)[f] = v;
  }
  return out;
}

export function isCompleteMap(
  m: Partial<StatementColumnMap> | null | undefined
): m is StatementColumnMap {
  return !!(m && m.valueDate && m.amount && m.reference);
}

/**
 * Parse an amount cell: numbers as-is; strings in German ("3.038,49",
 * "-12,00", "1.234,00 S") or English ("3,038.49") notation, with optional
 * currency and Soll/Haben suffix. Returns null when unparseable.
 */
export function parseAmount(v: CellValue | undefined): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/ /g, ' ');
  let sign = 1;
  if (/\s*(S|Soll|D|DR|DBIT)$/i.test(s)) {
    sign = -1;
    s = s.replace(/\s*(S|Soll|D|DR|DBIT)$/i, '');
  } else s = s.replace(/\s*(H|Haben|C|CR|CRDT)$/i, '');
  s = s.replace(/EUR|€/gi, '').replace(/\s+/g, '');
  if (/^\(.*\)$/.test(s)) {
    sign = -sign;
    s = s.slice(1, -1);
  }
  if (s.endsWith('-')) {
    sign = -sign;
    s = s.slice(0, -1);
  }
  if (s.startsWith('-')) {
    sign = -sign;
    s = s.slice(1);
  } else if (s.startsWith('+')) s = s.slice(1);
  if (!/^[\d.,']+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    // German: dots (or apostrophes) group thousands, comma is decimal.
    normalized = s.replace(/[.']/g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const decimals = s.length - lastDot - 1;
    // "3.038" with a single dot and three decimals is a German thousands
    // group without cents; anything else is an English decimal point.
    if (
      lastComma < 0 &&
      decimals === 3 &&
      (s.match(/\./g) ?? []).length >= 1 &&
      !/^0\./.test(s)
    ) {
      normalized = s.replace(/\./g, '');
    } else normalized = s.replace(/[,']/g, '');
  } else normalized = s.replace(/'/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(sign * n * 100) / 100 : null;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Parse a date cell to ISO yyyy-mm-dd (German, ISO and Excel serials). */
export function parseStatementDate(v: CellValue | undefined): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const mo = Number(m[2]);
    const d = Number(m[1]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  return null;
}

export interface StatementRow {
  /** 1-based line number within the statement (data rows after the header). */
  line: number;
  valueDate: string | null;
  amount: number | null;
  reference: string;
  payer: string;
  raw: Record<string, string>;
}

export interface ParsedStatement {
  headers: string[];
  headerRowIndex: number;
  rows: StatementRow[];
}

/** Apply a column map to the sheet grid. */
export function extractRows(
  grid: CellValue[][],
  map: StatementColumnMap,
  headerRowIndex = findHeaderRow(grid)
): ParsedStatement {
  const headers = headerLabels(grid[headerRowIndex] ?? []);
  const idx = (label: string | null) =>
    label == null ? -1 : headers.indexOf(label);
  const iDate = idx(map.valueDate);
  const iAmount = idx(map.amount);
  const iRef = idx(map.reference);
  const iPayer = idx(map.payer);
  const missing = (
    [
      ['value date', iDate],
      ['amount', iAmount],
      ['payment reference', iRef],
    ] as const
  ).filter(([, i]) => i < 0);
  if (missing.length) {
    throw new Error(
      `Invalid column mapping: ${missing.map(([n]) => n).join(', ')} not found in the file`
    );
  }
  const rows: StatementRow[] = [];
  let line = 0;
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const cells = grid[r] ?? [];
    if (cells.every((c) => cellText(c) === '')) continue;
    line++;
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      const t = cellText(cells[i]);
      if (t) raw[h] = t;
    });
    rows.push({
      line,
      valueDate: parseStatementDate(cells[iDate]),
      amount: parseAmount(cells[iAmount]),
      reference: cellText(cells[iRef]).replace(/\s+/g, ' '),
      payer: iPayer >= 0 ? cellText(cells[iPayer]).replace(/\s+/g, ' ') : '',
      raw,
    });
  }
  return { headers, headerRowIndex, rows };
}
