import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectPublicEntryPath,
  selectFederalState,
  selectPensionProvider,
  selectPensionScheme,
  selectEmploymentEndDate,
  selectContributionPeriod,
  selectContributionDuration,
  expectEligibleResult,
  expectNotEligibleResult,
} from './helpers';

async function mockPublicUploadExtraction(
  page: import('@playwright/test').Page,
  details: {
    provider: 'VBL' | 'ZVK' | null;
    vblPlan: 'VBLklassik' | 'VBLextra' | null;
    federalState: string | null;
    startMonth: string | null;
    startYear: string | null;
    endMonth: string | null;
    endYear: string | null;
    employmentEndMonth: string | null;
    employmentEndYear: string | null;
  }
) {
  await page.route('**/api/vbl/extract-pension-document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        extraction: {
          details: {
            ...details,
            averageMonthlyGrossSalary: null,
            statePensionRefundReceived: null,
            bavStatementValueType: null,
            bavStatementAmount: null,
          },
          confidence: {
            provider: details.provider ? 0.95 : 0,
            vblPlan: details.vblPlan ? 0.9 : 0,
            federalState: details.federalState ? 0.88 : 0,
            dates: details.startMonth && details.endMonth ? 0.92 : 0,
            employmentEndDate: details.employmentEndMonth ? 0.9 : 0,
            salary: 0,
            statePensionRefund: 0,
            bavStatementValue: 0,
          },
          missingFields: [],
          model: 'mistral-ocr-latest+mistral-large-latest',
        },
      }),
    });
  });
}

