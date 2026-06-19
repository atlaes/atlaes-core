# CompanyPension Client QA Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the June client testing notes into a testable fix sequence for the CompanyPension calculator, get-started eligibility flow, and post-payment claim flow.

**Architecture:** Keep the fix scoped to the existing VBL/CompanyPension surfaces: calculator result routing in `apps/vbl/components/vbl/steps`, get-started eligibility in `apps/vbl/components/vbl/get-started`, onboarding state/screens in `apps/vbl/components/vbl/onboarding`, and backend claim/document/email validation in `packages/functions/src`. Do not introduce a new flow engine; centralize small shared constants/helpers only where two existing screens need the same rule.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind, Playwright, Hono, Drizzle, Vitest, Stripe, SES, Mindee OCR, Google Places.

---

## Current Read

The branch is clean and already includes some previous Group C work:

- Calculator to onboarding bridge and private result routing exists in `apps/vbl/components/vbl/steps/Results.tsx`.
- Pending calculator session hydration exists in `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`.
- Google Places hook exists in `apps/vbl/hooks/useGooglePlacesAutocomplete.ts`, but it is inactive without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Edit-from-review exists in `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`, but not in `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx`.
- Membership provider locking exists for generic/public providers in `apps/vbl/components/vbl/onboarding/steps/Membership.tsx`, but VddB/VddKO currently jump straight into stage/orchestra details and skip membership number entry.
- Magic-link email is still ATLAES-branded in `packages/functions/src/services/email.ts`.

Known risk: some existing Playwright tests encode old behavior. For example, `apps/vbl/e2e/get-started/eligibility-public-sector.spec.ts` expects a consecutive-contribution "Yes" answer to reject immediately, while the client now says this should depend on whether the employment end date is before 2018.

## Dependency Register

| Dependency | Owner | Blocks | Required decision or asset |
|---|---|---|---|
| Final CompanyPension logo | Maria | #14, #15 | Logo file and whether the same asset is used in calculator/onboarding/email |
| Figma bank-account update | Maria/Figma | #30 | Final 3-path bank screen copy and layout |
| Figma copy pass | Maria/Figma/client | #12, #16, #18, #21a, #24, #28, #38, #39 | Exact wording for subheads, info boxes, upload document, DRV/state-pension upload screen |
| East-state rejection rule | Client | #2, #3 | Confirm whether rejection applies only to Berlin (East) or to all eastern federal states currently listed in code |
| Hamburg provider rule | Client | #3 | Confirm whether "Hamburgisches Zusatzversorgungsgesetz" is selectable as a provider and whether VBL must be removed for Hamburg |
| Google Places key | Ops/client | #29 | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to the VBL staging/prod env |
| SES sender identity | Ops/client | #15 | Verify `noreply@companypension.de` in SES and set `SES_FROM_EMAIL` |
| OCR test samples | Client/internal QA | #21b, #31 | Valid adult passport/ID, under-18 document, unreadable/non-ID sample |
| Mindee config | Ops | #21b, #31 | Confirm `MINDEE_API` is set in staging and custom model returns required fields |
| Stripe/payment env | Ops | #17, #19 | Staging Stripe checkout return and webhook/verify-session paths working |

## Fix Order

### Task 1: Lock The QA Matrix Before Code Changes

