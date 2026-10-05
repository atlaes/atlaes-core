# GPR motion spec, extracted from Figma

Source: Figma `puWmglOU7swxOszejGvIIy`, page "🎞 Motion & interaction
[ Draft 2 Oct ]" (`1115:5857`). Read on 2026-10-05 from the annotation-strip
text nodes, the token table on board 00, the variant frames on board 05
(fills, strokes, effects, padding) and the prototype reactions on the
board-05 variants. Figma is the source of truth. The code side is in
`apps/gpr` (see "Where it lives" per row).

## Global rules (board 00, `1115:5858`)

1. Content is always in the HTML. Motion changes only how it appears
   (opacity, transform, stroke). Counters animate a decorative copy. Without
   JavaScript everything is visible and in its final state.
2. Reduced motion means static. Every storyboard jumps to its final frame:
   no transforms, no counters, no drawing. Colour and focus changes stay but
   switch instantly (0 ms).
3. The hero headline is never delayed. H1, sub-line and eligibility card
   render at t = 0. Hero motion touches only the background, the glyph and
   the stats.
4. One global switch (Figma: `data-motion="off"` on `<html>`). The code uses
   `.mk[data-motion]` on the marketing root instead (hard rule of the motion
   streams). It has the same effect.

Priorities: P1 = launch (02 flow card, 05 micro-interactions), P2 = after
launch (03 tools, 04 scroll & navigation), P3 = only within the performance
budget (01 hero). The code ships all of them behind the one switch.

## Motion tokens (board 00)

| Token | Value | Use | CSS custom property (`.mk[data-motion='on']`) |
| --- | --- | --- | --- |
| Duration · instant | 150 ms | hover, focus, colour changes | `--mk-motion-instant` |
| Duration · quick | 240 ms | hint reveal, dropdown, FAQ row | `--mk-motion-quick` |
| Duration · base | 480 ms | section reveal, chevron slide | `--mk-motion-base` |
| Duration · slow | 800 ms | bars, timeline fill, glyph draw | `--mk-motion-slow` |
| Duration · count | 1200 ms | stat counters | `--mk-motion-count` |
| Easing · out | cubic-bezier(0.16, 1, 0.3, 1) | things arriving (default) | `--mk-motion-ease-out` |
| Easing · in-out | cubic-bezier(0.65, 0, 0.35, 1) | things travelling (glyph, route) | `--mk-motion-ease-in-out` |
| Easing · standard | cubic-bezier(0.2, 0, 0, 1) | hover / state changes | `--mk-motion-ease-standard` |
| Easing · linear | linear | scroll-linked only | (plain `linear`) |
| Stagger | 60–120 ms per item, max 4 items then all at once | | `--mk-motion-stagger` = 80 ms (the value every board uses), cap 4 items |
| (in rows only) Easing · in | cubic-bezier(0.4, 0, 1, 1) | closing (flow hint, FAQ) | `--mk-motion-ease-in` |

Row-specific durations that are not tokens (100, 120, 160, 200, 300, 600,
900, 2400 ms) are also defined once on `.mk[data-motion='on']` as named
properties (`--mk-motion-press`, `--mk-motion-close`, `--mk-motion-card`
and so on; see the token block in `marketing.css`). Under
`prefers-reduced-motion: reduce` every duration token is 0 ms, so colour
and focus changes switch instantly (rule 2).

The JS islands use the same values from
`components/marketing/motion/tokens.ts`.