async function uploadPublicPensionDocument(page: import('@playwright/test').Page) {
  await expect(
    page.getByRole('heading', { name: 'Upload your pension document' })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByText(
      'Upload your VBL or ZVK letter, statement or pension document so we can check whether your refund can be started with CompanyPension.'
    )
  ).toBeVisible();
  await page.locator('input[name="publicPensionDocument"]').setInputFiles({
    name: 'vbl-statement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF get-started upload test'),
  });
  await expect(page.getByText('vbl-statement.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

test.describe('Public Sector Eligibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'VBL / ZVK Refund');
    await selectPublicEntryPath(page, 'Answer questions');
  });

  test('state not listed opens the explanatory notice', async ({ page }) => {
    await page.getByRole('button', { name: /My state is not listed/i }).click();

    await expect(
      page.getByText(
        'This refund cannot currently be estimated with CompanyPension'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        /CompanyPension currently checks VBL West contribution refunds/i
      )
    ).toBeVisible();
  });

  // ============================================================
  // Happy Paths — Eligible
  // ============================================================

  test('uploaded VBL document with complete details skips manual questions and becomes eligible', async ({
    page,
  }) => {
    await mockPublicUploadExtraction(page, {
      provider: 'VBL',
      vblPlan: 'VBLklassik',
      federalState: 'Bavaria',
      startMonth: 'January',
      startYear: '2016',
      endMonth: 'December',
      endYear: '2017',
      employmentEndMonth: 'December',
      employmentEndYear: '2017',
    });

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'VBL / ZVK Refund');
    await selectPublicEntryPath(page, 'Upload document');
    await uploadPublicPensionDocument(page);

    await expect(
      page.getByRole('heading', {
        name: 'We found these details in your document',
      })
    ).toBeVisible();
    await expect(
      page.getByText('Please check the details needed for the first refund check.')
    ).toBeVisible();
    await expect(page.getByLabel('Pension scheme')).toHaveValue('VBL');
    await expect(page.getByRole('button', { name: 'VBLklassik' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByLabel('Federal state or employer location')).toHaveValue(
      'Bavaria'
    );

    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expectEligibleResult(page);
  });

  test('uploaded ZVK document asks only missing needed fields and hides VBL plan', async ({
    page,
  }) => {
    await mockPublicUploadExtraction(page, {
      provider: 'ZVK',
      vblPlan: null,
      federalState: 'Berlin',
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null,
      employmentEndMonth: 'December',
      employmentEndYear: '2017',
    });

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'VBL / ZVK Refund');
    await selectPublicEntryPath(page, 'Upload document');
    await uploadPublicPensionDocument(page);

    await expect(
      page.getByRole('heading', { name: 'A few details are still needed' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'We could not confirm everything from your document. Please add the missing details so we can check whether your refund can be started.'
      )
    ).toBeVisible();
    await expect(page.getByLabel('Pension scheme shown on your document')).toHaveValue(
      'ZVK'
    );
    await expect(page.getByText('VBL plan')).toHaveCount(0);
    await expect(page.getByText('Missing details', { exact: true })).toHaveCount(4);

    await page.getByLabel('Start month', { exact: true }).selectOption('January');
    await page.getByLabel('Start year', { exact: true }).selectOption('2016');
    await page.getByLabel('End month', { exact: true }).selectOption('December');
    await page.getByLabel('End year', { exact: true }).selectOption('2017');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expectEligibleResult(page);
  });

  test('uploaded VBLextra document returns the negative result', async ({
    page,
  }) => {
    await mockPublicUploadExtraction(page, {
      provider: 'VBL',
      vblPlan: 'VBLextra',
      federalState: 'Bavaria',
      startMonth: 'January',
      startYear: '2016',
      endMonth: 'December',
      endYear: '2017',
      employmentEndMonth: 'December',
      employmentEndYear: '2017',
    });

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'VBL / ZVK Refund');
    await selectPublicEntryPath(page, 'Upload document');
    await uploadPublicPensionDocument(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expectNotEligibleResult(page);
  });

  test('VBL + VBLklassik + no consecutive + <36mo → eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'North Rhine-Westphalia');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'January', '2017');
    await selectContributionPeriod(page, 'No');
    await selectContributionDuration(page, 'Less than 36 months');
    await expectEligibleResult(page);
  });

  test('VBL + VBLklassik + no consecutive + 36-59mo → eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Bavaria');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'December', '2017');
    await selectContributionPeriod(page, 'No');
    await selectContributionDuration(page, '36 to 59 months');
    await expectEligibleResult(page);
  });

  test('Non-VBL state provider skips pension scheme → eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hesse');
    await selectPensionProvider(page, 'ZVK Darmstadt');
    // Pension scheme step should be skipped for non-VBL providers.
    await selectEmploymentEndDate(page, 'January', '2016');
    await selectContributionPeriod(page, 'No');
    await selectContributionDuration(page, 'Less than 36 months');
    await expectEligibleResult(page);
  });

  test('Hamburg only offers Hamburgisches Zusatzversorgungsgesetz', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hamburg');
    await expect(
      page
        .locator('select option')
        .filter({ hasText: 'Hamburgisches Zusatzversorgungsgesetz' })
    ).toHaveCount(1);
    await expect(
      page.locator('select option').filter({ hasText: /^VBL$/ })
    ).toHaveCount(0);
  });

  // ============================================================
  // Eastern States — Not Eligible
  // ============================================================

  const EASTERN_STATES = [
    'Brandenburg',
    'Saxony',
    'Thuringia',
    'Mecklenburg-Vorpommern',
    'Saxony-Anhalt',
  ];

  for (const state of EASTERN_STATES) {
    test(`Eastern state (${state}) → not eligible`, async ({ page }) => {
      await selectFederalState(page, state);
      await expectNotEligibleResult(page);
      await expect(
        page.getByText('This refund cannot currently be claimed with CompanyPension')
      ).toBeVisible();
    });
  }

  // ============================================================
  // Blocking Conditions — Not Eligible
  // ============================================================

  test('VBLextra plan → not eligible', async ({ page }) => {
    await selectFederalState(page, 'Berlin (West)');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLextra');
    await expectNotEligibleResult(page);
    await expect(
      page.getByText('This refund cannot currently be claimed with CompanyPension')
    ).toBeVisible();
  });

  test('Consecutive contribution yes with 2018+ end date → not eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hamburg');
    await selectPensionProvider(page, 'Hamburgisches Zusatzversorgungsgesetz');
    await selectEmploymentEndDate(page, 'January', '2018');
    await selectContributionPeriod(page, 'Yes');
    await expectNotEligibleResult(page);
  });

  test('Consecutive contribution yes with pre-2018 end date continues', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hamburg');
    await selectPensionProvider(page, 'Hamburgisches Zusatzversorgungsgesetz');
    await selectEmploymentEndDate(page, 'December', '2017');
    await selectContributionPeriod(page, 'Yes');
    await selectContributionDuration(page, 'Less than 36 months');
    await expectEligibleResult(page);
  });

  test('60+ months → not eligible', async ({ page }) => {
    await selectFederalState(page, 'Bremen');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'January', '2017');
    await selectContributionPeriod(page, 'No');
    await selectContributionDuration(page, '60 months or more');
    await expectNotEligibleResult(page);
  });

  // ============================================================
  // Reset Behavior
  // ============================================================

  test('Go back from ineligible resets flow', async ({ page }) => {
    await selectFederalState(page, 'Brandenburg');
    await expectNotEligibleResult(page);

    await page.getByRole('button', { name: /Return to start|Go back/ }).click();

    await expect(
      page.getByRole('heading', {
        name: 'What do you want to start?',
      })
    ).toBeVisible({ timeout: 5_000 });
  });
});
