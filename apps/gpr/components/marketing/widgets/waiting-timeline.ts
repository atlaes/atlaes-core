/**
 * Month maths for the animated 24-month timeline of the waiting-period
 * calculator: last insured month → 24 waiting months → filing date on the
 * 1st of the 25th month. Pure; the dates come from `computeWaitingPeriod`.
 */
import {
  formatApplyDate,
  formatMonthYear,
  fromIndex,
  monthIndex,
  type WaitingPeriodResult,
  type WidgetLang,
} from './waiting-period';

export interface TimelineMonth {
  year: number;
  /** 1–12 */
  month: number;
  /** The month has fully passed (before the current month). */
  elapsed: boolean;
}

export interface WaitingTimeline {
  /** "March 2025" — the last insured month (the start marker). */
  startLabel: string;
  /** The 24 waiting months, oldest first. */
  months: TimelineMonth[];
  /** "1 April 2027" — the first possible filing date. */
  applyLabel: string;
  /** Number of waiting months already fully elapsed (0–24). */
  elapsedCount: number;
}

export const WAITING_MONTHS = 24;

export function waitingTimeline(
  r: WaitingPeriodResult,
  lang: WidgetLang,
  now: Date = new Date()
): WaitingTimeline {
  const last = r.applyIndex - (WAITING_MONTHS + 1);
  const nowIdx = monthIndex(now.getFullYear(), now.getMonth() + 1);
  const start = fromIndex(last);
  const months: TimelineMonth[] = [];
  for (let i = 1; i <= WAITING_MONTHS; i++) {
    const idx = last + i;
    const ym = fromIndex(idx);
    months.push({ year: ym.year, month: ym.month, elapsed: idx < nowIdx });
  }
  return {
    startLabel: formatMonthYear(lang, start.year, start.month),
    months,
    applyLabel: formatApplyDate(lang, r.applyYear, r.applyMonth),
    elapsedCount: months.filter((m) => m.elapsed).length,
  };
}
