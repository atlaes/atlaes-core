# Motion M1 — switch, observer, hooks, CSS hooks (contract for M2/M3)

Branch `feat/gpr-motion`, app `apps/gpr`. All motion is decoration on top of
server-rendered HTML: content, figures and FAQ answers are always in the
initial markup and visible without JS.

## The switch

- `components/marketing/motion/flag.ts`
  - `MOTION_ENABLED` = `process.env.NEXT_PUBLIC_GPR_MOTION !== 'off'`
    (build time), `MOTION_ATTR` = `'on' | 'off'`.
  - `motionAllowed()` (client): `.mk[data-motion="on"]` AND not
    `prefers-reduced-motion: reduce`. Returns `false` during SSR.
- `app/(marketing)/layout.tsx` renders `<div className="mk"
  data-motion={MOTION_ATTR}>` and mounts `<MotionObserver />` only when on.
- Key every motion CSS rule off `.mk[data-motion='on']`; put anything that
  moves inside `@media (prefers-reduced-motion: no-preference)`.
- Anything that starts hidden must also require `html.js` (below).

## MotionObserver (`components/marketing/motion/MotionObserver.tsx`)

One `'use client'` island, renders nothing. When the switch is on:

1. Auto-tags reveal targets on pages that do not set them (home, core,
   utility): `.mk-hs > .mk-container`, `.mk-section > .mk-section-inner >
   .mk-body`, `.mk-core-cta-inner` → `data-reveal`; every `.mk-main
   .mk-rail` → `data-reveal="rail"`; `.mk-review-grid`, `.mk-article-grid`,
   `.mk-criteria`, `.mk-two-cards`, `.mk-core-tiles` →
   `data-reveal-stagger`. Never tags inside `header`, `.mk-home-hero`,
   `.mk-chero`, `.mk-core-hero`, `.mk-hero`, nor a unit containing an `h1`.
   Article pages: only structural blocks (`.mk-art-col > .mk-art-tool /
   .mk-art-kv / .mk-callout / .mk-table-wrap / .mk-faq`, `.mk-art-review`;
   `.mk-art-stats` staggers) — running paragraphs never fade.
   An element that already has a `data-reveal` attribute is left alone
   (use `data-reveal="off"` to opt out of auto-tagging).
2. Elements already on screen get `is-in is-static` (no animation, no
   flash), THEN it adds `js` to `<html>`. Only from that moment does CSS
   hide the rest — no-JS users and crawlers see everything.
3. IntersectionObserver (`rootMargin 0 0 -8% 0`) adds `is-in` once; a
   MutationObserver re-scans after client navigation.
4. Stagger: sets `--reveal-delay` = index × 70ms (capped at 8) on each
   child of a `[data-reveal-stagger]`.
5. Header: `data-scrolled` on `.mk-header` after 8px of scroll (also under
   reduced motion; it is a shadow, not movement).

Under reduced motion it does not add `html.js`, so nothing is ever hidden.

## Hooks (barrel `components/marketing/motion/index.ts`)

- `usePrefersReducedMotion(): boolean` — starts `true` (final state) on the
  server and first render, then follows the media query.
- `useInView<T>({ rootMargin?, threshold?, once? = true }): [ref, inView]`
  — reports `true` when IntersectionObserver is missing.
- Pattern for a counter or glyph: render the final value on the server;
  only animate when `motionAllowed()` (or `!usePrefersReducedMotion()` and
  the `.mk[data-motion]` check) and `inView`.
- `ScrollSpy` (inside any `<nav>` of `#anchor` links; already inside
  `JumpMenu`) and `StepProgress` (How It Works timeline) are M1's.

## CSS hooks (`app/(marketing)/marketing.css`, block "motion (stream M1)")

