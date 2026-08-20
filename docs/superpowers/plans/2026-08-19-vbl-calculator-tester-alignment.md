# VBL Calculator Tester Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify all 17 calculator tester findings without changing refund calculations, backend contracts, or the default direct `/get-started` and private onboarding experiences.

**Architecture:** Keep the calculator itself in `ManualVBLCalculator`, and introduce a typed `calculator` presentation variant for the shared onboarding steps. Persist a non-sensitive calculator-origin marker with the existing flow identity so the variant survives magic-link and Stripe redirects through `/get-started`; direct `/get-started` remains the default variant. Reuse the existing public-flow `Review → Confirm → Signature` workflow and change only the POA draw-plan coordinates for the PDF fix.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Playwright, Vitest, pdf-lib, pnpm workspaces

---

## File map

**Create**

- `apps/vbl/components/vbl/onboarding/onboarding-variant.ts` — shared `OnboardingVariant` type and calculator predicate.
- `apps/vbl/components/vbl/onboarding/OnboardingSubStepIcon.tsx` — accessible calculator-only Lucide icon map used by both onboarding layouts while their legacy icon branch stays intact.
- `apps/vbl/lib/calculator-onboarding-identity.ts` — pure Full Name and Date of Birth mapping/validation helpers.

**Modify**

- `apps/vbl/playwright.config.ts` — allow an isolated E2E port so tests cannot attach to another app on port 3000.
- `apps/vbl/e2e/manual-calculator.spec.ts` — findings 1–5 contract and responsive geometry.
- `apps/vbl/components/vbl/ManualVBLCalculator.tsx` — findings 1–5 UI.
- `apps/vbl/lib/flow-persistence.ts` — optional calculator-origin marker, cleared by the existing single reset point.
- `apps/vbl/e2e/calculator-to-onboarding-bridge.spec.ts` — prove calculator origin is persisted during session hydration.
- `apps/vbl/e2e/get-started/helpers.ts` — clear/seed origin and support both default and calculator field variants.
- `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts` — findings 6–16 and direct-flow regression coverage.
- `apps/vbl/components/vbl/onboarding/steps/CreateAccount.tsx` — configurable redirect URL while retaining the current default.
- `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx` — calculator variant, origin write, public substep order, confirmation/terminal submission handlers.
- `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx` — recover calculator variant after auth/payment and pass it to shared steps/layout.
- `apps/vbl/components/vbl/onboarding/OnboardingLayout.tsx` — variant-aware icons and substep visibility for the legacy in-tab calculator route.
- `apps/vbl/components/vbl/get-started/GetStartedLayout.tsx` — variant-aware icons and substep visibility after auth/payment returns.
- `apps/vbl/components/vbl/onboarding/steps/Payment.tsx` — finding 6.
- `apps/vbl/components/vbl/onboarding/steps/Identity.tsx` — finding 7.
- `apps/vbl/contexts/OnboardingContext.tsx` — reusable four-answer confirmation predicate.
- `apps/vbl/components/vbl/onboarding/steps/ReviewSubmit.tsx` — findings 9–10.
- `apps/vbl/components/vbl/onboarding/steps/ConfirmStep.tsx` — findings 11–13.
- `apps/vbl/components/vbl/onboarding/steps/Signature.tsx` — finding 14.
- `apps/vbl/components/vbl/onboarding/steps/SuccessScreen.tsx` — findings 15–16.
- `packages/functions/src/services/claim-pdf/poa-letter.test.ts` — finding 17 failing geometry contract.
- `packages/functions/src/services/claim-pdf/poa-letter.ts` — finding 17 implementation.
- `docs/superpowers/specs/2026-08-19-vbl-calculator-tester-alignment-design.md` — correct the route-transition and ISO date representation discovered during repository mapping.

No database, API route, calculation hook, eligibility rule, or Stripe configuration file changes.

### Task 1: Establish isolated browser verification and calculator findings 1–5

**Files:**

- Modify: `apps/vbl/playwright.config.ts:1-28`
- Modify: `apps/vbl/e2e/manual-calculator.spec.ts:1-760`
- Modify: `apps/vbl/components/vbl/ManualVBLCalculator.tsx:640-1100`
- Reuse: `apps/vbl/public/marketing/icons/pension-vbl.svg`
- Reuse: `apps/vbl/public/marketing/icons/pension-vddb.svg`

- [ ] **Step 1: Make the Playwright port explicit and isolated**

Replace fixed port values with:

```ts
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.VBL_E2E_PORT ?? '3000');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  }],
  webServer: [{
    command: `pnpm dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  }],
});
```

Preserve the existing `testDir`, retry, worker, reporter, and Chromium project declarations.

- [ ] **Step 2: Add failing calculator presentation assertions**

In the first `manual-calculator.spec.ts` test, assert the exact subtitle color and asset paths, and add a separate entry/sidebar test:

```ts
const subtitle = page.getByText(
  'Estimate your possible VBL, ZVK, VddB or VddKO refund.'
);
await expect(subtitle).toHaveCSS('color', 'rgb(62, 63, 60)');
await expect(page.locator('img[src="/marketing/icons/pension-vbl.svg"]')).toBeVisible();
await expect(page.locator('img[src="/marketing/icons/pension-vddb.svg"]')).toBeVisible();

