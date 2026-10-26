/**
 * Year options for the period and end-date pickers, newest first.
 *
 * Every pension type reaches back to 1960 (owner request, 26 Oct 2026).
 * The contribution table (packages/functions/src/data/contributions.json)
 * starts in 1975, the earliest year in the client's Calculator.md; earlier
 * years are estimated with the 1975 caps and rates.
 */
export const EARLIEST_YEAR = 1960;

export function yearOptions(earliest: number = EARLIEST_YEAR): string[] {
  const latest = new Date().getFullYear();
  return Array.from({ length: latest - earliest + 1 }, (_, i) =>
    String(latest - i)
  );
}
