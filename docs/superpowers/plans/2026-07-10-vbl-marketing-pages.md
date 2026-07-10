# VBL Marketing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 16 Figma marketing pages (Company Pension) in `apps/vbl` with pixel-accurate desktop layouts, verbatim copy, and exact assets, wired into the existing claim funnel.

**Architecture:** Next.js 14 App Router route group `apps/vbl/app/(marketing)/` with a shared layout (nav + footer) and a component library in `apps/vbl/components/marketing/`. All copy/assets/tokens come from the Figma file via the Figma MCP server. Pages are static server components; the existing funnel (`/get-started`, `/calculator`, `/auth`, `/dashboard`) is untouched.

**Tech Stack:** Next.js 14, Tailwind CSS, next/image, next/font (Inter), Playwright for smoke tests, Figma MCP (`get_design_context`, `get_screenshot`, `download_assets`).

## Global Constraints

- Figma source: fileKey `FaJMyXaWNgCVANvucaM2WI`, page `0:1`. Spec: `docs/superpowers/specs/2026-07-10-vbl-marketing-pages-design.md`.
- Copy is verbatim from Figma text nodes. **Exception: `docs/client-feedback-status.md` overrides Figma** — check it before finalizing each page; flag conflicts in the task report, do not silently resolve. Known item: EUR account wording must not say "free" (client item 19).
- German terms spelled exactly: VBL, ZVK, VddB, VddKO, Direktversicherung, DRV, bAV.
- Design tokens (from Figma `get_variable_defs`, node `1171:315`): brand `#163300`, accent `#9fe870`, accent-hover `#bcef9b`, neutral-50 `#F9FAFB`, neutral-400 `#d9dbe9`, white `#ffffff`, overlay `#f5f5f51a`, radius 6px, font Inter (Regular, Semi Bold). Pages use Tailwind token names, never raw hex.
- Assets are downloaded to `apps/vbl/public/marketing/<page>/` — never hotlink Figma URLs. Logos/icons as SVG, photos/screenshots as PNG.
- CTAs: "Start your claim" → `/get-started`; calculator CTAs → `/calculator`.
- Desktop pixel-accurate at 1920px (content in a max-width container); tablet/mobile responsive via Tailwind breakpoints (our own design — Figma has no mobile frames).
- Code style: Prettier (single quotes, semicolons, 2-space, 80 char), `'use client'` only where interactivity requires it (accordion, mobile menu). Static pages stay server components.
- Repo gotchas: `tsc`/`eslint` have pre-existing repo-wide failures and ~29 pre-existing test failures — the bar is **no new failures**. Never `git stash` (shared worktrees). Husky hook may not be executable; commit with `--no-verify` if it blocks.
- Every implementer subagent MUST verify its page visually: Figma MCP `get_screenshot` (maxDimension 2000+) for the frame vs. a local Playwright screenshot at 1920px, and fix material differences before committing.
- Each page task extracts its own design context: Figma MCP `get_design_context` with the task's nodeId. If the response is too large, call `get_metadata` on the node and `get_design_context` on child sections.
- Playwright smoke specs assert the exact hero `<h1>` text. Headlines listed per task below are pre-extracted candidates — confirm against the frame's design context during implementation and use the exact Figma string in both page and spec.

## Execution notes (orchestrator)

- Per standing user instruction: orchestrator (Fable) dispatches subagents — `model: "opus"` for page/component implementation, `model: "sonnet"` for asset downloads and verification.
- Task order: 1 → 2 → 3 → 4, then 5–9 (parallelizable), then 10 → 11–17 (parallelizable after 10), 18 anytime after 4, 19 last. Parallel page tasks touch disjoint files; each commits only its own files.
- Dev server for tests: `pnpm dev` from `apps/vbl` (port 3000) or rely on `playwright.config.ts` webServer if configured — check before first test run.

---

### Task 1: Design tokens, Inter font, marketing route group scaffold

**Files:**
- Modify: `apps/vbl/tailwind.config.js`
- Modify: `apps/vbl/app/layout.tsx` (add Inter via next/font)
- Create: `apps/vbl/app/(marketing)/layout.tsx` (pass-through shell for now)
- Test: `apps/vbl/e2e/marketing/tokens.spec.ts`