**Files:**
- Modify: `apps/vbl/e2e/get-started/eligibility-public-sector.spec.ts`
- Modify: `apps/vbl/e2e/get-started/eligibility-private-sector.spec.ts`
- Modify: `apps/vbl/e2e/get-started/eligibility-stage.spec.ts`
- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts`
- Modify: `apps/vbl/e2e/calculator-to-onboarding-bridge.spec.ts`
- Modify: `packages/functions/src/services/claims-application.test.ts`
- Modify: `packages/functions/src/routes/auth.test.ts`

- [ ] Replace old "consecutive yes rejects" expectation with two tests: end date before January 2018 continues; any 2018-or-later end date rejects.
- [ ] Add provider-list tests per state for the get-started public-sector provider screen.
- [ ] Add bAV calculator result tests for positive private result CTA routing into onboarding.
- [ ] Add post-payment resume test: paid claim refresh returns to the first incomplete submit-details substep, not "What do you want to start".
- [ ] Add backend validation tests for submit-claim missing passport number, missing passport document, missing signature, and under-18 identity rejection.

Run:

```bash
pnpm --filter functions test:run -- claims-application.test.ts auth.test.ts
pnpm --filter vbl exec playwright test e2e/get-started/eligibility-public-sector.spec.ts e2e/get-started/onboarding-full-flow.spec.ts e2e/calculator-to-onboarding-bridge.spec.ts
```

Expected before implementation: new tests fail on the client-reported gaps.

### Task 2: Unblock bAV Entry And Result CTAs

**Client items:** screenshot CTA issue, #9a, #9b, #10, #11, #40

**Files:**
- Modify: `apps/vbl/components/vbl/steps/Results.tsx`
- Modify: `apps/vbl/components/vbl/steps/JobDetails.tsx`
- Modify: `apps/vbl/components/vbl/steps/PrivateOptionalDetails.tsx`
- Modify: `apps/vbl/hooks/useVBLCalculator.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/PensionTypeSelection.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`

- [ ] Verify every positive/private bAV result screen uses a primary CTA that calls `handleStartClaim('private')`; no positive bAV result may show "Go back and edit answers" as the primary action.
- [ ] Keep rejection CTAs only on true rejection screens such as `private_appears_unlikely`, `vested`, and `not_eligible_vesting`.
- [ ] Default "What do you want to start" to bAV/private when both sides are present and private was the side clicked from the calculator.
- [ ] Preserve non-default selection when navigating back from details to pension-type selection.
- [ ] Remove the "Not sure" route from bAV where the client asked for it removed.
- [ ] Implement the explicit rejection: statutory pension refund "No" plus "I can't find either" on `PrivateOptionalDetails` shows a rejection screen.

Verification:

```bash
pnpm --filter vbl exec playwright test e2e/calculator-to-onboarding-bridge.spec.ts e2e/get-started/eligibility-private-sector.spec.ts
```

### Task 3: Fix Get-Started Public-Sector Eligibility Rules

**Client items:** #1, #2, #3, #4, #5, #6, #7

**Files:**
- Modify: `apps/vbl/components/vbl/get-started/flows/index.ts`
- Modify: `apps/vbl/components/vbl/get-started/flows/public-sector.ts`
- Modify: `apps/vbl/components/vbl/get-started/steps/FederalState.tsx`
- Modify: `apps/vbl/components/vbl/get-started/steps/PensionProvider.tsx`
- Modify: `apps/vbl/components/vbl/get-started/steps/EmploymentEndDate.tsx`
- Modify: `apps/vbl/components/vbl/get-started/steps/ContributionPeriod.tsx`
- Modify: `apps/vbl/contexts/EligibilityContext.tsx`

- [ ] Keep Berlin (West) and Berlin (East) as separate choices.
- [ ] Apply the client-confirmed east-state rejection rule after resolving the ambiguity in the dependency register.
- [ ] Replace the generic `VBL/ZVK/VddB/VddKO` public provider dropdown with state-based options.
- [ ] Use the exact provider selected in all downstream dynamic copy.
- [ ] Add the 24-month info box to "When did this employment end".
- [ ] Block future employment end dates with an inline required/validation error.
- [ ] Change VBL contribution-period logic so "Yes" is not automatically rejected; reject only if the selected end date is in January 2018 or later.

State-provider mapping to implement after client confirms wording:

```ts
const PUBLIC_PENSION_BY_STATE = {
  'Baden-Wurttemberg': ['VBL', 'ZVK (KVBW)'],
  Bavaria: ['VBL', 'ZVK (BayZVK / BVK)'],
  'Berlin (West)': ['VBL'],
  'Berlin (East)': ['VBL'],
  Brandenburg: ['VBL', 'ZVK (KVBbg)'],
  Bremen: ['VBL'],
  Hamburg: ['Hamburgisches Zusatzversorgungsgesetz'],
  Hesse: ['VBL', 'ZVK Darmstadt', 'ZVK Kassel (KVK)', 'ZVK Wiesbaden (KDZ)', 'ZVK Frankfurt am Main'],
  'Mecklenburg-Western Pomerania': ['VBL', 'ZVK (KVV M-V)'],
  'Lower Saxony': ['VBL', 'ZVK Hannover'],
  'North Rhine-Westphalia': ['VBL', 'RZVK Koeln', 'kvw Muenster', 'ZVK Koeln'],
  'Rhineland-Palatinate': ['RZVK Koeln', 'BayZVK', 'ZVK Darmstadt', 'ZVK Wiesbaden'],
  Saarland: ['VBL', 'RZVK Saar'],
  Saxony: ['VBL', 'ZVK Sachsen'],
  'Saxony-Anhalt': ['VBL', 'ZVK (KVSA)'],
  'Schleswig-Holstein': ['VBL'],
  Thuringia: ['VBL', 'ZVK (KVT)'],
};
```

Use ASCII slugs internally if needed, but display client-facing labels exactly as Figma/client copy requires.

Verification:

```bash
pnpm --filter vbl exec playwright test e2e/get-started/eligibility-public-sector.spec.ts
```

### Task 4: Align VddB/VddKO Entry And Post-Payment Details

**Client items:** #12, #13, #35, #36, #37

**Files:**
- Modify: `apps/vbl/components/vbl/get-started/steps/StagePensionDetails.tsx`
- Modify: `apps/vbl/components/vbl/get-started/flows/stage.ts`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Membership.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/StageMembershipDetails.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/ReviewSubmit.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx`

