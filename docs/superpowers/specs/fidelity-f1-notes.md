# Fidelity F1 — shell, primitives, homepage (contract for later passes)

Source of truth: Figma `puWmglOU7swxOszejGvIIy` — Home `626:11297`, header
`104:83`, footer `602:1867`, country frame `1057:10712` (Ukraine). All
styles live in `apps/gpr/app/(marketing)/marketing.css` (shell +
primitives) and `apps/gpr/components/marketing/home/home.css` (homepage +
shared cards). Country, article, utility and account passes must use the
classes and props below instead of new one-off styles.

## Frame and spacing

- Frame 1440, content 1280: `.mk-container` (max 1440, side padding
  `--mk-gutter` = 16px phone / 40px ≥768 / 80px ≥1440).
- Section padding `--mk-section-py` = 56 / 80 / 100px.
- Rail + body layout: rail column 280, gap 64 (`--mk-col-gap`), body 936
  (`--mk-body-w`). Two equal columns: 608 + 64 + 608 (`.mk-two`,
  `.mk-split-half`). Asymmetric: 480 + 64 + 736 (`.mk-split-480`).
- Font: Inter from `next/font` on `<body>`; `.mk` inherits it. Never set a
  literal `'Inter'` family (it is not loaded under that name).

## Tokens (CSS variables on `.mk`)

`--mk-navy #002691` · `--mk-blue #5e8cd9` · `--mk-pale #afc6ec` ·
`--mk-tint #d7e4f6` · `--mk-surface #f1f1f1` · `--mk-ink #181818` ·
`--mk-body #4b4f58` · `--mk-muted #8c8c8c` · `--mk-stroke #c6c6c6` ·
`--mk-star #e8b400` · `--mk-dark-card #1f1f1f` · `--mk-on-dark`
(white 75 %) · `--mk-on-dark-rule` (white 14 %) · `--mk-r-card 20px` ·
`--mk-r-pill 100px`.

## Section tones — `Section({ tone })` or `.mk-tone-*`

| tone      | background | type                                                   |
| --------- | ---------- | ------------------------------------------------------ |
| `plain`   | white      | ink headings, body #4b4f58                             |
| `surface` | #f1f1f1    | same                                                   |
| `tint`    | #d7e4f6    | same                                                   |
| `dark`    | #181818    | headings white, body white 75 %, links pale, rail blue |
| `navy`    | #002691    | headings white, body white 75 %, links pale, rail pale |

`ruleTop` (or `.mk-rule-top`) adds the 1px #f1f1f1 hairline used between
two white bands. Alternate `plain` / `surface` on content pages; use
`dark` / `navy` only for the emphasis bands Figma shows.

`Section({ id, index, label, title?, tone?, ruleTop?, as?, className? })`
renders the rail (280) + body (936) grid; `title` → `.mk-h2` carrying `id`.
`Rail({ index, label })` alone for custom layouts.

## Type classes

| class                    | spec                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `.mk-rail`               | "›› 01 — LABEL": Bold 12/1.2, ls 1.7px, uppercase, #5e8cd9 (`.mk-rail-arrows` 16px, ls −3.2) |
| `.mk-h1` / `.mk-display` | Extra Bold 56/100 %, ls −2.9 (40 on phone) — country hero H1                                 |
| `.mk-h2`                 | Extra Bold 36/110 %, ls −1 (28 on phone), margin-bottom 32                                   |
| `.mk-h3`                 | Bold 22/130 %, ls −0.3                                                                       |
| `.mk-h4`                 | Bold 18/130 % (sub-sections, e.g. Do I Qualify)                                              |
| `.mk-lead`               | 18/150 % ink (white on dark/navy)                                                            |
| `.mk-p`                  | 16/155 % #4b4f58, margin-bottom 16                                                           |
| `.mk-note`               | 13/150 % muted (pale on dark) — disclaimers, footnotes                                       |
| `.mk-label`              | Semi Bold 13, ls 1px, uppercase navy — card eyebrows                                         |
| `.mk-bullets`            | list with blue "››" markers (never check icons)                                              |
| `.mk-link`               | navy, no underline (underline on hover); pale on dark/navy                                   |

## Callout — `Callout({ title?, tone?, id?, as?, className? })`

- `outline` (default): white, 1px #c6c6c6, r-20, padding 32 (24 phone).
  Inside `dark`/`navy` sections it automatically becomes white 8 % fill +
  white 14 % stroke with white title.
- `tint`: #d7e4f6 panel (use for CTA panels).
- `surface`: #f1f1f1, r-12 (small notes such as the successor-states box);
  white when the section itself is `surface`.