**Interfaces:**
- Produces: Tailwind classes `bg-brand` (#163300), `bg-accent` (#9fe870), `bg-accent-hover` (#bcef9b), `text-brand`, `bg-neutral-50`, `border-neutral-400`, `rounded-brand` (6px), `font-sans` = Inter. Route group `(marketing)` whose layout later hosts nav/footer.

- [ ] **Step 1: Write the failing test**

```ts
// apps/vbl/e2e/marketing/tokens.spec.ts
import { test, expect } from '@playwright/test';

test('marketing tokens are compiled into the stylesheet', async ({ page }) => {
  await page.goto('/');
  const brand = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'bg-brand';
    document.body.appendChild(el);
    return getComputedStyle(el).backgroundColor;
  });
  expect(brand).toBe('rgb(22, 51, 0)'); // #163300
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/vbl`): `npx playwright test e2e/marketing/tokens.spec.ts`
Expected: FAIL — `bg-brand` doesn't exist yet, computed background is `rgba(0, 0, 0, 0)`.

- [ ] **Step 3: Add tokens to Tailwind config**

In `apps/vbl/tailwind.config.js`, inside `theme.extend`:

```js
colors: {
  brand: {
    DEFAULT: '#163300', // Figma: Background Colors/Brand
  },
  accent: {
    DEFAULT: '#9fe870', // Figma: Brand Colors/Secondary
    hover: '#bcef9b', // Figma: Background Colors/Hover
  },
  neutral: {
    50: '#F9FAFB', // Figma: Neutral/50
    400: '#d9dbe9', // Figma: Colors/Neutrals/Neutral 400
  },
},
borderRadius: {
  brand: '6px', // Figma: radius/default
},
```

