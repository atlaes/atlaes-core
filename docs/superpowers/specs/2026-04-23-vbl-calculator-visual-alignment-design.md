# VBL Calculator — Visual & UX Alignment with Figma (Design)

**Date:** 2026-04-23
**Scope:** Part 2 of 2 — visual, UX, and copy alignment with the 24 Figma Calculator frames. Part 1 (backend vesting logic) shipped as [atlaes-core#12](https://github.com/atlaes/core/pull/12).
**Status:** Approved for implementation planning.
**Audit sources:** `apps/vbl/app_resource/Calculator/Company Pension{,-1..-23}.png` (24 frames).

## Goal

Bring the `/calculator` flow into pixel, copy, and behavioural alignment with the Figma Calculator frames. Surgical refinement of existing files in `apps/vbl/components/vbl/steps/`, `Sidebar.tsx`, and `hooks/useVBLCalculator.tsx`. No routing changes, no new top-level components.

## Scope

### In scope

- `apps/vbl/components/vbl/steps/JobDetails.tsx` — label copy, sector option casing, dropdown ordering, VddB/VddKO read-only box styling
- `apps/vbl/components/vbl/steps/PrivateOptionalDetails.tsx` — full rewrite: radio-selection flow revealing one conditional input
- `apps/vbl/components/vbl/steps/Results.tsx` — frame 13 behavioural change, panel backgrounds, disclaimer box styling, icon treatments, section labels, info banner, number format, CTA widths
- `apps/vbl/components/vbl/Sidebar.tsx` — sub-label format for completed steps (minor)
- `apps/vbl/hooks/useVBLCalculator.tsx` — `employmentType` enum literal values (knock-on from sector option casing)
- `packages/functions/src/services/vbl-calculation-simple.ts` — only if enum literals change; adjust mapping in `isStageOrchestraJob` / route handler to tolerate both old and new literal (1-release compatibility window)

### Explicitly out of scope

- **Custom dropdown component** replacing native `<select>` — meaningful engineering build (keyboard/accessibility/styling). Defer to Part 3.
- `get-started/`, `qualification/`, onboarding flows — separate Figma folders, not this PR.
- Dead-code cleanup in `vbl-calculation.ts` (legacy `calculatePre2018Refund` / `calculatePost2018Refund`) — still deferred from Part 1.
- Open question items the client defers on during review — accept feedback in review rather than re-scoping this PR.

## Changes

### 1. Behavioural

**B1. Frame 13 — `private_appears_unlikely` becomes a dead-end ([Results.tsx:912-958](apps/vbl/components/vbl/steps/Results.tsx:912))**

Replace the current "Continue to paid review" conversion CTA with Figma's dead-end pattern:
- Title: `"A lump-sum settlement is not possible"` (was `"A lump-sum settlement appears unlikely"`)
- Body: `"Based on the information you provided, your company pension does not appear to qualify for a lump-sum settlement under the applicable standard rules."`
- Remove the grey disclaimer box entirely.
- Primary CTA: `"← Back to calculator"` (lime, full-width) → `handleBackToCalculator()`.
- Secondary link: `"Return to homepage"` underlined → `handleReturnHome()`.
- Icon: replace the dark-circle + lime `AlertCircle` with the same red-circle + white `✕` used on other error screens.

Product rationale (explicit client decision 2026-04-23): the paid-review funnel is removed for this segment per Figma.

**B2. Frame 20 — `PrivateOptionalDetails` full rewrite**

Current: 4 unconditional number inputs (projected monthly, capital amount, contract value, monthly contribution), wrong screen title ("Job N of M").

New: radio-selection flow as designed.

Screen title: `"What does your pension statement show?"`
No subtitle.
Radio group (single-select), three options:
1. `"Projected monthly pension at retirement"` → reveals a single NumberInput labelled `"Enter Projected monthly pension at retirement"`; stores to `projectedMonthlyPension`.
2. `"Capital amount / Capital benefit"` → reveals a single NumberInput labelled `"Enter Capital amount / Capital benefit"`; stores to `capitalAmount`.
3. `"I can't find either"` → no reveal; all four fields stay empty; user can proceed.

Existing `contractValue` and `estimatedMonthlyContribution` fields on `JobData` become unused by this screen. Do not remove them from the type or payload to avoid invalidating existing `calculator-selection` sessionStorage (keep as optional fields; backend already handles missing/empty).

`canProceed()` in `useVBLCalculator.tsx` for `currentJobSubStep === 'optional'` stays `true` (always allow continue), matching both the current behaviour and the "I can't find either" path.

**B3. Frame 23 — `eligible` result always shows info banner + section label**

Current: single-job eligible screen has no section label above the refund box; info banner only renders when `publicSectorJobs.length >= 2 && uniqueProviders.size >= 2`.

New:
- Add a section header above the refund box (only for the `eligible` scenario):
  - Centred institution icon (`<svg>` with path `M3 21h18 / M5 21V7l7-4 7 4v14 / M9 21v-6h6v6`, ~56px, light-lime square background).
  - Below the icon, bold text: `"Public / Stage / Orchestra refund claim"`.
- Replace the conditional `showTransferredBalancesInfo` banner with an always-visible info banner on eligible results:
  - Dark-green circle with `"i"` icon.
  - Copy: `"This estimate only includes the company pensions that appear refundable based on the information provided. One or more other pensions are not included."`
- Keep the existing transfer-note banner as a **second** banner shown only for 2+ public jobs with different providers (existing condition) — its copy remains as-is.

### 2. Copy fixes (low-risk text-only)

| ID | File:line | Change |
|----|-----------|--------|
| C1 | `JobDetails.tsx` provider dropdowns (all 3 variants: public, private, stage/orchestra read-only) | Label `"Company pension"` → `"Company pension provider"` |
| C2 | `JobDetails.tsx` `PRIVATE_PENSION_OPTIONS` | `"Others"` → `"Other (enter manually)"` |
| C3 | `Results.tsx:849` | CTA `"Proceed with review"` + `<ChevronRight>` → `"Continue →"` (arrow character, not icon) for `private_may_be_possible` |
| C4 | `JobDetails.tsx` salary label | Standardise to `"Average monthly gross salary (€)"` (matches most Figma frames; the frame 2 variant is a wording outlier) |
| C8 | `Results.tsx` — private badge | Leave capitalisation as `"Lump-sum settlement may be possible"`. Figma's lowercase is likely an inconsistency; sentence-start caps match the rest of the UI. |

### 3. Copy + data-model fixes (enum values)

The sector dropdown values double as enum keys in `JobData.employmentType` and flow through to backend `employmentType` string matching in `vbl-calculation-simple.ts::isStageOrchestraJob`. Changes must be coordinated.

| ID | Change | Touches |
|----|--------|---------|
| Q2 | `"Public Sector"` → `"Public sector"` | `useVBLCalculator.tsx` type union + default form, `JobDetails.tsx` `EMPLOYMENT_TYPES`, all `job.employmentType === "Public Sector"` checks in `Results.tsx` / `JobDetails.tsx` |
| Q3 | `"Stage/Performing Arts"` → `"Stage / Performing Arts"` | Same files, same check sites |

Backend `isStageOrchestraJob` already lowercases and does `includes('stage')` — robust to the new literal. No backend change needed.

**Compatibility:** update all comparison sites in the same commit to avoid a mid-change bug where the form writes the new literal but checks read the old.

### 4. Visual fixes

| ID | Change | Location |
|----|--------|----------|
| V1 | Panel bg white → light green on `private_may_be_possible` (use a tinted container class, not an inline style sprinkled everywhere) | `Results.tsx:811` |
| V2 | Panel bg white → light pink/red on `private_appears_unlikely` | `Results.tsx:914` |
| V3 | Frame 12 disclaimer box: `bg-gray-50 border border-gray-200` → `bg-vbl-accent-lime/15` (no border). Uses same lime-tint pattern already used on frame 10's transfer banner | `Results.tsx:835` |
| V4 | VddB/VddKO read-only provider box: lime tint `rgba(159, 232, 112, 0.2)` → neutral `#F3F4F6` | `JobDetails.tsx` (stage/orchestra branch) |
| V5 | Red "refund not possible" icon: remove the outer `bg-red-100` halo, use single solid `bg-red-500` circle, ~64px, with white `✕` | `Results.tsx` (`not_eligible_vesting`, `vested`, `stage_too_short`, `private_appears_unlikely` after B1) |
| V6 | Frame 13 icon treatment — handled by B1 (already swaps to the red-✕ pattern) | Part of B1 |
| V7 | Number formatting: Keep `de-DE` locale (`€12.000`). Client-default Q6 → German. Document decision with a code comment | `Results.tsx:311` `formatCurrency` |
| V8 | Result CTA button width: Leave `w-full`. Figma's 45%-centred button is pixel-finicky and doesn't degrade well on narrow viewports. Defer to pixel-polish Part 3 if client insists | `Results.tsx` (multiple scenarios) |
| V9 | Add institution icon + section label above the eligible refund box — handled by B3 | Part of B3 |

### 5. Sidebar minor

Completed-step sub-label currently shows only `"Job details"`. Figma shows completed state with `"Job details (1/2)"` (preserves the multi-job hint). Adjust `Sidebar.tsx` so the `(N/M)` suffix persists on completion, not just during the active state.

## Explicitly deferred

- **Q1 sector-field label ambiguity** (`"Company pension sector"` vs `"Type of employer"` — Figma itself inconsistent): keep code's current `"Company pension sector"`. Note as "awaiting client clarification" in the PR description.
- **Q5 "Not sure" DRV chip**: keep. Figma shows only Yes/No on 2 frames but the third option is useful for users who genuinely don't know. Flag for client review.
- **Custom dropdown component** (Q7): Part 3 — standalone focused PR.

## Testing

Minimal test additions — most changes are presentational. Critical behavioural tests:

1. **PrivateOptionalDetails radio-select flow** (B2):
   - Selecting "Projected monthly pension" reveals ONE input, sets `projectedMonthlyPension`.
   - Selecting "Capital amount" reveals ONE input, sets `capitalAmount`.
   - Selecting "I can't find either" reveals nothing; can proceed.
   - Switching between options retains the previously entered value (user may toggle back); selecting "I can't find either" leaves all four fields untouched.
2. **Frame 13 behavioural** (B1):
   - Rendering `private_appears_unlikely` shows "Back to calculator" and "Return to homepage", NOT "Continue to paid review".
3. **Enum-value refactor** (Q2/Q3):
   - Existing Results.tsx logic that filters on `employmentType === "Public Sector"` still correctly classifies after the literal change. Use a grep-based pre-commit check + existing test-suite green signal.

Manual QA (screenshots pasted in PR description):
- Each Results scenario rendered at least once against a scripted input.
- `PrivateOptionalDetails` walked through for all 3 radio options.
- Sidebar with completed step 2 at various `numberOfJobs`.

Non-goal: pixel-diff automation. Reviewer visually compares PR screenshots against `app_resource/Calculator/Company Pension-*.png`.

## Rollout

- Single PR against staging.
- No schema, no migration, no feature flag.
- Staging smoke test + designer visual review before merging to `main`.

## Success criteria

- All 3 behavioural changes (B1/B2/B3) render correctly against their Figma frames.
- All copy fixes (C1-C4, C8) applied consistently.
- Enum literal changes (Q2/Q3) don't break any existing flow (`Results.tsx` routing, backend `isStageOrchestraJob`, sessionStorage handoff to onboarding).
- Visual fixes (V1-V5, V7, V9) pixel-match their Figma sources at typical desktop width.
- Existing Vitest suite still green.
- Designer signs off on the PR screenshots.

## Open questions documented, not blocking

Captured in PR description for client review after landing:
- Q1 `"Company pension sector"` vs `"Type of employer"` — which canonical?
- Q4 dead-end on `private_appears_unlikely` confirmed correct? (We're shipping Figma.)
- Q5 Keep "Not sure" chip on DRV question?
- Q7 Custom dropdown component worth the Part 3 build?
