# Get-Started Manual Flow — Feedback Round 2 Implementation Plan

_Source: client manual test results (27 items across bAV, VBL/ZVK, VddB/VddKO flows), 2026-07-06._
_Worktree: `.claude/worktrees/adoring-mestorf-2338a0`, branch `kalib/adoring-mestorf-2338a0`._

## Global Constraints

- All work in `apps/vbl` (Next.js 14 App Router) unless a task names a backend file.
- Prettier style: single quotes, trailing commas (es5), semicolons, 2-space indent, 80 char width.
- Exact client copy must be used verbatim where the feedback quotes it (each task brief quotes it).
- The 24-month waiting rule is REMOVED for VBL/ZVK (public sector) but KEPT for VddB/VddKO (stage). Do not touch `checkStageWaiting` / stage waiting logic when removing the public one.
- `npx tsc --noEmit` and repo-wide eslint are known-broken repo-wide (pre-existing); do NOT gate on them. Verify with targeted tests and by reading call sites. There are ~29 pre-existing test failures in `packages/functions` — only ensure you don't add NEW failures in files you touch.
- E2E specs live in `apps/vbl/e2e/` (Playwright). When a task removes or changes behavior asserted there, UPDATE the affected spec expectations in the same commit. Do not run the Playwright suite (needs a live server); just keep specs consistent.
- NEVER `git stash` (worktrees share the stash). Commit your work instead.
- Flow architecture: `contexts/EligibilityContext.tsx` drives step order via configs in `components/vbl/get-started/flows/{private-sector,public-sector,stage}.ts`; `components/vbl/get-started/EligibilityFlow.tsx` maps step IDs → components; post-eligibility onboarding is `components/vbl/get-started/GetStartedOnboardingFlow.tsx` + `contexts/OnboardingContext.tsx` with substeps identity → membership → address → bank-details → signature → review. All paths under `apps/vbl/`.

## Task 1: bAV flow — default selection, screen order, remove unused screens (items 2, 3, 7)

Files: `components/vbl/get-started/steps/EmploymentType.tsx`, `components/vbl/get-started/flows/private-sector.ts`, `components/vbl/get-started/EligibilityFlow.tsx`, `components/vbl/get-started/steps/PrivateUploadDocument.tsx`, `components/vbl/get-started/steps/PrivatePensionProvider.tsx`, `components/vbl/get-started/steps/PrivateContributionDetails.tsx`, `contexts/EligibilityContext.tsx`, plus new step components as needed.

Requirements:
1. **Default selection (item 2):** In `EmploymentType.tsx` the fallback default is currently `public_sector` (~line 53). Change the default selection to bAV (`private_sector`).
2. **Screen order (item 3):** The bAV flow must be:
   - "What do you want to start?" (`employment_type`)
   - → Upload a document or continue manually (`private_entry_path`)
   - → **manual path only:** "Have you already received your German state pension refund?" (currently this question exists only inside `PrivateUploadDocument.tsx` phase `state_pension_refund`, upload path only). Extract/create a standalone step shown on the MANUAL path right after the entry-path choice. Keep the upload path's inline version working (upload path: it already appears after review — leave that as is unless trivially unifiable).
   - → "Who is your bAV provider?" (`private_pension_provider` — retitle heading to exactly "Who is your bAV provider?")
   - → "What amount is shown on your bAV statement?" — NEW manual-path step asking for the amount (mirror the "Pension value" input + value-type select that exists in `PrivateUploadDocument.tsx` review phase, ~lines 448-500). This replaces `private_contribution_details` as the amount-collection screen for the manual path.
