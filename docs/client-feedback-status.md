# VBL Client Feedback — Implementation Status

_Last updated: 2026-07-07_

## Round 2 — get-started manual flow test results (27 items, 2026-07-06)

Branch `kalib/adoring-mestorf-2338a0`, 33 commits `a7a065f..8420d87`. Plan + per-item mapping: `docs/superpowers/plans/get-started-feedback-round2.md`. Design truth: July 2 Figma exports (`apps/vbl/app_resource/`, committed).

**Done (all reviewed, final whole-branch review passed after 2 fix waves):** items 1–5, 7–9, 11–18, 20–27, plus client-approved Health Insurance substep (bAV) with Mistral OCR autofill (migration `0005_tiny_ricochet.sql`) and item 6 (bAV paygate variant per `Private-Flow/VBL-26.png`).

**Client decisions (2026-07-07):** written feedback always governs design mockups (item 24 stays as instructed: info box removed); EUR option label per client's item 19 text — "I want to open a EUR account" ("free" dropped, commit `1236ccf`).

**Implemented (2026-07-11):**

- Item 3 eligibility rule — the 2026 small-benefit threshold is now live in `resolvePrivateVariant` (`apps/vbl/components/vbl/steps/Results.tsx`). Statutory values per **§ 3 Abs. 2 BetrAVG**, derived from the official 2026 monatliche Bezugsgröße of **€3,955** (SVBezGrV 2026): monthly-pension limit = 1% = **€39.55/month** (`BAV_MONTHLY_PENSION_THRESHOLD_2026`); one-off capital limit = 120% (12/10) = **€4,746** (`BAV_CAPITAL_THRESHOLD_2026`). A private (bAV) benefit at or below the applicable limit → green ("may be possible"); a benefit clearly above it → red ("appears unlikely", per Figma "DRV refund = No + value above threshold → red"). `projectedMonthlyPension` uses the monthly limit; `capitalAmount`/legacy `contractValue` use the capital limit; `estimatedMonthlyContribution` is a contribution (not a benefit) so a lone contribution → individual assessment; unparseable values → individual assessment, never above-threshold. "Not sure" and unanswered still route to individual assessment. Client sign-off on the two numbers is still welcome but no longer blocking.

**Notable fixes beyond the item list:**

- "Invalid token" (item 21) root cause was a token-refresh bug storing the literal string "undefined" as the access token — affected ALL post-refresh requests, not just signatures. Same bug existed in apps/gpr (fixed in a separate session).
- Final review caught a cross-task seam: the bAV flow's provider never reached onboarding, dead-ending paid users at Pension Details; also fixed the magic-link new-tab path losing pension type/provider (now bridged via `vbl_flow_identity_v1` localStorage).

**Known follow-ups (ticketable):**

1. `middleName` column migration — L203 "Vorname" currently carries "First Middle" merged (priority: reaches official PDFs).
2. Persist `pensionType` + `pensionProvider` on the claim record (three features now depend on client-side survival).
3. Stage employment details (`stageDetails`) not persisted server-side — sessionStorage only.
4. bAV e2e spec `bav-membership-carryover.spec.ts` is static-trace-validated — needs one green run against a full local stack (backend on :3001 unavailable in the authoring sandbox).
5. Dead-code batch: `getCompletedSubSteps` (no callers), generic waiting branch in `EligibilityResult.tsx:248-281`; extract shared `FieldLabel`/missing-hint (3 copies).
6. Magic-link resume path has no automated coverage (dev-mode auto-verify is same-tab) — recommend one manual device/email test before go-live.

---

_Round 1 below: 2026-04-13, calculator + onboarding flows (items 1–19 + email rebrand)_

## ✅ Committed & deployed to staging

**Commit `edd3b1e` on `main`** — "Fix VBL calculator math, add historical rates, mirror Entry B logic"

