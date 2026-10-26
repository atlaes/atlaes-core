import { describe, expect, it } from 'vitest';
import {
  WAITING_PERIOD_STRINGS,
  computeWaitingPeriod,
  formatApplyDate,
} from './waiting-period';

// The hub handoff's widget E2E fixtures (run 7 Sep 2026).
const NOW = new Date(2026, 8, 7);

describe('computeWaitingPeriod', () => {
  it('Mar 2025 → pending, 7 months, apply from 1 April 2027, runs to March 2027', () => {
    const r = computeWaitingPeriod(2025, 3, NOW);
    expect(r.status).toBe('pending');
    expect(r.remainingMonths).toBe(7);
    expect(formatApplyDate('en', r.applyYear, r.applyMonth)).toBe(
      '1 April 2027'
    );
    expect(formatApplyDate('de', r.applyYear, r.applyMonth)).toBe(
      '1. April 2027'
    );
    expect([r.endYear, r.endMonth]).toEqual([2027, 3]);
  });
  it('Jun 2023 → complete since 1 July 2025', () => {
    const r = computeWaitingPeriod(2023, 6, NOW);
    expect(r.status).toBe('complete');
    expect(formatApplyDate('de', r.applyYear, r.applyMonth)).toBe(
      '1. Juli 2025'
    );
    expect(r.remainingMonths).toBe(0);
  });
  it('Dec 2026 (future) → not started, earliest 1 January 2029', () => {
    const r = computeWaitingPeriod(2026, 12, NOW);
    expect(r.status).toBe('not-started');
    expect(formatApplyDate('de', r.applyYear, r.applyMonth)).toBe(
      '1. Januar 2029'
    );
  });
  it('the current month counts as not started', () => {
    expect(computeWaitingPeriod(2026, 9, NOW).status).toBe('not-started');
  });
  it('the first possible month itself is complete', () => {
    // last month Aug 2024 → apply from 1 Sep 2026
    expect(computeWaitingPeriod(2024, 8, NOW).status).toBe('complete');
    expect(computeWaitingPeriod(2024, 9, NOW).status).toBe('pending');
  });
});

describe('verdict copy', () => {
  it('EN pending verdict names the date and the restart rule', () => {
    const v = WAITING_PERIOD_STRINGS.en.verdict(
      computeWaitingPeriod(2025, 3, NOW)
    );
    expect(v.title).toBe('Almost there — 7 months to go');
    expect(v.big).toBe('You can apply from 1 April 2027');
    expect(v.notes.length).toBe(3);
  });
  it('DE verdicts match the E2E fragments', () => {
    const de = WAITING_PERIOD_STRINGS.de;
    const pending = de.verdict(computeWaitingPeriod(2025, 3, NOW));
    expect(pending.title).toBe('Fast geschafft – noch 7 Monate');
    expect(pending.big).toBe('Antrag möglich ab 1. April 2027');
    expect(pending.body).toContain('bis Ende März 2027');
    const done = de.verdict(computeWaitingPeriod(2023, 6, NOW));
    expect(done.big).toBe('Sie können jetzt beantragen');
    expect(done.body).toContain('seit dem 1. Juli 2025');
    expect(done.notes[0]).toBe(
      'Für den Erstantrag besteht keine Ausschlussfrist — Sie können ihn auch Jahre später stellen. Für die Zeit vor der Antragstellung fallen aber keine Zinsen an.'
    );
    const future = de.verdict(computeWaitingPeriod(2026, 12, NOW));
    expect(future.body).toContain('frühestens am 1. Januar 2029');
  });
  it('singular month', () => {
    const r = computeWaitingPeriod(2024, 9, NOW); // apply 1 Oct 2026
    expect(WAITING_PERIOD_STRINGS.en.verdict(r).title).toBe(
      'Almost there — 1 month to go'
    );
    expect(WAITING_PERIOD_STRINGS.de.verdict(r).title).toBe(
      'Fast geschafft – noch 1 Monat'
    );
  });
});
