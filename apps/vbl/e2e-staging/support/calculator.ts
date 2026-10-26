import { expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Helpers for the live calculator (/calculator → ManualVBLCalculator).
 * Selectors come from e2e/manual-calculator.spec.ts; unlike that spec,
 * nothing here mocks the API: estimates come from the real
 * POST /api/vbl/calculate-simple and uploads from the real extraction.
 */

export const FIXTURES = path.join(__dirname, '..', 'fixtures');

// PUBLIC_PENSION_PROVIDERS_BY_STATE keys (components/vbl/company-pension-providers.ts).
export const PUBLIC_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin (West)',
  'Bremen',
  'Hesse',
  'Lower Saxony',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Schleswig-Holstein',
] as const;

export const continueButton = (page: Page) =>
  page.getByRole('button', { name: 'Continue', exact: true });

export async function chooseDropdownOption(
  page: Page,
  label: string,
  option: string
) {
  await page.getByRole('button', { name: new RegExp(label) }).click();
  const choice = page.getByRole('option', { name: option, exact: true });
  await expect(choice).toBeVisible();
  await choice.click();
}

export type PensionChoice = 'VBL / ZVK refund' | 'VddB / VddKO refund';

async function choosePensionAndEntry(
  page: Page,
  pension: PensionChoice,
  entry: RegExp
) {
  await page.goto('/calculator');
  await expect(
    page.getByRole('heading', { name: 'What refund do you want to estimate?' })
  ).toBeVisible();
  await page.getByRole('button', { name: pension }).click();
  await continueButton(page).click();
  await expect(
    page.getByRole('heading', {
      name: 'Upload a pension document or enter details manually',
    })
  ).toBeVisible();
  await page.getByRole('button', { name: entry }).click();
  await continueButton(page).click();
}

export async function chooseManual(page: Page, pension: PensionChoice) {
  await choosePensionAndEntry(page, pension, /Enter details manually/);
}

/** Uploads a specimen statement and waits for the real extraction. */
export async function chooseUpload(
  page: Page,
  pension: PensionChoice,
  fixture: string
) {
  await choosePensionAndEntry(page, pension, /Upload document/);
  await expect(
    page.getByRole('heading', {
      name: /Upload your (VBL\/ZVK|VddB\/VddKO) document/,
    })
  ).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('calculator-upload-dropzone').click();
  await (await chooser).setFiles(path.join(FIXTURES, fixture));
  await expect(page.getByText(fixture)).toBeVisible();
  await continueButton(page).click();
  // Real OCR + LLM extraction: allow for a slow model.
  await expect(
    page.getByRole('heading', {
      name: 'We found these details in your document',
    })
  ).toBeVisible({ timeout: 90_000 });
}

export async function enterContributionPeriod(
  page: Page,
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string
) {
  await chooseDropdownOption(page, 'Start month', startMonth);
  await chooseDropdownOption(page, 'Start year', startYear);
  await chooseDropdownOption(page, 'End month', endMonth);
  await chooseDropdownOption(page, 'End year', endYear);
  await continueButton(page).click();
}

export async function enterSalary(page: Page, salary: string) {
  await expect(
    page.getByRole('heading', {
      name: 'What was your average gross monthly salary?',
    })
  ).toBeVisible();
  await page.getByLabel('Average monthly gross salary (€)').fill(salary);
  await continueButton(page).click();
}

/** Asserts the estimate screen and returns the euro amount shown. */
export async function expectEstimate(
  page: Page,
  title: string | RegExp
): Promise<number> {
  await expect(
    page.getByRole('heading', { name: 'Calculating your estimate' })
  ).toHaveCount(0, { timeout: 30_000 });
  await expect(
    page.getByRole('heading', { name: 'Calculation Error' })
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const amountText = await page
    .getByText(/^€\s?[\d,]+$/)
    .first()
    .textContent();
  const amount = Number((amountText ?? '').replace(/[^\d]/g, ''));
  expect(amount, `estimate amount "${amountText}"`).toBeGreaterThan(0);
  return amount;
}

/** Every post-estimate question is its own fieldset (role=group). */
export async function answerEligibilityQuestions(
  page: Page,
  answer: 'Yes' | 'No'
) {
  const questions = page.getByRole('group');
  await expect(questions.first()).toBeVisible();
  const count = await questions.count();
  for (let index = 0; index < count; index += 1) {
    await questions.nth(index).getByLabel(answer, { exact: true }).check();
  }
}

/** Manual public path up to (and including) the estimate. */
export async function publicManualEstimate(
  page: Page,
  options: {
    state: string;
    provider: 'VBL' | 'ZVK';
    plan?: 'VBLklassik' | 'VBLextra';
    period?: [string, string, string, string];
    salary?: string;
  }
): Promise<number> {
  await chooseManual(page, 'VBL / ZVK refund');
  await chooseDropdownOption(page, 'Employer’s federal state', options.state);
  await continueButton(page).click();
  await expect(
    page.getByRole('heading', { name: 'Select your company pension' })
  ).toBeVisible();
  await chooseDropdownOption(page, 'Company pension', options.provider);
  if (options.provider === 'VBL') {
    await page
      .getByRole('button', { name: options.plan ?? 'VBLklassik' })
      .click();
  }
  await continueButton(page).click();
  if (options.plan === 'VBLextra') return 0;
  await expect(
    page.getByRole('heading', { name: 'When did you pay into this pension?' })
  ).toBeVisible();
  const [sm, sy, em, ey] = options.period ?? [
    'January',
    '2020',
    'December',
    '2021',
  ];
  await enterContributionPeriod(page, sm, sy, em, ey);
  await enterSalary(page, options.salary ?? '3500');
  return expectEstimate(page, 'Your estimated VBL/ZVK refund');
}

export async function chooseStageProvider(
  page: Page,
  provider: 'VddB' | 'VddKO',
  state = 'Bavaria'
) {
  await chooseManual(page, 'VddB / VddKO refund');
  await chooseDropdownOption(page, 'Employer’s federal state', state);
  await continueButton(page).click();
  await chooseDropdownOption(page, 'Company pension', provider);
  await continueButton(page).click();
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** { month, year } for `n` months before the current month. */
export function monthsAgo(n: number): { month: string; year: string } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return {
    month: MONTHS[target.getMonth()],
    year: String(target.getFullYear()),
  };
}

export const CANNOT_BE_CLAIMED =
  'This refund cannot currently be claimed with CompanyPension';
export const CANNOT_BE_STARTED =
  'This refund cannot currently be started with CompanyPension';
export const CAN_BE_STARTED = 'Your refund can be started with CompanyPension';
