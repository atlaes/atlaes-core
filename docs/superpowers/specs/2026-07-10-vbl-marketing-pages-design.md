# VBL Marketing Pages — Design Spec

**Date:** 2026-07-10
**Source of truth:** Figma file `Company Pension Page (Copy)` — fileKey `FaJMyXaWNgCVANvucaM2WI`, page `0:1`
**Target:** `apps/vbl` (Next.js 14 App Router, Tailwind CSS)

## Goal

Implement all 16 marketing/SEO page designs from the Figma file in the VBL app with
pixel-accurate desktop layouts, verbatim copy, and exact logos/icons/images. Wire
CTAs into the existing claim funnel. Make every page fully responsive.

## Scope

### Pages and routes

All pages live in a route group `apps/vbl/app/(marketing)/` sharing one layout
(navbar + footer from Figma).

| # | Figma frame (node ID) | Route |
|---|---|---|
| 1 | Home (`1171:315`) | `/` |
| 2 | How it works (`1183:4564`) | `/how-it-works` |
| 3 | Pricing (`1187:3965`) | `/pricing` |
| 4 | FAQ (`1199:11597`) | `/faq` |
| 5 | Reviews (`1206:19952`) | `/reviews` |
| 6 | About us (`1216:2457`) | `/about` |
| 7 | VBL Refund (`1244:3166`) | `/vbl-refund` |
| 8 | ZVK Refunds (`1108:95`) | `/zvk-refund` |
| 9 | VddB & VddKO Refunds (`1080:5379`) | `/vddb-vddko-refund` |
| 10 | Direktversicherung Cash-Out (`1118:7990`) | `/direktversicherung-cash-out` |
| 11 | Company Pension Cash-Out (`1254:10129`) | `/company-pension-cash-out` |
| 12 | Cash-Outs & Refunds (`1270:72`) | `/cash-outs-and-refunds` |
| 13 | VBL vs DRV (`1153:62`) | `/vbl-vs-drv` |
| 14 | Company Pension vs DRV (`1366:5987`) | `/company-pension-vs-drv` |
| 15 | Refund Calculator marketing page (`1338:72`) | `/refund-calculator` |
| 16 | FAQ sub-sections `faq how` (`288:15257`) / `faq pricing` (`303:2154`) | embedded in `/faq`, `/how-it-works`, `/pricing` as sections, not standalone routes |

Frame `71:122` ("Home Page", hidden in Figma) is superseded and ignored.
The Figma page `old` (`1183:2628`) is ignored.

### Routing changes

- `apps/vbl/app/page.tsx`: remove the auth redirect and dead markup; `/` renders
  the marketing Home for everyone. Logged-in users reach `/dashboard` via nav.
- Existing app routes are untouched: `/auth`, `/dashboard`, `/calculator`,
  `/calculator-entry-a`, `/get-started`, `/calculator/onboarding`.

### CTA wiring

- "Start your claim" (and equivalents) → `/get-started`
- "Calculate my refund" / calculator CTAs → `/calculator`
- Nav links → the marketing routes above.

## Architecture

### Shared component library

`apps/vbl/components/marketing/`:

- `MarketingNav` — dark-green header: logo, links (How it works, Pricing, FAQ,
  About), "Start your claim" button. Mobile: hamburger menu.
- `MarketingFooter` — from Figma footer design.
- `Hero` — dark-green hero variants (home, product-page).
- `SectionHeading`, `FeatureCard`, `StepCard` (numbered how-it-works steps),
  `FaqAccordion`, `ReviewCard`, `ComparisonTable` (vs-DRV pages),
  `CtaBand`, `PriceCard` — extracted as the frames are analyzed; the list may
  grow, but any block appearing on 2+ pages must be a shared component.
- Copy lives in the page files (JSX), not a CMS or i18n layer — the designs are
  English-only; no translation infrastructure in this pass.

### Assets

- Downloaded from Figma via MCP `download_assets` per frame into
  `apps/vbl/public/marketing/<page>/`.
- Logo/icons: SVG (existing `public/companypension-cashouts-refunds.svg` reused
  where it matches). Photos/app screenshots: PNG or WebP.
- All raster images rendered via `next/image` with explicit dimensions.
- No hotlinking to Figma URLs (they are temporary).

### Design tokens

- Extract Figma variables via `get_variable_defs` (dark green background, accent
  green, neutrals, font families/sizes) into `tailwind.config.js` theme extensions.
- Pages must use named tokens, not raw hex values.

### Responsive strategy

- Desktop (≥1280px) matches Figma 1920px frames proportionally (max-width
  container, pixel-accurate at 1920).
- Tablet/mobile: Tailwind breakpoints designed by us (Figma has no mobile
  frames): grids collapse to 1–2 columns, nav becomes hamburger, heroes stack.

## Copy accuracy rules

1. Copy is extracted verbatim from Figma text nodes — no paraphrasing.
2. **Written client feedback overrides Figma** (project rule). Before finalizing
   each page, cross-check recorded client decisions (e.g. 2026-07 item 19: EUR
   account wording, "free" dropped). Conflicts are flagged in the PR description,
   not silently resolved.
3. German terms (VBL, ZVK, VddB, VddKO, Direktversicherung, DRV, bAV) must be
   spelled exactly as in Figma.

## Error handling

- Marketing pages are static content — no data fetching, no error states beyond
  the existing `app/error.tsx` / `not-found.tsx`.
- Images missing at build time = build failure (imported statically), not a
  silent 404.

## Testing

- Playwright smoke spec per route: page renders, `<h1>` matches Figma headline,
  nav present, primary CTA href points at the correct funnel URL.
- Existing e2e suite stays green (notably `companypension-logo.spec.ts`,
  calculator/onboarding flows). Note: repo has ~29 pre-existing test failures
  (known gotcha) — the bar is "no new failures".
- Visual verification during dev: each page compared against a Figma screenshot
  of its frame at desktop width.

## Execution model

- Fable orchestrates; implementation by Opus subagents (shared library, pages),
  asset download/verification by Sonnet subagents (standing user instruction).
- Build order: tokens + assets → shared components → Home → remaining core pages
  → SEO/product pages (parallelizable once the library exists).

## Out of scope

- German localization / i18n infrastructure.
- CMS integration.
- Changes to funnel flows, auth, dashboard, backend.
- `apps/web` (the separate Vite marketing site) — this work is VBL-only.
- SEO metadata beyond sensible per-page `<title>`/description (structured data,
  sitemaps can follow later).