test('orders upload first and shows the approved sidebar descriptions', async ({ page }) => {
  await page.goto('/calculator');
  await page.getByRole('button', { name: /VBL \/ ZVK refund/ }).click();
  await continueButton(page).click();

  const cards = page.locator('[data-testid="entry-method-card"]');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Upload document');
  await expect(cards.nth(1)).toContainText('Enter details manually');
  await expect(page.getByText('Pick what you want to check.')).toBeVisible();
  await expect(page.getByText('A few quick questions.')).toBeVisible();
  await expect(page.getByText('See your estimated refund')).toBeVisible();
});
```

Extend the existing stage path to the current threshold heading “A few more details are needed for your estimate” and assert `page.getByTestId('calculator-sidebar')` has count zero. Add a viewport loop for `390`, `1024`, and `1280` that asserts `document.documentElement.scrollWidth <= window.innerWidth` and the heading's top is above 45% of the viewport.

- [ ] **Step 3: Run the focused test and confirm the old UI fails**

Run:

```bash
VBL_E2E_PORT=3107 CI=1 pnpm --filter vbl exec playwright test e2e/manual-calculator.spec.ts --project=chromium
```

Expected: FAIL on old icon elements, entry-card order, missing sidebar descriptions, or sidebar visibility.

- [ ] **Step 4: Implement the calculator presentation changes**

Change the sidebar model and step rendering to:

```ts
const steps = [
  { title: 'Pension Type', description: 'Pick what you want to check.' },
  { title: 'Details', description: 'A few quick questions.' },
  { title: 'Estimate', description: 'See your estimated refund' },
];
```

Render each description beneath its title, add `data-testid="calculator-sidebar"` to the aside, and add an optional `testId` prop to `CardButton` so only the two entry choices receive `data-testid="entry-method-card"`. Import `Image` from `next/image` and replace `Building2` and `Landmark` with local images:

```tsx
<Image src="/marketing/icons/pension-vbl.svg" alt="" width={61} height={61} />
<Image src="/marketing/icons/pension-vddb.svg" alt="" width={61} height={61} />
```

Render Upload before Manual, set the introductory subtitle to `text-[#3E3F3C]`, change `FormShell` to `max-w-[660px]`, its heading to `text-[27px]`, and its subtitle to `text-[17px] leading-7`. Change the main content wrapper from full vertical centering to `items-start justify-center pt-8 md:pt-12`. Derive:

```ts
const showSidebar = screen !== 'thresholds';
```

The current implementation's equivalent screen is `thresholds`; render both sidebar and main-grid width conditionally so that questionnaire stays centered when the sidebar is absent.

- [ ] **Step 5: Re-run the test and commit**

Run the command from Step 3. Expected: all `manual-calculator.spec.ts` tests PASS.

```bash
git add apps/vbl/playwright.config.ts apps/vbl/e2e/manual-calculator.spec.ts apps/vbl/components/vbl/ManualVBLCalculator.tsx
git commit -m "fix(vbl): align calculator entry screens"
```

### Task 2: Carry the calculator variant across auth and payment redirects

**Files:**

- Create: `apps/vbl/components/vbl/onboarding/onboarding-variant.ts`
- Modify: `apps/vbl/lib/flow-persistence.ts:350-395`
- Modify: `apps/vbl/e2e/calculator-to-onboarding-bridge.spec.ts:1-125`
- Modify: `apps/vbl/e2e/get-started/helpers.ts:1-60`
- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts:1-150`
- Modify: `apps/vbl/components/vbl/onboarding/steps/CreateAccount.tsx:12-45`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx:1-370`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx:1-745`

- [ ] **Step 1: Define the shared variant contract**

Create:

```ts
export type OnboardingVariant = 'default' | 'calculator';

export const isCalculatorVariant = (variant: OnboardingVariant): boolean =>
  variant === 'calculator';
```

- [ ] **Step 2: Write failing persistence/variant tests**

In the calculator bridge happy-path test, add:

```ts
await expect.poll(() => page.evaluate(() => {
  const raw = localStorage.getItem('vbl_flow_identity_v1');
  return raw ? JSON.parse(raw).origin : null;
})).toBe('calculator');
```

In the get-started suite, add a default regression assertion that direct eligibility has no payment declaration checkboxes. Add a calculator-origin setup helper:

```ts
export async function seedCalculatorOrigin(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('vbl_flow_identity_v1', JSON.stringify({
      version: 1,
      pensionType: 'public',
      pensionProvider: 'VBLklassik',
      origin: 'calculator',
    }));
  });
}
```

Update `clearFlowPersistence` to remove `vbl_flow_identity_v1` from localStorage as well as the two sessionStorage keys.

- [ ] **Step 3: Run the bridge/default tests and confirm failure**

Run:

```bash
VBL_E2E_PORT=3107 CI=1 pnpm --filter vbl exec playwright test e2e/calculator-to-onboarding-bridge.spec.ts e2e/get-started/onboarding-full-flow.spec.ts --project=chromium --grep "origin|Payment screen"
```

Expected: the calculator-origin poll FAILS because the persisted identity has no `origin`.

- [ ] **Step 4: Extend flow identity without breaking old blobs**

Use an optional field so version-1 records already in browsers still load:

```ts
export interface PersistedFlowIdentity {
  version: number;
  pensionType: 'public' | 'private' | '';
  pensionProvider: string;
  origin?: 'calculator' | 'get-started';
}

export function saveFlowIdentity(
  state: Omit<PersistedFlowIdentity, 'version'>
): void {
  if (
    state.pensionType === '' &&
    state.pensionProvider === '' &&
    state.origin !== 'calculator'
  ) {
    clearFlowIdentity();
    return;
  }
  safeWriteLocal(FLOW_IDENTITY_KEY, { version: VERSION, ...state });
}
```

Do not add another storage key. `clearAllFlowPersistence()` already clears this record.

- [ ] **Step 5: Persist and recover the calculator origin**

Give `CreateAccount` a defaulted prop:

```ts
interface CreateAccountProps {
  onNext: () => void;
  redirectUrl?: string;
}

