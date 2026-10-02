import './hero-motion.css';

/**
 * GPR port of the VBL hero grid wave (apps/vbl HeroGridBackground, spec
 * docs/superpowers/specs/2026-07-11-hero-grid-wave-animation-design.md):
 * a 96px square grid of white hairlines, a fixed scatter of faintly lit
 * cells and a diagonal wave travelling top-right -> bottom-left, layered
 * very faintly over the homepage hero photo so the photo stays the
 * protagonist.
 *
 * Server-rendered, deterministic markup, pure CSS: the wave keyframes
 * (`mk-hgrid-wave`) only run under `.mk[data-motion="on"]` without
 * `prefers-reduced-motion`; otherwise only the static grid shows. Each
 * cell just gets its diagonal `animation-delay` as a custom property.
 * No images, so the hero's LCP is unaffected.
 */

const COLS = 24; // 24 x 96px covers viewports up to 2304px wide
const ROWS = 12; // covers hero heights up to 1152px; the rest is clipped
const WAVE_DURATION_S = 10; // must match .mk-hgrid-cell in hero-motion.css
const DELAY_STEP_S = WAVE_DURATION_S / (COLS + ROWS - 1);

/** Statically lit cells ([col, row]); hard-coded so SSR == CSR. */
const LIT = new Set(
  [
    [4, 1],
    [11, 1],
    [6, 2],
    [9, 2],
    [17, 3],
    [2, 4],
    [13, 4],
    [7, 5],
    [20, 5],
    [10, 6],
    [15, 7],
    [5, 8],
  ].map(([c, r]) => `${c}:${r}`)
);

/** Diagonal index 0 at the top-right corner; negative offset so the loop
 * is already mid-sweep on first paint. */
function delay(col: number, row: number): string {
  return `${((COLS - 1 - col + row) * DELAY_STEP_S - WAVE_DURATION_S).toFixed(2)}s`;
}

export function HeroGrid() {
  const cells: JSX.Element[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const lit = LIT.has(`${col}:${row}`);
      cells.push(
        <i
          key={`${col}:${row}`}
          className={lit ? 'mk-hgrid-cell mk-hgrid-lit' : 'mk-hgrid-cell'}
          style={{ ['--d' as string]: delay(col, row) }}
        />
      );
    }
  }
  return (
    <div className="mk-hgrid" aria-hidden="true">
      {cells}
    </div>
  );
}
