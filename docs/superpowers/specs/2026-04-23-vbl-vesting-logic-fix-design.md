# VBL Calculator — Vesting Logic Fix (Design)

**Date:** 2026-04-23
**Scope:** Part 1 of 2 — logic correctness. Visual/UX alignment with the 24 Figma Calculator frames is deferred to Part 2.
**Status:** Approved for implementation planning.

## Goal

Fix the backend vesting calculation so pre-2018 and post-2018 claims produce the correct eligibility decision per the client's rule. Ship as a focused, testable correctness PR before any visual alignment work.

## Client rule (verbatim, for reference)

> Please note that for periods ending before 2018, vesting only applied from 60 months (for Karl). If someone worked in public sector and all jobs ended before 2018, 36 consecutive months are not blocking a refund, only 60 months in total. Refundable period: 1–59 months if ending before 2018. Anything ending after Jan 1st 2018, 36 months consecutive rules apply.

Interpretation: classification is **whole-claim**, not per-period. A claim is post-2018 if **any** job ends on or after 2018-01-01; otherwise it is a pre-2018 claim.

## Current behaviour (what's wrong today)

Located in `packages/functions/src/services/vbl-calculation.ts` and `vbl-calculation-simple.ts`. The `/api/vbl/calculate-simple` endpoint is the only path the frontend uses; it always funnels through `calculateFromPeriods`.

1. **Consecutive-months value is discarded.** [vbl-calculation.ts:628](packages/functions/src/services/vbl-calculation.ts:628) hardcodes `const consecutiveMonths = monthsTotal;`. The carefully-computed `consecutiveMonthsContributed` (from `calculateConsecutiveMonths` in the simple service) is thrown away. Result: any user with ≥36 total public-sector months fails the 36-consecutive gate even when they never had a 36-month stretch.
2. **No `isVested` flag emitted.** [Results.tsx:158](apps/vbl/components/vbl/steps/Results.tsx:158) already checks `if (apiResult?.isVested)` to route to the Figma "vested" screen, but the backend never sets it. Vested users (≥60 months) currently render as generic "not eligible" instead of the correct vested screen.
3. **Pre/post-2018 classification uses a single `employmentEnd` date** (latest job only). When all jobs end before 2018 this is correct by luck; for any mixed-year claim it is the wrong input.

## Scope of this PR

### In scope

- `packages/functions/src/services/vbl-calculation.ts` — fix `calculateFromPeriods`, add `isVested?: boolean` to `VBLCalculationResult`
- `packages/functions/src/services/vbl-calculation.test.ts` — new test cases
- `apps/vbl/components/vbl/steps/Results.tsx` — no code change; the local `CalculationResult` interface already declares `isVested?: boolean` at [Results.tsx:22](apps/vbl/components/vbl/steps/Results.tsx:22), and the routing check at line 158 starts firing once the backend emits the flag in the JSON response

### Explicitly out of scope

- Visual/UX alignment with the 24 Calculator Figma frames → Part 2.
- `get-started/`, `qualification/`, onboarding flows → map to separate Figma folders we are not touching this round.
- Dead-code cleanup of `calculatePre2018Refund` / `calculatePost2018Refund` — these are still exported but unreachable via `/calculate-simple`. Separate PR.
- "Consecutive months across the 2018 boundary" edge case (see Open Questions below) — flagged in code comments for client confirmation, not blocking this PR.

## Design

### Backend: `calculateFromPeriods` rewrite (minimal)

Replace the existing pre/post-2018 block at [vbl-calculation.ts:647-667](packages/functions/src/services/vbl-calculation.ts:647) with a whole-claim classification:

```ts
// Whole-claim classification per client rule.
// A claim is "post-2018" if ANY period ends on or after 2018-01-01.
const isPost2018Claim = periods.some(
  (p) => new Date(p.endDate) >= new Date('2018-01-01')
);

// Use the real consecutive-month value from the caller; only fall back to
// monthsTotal when it was not provided (legacy/non-simple call paths).
const consecutiveMonths =
  input.consecutiveMonthsContributed ?? monthsTotal;

if (isPost2018Claim) {
  // Post-2018: both gates apply.
  if (consecutiveMonths >= 36) {
    eligibilityReasons.push(
      'Consecutive contribution period must be less than 36 months'
    );
  } else {
    rulesApplied.push('Consecutive contribution period less than 36 months');
  }
}
// Pre-2018 path: skip the 36-month gate entirely per client rule.

// 60-month total gate applies in both eras.
let vestedByTotal = false;
if (monthsTotal >= 60) {
  eligibilityReasons.push('Total contribution period must be less than 60 months');
  vestedByTotal = true;
} else {
  rulesApplied.push('Total contribution period less than 60 months');
}
```

Then, in the return object, set:

```ts
return {
  // ...existing fields...
  isVested: vestedByTotal && !isEligible,
};
```

### Backend: result type

`VBLCalculationResult` in `vbl-calculation.ts` gets a new optional field:

```ts
isVested?: boolean; // true when ineligibility is due to ≥60-month total (vested)
```

### Frontend: no code change

`Results.tsx` already declares `isVested?: boolean` on its local `CalculationResult` interface and already checks `if (apiResult?.isVested) return 'vested'` in `determineResultScenario`. No frontend changes are required — the field just starts populating once the backend emits it. `useVBLCalculator.tsx`'s separate `CalculationResult` (used for form-state persistence across steps) does not carry `isVested` and does not need to.

## Testing

New Vitest cases in `vbl-calculation.test.ts`, calling the full `VBLCalculationService.calculateVBLRefund` with period-based input:

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Single job, all pre-2018, 40 total months | eligible, `isVested=false` |
| T2 | Single job, all pre-2018, 65 total months | not eligible, `isVested=true` |
| T3 | Single job ending 2020, 35 consecutive / 35 total | eligible, `isVested=false` |
| T4 | Single job ending 2020, 38 consecutive / 38 total | not eligible (36-month gate), `isVested=false` |
| T5 | Mixed: 2015 (20m) + 2020 (30m), 30 consecutive in the 2020 job | eligible (post-2018 claim, <36 consecutive, <60 total) |
| T6 | Mixed: same shape but totals reach ≥60 | not eligible, `isVested=true` |
| T7 | Regression: legacy `calculatePre2018Refund` / `calculatePost2018Refund` paths still pass existing tests |

Manual smoke: after merge, run `pnpm vbl:dev` + `pnpm --filter functions dev`, walk through the calculator with a pre-2018 40-month scenario and confirm the eligible result renders.

## Error handling

No new error states. Validation (invalid dates, missing fields, negative months) keeps returning the existing structured error shape. `isVested` is a success-path flag only.

## Rollout

- Single PR targeting the `staging` branch.
- No feature flag, no schema migration — pure calculation change.
- Staging smoke test: the three frontend Figma Results scenarios (eligible, vested, private) each rendered correctly.
- No rollback hazard — worst case, revert the commit.

## Open questions (non-blocking)

1. **Consecutive months across the 2018 boundary.** When a user has one job ending 2015 and another 2020 and the two stretches are adjacent (no gap), do we count consecutive across the whole timeline or reset at 2018-01-01? Defaulted to "across the whole timeline" (matches existing `calculateConsecutiveMonths`). Flagged in a code comment for client confirmation.
2. **Dead-code cleanup.** `calculatePre2018Refund` and `calculatePost2018Refund` are exported but unreachable via the simple endpoint. Separate PR.

## Success criteria

- All 7 new test cases pass.
- Existing Vitest suite still green (no regressions).
- Manual smoke against `/calculator` confirms correct routing to eligible / vested / not-eligible screens per the scenarios above.
- Client can validate against their own test cases (Karl's pre-2018 scenario) before Part 2 begins.
