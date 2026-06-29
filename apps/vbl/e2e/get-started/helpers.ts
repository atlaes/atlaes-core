import { Page, expect } from '@playwright/test';
import path from 'path';

// ============================================================
// Constants
// ============================================================

export const GET_STARTED_URL = '/get-started';
export const TEST_EMAIL = 'kalibuas@gmail.com';
export const TEST_PASSPORT_PATH = path.join(
  __dirname,
  '../../public/USA.pdf'
);

// ============================================================
// Eligibility Nav Helpers
// ============================================================

export async function navigateToGetStarted(page: Page) {
  await page.goto(GET_STARTED_URL);
  await expect(
    page.getByRole('heading', { name: 'What do you want to start?' })
  ).toBeVisible({ timeout: 10_000 });
}

export async function selectEmploymentType(
  page: Page,
  type:
    | 'Public sector'
    | 'VBL / ZVK Refund'
    | 'Stage / Performing Arts/ Orchestra'
    | 'VddB / VddKO Refund'
    | 'Private Sector'
    | 'bAV / Company Pension Cash-Out'
    | 'Not sure'
) {
  const labelByLegacyName: Record<string, string> = {
    'Public sector': 'VBL / ZVK Refund',
    'Stage / Performing Arts/ Orchestra': 'VddB / VddKO Refund',
    'Private Sector': 'bAV / Company Pension Cash-Out',
  };
  const label = labelByLegacyName[type] ?? type;

  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  await page.getByRole('button', { name: /Start check|Continue/i }).click();
}