export const CreateAccount: React.FC<CreateAccountProps> = ({
  onNext,
  redirectUrl = '/get-started?fromAuth=1',
}) => {
  // ...
  const result = await requestMagicLink(email, redirectUrl);
};
```

In `OnboardingFlow`, persist calculator origin on mount and refresh the same record when session hydration supplies type/provider data:

```ts
useEffect(() => {
  saveFlowIdentity({
    pensionType: data.pensionType,
    pensionProvider: data.membership.pensionProvider,
    origin: 'calculator',
  });
}, [data.pensionType, data.membership.pensionProvider]);
```

Pass `redirectUrl="/get-started?fromAuth=1&origin=calculator"` from `OnboardingFlow`. In `GetStartedOnboardingFlow`, preserve the origin decision once per mount but gate the visual variant away from private/bAV claims:

```ts
const [calculatorOrigin] = useState(
  () => loadFlowIdentity()?.origin === 'calculator'
);
const variant: OnboardingVariant =
  calculatorOrigin && data.pensionType !== 'private'
    ? 'calculator'
    : 'default';
```

Use the same public/stage guard in direct `OnboardingFlow`. Whenever `GetStartedOnboardingFlow` refreshes the saved pension identity, preserve `origin: loadFlowIdentity()?.origin ?? 'get-started'`. Keep `variant` local until each receiving component gains its typed prop in Tasks 3–7; this keeps every intermediate commit type-safe. Do not infer calculator origin solely from `pensionType`, and do not apply the variant to private/bAV claims.

- [ ] **Step 6: Re-run tests and commit**

Expected: calculator bridge and default payment regression tests PASS.

```bash
git add apps/vbl/components/vbl/onboarding/onboarding-variant.ts apps/vbl/lib/flow-persistence.ts apps/vbl/e2e/calculator-to-onboarding-bridge.spec.ts apps/vbl/e2e/get-started/helpers.ts apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts apps/vbl/components/vbl/onboarding/steps/CreateAccount.tsx apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx
git commit -m "feat(vbl): preserve calculator onboarding variant"
```

### Task 3: Implement the calculator payment gate

**Files:**

- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts:580-630`
- Modify: `apps/vbl/e2e/get-started/helpers.ts:388-408`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Payment.tsx:5-300`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx:300-370`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx:620-745`

- [ ] **Step 1: Add a failing payment contract test**

Seed calculator origin, navigate a public user to payment with the existing mocked API, include `baseURL` in the Playwright test fixtures, and capture checkout calls:

```ts
let checkoutCalls = 0;
await page.route('**/api/payments/create-checkout-session', async route => {
  checkoutCalls += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      url: `${baseURL}/get-started?payment=success&session_id=cs_mock`,
      sessionId: 'cs_mock',
    }),
  });
});

const pay = page.getByRole('button', { name: /Pay €199/i });
await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
await expect(pay).toBeDisabled();
await page.getByRole('checkbox').nth(0).check();
await expect(pay).toBeDisabled();
expect(checkoutCalls).toBe(0);
await page.getByRole('checkbox').nth(1).check();
await expect(pay).toBeEnabled();
```

Also assert exact Deposit capitalization, revised refund sentence, two checkbox labels, `/terms` and `/privacy` links, Stripe mark, and payment-button icon test IDs.

- [ ] **Step 2: Run and confirm failure**

Run the get-started spec with `--grep "calculator payment"`. Expected: FAIL because the old screen has no declarations and Back is visible.

- [ ] **Step 3: Implement calculator-only payment presentation**

Add `variant?: OnboardingVariant` defaulting to `default`, local booleans `termsAccepted` and `earlyPerformanceAccepted`, and:

```ts
const calculatorReady = termsAccepted && earlyPerformanceAccepted;
const paymentDisabled = isProcessing || (variant === 'calculator' && !calculatorReady);
```

For the calculator variant only:

- render `Deposit — credited toward your service fee` with `Deposit` bold;
- use `The €199 deposit is refunded if the pension institution rejects your submitted refund application.`;
- render a dark-green filled `ShieldCheck` beside “Secure payment via Stripe” and a filled `CreditCard` inside the CTA, each `aria-hidden="true"` and carrying `data-testid="stripe-security-icon"` / `data-testid="payment-button-icon"`;
- render exactly two controlled checkboxes. The first text is `I have read and agree to the CompanyPension Terms and Conditions.` followed by underlined `Terms and Conditions` and `Privacy Policy` links to `/terms` and `/privacy`. The second text is `I expressly request that CompanyPension begin providing the service before the end of the 14-day withdrawal period. I understand that, if I withdraw after work has begun, I may have to pay for services already provided.`;
- disable the CTA until both are checked.

Guard `handlePayment` as defense in depth:

```ts
if (variant === 'calculator' && !calculatorReady) return;
```

Pass `variant` into `Payment`. In `OnboardingFlow`, use `showBack={currentStep !== 2}`. `GetStartedOnboardingFlow` already hides Back on payment, so leave its default rule unchanged.

- [ ] **Step 4: Re-run and commit**

Run the calculator payment test and the existing direct payment-copy test. Expected: both PASS.

```bash
git add apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts apps/vbl/e2e/get-started/helpers.ts apps/vbl/components/vbl/onboarding/steps/Payment.tsx apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx
git commit -m "fix(vbl): add calculator payment declarations"
```

### Task 4: Implement Full Name and single Date of Birth fields

**Files:**

- Create: `apps/vbl/lib/calculator-onboarding-identity.ts`
- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts`
- Modify: `apps/vbl/e2e/get-started/helpers.ts:410-475`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Identity.tsx:1-700`

- [ ] **Step 1: Write failing pure mapping tests inside the Playwright spec**

Import and test the pure helpers without opening a page:

```ts
test('splits calculator full names at the final whitespace', () => {
  expect(splitCalculatorFullName('  Anna Maria   Dela Cruz  ')).toEqual({
    firstName: 'Anna Maria Dela',
    lastName: 'Cruz',
  });
  expect(splitCalculatorFullName('Cher')).toBeNull();
});