- [ ] Add missing subheading to select-state/orchestra screens from Figma.
- [ ] Confirm Figma screen 4a ordering and route VddB/VddKO provider selection to the correct next screen, currently expected as 4c.
- [ ] Do not skip membership number for VddB/VddKO. Capture selected provider, membership number, then stage/orchestra employment details.
- [ ] Replace native `type=date` in stage/orchestra employment end with the shared day/month/year component from Task 5.
- [ ] Make review "Pension details" edit return to the exact relevant screen, not always stage/orchestra details.

Verification:

```bash
pnpm --filter vbl exec playwright test e2e/get-started/eligibility-stage.spec.ts e2e/get-started/onboarding-full-flow.spec.ts
```

### Task 5: Fix Identity Upload, DOB, OCR, And Age Validation

**Client items:** #18, #19, #20, #21a, #21b, #22, #23, #31, #32

**Files:**
- Create: `apps/vbl/components/vbl/onboarding/DateOfBirthFields.tsx`
- Modify: `apps/vbl/contexts/OnboardingContext.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Identity.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/ReviewSubmit.tsx`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx`
- Modify: `apps/vbl/lib/onboarding-api.ts`
- Modify: `packages/functions/src/routes/documents.ts`
- Modify: `packages/functions/src/services/mindee.ts`
- Modify: `packages/functions/src/services/claims-application.ts`

- [ ] Make the entire upload dropzone clickable, not just the `browse` label.
- [ ] Persist uploaded document/claim attachment immediately after upload so refresh resumes correctly.
- [ ] Replace all DOB fields with day input, month-name dropdown, and 4-digit year input.
- [ ] Store API date as `YYYY-MM-DD`, display confirmed DOB as `DD Month YYYY`, and show helper text "Use the date of birth shown on your passport."
- [ ] Validate no future DOB, valid calendar date, 4-digit year, and minimum age 18.
- [ ] Treat unreadable/non-passport OCR results as a blocking error when the client requires rejection; otherwise require manual fill for missing optional passport fields.
- [ ] Require passport number, nationality, and place of birth for review/submission; place of birth can be manually filled when OCR returns empty.
- [ ] Fix get-started back link behavior on confirm-your-details.
- [ ] Add `nationality` and `placeOfBirth` to review Personal information.

Backend validation rule:

```ts
const ageAtToday = calculateAge(dateOfBirth);
if (ageAtToday < 18) errors.push('Applicant must be at least 18 years old');
if (!claim.nationality) errors.push('Nationality is required');
if (!claim.placeOfBirth) errors.push('Place of birth is required');
```

Verification:

```bash
pnpm --filter functions test:run -- claims-application.test.ts
pnpm --filter vbl exec playwright test e2e/get-started/onboarding-full-flow.spec.ts e2e/onboarding-edge-cases.spec.ts
```

### Task 6: Fix Claim Save/Resume, Progress, And Submit 400

**Client items:** #17, #19, #33, #34

**Files:**
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedLayout.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingLayout.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Payment.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/ReviewSubmit.tsx`
- Modify: `apps/vbl/lib/onboarding-api.ts`
- Modify: `packages/functions/src/services/claims-application.ts`
- Modify: `packages/functions/src/routes/claims.ts`
- Modify: `packages/functions/src/services/payment.ts`

- [ ] After payment, progress shows Check and Secure Claim complete, active step "Complete Details", not "Sign and Submit".
- [ ] On refresh, authenticated paid users with `vbl_draft_claimId` or a paid claim resume to the first incomplete substep.
- [ ] Add `editingFromReview` behavior to `GetStartedOnboardingFlow`, matching `OnboardingFlow`.
- [ ] Before submit, save and attach current identity, membership, address, bank, signature, and document data deterministically.
- [ ] Surface backend validation errors in Review instead of only showing "Request failed with status code 400".
- [ ] Align frontend `canProceedFromSubStep` with backend `validateForSubmission` so Review cannot be reached with data that backend will reject.

Verification:

