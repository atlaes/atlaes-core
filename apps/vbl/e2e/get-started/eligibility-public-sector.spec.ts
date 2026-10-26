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
  completePublicFinalQuestions,
  completePublicUploadFinalQuestions,
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

async function uploadPublicPensionDocument(
  page: import('@playwright/test').Page
) {
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
      page.getByText(
        'Please check the details needed for the first refund check.'
      )
    ).toBeVisible();
    await expect(page.getByLabel('Pension scheme')).toHaveValue('VBL');
    await expect(
      page.getByRole('button', { name: 'VBLklassik' })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByLabel('Federal state or employer location')
    ).toHaveValue('Bavaria');

    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    // Figma 2346-5922: the upload path ends on its own two-question gate,
    // titled after the confirmed scheme, not the manual four-question one.
    await expect(
      page.getByRole('heading', {
        name: 'A few more details about your VBL insurance',
      })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(
        'Are you currently occupationally disabled or unable to work?'
      )
    ).toBeVisible();
    await expect(
      page.getByText(/subject to mandatory insurance with another/)
    ).toBeVisible();
    await expect(
      page.getByText(/did you work for another German public-sector employer/)
    ).toHaveCount(0);
    await completePublicUploadFinalQuestions(page);
    await expectEligibleResult(page);
  });

  test('uploaded document: any Yes on the upload questionnaire → cannot be started', async ({
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
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // Figma 2346-6081 "Any Yes" → 2346-6090: the rejection says "started".
    await completePublicUploadFinalQuestions(page, ['No', 'Yes']);
    await expectNotEligibleResult(page);
    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be started with CompanyPension',
      })
    ).toBeVisible();
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
    await expect(
      page.getByLabel('Pension scheme shown on your document')
    ).toHaveValue('ZVK');
    await expect(page.getByText('VBL plan')).toHaveCount(0);
    await expect(
      page.getByText('Missing details', { exact: true })
    ).toHaveCount(4);

    await page
      .getByLabel('Start month', { exact: true })
      .selectOption('January');
    await page.getByLabel('Start year', { exact: true }).selectOption('2016');
    await page
      .getByLabel('End month', { exact: true })
      .selectOption('December');
    await page.getByLabel('End year', { exact: true }).selectOption('2017');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(
      page.getByRole('heading', {
        name: 'A few more details about your ZVK insurance',
      })
    ).toBeVisible({ timeout: 5_000 });
    await completePublicUploadFinalQuestions(page);
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
    // Pre-2018 end date skips the consecutive-contribution question.
    await selectEmploymentEndDate(page, 'January', '2017');
    await selectContributionDuration(page, 'Less than 36 months');
    await completePublicFinalQuestions(page);
    await expectEligibleResult(page);
  });

  test('VBL + VBLklassik + no consecutive + 36-59mo → eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Bavaria');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    // Pre-2018 end date skips the consecutive-contribution question.
    await selectEmploymentEndDate(page, 'December', '2017');
    await selectContributionDuration(page, '36 to 59 months');
    await completePublicFinalQuestions(page);
    await expectEligibleResult(page);
  });

  test('any Yes on the final questionnaire → not eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Bavaria');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'December', '2017');
    await selectContributionDuration(page, 'Less than 36 months');
    await completePublicFinalQuestions(page, ['No', 'Yes', 'No', 'No']);
    await expectNotEligibleResult(page);
    // Figma 1858-1192: the post-questionnaire rejection says "started".
    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be started with CompanyPension',
      })
    ).toBeVisible();
  });

  test('Recent employment end date does not trigger a waiting result (item 9: no 24-month rule for VBL/ZVK)', async ({
    page,
  }) => {
    await selectFederalState(page, 'North Rhine-Westphalia');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    // Employment end date is this month — well within what used to be the
    // 24-month waiting window. VBL/ZVK no longer has a waiting rule, so
    // this must resolve straight to eligible/not-eligible, never 'waiting'.
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
    await selectEmploymentEndDate(
      page,
      currentMonth,
      String(now.getFullYear())
    );
    await selectContributionPeriod(page, 'No');
    await selectContributionDuration(page, 'Less than 36 months');
    await completePublicFinalQuestions(page);
    await expectEligibleResult(page);
    await expect(
      page.getByRole('heading', { name: 'Your refund cannot be started yet' })
    ).toHaveCount(0);
  });

  // Figma 454-10444 / 455-15644 (tester feedback 2026-08-04): the manual
  // dropdown always offers VBL and ZVK; selecting ZVK ends on the rejection
  // screen whose button returns to the homepage.
  test('ZVK provider → cannot currently be claimed, return to homepage', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hesse');
    await selectPensionProvider(page, 'ZVK');
    await expectNotEligibleResult(page);
    await expect(
      page.getByRole('link', { name: /Return to homepage/i })
    ).toBeVisible();
  });

  test('Hamburg is not offered in the public-sector federal-state dropdown', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: /Where was your.*employer located/ })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('select option').filter({ hasText: /^Hamburg$/ })
    ).toHaveCount(0);
  });

  // ============================================================
  // Eastern States — removed from the public dropdown (the "My state is not
  // listed" notice covers them instead). The upload path keeps the
  // ineligibility backstop; here we only assert they cannot be selected.
  // ============================================================

  const EASTERN_STATES = [
    'Brandenburg',
    'Saxony',
    'Thuringia',
    'Mecklenburg-Vorpommern',
    'Saxony-Anhalt',
  ];

  for (const state of EASTERN_STATES) {
    test(`Eastern state (${state}) is not offered in the public dropdown`, async ({
      page,
    }) => {
      await expect(
        page.getByRole('heading', { name: /Where was your.*employer located/ })
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        page
          .locator('select option')
          .filter({ hasText: new RegExp(`^${state}$`) })
      ).toHaveCount(0);
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
    // Figma 1572-609 (tester feedback 2026-08-04): the rejection is the
    // plain title with no explanatory body copy.
    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be claimed with CompanyPension',
      })
    ).toBeVisible();
    await expect(
      page.getByText(/supplementary pension is vested/i)
    ).toHaveCount(0);
  });

  test('Consecutive contribution yes with 2018+ end date → not eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hesse');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'January', '2018');
    await selectContributionPeriod(page, 'Yes');
    await expectNotEligibleResult(page);
    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be claimed with CompanyPension',
      })
    ).toBeVisible();
  });

  test('Pre-2018 end date skips the consecutive-contribution question', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hesse');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'December', '2017');
    // The consecutive-contribution question is skipped for pre-2018 periods
    // (its 'yes' answer only blocks eligibility from 2018 onward), so the flow
    // goes straight to the total contribution duration screen.
    await expect(
      page.getByRole('heading', {
        name: /VBL contribution period|Contribution period/,
      })
    ).toHaveCount(0);
    await selectContributionDuration(page, 'Less than 36 months');
    await completePublicFinalQuestions(page);
    await expectEligibleResult(page);
  });

  test('60+ months → not eligible', async ({ page }) => {
    await selectFederalState(page, 'Bremen');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    // Pre-2018 end date skips the consecutive-contribution question.
    await selectEmploymentEndDate(page, 'January', '2017');
    await selectContributionDuration(page, '60 months or more');
    await expectNotEligibleResult(page);
  });

  // ============================================================
  // Reset Behavior
  // ============================================================

  test('Go back from ineligible resets flow', async ({ page }) => {
    await selectFederalState(page, 'Berlin (West)');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLextra');
    await expectNotEligibleResult(page);

    await page.getByRole('button', { name: /Return to start|Go back/ }).click();

    await expect(
      page.getByRole('heading', {
        name: 'What do you want to start?',
      })
    ).toBeVisible({ timeout: 5_000 });
  });
});
