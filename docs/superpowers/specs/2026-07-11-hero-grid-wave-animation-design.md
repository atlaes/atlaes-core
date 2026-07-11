# Home Hero: Code-Based Grid Background with Wave Animation

**Date:** 2026-07-11
**Status:** Approved
**Scope:** `apps/vbl` homepage hero only (`app/(marketing)/page.tsx` + `components/marketing/Hero.tsx`)

## Goal

Replace the homepage hero's static background PNG
(`/marketing/home/hero-background-photo.png`) with a code-rendered
equivalent that is visually faithful to the current design, and add a
subtle diagonal wave animation that travels across the grid squares.
The floating MarketingNav header sits over the same section, so it is
covered by the same background automatically.

## Design decisions (user-approved)

- **Wave style:** diagonal sweep — a band of subtly brightened cells
  travels diagonally across the grid (aligned with the top-right glow →
  bottom-left direction), looping continuously.
- **Intensity:** subtle — peak cell highlight stays in the same
  low-opacity range as the static design (~5% lighter than base). At a
  glance the hero looks identical to today; motion is an ambient detail.
- **Scope:** home page only. All other marketing pages keep the shared
  grid PNG default in `Hero`.

## Visual reference (what "faithful" means)

Decomposition of `hero-background-photo.png`:

1. Base: brand green `#163300` (`bg-brand`).
2. Grid: square cells at 96px pitch (Figma node 1181:1998 export),
   hairline lines ~4% lighter than base.
3. Scattered cells: a handful of cells statically lit slightly lighter
   (~3–6%), irregular placement.
4. Lighting: bright yellow-green radial glow in the TOP-RIGHT corner,
   softer glow in the BOTTOM-LEFT corner. (Note: the shared Hero's
   `showDefaultGlows` glows are top-LEFT/bottom-RIGHT — wrong corners
   for the home design — so the new component carries its own glows.)

## Architecture

### New: `components/marketing/HeroGridBackground.tsx`

A presentational, **server-renderable** component (no hooks, no
`'use client'`) that renders an absolutely-positioned background layer
(`absolute inset-0`, `aria-hidden`, `pointer-events-none`) containing:

- **Cell grid:** CSS grid, fixed 96px columns/rows, overflowing cells
  clipped by the hero section's existing `overflow-hidden`. Enough
  cells to cover the widest supported viewport (~24 cols × ~12 rows);
  narrower viewports simply clip.
- **Grid lines:** per-cell `border-top`/`border-left` (or a single
  gradient overlay) in `rgba(255,255,255,0.04)`-range.
- **Static scatter:** a deterministic (seeded/hard-coded, NOT
  `Math.random()` at render — SSR/client must match) subset of cells
  with a permanent low-opacity accent highlight.
- **Wave:** one shared `@keyframes` raising a cell highlight overlay's
  opacity `0 → peak → 0`; each cell gets
  `animation-delay = (col + row) × step`, producing the diagonal
  traveling wave. Duration ~10s, infinite, ease-in-out. Animates
  **opacity only** (GPU-composited).
- **Glows:** two CSS radial-gradient divs — bright accent
  (`#9fe870`-derived rgba) top-right, soft bottom-left — matching the
  photo's baked-in lighting.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)`
  disables the wave animation; static look (grid + scatter + glows)
  remains.

### Changed: `components/marketing/Hero.tsx`

New optional prop `animatedGridBackground?: boolean` (default false).
When true, render `<HeroGridBackground />` instead of the background
`<Image>`. Existing props (`backgroundImageSrc`, `showDefaultGlows`)
and all other pages' behavior are unchanged.

### Changed: `app/(marketing)/page.tsx`

Home hero: drop `backgroundImageSrc="/marketing/home/hero-background-photo.png"`,
pass `animatedGridBackground`. The existing bottom-left bloom div behind
the app mockups stays (it agrees with the new glow corners).

The PNG files stay in the repo (`hero-background.png` remains the
default for other pages; `hero-background-photo.png` kept for
reference/rollback).

## Error handling

Pure CSS feature — no runtime failure modes. Degradation cases:

- No-JS / SSR: component is server-rendered static markup; works.
- Reduced motion: animation off, static design preserved.
- Very old browsers: cells simply don't animate; grid still renders.

## Testing

- Manual/visual: run `pnpm vbl:dev`, compare hero against the current
  photo background at desktop and mobile widths (screenshots).
- Verify the wave travels diagonally and loops seamlessly.
- Verify reduced-motion disables the animation (browser emulation).
- Verify other marketing pages (e.g. /pricing, /faq) still show the
  PNG background unchanged.
- `pnpm lint` on touched files. (Repo-wide tsc/eslint are known broken
  per project memory; scope checks to changed files.)

## Out of scope

- Migrating other marketing pages' hero backgrounds to the code grid.
- Animating the CTA band waves or any other section.
- Deleting the PNG assets.
