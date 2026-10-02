import { describe, expect, it } from 'vitest';
import { computeWaitingPeriod } from './waiting-period';
import { waitingTimeline } from './waiting-timeline';

const NOW = new Date(2026, 9, 2); // 2 October 2026

describe('waitingTimeline', () => {
  it('spans the 24 months after the last insured month', () => {
    const r = computeWaitingPeriod(2025, 3, NOW);
    const t = waitingTimeline(r, 'en', NOW);
    expect(t.months).toHaveLength(24);
    expect(t.months[0]).toMatchObject({ year: 2025, month: 4 });
    expect(t.months[23]).toMatchObject({ year: 2027, month: 3 });
    expect(t.startLabel).toBe('March 2025');
    expect(t.applyLabel).toBe('1 April 2027');
  });
  it('wraps the year boundary (December start)', () => {
    const r = computeWaitingPeriod(2024, 12, NOW);
    const t = waitingTimeline(r, 'de', NOW);
    expect(t.months[0]).toMatchObject({ year: 2025, month: 1 });
    expect(t.months[23]).toMatchObject({ year: 2026, month: 12 });
    expect(t.startLabel).toBe('Dezember 2024');
    expect(t.applyLabel).toBe('1. Januar 2027');
  });
  it('counts the fully elapsed months (pending)', () => {
    // last insured March 2025: April 2025 … September 2026 have passed
    const t = waitingTimeline(computeWaitingPeriod(2025, 3, NOW), 'en', NOW);
    expect(t.elapsedCount).toBe(18);
    expect(t.months[17].elapsed).toBe(true);
    expect(t.months[18]).toMatchObject({
      year: 2026,
      month: 10,
      elapsed: false,
    });
  });
  it('is fully elapsed when complete and empty when not started', () => {
    const done = waitingTimeline(computeWaitingPeriod(2020, 5, NOW), 'en', NOW);
    expect(done.elapsedCount).toBe(24);
    const future = waitingTimeline(
      computeWaitingPeriod(2026, 10, NOW),
      'en',
      NOW
    );
    expect(future.elapsedCount).toBe(0);
    expect(future.applyLabel).toBe('1 November 2028');
  });
  it('matches the filing date of the result text', () => {
    const r = computeWaitingPeriod(2025, 11, NOW);
    const t = waitingTimeline(r, 'en', NOW);
    expect(r.status).toBe('pending');
    expect(t.applyLabel).toBe('1 December 2027');
  });
});