- Staging: https://staging.vbl.atlaes.de
- Tests: 43/43 passing (4 regression tests locking in client-reported numbers for #2, #4, #6, #7)
- Verified end-to-end with Playwright against staging

| #                 | Item                                               | Flow                          | Notes                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#1**            | Numeric-only salary / amount inputs                | `/calculator`, `/get-started` | `NumberInput` component + `replace(/[^0-9]/g, '')` on paste                                                                                                                               |
| **#2**            | Calculator year dropdown floor at 2004             | Both flows                    | `JobDetails.YEARS`, `EmploymentEndDate.YEARS`, `PrivateContributionDetails.YEARS`                                                                                                         |
| **#2**            | Historical rates 2004–2017 (backend)               | Backend                       | 14 new rows in `contributions.json`, extracted from `Calculator.md`. DRV rate varies per year (9.75% → 9.95% → 9.8% → 9.45% → 9.35% → 9.3%). VBLklassik 1.81% flat, VddB/VddKO 4.5% flat. |
| **#4**            | Stage/Orchestra Jan–Dec off-by-one                 | Backend                       | Was €495, now €540. Calendar-month arithmetic replaces day-based `30.44` average.                                                                                                         |
| **#5**            | Federal state question for Stage/Orchestra         | Both flows                    | Calculator `JobDetails` shows state for Stage; Entry B `stageFlow` gets new `federal_state` step. Backend cap override (`isStageOrchestra → westCap`) removed — uses state now.           |
| **#6**            | Public sector 1-month minimum                      | Backend                       | `validateInput` loosened so `start === end` (same month) is valid.                                                                                                                        |
| **#7**            | Public sector 2018 formula                         | Backend                       | Was €1,294, now €1,411.80 (rounded €1,412). Same off-by-one root cause as #4.                                                                                                             |
| **#17**           | Stage 24-month waiting check                       | `/calculator`                 | New `stage_waiting` scenario in `determineResultScenario`. Entry B already had this.                                                                                                      |
| **#18 (partial)** | `stage_too_short` + `stage_waiting` result screens | `/calculator`                 | Two new screens in `Results.tsx`. Mixed public/private split estimate still pending — needs Figma.                                                                                        |
| **#19**           | Private sector mirrors Entry B                     | `/calculator`                 | New `employerPaidContributions` question in `JobDetails`; review routing only triggers on `Others` OR `not_sure`.                                                                         |

### Files touched

- `packages/functions/src/services/vbl-calculation.ts` (3 math/validation fixes)
- `packages/functions/src/services/vbl-calculation.test.ts` (4 regression tests)
- `packages/functions/src/data/contributions.json` (14 historical rows)
- `apps/vbl/components/vbl/steps/JobDetails.tsx`
- `apps/vbl/components/vbl/steps/Results.tsx`
- `apps/vbl/hooks/useVBLCalculator.tsx`
- `apps/vbl/components/vbl/get-started/flows/stage.ts`
- `apps/vbl/components/vbl/get-started/steps/EmploymentEndDate.tsx`
- `apps/vbl/components/vbl/get-started/steps/FederalState.tsx`
- `apps/vbl/components/vbl/get-started/steps/PrivateContributionDetails.tsx`

### Staging verification (Playwright, 2026-04-13)

- ✅ #1: typing `"abc10000def"` into salary input → shows `"10000"`
- ✅ #2: year dropdown shows `2004`–`2026`
- ✅ #5: Federal state question appears when Stage/Performing Arts selected in `/calculator`; Entry B Stage → new federal_state step shows first with context-aware copy
- ✅ #7: Public 2018 Bavaria Jan–Dec 10k€ → **€1.412** on screen
- ✅ #17/#18: Stage Dec 2025 end → "Your supplementary pension payout is not yet available / December 2027"
- ✅ #4 + #2: Stage 2010 historical Bavaria 1k€ Jan–Dec → **€540** (proves historical year data loaded)

---

## 🔄 Uncommitted — on `group-c/figma-alignment` branch

Logic-only Group C items. Type-check clean. 9 modified + 2 new files. Not yet tested on staging.

| #                  | Item                                              | Summary                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#8**             | Dynamic "which pension first" screen              | Only shown when user has mixed public/stage **and** private claim types. Card labels adapt: "Public Sector Pension" / "Stage / Orchestra Pension" / "Public Sector & Stage Pension" depending on what the user has.                                                                                                                                                    |
| **#12**            | Pension membership locked from calculator         | `Results.handleStartClaim` writes `{pensionProvider, claimTypes}` to `sessionStorage['calculator-selection']`. `OnboardingFlow` reads on mount and calls `updateMembership`. `OnboardingMembership.pensionProvider` widened from narrow enum to `string` so state-specific ZVKs (e.g. "Bayerische ZVK") are accepted verbatim.                                         |
| **#13**            | Full country dropdown + Google Places             | 249-country ISO list in `lib/countries.ts`. New `hooks/useGooglePlacesAutocomplete.ts` lazy-loads Maps JS SDK once and attaches Places Autocomplete to the street input. Staging now receives `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` from the GitHub `staging` environment secret.                                                                                          |
| **#14**            | IBAN validation + default account holder          | `isValidIbanFormat` helper (2 letters + 2 digits + 11–30 alphanumeric, total 15–34). Red-border error state once ≥4 chars entered. Continue blocked until valid. `accountHolder` defaults from `identity.fullName` via `useEffect`.                                                                                                                                    |
| **#15 (bug only)** | Signature "Invalid Token" regression              | `signatureId` is cleared on every canvas mutation (stopDrawing, undo, redo, clear, upload, delete). Previously, modified signatures reused the stale server-side ID and got rejected. **Copy changes still pending — need Figma text.**                                                                                                                                |
| **#16**            | Review: clickable header + edit-returns-to-review | `OnboardingContext` gains `editingFromReview` flag. `handleEditSection` + header clicks set it true; `handleSubStepNext` routes to `'review'` when true. `isSubStepCompleted` now uses `canProceedFromSubStep` (actual data validity) instead of index position — going back no longer "unchecks" later steps. Completed steps become clickable in the header stepper. |

### Files touched

- `apps/vbl/contexts/OnboardingContext.tsx`
- `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`
- `apps/vbl/components/vbl/onboarding/OnboardingLayout.tsx`
- `apps/vbl/components/vbl/onboarding/steps/Address.tsx`
- `apps/vbl/components/vbl/onboarding/steps/BankDetails.tsx`
- `apps/vbl/components/vbl/onboarding/steps/Membership.tsx`
- `apps/vbl/components/vbl/onboarding/steps/PensionTypeSelection.tsx`
- `apps/vbl/components/vbl/onboarding/steps/Signature.tsx`
- `apps/vbl/components/vbl/steps/Results.tsx` (handleStartClaim bridge)
- `apps/vbl/lib/countries.ts` (new)
- `apps/vbl/hooks/useGooglePlacesAutocomplete.ts` (new)

---

## ⚠️ Pending — blocked on Figma visuals

The Figma MCP Starter plan rate limit is blocking `get_design_context` calls. Cached metadata file has node structure but strips text content, so new wording and layout details can't be read without one of:

- Plan upgrade (permanent unblock)
- Screenshots pasted in chat (per-screen)
- Client pasting the new copy directly

| #       | Item                                     | What's needed from Figma                                                                        |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **#3**  | Estimate screen wording                  | Exact new copy from client's Figma comments                                                     |
| **#9**  | Paygate header + content                 | Layout + copy                                                                                   |
| **#10** | Passport upload screen                   | Visual: header, icons, drag-to-browse UX, remove "supported formats" hint, full field clickable |
| **#11** | Passport confirmation layout             | DOB format + field layout (gender/DOB side-by-side per comments)                                |
| **#15** | Signature page wording (copy part)       | Bug fix done; copy changes still need Figma text                                                |
| **#18** | Mixed public/private split estimate card | Layout for the split card + wording for "excludes non-refundable" note                          |
| **#18** | Private 3 result screens                 | Clarification on what the 3rd screen is (Entry B only has 2 outcomes)                           |

## 📬 Email branding

Magic-link email rebrand lives in `packages/functions/src/services/email.ts`.

1. "Company Pension" branding replaces generic ATLAES
2. Company Pension logo in email header — now uses the hosted `companypension-cashouts-refunds.svg` asset
3. Subject line: "Sign in to your Company Pension account"
4. Heading: "Sign in to your Company Pension account"
5. De-emphasize raw fallback link (place lower, smaller, with lead-in text)
6. Footer simplification

Remaining wording changes still need final copy approval.

---

## 🔑 Key decisions recorded

- **#16 clickable header**: user agreed with "make completed steps clickable + edit returns to review + auto-invalidate downstream on upstream edits". Cascade invalidation was my initial framing — client's actual ask was just clickable header + edit-returns. Current implementation includes those two, does NOT include automatic invalidation (not requested and introduces risk of silent data loss on edit).
- **#12 type widening**: `OnboardingMembership.pensionProvider` widened from `'VBL' | 'ZVK' | 'KVBW' | 'VddB' | 'VddKO' | ''` to `string` so state-specific calculator providers (e.g. "Bayerische ZVK", "ZVK Köln") carry through without enumerating every variant.
- **#2 historical rates source**: explicitly the client's own reference table in `Calculator.md` at repo root. Per client's top-of-file instruction `PLEASE DO NOT USE THE INTERNET FOR INFORMATION!!!` — those values are authoritative.
- **Calendar-month vs day-based counting**: German pension law counts `Umlagemonate` by calendar month, not by elapsed days. The old `30.44` day-average was producing off-by-one errors. The fix is `(endYear - startYear) * 12 + (endMonth - startMonth) + 1`. Frontend `jobMonthCount` and backend `monthsBetween` must stay in sync.
- **#5 stage/orchestra cap**: originally forced `westCap` for Stage/Orchestra thinking VddB/VddKO were national schemes. Client clarified they want east/west based on federal state. Override removed; state-based logic applies.
- **Figma MCP Starter limit**: hit twice this session. Switched strategies to "text descriptions + screenshots in chat" for Figma-dependent items.

---

## Next actions in order of friction

1. **Commit + push + deploy `group-c/figma-alignment`** — 6 items ready for staging verification. No external blockers.
2. **Unblock visual items** via screenshots pasted in chat or client copy paste. Items: #3, #9, #10, #11, #15-copy, #18-split.
3. **Finish remaining email wording changes** once final copy is approved.