## 01 Hero (`1115:5958`, strip `1117:5858`), P3

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Page load (first paint + idle) | Grid line opacity (lines every 32 px, white) | 0 → 12 %, then rests at 8 % | 600 ms | out | 300 ms | Grid static at 8 %, no wave |
| 1 | Same | Wave band position (diagonal, top-left → bottom-right) | −20 % → 120 % of hero width, peak 28–32 % white | 2400 ms | in-out | 300 ms, plays once | No band |
| 2 | Page load | "››" glyph outline (stroke-dashoffset) | 100 % → 0 % of path | 900 ms | in-out | 200 ms | Glyph shown filled at 14 % |
| 2 | Outline 80 % drawn | Glyph fill opacity | 0 → 14 % (#5e8cd9) | 300 ms | out | 920 ms | — |
| 3 | Stats ≥ 50 % in viewport (on load in the hero) | Displayed number (decorative overlay) | 0 → real value, same format | 1200 ms | out | 400 ms, +120 ms per tile | Real value static |
| 3 | Counter reaches final value | Number colour | #afc6ec → #ffffff | 150 ms | standard | at count end | White from the start |
| — | — | H1, sub-line, bullets, eligibility card | no animation | 0 | — | never delayed | Identical |

Storyboard: mid-count frame (t ≈ 900 ms) shows €7,384 · 48.6 % · 3.17/5 in
pale blue; these are illustration only. Real values come from the tokens.

## 02 Flow card instant hint (`1117:16538`, strip `1118:5865`), P1

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | — | Button | live and navy from the start, never disabled; no hint space reserved | — | — | — | Same |
| B | Field 1 value selected | Field text colour | #8c8c8c → #181818 | 150 ms | standard | 0 | Instant |
| C | Both fields have a value | Hint panel height (grid-template-rows) | 0fr → 1fr | 240 ms | out | 0 | Full height instantly |
| C | Same | Hint panel opacity + translateY | 0 → 1 · 4 px → 0 | 200 ms | out | 60 ms | Instant, no movement |
| C | Same | aria-live="polite" announcement | region updated | — | — | after panel opens | Same |
| D | Hint open complete | Button halo (box-shadow spread) | 0 → 6 px #5e8cd9 at 45 % → 0, once | 600 ms | out | 240 ms | No halo |
| D | Same | Button arrow translateX | 0 → 4 px (stays) | 150 ms | standard | 240 ms | Arrow static |
| C′ | Answer changed after the hint shows | Hint text cross-fade | old 1 → 0, new 0 → 1 | 150 + 150 ms | standard | 0 | Text swaps instantly |
| — | A field is cleared | Hint panel close | 1fr → 0fr, opacity 1 → 0 | 200 ms | in (0.4, 0, 1, 1) | 0 | Disappears instantly |

Hint text in Figma is [PLACEHOLDER]; the code keeps its real verdict texts.

## 03 Tools (`1118:6257`), P2

### 3A Waiting-period timeline (`1118:6262`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Result card rendered | Month cell fill | #d7e4f6 → #002691 (leading cell #5e8cd9) | 160 ms per cell | out | 150 ms, +30 ms per month (≤ 24) | All passed months navy at once |
| 2 | Fill reaches "today" | Remaining months fill | #d7e4f6 → #afc6ec | 240 ms | standard | after last filled month | Pale at once |
| 3 | Fill complete | Filing-date marker opacity + translateY | 0 → 1 · −8 px → 0 | 240 ms | out | ≈ 870 ms | Marker shown, no drop |
| — | User recalculates | Whole track | resets to empty, replays | same | same | 0 | Final state only |

Result text renders first and is complete on its own.

### 3B Processing-time bars (`1119:5949`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Chart ≥ 40 % in viewport (once) | Bar scaleX (origin left) | 0 → 1 | 800 ms | out | 0, +100 ms per bar (4) | Bars at final width |
| 2 | Each bar finishes | Value + "x of 300" opacity | 0 → 1 | 240 ms | standard | at bar end | Values visible |
| — | — | Labels, title, footnote, track | no animation | — | — | — | Identical |

### 3C Office-finder route (`1120:5857`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Result returned | Route node dot + label colour | #c6c6c6 / #8c8c8c → #002691 (leading #5e8cd9) | 150 ms | standard | 100 ms, +120 ms per node | All nodes lit at once |
| 2 | Each node lit | Connector scaleY (origin top) | 0 → 1, #c6c6c6 → #002691 | 120 ms | in-out | with its node | Connectors lit |
| 3 | Route reaches the end (≈ 700 ms) | Card ring + shadow | 0 → 3 px #5e8cd9 · shadow 0/8/24 navy 18 % | 240 ms | out | 720 ms | Ring + shadow at once, then stays |
| 3 | Same | Keyboard focus | moves to the card heading (tabindex −1) | — | — | after ring | Same, focus always moves |
| — | No match / implausible prefix | Route | not shown (warning card only) | — | — | — | — |

## 04 Scroll & navigation (`1123:5857`), P2

### 4A Sticky jump menu (`1123:5862`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | Menu top reaches viewport top (sticky, below the main nav) | Bar padding · background · shadow | 36 → 15 px · transparent → white · none → 0/4/12 navy 10 % | 150 ms | standard | 0 | Sticks, styles switch instantly |
| 2–3 | Section crosses the reading line (40 % from top) | Active pill fill · text · stroke | white / #181818 / #c6c6c6 → #002691 / #ffffff / #002691 | 180 ms | standard | 0 (old pill fades back in parallel) | Instant colour swap |
| — | Pill clicked | Page scroll | smooth, lands 24 px below the sticky bar | browser (≈ 400–600 ms) | browser | 0 | Jumps instantly |
| — | Narrow screens (< 768 px) | Menu row | horizontally scrollable; active pill auto-scrolls into view | 240 ms | out | 0 | Instant |

### 4B Rail chevron (`1124:5943`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Section ≥ 15 % in viewport (once) | Chevron translateX + opacity | −8 px → 0 · 0 → 1 | 480 ms | out | 0 | Chevron static, visible |
| 1 | Same | Label opacity | 0 → 1 | 480 ms | out | 60 ms | Label visible |
| — | Already in view on load / no JS | — | final state, no animation | — | — | — | — |

Storyboard: t = 160 ms chevron −3 px / 0.7, label 0.7; t = 480 ms final.

### 4C How It Works progress (`1125:5926`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1–3 | Scroll position in the timeline (both directions) | Progress fill scaleY (origin top) | 0 → 1 of connector | scroll-linked | linear | — | Line full navy, all numbers navy |
| 2 | Fill reaches a step number | Number badge fill · text | light → #002691 · → #ffffff | 150 ms | standard | 0 | All navy from the start |
| — | No scroll-timeline support | Same via passive rAF scroll listener | — | — | — | — | — |

### 4D Section reveal with stagger (`1128:5857`)

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1–3 | Section ≥ 15 % in viewport (once) | opacity | 0 → 1 | 480 ms | out | 0 / 80 / 160 ms (+80 ms per item, max 4) | Visible, no fade |
| 1–3 | Same | translateY | 24 px → 0 | 480 ms | out | same stagger | No movement |
| — | Already in view on load, deep link (#anchor), print | — | final state | — | — | — | — |
| — | Never applied to | H1 / hero, sticky jump menu, forms, FAQ answers, legal text | — | — | — | — | — |

Items: ① rail label, ② H2, ③ body block / callout. Layout space is reserved,
nothing below moves; no replay on scroll-up. Storyboard mid frame (t = 240
ms): ① 4 px/85 %, ② 10 px/55 %, ③ 18 px/20 %; final at t = 640 ms.

## 05 Micro-interactions (`1130:5857`), P1

Prototype reactions read from the variants (Smart Animate): pill hover
150 ms, press 100 ms; card hover 200 ms; link hover 150 ms; FAQ hover
150 ms, open 240 ms, close 200 ms; dropdown open 160 ms, close 120 ms. All
prototype transitions use Figma's `EASE_OUT` (the prototype cannot use a
custom curve); the annotation rows give the real curves (standard for
hover/press, out for open), which the code follows.

| # | Trigger | Property | From → To | Duration | Easing | Delay | Reduced motion / switch off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5A | Pointer enters button (`hover: hover` only) | Background · arrow gap · shadow | #002691 → #001d73 · 8 → 11 px (arrow +3 px) · none → 0/4/12 navy 25 % | 150 ms | standard | 0 | Colour + shadow instant, arrow static |
| 5A | Pointer down / touch start | Background · scale | → #00175c, inner shadow 0/2/4 black 25 % · 1 → 0.98 | 100 ms | standard | 0 | Colour only, no scale |
| 5A | Keyboard focus (`:focus-visible`) | Focus ring | none → 2 px white + 2 px #5e8cd9 | 0 ms | — | 0 | Identical (never removed) |
| 5B | Pointer enters card (pointer devices only; whole card is one link) | translateY · shadow · title colour | 0 → −6 px · none → 0/12/28 navy 14 % · #181818 → #002691 | 200 ms | standard | 0 | Shadow + colour instant, no lift |
| 5B | Card focus-visible | ring | same 2 px ring as buttons | 0 | — | 0 | Identical |
| 5C | Pointer enters link | Colour · underline thickness · offset | #002691 → #5e8cd9 · 1 → 2 px · 3 → 4 px | 150 ms | standard | 0 | Instant |
| 5C | — | Visited / focus | visited keeps default colour; focus 2 px #5e8cd9 outline, 2 px offset, radius 2 | — | — | — | — |
| 5D | Pointer enters FAQ row | Row background (12 px inner padding) · question colour | transparent → #f1f1f1 · #181818 → #002691 | 150 ms | standard | 0 | Instant |
| 5D | Click / Enter / Space | Answer height · opacity · icon rotation | 0fr → 1fr · 0 → 1 (60 ms delay) · 0 → 45° | 240 ms | out | opacity 60 ms | Opens instantly |
| 5D | Close | Answer height | 1fr → 0fr | 200 ms | in | 0 | Closes instantly |
| 5E | Click / Enter / Alt+↓ on select | Border · chevron · panel | #c6c6c6 1 px → #002691 2 px · 0 → 180° · opacity 0 → 1, −4 px → 0 | 150 / 160 / 160 ms | out | 0 | Opens instantly, chevron flips without rotation |
| 5E | Option highlighted | Option background | → #d7e4f6 | 0 ms | — | 0 | Identical |
| 5E | Close | panel | reverse | 120 ms | — | — | — |
| 5E | Phones | — | native picker, no custom animation | — | — | — | — |

Variant details: 5A hover gap 11 px, pressed frame 255 px wide (scale
0.98); 5A focus = drop shadows spread 2 px #fff + spread 4 px #5e8cd9.
5B hover = 6 px lift, effect 0/12 r28 #002691 @ 14 %, stroke stays
#c6c6c6. 5C default already underlined (1 px, offset 3); hover 2 px,
offset 4, #5e8cd9. 5D hover = #f1f1f1 fill, content inset 12 px each side;
open variant shows "−" in the toggle. 5E open = 2 px navy stroke, chevron
180°, panel white r8 stroke #c6c6c6 shadow 0/8/24 navy 12 %, highlighted
option #d7e4f6 with navy text.
