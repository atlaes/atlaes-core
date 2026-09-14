// § 3 Abs. 2 Satz 1 BetrAVG small-entitlement limits (BRSG II, in force
// since 22.01.2026): 1.5 % / 18/10 of the monthly Bezugsgröße § 18 SGB IV.
// Mirrors packages/functions/src/services/bav-letters/constants.ts — the
// backend is the authority at submission; these values only drive inline
// hints in the onboarding UI. Update every January.

export const BAV_THRESHOLDS_BY_YEAR: Record<
  string,
  { pension: number; capital: number }
> = {
  '2026': { pension: 59.33, capital: 7119 },
};

export function getBavThresholds(year = new Date().getFullYear()) {
  return BAV_THRESHOLDS_BY_YEAR[String(year)] ?? BAV_THRESHOLDS_BY_YEAR['2026'];
}

/**
 * Parses a user-typed EUR amount ("41,20", "1.234,56", "1,234.56", "€ 59")
 * into a dot-decimal string with two decimals as the claims API expects
 * ("41.20"). Returns null when nothing numeric is present.
 */
export function normalizeEuroAmount(raw: string): string | null {
  let s = raw.replace(/[^0-9.,-]/g, '');
  if (s === '' || s === '-') return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s =
      s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  } else if (hasComma) {
    const parts = s.split(',');
    s =
      parts.length === 2 && parts[1].length !== 3
        ? s.replace(',', '.')
        : s.replace(/,/g, '');
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export function formatEuro(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