- Title = `.mk-callout-title` (Bold 22/130 %).

## Pill — `Pill({ href, variant?, size?, arrow?, className? })`

- Sizes (GPR / Button 49:129): `sm` 44 / `md` 52 (default) / `lg` 60;
  radius 100; Inter Bold 16 (14 for `sm`).
- Variants: `primary` navy/white · `secondary` = `tint` (#d7e4f6 / navy,
  Figma "Secondary") · `inverse` white/navy (on navy bands) · `light`
  #5e8cd9/ink (on dark bands) · `ghost` text link.
- `arrow` appends the "››" glyph from the Figma button.
- Hero pair on country pages: `primary` + `secondary`, `lg` (Figma uses 56;
  60 is the nearest system size).
- Rows of CTAs: wrap in `.mk-cta-row` (gap 12/24).

## FaqList / RichFaq

Rows separated by a 1px #c6c6c6 top rule; question = Bold 22/130 %
(18 on phone) with a 32px #f1f1f1 circle "−" glyph drawn by
`.mk-faq-q::after`; answers always rendered (no accordion, no JS), with
64px right padding on ≥768. Markup: `.mk-faq > .mk-faq-item > h3.mk-faq-q

- p.mk-faq-a | Blocks`.

## JumpMenu — `JumpMenu({ items, ariaLabel?, label? })`

Compact pill row from country frame `1057:10772`: muted "JUMP TO" label
(Bold 11, ls 1.2, uppercase; pass `label={null}` to hide) + white pills,
1px #c6c6c6, padding 8/14, Semi Bold 13 ink, hover navy stroke.

## Cards and shared pieces (home.css; import it where used)

- `.mk-card` white + stroke r-20 p-28, `.mk-card-dark` #1f1f1f with blue
  label, white title, pale body; `.mk-card-h` Bold 22.
- `.mk-cta-panel` (+ `.mk-cta-panel-text`) — tint r-24 p-36, Extra Bold 20
  navy text + `Pill lg arrow`. Legacy `.mk-cta-block` now renders the same.
- `.mk-criteria` / `.mk-criteria-card` — numbered "#1" rows for dark bands.
- `.mk-checks` — blue circle ✓ checklist (document lists only).
- `.mk-cta-strip` — bordered r-20 strip with "›› link · ›› link" + pill.
- `.mk-video` — #2a2a2a r-20 placeholder with white play disc.
- Reviews: `Reviews` component; `.mk-review-grid` is a CSS-columns masonry
  (3 × 410 at 1280, 2 on tablet, 1 on phone), cards white 0.5px stroke r-20.
- Articles: `.mk-article` white + stroke r-20, 216px tint image slot,
  Bold 22 title, uppercase 11 date, navy "››".
- `.mk-section-footer` — "View all … →" line (Bold navy link).

## Shell

- Header (`SiteHeader`): dark #181818 trust bar (Bold 11 uppercase, ls
  0.88, "×" hides it via a checkbox — no JS); two-line wordmark
  (`Wordmark` export, Extra Bold 20/0.86, navy, blue "››"); nav links
  Semi Bold 13 uppercase, padding 8/7, gap 2, one line ≥1360px, grey
  #f1f1f1 hover pill; "Rules by Country ▼" `<details>` dropdown (white
  card r-16, stroke, shadow); "CLAIM REFUND" navy pill h-40 Bold 14; 1px
  #f1f1f1 hairline. Below 1360px: CTA + round burger (`<details>`).
- Footer (`SiteFooter`): navy, 1px #c6c6c6 top line, white 20 % rules
  between bands; brand row (white wordmark, address 15/150 % white 80 %,
  round social icons `public/marketing/social-*.svg`, ProvenExpert badge
  strip `public/marketing/provenexpert-badges.png`); four link groups
  (headings Bold 12 ls 1.2 uppercase white; links 14/140 % white; country
  index in two flowing columns); disclaimer band 12/150 %; copyright 14.

## Assets (`apps/gpr/public/marketing/`)

`hero-bg.jpg` (hero photo, 1200×630 from Figma image fill),
`provenexpert-badges.png` (4 badges, 2×), `social-{linkedin,facebook,x,
youtube,instagram,email}.svg`, `google-g.svg`, `icon-users.svg`.

## Rules for the next passes

1. Do not reintroduce gradients, check-icon bullets, bordered stat cards,
   or text-only logos.
2. Rails are design chrome: `aria-hidden`, uppercase, numbered per page.
3. Body copy on dark/navy is white 75 %; links pale; never navy on navy.
4. Phone: 16px gutters, single column, no horizontal scroll (verified on
   `/` and `/ukraine` at 390px: scrollWidth = 390).
