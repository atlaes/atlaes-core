# Marketing Tester Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Correct every still-reproducible Company Pension marketing-page discrepancy confirmed in the August tester document and Figma review.

**Architecture:** Keep the existing Next.js App Router pages and shared marketing components. Add explicit responsive size contracts to page-local links, reuse the shared StepCard dark tone for product-page bands, and add page-local dark checklist variants matching the existing Cash-outs & Refunds implementation. Lock the contracts with the existing Playwright marketing suite before changing page code.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Playwright.

---

## File map

- apps/vbl/e2e/marketing/refund-calculator.spec.ts: calculator content, layout, and CTA contracts.
- apps/vbl/e2e/marketing/about.spec.ts: About number colour and supported-claim CTA size.
- apps/vbl/e2e/marketing/reviews.spec.ts: review-band CTA dimensions.
- apps/vbl/e2e/marketing/pricing.spec.ts: example-note dimensions.
- apps/vbl/e2e/marketing/vbl-refund.spec.ts: VBL eligibility CTA dimensions.
- apps/vbl/e2e/marketing/zvk-refund.spec.ts: ZVK dark bands and lazy illustration loading.
- apps/vbl/e2e/marketing/direktversicherung-cash-out.spec.ts: Direktversicherung dark bands.
- apps/vbl/e2e/marketing/company-pension-cash-out.spec.ts: bAV dark bands.
- The matching page.tsx files under apps/vbl/app/(marketing)/ own the visual implementations.

### Task 1: Refund Calculator regression contract

**Files:**
- Modify: apps/vbl/e2e/marketing/refund-calculator.spec.ts
- Modify: apps/vbl/app/(marketing)/refund-calculator/page.tsx

- [ ] **Step 1: Write the failing calculator tests**

Add a 1440 by 1000 test that asserts both rejected headings have count zero. Then assert:

- “Your next step” is 228 by 40.
- “Start my refund” in that section is 369 by 63.
- Both pricing actions are 355 by 63.
- The direct-payout paragraph is visible beneath the pricing card.

Use the nearest section ancestor for duplicate action names:

~~~ts
const section = page
  .getByRole('heading', {
    name: 'Like the estimate? Continue with your refund online.',
  })
  .locator('xpath=ancestor::section[1]');
const action = section.getByRole('link', { name: 'Start my refund' });
await expect(action).toHaveCSS('width', '369px');
await expect(action).toHaveCSS('height', '63px');
~~~

- [ ] **Step 2: Run the focused test and verify RED**

Run:

~~~bash
pnpm --filter vbl exec playwright test e2e/marketing/refund-calculator.spec.ts --project=chromium
~~~

Expected: FAIL because the rejected headings still exist and the measured elements still use intrinsic dimensions.

- [ ] **Step 3: Implement the minimal calculator repair**

Delete the complete “Made for people…” section and its now-unused Image import. Delete the late ImportantCallout and its import. Extend page-local ArrowLink with size values default, continuation, and pricing:

~~~ts
const sizes = {
  default: '',
  continuation: 'h-[63px] w-full justify-center sm:w-[369px]',
  pricing: 'h-[63px] w-full justify-center sm:w-[355px]',
} as const;
~~~

Apply sm:w-[228px] to the “Your next step” pill. Remove the direct-payout sentence from CheckList, close the translucent card after the abandoned-application item, and render the existing direct-payout sentence below the card. Place both pricing actions in a sibling flex container after that paragraph.

- [ ] **Step 4: Run the calculator spec and verify GREEN**

Run the Step 2 command. Expected: all calculator marketing tests pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/vbl/e2e/marketing/refund-calculator.spec.ts 'apps/vbl/app/(marketing)/refund-calculator/page.tsx'
git commit -m "fix(marketing): align refund calculator with tester layout"
~~~

### Task 2: Exact dimensions on About, Reviews, Pricing, and VBL Refund

**Files:**
- Modify: apps/vbl/e2e/marketing/about.spec.ts
- Modify: apps/vbl/e2e/marketing/reviews.spec.ts
- Modify: apps/vbl/e2e/marketing/pricing.spec.ts
- Modify: apps/vbl/e2e/marketing/vbl-refund.spec.ts
- Modify: the four matching page.tsx files.

- [ ] **Step 1: Add failing desktop size and colour tests**

At 1440 pixels wide, assert:

- About: the first NumberCard and PrincipleCard number both have rgb(92, 92, 92); the supported-claim card’s exact “Start your claim” link is 461 by 63.
- Reviews: “See how it works” and “View pricing” inside “Built for online pension applications” are each 345 by 63.
- Pricing: the note beginning “These examples are for illustration only” is 951 by 46.
- VBL Refund: “Start My VBL Refund” inside “Can I get a VBL refund?” is 564 by 63.

Use exact role/text selectors and nearest section ancestors to avoid matching hero or closing actions.

- [ ] **Step 2: Run all four specs and verify RED**

~~~bash
pnpm --filter vbl exec playwright test e2e/marketing/about.spec.ts e2e/marketing/reviews.spec.ts e2e/marketing/pricing.spec.ts e2e/marketing/vbl-refund.spec.ts --project=chromium
~~~

