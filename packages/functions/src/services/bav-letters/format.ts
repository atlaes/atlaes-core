/**
 * Value formatting for the bAV letter placeholders (spec section 2):
 * dates as DD.MM.YYYY, amounts as 1.234,56 without a currency symbol.
 */

/** "2026-09-07" (or a Date) → "07.09.2026". */
export function formatLetterDate(value: string | Date): string {
  let y: number;
  let m: number;
  let d: number;
  if (value instanceof Date) {
    y = value.getFullYear();
    m = value.getMonth() + 1;
    d = value.getDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) {
      throw new Error(`Expected ISO date (YYYY-MM-DD), got "${value}"`);
    }
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d)}.${pad(m)}.${y}`;
}

/** 1234.5 → "1.234,50"; 59.33 → "59,33". Always two decimals. */
export function formatLetterAmount(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot format non-finite amount ${value}`);
  }
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, frac] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '-' : ''}${grouped},${frac}`;
}

/** "BE19905691823912" → "BE19 9056 9182 3912". */
export function formatIban(iban: string): string {
  const compact = iban.replace(/\s+/g, '').toUpperCase();
  return compact.replace(/(.{4})(?=.)/g, '$1 ');
}