test('accepts only real adult calculator birth dates', () => {
  const today = new Date('2026-08-19T00:00:00Z');
  expect(validateCalculatorBirthDate('1990-02-28', today)).toBeNull();
  expect(validateCalculatorBirthDate('2027-01-01', today)).toBe('future');
  expect(validateCalculatorBirthDate('2012-02-30', today)).toBe('invalid');
  expect(validateCalculatorBirthDate('2010-08-20', today)).toBe('underage');
});
```

- [ ] **Step 2: Run and confirm missing-helper failure**

Run the get-started spec with `--grep "calculator full names|calculator birth dates"`. Expected: TypeScript/module failure because the helper does not exist.

- [ ] **Step 3: Create the pure helper**

Implement:

```ts
export function joinCalculatorFullName(identity: {
  firstName: string;
  middleName: string;
  lastName: string;
}): string {
  return [identity.firstName, identity.middleName, identity.lastName]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ');
}

export function splitCalculatorFullName(
  value: string
): { firstName: string; lastName: string } | null {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1)! };
}

export type BirthDateError = 'invalid' | 'future' | 'underage' | null;

export function validateCalculatorBirthDate(
  value: string,
  today = new Date()
): BirthDateError {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return 'invalid';
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) return 'invalid';
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (date > todayUtc) return 'future';
  const eighteenthBirthday = new Date(Date.UTC(date.getUTCFullYear() + 18, date.getUTCMonth(), date.getUTCDate()));
  return eighteenthBirthday > todayUtc ? 'underage' : null;
}
```

- [ ] **Step 4: Render the calculator identity variant**

Add `variant?: OnboardingVariant`. In calculator confirm phase, initialize a local Full Name from `joinCalculatorFullName(data.identity)`, render one labelled text field and one `type="date"` field, and update the existing context only when valid:

```ts
const mappedName = splitCalculatorFullName(fullName);
const birthDateError = validateCalculatorBirthDate(data.identity.dateOfBirth);
const calculatorIdentityValid = !!mappedName && birthDateError === null;

const handleCalculatorNameChange = (value: string) => {
  setFullName(value);
  const mapped = splitCalculatorFullName(value);
  updateIdentity(mapped
    ? { firstName: mapped.firstName, middleName: '', lastName: mapped.lastName }
    : { firstName: '', middleName: '', lastName: '' });
};
```

Keep nationality, place of birth, and gender fields. Remove the passport-specific Date of Birth helper only in the calculator variant. Keep upload/OCR and default identity UI unchanged.

- [ ] **Step 5: Add and pass browser assertions**

For calculator origin, add:

```ts
await expect(page.getByLabel('Full Name')).toHaveCount(1);
await expect(page.getByLabel('Date of Birth')).toHaveAttribute('type', 'date');
await expect(page.getByLabel('First name')).toHaveCount(0);
await expect(page.getByLabel('Middle name (optional)')).toHaveCount(0);
await expect(page.getByLabel('Last name')).toHaveCount(0);
await expect(page.getByText('Use the date of birth shown on your passport.')).toHaveCount(0);
await page.getByLabel('Full Name').fill('Cher');
await expect(page.getByText('Enter your full first and last name.')).toBeVisible();
await page.getByLabel('Full Name').fill('Anna Maria Dela Cruz');
await page.getByLabel('Date of Birth').fill('1990-01-15');
```

After continuing to Review, expand Personal information and assert `Anna Maria Dela Cruz`. For direct `/get-started`, assert the existing First/Middle/Last and date-parts controls remain. Give both new inputs stable IDs, point each error text at its input with `aria-describedby`, and focus the first invalid field if Continue is invoked while invalid.

Run the focused mapping and identity tests. Expected: PASS.

```bash
git add apps/vbl/lib/calculator-onboarding-identity.ts apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts apps/vbl/e2e/get-started/helpers.ts apps/vbl/components/vbl/onboarding/steps/Identity.tsx
git commit -m "fix(vbl): simplify calculator identity fields"
```

### Task 5: Align calculator progress icons and workflow order

**Files:**

- Create: `apps/vbl/components/vbl/onboarding/OnboardingSubStepIcon.tsx`
- Modify: `apps/vbl/contexts/OnboardingContext.tsx:180-275,390-420`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingLayout.tsx:1-360`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedLayout.tsx:1-350`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx:1-390`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx:250-745`
- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts`

- [ ] **Step 1: Add failing order/icon/visibility assertions**

For calculator origin, complete Bank Details and assert the visible order is Review, Confirm, Signature. Add stable icon names:

```ts
await expect(page.getByTestId('substep-icon-identity')).toBeVisible();
await expect(page.getByTestId('substep-icon-membership')).toBeVisible();
await expect(page.getByTestId('substep-icon-address')).toBeVisible();
await expect(page.getByTestId('substep-icon-bank-details')).toBeVisible();
await expect(page.getByTestId('substep-icon-review')).toBeVisible();
await expect(page.getByTestId('substep-icon-confirm')).toBeVisible();
await expect(page.getByTestId('substep-icon-signature')).toBeVisible();
```

On Review, Confirm, and Signature, assert the substep order and icon test IDs. The terminal stopped/success visibility assertions are introduced with those states in Tasks 6 and 7.

- [ ] **Step 2: Run and confirm failure**

Run the get-started spec with `--grep "calculator progress|calculator stopped|calculator submitted"`. Expected: FAIL on missing test IDs or old visibility.

- [ ] **Step 3: Share the approved icon map**

Create a single component using project-supported Lucide glyphs:

```tsx
import {
  BadgeCheck,
  FileText,
  IdCard,
  Landmark,
  MapPin,
  PenLine,
  ShieldPlus,
  UserRound,
} from 'lucide-react';

const ICONS = {
  user: UserRound,
  card: IdCard,
  location: MapPin,
  bank: Landmark,
  document: FileText,
  confirm: BadgeCheck,
  pen: PenLine,
  health: ShieldPlus,
} as const;
```

The component accepts `subStepId`, `icon`, `isActive`, and `isCompleted`, renders the existing circle states, sets `data-testid={`substep-icon-${subStepId}`}`, and marks the SVG `aria-hidden="true"`. Add `variant?: OnboardingVariant` to both layouts and render this component only for `calculator`; keep each layout's current hand-authored `SubStepIcon` branch for `default`. Add `showSubSteps?: boolean` defaulting to true and put `data-testid="onboarding-substeps"` on the rendered bar.

For calculator rendering, use the four-stage header and Review label from the screenshots:

```ts
const CALCULATOR_MAIN_STEPS = [
  { id: 1, label: 'Check' },
  { id: 2, label: 'Secure Claim' },
  { id: 3, label: 'Complete Details' },
  { id: 4, label: 'Sign & Submit' },
] as const;

const calculatorSubSteps = subSteps.map(step =>
  step.id === 'review' ? { ...step, label: 'Review' } : step
);
```

`OnboardingLayout` derives calculator active stage as 2 for Create Account/Payment, 3 for Identity through Bank Details, and 4 for Review/Confirm/Signature/success. `GetStartedLayout` keeps its existing `activeStep` input. Default labels and three-stage `OnboardingLayout` header remain unchanged.

- [ ] **Step 4: Expose the four-answer gate without weakening defaults**

Add:

```ts
export function areConfirmStopAnswersClear(confirm: OnboardingConfirm): boolean {
  return CONFIRM_STOP_ANSWER_KEYS.every(key => confirm[key] === 'no');
}

export function isConfirmComplete(confirm: OnboardingConfirm): boolean {
  return (
    areConfirmStopAnswersClear(confirm) &&
    confirm.declarationAccurate &&
    confirm.declarationRequestRefund &&
    confirm.declarationRightsEnd &&
    confirm.declarationNoRepayment &&
    confirm.declarationNoWithdrawal &&
    confirm.authorizeComplete &&
    confirm.authorizeSignature &&
    confirm.authorizeCorrespondence
  );
}
```

Default get-started behavior still calls `isConfirmComplete`. Calculator-only confirm and terminal-signature guards call `areConfirmStopAnswersClear`.

- [ ] **Step 5: Reuse the public substep sequence in calculator flow**

In `OnboardingFlow`, preserve the legacy private list and use the public sequence only for public/stage calculator claims:

```ts
const submitDetailsSubsteps = data.pensionType === 'private'
  ? SUBMIT_DETAILS_SUBSTEPS
  : getSubmitDetailsSubsteps(data.pensionType);
const isSignatureTerminal =
  submitDetailsSubsteps.at(-1)?.id === 'signature';
```

Import `markStepComplete`, `submitClaim`, and `stopClaim` from `onboarding-api`, `clearAllFlowPersistence` from `flow-persistence`, and add these handlers:

```ts
const handleReviewContinue = async () => {
  if (data.claimId) {
    try {
      await markStepComplete(data.claimId, 'reviewInformation');
    } catch (error) {
      console.error('Failed to mark review complete:', error);
    }
  }
  setCurrentSubStep('confirm');
};

const handleConfirmContinue = async () => {
  setFlowError(null);
  if (data.claimId) {
    try {
      await markStepComplete(data.claimId, 'finalConfirmation');
    } catch (error) {
      console.error('Failed to mark confirmation complete:', error);
    }
  }
  setCurrentSubStep('signature');
};

const handleFinalizeFromSignature = async () => {
  if (!areConfirmStopAnswersClear(data.confirm)) {
    setFlowError('Please confirm your answers before submitting your refund request.');
    setCurrentSubStep('confirm');
    return;
  }
  if (!data.claimId) {
    setFlowError('No claim found. Please restart the onboarding process.');
    return;
  }
  try {
    await markStepComplete(data.claimId, 'signDocuments');
    const result = await submitClaim(data.claimId);
    localStorage.removeItem('vbl_draft_claimId');
    updateSuccessData({
      submissionId: result.claim.id,
      submittedAt: (result.claim.submittedAt as string) || new Date().toISOString(),
    });
    setShowSuccess(true);
  } catch {
    setFlowError('We could not submit your refund request. Please try again.');
  }
};

const handleConfirmStop = async (reasons: string[]) => {
  if (!data.claimId) return;
  try {
    await stopClaim(data.claimId, reasons);
  } catch {
    setFlowError('We could not record that your application was stopped. Please contact support.');
  }
};

const handleReturnToStart = () => {
  clearAllFlowPersistence();
  resetOnboarding();
  router.push('/calculator');
};
```

