# Get Started — first-screen design QA

## Comparison target

- Source: [Figma node 454:10146](https://www.figma.com/design/mO3AWonbCFSZFxXhFUDuMt/VBL?node-id=454-10146&t=QYHKyY7xZkkzGJCk-0), `1260 × 1024` canvas.
- Implementation: browser-rendered `/get-started` at `http://localhost:3002/get-started`, captured in the Codex in-app browser at `1280 × 720` CSS px, device scale factor `1`.
- State: initial pension-type selection. The Figma frame is a VBL/ZVK-selected static state; the product preserves the established bAV default selection so a new visitor can start the bAV flow immediately.
- Density normalization: none required. The Figma source was rendered at its native frame proportions and compared against the browser's 1× desktop render; browser chrome and surrounding canvas were excluded from the visual judgment.

## Full-view comparison

The source and implementation use the same CompanyPension frame, dark-green four-step header, centered title and divider, three `90px` pension cards, and centered CTA. The implementation removes the extra fourth choice and bAV advisory block that were absent from the linked Figma node.

## Focused pension-choice region

No separate focused capture was needed: the browser screenshot made the label, description, selection colour, rounded card boundary, and right-arrow affordance clearly legible at 1×.

## Required fidelity surfaces

- Fonts and typography: title uses `24px` semibold / `32px` line height; option labels use `16px` semibold and descriptions use `16px` / `24px`, matching the Figma context.
- Spacing and layout rhythm: cards use the Figma `638px` design width (within the app's existing `640px` container), `90px` height, `15–16px` vertical rhythm, `10px` radius, and `16px` horizontal padding.
- Colors and visual tokens: source values `#163300`, `#9FE870`, `#A9A9A9`, `#0E0F0B`, `#454846`, and `#454745` are mapped directly in the component.
- Image and icon quality: the three pension-type icon exports are committed from Figma and rendered directly from `/public/get-started/`; the Figma `Start check` arrow export is used for the CTA. The Figma-provided card-arrow SVG exports contained no drawable path, so the existing Lucide arrow remains for that affordance.
- Copy and content: the screen now has only bAV, VBL/ZVK, and VddB/VddKO choices; the VBL/ZVK detail copy is `For public-sector company pensions.` as in Figma.

## Findings

No actionable P0, P1, or P2 differences remain.

The Figma frame visually selects VBL/ZVK and fades its CTA, while the implementation keeps the existing bAV default and enabled CTA. This is an intentional interaction-state difference: the supplied client screenshot shows bAV selected, and the current flow's regression test confirms that default action opens the bAV entry path.

## Interaction and console checks

- VBL/ZVK selection changes the card to the Figma accent fill.
- `Start check` opens `Upload your pension document or continue manually` for the VBL/ZVK flow.
- No browser-console errors were recorded.

## Comparison history

1. Removed the unmatched `Not sure` option and bAV advisory block.
2. Retrieved the Figma node and aligned the VBL/ZVK copy, card radius/border, typography, colour values, and card arrows.
3. Re-rendered the route and rechecked the selected state, navigation, browser console, and the loaded Figma-exported icon assets.

final result: passed
