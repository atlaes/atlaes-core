# Marketing Tester Fixes Design

## Goal

Bring the confirmed staging discrepancies from the August 2026 tester document
into alignment with the Company Pension Figma designs without changing
unrelated marketing copy, routes, or application behaviour.

## Scope

The implementation covers only defects that were confirmed against both the
current staging site and the tester/Figma evidence:

- Refund Calculator: remove the two rejected content sections; restore the
  specified pill and CTA dimensions; move the pricing actions and direct-payout
  explanation outside the pricing card.
- About: correct number colour and supported-claims CTA size.
- Reviews: make both dark-band actions 345 by 63 pixels on desktop.
- Pricing: constrain and centre the example note.
- VBL Refund: make the eligibility CTA 564 by 63 pixels on desktop.
- ZVK Refund: restore the dark/light band pattern shown in Figma.
- Direktversicherung Cash-out and Company Pension Cash-out: complete the
  section-level dark/light band pass that commit `ebf67ae` explicitly left
  pending.

`/vddb-vddko-refund` and `/company-pension-vs-drv` are excluded because the
audit found no specific reproducible defect beyond a request for another visual
review.

## Chosen approach

Use targeted page-local layout changes, with small shared-component extensions
only when an existing component already owns the relevant visual behaviour.
Exact desktop widths will remain responsive through `w-full` plus a `sm:` or
`max-w-*` constraint, so the corrections do not create mobile overflow.

This approach is preferred over a broad shared-button rewrite because most
marketing CTAs already match their designs and changing their default sizing
would regress unrelated pages. It is also preferred over recreating entire
pages from Figma because the current copy, navigation, accessibility structure,
and most sections are already correct.

## Page design details

### Refund Calculator

Delete the complete “Made for people who no longer want to deal with German
paperwork” section and the late “A digital application platform, not pension
advice” callout. Keep the footer legal copy unchanged.

The “Your next step” pill will be 228 by 40 pixels on desktop. Its primary CTA
will be 369 by 63 pixels. In the pricing band, the two 355 by 63 pixel actions
will sit below the translucent pricing card. The direct-payout paragraph will
also sit outside the checklist card, immediately before those actions.

### About, Reviews, Pricing, and VBL Refund

These are exact visual corrections rather than component redesigns. About
numbers use `#5c5c5c` and the supported-claims CTA becomes 461 by 63 pixels.
Reviews receives two equal 345 by 63 pixel actions. Pricing’s example note is
constrained to 951 by 46 pixels at desktop and centred. VBL Refund’s eligibility
CTA becomes 564 by 63 pixels.

### Product-page section bands

The process and pricing sections on ZVK, Direktversicherung, and Company
Pension Cash-out will adopt the same established dark-band treatment used by
VBL Refund and Cash-outs & Refunds: brand-green outer section, accent/white
heading treatment, translucent inner cards, and dark-tone checks and step
cards. Other light informational sections remain unchanged.

The ZVK split-layout illustrations are not defects. They are lazy-loaded Next
images: a direct staging check confirmed that the apparently blank panels load
their 1122 by 1402 pixel assets after the section enters the viewport. The
existing illustration columns and assets remain unchanged.

## Accessibility and responsive behaviour

- Preserve semantic links, heading order, and visible focus styles.
- Use `w-full` with desktop maximum widths instead of fixed widths below the
  small breakpoint.
- Keep text wrapping available on narrow viewports.
- Do not introduce horizontal overflow at 390 or 1440 pixels.
- Decorative icon changes remain hidden from assistive technology.

## Regression strategy

Extend the existing Playwright marketing specs. Each affected route will assert
the required content presence/absence, exact desktop bounding boxes with a
small rendering tolerance, and the expected section background treatment.
Product-page tests will scroll the ZVK illustration sections into view and
assert that the design assets finish loading with non-zero intrinsic sizes.

Verification consists of the focused marketing specs at desktop and mobile,
the VBL lint/build commands, and browser screenshots for the affected pages.

## Non-goals

- No copy rewrite beyond moving already-approved text.
- No calculator or eligibility logic changes.
- No deployment, push, or pull request creation.
- No speculative changes to pages that only need another visual review.
