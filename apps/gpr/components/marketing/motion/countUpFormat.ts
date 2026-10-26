/**
 * Number parsing/formatting for `CountUp`. Pulls the first number out of a
 * pre-formatted token string ("€11,572", "76.3% within 30 days", "4.98/5")
 * and re-renders intermediate values with the same prefix, suffix,
 * decimals and thousands separator, so the last frame is byte-identical to
 * the server-rendered text.
 */

export interface ParsedFigure {
  prefix: string;
  suffix: string;
  value: number;
  decimals: number;
  /** Thousands separator found in the source ('' when none). */
  group: string;
  /** Decimal separator ('.' or ','). */
  point: string;
}

const NUMBER_RE = /\d[\d.,]*\d|\d/;

/** Split "1,234.5" style digits into separators; null when ambiguous. */
function separators(raw: string): { group: string; point: string } {
  const hasDot = raw.includes('.');
  const hasComma = raw.includes(',');
  if (hasDot && hasComma) {
    // the later one is the decimal point
    return raw.lastIndexOf('.') > raw.lastIndexOf(',')
      ? { group: ',', point: '.' }
      : { group: '.', point: ',' };
  }
  const sep = hasDot ? '.' : hasComma ? ',' : '';
  if (!sep) return { group: '', point: '.' };
  const parts = raw.split(sep);
  // "11,572" / "1.234.567": every group after the first has 3 digits and
  // there are several or the single one is exactly 3 long → grouping.
  const grouped =
    parts.length > 2 ||
    (parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0');
  return grouped
    ? { group: sep, point: sep === ',' ? '.' : ',' }
    : { group: '', point: sep };
}

export function parseFigure(text: string): ParsedFigure | null {
  const m = NUMBER_RE.exec(text);
  if (!m) return null;
  const raw = m[0];
  const { group, point } = separators(raw);
  const plain = (group ? raw.split(group).join('') : raw).replace(point, '.');
  const value = Number(plain);
  if (!Number.isFinite(value)) return null;
  const dot = plain.indexOf('.');
  return {
    prefix: text.slice(0, m.index),
    suffix: text.slice(m.index + raw.length),
    value,
    decimals: dot === -1 ? 0 : plain.length - dot - 1,
    group,
    point,
  };
}

export function formatFigure(f: ParsedFigure, n: number): string {
  const [int, frac] = Math.abs(n).toFixed(f.decimals).split('.');
  const grouped = f.group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : int;
  const body = frac !== undefined ? `${grouped}${f.point}${frac}` : grouped;
  return `${f.prefix}${n < 0 ? '-' : ''}${body}${f.suffix}`;
}
