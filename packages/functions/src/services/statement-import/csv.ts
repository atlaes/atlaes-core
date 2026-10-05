/**
 * Small CSV reader for account-statement exports: auto-detects the
 * delimiter (`;` as in German bank exports, `,` or tab), handles quoted
 * fields with embedded delimiters, doubled quotes and line breaks, a UTF-8
 * BOM, and falls back to Windows-1252/Latin-1 when the bytes are not
 * valid UTF-8 (Sparkasse CSV-CAMT exports).
 */

export function decodeText(buf: Buffer): string {
  let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  if (text.includes('�')) {
    try {
      text = new TextDecoder('windows-1252').decode(buf);
    } catch {
      text = buf.toString('latin1');
    }
  }
  return text.replace(/^﻿/, '');
}

export function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r?\n/).slice(0, 10).join('\n');
  const candidates = [';', ',', '\t'];
  let best = ';';
  let bestCount = -1;
  for (const d of candidates) {
    // Count delimiters outside quotes.
    let count = 0;
    let quoted = false;
    for (const ch of firstLines) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(
  input: Buffer | string,
  delimiter?: string
): string[][] {
  const text =
    typeof input === 'string' ? input.replace(/^﻿/, '') : decodeText(input);
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') quoted = true;
    else if (ch === d) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully empty trailing lines.
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) {
    rows.pop();
  }
  return rows;
}
