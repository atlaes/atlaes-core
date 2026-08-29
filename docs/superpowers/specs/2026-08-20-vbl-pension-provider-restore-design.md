# VBL Pension Provider Restore Design

**Date:** 2026-08-20
**Status:** Approved design; written specification awaiting review

## Goal

Keep the calculator-selected pension provider, such as `VBLklassik`, when `/calculator/onboarding` starts without a pending-session token. The locked provider field on Pension details must display that value, and Continue must become available after the user enters the required membership number.

## Confirmed failure

The calculator onboarding coordinator writes `vbl_flow_identity_v1` as soon as it mounts. Its first React render contains an empty pension type and provider. On the tester and legacy no-session path, that write replaces an existing calculator identity before the coordinator restores it.

The failure was reproduced on current staging. A seeded identity containing `pensionType: "public"` and `pensionProvider: "VBLklassik"` became `pensionType: ""` and `pensionProvider: ""` after navigation to `/calculator/onboarding`.

This is a second trigger for the earlier visible symptom. The server-session and magic-link restoration fix remains valid, but its existing regression test does not cover a no-session calculator entry that begins with a saved local identity.

## Selected approach

Resolve calculator identity before enabling write-through persistence.

`OnboardingFlow` will treat calculator identity resolution as a short initialization phase. It will check sources in this order:

1. A valid pending calculator session from `?session=`.
2. The legacy `sessionStorage['calculator-selection']` payload.
3. An existing `vbl_flow_identity_v1` value whose origin is `calculator`.
4. Empty state for a genuinely new calculator choice.

When a source contains a provider or pension type, the coordinator will hydrate the matching onboarding state first. It will enable identity writes only after source resolution completes. The account and payment flow will therefore persist resolved values instead of the initial empty render.

The provider remains read-only on Pension details. Adding an editable fallback would hide the state defect and conflict with the approved design.

## Alternatives rejected

### Merge every identity write with local storage

Merging missing fields into every write would preserve the provider in this case, but it could also carry a provider from an obsolete journey into a new claim. Persistence should record resolved flow state, not guess whether each empty field is intentional.

### Read local storage only inside Membership

This would repair the visible field but leave upstream state, payment seeding, review data, and claim submission inconsistent. The coordinator must restore the provider before downstream steps consume it.

### Make the provider editable

The field is intentionally locked because the calculator or eligibility flow already selected the institution. A picker would change approved behavior and make users repair an application-state failure themselves.

## State and rendering behavior

- Direct `/get-started` behavior remains unchanged.
- Calculator entries with a valid pending-session token continue to use the server result as the primary source.
- Legacy entries continue to use `calculator-selection` when present.
- Tester or resumed calculator entries without either source restore a calculator-origin local identity.
- A new calculator entry with no usable source may continue to the existing pension-type choice.
- The initialization phase must not expose a brief actionable account screen backed by unresolved identity state.
- Completion and explicit restart keep their current cleanup semantics.

## Error handling

A failed or malformed pending-session response falls through to the existing legacy and local-identity sources. Malformed storage values are ignored. Storage remains best-effort; the flow must not crash when browser storage is unavailable.

## Test strategy

Implementation will follow test-driven development.

1. Extend the calculator onboarding edge-case coverage with a no-session entry seeded only through `vbl_flow_identity_v1`.
2. Prove the current code fails because mounting `/calculator/onboarding` replaces `VBLklassik` with an empty provider.
3. After the fix, prove the identity remains calculator-origin and contains `public` plus `VBLklassik`.
4. Drive the mocked authenticated and payment-return flow to Pension details.
5. Assert the locked field displays `VBLklassik`, entering a membership number enables Continue, and no provider picker appears.
6. Re-run the server-session calculator bridge suite to protect the earlier magic-link fix.
7. Run VBL TypeScript validation and `git diff --check`.

## Scope boundary

This change affects calculator identity initialization, its focused browser tests, and no other behavior. It does not change Membership presentation, payment semantics, API contracts, database schemas, calculator results, direct `/get-started` flows, deployment, or branch publication.

## Acceptance criteria

The no-session calculator path preserves its selected provider from mount through the post-payment Pension details screen. The read-only field shows `VBLklassik`, a valid membership number enables Continue, existing calculator-session restoration still passes, and direct onboarding behavior remains unchanged.