| Hook | Effect |
| --- | --- |
| `data-reveal` / `data-reveal=""` | fade up 16px, 500ms ease-out when `.is-in` |
| `data-reveal="rail"` | rail slides in 12px; its `.mk-rail-arrows` chevron slides 6px (120ms later) |
| `data-reveal="off"` | never hidden, never auto-tagged |
| `data-reveal-stagger` | children fade up in turn (`--reveal-delay`) |
| `.is-in` / `.is-static` | set by the observer (static = was on screen at load) |
| `html.js` | set by the observer; required for any hidden initial state |
| `.mk-header[data-scrolled]` | soft shadow |
| `[data-sticky][data-stuck]` | set by ScrollSpy while the bar is pinned |
| `--mk-header-h` (77px) | sticky header height, on `.mk[data-motion='on']` |
| `--mk-reveal-dur`, `--mk-reveal-y` | 500ms / 16px |

Reveal animations use `animation-fill-mode: backwards`, so after they end
an element's own `transform` (hover lift) applies again. Don't set a
reveal on the hero H1 / LCP element.

`Section` (ui) has `reveal?: boolean` (default true → `data-reveal` on
`.mk-body`); `Rail` carries `data-reveal="rail"`.

## Navigation and scroll (as built)

- Sticky header (motion on): the trust bar now renders *before*
  `<header class="mk-header">` (SiteHeader returns a fragment), so only the
  76px row + hairline sticks (`--mk-header-h: 77px`). `.mk` uses
  `overflow-x: clip` (via `@supports`) instead of `hidden`, otherwise no
  `position: sticky` inside `.mk` can work — this also makes the existing
  article TOC rail sticky (its `top` is offset by the header when motion
  is on).
- Anchors: `.mk[data-motion='on'] [id]` gets `scroll-margin-top: header +
  16px` (`+80px` on country pages ≥768 for the jump bar). Smooth scroll is
  `html:has(.mk[data-motion='on'])` under `prefers-reduced-motion:
  no-preference` only.
- Country jump menu: `CountryJumpBar` (CountryHero.tsx) renders the row
  and hairline as siblings right after the hero (`CountryHero
  jumpOutside`), with the original spacing; ≥768 and motion on it sticks
  at `top: var(--mk-header-h)`, compact 12px padding, `data-stuck` adds a
  hairline shadow (and removes the header's). Phones keep the static
  wrapped row (a 3-row sticky bar would cover a quarter of the screen).
  `/other-countries` and `/former-yugoslavia` (RulesPage, not M1's) still
  pass `jump` into the hero, so their rows get scroll-spy but do not stick.
- `JumpMenu` contains `<ScrollSpy />`: `aria-current="location"` on the
  link of the section under the reading line (sticky bar bottom + ~25% of
  the viewport, max 160px). Active pill: navy stroke, tint fill, navy text.
  Article TOC active item aligned: navy rule + navy text (it keeps its own
  scroll-spy).
- How It Works: `<StepProgress />` after the timeline `<ol>`; navy line
  scales over each tint connector as the 55% viewport line passes, reached
  nodes turn navy. Steps reveal one by one (`.mk-hiw-step-body
  data-reveal`, grid `data-reveal="off"`). Rules live in
  `how-it-works.css` (block "motion (stream M1)").

## Micro-interactions (marketing.css block)

- `a.mk-pill` (not ghost/dark) and `.mk-nav-cta`: hover lift 1px + navy
  shadow (black on dark/navy bands), press `scale(.98)`.
- Focus-visible: 2px navy outline, offset 3 (white on dark/navy bands and
  in the footer) for pills, nav links, dropdown/menu summaries, jump and
  TOC links, `.mk-link`. Not gated by the switch (accessibility).
- Cards `.mk-card`, `.mk-article`, `.mk-review`, `.mk-core-tile`,
  `.mk-criteria-card`: hover lift 2px, stroke → `--mk-muted` (white 28 %
  on dark cards), soft shadow.
- `a.mk-link`: underline slides in from the left (background-size).
- FAQ rows (`.mk-faq-item > summary`): question turns navy (pale on
  dark/navy) on hover. The accordion itself is the coordinator's.
- Header dropdown and phone menu: fade + 6px slide, 150ms on open; caret
  rotates.
- Under reduced motion all transforms/animations are dropped; colour and
  shadow changes stay.
