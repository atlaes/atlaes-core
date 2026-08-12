# VBL Refund Figma Alignment Design

## Goal

Make `/vbl-refund` match the approved Figma frame `1244:3166` while preserving
the current route, copy, accessibility structure, and responsive behaviour.

## Source of truth

The supplied Figma frame is authoritative for section order, backgrounds,
layouts, imagery, card count, and desktop CTA dimensions. Existing application
copy remains authoritative where the frame does not expose a copy change.

## Chosen approach

Apply a complete page-local alignment pass. Remove the section that does not
exist in Figma, correct every mismatched section band and split layout, restore
the missing pension-type card, and replace the duplicated process step with the
distinct step shown in the design.

This is preferable to a minimal patch because the staging comparison revealed
several related structural errors. It is also safer than a shared marketing
redesign: shared components will retain their current defaults, and any needed
variant will be opt-in.

## Page structure

The page will follow this sequence:

1. Hero.
2. VBL refund eligibility.
3. VBLklassik product qualifier.
4. Who the service is for.
5. VBL refund explanation.
6. VBLklassik, VBLextra, and unsure comparison cards.
7. Eligible situations.
8. Ineligible situations.
9. ZVK contribution periods.
10. VBL West and East rules.
11. Refund amount.
12. VBL and DRV comparison.
13. Returning to public service.
14. Eight-step refund process.
15. Required documents.
16. Bank-account requirements.
17. Pricing.
18. Direct payment.
19. Why use the service.
20. Glossary.
21. FAQ.
22. Two important-information bands.
23. Closing action and footer.

The current “Made for people who no longer want to deal with German paperwork”
section will be removed because it is absent from the approved frame.

## Visual treatment

- Eligibility uses the pale photographic treatment and the approved 564 by 63
  pixel desktop action.
- “Built for VBLklassik” uses the neutral-grey band.
- “Who this is for” uses a white split layout with checklist content on the
  left and the approved working-at-a-laptop image on the right.
- The product-type section presents three equal cards: VBLklassik, VBLextra,
  and “Not sure which one you had?”.
- Eligible and ineligible situations use the Figma pale green and pale red
  treatments, including their supporting imagery and positive/negative marks.
- The remaining light bands alternate exactly as shown in Figma. The second
  important-information band is white.
- Dark-green explanation, process, bank, pricing, closing, and footer bands
  retain the established VBL marketing treatment.

Images will reuse approved repository assets when they match the frame. If an
exact source asset is unavailable, the implementation may export only the
required image layer from the supplied Figma file; section content must remain
semantic HTML rather than a flattened screenshot.

## Component boundaries

Most changes remain in the VBL Refund page. A shared component may receive an
optional visual-tone prop only when the page needs a Figma variant that the
component currently cannot express. Existing callers and defaults must remain
unchanged.

## Accessibility and responsive behaviour

- Preserve semantic headings, links, tables, and list content.
- Use meaningful alternative text for informative imagery and empty text for
  decorative imagery.
- Preserve visible keyboard focus styles.
- Convert desktop split layouts to single-column mobile layouts without
  horizontal overflow at 390 pixels.
- Keep exact desktop CTA widths responsive through full-width mobile styles.

## Regression and visual verification

Extend the VBL Refund Playwright spec before changing page code. The regression
contract will cover the removed section, section order and colours, the three
product-type cards, the corrected eight-step process, the split-layout image,
and the approved CTA dimensions.

Run the focused VBL Refund spec first, then the complete marketing suite, VBL
lint, type checks where configured, and the production build. Finish with
desktop and mobile browser comparisons against the supplied Figma frame and
check for unloaded images, clipped content, and horizontal overflow.

## Non-goals

- No eligibility, pension, pricing, or application-flow logic changes.
- No rewrite of approved marketing copy except the duplicated process step.
- No changes to unrelated marketing pages.
- No production deployment as part of this code fix.
