# VBL Calculator Tester Alignment Design

**Date:** 2026-08-19
**Status:** Approved design; written specification awaiting review

## Goal

Bring the public VBL calculator and its calculator-specific onboarding flow into alignment with the tester's 17 numbered findings, while preserving calculation rules, backend contracts, and the appearance and behavior of the other onboarding funnels.

## Evidence and constraints

The source of truth is the numbered Calculator section in the tester document, its embedded screenshots, the linked Figma nodes, and the matching design screenshots in `apps/vbl/app_resource`.

The Google Drive comment connector was not authorized, so the findings were read from the publicly accessible document body and its DOCX export. Figma design context was retrieved for nodes `1428:741`, `1428:2614`, and `1858:1682` before the account reached its tool-call limit. The remaining screens are specified from the tester's embedded screenshots and the repository's matching design exports; they must not be described as directly inspected through Figma MCP.

This work changes presentation, navigation visibility, copy, form composition, and the POA signature position. It does not change refund calculations, eligibility rules, Stripe or server APIs, claim persistence, authentication, or database schemas.

## Architecture and scope boundary

The change has three deliberately separate surfaces:

1. `ManualVBLCalculator` owns findings 1–5: vertical density, introductory card styling and icons, entry-method order, sidebar descriptions, and removal of the sidebar from the final public-pension questionnaire.
2. The calculator-origin onboarding journey owns findings 6–16. It begins at `/calculator/onboarding`, but production magic-link authentication and Stripe checkout return through `/get-started`. A non-sensitive `origin: "calculator"` flow marker will therefore travel with the existing pension-type/provider identity state across those redirects. Both onboarding coordinators pass an explicit calculator variant into shared layout and step components only when that marker is present. Existing shared behavior remains the default so direct `/get-started` and private onboarding do not inherit the calculator-specific changes.
3. The POA PDF layout owns finding 17. Only the signature placement on the generated POA letter changes.

Prefer a small `variant="calculator"` prop (or an equivalent typed calculator-only option object) over route-name checks inside leaf components. Layout visibility belongs in `OnboardingLayout`; screen-specific content and validation stay in their corresponding step components.

## Tester finding matrix

| # | Required result | Primary implementation area | Verification |
|---|---|---|---|
| 1 | Calculator content sits higher on the page and is slightly larger across all calculator screens. | Reduce excessive vertical centering/padding in `ManualVBLCalculator`; apply the approved calculator type scale without changing mobile overflow behavior. | Screenshots at 390, 1024, and 1280 px; confirm headings and controls remain visible without overlap. |
| 2 | The introductory subtitle is darker, and both pension-type cards use the exact approved icons. | Introductory calculator screen and locally stored design assets. | Visual comparison with Figma node `1428:741`; asset URLs must not be used at runtime. |
| 3 | “Upload document” appears above “Enter details manually.” | Reorder the two entry-method cards while keeping their current actions. | Interaction test verifies order and that each card opens the same destination as before. |
| 4 | Sidebar steps include the approved descriptions. | `CalculatorSidebar`. | Assert: Pension Type — “Pick what you want to check.”; Details — “A few quick questions.”; Estimate — “See your estimated refund”. |
| 5 | The sidebar is absent on “A few more details about your public-sector pension.” | Final public-pension questionnaire layout. | Assert no sidebar and a centered, bounded questionnaire matching node `1858:1682`. |
| 6 | Calculator payment screen has no Back control; uses “Deposit — credited...” styling; uses the revised refund sentence; displays the correct Stripe/payment icons; and requires both legal checkboxes. | Calculator variant of `Payment`. | Copy/icon assertions; checkout remains disabled and no checkout request occurs until both checkboxes are selected. |
| 7 | Identity uses one Full Name field and one Date of Birth field and removes the passport helper. | Calculator variant of `Identity`. | Field-count, validation, and mapping tests. |
| 8 | Main and substep navigation use the approved icons. | Calculator variant in `OnboardingLayout` and its icon component/assets. | Visual comparison with node `455:19031` screenshot and accessible-label assertions. |
| 9 | Review screen is titled “Review”; green section backgrounds are removed; icons match the design; all “Edit information” actions are underlined; CTA reads “Continue to declarations.” | Calculator variant of `ReviewSubmit`. | DOM assertions plus screenshot comparison at mobile and desktop widths. |
| 10 | Bank details display `Scheme:` above the account holder. | Review bank-details section. | Assert label order and the currently selected scheme value. |
| 11 | Confirm information omits Important Declaration and CompanyPension authorization. | Calculator variant of `ConfirmStep`. | Assert both sections and their eight checkboxes are absent; the four stop-answer questions remain. |
| 12 | Changing a stop-answer to Yes shows the approved confirmation modal. | Calculator variant of the Yes-answer confirmation. | Test opening, cancelling, and confirming the modal against the `1881:1153` screenshot. |
| 13 | A confirmed Yes displays the approved stopped screen: no identity-through-signature substep navigation, “claimed” copy, no refund-to-payment-method sentence, and a left arrow before “Return to start.” | Calculator terminal/stopped state and layout visibility. | Assertions for hidden substeps, exact copy, removed copy, arrow, and return action. |
| 14 | Signature screen follows the approved layout. | Calculator variant of the signature step. | Visual and interaction comparison with the `455:20172` screenshot, including signature capture and continue state. |
| 15 | Sign & Submit hides substep navigation, uses the approved icons, and says: “Once your refund is approved, we’ll notify you so you can download the official refund statement and settle any remaining service fee.” | Calculator completion/success screen and layout visibility. | Exact copy/icon assertions and screenshot comparison with node `1600:445`. |
| 16 | Later-pension copy says “Later, you may also be able to claim a German state pension refund,” and “No thanks” is black. | Calculator completion/success screen. | Exact copy and computed-style assertion for the secondary action. |
| 17 | The signature appears on the left side of the generated POA letter rather than at the far right. | `packages/functions/src/services/claim-pdf/poa-letter.ts`. | Plan-level geometry test and rendered-PDF inspection. |

