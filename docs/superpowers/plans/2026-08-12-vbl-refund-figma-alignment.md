# VBL Refund Figma Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/vbl-refund` match Figma frame `1244:3166` in structure, section treatments, imagery, cards, actions, and responsive layout.

**Architecture:** Keep the existing App Router page and semantic content. Make layout changes in the page, add one opt-in background tone to `ImportantCallout`, and add only the image layers exported from the approved Figma frame. Playwright owns the structural, colour, card-order, image-loading, size, and overflow contracts.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Next Image, Lucide React, Playwright.

---

## File map

- Modify `apps/vbl/e2e/marketing/vbl-refund.spec.ts`: page visual and structural regression contracts.
- Modify `apps/vbl/app/(marketing)/vbl-refund/page.tsx`: section order, bands, cards, split layouts, and imagery.
- Modify `apps/vbl/components/marketing/ImportantCallout.tsx`: opt-in white tone with the current neutral default.
- Create `apps/vbl/public/marketing/vbl-refund/vbl-refund-eligibility-background.png`.
- Create `apps/vbl/public/marketing/vbl-refund/vbl-refund-who-this-is-for.png`.
- Create `apps/vbl/public/marketing/vbl-refund/vbl-refund-eligible-background.png`.
- Create `apps/vbl/public/marketing/vbl-refund/vbl-refund-ineligible-background.png`.
- Modify `apps/vbl/public/marketing/manifest.json`: register the four VBL Refund assets.

### Task 1: Lock the Figma section structure and band colours

**Files:**

- Modify: `apps/vbl/e2e/marketing/vbl-refund.spec.ts`
- Modify: `apps/vbl/app/(marketing)/vbl-refund/page.tsx`
- Modify: `apps/vbl/components/marketing/ImportantCallout.tsx`

- [ ] **Step 1: Add the failing structure and colour test**

Append this test:

```ts
test('vbl-refund follows the approved Figma section structure and bands', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vbl-refund');

  await expect(
    page.getByRole('heading', {
      name: 'Made for people who no longer want to deal with German paperwork',
    })
  ).toHaveCount(0);

  const expectedBands = [
    ['Can I get a VBL refund?', 'rgb(243, 244, 244)'],
    ['Built for VBLklassik refunds', 'rgb(243, 244, 244)'],
    ['Worked in Germany’s public sector and paid into VBL?', 'rgb(255, 255, 255)'],
    ['When can I get a VBL refund?', 'rgb(249, 254, 245)'],
    ['When is a VBL refund not possible?', 'rgb(251, 244, 242)'],
    ['Do ZVK or other public-sector pension periods count?', 'rgb(243, 244, 244)'],
    ['What is the difference between VBL West and VBL East?', 'rgb(255, 255, 255)'],
    ['How much can I get back from VBL?', 'rgb(243, 244, 244)'],
    ['Your DRV refund does not include your VBL refund', 'rgb(255, 255, 255)'],
    ['A VBL refund is for people who have left public-sector employment', 'rgb(243, 244, 244)'],
    ['What documents do I need for a VBL refund?', 'rgb(243, 244, 244)'],
  ] as const;

  for (const [heading, colour] of expectedBands) {
    const section = page
      .getByRole('heading', { name: heading })
      .locator('xpath=ancestor::section[1]');
    await expect(section).toHaveCSS('background-color', colour);
  }

  const importantSections = page.getByRole('region', {
    name: 'Important information',
  });
  await expect(importantSections).toHaveCount(2);
  await expect(importantSections.nth(0)).toHaveCSS(
    'background-color',
    'rgb(243, 244, 244)'
  );
  await expect(importantSections.nth(1)).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
pnpm --filter vbl exec playwright test e2e/marketing/vbl-refund.spec.ts --project=chromium
```

Expected: FAIL because the extra section exists, several bands use the wrong colour, and both important regions are grey.

- [ ] **Step 3: Add an opt-in ImportantCallout tone**

Change the contract and section class while preserving the inner markup:

```tsx
export interface ImportantCalloutProps {
  children: ReactNode;
  tone?: 'neutral' | 'white';
}

export function ImportantCallout({
  children,
  tone = 'neutral',
}: ImportantCalloutProps) {
  return (
    <section
      role="region"
      aria-label="Important information"
      className={tone === 'white' ? 'bg-white' : 'bg-neutral-50'}
    >
      {/* retain the existing inner container, label and children */}
    </section>
  );
}
```

- [ ] **Step 4: Remove the non-Figma section and correct the bands**

Delete the complete “Made for people…” section. Apply these section classes in order:

```tsx
// Built for VBLklassik
<section className="bg-[#f3f4f4]">
// Who this is for
<section className="bg-white">
// Eligible situations
<section className="bg-[#f9fef5]">
// Ineligible situations
<section className="bg-[#fbf4f2]">
// ZVK periods
<section className="bg-[#f3f4f4]">
// West and East
<section className="bg-white">
// Refund amount
<section className="bg-[#f3f4f4]">
// VBL versus DRV
<section className="bg-white">
// Returning to public service
<section className="bg-[#f3f4f4]">
// Documents
<section className="bg-[#f3f4f4]">
```

Pass `tone="white"` only to the second `ImportantCallout`.

- [ ] **Step 5: Run the focused spec and verify GREEN**

Run the Step 2 command. Expected: all VBL Refund tests pass.

- [ ] **Step 6: Commit the structural repair**

```bash
git add apps/vbl/e2e/marketing/vbl-refund.spec.ts \
  'apps/vbl/app/(marketing)/vbl-refund/page.tsx' \
  apps/vbl/components/marketing/ImportantCallout.tsx
git commit -m "fix(marketing): align VBL refund section structure"
```

### Task 2: Restore split layouts, images, and pension-type cards

**Files:**

- Modify: `apps/vbl/e2e/marketing/vbl-refund.spec.ts`
- Modify: `apps/vbl/app/(marketing)/vbl-refund/page.tsx`
- Create: `apps/vbl/public/marketing/vbl-refund/*.png`
- Modify: `apps/vbl/public/marketing/manifest.json`

- [ ] **Step 1: Add the failing card and image contract**

```ts
test('vbl-refund renders the approved cards, split imagery and action sizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vbl-refund');

  const productSection = page
    .getByRole('heading', { name: 'VBLklassik or VBLextra?' })
    .locator('xpath=ancestor::section[1]');
  await expect(productSection.getByRole('heading', { level: 3 })).toHaveCount(3);
  await expect(
    productSection.getByRole('heading', {
      name: 'Not sure which one you had?',
      level: 3,
    })
  ).toBeVisible();

  const whoSection = page
    .getByRole('heading', {
      name: 'Worked in Germany’s public sector and paid into VBL?',
    })
    .locator('xpath=ancestor::section[1]');
  const whoImage = whoSection.getByRole('img', {
    name: 'Woman reviewing her VBL refund documents online',
  });
  await expect(whoImage).toBeVisible();
  await expect
    .poll(() => whoImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  for (const heading of [
    'Can I get a VBL refund?',
    'Worked in Germany’s public sector and paid into VBL?',
    'When can I get a VBL refund?',
    'When is a VBL refund not possible?',
  ]) {
    const section = page
      .getByRole('heading', { name: heading })
      .locator('xpath=ancestor::section[1]');
    const action = section.getByRole('link', {
      name: /start my vbl refund|check my vbl refund/i,
    });
    await expect(action).toHaveCSS('width', '564px');
    await expect(action).toHaveCSS('height', '63px');
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run Task 1 Step 2. Expected: FAIL because there are two cards, the image is absent, and three actions use intrinsic width.

- [ ] **Step 3: Export only the four approved image layers**

Export the image/fill layer—never the section text or complete frame—from these four sections in Figma frame `1244:3166`:

```text
Can I get a VBL refund?
Who this is for
When can I get a VBL refund?
When is a VBL refund not possible?
```

Save the PNGs under `apps/vbl/public/marketing/vbl-refund/` with the names in the file map. Add all four paths to `/vbl-refund` in `manifest.json`.

- [ ] **Step 4: Build the Figma split layouts**

Use a relative section and an absolutely positioned decorative `Image` for the pale eligibility bands. Keep content above the image with `relative z-10` and add the Figma pale overlay for text contrast.

Change “Who this is for” to:

```tsx
<div className="mt-12 grid items-stretch gap-8 lg:grid-cols-2">
  <div className="rounded-2xl border border-neutral-400 bg-white p-8">
    {/* existing checklist and InfoNote */}
  </div>
  <div className="relative min-h-[420px] overflow-hidden rounded-2xl">
    <Image
      src="/marketing/vbl-refund/vbl-refund-who-this-is-for.png"
      alt="Woman reviewing her VBL refund documents online"
      fill
      sizes="(min-width: 1024px) 50vw, 100vw"
      className="object-cover"
    />
  </div>