3. **Remove unused screens (item 3):** Remove the former "individual assessment required" terminal review screens from the bAV flow: delete/disable `checkReview` triggers in `flows/private-sector.ts` (~lines 30-66) and any inline "individual assessment" banners in the bAV step components. Users who select "Other" provider etc. should continue through the flow, not hit a dead-end review screen. Also delete the dead `EUContinuation.tsx` step (unreachable — not in `publicSectorFlow.steps`), its `STEP_COMPONENTS` entry, its `StepId`, and the e2e helper `selectEUContinuation` if present.
4. **Wording alignment (item 7, best-effort):** The bAV path reuses refund-flow wording in shared components (`PublicEntryPath.tsx` headings, buttons). Where the bAV path shows copy that talks about a "refund", change the bAV variant to cash-out/company-pension wording (e.g. "bAV / Company Pension Cash-Out"). Only adjust strings gated on `employmentType === 'private_sector'` — do not change VBL/ZVK or stage copy.
5. Update `apps/vbl/e2e/get-started/*` specs that assert the old bAV order/screens.

Decision already made: if `PrivateContributionDetails.tsx` becomes fully unused after the reorder, delete it and its flow entry; if parts remain needed (e.g. employer-paid question feeding eligibility), keep only what the new order needs and report what you kept and why.

## Task 2: OCR loading state during document processing (item 4)

Files: `components/vbl/get-started/steps/PrivateUploadDocument.tsx`, `PublicUploadDocument.tsx`, `StageUploadDocument.tsx`.

Requirement: OCR extraction feels slow with no feedback. `Identity.tsx` (onboarding) already has the pattern: a `processing` phase with `Loader2` spinner + "Analyzing document..." (~lines 192-208). Add an equivalent visible loading/progress state to all three pension-document upload components while `isExtracting` is true: full-area spinner state (not just a disabled button) with copy like "Reading your document… This can take up to a minute." Reuse the existing `Loader2`/animation pattern for visual consistency. Keep the button-disable behavior.

## Task 3: VBL/ZVK — remove 24-month rule and Cannot-claim-yet screen; stage info box (items 8, 9, 24)

Files: `components/vbl/get-started/steps/EmploymentEndDate.tsx`, `components/vbl/get-started/flows/public-sector.ts`, `components/vbl/get-started/steps/EligibilityResult.tsx` (verify only), e2e specs.

Requirements:
1. **Item 8:** VBL/ZVK do not use a 24-month waiting rule. In `EmploymentEndDate.tsx` remove the 24-month info box (~lines 98-108, green `#EEF6EA` box: "Your employment end date is needed to check whether the 24-month waiting period has been met.") for the public-sector path.
2. **Item 9:** Remove the "Cannot claim yet" (waiting) result from the VBL/ZVK flow: remove/neutralize `checkPublicWaiting()` in `flows/public-sector.ts` (~lines 91-113) so public-sector users can never land on `result === 'waiting'`. The waiting screen in `EligibilityResult.tsx` stays — it is still used by the stage flow. Do NOT touch stage waiting logic in `flows/stage.ts`.
3. **Item 24:** On the stage path's "When did your employment end?" screen (same shared `EmploymentEndDate.tsx`), also remove the info box below the date fields. Net: the info box is removed entirely — but the stage waiting CALCULATION stays.
4. **Item 10 (unblocked, July design):** Update the VBL contribution-period wording per the July exports (see `.superpowers/sdd/design-index.md`, Public-sector-flow section): the Yes/No screen keeps heading "VBL contribution period" (no info box); the duration screen is reworded to "How many months did you pay into VBL in total?" and gains an info box about including ZVK-transferred periods. Read the referenced screenshots from the index and match heading, question copy, option labels, and info-box text exactly (`ContributionPeriod.tsx`, `ContributionDuration.tsx`).
4b. **Item 24 conflict note:** the July design shows an info box on the stage employment-end screen, but the client's WRITTEN item 24 (newer, explicit) says remove it — the written instruction governs. Remove it, and note the conflict in your report so the controller can flag it to the client.
5. Update e2e specs asserting public-sector waiting behavior or the info box text (`e2e/get-started/eligibility-edge-cases.spec.ts` and friends).

## Task 4: Paygate screen — remove Back, final sentence (items 11, 12)

Files: `components/vbl/onboarding/steps/Payment.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx`, `components/vbl/get-started/GetStartedLayout.tsx`.