## Component behavior and data mapping

### Calculator presentation

The higher placement is a layout change, not a fixed pixel translation. The calculator shell will use a smaller top gap and content-led vertical alignment. Widths remain bounded so the larger type does not reduce readability or create horizontal scrolling.

Exact design assets retrieved from Figma must be downloaded into the VBL public asset tree and referenced locally. For screens whose Figma assets could not be retrieved because of the tool limit, an existing project icon may be reused only when its glyph visually matches the tester screenshot. Do not draw replacement SVG paths by hand.

### Calculator-only onboarding variant

The shared components retain their current behavior when no variant is passed. `/calculator/onboarding` opts into the calculator variant directly and records the calculator origin alongside the existing non-sensitive flow identity. When authentication or payment returns through `/get-started`, that flow reads the marker and keeps the same variant until completion or an explicit restart clears all flow persistence. This variant controls:

- payment content, legal gates, and Back-button visibility;
- identity field composition;
- navigation icons and per-screen progress visibility;
- review, confirmation, signature, stopped, and completion presentation.

The stopped and final Sign & Submit screens hide the identity-to-signature substep row while retaining the appropriate main-stage context shown in the design assets. Other onboarding routes keep their present navigation.

### Full name and date of birth

The UI collects a trimmed Full Name. Validation requires at least two non-empty whitespace-separated parts. The last part maps to the existing `lastName` field; all preceding parts map to `firstName`, preserving multi-part given names without a backend schema change. A single-token name produces an inline error and cannot continue.

Date of Birth is collected with one accessible date control. A valid selected date maps to the existing ISO `dateOfBirth` value (`YYYY-MM-DD`). Invalid, incomplete, future, or under-18 dates produce an inline error and cannot continue. Existing server payloads remain unchanged.

### Payment declarations

The two payment declarations are calculator-screen UI gates. Both must be selected before payment can begin. Their state is local to the payment step and is reset with that screen's lifecycle. They are not persisted, audited, or added to any claim, payment, or database contract as part of this work.

The first declaration links “Terms and Conditions” and “Privacy” to the application's existing canonical legal routes. The second declaration is plain text. Existing Stripe request, loading, success, and failure behavior remains intact.

### Confirm information and stop flow

Only the four answers that determine whether the calculator flow must stop remain on the calculator confirmation screen. The later Important Declaration and CompanyPension authorization sections are removed only from the calculator variant.

Selecting Yes first opens the approved modal. Cancelling leaves the answer unchanged and does not invoke the stop transition. Confirming records Yes and enters the stopped state. Any existing parent-level failure handling remains responsible for reporting a failed transition without discarding the user's answers.

### POA signature placement

The POA date stays at the left margin. The signature image is placed beside it within the left half of the page instead of being right-aligned. Its x-coordinate is derived from the date text width plus a small gap and capped so the signature's right edge does not cross the page midpoint. This keeps the signature visually associated with the date and signatory label while remaining stable for different date strings and signature aspect ratios.

## Error handling and accessibility

- Invalid name or birth date shows an inline error, moves focus to the invalid control through the existing form behavior, and makes no navigation or API request.
- Attempting payment before both declarations are selected keeps checkout disabled and makes no Stripe request.
- Payment failures preserve the user's current form state and use the existing error surface.
- Modal cancel and close actions are equivalent, restore focus to the triggering Yes control, and do not stop the application.
- Icon-only controls retain accessible names; decorative icons are hidden from assistive technology.
- Keyboard focus order follows visual order after the entry cards and form fields are rearranged.

## Testing and verification strategy

Implementation will follow test-driven development: update or add the smallest failing test for each behavior group before changing production code.

1. Extend the manual-calculator browser tests for findings 1–5, including card order, sidebar descriptions, sidebar removal, and responsive geometry.
2. Add calculator-onboarding coverage for findings 6–16. Keep the existing `/get-started` full-flow expectations unchanged to prove that the variant boundary works.
3. Unit-test the extracted Full Name and Date of Birth mapping helpers, including whitespace, multi-part names, single-token rejection, invalid dates, and future dates.
4. Test payment gating by proving zero checkout calls with zero or one checkbox selected and exactly one call after both are selected.
5. Test review, confirmation modal, stopped state, signature, and completion copy and navigation visibility separately so a failure identifies the affected screen.
6. Add a POA layout-plan unit test that places the signature after the date and entirely before the page midpoint. Render a representative claim PDF and inspect the relevant page visually.
7. Run the focused unit/browser suites first, then the VBL typecheck and broader affected regression suites. Finish with clean test output and `git diff --check`.

## Out of scope

- Refund formulas, vesting rules, eligibility decisions, or estimate values.
- New Stripe endpoints, payment semantics, or payment-provider configuration.
- Persisted consent or legal audit records.
- Database migrations or server payload changes.
- Visual or behavioral changes to `/get-started`, private onboarding, or unrelated applications.
- Deployment, branch publication, or pull-request creation.
- Refactoring shared onboarding beyond what is needed for a typed calculator variant.

## Acceptance criteria

The work is complete when every numbered tester finding has a corresponding passing automated check or documented visual verification, the calculator matches the supplied designs at representative mobile/tablet/desktop widths, the generated POA signature is visibly left-positioned, and regression tests demonstrate that the other onboarding funnels retain their existing behavior.
