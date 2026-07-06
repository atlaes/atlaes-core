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
4. **Item 10 (unblocked):** Update the VBL contribution-period wording to match the design: heading is "Contribution period" (not "VBL contribution period") per `app_resource/Get-Started/Public-sector-flow/VBL (91).png`, `(92).png`, `(94).png` — Read those screenshots and match heading, question copy, and option labels exactly. The design shows no info box on these screens.
5. Update e2e specs asserting public-sector waiting behavior or the info box text (`e2e/get-started/eligibility-edge-cases.spec.ts` and friends).

## Task 4: Paygate screen — remove Back, final sentence (items 11, 12)

Files: `components/vbl/onboarding/steps/Payment.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx`, `components/vbl/get-started/GetStartedLayout.tsx`.

Requirements:
1. **Item 11:** On the "Start your refund claim" (paygate) screen, remove the Back button. The back control is rendered globally (GetStartedLayout / GetStartedOnboardingFlow `handleBack`), not in `Payment.tsx` — hide it only while the paygate step is active.
2. **Item 12:** Change the final sentence (currently "Your refund will be paid directly to your own bank account." ~line 129) to exactly: `If approved, the refund will be paid directly to the bank account you provide.`
3. **Item 6 (unblocked):** The bAV flow needs its own paygate variant. Design: `app_resource/Get-Started/Private-Flow/VBL (11).png` — heading "Start your lump-sum settlement", €199 deposit, and a failure clause the standard variant lacks (€79 retained / €120 refunded if the claim fails). Read that screenshot and reproduce its copy exactly. Branch on `data.pensionType === 'private'` in `Payment.tsx`; the standard VBL/ZVK paygate (`Eligibility/VBL (27).png` — "Start your refund claim") stays as-is apart from requirements 1–2. Item 12's exact sentence applies to the standard variant; for the bAV variant use the closing sentence shown in the screenshot (if none, use item 12's sentence with "refund" → "payout").

## Task 5: Identity screen — back to upload, missing-field indicators (items 13, 25)

Files: `components/vbl/onboarding/steps/Identity.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx`.

Requirements:
1. **Item 13:** On "Confirm your identity details" (phase `confirm`), the Back button must return to the passport upload page (phase `upload`), not to the previous global step — it currently doesn't work. Wire the global back (or add a local back) so that from `confirm` it goes to `upload`. On returning to upload, clear the previously uploaded passport file so the user starts a fresh upload (client accepted either clearing or asking; decision: clear it — simpler and unambiguous). Extracted-but-confirmed data handling: keep the form data in context so re-upload re-populates/overrides.
2. **Item 25:** Make missing required fields clearly visible on the confirm form: when a required field (e.g. place of birth not extracted from the passport) is empty, show a red label + red input outline and a short "Required" hint. Apply to all required identity fields. Trigger the highlight when arriving at confirm with missing extracted data AND on attempted continue.

## Task 6: Name fields — split full name into components (item 14)

Files: `components/vbl/onboarding/steps/Identity.tsx`, `contexts/OnboardingContext.tsx`, `components/vbl/get-started/GetStartedOnboardingFlow.tsx` (saveAndAdvance ~lines 205-231), `components/vbl/onboarding/steps/ReviewSubmit.tsx`, backend investigation only.

Context: today one "Full Name" field is split on whitespace into firstName/lastName — unreliable for multi-part names, and downstream forms (claim PDFs) need accurate components.
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
4. **Item 20b (unblocked):** Replace the trusted-person info boxes with the design's content: Read `app_resource/Eligibility/VBL (36).png` (destination selection + trust warning) and `VBL (37).png` (trusted-person entry screen) and reproduce their info-box copy and structure exactly.
5. **Item 19 copy (unblocked), logo still blocked:** EUR-account screens are `app_resource/Eligibility/VBL (34).png` and `VBL (35).png` — the design labels this "Open free EUR account" (no literal "I want to open a EUR account"/"SummitFX" text found in exports). Read both screenshots and match their copy and layout intent. SummitFX logo asset does not exist in the repo — leave `// TODO(asset): SummitFX logo pending from client` where the logo would go.

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
Design note: the Stage-flow exports confirm the design splits stage details across multiple screens (`app_resource/Get-Started/Stage-flow/VBL (85)–(93).png`) — consult them for grouping/copy, but they cover the eligibility step, not this onboarding substep; the two-screen split decision above governs. No review-screen-with-stage-section export exists — the client's written item 27 list governs.
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

## Still blocked (need assets from client)

- **Item 19 logo**: no SummitFX logo asset exists in the repo or exports (screenshots may show it, but an extractable asset file is needed for production use — screenshot-cropping is a last resort; ask client for the SVG/PNG asset).
