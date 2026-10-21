/**
 * Year options for the period and end-date pickers, newest first.
 *
 * Public (VBL/ZVK) estimates need the per-year contribution table, which
 * starts in 2004 (client feedback #2). Stage pensions (VddB/VddKO) also
 * have an "employment ended before 2001" band, which needs earlier years
 * (owner answer, 20 Oct 2026); their estimate uses the 2004 rates for
 * years before the table starts.
 */
export const CALCULATOR_EARLIEST_YEAR = 2004;
export const STAGE_EARLIEST_YEAR = 1960;

export function yearOptions(earliest: number): string[] {
  const latest = new Date().getFullYear();
  return Array.from({ length: latest - earliest + 1 }, (_, i) =>
    String(latest - i)
  );
}
