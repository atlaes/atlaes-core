# Home Hero Grid Wave Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage hero's background PNG with a code-rendered brand grid (faithful to the current design) whose cells brighten in a subtle diagonal traveling wave.

**Architecture:** A new server-renderable `HeroGridBackground` component draws the grid as a fixed-pitch CSS grid of cells; one shared `@keyframes` animates a per-cell highlight overlay's opacity, and each cell's `animation-delay` is derived from its diagonal index `(colsFromRight + row)`, which makes the brightening travel top-right → bottom-left. Two CSS radial-gradient divs reproduce the photo's baked-in corner glows. `Hero` gains an `animatedGridBackground` prop; only the home page opts in.

**Tech Stack:** Next.js 14 App Router (server components), Tailwind CSS + one global-CSS keyframe block, no runtime JS.

## Global Constraints

- Base color stays `bg-brand` (`#163300`); highlight color derived from accent `#9fe870` at low alpha (spec: peak ~5% lighter than base).
- Grid pitch: 96px square cells (Figma node 1181:1998).
- Glow corners: bright TOP-RIGHT, soft BOTTOM-LEFT (the shared Hero's `showDefaultGlows` corners are wrong for home — do not reuse them).
- No `Math.random()` at render time — SSR and client markup must match.
- Animate **opacity only** (GPU-composited); `prefers-reduced-motion: reduce` disables the wave but keeps the static look.
- All other marketing pages keep the PNG default; do not delete any PNG assets.
- Prettier: single quotes, trailing commas (es5), semicolons, 2-space indent, 80 char width.
- Repo-wide `tsc`/`eslint` are known broken; scope checks to touched files (`npx eslint <file>` from `apps/vbl`).
- This repo has no component unit-test infra for marketing components (Playwright e2e only, needs a running dev server) — tasks verify via scoped lint + browser inspection instead of unit TDD.

---

### Task 1: `HeroGridBackground` component + wave keyframes

**Files:**
- Create: `apps/vbl/components/marketing/HeroGridBackground.tsx`
- Modify: `apps/vbl/app/globals.css` (append keyframes + reduced-motion rule at end of file)

**Interfaces:**
- Consumes: nothing (leaf presentational component).
- Produces: `export function HeroGridBackground(): JSX.Element` (no props) and default export — an `absolute inset-0` `aria-hidden` background layer. Task 2 imports it as `import { HeroGridBackground } from './HeroGridBackground';`.

- [ ] **Step 1: Append the wave keyframes and reduced-motion rule to `apps/vbl/app/globals.css`**

```css

/* Home hero grid wave (components/marketing/HeroGridBackground.tsx).
   The highlight overlay in each grid cell runs this once per 10s loop;
   per-cell animation-delay staggers it into a diagonal traveling wave. */
@keyframes hero-grid-wave {
  0% {
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  12% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

.hero-grid-wave-cell {
  animation: hero-grid-wave 10s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hero-grid-wave-cell {
    animation: none;
  }
}
```

- [ ] **Step 2: Create `apps/vbl/components/marketing/HeroGridBackground.tsx`**

```tsx
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
  const diagonalIndex = (COLS - 1 - col) + row;
  return diagonalIndex * DELAY_STEP_S - WAVE_DURATION_S;
}

export function HeroGridBackground() {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isLit = LIT_CELL_SET.has(`${col}:${row}`);
      cells.push(
        <div
          key={`${col}:${row}`}
          className="relative border-l border-t border-white/[0.04]"
          style={
            isLit ? { backgroundColor: 'rgba(159,232,112,0.05)' } : undefined
          }
        >
          <div
            className="hero-grid-wave-cell absolute inset-0"
            style={{
              backgroundColor: 'rgba(159,232,112,0.05)',
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
```

- [ ] **Step 3: Lint the touched files**

Run (from `apps/vbl/`):
`npx eslint components/marketing/HeroGridBackground.tsx`
Expected: no errors (warnings acceptable only if pre-existing patterns produce the same).

- [ ] **Step 4: Commit**

```bash
git add apps/vbl/components/marketing/HeroGridBackground.tsx apps/vbl/app/globals.css
git commit -m "feat(vbl): code-rendered hero grid background with diagonal wave"
```

---

### Task 2: `animatedGridBackground` prop on `Hero`

**Files:**
- Modify: `apps/vbl/components/marketing/Hero.tsx` (props interface ~lines 10-36, destructuring ~lines 43-55, background render ~lines 57-71)

**Interfaces:**
- Consumes: `HeroGridBackground` from Task 1 (`import { HeroGridBackground } from './HeroGridBackground';`).
- Produces: new optional `HeroProps.animatedGridBackground?: boolean` (default `false`). When `true`, the background `<Image>` is replaced by `<HeroGridBackground />`; `backgroundImageSrc`/`showDefaultGlows` semantics for all existing callers are unchanged.

- [ ] **Step 1: Add the import**

In `apps/vbl/components/marketing/Hero.tsx`, after `import Image from 'next/image';`:

```tsx
import { HeroGridBackground } from './HeroGridBackground';
```

- [ ] **Step 2: Add the prop to `HeroProps`**

After the `showDefaultGlows?: boolean;` member (keep its comment), add:

```tsx
  /** Render the code-based animated grid background (grid + wave + its own
   * corner glows) instead of the background image. Used by the Home page;
   * carries its own lighting, so pair with `showDefaultGlows={false}`. */
  animatedGridBackground?: boolean;
```

- [ ] **Step 3: Destructure it with a default**

In the `Hero` function parameter list, after `showDefaultGlows = false,`:

```tsx
  animatedGridBackground = false,
```

- [ ] **Step 4: Branch the background render**

Replace the existing background `<Image ... />` block (the one with
`src={backgroundImageSrc}`) with:

```tsx
      {animatedGridBackground ? (
        <HeroGridBackground />
      ) : (
        <Image
          src={backgroundImageSrc}
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover object-top"
        />
      )}
```

- [ ] **Step 5: Lint**

Run (from `apps/vbl/`): `npx eslint components/marketing/Hero.tsx`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/vbl/components/marketing/Hero.tsx
git commit -m "feat(vbl): Hero prop to opt into the animated grid background"
```

---

### Task 3: Home page opt-in + browser verification

**Files:**
- Modify: `apps/vbl/app/(marketing)/page.tsx` (Hero call ~lines 297-327, incl. the comment block above it)

**Interfaces:**
- Consumes: `HeroProps.animatedGridBackground` from Task 2.
- Produces: nothing downstream.

- [ ] **Step 1: Switch the home hero to the code background**

In the `<Hero ...>` call, replace

```tsx
        backgroundImageSrc="/marketing/home/hero-background-photo.png"
        showDefaultGlows={false}
```

with

```tsx
        animatedGridBackground
        showDefaultGlows={false}
```

and update the `---- HERO ----` comment block above the call to say the
background is now the code-rendered `HeroGridBackground` (grid + diagonal
wave + top-right/bottom-left glows), replacing the former
`hero-background-photo.png` (kept on disk for reference/rollback).

- [ ] **Step 2: Lint**

Run (from `apps/vbl/`): `npx eslint "app/(marketing)/page.tsx"`
Expected: no new errors.

- [ ] **Step 3: Verify in the browser**

Run: `pnpm vbl:dev` (port 3000), open `http://localhost:3000`.
Check:
1. Hero reads like today's design: dark green base, faint 96px grid, bright top-right glow, soft bottom-left glow, scattered slightly-lit cells.
2. A subtle brightened band travels diagonally top-right → bottom-left and loops (~10s period) with no jump at the loop seam.
3. Mobile width (375px): grid renders, no horizontal overflow.
4. Reduced motion (DevTools → Rendering → `prefers-reduced-motion: reduce`): wave stops, static look remains.
5. `http://localhost:3000/pricing` (any other marketing page): still shows the PNG grid background, unchanged.

- [ ] **Step 4: Commit**

```bash
git add "apps/vbl/app/(marketing)/page.tsx"
git commit -m "feat(vbl): home hero uses code-rendered animated grid background"
```
