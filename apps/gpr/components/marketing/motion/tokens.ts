/**
 * Motion tokens from the Figma motion page (board 00, `1115:5858`), for the
 * client islands that animate in JS. The CSS side defines the same values
 * as `--mk-motion-*` on `.mk[data-motion='on']` (marketing.css, block
 * "motion (stream M1)"). Spec table: docs/superpowers/specs/
 * motion-spec-from-figma.md.
 */
export const MOTION = {
  /** hover, focus, colour changes */
  instant: 150,
  /** hint reveal, dropdown, FAQ row */
  quick: 240,
  /** section reveal, chevron slide */
  base: 480,
  /** bars, timeline fill, glyph draw */
  slow: 800,
  /** stat counters */
  count: 1200,
  /** per-item stagger; at most `staggerMax` steps, then all at once */
  stagger: 80,
  staggerMax: 4,
} as const;

export type Bezier = readonly [number, number, number, number];

export const EASE_OUT: Bezier = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: Bezier = [0.65, 0, 0.35, 1];
export const EASE_STANDARD: Bezier = [0.2, 0, 0, 1];

/** Stagger delay (ms) for item `i`: 0, 80, 160, 240, then all at once. */
export function staggerDelay(i: number, base = 0): number {
  return Math.min(base + i, MOTION.staggerMax - 1) * MOTION.stagger;
}

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress t (0…1):
 * solves x(s) = t by Newton steps with a bisection fallback, returns y(s).
 */
export function cubicBezier([x1, y1, x2, y2]: Bezier): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = x(s) - t;
      if (Math.abs(err) < 1e-6) return y(s);
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = t;
    for (let i = 0; i < 30; i++) {
      const v = x(s);
      if (Math.abs(v - t) < 1e-6) break;
      if (v < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return y(s);
  };
}