</div>
```

Apply `h-[63px] w-full justify-center sm:w-[564px]` to the audience, eligible, and ineligible actions. Preserve that class on the existing eligibility action.

- [ ] **Step 5: Render three equal product-type cards**

Use `lg:grid-cols-3`. Keep the first two cards and replace the current green note with:

```tsx
<FeatureCard
  icon={<Info className="h-7 w-7" aria-hidden="true" />}
  title="Not sure which one you had?"
  body="Upload your VBL letter or pension document when using the refund calculator or starting your refund claim. The document can help identify whether you had VBLklassik, VBLextra, or both."
/>
```

Do not repeat that same copy in a second note below the cards.

- [ ] **Step 6: Run the focused spec and verify GREEN**

Run Task 1 Step 2. Expected: all VBL Refund tests pass and the image reports a positive intrinsic width.

- [ ] **Step 7: Commit the layout and assets**

```bash
git add apps/vbl/e2e/marketing/vbl-refund.spec.ts \
  'apps/vbl/app/(marketing)/vbl-refund/page.tsx' \
  apps/vbl/public/marketing/vbl-refund \
  apps/vbl/public/marketing/manifest.json
git commit -m "fix(marketing): restore VBL refund Figma layouts"
```

### Task 3: Lock the approved eight-step process

**Files:**

- Modify: `apps/vbl/e2e/marketing/vbl-refund.spec.ts`

- [ ] **Step 1: Add the exact process-order contract**

```ts
test('vbl-refund preserves the approved eight-step process order', async ({
  page,
}) => {
  await page.goto('/vbl-refund');
  const section = page
    .getByRole('heading', { name: 'Start your VBL refund online' })
    .locator('xpath=ancestor::section[1]');

  await expect(section.getByRole('heading', { level: 3 })).toHaveText([
    'Upload your VBL document or answer guided questions',
    'Check whether a VBL refund may be possible',
    'Secure your VBL refund claim',
    'Complete your details',
    'Review, sign and submit online',
    'VBL review and follow-up',
    'Receive your approved refund directly',
    'Receive your refund directly',
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run Task 1 Step 2. Expected: PASS. Figma contains both similar final steps, so preserve its approved copy.

- [ ] **Step 3: Commit the process contract**

```bash
git add apps/vbl/e2e/marketing/vbl-refund.spec.ts
git commit -m "test(marketing): lock VBL refund process order"
```

### Task 4: Full responsive verification and PR update

- [ ] **Step 1: Format and run the complete marketing suite**

```bash
pnpm --filter vbl exec prettier --write \
  e2e/marketing/vbl-refund.spec.ts \
  'app/(marketing)/vbl-refund/page.tsx' \
  components/marketing/ImportantCallout.tsx \
  public/marketing/manifest.json
pnpm --filter vbl exec playwright test e2e/marketing --project=chromium
```

Expected: formatter exits 0 and all marketing tests pass.

- [ ] **Step 2: Run static and production-build checks**

```bash
pnpm --filter vbl lint
pnpm --filter vbl typecheck
pnpm --filter vbl build
```

If `typecheck` is not configured, run `pnpm --filter vbl exec tsc --noEmit`. Expected: all configured checks exit 0 and the build includes `/vbl-refund`.

- [ ] **Step 3: Run desktop and mobile browser QA**

Start the production build and inspect `/vbl-refund` at 1440 by 1000 and 390 by 844. At both sizes verify:

```ts
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Scroll the full page and confirm section order, four image loads, no clipped text, no overflow, three product cards, eight process cards, alternating bands, and full-width mobile actions. Compare desktop against Figma frame `1244:3166`.

- [ ] **Step 4: Review the diff and clean generated artifacts**

```bash
git diff --check origin/staging...HEAD
git status --short
git diff --stat origin/staging...HEAD
```

Remove only agent-created artifacts such as `.playwright-cli/`; preserve user files and unrelated worktree changes.

- [ ] **Step 5: Commit formatting changes if needed**

```bash
git add apps/vbl/e2e/marketing/vbl-refund.spec.ts \
  'apps/vbl/app/(marketing)/vbl-refund/page.tsx' \
  apps/vbl/components/marketing/ImportantCallout.tsx \
  apps/vbl/public/marketing/vbl-refund \
  apps/vbl/public/marketing/manifest.json
git diff --cached --quiet || git commit -m "chore(marketing): format VBL refund alignment"
```

- [ ] **Step 6: Push and verify the existing pull request**

```bash
git push origin kalib/marketing-qa-fixes
gh pr view 33 --json url,headRefName,isDraft,statusCheckRollup
```

Expected: the remote head matches local `HEAD`, PR #33 uses `kalib/marketing-qa-fixes`, and its checks are visible for the new commits.