Requirements:
1. **Item 11:** On the "Start your refund claim" (paygate) screen, remove the Back button. The back control is rendered globally (GetStartedLayout / GetStartedOnboardingFlow `handleBack`), not in `Payment.tsx` — hide it only while the paygate step is active.
2. **Item 12:** Change the final sentence (currently "Your refund will be paid directly to your own bank account." ~line 129) to exactly: `If approved, the refund will be paid directly to the bank account you provide.`
3. **Item 6 (unblocked, JULY design governs):** The bAV flow needs its own paygate variant. Design: `apps/vbl/app_resource/Get-Started/Private-Flow/VBL-26.png` (July export, in this worktree) — heading "Start your bAV cash-out request", €199 deposit line ("Deposit / credited toward your service fee — €199"), "What happens next:" checklist (Upload your ID and required documents / Confirm your pension, employer and payment details / Review and sign your cash-out request online / CompanyPension submits your request to the pension provider), "Service fee:" bullets (9.75% of the approved cash-out amount / Minimum fee: €199 / Any remaining balance is payable only after the payout is received.), callout "If the cash-out cannot be submitted after review:" (€79 is retained for the digital claim setup and document check / €120 is refunded to you), "✓ Secure payment via Stripe", button "💳 Pay €199 and complete your claim", and the disclaimer "CompanyPension provides a digital claim platform. We do not provide legal, pension, tax or financial advice. You remain the claimant and approved funds are paid directly to your own account." Read the screenshot and reproduce copy exactly. Branch on the private pension type in `Payment.tsx`; the standard VBL/ZVK paygate stays as-is apart from requirements 1–2.

## Task 5: Identity screen — back to upload, missing-field indicators (items 13, 25)

Files: `components/vbl/onboarding/steps/Identity.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx`.

Requirements:
1. **Item 13:** On "Confirm your identity details" (phase `confirm`), the Back button must return to the passport upload page (phase `upload`), not to the previous global step — it currently doesn't work. Wire the global back (or add a local back) so that from `confirm` it goes to `upload`. On returning to upload, clear the previously uploaded passport file so the user starts a fresh upload (client accepted either clearing or asking; decision: clear it — simpler and unambiguous). Extracted-but-confirmed data handling: keep the form data in context so re-upload re-populates/overrides.
2. **Item 25:** Make missing required fields clearly visible on the confirm form: when a required field (e.g. place of birth not extracted from the passport) is empty, show a red label + red input outline and a short "Required" hint. Apply to all required identity fields. Trigger the highlight when arriving at confirm with missing extracted data AND on attempted continue.

## Task 6: Name fields — split full name into components (item 14)

Files: `components/vbl/onboarding/steps/Identity.tsx`, `contexts/OnboardingContext.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx` (saveAndAdvance ~lines 205-231), `components/vbl/onboarding/steps/ReviewSubmit.tsx`, backend investigation only.

Context: today one "Full Name" field is split on whitespace into firstName/lastName — unreliable for multi-part names, and downstream forms (claim PDFs) need accurate components. Note: the July design (`Private-Flow/VBL-4.png`) still shows a single Full Name field, but the client's written item 14 (newer) conditions keeping it on the system "reliably storing and mapping individual name components" — which whitespace-splitting is not. Decision: split the fields; record this rationale in the commit message.
Requirements:
1. Replace the single Full Name field with separate fields: **First name**, **Middle name (optional)**, **Last name**.
2. Investigate what the backend claim/profile records store (check `packages/functions/src/drizzle/schema/shared.ts` + `claims.ts` and the save path). Map fields so no data is silently lost: if there's no middle-name column, store middle name appended to first name on save (`"First Middle"`) and report that as a concern; do NOT create a DB migration in this task.
3. Passport OCR pre-fill: map OCR `fullName`/given-names output into the separate fields with a best-effort split, but the user can correct each field independently.
4. Update ReviewSubmit display and any other consumer of `identity.fullName`.

## Task 7: Pension details — fixed institution, membership number only (items 15, 16)

