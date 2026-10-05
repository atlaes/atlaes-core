import { describe, expect, it } from 'vitest';
import { cubicBezier, EASE_OUT, EASE_STANDARD, staggerDelay } from './tokens';

describe('motion tokens', () => {
  it('stagger is 80 ms per item, capped at 4 items', () => {
    expect([0, 1, 2, 3, 4, 9].map((i) => staggerDelay(i))).toEqual([
      0, 80, 160, 240, 240, 240,
    ]);
    expect(staggerDelay(0, 1)).toBe(80);
  });

  it('cubicBezier hits the end points and matches known samples', () => {
    const out = cubicBezier(EASE_OUT);
    expect(out(0)).toBe(0);
    expect(out(1)).toBe(1);
    // ease-out: well past halfway at t = 0.5
    expect(out(0.5)).toBeGreaterThan(0.85);
    const linearish = cubicBezier([0.25, 0.25, 0.75, 0.75]);
    expect(linearish(0.3)).toBeCloseTo(0.3, 4);
    const std = cubicBezier(EASE_STANDARD);
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(std(t)).toBeGreaterThanOrEqual(std(t - 0.1));
    }
  });
});