export async function selectPublicEntryPath(
  page: Page,
  path: 'Upload document' | 'Answer questions' = 'Answer questions'
) {
  await expect(
    page.getByRole('heading', {
      name: 'Upload your pension document or continue manually',
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: new RegExp(path, 'i') }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

export async function selectFederalState(page: Page, state: string) {
  await expect(
    page.getByRole('heading', { name: /Where was your.*employer located/ })
  ).toBeVisible({ timeout: 5_000 });
  await page.locator('select').selectOption(state);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectPensionProvider(
  page: Page,
  provider: string
) {
  await expect(
    page.getByRole('heading', {
      name: /Select your company pension/,
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.locator('select').selectOption(provider);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectEUContinuation(
  page: Page,
  continuing: 'Yes' | 'No'
) {
  await expect(
    page.getByRole('heading', { name: 'Public-sector employment' })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: continuing, exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectPensionScheme(
  page: Page,
  plan: 'VBLklassik' | 'VBLextra'
) {
  await expect(
    page.getByRole('heading', { name: /Select your company pension|Select your pension scheme/ })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByText(plan).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectContributionPeriod(
  page: Page,
  consecutive: 'Yes' | 'No'
) {
  await expect(
    page.getByRole('heading', { name: /VBL contribution period|Contribution period/ })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: consecutive, exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectContributionDuration(
  page: Page,
  duration: 'Less than 36 months' | '36 to 59 months' | '60 months or more'
) {
  await expect(
    page.getByRole('heading', {
      name: /How many months did you (pay into VBL|contribute) in total/,
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByText(duration).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectStagePensionDetails(
  page: Page,
  provider: 'VddB' | 'VddKO'
) {
  await expect(
    page.getByRole('heading', {
      name: 'Stage / Orchestra pension details',
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.locator('select').selectOption(provider);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectStageContributionDuration(
  page: Page,
  duration:
    | 'Less than 12 months'
    | '12 to 35 months'
    | '36 months or more'
) {
  await expect(
    page.getByRole('heading', {
      name: 'How many months did you contribute in total?',
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByText(duration).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectEmploymentEndDate(
  page: Page,
  month: string,
  year: string
) {
  await expect(
    page.getByRole('heading', { name: 'When did your employment end?' })
  ).toBeVisible({ timeout: 5_000 });
  const selects = page.locator('select');
  await selects.nth(0).selectOption(month);
  await selects.nth(1).selectOption(year);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function selectPrivatePensionProvider(
  page: Page,
  provider: 'Allianz' | 'Axa' | 'BVV' | 'Swiss_Life' | 'Other',
  otherName?: string
) {
  await expect(
    page.getByRole('heading', {
      name: 'Which company pension did you contribute to?',
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.locator('select').selectOption(provider);
  if (provider === 'Other' && otherName) {
    await page
      .getByPlaceholder('Pension provider name')
      .fill(otherName);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function fillPrivateContributionDetails(
  page: Page,
  options: {
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    employerPaid: 'Yes';
    monthlyAmount?: string;
  }
) {
  await expect(
    page.getByRole('heading', { name: 'Contribution details' })
  ).toBeVisible({ timeout: 5_000 });

  const selects = page.locator('select');
  // Contribution start: month (0), year (1)
  await selects.nth(0).selectOption(options.startMonth);
  await selects.nth(1).selectOption(options.startYear);
  // Contribution end: month (2), year (3)
  await selects.nth(2).selectOption(options.endMonth);
  await selects.nth(3).selectOption(options.endYear);

  if (options.monthlyAmount) {
    await page.getByPlaceholder('E.g., 350').fill(options.monthlyAmount);
  }

  await page
    .getByRole('button', { name: options.employerPaid, exact: true })
    .click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

// ============================================================
// Result Assertions
// ============================================================

export async function expectEligibleResult(page: Page) {
  await expect(
    page.getByRole('heading', { name: /eligible to continue|lump-sum settlement may be possible|refund can be started/i })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole('button', { name: /Continue securely|Start Claim|Create your secure claim/i })
  ).toBeVisible();
}

export async function expectNotEligibleResult(page: Page) {
  await expect(
    page.getByRole('heading', { name: /not eligible|cannot currently be claimed/i })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole('button', { name: /Go back|Return to start|Return to homepage/i })
  ).toBeVisible();
}

export async function expectReviewResult(page: Page) {
  await expect(
    page.getByRole('heading', {
      name: 'Individual assessment required',
    })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole('button', { name: 'Proceed with review' })
  ).toBeVisible();
}

export async function expectWaitingResult(page: Page) {
  await expect(
    page.getByRole('heading', {
      name: 'Your company pension payout is not yet available',
    })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole('button', { name: /Notify me when I'm eligible/i })
  ).toBeVisible();
}

// ============================================================
// Composite Helpers — Navigate to Eligible Result
// ============================================================

export async function navigatePublicSectorToEligible(page: Page) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'VBL / ZVK Refund');
  await selectPublicEntryPath(page, 'Answer questions');
  await selectFederalState(page, 'North Rhine-Westphalia');
  await selectPensionProvider(page, 'VBL');
  await selectPensionScheme(page, 'VBLklassik');
  await selectEmploymentEndDate(page, 'January', '2017');
  await selectContributionPeriod(page, 'No');
  await selectContributionDuration(page, 'Less than 36 months');
  await expectEligibleResult(page);
}

export async function navigateStageToEligible(page: Page) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
  await selectFederalState(page, 'Berlin (West)');
  await selectStagePensionDetails(page, 'VddB');
  await selectStageContributionDuration(page, '12 to 35 months');
  // Use a date far enough in the past to avoid the 24-month wait
  await selectEmploymentEndDate(page, 'January', '2020');
  await expectEligibleResult(page);
}

export async function navigatePrivateSectorToEligible(page: Page) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'Private Sector');
  await selectPrivatePensionProvider(page, 'BVV');
  await fillPrivateContributionDetails(page, {
    startMonth: 'January',
    startYear: '2018',
    endMonth: 'December',
    endYear: '2020',
    employerPaid: 'Yes',
  });
  await expectEligibleResult(page);
}

// ============================================================
// Onboarding Nav Helpers
// ============================================================

export async function completeCreateAccount(page: Page, email?: string) {
  await expect(
    page.getByRole('heading', { name: 'Create your account' })
  ).toBeVisible({ timeout: 10_000 });
  await page
    .getByPlaceholder('your.email@example.com')
    .fill(email ?? TEST_EMAIL);
  await page
    .getByRole('button', { name: /Continue with email/i })
    .click();
}

export async function completePayment(page: Page) {
  await expect(
    page.getByRole('heading', { name: /Start your refund claim/i })
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Pay.*deposit/i }).click();
  // Wait for processing to finish — simulated 1.5s delay
  await expect(
    page.getByRole('heading', { name: /passport|Upload/i })
  ).toBeVisible({ timeout: 10_000 });
}

export async function completeIdentityUpload(page: Page) {
  await expect(
    page.getByRole('heading', { name: /passport|Upload/i })
  ).toBeVisible({ timeout: 10_000 });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TEST_PASSPORT_PATH);

  // Wait for OCR processing and confirm phase
  await expect(
    page.getByRole('heading', { name: /Confirm your details/i })
  ).toBeVisible({ timeout: 30_000 });

  // Fill identity fields if empty
  const fullNameInput = page.getByPlaceholder('John Smith');
  if ((await fullNameInput.inputValue()) === '') {
    await fullNameInput.fill('Test User');
  }
  const dayInput = page.getByPlaceholder('Day');
  if ((await dayInput.inputValue()) === '') {
    await dayInput.fill('15');
  }
  const yearInput = page.getByPlaceholder('Year');
  if ((await yearInput.inputValue()) === '') {
    await yearInput.fill('1990');
  }
  const selects = page.locator('select');
  const birthMonthSelect = selects.first();
  if ((await birthMonthSelect.inputValue()) === '') {
    await birthMonthSelect.selectOption('January');
  }
  const genderSelect = selects.nth(1);
  if ((await genderSelect.inputValue()) === '') {
    await genderSelect.selectOption('male');
  }
  const passportNumberInput = page.getByPlaceholder('Enter document number');
  if ((await passportNumberInput.inputValue()) === '') {
    await passportNumberInput.fill('P1234567');
  }
  const nationalityInput = page.getByPlaceholder('e.g. Australian');
  if ((await nationalityInput.inputValue()) === '') {
    await nationalityInput.fill('Australian');
  }
  const placeOfBirthInput = page.getByPlaceholder('e.g. Sydney');
  if ((await placeOfBirthInput.inputValue()) === '') {
    await placeOfBirthInput.fill('Sydney');
  }
  await page.getByRole('button', { name: /Continue/i }).click();
}

export async function completeMembership(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Pension membership details' })
  ).toBeVisible({ timeout: 5_000 });
  const providerSelect = page.locator('select').first();
  if ((await providerSelect.count()) > 0) {
    await providerSelect.selectOption('VBL');
  }
  await page.getByPlaceholder(/membership number/i).fill('VBL123456');
  await page.getByRole('button', { name: /Continue/i }).click();
}

export async function completeAddress(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Your current address' })
  ).toBeVisible({ timeout: 5_000 });
  await page
    .getByPlaceholder('Street and house number')
    .fill('Test St 1');
  await page.getByPlaceholder('Postal code').fill('50667');
  await page.getByPlaceholder('City').fill('Cologne');
  await page.locator('select').first().selectOption('DE');
  await page.getByRole('button', { name: /Continue/i }).click();
}

export async function completeBankDetails(page: Page) {
  await expect(
    page.getByRole('heading', {
      name: /bank account|refund be paid/i,
    })
  ).toBeVisible({ timeout: 5_000 });
  await page.getByPlaceholder(/IBAN/i).fill('DE89370400440532013000');
  await page.getByRole('button', { name: /Continue/i }).click();
}

export async function completeSignature(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Add your signature' })
  ).toBeVisible({ timeout: 5_000 });

  // Draw on the canvas
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible' });
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 80);
    await page.mouse.move(box.x + 200, box.y + 50);
    await page.mouse.up();
  }

  await page.getByRole('button', { name: /Continue/i }).click();
}

export async function submitClaimOnReview(page: Page) {
  await expect(
    page.getByRole('heading', { name: /Review your claim/i })
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Submit/i }).click();
}

// ============================================================
// Date Helpers (for stage waiting period tests)
// ============================================================

const MONTH_NAMES = [
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

/** Returns { month, year } for N months ago from today */
export function monthsAgo(n: number): { month: string; year: string } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return {
    month: MONTH_NAMES[target.getMonth()],
    year: target.getFullYear().toString(),
  };
}
