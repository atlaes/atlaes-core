# VBL Calculator Visual & UX Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `/calculator` flow into pixel, copy, and behavioural alignment with the 24 Figma Calculator frames stored at `apps/vbl/app_resource/Calculator/`.

**Architecture:** Surgical refinement of existing files in `apps/vbl/components/vbl/steps/` + `apps/vbl/hooks/useVBLCalculator.tsx`. No routing changes. No new top-level components. No new dependencies. One file (`PrivateOptionalDetails.tsx`) gets a full rewrite; everything else is in-place edit.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind, TypeScript, Playwright (e2e tests). No unit-test framework configured for the frontend — verification is via (1) typecheck + (2) manual smoke against the running dev server + (3) existing Playwright e2e suite green.

**Spec:** [`docs/superpowers/specs/2026-04-23-vbl-calculator-visual-alignment-design.md`](../specs/2026-04-23-vbl-calculator-visual-alignment-design.md)

**Prerequisites (already up from the session):**
- Docker up (`vbl-postgres`, `vbl-redis`).
- Backend on port 3001 (`pnpm --filter functions dev`).
- Frontend on port 3000 (`pnpm vbl:dev`).
- Verify with `curl -s http://localhost:3001/api/health` + opening `http://localhost:3000/calculator`.

**How to verify each task:**
- **Typecheck** after every edit: `pnpm --filter vbl lint 2>&1 | tail -10` (Next.js does a typecheck during `lint`). For deeper typing: `cd apps/vbl && npx tsc --noEmit 2>&1 | tail -5`.
- **Manual smoke**: reload `http://localhost:3000/calculator` and walk the relevant flow.
- **Figma reference**: compare the rendered screen to the specific PNG in `apps/vbl/app_resource/Calculator/`.

---

## File Structure

| File | Change type | Tasks |
|------|-------------|-------|
| `apps/vbl/hooks/useVBLCalculator.tsx` | Modify (type literals + one string compare) | 1 |
| `apps/vbl/components/vbl/steps/JobDetails.tsx` | Modify (sector options, copy, VddB/VddKO box, provider label) | 1, 2, 6 |
| `apps/vbl/components/vbl/steps/Results.tsx` | Modify (frame 13 rewrite, eligible section header, panel bgs, disclaimer, icons, copy) | 1, 2, 3, 5, 6 |
| `apps/vbl/components/vbl/steps/PrivateOptionalDetails.tsx` | **Rewrite** (radio-select + conditional reveal) | 4 |
| `apps/vbl/e2e/**/*.spec.ts` | Modify only where string assertions hit the renamed sector literals | 1 |

**Files explicitly untouched:**
- `apps/vbl/components/vbl/Sidebar.tsx` — audit flagged `(N/M)` on completed step as a delta, but `getJobProgressLabel` at line 58-69 already returns `(N/N)` when `isStepComplete(1)`. False positive from the audit.
- `apps/vbl/components/vbl/onboarding/**` — separate Figma scope (onboarding flow). Any sector-string references in onboarding code are coincidental and should NOT be touched in Task 1's enum refactor unless they break compilation.
- `packages/functions/**` — backend unchanged. `isStageOrchestraJob` already lowercases and does `includes('stage')`, tolerant to the new literal.

---

## Task 1: Sector-enum literal refactor (Q2, Q3)

Change the sector enum values to match Figma's casing/spacing. This task is first because later tasks do string comparisons that must use the new literals.

**Literals changing:**
- `"Public Sector"` → `"Public sector"` (lowercase `s`)
- `"Stage/Performing Arts"` → `"Stage / Performing Arts"` (added spaces around `/`)

**Unchanged:**
- `"Orchestra"`, `"Private sector"` — both already match Figma.
- `PRIVATE_PENSION_OPTIONS`'s `"Others"` — handled in Task 2, not here.

**Files:**
- Modify: `apps/vbl/hooks/useVBLCalculator.tsx` (type union + every `job.employmentType === "..."` compare)
- Modify: `apps/vbl/components/vbl/steps/JobDetails.tsx` (`EMPLOYMENT_TYPES` array + compare sites)
- Modify: `apps/vbl/components/vbl/steps/Results.tsx` (compare sites in `determineResultScenario`, `resolvePublicSide`, `handleStartClaim`)
- Modify: `apps/vbl/e2e/**/*.spec.ts` only if the string appears in test assertions. Run a grep to find any.

