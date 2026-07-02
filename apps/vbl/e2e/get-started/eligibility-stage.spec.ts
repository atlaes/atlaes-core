import { Page, test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectPublicEntryPath,
  selectStagePensionDetails,
  selectStageContributionDuration,
  selectEmploymentEndDate,
  expectEligibleResult,
  expectNotEligibleResult,
  expectWaitingResult,
  monthsAgo,
} from './helpers';

type StageUploadProvider = 'VddB' | 'VddKO' | null;

async function mockStageUploadExtraction(
  page: Page,
  details: {
    provider: StageUploadProvider;
    startMonth: string | null;
    startYear: string | null;
    endMonth: string | null;
    endYear: string | null;
    employmentEndMonth: string | null;
    employmentEndYear: string | null;
  }
) {
  let sawStagePensionType = false;

  await page.route('**/api/vbl/extract-pension-document', async (route) => {
    sawStagePensionType = route.request().postData()?.includes('vddb_vddko') ?? false;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        extraction: {
          details: {
            ...details,
            vblPlan: null,
            federalState: null,
            averageMonthlyGrossSalary: null,
            statePensionRefundReceived: null,
            bavStatementValueType: null,
            bavStatementAmount: null,
          },
          confidence: {
            provider: details.provider ? 0.95 : 0,
            vblPlan: 0,
            federalState: 0,
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

  return {
    sawStagePensionType: () => sawStagePensionType,
  };
}

async function uploadStagePensionDocument(page: Page) {
  await expect(
    page.getByRole('heading', {
      name: 'Upload your stage or orchestra pension document',
    })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByText(
      'Upload your VddB, VddKO, Bühnenversorgung or Kulturorchester document so we can check whether your refund can be started.'
    )
  ).toBeVisible();
  await page.locator('input[name="stagePensionDocument"]').setInputFiles({
    name: 'vddb-statement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF stage get-started upload test'),
  });
  await expect(page.getByText('vddb-statement.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

test.describe('Stage / Performing Arts Eligibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
    await expect(
      page.getByRole('heading', {
        name: 'Upload your pension document or continue manually',
      })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(
        'A pension document can help us check your case faster. You can also continue by answering a few questions.'
      )
    ).toBeVisible();
    await selectPublicEntryPath(page, 'Answer questions');
  });

  // ============================================================
  // Happy Path — Eligible
  // ============================================================

  test('12-35mo + old end date → eligible', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    // 36 months ago — well past the 24-month waiting period
    const date = monthsAgo(36);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectEligibleResult(page);
  });

  // ============================================================
  // Not Eligible
  // ============================================================

  test('<12mo → not eligible', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, 'Less than 12 months');
    await expectNotEligibleResult(page);
  });

  test('120+ total months → not eligible', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddKO');
    await selectStageContributionDuration(page, '120 months or more');
    await expectNotEligibleResult(page);
  });

  test('VddB 36-119mo with 60+ months after 2001 → not eligible', async ({
    page,
  }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '36 to 119 months');
    await expect(
      page.getByRole('heading', {
        name: 'How many of those contribution months were after 1 January 2001?',
      })
    ).toBeVisible();
    await selectStageContributionDuration(page, '60 months or more');
    await expectNotEligibleResult(page);
  });

  test('VddKO 36-119mo with 36+ months after 2018 → not eligible', async ({
    page,
  }) => {
    await selectStagePensionDetails(page, 'VddKO');
    await selectStageContributionDuration(page, '36 to 119 months');
    await expect(
      page.getByRole('heading', {
        name: 'How many of those contribution months were after 1 January 2018?',
      })
    ).toBeVisible();
    await selectStageContributionDuration(page, '36 months or more');
    await expectNotEligibleResult(page);
  });

  test('VddB 36-119mo with less than 60 months after 2001 → eligible', async ({
    page,
  }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectStageContributionDuration(page, 'Less than 60 months');
    const date = monthsAgo(36);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectEligibleResult(page);
  });

  test('VddKO 36-119mo with less than 36 months after 2018 → eligible', async ({
    page,
  }) => {
    await selectStagePensionDetails(page, 'VddKO');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectStageContributionDuration(page, 'Less than 36 months');
    const date = monthsAgo(36);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectEligibleResult(page);
  });

  // ============================================================
  // Waiting Period
  // ============================================================

  test('Recent end date (6mo ago) → waiting', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    const date = monthsAgo(6);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectWaitingResult(page);
  });

  test('End date 23mo ago → waiting (boundary)', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    // 23 months ago means the 24-month mark is next month → still waiting
    const date = monthsAgo(23);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectWaitingResult(page);
  });

  test('End date 25mo ago → eligible (boundary)', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    // 25 months ago — the eligible date (24 months after end) has passed
    const date = monthsAgo(25);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectEligibleResult(page);
  });

  // ============================================================
  // UI Elements on Waiting
  // ============================================================

  test('Notify button and close visible on waiting result', async ({
    page,
  }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    const date = monthsAgo(6);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectWaitingResult(page);

    await expect(
      page.getByRole('button', { name: /Notify me when I can start/i })
    ).toBeVisible();
    await expect(
      page.getByText("We'll send you an email reminder.")
    ).toBeVisible();
  });

  test('Reminder can be set from waiting result', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    const date = monthsAgo(6);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectWaitingResult(page);

    await page
      .getByRole('button', { name: /Notify me when I can start/i })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Your refund cannot be started yet' })
    ).toBeVisible();
    await page.getByPlaceholder('Email').fill('stage-test@example.com');
    await page.getByRole('button', { name: 'Set reminder' }).click();
    await expect(
      page.getByRole('heading', { name: 'Reminder set' })
    ).toBeVisible();
    await expect(
      page.getByText("We'll email you when you can start your refund.")
    ).toBeVisible();
  });

  // ============================================================
  // Upload Path
  // ============================================================

  test('uploaded VddB document with complete details becomes eligible', async ({
    page,
  }) => {
    const api = await mockStageUploadExtraction(page, {
      provider: 'VddB',
      startMonth: 'January',
      startYear: '2016',
      endMonth: 'December',
      endYear: '2017',
      employmentEndMonth: 'December',
      employmentEndYear: '2017',
    });

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
    await selectPublicEntryPath(page, 'Upload document');
    await uploadStagePensionDocument(page);

    expect(api.sawStagePensionType()).toBe(true);
    await expect(
      page.getByRole('heading', {
        name: 'We found these details in your document',
      })
    ).toBeVisible();
    await expect(page.getByLabel('Pension institution')).toHaveValue('VddB');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expectEligibleResult(page);
    await expect(
      page.getByRole('button', { name: 'Create secure claim', exact: true })
    ).toBeVisible();
  });

  test('uploaded VddKO document asks the additional contribution check when needed', async ({
    page,
  }) => {
    const date = monthsAgo(6);
    await mockStageUploadExtraction(page, {
      provider: 'VddKO',
      startMonth: 'January',
      startYear: '2016',
      endMonth: 'December',
      endYear: '2019',
      employmentEndMonth: date.month,
      employmentEndYear: date.year,
    });

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
    await selectPublicEntryPath(page, 'Upload document');
    await uploadStagePensionDocument(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(
      page.getByRole('heading', {
        name: 'A few more contribution details are needed',
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        'VddB/VddKO uses contribution-period rules based on how long and when contributions were paid.'
      )
    ).toBeVisible();
    await page.getByText('Less than 36 months').click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expectWaitingResult(page);
    await page
      .getByRole('button', { name: /Notify me when I can start/i })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Notify me when I can start' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Enter your email and we will remind you when the waiting period has passed.'
      )
    ).toBeVisible();
    await page.getByPlaceholder('Email').fill('stage-upload@example.com');
    await page.getByRole('button', { name: 'Set reminder' }).click();
    await expect(
      page.getByRole('heading', { name: 'Reminder set' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'We will remind you when your VddB/VddKO refund can be started with CompanyPension.'
      )
    ).toBeVisible();
  });

  test('uploaded stage document with missing dates asks for missing details', async ({
    page,
  }) => {
    await mockStageUploadExtraction(page, {
      provider: 'VddB',
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null,
      employmentEndMonth: 'December',
      employmentEndYear: '2017',
    });

    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
    await selectPublicEntryPath(page, 'Upload document');
    await uploadStagePensionDocument(page);

    await expect(
      page.getByRole('heading', { name: 'A few details are still needed' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'We could not confirm everything from your document. Please add the missing details so we can check whether your VddB/VddKO refund can be started.'
      )
    ).toBeVisible();
    await expect(page.getByText('Missing details', { exact: true })).toHaveCount(
      4
    );
  });
});