Expected: the new exact assertions fail with current intrinsic sizes and rgb(147, 148, 148) number colour.

- [ ] **Step 3: Apply responsive exact-size classes**

Use h-[63px] w-full items-center justify-center plus sm:w-[461px], sm:w-[345px], or sm:w-[564px] on the targeted actions. Change both About number classes to text-[#5c5c5c]. Constrain the Pricing note’s visible InfoNote container with mx-auto min-h-[46px] w-full max-w-[951px].

- [ ] **Step 4: Run all four specs and verify GREEN**

Run the Step 2 command. Expected: all four specs pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/vbl/e2e/marketing/{about,reviews,pricing,vbl-refund}.spec.ts 'apps/vbl/app/(marketing)/about/page.tsx' 'apps/vbl/app/(marketing)/reviews/page.tsx' 'apps/vbl/app/(marketing)/pricing/page.tsx' 'apps/vbl/app/(marketing)/vbl-refund/page.tsx'
git commit -m "fix(marketing): apply tester CTA and note dimensions"
~~~

### Task 3: Product-page dark process and pricing bands

**Files:**
- Modify: apps/vbl/e2e/marketing/zvk-refund.spec.ts
- Modify: apps/vbl/e2e/marketing/direktversicherung-cash-out.spec.ts
- Modify: apps/vbl/e2e/marketing/company-pension-cash-out.spec.ts
- Modify: the three matching page.tsx files.

- [ ] **Step 1: Add failing band and lazy-image tests**

For each process/pricing heading, locate the nearest section and assert background-color rgb(22, 51, 0):

- ZVK: “A guided online process for ZVK refunds” and “Pricing for ZVK refunds”.
- Direktversicherung: “How the Direktversicherung cash-out process works” and “Pricing for Direktversicherung cash-outs”.
- Company Pension: “Complete your bAV cash-out online in five steps” and “Pricing for bAV cash-outs”.

Add this ZVK guard so the lazy illustrations cannot be removed as “empty”:

~~~ts
const illustration = page.getByRole('img', {
  name: /ZVK Refund.*bAV Cash-Out.*different process/i,
});
await illustration.scrollIntoViewIfNeeded();
await expect
  .poll(() =>
    illustration.evaluate((image: HTMLImageElement) => image.naturalWidth)
  )
  .toBeGreaterThan(0);
~~~

- [ ] **Step 2: Run the three product specs and verify RED**

~~~bash
pnpm --filter vbl exec playwright test e2e/marketing/zvk-refund.spec.ts e2e/marketing/direktversicherung-cash-out.spec.ts e2e/marketing/company-pension-cash-out.spec.ts --project=chromium
~~~

Expected: all six band assertions fail because the sections are white or rgb(243, 244, 244); the lazy-image guard passes.

- [ ] **Step 3: Add the established dark checklist treatment**

On each page, extend page-local CheckList with tone light/dark. Copy the existing cash-outs-and-refunds treatment: text-white/85, an accent disc, and a brand Check icon for dark lists; preserve the current SVG bullet for light lists.

- [ ] **Step 4: Flip the process sections**

Change each process section to bg-brand text-white, change heading wrappers to white text, apply tone="dark" to every StepCard, and use white-muted text for process footnotes. Keep ZVK’s decorative ribbon.

- [ ] **Step 5: Flip the pricing sections**

Change each pricing section to bg-brand text-white. Use white/accent heading treatment, translucent border-white/20 bg-black/20 cards, text-white/75 body copy, dark checklists, and white-outline secondary actions. Keep primary accent actions.

- [ ] **Step 6: Run the three product specs and verify GREEN**

Run the Step 2 command. Expected: all product specs pass, including the ZVK lazy-image guard.

- [ ] **Step 7: Commit**

~~~bash
git add apps/vbl/e2e/marketing/{zvk-refund,direktversicherung-cash-out,company-pension-cash-out}.spec.ts 'apps/vbl/app/(marketing)/zvk-refund/page.tsx' 'apps/vbl/app/(marketing)/direktversicherung-cash-out/page.tsx' 'apps/vbl/app/(marketing)/company-pension-cash-out/page.tsx'
git commit -m "fix(marketing): restore product-page dark bands"
~~~

### Task 4: Full verification and visual QA

**Files:**
- Verify only; no planned source edits.

- [ ] **Step 1: Run the complete marketing suite**

~~~bash
pnpm --filter vbl exec playwright test e2e/marketing --project=chromium
~~~

Expected: all marketing tests pass.

- [ ] **Step 2: Run VBL lint and production build**

~~~bash
pnpm --filter vbl lint
pnpm --filter vbl build
~~~

Expected: both commands exit 0 and the build includes all affected routes.

- [ ] **Step 3: Run desktop and mobile browser QA**

Start the production server and inspect the eight affected routes at 1440 by 1000 and 390 by 844. Confirm no horizontal overflow, clipped text, unloaded images after scrolling, or incorrect process/pricing band colours.

- [ ] **Step 4: Review the final diff**

~~~bash
git diff --check origin/staging...HEAD
git status --short
git log --oneline origin/staging..HEAD
~~~

Expected: no whitespace errors, only scoped marketing files and design/plan documents changed, and the worktree is clean after commits.

