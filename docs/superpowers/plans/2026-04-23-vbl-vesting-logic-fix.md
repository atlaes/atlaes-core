# VBL Vesting Logic Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the VBL calculator's pre/post-2018 vesting classification to match the client's rule, emit a `isVested` flag so the frontend can render the correct Figma "vested" screen, and stop discarding the real consecutive-month value.

**Architecture:** Surgical changes to one backend service. No schema, no routing, no feature flag. Whole-claim pre/post-2018 classification is determined from the `periods` array (any period ending on/after 2018-01-01 → post-2018 claim). The 60-month total gate applies in both eras; the 36-month consecutive gate applies only in post-2018 claims. The `isVested` flag is emitted when the 60-month gate is the reason for ineligibility.

**Tech Stack:** TypeScript, Vitest, Hono.js, Drizzle ORM. Run commands from `packages/functions/` unless noted.

**Spec:** [`docs/superpowers/specs/2026-04-23-vbl-vesting-logic-fix-design.md`](../specs/2026-04-23-vbl-vesting-logic-fix-design.md)

**Prerequisites (verify once before starting):**
- Docker running: `docker ps` shows `vbl-postgres` + `vbl-redis` as `Up`.
- Backend reachable: `curl -s http://localhost:3001/api/health` returns JSON.
- Tests runnable: from `packages/functions/`, `pnpm test:run 2>&1 | tail -5` shows the existing suite executing.

---

## File Structure

| File | Change type | Responsibility |
|------|-------------|----------------|
| `packages/functions/src/services/vbl-calculation.ts` | Modify | Add `isVested?: boolean` to result type; fix classification + consecutive-months handling in `calculateFromPeriods` |
| `packages/functions/src/services/vbl-calculation.test.ts` | Modify | New `describe` block covering 6 vesting-logic scenarios |

Nothing else. `vbl-calculation-simple.ts` already emits `consecutiveMonthsContributed` via `transformToFullInput`; its output plugs into the fixed service unchanged. `Results.tsx` already reads `isVested` from the API response.

---

## Task 1: Add `isVested` field to the result type

**Files:**
- Modify: `packages/functions/src/services/vbl-calculation.ts` (interface `VBLCalculationResult`, around line 48-69)

- [ ] **Step 1: Edit the interface**

Add a new field after `vblKlassik?: number;` in `VBLCalculationResult`:

```ts
// True when ineligibility is due to the ≥60-month total-contribution gate.
// Frontend uses this to render the Figma "vested" Results screen instead
// of the generic not-eligible screen.
isVested?: boolean;
```

- [ ] **Step 2: Verify types compile**

From repo root:

```bash
pnpm --filter functions type-check 2>&1 | tail -5
```

Expected output ends with exit code 0 (no type errors).

- [ ] **Step 3: Commit**

```bash
git add packages/functions/src/services/vbl-calculation.ts
git commit -m "feat(vbl-calc): add isVested field to VBLCalculationResult"
```

---

## Task 2: Whole-claim pre/post-2018 classification (TDD)

This task replaces the single-date `isPost2018` check with a `periods.some(...)` check. It drives the fix via a failing test that exposes the bug with a mixed-year claim.

**Files:**
- Modify: `packages/functions/src/services/vbl-calculation.test.ts` (append new `describe` block before the closing brace of the outermost `describe('VBLCalculationService', ...)`)
- Modify: `packages/functions/src/services/vbl-calculation.ts` (`calculateFromPeriods` method, around line 647-667)

- [ ] **Step 1: Write the failing test**

Append a new describe block just before the closing `}); // end describe('VBLCalculationService')` — search for the last `});` at column 0. Insert:

```ts
  // ============================================================
  // Vesting Logic (Pre/Post-2018 Classification)
  // ============================================================
  describe('vesting logic (pre/post-2018 classification)', () => {
    it('mixed-year claim with post-2018 period triggers 36-month consecutive gate', async () => {
      // This exposes the single-date bug: sortedJobs[last by start] can be a
      // pre-2018 job even when another job ends post-2018. The classifier
      // must look at ALL period end dates.
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          // employmentEnd mirrors what the simple service computes: latest by
          // start-date sort. Here the later-starting job ends pre-2018, but
          // an earlier-starting job ends post-2018.
          employmentStart: '2015-01-01',
          employmentEnd: '2017-12-31',
          monthsContributed: 50,
          consecutiveMonthsContributed: 37,
          periods: [
            {
              startDate: '2015-01-01',
              endDate: '2019-01-31', // 37 months, post-2018
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
            {
              startDate: '2016-01-01',
              endDate: '2017-12-31', // 13 months, pre-2018 (ignored by sort-last)
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );

      // Claim has a post-2018 period, consecutive >= 36 → ineligible.
      expect(result.isEligible).toBe(false);
      expect(result.eligibilityReasons).toContain(
        'Consecutive contribution period must be less than 36 months'
      );
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'mixed-year claim with post-2018' 2>&1 | tail -20
```

