/**
 * File → sheet grid. .xlsx (ZIP) or CSV/TXT; legacy binary .xls is
 * rejected with a hint to export as .xlsx or CSV.
 */

import { createHash } from 'crypto';
import { parseCsv } from './csv';
import { readXlsx, type CellValue } from './xlsx';

export type StatementFileKind = 'xlsx' | 'csv';

export function detectFileKind(
  fileName: string,
  buf: Buffer
): StatementFileKind {
  if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50) return 'xlsx';
  if (buf.length >= 4 && buf.readUInt32BE(0) === 0xd0cf11e0) {
    throw new Error(
      'Invalid file: legacy .xls is not supported — export the statement as .xlsx or CSV'
    );
  }
  if (/\.xlsx$/i.test(fileName)) {
    throw new Error('Invalid file: the .xlsx file is damaged');
  }
  return 'csv';
}

export function readStatementGrid(
  fileName: string,
  buf: Buffer
): { kind: StatementFileKind; grid: CellValue[][] } {
  const kind = detectFileKind(fileName, buf);
  const grid = kind === 'xlsx' ? readXlsx(buf) : parseCsv(buf);
  if (
    !grid.some((r) => r && r.some((c) => c != null && String(c).trim() !== ''))
  ) {
    throw new Error('Invalid file: the statement is empty');
  }
  return { kind, grid };
}

/** Same booking in two overlapping statement exports → same hash. */
export function statementLineHash(
  firmId: string,
  line: {
    valueDate: string | null;
    amount: number | null;
    reference: string;
    payer: string;
  }
): string {
  return createHash('sha256')
    .update(
      [
        firmId,
        line.valueDate ?? '',
        line.amount == null ? '' : line.amount.toFixed(2),
        line.reference.toUpperCase().replace(/\s+/g, ' ').trim(),
        line.payer.toUpperCase().replace(/\s+/g, ' ').trim(),
      ].join('|')
    )
    .digest('hex');
}
