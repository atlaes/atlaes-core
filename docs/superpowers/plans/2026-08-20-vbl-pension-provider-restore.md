# VBL Pension Provider Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent no-session calculator onboarding from replacing a saved `VBLklassik` identity with empty state.

**Architecture:** Gate calculator identity writes until the existing server, legacy-session, or calculator-local identity has been resolved. Reuse `applySelection` so all sources hydrate the same React state.

**Tech Stack:** Next.js 14, React 18, TypeScript, Playwright

---

### Task 1: Preserve the calculator identity during initialization

**Files:**

- Modify: `apps/vbl/e2e/onboarding-edge-cases.spec.ts`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`

- [x] **Step 1: Write the failing regression test**

Add a test under `Pension Type Selection` that waits for `/calculator/onboarding` to initialize, reads `vbl_flow_identity_v1`, and expects `{ version: 1, pensionType: 'public', pensionProvider: 'VBLklassik', origin: 'calculator' }`. It must also expect the single-claim flow to reach `Create your secure claim` without asking the user to reselect a pension type.

- [x] **Step 2: Verify the test fails for the reported overwrite**

Run:

```bash
VBL_E2E_PORT=3117 pnpm --filter vbl exec playwright test e2e/onboarding-edge-cases.spec.ts --grep "preserves the saved calculator provider"
```

Expected: FAIL because the stored pension type and provider become empty.

- [x] **Step 3: Add the minimal initialization guard and local fallback**

Import `loadFlowIdentity`, add a calculator-initialization boolean, and skip `saveFlowIdentity` until resolution finishes. After the pending-session and legacy sources, load a valid calculator-origin identity and pass its provider and pension type through `applySelection`. Mark initialization complete after the source check.

- [x] **Step 4: Verify the focused regression passes**

Run the Step 2 command again. Expected: 1 passed.

- [x] **Step 5: Verify related calculator restoration and types**

Run:

```bash
VBL_E2E_PORT=3117 pnpm --filter vbl exec playwright test e2e/onboarding-edge-cases.spec.ts e2e/calculator-to-onboarding-bridge.spec.ts
pnpm --filter vbl exec tsc --noEmit
git diff --check
```

Expected: both suites pass, TypeScript exits 0, and `git diff --check` prints nothing.

- [x] **Step 6: Commit the scoped fix**

```bash
git add docs/superpowers/plans/2026-08-20-vbl-pension-provider-restore.md apps/vbl/e2e/onboarding-edge-cases.spec.ts apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx
git commit -m "fix(vbl): preserve calculator pension provider"
```