Expected: FAIL with the expectation that `isEligible` is `false` but the service returned `true`. (The current code reads `input.employmentEnd = '2017-12-31'` → `isPost2018 = false` → skips the 36-month gate → `isEligible: true`.)

- [ ] **Step 3: Fix the classification**

In `vbl-calculation.ts`, find `calculateFromPeriods`. Around line 647-667, replace:

```ts
    // Pre/Post 2018 logic based on employmentEnd
    const employmentEndDate = new Date(input.employmentEnd);
    const isPost2018 = employmentEndDate >= new Date('2018-01-01');
    if (isPost2018) {
      if (consecutiveMonths >= 36) {
        eligibilityReasons.push(
          'Consecutive contribution period must be less than 36 months'
        );
      } else {
        rulesApplied.push(
          'Consecutive contribution period less than 36 months'
        );
      }
    }
    if (monthsTotal >= 60) {
      eligibilityReasons.push(
        'Total contribution period must be less than 60 months'
      );
    } else {
      rulesApplied.push('Total contribution period less than 60 months');
    }
```

with:

```ts
    // Whole-claim pre/post-2018 classification per client rule (spec:
    // docs/superpowers/specs/2026-04-23-vbl-vesting-logic-fix-design.md).
    // A claim is "post-2018" if ANY period ends on or after 2018-01-01.
    // Pre-2018 claims skip the 36-month consecutive gate entirely.
    const post2018Cutoff = new Date('2018-01-01');
    const isPost2018Claim = periods.some(
      (p) => new Date(p.endDate) >= post2018Cutoff
    );

    if (isPost2018Claim) {
      if (consecutiveMonths >= 36) {
        eligibilityReasons.push(
          'Consecutive contribution period must be less than 36 months'
        );
      } else {
        rulesApplied.push(
          'Consecutive contribution period less than 36 months'
        );
      }
    }
    // Pre-2018 claims: 36-month gate skipped per client rule.

    if (monthsTotal >= 60) {
      eligibilityReasons.push(
        'Total contribution period must be less than 60 months'
      );
    } else {
      rulesApplied.push('Total contribution period less than 60 months');
    }
```

Also — the `calculationMethod` return value on line 722 uses the old `isPost2018`. Update it to use the new variable:

```ts
// Find in the return object:
      calculationMethod: isPost2018 ? 'post2018' : 'pre2018',
// Replace with:
      calculationMethod: isPost2018Claim ? 'post2018' : 'pre2018',
```

- [ ] **Step 4: Run the test to verify it now passes**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'mixed-year claim with post-2018' 2>&1 | tail -10
```

Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add packages/functions/src/services/vbl-calculation.ts packages/functions/src/services/vbl-calculation.test.ts
git commit -m "fix(vbl-calc): classify pre/post-2018 from any period's end date

Current code used a single employmentEnd (latest job by start-date sort),
which misclassified mixed-year claims where a later-starting job ends
pre-2018 but an earlier job's period extends post-2018.

Client rule: a claim is post-2018 if ANY period ends on/after 2018-01-01."
```

---

## Task 3: Emit `isVested` flag (TDD)

**Files:**
- Modify: `packages/functions/src/services/vbl-calculation.test.ts` (same `describe` block as Task 2)
- Modify: `packages/functions/src/services/vbl-calculation.ts` (`calculateFromPeriods` return object)

- [ ] **Step 1: Write the failing test**

Append inside the `describe('vesting logic (pre/post-2018 classification)')` block, after the mixed-year test:

```ts
    it('pre-2018 65-month claim emits isVested=true', async () => {
      // Karl's case: all jobs pre-2018, aggregate ≥60 months → vested,
      // not refundable. Frontend should render Figma "vested" screen.
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2012-01-01',
          employmentEnd: '2017-05-31',
          monthsContributed: 65,
          consecutiveMonthsContributed: 65,
          periods: [
            {
              startDate: '2012-01-01',
              endDate: '2017-05-31',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );

      expect(result.isEligible).toBe(false);
      expect(result.isVested).toBe(true);
      expect(result.eligibilityReasons).toContain(
        'Total contribution period must be less than 60 months'
      );
    });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'pre-2018 65-month claim emits isVested' 2>&1 | tail -10
```

Expected: FAIL — `isVested` is `undefined`, expected `true`.

- [ ] **Step 3: Set `isVested` in the return object**

In `calculateFromPeriods`, just before the 60-month gate block, introduce a tracker variable. Find the block you edited in Task 2:

```ts
    if (monthsTotal >= 60) {
      eligibilityReasons.push(
        'Total contribution period must be less than 60 months'
      );
    } else {
      rulesApplied.push('Total contribution period less than 60 months');
    }
```

Replace with:

```ts
    let vestedByTotal = false;
    if (monthsTotal >= 60) {
      eligibilityReasons.push(
        'Total contribution period must be less than 60 months'
      );
      vestedByTotal = true;
    } else {
      rulesApplied.push('Total contribution period less than 60 months');
    }
```

Then in the return object at the bottom of `calculateFromPeriods` (around line 719-741), add one field. Find:

```ts
    return {
      isEligible,
      eligibilityReasons,
      calculationMethod: isPost2018Claim ? 'post2018' : 'pre2018',
```

And insert the `isVested` field right after `isEligible`:

```ts
    return {
      isEligible,
      isVested: vestedByTotal && !isEligible,
      eligibilityReasons,
      calculationMethod: isPost2018Claim ? 'post2018' : 'pre2018',
```

The `&& !isEligible` guard ensures we never emit `isVested: true` on an eligible result (edge case: totalMonths is never ≥60 AND eligible, but the guard keeps the semantics crisp for readers).

- [ ] **Step 4: Run the test to verify it now passes**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'pre-2018 65-month claim emits isVested' 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/functions/src/services/vbl-calculation.ts packages/functions/src/services/vbl-calculation.test.ts
git commit -m "feat(vbl-calc): emit isVested flag when 60-month total gate fails