Files: `components/vbl/onboarding/steps/Membership.tsx`.

Requirements:
1. **Item 15:** At this substep the institution is already selected during eligibility and must be fixed: remove the provider dropdown entirely; always display the previously selected institution (read-only, as the current "locked" display ~lines 97-123 does); ask only for the membership number. If no provider was carried over (edge case), fall back to the read-only display of whatever is in context — do not re-offer a dropdown.
2. Dynamic wording based on the selected institution in the helper copy, e.g. "your VBL document" / "your ZVK document" / "your VBL letter" / "your ZVK letter" — use the actual provider name from context in the label and helper text (existing dynamic label logic partially does this; extend it to all copy on the screen). Design reference: `app_resource/Eligibility/VBL (30).png` shows the exact helper copy "You can find this number on letters or statements from VBL." — Read it and use its copy with the provider name substituted dynamically.
3. **Item 16:** The membership-number input triggers a browser-extension autofill suggestion ("Loyalty Cards" Google Drive link — not in our code). Suppress it: add `autoComplete="off"` (and `name` attribute that doesn't look like a wallet/loyalty field, plus `data-1p-ignore`/`data-lpignore="true"` attributes) to the membership number input.

## Task 8: Bank details — navigation and trusted-person cleanup (items 18, 20 partial, 19 partial)

Files: `components/vbl/onboarding/steps/BankDetails.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx`, `components/vbl/get-started/GetStartedLayout.tsx`.

Requirements:
1. **Item 18a:** In the own-bank-details branch, remove the bottom "Back" link (`renderBranchBack` usage in the `own_details` phase). The top-left global Back is sufficient — ensure the top-left Back returns to the destination (account-type) phase when inside a branch.
2. **Item 18b:** Clicking the "Bank Details" tab in the top substep bar while already on bank-details must return to the bank-account-type selection (`destination` phase), not the address screen. Wire the tab click to reset the BankDetails internal phase.
3. **Item 20a:** In the trusted-person branch, remove the bottom "Back" link as well.
4. **Item 20b (unblocked, July design):** Replace the trusted-person info boxes with the July design's content (see design-index, Eligibility section): selection screen warning "Please make sure you fully trust the account holder… payment cannot be changed once issued" and entry-screen box "The payment cannot be changed once issued" — Read the referenced screenshots and reproduce copy/structure exactly.
5. **Item 19 (July design, asset available):** EUR-account sub-flow is `Eligibility/VBL-7.png` and `VBL-12.png` (July, this worktree) — SummitFX is named in body copy and shown as a logo/wordmark with a "Continue with SummitFX" button. Read both screenshots and match copy and structure. Logo asset: `apps/vbl/public/summitfx-logo.png` (client-provided, 298×51, transparent bg) — use it via next/image with explicit width/height (display at ~149×26 or smaller so the 1× PNG stays crisp on retina); alt "SummitFX". Note: `public/` is gitignored at repo root — the asset is already force-added; if you add more files there use `git add -f`.

## Task 9: VddB/VddKO dynamic institution wording (item 23)

Files: `components/vbl/get-started/steps/StageContributionDuration.tsx` (~line 79), `components/vbl/get-started/steps/StageUploadDocument.tsx` (~lines 530, 537, 589), `components/vbl/get-started/steps/EligibilityResult.tsx` (~line 143), any other literal "VddB/VddKO" post-selection.

Requirements:
1. After the user selects VddB or VddKO (`data.pensionProvider` set in `StagePensionDetails.tsx`), all subsequent copy must use only the selected institution: e.g. "How many VddB contribution months do you have in total?".
2. `StageUploadDocument` appears BEFORE institution selection in the flow (stage_upload is step 2, stage_pension_details step 3) — screens shown before selection keep the combined "VddB/VddKO" label; screens after selection must be dynamic. Verify each occurrence against flow position; the reminder copy in `EligibilityResult.tsx` (post-selection) must be dynamic.
3. Grep for every literal `VddB/VddKO` in `apps/vbl` and classify each as pre- or post-selection; fix all post-selection ones.

## Task 10: Stage screens — split combined screen, review section (items 26, 27)

Files: `components/vbl/onboarding/steps/Membership.tsx`, `components/vbl/onboarding/steps/StageMembershipDetails.tsx`, `contexts/OnboardingContext.tsx`, `components/vbl/onboarding/steps/ReviewSubmit.tsx`.

Requirements:
1. **Item 26:** Split the combined "Stage or orchestra employment details" screen into two screens for better UX. Decision: Screen 1 = "Last employment" (stage name, role/position, employment end date); Screen 2 = "Leaving & current occupation" (permanently stopped, reason, current occupation, unable-to-work-for-health). Implement as two sequential views within the membership substep (internal phase, like BankDetails' phases) — do NOT add a new entry to `SUBMIT_DETAILS_SUBSTEPS` (keeps the top tab bar stable). Back from screen 2 returns to screen 1.
Design note: the July exports include a review screen WITH a stage "Employment Details" accordion section — `apps/vbl/app_resource/Eligibility/VBL-19.png` (see design-index) — Read it and match its section title, field order, and copy for item 27. For the two-screen split (item 26), consult the Stage-flow July exports for grouping/copy; the split decision in requirement 1 governs where the design is silent.
2. **Item 27:** The review screen (`ReviewSubmit.tsx` membership section, ~lines 209-225) must include the stage/orchestra employment details for stage users: stage name, role, employment end date, permanently stopped, reason for leaving, current occupation, health flag. Only shown when provider is VddB/VddKO. Edit link returns to the membership substep.

## Task 11: Google address autocomplete in all flows (item 17)

Files: `components/vbl/onboarding/steps/Address.tsx`, `apps/vbl/hooks/useGooglePlacesAutocomplete.ts`, possibly legacy `components/vbl/onboarding/OnboardingFlow.tsx` path.

Context: client reports autocomplete works only in the VddB/VddKO flow, but `Address.tsx` is shared by all paths — so this is a bug, not a missing feature. Debug systematically:
1. Reproduce the difference in code: check whether the street input ref is attached conditionally (phase/step remount timing), whether the hook attaches once on mount before the input exists in some paths, and whether another address form (legacy `OnboardingFlow`/`OnboardingLayout` or a different substep composition per path) is used in the VBL/ZVK or bAV paths.
2. Fix so autocomplete attaches reliably on the residential address street input in ALL flows (bAV, VBL/ZVK, VddB/VddKO). Typical fix: re-run the attach effect when the input mounts (callback ref or effect deps), guard against double-attach.
3. Note: works only when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set — do not "fix" by adding a key; fix the attach logic.

## Task 12: Signature — Invalid token on delete + re-enter (item 21)

Files: `components/vbl/onboarding/steps/Signature.tsx`, `apps/vbl/lib/onboarding-api.ts` (signature upload/attach calls), backend read-only: `packages/functions/src/routes/signatures.ts`, `packages/functions/src/routes/claims.ts` (attachSignature), `packages/functions/src/middleware/auth.ts`.

Context: an earlier fix (Client #15) clears `data.signatureId` on every canvas mutation so a stale server-side signature ID is not re-attached. The client still hits "Invalid token" when a signature is DELETED and then ENTERED AGAIN. "Invalid token" is the generic JWT auth-middleware message (`middleware/auth.ts` ~lines 41/61), so the failing request is being rejected at auth level OR a stale/consumed signature id path returns that message.
Requirements:
1. Systematically debug: trace the exact request sequence for delete → re-draw/re-upload → continue. Identify which call returns "Invalid token" (signature upload vs attach vs another call) and why (missing/expired Authorization header on retry path, a fetch built with a captured stale token, double-submit with consumed one-time token, or stale `signatureId` path not covered by the Client #15 clearing).
2. Fix the root cause. Do not paper over by retrying.
3. Add/extend a test if the root cause is backend-side (vitest in `packages/functions`); if purely frontend state, document manual verification steps in your report and update code comments.

## Task 13: Persist flow progress across refresh (item 22)

Files: `contexts/EligibilityContext.tsx`, `contexts/OnboardingContext.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx`, `apps/vbl/app/get-started/page.tsx`.

Context: refresh currently resets to "What do you want to start?" because both contexts are pure in-memory state. Existing partial persistence: `vbl_draft_claimId` in localStorage + backend claim resume; `vbl_onboarding_payment_seed` in sessionStorage for the Stripe round-trip.
Requirements:
1. Persist eligibility state (answers + current step id + result) and onboarding position (currentStep, currentSubStep, and form data not yet saved to a claim) to `sessionStorage` under versioned keys (e.g. `vbl_eligibility_v1`, `vbl_onboarding_v1`). sessionStorage decision: survives refresh (the reported bug) without leaving PII in localStorage long-term.
2. On mount, restore and return the user to the most recently active screen. Restore must not fight the existing `vbl_draft_claimId` backend resume — backend claim data wins for fields it covers; sessionStorage covers position + pre-claim data.
3. Clear the persisted state on successful final submission (SuccessScreen) and when the user restarts the flow.
4. Guard JSON.parse with try/catch; a corrupt/old-version blob falls back to a fresh start.
5. Update/extend e2e expectations if any spec asserts reset-on-refresh.

## Task 14: Final CompanyPension logo in header + email (items 1, 5)

Files: `apps/vbl/public/companypension-cashouts-refunds.svg` (replace contents), `components/vbl/icons/CompanyPensionLogo.tsx`, `packages/functions/src/services/email.ts`, `apps/vbl/e2e/companypension-logo.spec.ts`.

Context: the final logo (gradient hexagon CP mark + white "Company Pension" wordmark + green "CASH-OUTS & REFUNDS" tagline, 260×56 viewBox) is snapshotted at `.superpowers/sdd/final-companypension-logo.svg` (original: `/Users/kael/Downloads/Group 1321315140 (1).svg`). The app currently ships a flat placeholder. The same asset URL is used by the flow header (via `CompanyPensionLogo.tsx`) AND the magic-link email (absolute URL in `email.ts`).
Requirements:
1. Copy the new SVG over `apps/vbl/public/companypension-cashouts-refunds.svg` (keep the filename so the email URL keeps working). Bump the `?v=` cache-buster in `CompanyPensionLogo.tsx` to today's date.
2. The wordmark is WHITE — audit every usage site of `CompanyPensionLogo` (auth pages, google/magic-link callback pages, dashboard pages, `Sidebar.tsx`, `ManualVBLCalculator.tsx`, `OnboardingLayout.tsx`, `PensionTypeSelection.tsx`, `GetStartedLayout.tsx`) and check the background each renders on. On dark-green (`#163300`) headers it's correct. If any usage renders on a light background (white wordmark invisible), report it and set an explicit dark background or note it as a follow-up — do not redesign those pages.
3. Verify the email template's `<img>` sizing still fits the new 260×56 aspect ratio; adjust width/height attributes if needed. Run `pnpm vitest run src/services/email.test.ts` in `packages/functions` and keep it green.
4. Check `e2e/companypension-logo.spec.ts` expectations still hold (dimensions/alt text) and update if needed.

## Design reference (unblocked 2026-07-06)

Client Figma exports are on disk (untracked) at `/Users/kael/Code/freelancing/Atlaes/apps/vbl/app_resource/`:
- `Get-Started/Private-Flow/` (26 PNGs) — bAV flow (Tasks 1, 2)
- `Get-Started/Public-sector-flow/` (18 PNGs) — VBL/ZVK (Task 3, item 10 wording)
- `Get-Started/Stage-flow/` (11 PNGs) — VddB/VddKO (Tasks 3, 9, 10)
- `Eligibility/` (29 PNGs) — onboarding screens (Tasks 4–8: paygate, identity, pension details, bank details, EUR account, trusted person, review)
An index with per-screen headings and copy is generated at `.superpowers/sdd/design-index.md` — task briefs' "best-effort / TODO(figma)" hedges for items 6, 10, 19 (copy), 20 (copy) are superseded where the index contains the actual screen: use the exact copy from the screenshots.

## Task 1b: bAV eligibility logic per July design notes (item 3/7 follow-up)

Files: `components/vbl/get-started/flows/private-sector.ts`, `components/vbl/get-started/steps/EligibilityResult.tsx`, new/changed bAV step components from Task 1.

The July exports contain designer logic notes (`Private-Flow/Group 1000009061.png`, `Group 1000009065.png`, `Group 1000009079.png`) defining bAV eligibility outcomes:
- DRV refund = Yes → green (eligible)
- DRV refund = No + value within 2026 standard threshold → green
- DRV refund = No + value above threshold → red (rejection screen `VBL-16`/`VBL-22`: "This bAV cash-out cannot currently be started through CompanyPension" / "No lump-sum settlement possible")
- Do NOT show an "unlikely" screen just because the user answered "Not sure".
Also fold in (from Task 1 review, design alignment):
- `PrivateStatementAmount.tsx`: convert the value-type dropdown + shared input to the July design's three radio options ("Projected monthly pension" — "Monthly pension expected at retirement." / "Capital amount / one-time value" — "A lump-sum, capital value or one-time payout amount." / "I can't find an amount"), each revealing its own labeled input ("Projected monthly pension at retirement", placeholder "E.g., 45" / "Capital amount / one-time value", placeholder "E.g., 8,500"; info box on capital variant: "Enter the amount shown on your statement. A rough number is enough for this check.") per `VBL-14/15.png`. Keep the upload path's review-phase fields as they are.
- `PrivatePensionProvider.tsx`: field label "bAV provider", provider list per `VBL-10.png` (Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV, Other provider), "Other" label "Other provider".
Result-screen copy: eligible = `VBL-17.png` ("Your bAV cash-out can be started through CompanyPension" + callout "Final approval depends on the pension provider and, where required, employer confirmation.", button "Start bAV cash-out"). Reconcile whatever Task 1 implemented with these rules: rejection outcomes REPLACE the removed "individual assessment" review dead-ends where the rules say red; the flow must not silently mark everyone eligible. Determine the 2026 small-benefit threshold from existing backend calculation code if present (`packages/functions/src/services/vbl-calculation.ts` / `contributions.json`); if the threshold value is not derivable from the codebase, report BLOCKED with what you found — do not invent a number.

## Task 15: Health Insurance substep (client-approved 2026-07-06) — frontend + backend

Files (frontend): new `components/vbl/onboarding/steps/HealthInsurance.tsx`, `contexts/OnboardingContext.tsx` (SUBMIT_DETAILS_SUBSTEPS + state + loadFromClaim), `components/vbl/get-started/GetStartedOnboardingFlow.tsx` (render + saveAndAdvance), `components/vbl/onboarding/steps/ReviewSubmit.tsx`, `apps/vbl/lib/onboarding-api.ts`.
Files (backend): `packages/functions/src/drizzle/schema/claims.ts` (or wherever claim detail fields live — investigate first), claims routes/service (`packages/functions/src/routes/claims.ts`, `services/` claim service), plus a Drizzle migration via `pnpm db:generate`. Document upload reuses the existing `/documents` route pattern (like passport).

Design (July exports, this worktree):
- Entry screen `Private-Flow/VBL-23.png` — heading "Health insurance confirmation", intro "[Provider name] requires current health insurance information to process your bAV cash-out request." (substitute the actual selected provider name for "[Provider name]"), dropdown "What type of health insurance do you currently have?" (options: "Statutory health insurance / public health fund" / "Private health insurance" / "Other"), upload dropzone ("Drag and drop your file here or browse", "Accepted formats: PDF, JPG, PNG", "Health insurance card, certificate, confirmation letter or policy document").
- Confirm screen `Private-Flow/VBL-1.png`/`VBL-2.png` — heading "Confirm your health insurance details", subheading "We read these details from your document. Please check and complete any missing information.", fields: Type of health insurance (Statutory health insurance / public health fund | Private health insurance | I am not sure), Health insurance provider, Health insurance provider address, Insured since (Month/Year), Place of birth, Country of birth, Health insurance number ("…if shown on your document"). Info box: "[Provider name] requires this information for insurance reporting purposes. If your health insurance system works differently where you live now, choose the option that best matches your situation."
- Review integration `Private-Flow/VBL-24/25.png` — "Health insurance" accordion section; if incomplete: red callout "We couldn't find a completed health insurance upload or confirmation. Please review and confirm your health insurance details before submitting your request." + link "Fix health insurance details →", submit button disabled.

Requirements:
1. New substep in `SUBMIT_DETAILS_SUBSTEPS` positioned after `address` (design order: Identity, Membership, Address, Health Insurance, Bank Details, Signature, Review). Gate to the bAV/private pension type ONLY unless the Eligibility-folder July exports show health-insurance screens in the VBL/ZVK flow too (check `.superpowers/sdd/design-index.md` when dispatched; if shown there as well, enable for all types and say so in the report).
2. Three-phase component like `Identity.tsx` (upload → processing → confirm). **Client requirement (2026-07-06): the confirm form MUST be auto-populated from the uploaded document.** Backend OCR: add a health-insurance extraction following the existing `packages/functions/src/services/pension-document-extraction.ts` pattern (Mistral OCR + `mistral-large-latest` structuring; same file-type/size validation as `/vbl/extract-pension-document` in `routes/vbl.ts`). Extract: insurance type (statutory/private), provider name, provider address, insured-since month/year, place of birth, country of birth, insurance number — all nullable; unextracted fields stay empty for manual entry (design `VBL-1.png` shows exactly this partial-prefill state, subheading "We read these details from your document. Please check and complete any missing information."). Add a service-level vitest with a mocked Mistral response mirroring the existing extraction service's tests. The user can edit every prefilled field. If the user picked type manually on the entry screen (`VBL-23`) and OCR disagrees, the OCR value pre-fills but the manual choice is preserved as the selected value (user choice wins; note this in the report).
3. Backend: investigate how identity/address/bank fields are persisted on the claim record and mirror that pattern for health insurance fields (type, provider name, provider address, insuredSinceMonth, insuredSinceYear, placeOfBirth, countryOfBirth, insuranceNumber, documentId). Generate the Drizzle migration; run backend tests for the claims service you touch and your new extraction service test (`pnpm vitest run <relevant test files>` from packages/functions) — pre-existing unrelated failures are not yours. Dependencies are installed in this worktree (vitest works).
4. `loadFromClaim` restores HI fields; `saveAndAdvance` persists them; ReviewSubmit shows the section with the design's incomplete-state error and blocks submit until type + (document OR provider name) present — match `VBL-25.png` behavior.
5. Update e2e specs listing substeps if any assert the substep sequence.

## Scope watch (flag to client, do not build unrequested)

Still parked pending client confirmation: Employer confirmation substep (`Private-Flow/VBL-3.png`) and the bAV-specific SEPA/non-SEPA bank form ("Where should your bAV payout be sent?", `VBL-6.png`). Health insurance was approved 2026-07-06 → now Task 15.

## Still blocked (need assets/data from client)

- **Item 19 logo**: SummitFX logo file — client has it (pasted in chat 2026-07-06) but a pasted image is not a usable file; waiting for the PNG/SVG to be dropped in ~/Downloads. Task 8 ships a styled-text wordmark with a marked swap point meanwhile.
- **Task 1b eligibility threshold**: the bAV green/red rule needs the 2026 small-benefit ("standard") threshold from the Figma logic notes. Searched: vbl-calculation.ts, vbl-calculation-simple.ts, contributions.json, Calculator.md, all docs — not present. Per project rule (client data only, no internet/invented values), the client must supply the number (monthly-pension and/or capital-value limit). Copy/UI portions of Task 1b proceed without it; the `checkEligibility` rule lands as a follow-up once provided.