### Steps

- [ ] **Step 1: Grep for all old-literal sites so nothing is missed**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba
grep -rn "'Public Sector'" apps/vbl/ --include='*.ts' --include='*.tsx'
grep -rn '"Public Sector"' apps/vbl/ --include='*.ts' --include='*.tsx'
grep -rn "'Stage/Performing Arts'" apps/vbl/ --include='*.ts' --include='*.tsx'
grep -rn '"Stage/Performing Arts"' apps/vbl/ --include='*.ts' --include='*.tsx'
```

Expected: the locations listed in the spec (`useVBLCalculator.tsx`, `JobDetails.tsx`, `Results.tsx`). Playwright specs in `apps/vbl/e2e/` may also match — note which ones.

- [ ] **Step 2: Update `useVBLCalculator.tsx`**

In `apps/vbl/hooks/useVBLCalculator.tsx`, find the type union around line 15:

```ts
  employmentType: '' | 'Stage/Performing Arts' | 'Private sector' | 'Public Sector' | 'Orchestra';
```

Replace with:

```ts
  employmentType: '' | 'Stage / Performing Arts' | 'Private sector' | 'Public sector' | 'Orchestra';
```

Then in `canProceed()` around line 282:

```ts
      if (job.employmentType === 'Public Sector') {
```

Replace with:

```ts
      if (job.employmentType === 'Public sector') {
```

- [ ] **Step 3: Update `JobDetails.tsx`**

In `apps/vbl/components/vbl/steps/JobDetails.tsx`, find the `EMPLOYMENT_TYPES` array (search for `EMPLOYMENT_TYPES`):

```ts
const EMPLOYMENT_TYPES = [
  'Public Sector',
  'Stage/Performing Arts',
  'Orchestra',
  'Private sector',
];
```

Replace with:

```ts
const EMPLOYMENT_TYPES = [
  'Public sector',
  'Stage / Performing Arts',
  'Orchestra',
  'Private sector',
];
```

Then search within the file for any `=== 'Public Sector'`, `=== "Public Sector"`, `=== 'Stage/Performing Arts'`, `=== "Stage/Performing Arts"` and update them to the new literals. Variables you'll likely see: `isPublicSector`, `isStageOrOrchestra`. Example updates:

```ts
const isPublicSector = job.employmentType === 'Public sector';
const isStageOrOrchestra =
  job.employmentType === 'Stage / Performing Arts' ||
  job.employmentType === 'Orchestra';
```

- [ ] **Step 4: Update `Results.tsx`**

In `apps/vbl/components/vbl/steps/Results.tsx`, the `determineResultScenario`, `resolvePublicSide`, and `handleStartClaim` functions all compare `job.employmentType` to the literals. Replace:

```ts
job.employmentType === 'Public Sector'
```

with:

```ts
job.employmentType === 'Public sector'
```

And:

```ts
job.employmentType === 'Stage/Performing Arts'
```

with:

```ts
job.employmentType === 'Stage / Performing Arts'
```

Use find-and-replace across the file; there are multiple sites.

- [ ] **Step 5: Update e2e specs (if any)**

For each Playwright file the grep in Step 1 flagged, update the button/option text assertions to the new literal. Example: `page.getByText('Public Sector').click()` → `page.getByText('Public sector').click()`.

Note: if a file is in `apps/vbl/e2e/get-started/` and references `'Public Sector'` but the Get-Started flow is OUT OF SCOPE for this PR, the reference is probably to the onboarding pension-type selection UI (not the Calculator), which uses its own labels — do NOT rename those. **Only rename if the e2e test is walking the Calculator flow (e.g. `eligibility-public-sector.spec.ts` if it goes through `/calculator`).**

- [ ] **Step 6: Typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0. Any type error means a `=== "Public Sector"` site was missed.

- [ ] **Step 7: Manual smoke**

Reload `http://localhost:3000/calculator`. Click a job count, click Next, the Job Details screen should render the sector dropdown showing: `Public sector`, `Stage / Performing Arts`, `Orchestra`, `Private sector`. Select `Public sector` — the federal-state and company-pension dropdowns should appear below as before.

- [ ] **Step 8: Commit**

```bash
git add apps/vbl/hooks/useVBLCalculator.tsx apps/vbl/components/vbl/steps/JobDetails.tsx apps/vbl/components/vbl/steps/Results.tsx apps/vbl/e2e/
git commit -m "refactor(vbl-calc): align sector enum literals with Figma casing

- 'Public Sector' → 'Public sector'
- 'Stage/Performing Arts' → 'Stage / Performing Arts'"
```

---

## Task 2: Batch copy fixes (C1, C2, C3, C4)

Five small text changes. Single commit.

**Files:**
- Modify: `apps/vbl/components/vbl/steps/JobDetails.tsx`
- Modify: `apps/vbl/components/vbl/steps/Results.tsx`
- Modify: `apps/vbl/hooks/useVBLCalculator.tsx` (one compare site using `'Others'`)

### Steps

- [ ] **Step 1: Provider label "Company pension" → "Company pension provider" (C1)**

In `apps/vbl/components/vbl/steps/JobDetails.tsx`, find each `<Select>` that renders the company-pension dropdown and its matching read-only display for stage/orchestra. Search for `label="Company pension"` (three sites: public, private, stage read-only).

Each site changes its `label` prop:

```tsx
label="Company pension"
```

to:

```tsx
label="Company pension provider"
```

- [ ] **Step 2: "Others" → "Other (enter manually)" (C2)**

In `apps/vbl/components/vbl/steps/JobDetails.tsx` line 68, `PRIVATE_PENSION_OPTIONS`:

```ts
const PRIVATE_PENSION_OPTIONS = ['Allianz', 'Axa', 'BVV', 'Swiss Life', 'Others'];
```

Replace with:

```ts
const PRIVATE_PENSION_OPTIONS = [
  'Allianz',
  'Axa',
  'BVV',
  'Swiss Life',
  'Other (enter manually)',
];
```

Update the three comparison sites that check for `'Others'`:

- `apps/vbl/components/vbl/steps/JobDetails.tsx:244` — `const showOthersInput = isPrivateSector && job.companyPension === 'Others';` → change `'Others'` to `'Other (enter manually)'`.
- `apps/vbl/components/vbl/steps/JobDetails.tsx:278` — `} else if (value && value !== 'Others') {` → change `'Others'` to `'Other (enter manually)'`.
- `apps/vbl/hooks/useVBLCalculator.tsx:296` — `if (job.companyPension === 'Others') {` → change `'Others'` to `'Other (enter manually)'`.
- `apps/vbl/components/vbl/steps/Results.tsx:93` — `if (privateJobs.some((job) => job.companyPension === 'Others')) {` → change `'Others'` to `'Other (enter manually)'`.

- [ ] **Step 3: CTA "Proceed with review" → "Continue →" on `private_may_be_possible` (C3)**

In `apps/vbl/components/vbl/steps/Results.tsx` around line 839-851, find the render block for `scenario === 'private_may_be_possible'` (the section before `// Render: Private variant — "Individual assessment required"`).

The existing button:

```tsx
          <button
            onClick={() => handleStartClaim('private')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Proceed with review
            <ChevronRight className="w-4 h-4" />
          </button>
```

Replace with:

```tsx
          <button
            onClick={() => handleStartClaim('private')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
```

(Figma uses a text arrow "Continue →" but lucide-react's `ChevronRight` renders the same visual. Keep the icon — consistent with how the rest of the app renders "→".)

- [ ] **Step 4: Salary label standardisation (C4)**

In `apps/vbl/components/vbl/steps/JobDetails.tsx:351`, the current label is:

```tsx
label="Average monthly gross salary (&euro;)"
```

This already matches most Figma frames (3, 5). Frame 2's variant ("Average gross monthly salary during this job (€)") is a wording outlier. **No change** — but add a brief comment to document the decision:

```tsx
{/* Salary label matches Figma frames 3/5/7/8. Frame 2's variant wording
    is a design outlier and not canonical. */}
<NumberInput
  label="Average monthly gross salary (&euro;)"
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 6: Manual smoke**

Reload `/calculator`. Walk: 1 Job → Job Details → select `Private sector`. The provider dropdown should be labelled "Company pension provider" and its last option should read "Other (enter manually)". Selecting it should reveal the custom-name input. Continue through to Results, then trigger `private_may_be_possible` (answer `No` on DRV, fill any optional field). The CTA should read "Continue →".

- [ ] **Step 7: Commit**

```bash
git add apps/vbl/components/vbl/steps/JobDetails.tsx apps/vbl/components/vbl/steps/Results.tsx apps/vbl/hooks/useVBLCalculator.tsx
git commit -m "refactor(vbl-calc): align field labels and option copy with Figma

- Provider label: 'Company pension' → 'Company pension provider'
- Private provider option: 'Others' → 'Other (enter manually)'
- private_may_be_possible CTA: 'Proceed with review' → 'Continue'"
```

---

## Task 3: Frame 13 — `private_appears_unlikely` dead-end rewrite (B1)

Figma shows a dead-end screen with no paid-review conversion. Replace the current conversion CTA entirely.

**Files:**
- Modify: `apps/vbl/components/vbl/steps/Results.tsx` around lines 912-958 (`private_appears_unlikely` render block)

### Steps

- [ ] **Step 1: Replace the `private_appears_unlikely` render block**

In `apps/vbl/components/vbl/steps/Results.tsx`, find the block starting with:

```tsx
  // Render: Private variant — "A lump-sum settlement appears unlikely"
  // (Figma screen 13). Warning triangle, "Continue to paid review" CTA.
  if (scenario === 'private_appears_unlikely') {
```

Replace the entire `if (scenario === 'private_appears_unlikely') { … return ( … ); }` block with:

```tsx
  // Render: Private variant — "A lump-sum settlement is not possible"
  // (Figma screen 13). Dead-end: no paid-review conversion. Client-approved
  // product decision 2026-04-23 — spec: docs/superpowers/specs/2026-04-23-vbl-calculator-visual-alignment-design.md
  if (scenario === 'private_appears_unlikely') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            A lump-sum settlement is not possible
          </h1>
          <p className="text-gray-600 text-sm mb-8" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on the information you provided, your company pension does
            not appear to qualify for a lump-sum settlement under the
            applicable standard rules.
          </p>
          <button
            onClick={handleBackToCalculator}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 mb-4"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to calculator
          </button>
          <button
            onClick={handleReturnHome}
            className="text-sm text-gray-700 underline hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }
```

Changes from the old block:
- **Icon**: outer `bg-red-100` halo + inner `bg-red-500` circle with AlertCircle → single `bg-red-500` circle with `X` (same pattern as other error screens).
- **Title**: "A lump-sum settlement appears unlikely" → "A lump-sum settlement is not possible"
- **Body**: old two-part copy → new single paragraph matching Figma.
- **Disclaimer box**: removed (was the grey `bg-gray-50` panel).
- **Primary CTA**: "Continue to paid review" → "Back to calculator" (action: `handleBackToCalculator`).
- **Secondary link**: none → "Return to homepage" underlined link (action: `handleReturnHome`).

Note: `AlertCircle` is still imported at the top of the file but may now be unused. Check `apps/vbl/components/vbl/steps/Results.tsx:6` — `import { Loader2, AlertCircle, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';`. After this change, `AlertCircle` is still used by `stage_waiting` and `mixed_result` private badge renders — keep the import.

- [ ] **Step 2: Typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 3: Manual smoke against Figma frame 13**

Trigger the `private_appears_unlikely` scenario:
1. Open `/calculator`.
2. 1 Job → Job Details → `Private sector` → DRV question `Yes` → Next.
3. Results should render "A lump-sum settlement is not possible", single red-X icon, body copy, "Back to calculator" green button, "Return to homepage" text link.

Compare to `apps/vbl/app_resource/Calculator/Company Pension-13.png`.

- [ ] **Step 4: Commit**

```bash
git add apps/vbl/components/vbl/steps/Results.tsx
git commit -m "feat(vbl-calc): Frame 13 becomes dead-end per Figma

private_appears_unlikely no longer routes to paid review. Matches Figma
screen 13 — title changed, body rewritten, disclaimer box removed, icon
simplified, CTA changed to 'Back to calculator' with 'Return to homepage'
secondary link. Client-approved product decision 2026-04-23."
```

---

## Task 4: `PrivateOptionalDetails` rewrite (B2)

Full file rewrite. Radio-select for 3 options; conditional input reveal.

**Files:**
- Rewrite: `apps/vbl/components/vbl/steps/PrivateOptionalDetails.tsx`

### Steps

- [ ] **Step 1: Replace the entire file contents**

Open `apps/vbl/components/vbl/steps/PrivateOptionalDetails.tsx` and replace its contents with:

```tsx
'use client';

import React from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator, JobData } from '../../../hooks/useVBLCalculator';

// Which of the three radio options the user has picked on this sub-step.
// Synthesised from the data model: if projectedMonthlyPension is set, the
// user picked 'projected'; if capitalAmount is set, 'capital'; otherwise
// 'none' (including the literal "I can't find either" choice and the
// initial unselected state).
type StatementChoice = 'projected' | 'capital' | 'none';

interface RadioOption {
  value: StatementChoice;
  label: string;
}

const OPTIONS: RadioOption[] = [
  { value: 'projected', label: 'Projected monthly pension at retirement' },
  { value: 'capital', label: 'Capital amount / Capital benefit' },
  { value: 'none', label: "I can't find either" },
];

// Derive which radio is currently selected by looking at the stored fields.
// Treating either stored value as selection is safe because updateJob clears
// the other when switching radios (see handleChoiceChange below).
function deriveChoice(job: JobData): StatementChoice | null {
  if (job.projectedMonthlyPension) return 'projected';
  if (job.capitalAmount) return 'capital';
  return null; // null = unselected (not the same as 'none')
}

interface OptionalNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

// Numeric-only input — paste tolerates commas/dots, stripping to digits.
const OptionalNumberInput: React.FC<OptionalNumberInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all duration-200 text-gray-700"
      style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
    />
  </div>
);

// Private-sector optional sub-step. Figma screen 20: radio-select which
// statement value the user has, revealing a single input below. The
// "I can't find either" option reveals nothing and just lets the user
// proceed. State is still persisted via the existing JobData fields
// (projectedMonthlyPension, capitalAmount) — those are the only two
// the client asks about. contractValue and estimatedMonthlyContribution
// remain on the JobData type for backend compatibility but are not set
// by this screen.
export const PrivateOptionalDetails: React.FC = () => {
  const { formData, updateJob, currentJobIndex } = useVBLCalculator();
  const job = formData.jobs[currentJobIndex] || ({} as JobData);
  const [selection, setSelection] = React.useState<StatementChoice | null>(
    deriveChoice(job)
  );

  // When the user switches radios we clear the sibling field so that
  // deriveChoice remains deterministic across navigation (Next → Back).
  const handleChoiceChange = (choice: StatementChoice) => {
    setSelection(choice);
    if (choice === 'projected') {
      updateJob(currentJobIndex, { capitalAmount: '' });
    } else if (choice === 'capital') {
      updateJob(currentJobIndex, { projectedMonthlyPension: '' });
    } else {
      updateJob(currentJobIndex, {
        projectedMonthlyPension: '',
        capitalAmount: '',
      });
    }
  };

  return (
    <StepContainer title="What does your pension statement show?">
      <div className="space-y-6">
        <div role="radiogroup" className="space-y-3">
          {OPTIONS.map((option) => {
            const isSelected = selection === option.value;
            return (
              <label
                key={option.value}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-[#9FE870] bg-[#9FE870]/10'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="statementChoice"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => handleChoiceChange(option.value)}
                  className="w-4 h-4 accent-[#9FE870]"
                />
                <span
                  className="text-sm text-gray-800"
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                >
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>

        {selection === 'projected' && (
          <OptionalNumberInput
            label="Enter Projected monthly pension at retirement"
            value={job.projectedMonthlyPension || ''}
            onChange={(v) => updateJob(currentJobIndex, { projectedMonthlyPension: v })}
            placeholder="E.g., 45"
          />
        )}

        {selection === 'capital' && (
          <OptionalNumberInput
            label="Enter Capital amount / Capital benefit"
            value={job.capitalAmount || ''}
            onChange={(v) => updateJob(currentJobIndex, { capitalAmount: v })}
            placeholder="E.g., 6500"
          />
        )}
      </div>
    </StepContainer>
  );
};

export default PrivateOptionalDetails;
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 3: Manual smoke against Figma frame 20**

1. Open `/calculator`. 1 Job → Job Details → `Private sector` → pick provider → DRV question `No` → Next.
2. The optional sub-step should render with title "What does your pension statement show?" and three radio options:
   - "Projected monthly pension at retirement"
   - "Capital amount / Capital benefit"
   - "I can't find either"
3. Selecting option 1 reveals a single numeric input "Enter Projected monthly pension at retirement".
4. Switching to option 2 hides that input and reveals "Enter Capital amount / Capital benefit"; the previous value clears.
5. Selecting "I can't find either" hides both inputs; Next remains clickable.
6. Pressing Next moves to Results. Pressing Back returns to the DRV question.

Compare to `apps/vbl/app_resource/Calculator/Company Pension-20.png`.

- [ ] **Step 4: Commit**

```bash
git add apps/vbl/components/vbl/steps/PrivateOptionalDetails.tsx
git commit -m "feat(vbl-calc): rewrite PrivateOptionalDetails as radio-select flow

Frame 20: user picks which statement value they have (projected monthly,
capital amount, or 'I can't find either'); only the chosen input is
revealed. Title corrected to 'What does your pension statement show?'.
contractValue and estimatedMonthlyContribution remain on the JobData
type for backend compatibility but are no longer set by this screen."
```

---

## Task 5: Eligible-result section header + info banner (B3, V9)

Add the section header above the refund box + an always-visible info banner (C7). Keep the existing transfer banner as a secondary banner for the multi-provider case.

**Files:**
- Modify: `apps/vbl/components/vbl/steps/Results.tsx` around lines 1016-1105 (the `eligible` render, i.e. the default return after all other scenarios).

### Steps

- [ ] **Step 1: Add the section header block**

In `apps/vbl/components/vbl/steps/Results.tsx`, find the eligible render block (starts near line 1017 with `// Render: Eligible — total amount only (Screen 14)` comment and the returned `<div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">`).

After the title section (`<div className="text-center mb-8 pb-6 border-b border-gray-100">...</div>`) and BEFORE the Total Refund Box (`<div className="rounded-xl p-6 mb-6 flex items-center justify-center gap-3" style={{ backgroundColor: 'var(--vbl-accent-lime)', ...}}>`), insert:

```tsx
        {/* Section header — matches Figma frame 23 */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>
          <p
            className="font-semibold text-gray-900"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Public / Stage / Orchestra refund claim
          </p>
        </div>
```

- [ ] **Step 2: Add the always-visible info banner + keep the transfer banner conditional**

Still in the eligible render block, after the Total Refund Box and BEFORE the existing `{showTransferredBalancesInfo && (...)}` block, insert a new always-visible banner:

```tsx
        {/* Always-visible info note per Figma frame 23 */}
        <div className="flex items-start gap-3 rounded-xl p-4 mb-4 border border-gray-200">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: 'var(--vbl-sidebar-dark)' }}
          >
            <span className="text-xs font-bold text-white">i</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            This estimate only includes the company pensions that appear
            refundable based on the information provided. One or more other
            pensions are not included.
          </p>
        </div>
```

The existing `{showTransferredBalancesInfo && (...)}` block REMAINS untouched directly below this new block — it's the secondary banner for the multi-provider case. Both banners can render together.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 4: Manual smoke against Figma frames 9, 10, 23**

Trigger the eligible scenario (single public-sector job, 30 months, Bavaria, VBL, VBLklassik, salary 4000):
1. Results renders the title block.
2. Below it: institution icon + "Public / Stage / Orchestra refund claim" label.
3. Below that: green refund box with total.
4. Below that: the new info banner ("This estimate only includes...").
5. No transfer banner (only 1 job).

Now change inputs to 2 public jobs with different providers (e.g. VBL and ZVK Hannover). Results should show BOTH the new info banner AND the existing transfer banner. Compare to `Company Pension-10.png`.

- [ ] **Step 5: Commit**

```bash
git add apps/vbl/components/vbl/steps/Results.tsx
git commit -m "feat(vbl-calc): add section header and info banner to eligible result

Frame 23: 'Public / Stage / Orchestra refund claim' label with
institution icon above the refund box. New always-visible info banner
clarifying that only refundable pensions are included. Existing
multi-provider transfer banner retained as secondary (conditional)."
```

---

## Task 6: Remaining visual fixes (V1, V2, V3, V4, V5)

Batch the remaining style changes.

**Files:**
- Modify: `apps/vbl/components/vbl/steps/Results.tsx` (V1, V3, V5 for non-Frame-13 error screens)
- Modify: `apps/vbl/components/vbl/steps/JobDetails.tsx` (V4)

### Steps

- [ ] **Step 1: V1 — `private_may_be_possible` panel background (light green tint)**

In `apps/vbl/components/vbl/steps/Results.tsx`, find the `private_may_be_possible` render block (~line 809). The outer wrapper currently has `bg-white`:

```tsx
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
```

Replace the className for THIS render block only with:

```tsx
    return (
      <div
        className="flex-1 p-8 flex flex-col justify-center rounded-2xl shadow-lg"
        style={{ backgroundColor: 'rgba(159, 232, 112, 0.12)' }}
      >
```

- [ ] **Step 2: V3 — Frame 12 disclaimer box restyle**

In the same `private_may_be_possible` block, find the inner disclaimer panel:

```tsx
          <div className="rounded-xl p-4 mb-8 border border-gray-200 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              Final eligibility depends on confirmation by the pension provider and the applicable scheme rules.
            </p>
          </div>
```

Replace with:

```tsx
          <div
            className="rounded-xl p-4 mb-8"
            style={{ backgroundColor: 'rgba(159, 232, 112, 0.25)' }}
          >
            <p className="text-sm font-semibold text-gray-800">
              Final eligibility depends on confirmation by the pension provider and the applicable scheme rules.
            </p>
          </div>
```

Changes: remove `border border-gray-200 bg-gray-50`; apply lime tint via inline style.

- [ ] **Step 3: V2 — `private_appears_unlikely` panel background** (already handled in Task 3 as white — reconsidered)

**Status:** Task 3 left `private_appears_unlikely` on `bg-white` (matching frames 14, 15 which are also white-panel error screens). The "light pink/red tint" described in the spec was auditor-subjective and the Figma PNG color difference is marginal. Skip V2 — no change in this task.

- [ ] **Step 4: V4 — VddB/VddKO read-only box neutral grey**

In `apps/vbl/components/vbl/steps/JobDetails.tsx`, find the stage/orchestra read-only provider display. Search for `backgroundColor: 'rgba(159, 232, 112, 0.2)'` — this is the lime-tinted read-only box.

Replace the inline style on THAT specific element (the stage/orchestra provider read-only display):

```tsx
style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
```

with:

```tsx
style={{ backgroundColor: '#F3F4F6' }}
```

If the search returns multiple hits, the one to change is the provider read-only display — it's inside the stage-or-orchestra conditional block (near `isStageOrOrchestra`). Other lime-tinted elements (info banners, etc.) should NOT change.

- [ ] **Step 5: V5 — Single-solid red icon on error screens**

In `apps/vbl/components/vbl/steps/Results.tsx`, three render blocks share the two-ring red icon pattern:

**a) `not_eligible_vesting` (VBLextra), ~line 444:**

```tsx
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-7 h-7 text-white" />
            </div>
          </div>
```

Replace with:

```tsx
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-white" />
          </div>
```

**b) `stage_too_short`, ~line 500:** same pattern — replace identically.

**c) `vested`, ~line 964:** same pattern — replace identically.

(Task 3 already updated `private_appears_unlikely` to this single-solid pattern. Do not touch it again.)

- [ ] **Step 6: Typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 7: Manual smoke against Figma frames 4, 11/12, 14, 15, 3/5**

1. `private_may_be_possible` (Private sector + DRV `No` + fill a financial field) — panel is light-green tinted; disclaimer box is lime, no border. Compare to `Company Pension-11.png` / `-12.png`.
2. `not_eligible_vesting` (VBLextra) — single solid red circle, no halo. Compare to `Company Pension-4.png`.
3. `vested` (60+ months) — single solid red circle. Compare to `Company Pension-14.png`.
4. `stage_too_short` (Stage job < 12 months) — single solid red circle. Compare to `Company Pension-15.png`.
5. Stage or Orchestra job details — read-only provider box is neutral grey. Compare to `Company Pension-3.png` / `-5.png`.

- [ ] **Step 8: Commit**

```bash
git add apps/vbl/components/vbl/steps/Results.tsx apps/vbl/components/vbl/steps/JobDetails.tsx
git commit -m "style(vbl-calc): align panel backgrounds, disclaimer, icons with Figma

- private_may_be_possible: panel bg white → light green tint
- private_may_be_possible disclaimer: grey-border → lime tint, no border
- Stage/Orchestra read-only provider box: lime tint → neutral grey
- Error screens (not_eligible_vesting, stage_too_short, vested): red icon
  simplified from two-ring halo to single solid circle"
```

---

## Task 7: Verification + PR prep

No code changes. Smoke the complete flow, run the existing test/lint suites, prepare PR.

**Files:** None.

### Steps

- [ ] **Step 1: Backend Vitest regression (Part 1 safety net)**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/packages/functions
pnpm vitest run src/services/vbl-calculation.test.ts 2>&1 | tail -5
```

Expected: 50 passed. Part 1's logic tests must still be green.

- [ ] **Step 2: Frontend typecheck**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx tsc --noEmit 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 3: Frontend lint**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba
pnpm --filter vbl lint 2>&1 | tail -10
```

Expected: exit code 0 (or only warnings, no new errors).

- [ ] **Step 4: Playwright smoke** (if the Calculator has e2e coverage and the dev server is responsive)

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba/apps/vbl
npx playwright test e2e/get-started/eligibility-public-sector.spec.ts --reporter=line 2>&1 | tail -10
```

If this test hits the `/calculator` flow and relied on the old `'Public Sector'` literal, it should have been updated in Task 1. If it still fails, investigate which literal site was missed.

If the test is flaky or fails on infrastructure (no dev server, etc.), skip and rely on manual smoke.

- [ ] **Step 5: Walk the whole calculator once**

Open `http://localhost:3000/calculator`. Do a full walk:

1. **JobsCount**: pick 2 jobs. Next enabled.
2. **JobDetails job 1**: Public sector → Bavaria → VBL → VBLklassik → dates → salary. Next enabled.
3. **JobDetails job 2**: Stage / Performing Arts → Bavaria → dates → salary. Confirm read-only VddB box is grey (not lime). Next enabled.
4. **Results**: should render Eligible with the section header + info banner. Copy looks clean.

Then try an ineligible case (one job, Private sector, DRV `Yes`, provider Allianz, salary 4000, 30 months) → `private_appears_unlikely` renders as dead-end with "Back to calculator" and "Return to homepage".

Then try private `No` with projected pension filled → `private_may_be_possible` renders with light-green panel and CTA "Continue".

Then try 65+ months public sector → `vested` renders with single red solid icon.

- [ ] **Step 6: Summarize commits for the PR**

```bash
cd /Users/kael/Code/freelancing/Atlaes/.claude/worktrees/awesome-hodgkin-1eb9ba
git log --oneline main..HEAD
```

Expected: Part 1's 5 commits (already in PR #12) PLUS Part 2's 6 task commits. Part 2 PR should target `staging` and be opened as a **separate PR** — do not push to PR #12's branch; create a new branch off main for Part 2.

- [ ] **Step 7: STOP — hand back to human**

Do not push or open a PR automatically. Summarize status and wait for the human to authorise push + PR creation.

---

## Self-Review Complete

Checked against spec:
- ✅ B1 Frame 13 dead-end → Task 3
- ✅ B2 PrivateOptionalDetails rewrite → Task 4
- ✅ B3 eligible screen section header + info banner → Task 5
- ✅ C1 provider label → Task 2
- ✅ C2 "Other (enter manually)" → Task 2
- ✅ C3 private_may_be_possible CTA → Task 2
- ✅ C4 salary label decision → Task 2 (comment documents non-change)
- ✅ C8 badge capitalisation (keep as-is, spec decision) — no task needed, spec documents decision
- ✅ Q2/Q3 enum refactor → Task 1
- ✅ V1 panel bg → Task 6
- ✅ V2 `private_appears_unlikely` panel bg — Task 6 explicitly skips; documented in-plan
- ✅ V3 Frame 12 disclaimer → Task 6
- ✅ V4 VddB/VddKO box → Task 6
- ✅ V5 red icon on 4 error screens → Task 3 (frame 13) + Task 6 (3 others)
- ✅ V7/V8 non-changes documented in spec
- ✅ V9 section label → Task 5
- ✅ Sidebar (N/M) — confirmed as false positive (code already correct), documented in File Structure section
- ✅ Regression protection → Task 7