Frontend (Results.tsx) already checks apiResult.isVested to route to the
Figma vested screen. The backend now populates the field."
```

---

## Task 4: Stop discarding the real consecutive-month value (TDD)

The current code on line 628 overwrites the caller's `consecutiveMonthsContributed` with the aggregate `monthsTotal`. This causes post-2018 claims with gapped histories to fail the 36-month gate even when no single stretch reaches 36 months.

**Files:**
- Modify: `packages/functions/src/services/vbl-calculation.test.ts` (same `describe` block)
- Modify: `packages/functions/src/services/vbl-calculation.ts` (line 628)

- [ ] **Step 1: Write the failing test**

Append inside the `describe('vesting logic...')` block:

```ts
    it('post-2018 claim with 50 total months but only 30 consecutive is eligible', async () => {
      // Exposes the line-628 bug: calculateFromPeriods overwrites the
      // caller's consecutiveMonthsContributed with monthsTotal, causing a
      // user with a 30-month stretch plus a separate 20-month stretch to
      // fail the 36-consecutive gate even though they never had 36 in a row.
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2018-01-01',
          employmentEnd: '2023-06-30',
          monthsContributed: 50,
          consecutiveMonthsContributed: 30,
          periods: [
            {
              startDate: '2018-01-01',
              endDate: '2019-08-31', // 20 months
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
            {
              startDate: '2021-01-01',
              endDate: '2023-06-30', // 30 months, last consecutive stretch
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );

      expect(result.isEligible).toBe(true);
      expect(result.isVested).toBeFalsy();
    });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'post-2018 claim with 50 total months but only 30 consecutive' 2>&1 | tail -10
```

Expected: FAIL — the service pushes `'Consecutive contribution period must be less than 36 months'` to `eligibilityReasons` because it's comparing `50 >= 36`.

- [ ] **Step 3: Fix the overwrite**

In `vbl-calculation.ts`, find the line inside `calculateFromPeriods`:

```ts
    const consecutiveMonths = monthsTotal; // Placeholder: real consecutive detection can be added later
```

Replace with:

```ts
    // Use the caller-supplied consecutive count (the simple service computes
    // it correctly in calculateConsecutiveMonths). Fall back to monthsTotal
    // only when no caller provided a value (legacy direct-call path).
    const consecutiveMonths =
      input.consecutiveMonthsContributed ?? monthsTotal;
```

- [ ] **Step 4: Run the test to verify it now passes**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'post-2018 claim with 50 total months but only 30 consecutive' 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/functions/src/services/vbl-calculation.ts packages/functions/src/services/vbl-calculation.test.ts
git commit -m "fix(vbl-calc): use caller's consecutiveMonthsContributed instead of total

calculateFromPeriods was overwriting the caller's consecutive-month value
with monthsTotal, causing gapped post-2018 histories to fail the 36-month
gate even when no single stretch reached 36 months."
```

---

## Task 5: Add remaining coverage tests (regression)

Adds the straightforward scenarios. These should pass after the Task 2-4 fixes; we add them now to lock in behaviour.

**Files:**
- Modify: `packages/functions/src/services/vbl-calculation.test.ts`

- [ ] **Step 1: Append the four remaining test cases**

Inside the same `describe('vesting logic (pre/post-2018 classification)')` block, append:

```ts
    it('pre-2018 40-month claim is eligible (no 36-month gate)', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2014-01-01',
          employmentEnd: '2017-04-30',
          monthsContributed: 40,
          consecutiveMonthsContributed: 40,
          periods: [
            {
              startDate: '2014-01-01',
              endDate: '2017-04-30',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.isVested).toBeFalsy();
    });

    it('post-2018 35-consecutive-month claim is eligible', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2020-01-01',
          employmentEnd: '2022-11-30',
          monthsContributed: 35,
          consecutiveMonthsContributed: 35,
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2022-11-30',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(true);
      expect(result.isVested).toBeFalsy();
    });

    it('post-2018 38-consecutive-month claim is ineligible but not vested', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2020-01-01',
          employmentEnd: '2023-02-28',
          monthsContributed: 38,
          consecutiveMonthsContributed: 38,
          periods: [
            {
              startDate: '2020-01-01',
              endDate: '2023-02-28',
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.isVested).toBeFalsy();
      expect(result.eligibilityReasons).toContain(
        'Consecutive contribution period must be less than 36 months'
      );
    });

    it('mixed-year claim with total ≥60 emits isVested=true', async () => {
      const result = await VBLCalculationService.calculateVBLRefund(
        makeInput({
          employmentStart: '2014-01-01',
          employmentEnd: '2021-12-31',
          monthsContributed: 72,
          consecutiveMonthsContributed: 24,
          periods: [
            {
              startDate: '2014-01-01',
              endDate: '2017-12-31', // 48 months pre-2018
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
            {
              startDate: '2020-01-01',
              endDate: '2021-12-31', // 24 months post-2018
              state: 'Bavaria',
              grossMonthlySalary: 4000,
            },
          ],
        })
      );
      expect(result.isEligible).toBe(false);
      expect(result.isVested).toBe(true);
    });
```

- [ ] **Step 2: Run just the new describe block**

```bash
cd packages/functions && pnpm vitest run src/services/vbl-calculation.test.ts -t 'vesting logic' 2>&1 | tail -15
```

Expected: all 6 tests in the `vesting logic` describe pass.

- [ ] **Step 3: Commit**

```bash
git add packages/functions/src/services/vbl-calculation.test.ts
git commit -m "test(vbl-calc): add regression coverage for vesting scenarios"
```

---

## Task 6: Full test suite regression check

**Files:**
- No changes. Verification step only.

- [ ] **Step 1: Run the full backend test suite**

From repo root:

```bash
pnpm --filter functions test:run 2>&1 | tail -20
```

Expected: all tests pass. If any legacy tests in the `pre-2018 calculation` / `post-2018 calculation` describe blocks fail, they are touching `calculatePre2018Refund` / `calculatePost2018Refund` (unchanged code paths) — investigate; they should not regress.

- [ ] **Step 2: If anything failed, fix before proceeding**

If a test fails, do NOT skip or relax it. Read the failure, determine whether:
- (a) the test encodes an assumption the fix legitimately changes — update the test to match the new correct behaviour, and document the change in the commit message.
- (b) the fix broke something unrelated — diagnose and repair the service code.

Do not commit this step if any test is failing.

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter functions type-check 2>&1 | tail -5
```

Expected: exit code 0.

- [ ] **Step 4: Manual smoke test**

With Docker, backend, and frontend running (already up from the session):
1. Open `http://localhost:3000/calculator`.
2. Walk through: 1 Job → Public Sector → Bavaria → VBL → start Jan 2014, end Dec 2017 → salary any → continue.
3. On Results: verify the screen renders without errors. Copy/paste the console result into the PR description for reviewer visibility.

- [ ] **Step 5: No new commit; the task is verification only.**

---

## Post-implementation

When Task 6 is green, stop and hand back for PR review. Do NOT merge, push, or create the PR automatically — the human decides when to open the PR. Summarize the completed work with:

```bash
git log --oneline main..HEAD
```

Expected: four commits, all prefixed with `feat(vbl-calc):`, `fix(vbl-calc):`, or `test(vbl-calc):`.

## Self-Review Complete

Checked against spec:
- ✅ Per-claim pre/post-2018 classification → Task 2
- ✅ Real consecutive-month value (no overwrite) → Task 4
- ✅ `isVested` flag emitted when 60-month gate fails → Task 1 + 3
- ✅ All 6 spec test scenarios covered → Tasks 2-5
- ✅ Regression protection for legacy paths → Task 6
- ✅ No frontend code changes (already supports `isVested`) → confirmed in Task 6 smoke test
- ✅ No dead-code cleanup, no visual work (out of scope per spec)