Render `ConfirmStep` with those callbacks, pass `onContinue={handleReviewContinue}` to public/stage Review, and pass `handleFinalizeFromSignature` to terminal Signature.

Add `subSteps?: typeof SUBMIT_DETAILS_SUBSTEPS` and `showSubSteps?: boolean` defaulting true to `OnboardingLayout`; pass the derived calculator sequence from `OnboardingFlow`. `GetStartedLayout` already accepts `subSteps`. Render either substep bar only when `showSubSteps` is true. Calculator stopped and success states pass false; default flows preserve current rendering.

- [ ] **Step 6: Re-run and commit**

Run the calculator progress tests and the existing “mocked public onboarding reaches review and submitted states” test. Expected: PASS.

```bash
git add apps/vbl/components/vbl/onboarding/OnboardingSubStepIcon.tsx apps/vbl/contexts/OnboardingContext.tsx apps/vbl/components/vbl/onboarding/OnboardingLayout.tsx apps/vbl/components/vbl/get-started/GetStartedLayout.tsx apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts
git commit -m "fix(vbl): align calculator claim progression"
```

### Task 6: Align Review, Confirm, modal, and stopped states

**Files:**

- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts`
- Modify: `apps/vbl/components/vbl/onboarding/steps/ReviewSubmit.tsx:1-650`
- Modify: `apps/vbl/components/vbl/onboarding/steps/ConfirmStep.tsx:1-460`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx`

- [ ] **Step 1: Write failing finding 9–13 assertions**

For calculator origin, assert:

```ts
await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
await expect(page.getByRole('button', { name: /Continue to declarations/i })).toBeVisible();
await expect(page.getByText('Scheme:', { exact: true })).toBeVisible();
for (const edit of await page.getByRole('button', { name: 'Edit information' }).all()) {
  await expect(edit).toHaveCSS('text-decoration-line', 'underline');
}
await expect(page.getByText('Important declarations', { exact: true })).toHaveCount(0);
await expect(page.getByText('CompanyPension authorization', { exact: true })).toHaveCount(0);
await expect(page.getByRole('checkbox')).toHaveCount(0);
```

Open a stop answer, click Yes, assert the approved modal heading/body/actions, cancel and prove the answer stays No, reopen and confirm. On the stopped screen assert “claimed,” left-arrow Return button, no refund-to-payment-method sentence, and no substep row.

- [ ] **Step 2: Run and confirm old-copy/style failures**

Run the get-started spec with `--grep "calculator review|calculator confirmation|calculator stopped"`. Expected: FAIL.

- [ ] **Step 3: Implement Review calculator variant**

Add `variant?: OnboardingVariant`. For calculator only:

- heading `Review` and CTA `Continue to declarations`;
- neutral white section backgrounds with gray borders, not green fills;
- approved section icons from the shared icon set;
- always-underlined `Edit information` buttons;
- Bank Details begins with `Scheme: {data.membership.pensionProvider || 'Not provided'}` above account holder.

Use explicit variant values rather than replacing the defaults:

```ts
const isCalculator = variant === 'calculator';
const reviewHeading = isCalculator
  ? 'Review'
  : isPrivatePensionType
    ? 'Review your bAV cash-out request'
    : 'Review your refund request';
const continueLabel = isCalculator
  ? 'Continue to declarations'
  : 'Continue to confirmation';
const sectionClass = isCalculator
  ? 'rounded-xl overflow-hidden border border-gray-200 bg-white'
  : 'rounded-xl overflow-hidden border border-[#9FE870] bg-[#F0FDE4]';
const editClass = isCalculator
  ? 'mt-2 font-medium text-[#163300] underline hover:no-underline'
  : 'mt-2 font-medium text-[#163300] hover:underline';
```

Keep existing private/default headings, backgrounds, section rules, and submit behavior unchanged.

- [ ] **Step 4: Implement Confirm and stopped calculator variants**

Add `variant?: OnboardingVariant`. Use:

```ts
const canContinue = variant === 'calculator'
  ? areConfirmStopAnswersClear(confirm)
  : isConfirmComplete(confirm);
```

Hide declarations, German wording, and CompanyPension authorization only for calculator. Keep the modal's approved words exactly as shown below, enlarge the calculator dialog to the linked frame's layout, and preserve the pending-answer state machine:

For calculator, replace the now-inaccurate intro with `Please review your answers before continuing to your signature.`; keep the default intro unchanged.

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="calculator-stop-dialog-title"
  className="w-full max-w-[560px] rounded-[22px] bg-white p-9 shadow-2xl"
>
  <h3 id="calculator-stop-dialog-title" className="text-[26px] font-bold leading-10 text-[#111827]">
    This answer will stop your refund application
  </h3>
  <p className="mt-6 text-[18px] leading-8 text-[#50576A]">
    CompanyPension cannot currently process this refund if your answer is Yes. Are you sure you want to change your answer?
  </p>
  <button>Yes, change my answer</button>
  <button>Keep my answer as No</button>