(Merge with existing `primary` palette — do not remove existing keys; funnel pages depend on them. If `content` globs don't include `app/(marketing)/**` implicitly via `./app/**`, verify they do.)

- [ ] **Step 4: Add Inter font in root layout**

In `apps/vbl/app/layout.tsx`:

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// on <body className={...}> append: `${inter.variable} font-sans`
```

And in `tailwind.config.js` `theme.extend`:

```js
fontFamily: {
  sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
},
```

Check the existing body font first — if funnel pages rely on a different font, scope Inter to the `(marketing)/layout.tsx` wrapper `<div className={inter.className}>` instead of the root body.

- [ ] **Step 5: Create the route group layout (pass-through)**

```tsx
// apps/vbl/app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="font-sans">{children}</div>;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx playwright test e2e/marketing/tokens.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/vbl/tailwind.config.js apps/vbl/app/layout.tsx 'apps/vbl/app/(marketing)/layout.tsx' apps/vbl/e2e/marketing/tokens.spec.ts
git commit -m "feat(vbl): marketing design tokens, Inter font, route group scaffold"
```

---

### Task 2: Download all Figma assets

**Files:**
- Create: `apps/vbl/public/marketing/<page>/*` (svg/png per frame)
- Create: `apps/vbl/public/marketing/manifest.json`

**Interfaces:**
- Produces: `manifest.json` mapping `{ "<route>": { "nodeId": "...", "assets": ["/marketing/<page>/<file>", ...] } }`. Page tasks read this to find their images. Folder names: `home`, `how-it-works`, `pricing`, `faq`, `reviews`, `about`, `vbl-refund`, `zvk-refund`, `vddb-vddko-refund`, `direktversicherung-cash-out`, `company-pension-cash-out`, `cash-outs-and-refunds`, `vbl-vs-drv`, `company-pension-vs-drv`, `refund-calculator`.

- [ ] **Step 1: For each of the 15 frames, download assets**

For each (folder, nodeId) pair from the route table in Global Constraints /
spec: call Figma MCP `download_assets` with
`{ fileKey: "FaJMyXaWNgCVANvucaM2WI", nodeId: "<nodeId>" }`.
The response contains an exported render plus original source images with
temporary URLs and a `format` field. Download **source images only** (not the
full-frame render) with `curl -o` into `apps/vbl/public/marketing/<folder>/`,
using descriptive kebab-case filenames with the correct extension from
`format`. Skip duplicates shared across pages: shared images (e.g. the logo,
app screenshots reused on several pages) go to
`apps/vbl/public/marketing/shared/` on first download; later pages reference
the shared path. The Company Pension logo: reuse existing
`apps/vbl/public/companypension-cashouts-refunds.svg` if it matches the design
(compare visually); otherwise export the logo node as SVG.

- [ ] **Step 2: Write the manifest**

`apps/vbl/public/marketing/manifest.json` — one entry per route listing nodeId and downloaded asset paths (including any `shared/` paths it uses).

- [ ] **Step 3: Verify**

```bash
find apps/vbl/public/marketing -type f | sort
find apps/vbl/public/marketing -type f -size -100c   # suspiciously small files
python3 -c "import json;m=json.load(open('apps/vbl/public/marketing/manifest.json'));print(len(m),'routes');[print(r,len(v['assets'])) for r,v in m.items()]"
```

Expected: 15 routes in manifest; no zero/near-zero-byte files; every manifest path exists on disk. Spot-check 3 images by opening them (Read tool renders images).

- [ ] **Step 4: Commit**

```bash
git add apps/vbl/public/marketing
git commit -m "feat(vbl): download marketing page assets from Figma"
```

---

### Task 3: MarketingNav and MarketingFooter

**Files:**
- Create: `apps/vbl/components/marketing/MarketingNav.tsx`
- Create: `apps/vbl/components/marketing/MarketingFooter.tsx`
- Modify: `apps/vbl/app/(marketing)/layout.tsx` (render nav + footer around children)

**Interfaces:**
- Consumes: tokens from Task 1; logo asset from Task 2 (`shared/` or existing `companypension-cashouts-refunds.svg`).
- Produces: `<MarketingNav />` and `<MarketingFooter />` (no props), rendered by the marketing layout — page tasks do NOT render them directly. Nav links: How it works `/how-it-works`, Pricing `/pricing`, FAQ `/faq`, About `/about`; CTA button "Start your claim" → `/get-started`. Footer links include the marketing routes and legal placeholders exactly as in Figma.

- [ ] **Step 1: Extract the design**

Figma MCP `get_design_context` on the Home frame's header and footer child nodes (find them via `get_metadata` on `1171:315` — header is the top bar, footer the bottom section). Note exact spacing, colors, link labels, and footer column structure.

- [ ] **Step 2: Implement `MarketingNav`**

Dark `bg-brand` bar, logo left (next/image or the SVG component `components/vbl/icons/CompanyPensionLogo.tsx` if it matches), links center/right in white Inter, accent `bg-accent text-brand` pill button "Start your claim" linking `/get-started` (use `next/link`). Mobile (<md): hamburger toggling a full-width menu — this component is `'use client'`. Match Figma text exactly (e.g. "How it works", not "How It Works").

- [ ] **Step 3: Implement `MarketingFooter`**

Per Figma footer design context: columns, link labels, disclaimer text verbatim. Server component (no interactivity).

- [ ] **Step 4: Wire into layout**

```tsx
// apps/vbl/app/(marketing)/layout.tsx
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 5: Verify it compiles**

Run (from `apps/vbl`): `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i marketing`
Expected: no errors mentioning marketing files (repo has pre-existing unrelated errors). Playwright assertions for nav/footer land in Task 4's Home spec.

- [ ] **Step 6: Commit**

```bash
git add apps/vbl/components/marketing 'apps/vbl/app/(marketing)/layout.tsx'
git commit -m "feat(vbl): marketing nav and footer from Figma design"
```

---

### Task 4: Home page at `/`

**Files:**
- Modify: `apps/vbl/app/page.tsx` → move into group as `apps/vbl/app/(marketing)/page.tsx` (delete old `apps/vbl/app/page.tsx`)
- Create: `apps/vbl/components/marketing/Hero.tsx`, `FeatureCard.tsx`, `CtaBand.tsx`, `SectionHeading.tsx` (as needed by the frame)
- Test: `apps/vbl/e2e/marketing/home.spec.ts`

**Interfaces:**
- Consumes: layout/nav/footer (Task 3), tokens (Task 1), `manifest.json` home + shared assets (Task 2).
- Produces: shared section components used by later pages: `Hero({ eyebrow?, title, highlight?, body, primaryCta: {label, href}, secondaryCta?, image? })`, `SectionHeading({ eyebrow?, title, body? })`, `FeatureCard({ icon, title, body, bullets?, cta? })`, `CtaBand({ title, body?, cta })`. Keep props minimal — extend only when a consuming page needs it.

- [ ] **Step 1: Extract design**

Figma MCP `get_design_context` `{ fileKey: "FaJMyXaWNgCVANvucaM2WI", nodeId: "1171:315" }`. If oversized, `get_metadata` on `1171:315` and pull each section child separately. Record every text node verbatim.

- [ ] **Step 2: Write the failing smoke test**

```ts
// apps/vbl/e2e/marketing/home.spec.ts
import { test, expect } from '@playwright/test';

test('home renders hero, nav and funnel CTAs', async ({ page }) => {
  await page.goto('/');
  // Confirm exact string against extracted design context (candidate below):
  await expect(page.locator('h1')).toContainText(
    'Cash out or refund your German company pension online'
  );
  await expect(page.getByRole('navigation')).toBeVisible();
  const startCta = page.getByRole('link', { name: 'Start your claim' }).first();
  await expect(startCta).toHaveAttribute('href', '/get-started');
  const calcCta = page.getByRole('link', { name: /calculate my refund/i }).first();
  await expect(calcCta).toHaveAttribute('href', '/calculator');
});

test('home no longer force-redirects to /auth', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).pathname).toBe('/');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx playwright test e2e/marketing/home.spec.ts`
Expected: FAIL — current `/` redirects to `/auth`.

- [ ] **Step 4: Implement the page**

Delete `apps/vbl/app/page.tsx` (the redirect + dead markup). Create `apps/vbl/app/(marketing)/page.tsx` as a server component composing `Hero`, `SectionHeading`, `FeatureCard`, `CtaBand` and page-specific sections, following the frame top-to-bottom. All images via `next/image` from `/marketing/home/...`. Copy verbatim; cross-check `docs/client-feedback-status.md`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test e2e/marketing/home.spec.ts`
Expected: PASS. Also run `npx playwright test e2e/companypension-logo.spec.ts` — must stay green (or unchanged if already failing pre-task; check `git stash` is NOT used to test this — run on a clean checkout state).

- [ ] **Step 6: Visual verification**

Figma MCP `get_screenshot` `{ fileKey: "FaJMyXaWNgCVANvucaM2WI", nodeId: "1171:315", maxDimension: 2400 }`; Playwright full-page screenshot at 1920×1080 viewport; compare section by section; fix material mismatches (spacing, colors, missing images). Then check 375px width — no horizontal scroll, sections stack.

- [ ] **Step 7: Commit**

```bash
git add -A 'apps/vbl/app/(marketing)' apps/vbl/components/marketing apps/vbl/e2e/marketing
git rm apps/vbl/app/page.tsx 2>/dev/null || true
git commit -m "feat(vbl): marketing Home page at / from Figma design"
```

---

### Task 5: How it works page

**Files:**
- Create: `apps/vbl/app/(marketing)/how-it-works/page.tsx`
- Create: `apps/vbl/components/marketing/StepCard.tsx` (numbered step: `{ number, title, body, image? }`)
- Test: `apps/vbl/e2e/marketing/how-it-works.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4 components; assets `/marketing/how-it-works/`.
- Produces: `StepCard` for reuse on product pages.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1183:4564`. Also extract `faq how` (`288:15257`): its Q&A entries render as an FAQ section on this page (accordion arrives in Task 7 — if this task runs before Task 7, render entries with the same markup statically and adopt `FaqAccordion` when available; if after, use `FaqAccordion`).
- [ ] **Step 2: Failing test** — same shape as Task 4's spec: route `/how-it-works`, h1 candidate `How CompanyPension works` (confirm from extraction; eyebrow text is "The digital process"), CTA hrefs `/get-started` and/or `/calculator` per design.

```ts
// apps/vbl/e2e/marketing/how-it-works.spec.ts
import { test, expect } from '@playwright/test';

test('how-it-works renders hero and CTAs', async ({ page }) => {
  await page.goto('/how-it-works');
  await expect(page.locator('h1')).toContainText('How CompanyPension works');
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
});
```

- [ ] **Step 3: Run — expect FAIL (404).**
- [ ] **Step 4: Implement page** composing `Hero`, `StepCard` list (steps 01/02/03… exactly as in frame), FAQ section, `CtaBand`. Copy verbatim + client-feedback cross-check.
- [ ] **Step 5: Run — expect PASS.**
- [ ] **Step 6: Visual verification** — `get_screenshot` nodeId `1183:4564` vs local 1920px screenshot; then 375px check.
- [ ] **Step 7: Commit** — `git add` the three files, `git commit -m "feat(vbl): how-it-works marketing page"`.

---

### Task 6: Pricing page

**Files:**
- Create: `apps/vbl/app/(marketing)/pricing/page.tsx`
- Create: `apps/vbl/components/marketing/PriceCard.tsx`
- Test: `apps/vbl/e2e/marketing/pricing.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4; assets `/marketing/pricing/`.
- Produces: `PriceCard({ title, price, description, bullets, cta })`.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1187:3965`; also `faq pricing` (`303:2154`) as this page's FAQ section (same accordion note as Task 5). Pricing copy is sensitive: €199 deposit, 9.75% success fee, €199 minimum — reproduce exactly; cross-check `docs/client-feedback-status.md` (EUR wording, "free" ban).
- [ ] **Step 2: Failing test** — route `/pricing`, h1 candidate `Simple pricing for cash-outs and refunds` (eyebrow "Pricing"); assert the deposit figure:

```ts
// apps/vbl/e2e/marketing/pricing.spec.ts
import { test, expect } from '@playwright/test';

test('pricing renders hero and fee copy', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.locator('h1')).toContainText(
    'Simple pricing for cash-outs and refunds'
  );
  await expect(page.getByText('9.75%').first()).toBeVisible();
  await expect(page.getByText('€199').first()).toBeVisible();
});
```

- [ ] **Step 3: Run — FAIL (404).** **Step 4: Implement.** **Step 5: Run — PASS.**
- [ ] **Step 6: Visual verification** vs nodeId `1187:3965`; 375px check.
- [ ] **Step 7: Commit** — `git commit -m "feat(vbl): pricing marketing page"`.

---

### Task 7: FAQ page

**Files:**
- Create: `apps/vbl/app/(marketing)/faq/page.tsx`
- Create: `apps/vbl/components/marketing/FaqAccordion.tsx` (`'use client'`; props `{ items: { question: string; answer: React.ReactNode }[] }`)
- Test: `apps/vbl/e2e/marketing/faq.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `FaqAccordion` reused by How-it-works/Pricing FAQ sections and product pages.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1199:11597`. Capture every question and full answer verbatim (long task — the frame is question-dense). Confirm the h1 from the frame (the first text nodes in metadata were nav items, so the real headline must come from design context).
- [ ] **Step 2: Failing test:**

```ts
// apps/vbl/e2e/marketing/faq.spec.ts
import { test, expect } from '@playwright/test';

test('faq renders and accordion expands', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.locator('h1')).toBeVisible(); // exact text from extraction
  const first = page.getByRole('button').filter({ hasText: /\?/ }).first();
  await first.click();
  await expect(page.locator('[data-state="open"], [aria-expanded="true"]').first()).toBeVisible();
});
```

Replace the h1 assertion with the exact extracted headline before implementing.

- [ ] **Step 3: Run — FAIL.** **Step 4: Implement** — group questions by category exactly as the frame does; accordion collapsed by default, chevron rotation per design. **Step 5: Run — PASS.**
- [ ] **Step 6: Visual verification** vs nodeId `1199:11597`; 375px check.
- [ ] **Step 7: Commit** — `git commit -m "feat(vbl): FAQ marketing page with accordion"`.

---

### Task 8: Reviews page

**Files:**
- Create: `apps/vbl/app/(marketing)/reviews/page.tsx`
- Create: `apps/vbl/components/marketing/ReviewCard.tsx`
- Test: `apps/vbl/e2e/marketing/reviews.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4; assets `/marketing/reviews/`.
- Produces: `ReviewCard({ quote, name, meta, rating? })`.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1206:19952`. Reviewer names/quotes verbatim.
- [ ] **Step 2: Failing test** — route `/reviews`, h1 candidate `What users say about CompanyPension` (eyebrow "Reviews"):

```ts
// apps/vbl/e2e/marketing/reviews.spec.ts
import { test, expect } from '@playwright/test';

test('reviews renders hero and review cards', async ({ page }) => {
  await page.goto('/reviews');
  await expect(page.locator('h1')).toContainText(
    'What users say about CompanyPension'
  );
});
```

- [ ] **Step 3: Run — FAIL.** **Step 4: Implement.** **Step 5: Run — PASS.**
- [ ] **Step 6: Visual verification** vs nodeId `1206:19952`; 375px check.
- [ ] **Step 7: Commit** — `git commit -m "feat(vbl): reviews marketing page"`.

---

### Task 9: About us page

**Files:**
- Create: `apps/vbl/app/(marketing)/about/page.tsx`
- Test: `apps/vbl/e2e/marketing/about.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4; assets `/marketing/about/`.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1216:2457`.
- [ ] **Step 2: Failing test** — route `/about`, h1 candidate `Built to make German company pension claims easier` (eyebrow "About CompanyPension"):

```ts
// apps/vbl/e2e/marketing/about.spec.ts
import { test, expect } from '@playwright/test';

test('about renders hero', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('h1')).toContainText(
    'Built to make German company pension claims easier'
  );
});
```

- [ ] **Step 3: Run — FAIL.** **Step 4: Implement.** **Step 5: Run — PASS.**
- [ ] **Step 6: Visual verification** vs nodeId `1216:2457`; 375px check.
- [ ] **Step 7: Commit** — `git commit -m "feat(vbl): about marketing page"`.

---

### Task 10: VBL Refund page (establishes product-page building blocks)

**Files:**
- Create: `apps/vbl/app/(marketing)/vbl-refund/page.tsx`
- Create: `apps/vbl/components/marketing/ImportantCallout.tsx` (`{ children }` — the "Important" notice block appearing on all product pages)
- Create: `apps/vbl/components/marketing/ComparisonTable.tsx` (`{ columns: string[], rows: { label: string; values: React.ReactNode[] }[] }`)
- Test: `apps/vbl/e2e/marketing/vbl-refund.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4 components; assets `/marketing/vbl-refund/`.
- Produces: `ImportantCallout`, `ComparisonTable` — reused by Tasks 11–17.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1244:3166`. This is the template for all product pages: hero, "Important" callout, explainer sections, pricing-model comparison ("Why the Two Pricing Models Are Different"), FAQ section, CTA band. Extract h1 from design context (metadata's first texts were section headings, not the hero).
- [ ] **Step 2: Failing test:**

```ts
// apps/vbl/e2e/marketing/vbl-refund.spec.ts
import { test, expect } from '@playwright/test';

test('vbl-refund renders hero, callout and funnel CTAs', async ({ page }) => {
  await page.goto('/vbl-refund');
  await expect(page.locator('h1')).toBeVisible(); // exact text from extraction
  await expect(page.getByText('Important').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
});
```

Replace the h1 assertion with the exact extracted headline before implementing.

- [ ] **Step 3: Run — FAIL.** **Step 4: Implement** page + the two new shared components. **Step 5: Run — PASS.**
- [ ] **Step 6: Visual verification** vs nodeId `1244:3166`; 375px check.
- [ ] **Step 7: Commit** — `git commit -m "feat(vbl): VBL refund product page + product-page components"`.

---

### Tasks 11–17: Remaining product/SEO pages

Each task follows exactly the Task 10 recipe (extract → failing spec → implement → pass → visual verify → commit), consuming `ImportantCallout`/`ComparisonTable`/`FaqAccordion`/`StepCard` and its own assets folder. One task per page; parallelizable after Task 10. For each: spec file `apps/vbl/e2e/marketing/<slug>.spec.ts` with the same three assertions (exact extracted h1, Important callout if present in frame, `Start your claim` → `/get-started`); page file `apps/vbl/app/(marketing)/<slug>/page.tsx`; commit message `feat(vbl): <slug> marketing page`.

| Task | Route slug | Figma nodeId | Notes |
|---|---|---|---|
| 11 | `zvk-refund` | `1108:95` | ZVK spelled exactly |
| 12 | `vddb-vddko-refund` | `1080:5379` | covers both VddB and VddKO |
| 13 | `direktversicherung-cash-out` | `1118:7990` | cash-out flavor: primary CTA may target `/get-started`, calculator CTA absent — follow frame |
| 14 | `company-pension-cash-out` | `1254:10129` | bAV cash-out; note: refund calculator is NOT available for bAV cash-outs (Home frame states this) — do not add calculator CTA unless the frame has one |
| 15 | `cash-outs-and-refunds` | `1270:72` | overview page linking to the other product pages |
| 16 | `vbl-vs-drv` | `1153:62` | uses `ComparisonTable`; DRV = Deutsche Rentenversicherung |
| 17 | `company-pension-vs-drv` | `1366:5987` | comparison; CTAs "Check my company pension" and "See all cash-outs & refunds" — link the latter to `/cash-outs-and-refunds` |

---

### Task 18: Refund Calculator marketing page

**Files:**
- Create: `apps/vbl/app/(marketing)/refund-calculator/page.tsx`
- Test: `apps/vbl/e2e/marketing/refund-calculator.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4; assets `/marketing/refund-calculator/`.

- [ ] **Step 1: Extract design** — `get_design_context` nodeId `1338:72`. This is a **marketing page about the calculator**, not the calculator itself. Known copy: "Upload a pension document or enter what you know to receive a first estimate.", CTA "Upload my pension document". Both calculator CTAs link to the real app flow: upload-style CTA → `/calculator` (confirm against how `/calculator` vs `/calculator-entry-a` handle upload entry — pick the route that starts the matching flow and note the choice in the task report).
- [ ] **Step 2: Failing test:**

```ts
// apps/vbl/e2e/marketing/refund-calculator.spec.ts
import { test, expect } from '@playwright/test';

test('refund-calculator page renders and links into calculator flow', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(page.locator('h1')).toBeVisible(); // exact text from extraction
  await expect(
    page.getByRole('link', { name: /upload my pension document/i }).first()
  ).toHaveAttribute('href', /\/calculator/);
});
```

Replace the h1 assertion with the exact extracted headline before implementing.

- [ ] **Step 3: Run — FAIL.** **Step 4: Implement.** **Step 5: Run — PASS.**
- [ ] **Step 6: Visual verification** vs nodeId `1338:72`; 375px check.
- [ ] **Step 7: Commit** — `git commit -m "feat(vbl): refund calculator marketing page"`.

---

### Task 19: Final verification sweep

**Files:**
- Modify: only fixes to issues found.

- [ ] **Step 1: Full marketing test suite** — `npx playwright test e2e/marketing/` → all pass.
- [ ] **Step 2: Existing e2e regression** — `npx playwright test e2e/companypension-logo.spec.ts e2e/onboarding.spec.ts e2e/manual-calculator.spec.ts` → no NEW failures vs. a pre-change baseline (record baseline by checking which currently fail on `main` if unclear).
- [ ] **Step 3: Build** — from `apps/vbl`: `pnpm build` → succeeds.
- [ ] **Step 4: Copy audit** — one subagent re-reads `docs/client-feedback-status.md` end-to-end, greps the marketing pages for each governed wording item (e.g. `grep -ri "free" 'apps/vbl/app/(marketing)'` for the EUR-account item), and lists any Figma-vs-feedback conflicts found. Output: conflict list for the PR description (do not change copy without flagging).
- [ ] **Step 5: Visual pass** — screenshot every route at 1920px and 375px; fix anything materially off vs. Figma frames.
- [ ] **Step 6: Nav coverage** — every route reachable from nav/footer links; no dead links among the 15 routes (`Start your claim` and calculator CTAs excepted — they leave marketing).
- [ ] **Step 7: Commit fixes** — `git commit -m "fix(vbl): marketing pages verification sweep"` (only if fixes were made).

## Self-review notes

- Spec coverage: routes (Tasks 4–18 = all 15 routes; FAQ sub-frames folded into Tasks 5–6), routing change (Task 4), CTA wiring (each page task + Task 19 step 6), assets (Task 2), tokens (Task 1), responsive (each task's step 6 + Task 19 step 5), copy rules (Global Constraints + Task 19 step 4), testing (per-task specs + Task 19), execution model (Execution notes). No gaps found.
- H1 assertions for FAQ/product pages are intentionally "exact text from extraction" — the metadata scan could not reliably identify hero headlines for those frames; fabricating them would violate copy accuracy. The step instructs replacing the assertion with the exact Figma string before implementation.