```bash
pnpm --filter functions test:run -- claims-application.test.ts routes/claims.test.ts
pnpm --filter vbl exec playwright test e2e/get-started/onboarding-full-flow.spec.ts
```

### Task 7: Finish Membership, Address, And Bank Details Screens

**Client items:** #24, #25, #26, #27, #28, #29, #30

**Files:**
- Modify: `apps/vbl/components/vbl/onboarding/steps/Membership.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Address.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/steps/BankDetails.tsx`
- Modify: `apps/vbl/contexts/OnboardingContext.tsx`
- Modify: `apps/vbl/hooks/useGooglePlacesAutocomplete.ts`
- Modify: `apps/vbl/lib/countries.ts`

- [ ] Apply Figma wording for membership and address.
- [ ] Replace every visible "VBL" in membership with the selected provider label.
- [ ] Keep selected provider read-only; user enters only membership number on that screen.
- [ ] Remove any accidental external link behavior from the membership number field.
- [ ] Activate Google Places once `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is present.
- [ ] Rebuild bank details as one first selection screen, then route to exactly one relevant form: own bank account, open account, or third-party account.
- [ ] Keep IBAN/account-holder validation consistent between own and third-party account paths.

Verification:

```bash
pnpm --filter vbl exec playwright test e2e/get-started/onboarding-full-flow.spec.ts e2e/onboarding-edge-cases.spec.ts
```

### Task 8: Rebrand Logo And Magic-Link Email

**Client items:** #14, #15

**Files:**
- Modify: `apps/vbl/components/vbl/icons/CompanyPensionLogo.tsx`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedLayout.tsx`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingLayout.tsx`
- Modify: `apps/vbl/app/auth/page.tsx`
- Modify: `apps/vbl/app/auth/magic-link/page.tsx`
- Modify: `packages/functions/src/services/email.ts`
- Modify: `packages/functions/src/utils/env.ts`
- Modify: `env.example`

- [ ] Replace temporary logo with Maria-approved final CompanyPension logo.
- [ ] Use sender source `CompanyPension <noreply@companypension.de>`.
- [ ] Subject: `Your secure CompanyPension sign-in link`.
- [ ] Email H1: `Sign in to your secure claim`.
- [ ] Button: `Open secure claim`.
- [ ] Footer company line: `CompanyPension is operated by ATLAES GmbH.`
- [ ] Footer copyright: `&copy; ATLAES GmbH` in HTML.
- [ ] Add tests asserting subject, source, plain-text body, and HTML body contain the required copy.

Verification:

```bash
pnpm --filter functions test:run -- auth.test.ts
```

### Task 9: Upload-Document Flow And DRV Upload Screen

**Client items:** #38, #39

**Files:**
- Inspect first: `apps/vbl/components/vbl/steps/*`
- Inspect first: `apps/vbl/components/vbl/onboarding/steps/*`
- Modify the actual upload-document flow files after locating the route/screen from Figma or current app navigation.

- [ ] Locate the upload-document flow entry point in the current app.
- [ ] Apply Figma wording/design to "We found these details in your document".
- [ ] Reuse the improved German State pension refund upload design in both answer-question and upload-document flows.
- [ ] Add a Playwright smoke test once the route is confirmed.

Verification:

```bash
rg -n "We found these details|German State pension|upload document" apps/vbl
pnpm --filter vbl exec playwright test e2e
```

## Testing Sequence For Staging

1. Ship Task 1 through Task 3 first so the client can retest manual eligibility and bAV entrance.
2. Ship Task 4 through Task 6 next so post-payment manual flows can be tested end to end.
3. Ship Task 7 bank changes only after Maria finishes Figma #30.
4. Ship Task 8 once Maria/Ops provide logo and SES sender confirmation.
5. Ship OCR-specific checks only after Mindee/env and test samples are confirmed.

Full local verification before staging:

```bash
pnpm --filter functions test:run
pnpm --filter vbl build
pnpm --filter vbl exec playwright test e2e/get-started e2e/calculator-to-onboarding-bridge.spec.ts e2e/onboarding-edge-cases.spec.ts
```

## Client-Facing Status Summary

Can start now:

- bAV positive-result CTAs and entrance.
- Public-sector state/provider/end-date/contribution logic after the East-state clarification.
- Upload field click target, DOB component, Review edit return, submit 400 surfacing.
- VddB/VddKO membership-number and review routing.

Needs dependency:

- Final bank flow design from Figma/Maria.
- Final CompanyPension logo and email sender domain.
- Google Places API key in staging/prod.
- OCR samples plus Mindee staging config.
- Exact Figma wording for several subheads/info boxes.