</div>
```

The first action is a 72px red filled button; the second is a 72px white outlined button, both full width with 12px spacing. Add an Escape listener while the dialog is open, keep a ref to the Yes trigger, and return focus on cancel/close.

Add `onStopStateChange?: (stopped: boolean) => void` to `ConfirmStep`. Call `onStopStateChange?.(true)` inside `handleConfirmYes`; call `onStopStateChange?.(false)` before Return to start. In each flow coordinator, store:

```ts
const [calculatorStopped, setCalculatorStopped] = useState(false);
```

Pass `onStopStateChange={setCalculatorStopped}` and set the calculator layout's `showSubSteps={!calculatorStopped}`. This lifts only the presentation flag; the answer and backend stop behavior stay in `ConfirmStep`.

For calculator stopped state, render:

```tsx
<h2>This refund cannot currently be claimed with CompanyPension</h2>
<button onClick={onReturnToStart}>
  <ArrowLeft aria-hidden="true" />
  Return to start
</button>
```

Do not render the old deposit-refund sentence. Keep default stopped copy and all default declarations intact.

- [ ] **Step 5: Re-run and commit**

Run the finding 9–13 tests and the existing default “Confirm step blocks until all declarations are checked” test. Expected: PASS.

```bash
git add apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts apps/vbl/components/vbl/onboarding/steps/ReviewSubmit.tsx apps/vbl/components/vbl/onboarding/steps/ConfirmStep.tsx apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx
git commit -m "fix(vbl): align calculator review and declarations"
```

### Task 7: Align Signature and Sign & Submit completion

**Files:**

- Modify: `apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts`
- Modify: `apps/vbl/components/vbl/onboarding/steps/Signature.tsx:300-500`
- Modify: `apps/vbl/components/vbl/onboarding/steps/SuccessScreen.tsx:1-260`
- Modify: `apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx`
- Modify: `apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx`

- [ ] **Step 1: Write failing finding 14–16 assertions**

For calculator origin, assert the signature heading, mode controls, canvas, legal checkbox, and approved CTA layout. After submission assert:

```ts
await expect(page.getByText(
  "Once your refund is approved, we’ll notify you so you can download the official refund statement and settle any remaining service fee."
)).toBeVisible();
await expect(page.getByText(
  'Later, you may also be able to claim a German state pension refund'
)).toBeVisible();
await expect(page.getByRole('button', { name: 'No thanks' })).toHaveCSS(
  'color',
  'rgb(0, 0, 0)'
);
await expect(page.getByTestId('onboarding-substeps')).toHaveCount(0);
```

Also assert the approved next-step icons are present once each.

- [ ] **Step 2: Run and confirm failure**

Run with `--grep "calculator signature|calculator submitted"`. Expected: FAIL on old success copy/color or substep visibility.

- [ ] **Step 3: Implement calculator Signature layout**

Add `variant?: OnboardingVariant` and use these calculator dimensions from the referenced screen:

```ts
const isCalculator = variant === 'calculator';
const shellClass = isCalculator ? 'mx-auto max-w-[760px]' : 'mx-auto max-w-lg';
const canvasHeight = isCalculator ? '300px' : '200px';
const modeClass = isCalculator
  ? 'flex-1 rounded-lg px-4 py-4 text-[18px] font-medium'
  : 'flex-1 rounded-lg px-4 py-3 font-medium';
const continueClass = isCalculator
  ? 'mt-10 w-full rounded-lg px-6 py-4 text-[18px] font-semibold'
  : 'mt-8 w-full rounded-lg px-6 py-4 font-semibold';
```

Keep the heading `Add your signature`, the two mode labels, the 2px dashed canvas border, centered Undo/Redo/Clear controls, legal checkbox, drawing history, upload, signature ID invalidation, attach call, errors, and default rendering logic unchanged.

- [ ] **Step 4: Implement calculator Success layout and copy**

Add `variant?: OnboardingVariant`. Use a calculator-specific `WHAT_HAPPENS_NEXT` array whose second item is exactly:

```ts
"Once your refund is approved, we’ll notify you so you can download the official refund statement and settle any remaining service fee."
```

Change the later-pension heading to “Later, you may also be able to claim a German state pension refund” and set No thanks to black only for calculator. Apply the supplied `1600:445` icon/spacing treatment and hide substep navigation via the layout prop, not by removing the main progress header.

Use explicit variant values:

```ts
const whatHappensNext = variant === 'calculator'
  ? [
      'The pension provider reviews your refund request.',
      'Once your refund is approved, we’ll notify you so you can download the official refund statement and settle any remaining service fee.',
      'The refund is paid directly to the bank account you provided.',
    ]
  : WHAT_HAPPENS_NEXT;
const laterHeading = variant === 'calculator'
  ? 'Later, you may also be able to claim a German state pension refund'
  : 'Later, you may also be eligible for a German state pension refund';
const noThanksClass = variant === 'calculator'
  ? 'text-sm font-semibold text-black hover:text-gray-700'
  : 'text-sm font-semibold text-[#4F46E5] hover:text-[#4338CA]';
