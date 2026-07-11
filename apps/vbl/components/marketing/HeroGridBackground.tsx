/**
 * Code-rendered replacement for the home hero's background PNG
 * (`/marketing/home/hero-background-photo.png`), decomposed per the design
 * spec (docs/superpowers/specs/2026-07-11-hero-grid-wave-animation-design.md):
 * brand base (provided by the parent section's `bg-brand`), a 96px square
 * grid with hairline lines, a deterministic scatter of statically-lit
 * cells, a subtle diagonal wave that travels top-right -> bottom-left, and
 * the photo's two corner glows (bright top-right, soft bottom-left).
 *
 * Server-renderable: no hooks, no randomness at render time. The wave is
 * pure CSS (`hero-grid-wave` keyframes in globals.css); each cell only
 * receives an `animation-delay` proportional to its diagonal index.
 */

const CELL_PX = 96; // Figma grid pitch (node 1181:1998)
const COLS = 24; // covers viewports up to 2304px wide
const ROWS = 12; // covers hero heights up to 1152px; overflow is clipped
const WAVE_DURATION_S = 10; // must match .hero-grid-wave-cell in globals.css
// One crest traverses the full diagonal per loop: max diagonal index is
// (COLS - 1) + (ROWS - 1) = 34, so step = duration / 35.
const DELAY_STEP_S = WAVE_DURATION_S / (COLS + ROWS - 1);

/** Peak wave highlight and static lit-cell tint — identical by design so
 * the traveling crest matches the scatter's intensity (#9fe870 at 5%). */
const CELL_HIGHLIGHT = 'rgba(159,232,112,0.05)';

/** Statically-lit cells ([col, row]), mirroring the irregular scatter of
 * slightly lighter squares in the photographic export. Hard-coded (not
 * random) so server and client render identical markup. */
const LIT_CELLS: ReadonlyArray<readonly [number, number]> = [
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
];

const LIT_CELL_SET = new Set(LIT_CELLS.map(([c, r]) => `${c}:${r}`));

/** Delay for the diagonal sweep: index 0 at the TOP-RIGHT corner growing
 * toward the bottom-left, so the crest travels with the glow direction.
 * Negative offset starts the loop mid-sweep on first paint (no initial
 * all-dark beat). */
function cellDelaySeconds(col: number, row: number): number {
  const diagonalIndex = COLS - 1 - col + row;
  return diagonalIndex * DELAY_STEP_S - WAVE_DURATION_S;
}

export function HeroGridBackground() {
  const cells: JSX.Element[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isLit = LIT_CELL_SET.has(`${col}:${row}`);
      cells.push(
        <div
          key={`${col}:${row}`}
          className="relative border-l border-t border-white/[0.04]"
          style={isLit ? { backgroundColor: CELL_HIGHLIGHT } : undefined}
        >
          <div
            className="hero-grid-wave-cell absolute inset-0"
            style={{
              backgroundColor: CELL_HIGHLIGHT,
              animationDelay: `${cellDelaySeconds(col, row).toFixed(2)}s`,
            }}
          />
        </div>
      );
    }
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {/* 96px cell grid; wider/taller viewport areas beyond the fixed
          track counts are simply clipped by this layer. */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, ${CELL_PX}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_PX}px)`,
        }}
      >
        {cells}
      </div>

      {/* Corner glows matching the photo export: bright yellow-green
          top-right, soft bloom bottom-left. */}
      <div
        className="absolute -right-48 -top-64 h-[860px] w-[1080px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(183,216,87,0.40) 0%, rgba(159,232,112,0.16) 40%, transparent 72%)',
        }}
      />
      <div
        className="absolute -bottom-56 -left-48 h-[720px] w-[960px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(159,232,112,0.16) 0%, rgba(159,232,112,0.06) 40%, transparent 72%)',
        }}
      />
    </div>
  );
}

export default HeroGridBackground;
