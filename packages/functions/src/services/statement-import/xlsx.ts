/**
 * Minimal .xlsx reader without dependencies: unzip with node zlib
 * (stored / deflate entries via the central directory) and parse the
 * first worksheet's XML. Returns the sheet as a grid of cell values;
 * numbers stay numbers, dates (serial numbers in a date-formatted cell)
 * come back as `Date` (UTC midnight), everything else as strings.
 *
 * Scope: what a bank's account-statement export contains — shared
 * strings, inline strings, numbers, booleans, formulas with cached values.
 * No styles beyond the number formats needed to recognise dates.
 */

import { inflateRawSync } from 'zlib';

export type CellValue = string | number | boolean | Date | null;

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

/** Read all entries of a ZIP archive into a name → bytes map. */
export function unzip(buf: Buffer): Map<string, Buffer> {
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  const minPos = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= minPos; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid file: not a ZIP/XLSX archive');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error('Invalid file: corrupt ZIP central directory');
    }
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (buf.readUInt32LE(localOff) !== 0x04034b50) {
      throw new Error('Invalid file: corrupt ZIP entry');
    }
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(start, start + compSize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    // Other methods are not used by Excel; skip silently.
  }
  return out;
}

// ---------------------------------------------------------------------------
// XML helpers (regex-based; sheet XML is flat and machine-written)
// ---------------------------------------------------------------------------

export function decodeXmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    if (e[1] === 'x' || e[1] === 'X')
      return String.fromCodePoint(parseInt(e.slice(2), 16));
    return String.fromCodePoint(parseInt(e.slice(1), 10));
  });
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decodeXmlEntities(m[1]) : null;
}

/** Concatenated text of all <t> elements in a fragment (rich text runs). */
function textOf(fragment: string): string {
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) out += decodeXmlEntities(m[1]);
  return out;
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1] ? textOf(m[1]) : '');
  return out;
}

const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57,
]);

/** Style index → is a date format, from xl/styles.xml. */
function parseDateStyles(xml: string | undefined): boolean[] {
  if (!xml) return [];
  const custom = new Map<number, string>();
  const fmtRe = /<numFmt\s[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = fmtRe.exec(xml))) {
    const id = Number(attr(m[0], 'numFmtId'));
    const code = attr(m[0], 'formatCode') ?? '';
    custom.set(id, code);
  }
  const cellXfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!cellXfs) return [];
  const out: boolean[] = [];
  const xfRe = /<xf\s[^>]*?\/?>/g;
  while ((m = xfRe.exec(cellXfs[1]))) {
    const id = Number(attr(m[0], 'numFmtId') ?? 0);
    if (BUILTIN_DATE_FORMATS.has(id)) out.push(true);
    else if (custom.has(id)) {
      // Strip quoted literals and colour/locale brackets, then look for
      // day/month/year tokens.
      const code = custom
        .get(id)!
        .replace(/"[^"]*"/g, '')
        .replace(/\[[^\]]*\]/g, '');
      out.push(/[dmy]/i.test(code) && !/^[#0.,\s%]+$/.test(code));
    } else out.push(false);
  }
  return out;
}

/** Excel serial date (1900 system) → UTC midnight. */
export function excelSerialToDate(serial: number): Date {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

/** "AB12" → zero-based column index 27. */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function resolvePath(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/');
  parts.pop();
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function firstSheetPath(files: Map<string, Buffer>): string {
  const wb = files.get('xl/workbook.xml')?.toString('utf8');
  const rels = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
  if (wb && rels) {
    const sheet = /<sheet\s[^>]*>/.exec(wb);
    const rid = sheet ? attr(sheet[0], 'r:id') : null;
    if (rid) {
      const relRe = /<Relationship\s[^>]*>/g;
      let m: RegExpExecArray | null;
      while ((m = relRe.exec(rels))) {
        if (attr(m[0], 'Id') === rid) {
          const target = attr(m[0], 'Target');
          if (target) {
            const p = resolvePath('xl/workbook.xml', target);
            if (files.has(p)) return p;
          }
        }
      }
    }
  }
  const fallback = [...files.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort()[0];
  if (!fallback) throw new Error('Invalid file: no worksheet in workbook');
  return fallback;
}

/** Parse the first worksheet of an .xlsx file into rows of cells. */
export function readXlsx(buf: Buffer): CellValue[][] {
  const files = unzip(buf);
  const shared = parseSharedStrings(
    files.get('xl/sharedStrings.xml')?.toString('utf8')
  );
  const dateStyles = parseDateStyles(
    files.get('xl/styles.xml')?.toString('utf8')
  );
  const sheetXml = files.get(firstSheetPath(files))!.toString('utf8');

  const rows: CellValue[][] = [];
  const rowRe = /<row(\s[^>]*)?>([\s\S]*?)<\/row>|<row(\s[^>]*)?\/>/g;
  let rm: RegExpExecArray | null;
  let nextRow = 0;
  while ((rm = rowRe.exec(sheetXml))) {
    const rowTag = rm[1] ?? rm[3] ?? '';
    const r = Number(attr(rowTag, 'r') ?? nextRow + 1) - 1;
    nextRow = r + 1;
    const cells: CellValue[] = [];
    const body = rm[2] ?? '';
    const cellRe = /<c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    let nextCol = 0;
    while ((cm = cellRe.exec(body))) {
      const tag = cm[1];
      const inner = cm[2] ?? '';
      const ref = attr(tag, 'r');
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const t = attr(tag, 't');
      const s = Number(attr(tag, 's') ?? 0);
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value: CellValue = null;
      if (t === 's') value = v != null ? (shared[Number(v)] ?? '') : '';
      else if (t === 'inlineStr') value = textOf(inner);
      else if (t === 'str') value = v != null ? decodeXmlEntities(v) : '';
      else if (t === 'b') value = v === '1';
      else if (t === 'e') value = null;
      else if (v != null && v !== '') {
        const num = Number(v);
        value = Number.isFinite(num)
          ? dateStyles[s]
            ? excelSerialToDate(num)
            : num
          : decodeXmlEntities(v);
      }
      while (cells.length < col) cells.push(null);
      cells[col] = value;
    }
    while (rows.length < r) rows.push([]);
    rows[r] = cells;
  }
  return rows;
}