```

For calculator next-step bullets, render a 20px light-green circle with a dark-green `Check`; render the main success mark as a 96px light-green circle with a 48px dark-green `Check`, matching the annotated tester screenshot.

- [ ] **Step 5: Re-run and commit**

Run calculator signature/submitted tests plus the existing default success-screen test. Expected: PASS.

```bash
git add apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts apps/vbl/components/vbl/onboarding/steps/Signature.tsx apps/vbl/components/vbl/onboarding/steps/SuccessScreen.tsx apps/vbl/components/vbl/onboarding/OnboardingFlow.tsx apps/vbl/components/vbl/get-started/GetStartedOnboardingFlow.tsx
git commit -m "fix(vbl): align calculator signature completion"
```

### Task 8: Move the generated POA signature to the left

**Required skill during execution:** use the PDF skill to render and inspect the changed document.

**Files:**

- Modify: `packages/functions/src/services/claim-pdf/poa-letter.test.ts:80-180`
- Modify: `packages/functions/src/services/claim-pdf/poa-letter.ts:246-305`

- [ ] **Step 1: Write the failing geometry test**

Add:

```ts
it('places the signature beside the date in the left half of the page', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const plan = buildPoaLetterPlan(data, font, boldFont);
  const date = plan.find(op => op.kind === 'text' && op.text === 'Berlin, 06.07.2026');
  const signature = plan.find(op => op.kind === 'signature');
  expect(date?.kind).toBe('text');
  expect(signature?.kind).toBe('signature');
  if (!date || date.kind !== 'text' || !signature || signature.kind !== 'signature') {
    throw new Error('missing date/signature operations');
  }
  expect(signature.x).toBeGreaterThan(date.x);
  expect(signature.x + getPoaSignatureReservedWidth()).toBeLessThanOrEqual(A4.width / 2);
  expect(signature.maxWidth).toBeCloseTo(A4.width / 2 - signature.x, 3);
  expect(signature.page).toBe(date.page);
});
```

Add `getPoaSignatureReservedWidth` to the existing imports from `./poa-letter`. Extend the signature draw operation with `maxWidth: number`, and export `getPoaSignatureReservedWidth()` as the single named source for the planned signature footprint.

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
pnpm --filter @vbl/functions test:run -- src/services/claim-pdf/poa-letter.test.ts
```

Expected: FAIL because the current signature is right-aligned.

- [ ] **Step 3: Implement bounded left placement**

Replace the right-aligned x-coordinate with:

```ts
export function getPoaSignatureReservedWidth(): number {
  return signatureImageHeight * 3;
}

const signatureWidth = getPoaSignatureReservedWidth();
const dateWidth = font.widthOfTextAtSize(dateLineText, fontSize);
const desiredSignatureX = marginLeft + dateWidth + 16;
const leftHalfMaxX = A4.width / 2 - signatureWidth;
const signatureX = Math.min(desiredSignatureX, leftHalfMaxX);

ops.push({
  kind: 'signature',
  x: signatureX,
  yTop: cursor - (signatureImageHeight - lineHeight) / 2,
  height: signatureImageHeight,
  maxWidth: A4.width / 2 - signatureX,
  page,
});
```

In the renderer, calculate the height-based width first. If it exceeds `op.maxWidth`, scale width and height down proportionally before `drawImage`. Keep the right-margin clamp as a final page-safety guard; `maxWidth` guarantees that the rendered image cannot cross the midpoint.

- [ ] **Step 4: Run tests and visually inspect a rendered PDF**

Run the focused Vitest command, then the full claim-PDF suite:

```bash
pnpm --filter @vbl/functions test:run -- src/services/claim-pdf
```

Render a representative claim package using the repository's existing PDF test fixture or generation path, rasterize the POA page with the PDF skill, and verify the signature is beside the date on the left and the rule/name stay on the same page.

- [ ] **Step 5: Commit**

```bash
git add packages/functions/src/services/claim-pdf/poa-letter.test.ts packages/functions/src/services/claim-pdf/poa-letter.ts
git commit -m "fix(vbl): left-align POA signature"
```

### Task 9: Full regression and visual acceptance

**Files:**

- Modify only if a verification failure identifies a scoped defect.

- [ ] **Step 1: Run formatting and type safety checks**

```bash
git diff --check
pnpm type-check
pnpm --filter @vbl/functions type-check
```

Expected: all commands exit 0 with no new TypeScript errors or whitespace failures.

- [ ] **Step 2: Run affected browser suites on the isolated app**

```bash
VBL_E2E_PORT=3107 CI=1 pnpm --filter vbl exec playwright test e2e/manual-calculator.spec.ts e2e/calculator-to-onboarding-bridge.spec.ts e2e/get-started/onboarding-full-flow.spec.ts e2e/onboarding-edge-cases.spec.ts --project=chromium
```

Expected: PASS. Update obsolete calculator-onboarding assertions only when they contradict the approved 17-item contract; do not weaken unrelated assertions.

- [ ] **Step 3: Compare representative screens**

Capture calculator-origin screenshots at 390, 1024, and 1280 px for entry, final questionnaire, payment, identity, review, confirmation modal, stopped, signature, and success. Compare them against the tester screenshots, Figma nodes available in the design record, and `apps/vbl/app_resource`. Check overflow, focus outlines, icon glyphs, text wrapping, section order, and hidden navigation.

- [ ] **Step 4: Verify direct and private flow isolation**

Run the existing direct public and private mocked full-flow tests without an origin marker. Confirm the old payment declarations, identity composition, confirm declarations, and private-flow order remain unchanged. Confirm `clearAllFlowPersistence()` removes the calculator marker after submission and Return to start.

- [ ] **Step 5: Inspect the final change set**

```bash
git status --short
git diff --stat origin/main...HEAD
git log --oneline -10
```

Expected: only the files listed in this plan are changed; no deployment, push, PR, migration, generated Playwright report, or unrelated user files are included.

- [ ] **Step 6: Commit any verification-only test corrections**

Only if Step 2 required scoped assertion updates:

```bash
git add apps/vbl/e2e/onboarding-edge-cases.spec.ts apps/vbl/e2e/get-started/onboarding-full-flow.spec.ts
git commit -m "test(vbl): cover calculator tester alignment"
```

Otherwise, do not create an empty commit.
