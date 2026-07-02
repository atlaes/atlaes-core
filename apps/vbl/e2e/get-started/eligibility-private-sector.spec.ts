import { Page, test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectPrivateEntryPath,
  selectPrivatePensionProvider,
  fillPrivateContributionDetails,
  expectEligibleResult,
  expectReviewResult,
} from './helpers';

type PrivateUploadProvider =
  | 'Allianz'
  | 'Axa'
  | 'BVV'
  | 'Swiss_Life'
  | 'ERGO'
  | 'R_V'
  | 'Nuernberger'
  | 'HDI'
  | 'Other'
  | null;

async function mockPrivateUploadExtraction(
  page: Page,
  details: {
    provider: PrivateUploadProvider;
    statePensionRefundReceived: 'yes' | 'no' | null;
    bavStatementValueType:
      | 'monthly_pension'
      | 'capital_amount'
      | 'not_found'
      | null;
    bavStatementAmount: string | null;
  }
) {
  let sawPrivatePensionType = false;

  await page.route('**/api/vbl/extract-pension-document', async (route) => {
    sawPrivatePensionType =
      route.request().postData()?.includes('bav_private') ?? false;
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
            startMonth: null,
            startYear: null,
            endMonth: null,
            endYear: null,
            employmentEndMonth: null,
            employmentEndYear: null,
            averageMonthlyGrossSalary: null,
          },
          confidence: {
            provider: details.provider ? 0.95 : 0,
            vblPlan: 0,
            federalState: 0,
            dates: 0,
            employmentEndDate: 0,
            salary: 0,
            statePensionRefund: details.statePensionRefundReceived ? 0.9 : 0,
            bavStatementValue: details.bavStatementValueType ? 0.92 : 0,
          },
          missingFields: [],
          model: 'mistral-ocr-latest+mistral-large-latest',
        },
      }),
    });
  });

  return {
    sawPrivatePensionType: () => sawPrivatePensionType,
  };
}

async function uploadPrivatePensionDocument(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Upload your bAV document' })
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByText(
      'Upload a provider letter, insurance statement, bAV contract summary or pension statement so we can check whether your cash-out can be started.'
    )
  ).toBeVisible();
  await page.locator('input[name="privatePensionDocument"]').setInputFiles({
    name: 'bav-statement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF private bAV get-started upload test'),
  });
  await expect(page.getByText('bav-statement.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

test.describe('Private Sector Eligibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGetStarted(page);
  });

  // ============================================================
  // Start Option
  // ============================================================

  test('bAV option copy is visible on the start screen', async ({ page }) => {
    await navigateToGetStarted(page);
    await expect(
      page.getByText('For Direktversicherung and other bAV contracts.')
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: /bAV \/ Company Pension Cash-Out/i,
      })
      .click();
    await expect(
      page.getByText(
        'bAV cash-outs depend on your provider, contract value and whether the required conditions are met. We’ll check whether your case can be started through CompanyPension.'
      )
    ).toBeVisible();
  });

  test('private sector opens the private upload/manual choice', async ({
    page,
  }) => {
    await selectEmploymentType(page, 'Private Sector');
    await expect(
      page.getByRole('heading', {
        name: 'Upload your pension statement or continue manually',
      })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText(
        'A pension statement can help us check your case faster. You can also continue without uploading a document.'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        'You can upload only the relevant page. If you continue, the document can be carried into your secure claim so you do not need to upload it again.'
      )
    ).toBeVisible();
  });

  // ============================================================
  // Happy Paths — Eligible
  // ============================================================

  test('BVV + employer paid yes → eligible', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivatePensionProvider(page, 'BVV');
    await fillPrivateContributionDetails(page, {
      startMonth: 'January',
      startYear: '2018',
      endMonth: 'December',
      endYear: '2020',
      employerPaid: 'Yes',
    });
    await expectEligibleResult(page);
    // Private eligible has specific text
    await expect(
      page.getByText('A lump-sum settlement may be possible')
    ).toBeVisible();
  });

  test('Allianz + employer paid yes → eligible', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivatePensionProvider(page, 'Allianz');
    await fillPrivateContributionDetails(page, {
      startMonth: 'March',
      startYear: '2019',
      endMonth: 'June',
      endYear: '2021',
      employerPaid: 'Yes',
    });
    await expectEligibleResult(page);
  });

  // ============================================================
  // Review — Individual Assessment
  // ============================================================

  test('Other provider + employer yes → review', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivatePensionProvider(page, 'Other', 'MyPensionCo');
    await fillPrivateContributionDetails(page, {
      startMonth: 'February',
      startYear: '2017',
      endMonth: 'August',
      endYear: '2019',
      employerPaid: 'Yes',
    });
    await expectReviewResult(page);
  });

  test('Not sure is not offered in the bAV contribution details flow', async ({
    page,
  }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivatePensionProvider(page, 'BVV');

    await expect(
      page.getByRole('heading', { name: 'Contribution details' })
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Not sure' })).toHaveCount(0);
  });

  // ============================================================
  // Validation
  // ============================================================

  test('Other requires name before continue', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await expect(
      page.getByRole('heading', {
        name: 'Which company pension did you contribute to?',
      })
    ).toBeVisible({ timeout: 5_000 });

    await page.locator('select').selectOption('Other');

    // Continue button should be disabled without provider name
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();

    // Fill provider name
    await page.getByPlaceholder('Pension provider name').fill('MyPensionCo');
    await expect(continueBtn).toBeEnabled();
  });

  test('Continue disabled without required fields on contribution details', async ({
    page,
  }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivatePensionProvider(page, 'BVV');

    await expect(
      page.getByRole('heading', { name: 'Contribution details' })
    ).toBeVisible({ timeout: 5_000 });

    // Continue should be disabled initially (no dates/employer-paid selected)
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();
  });

  test('Monthly contribution is optional', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivatePensionProvider(page, 'Swiss_Life');

    await expect(
      page.getByRole('heading', { name: 'Contribution details' })
    ).toBeVisible({ timeout: 5_000 });

    // Verify the optional label is visible
    await expect(page.getByText('(optional)')).toBeVisible();

    // Fill required fields without monthly amount
    const selects = page.locator('select');
    await selects.nth(0).selectOption('January');
    await selects.nth(1).selectOption('2018');
    await selects.nth(2).selectOption('December');
    await selects.nth(3).selectOption('2020');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();

    // Continue should be enabled even without monthly amount
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeEnabled();
  });

  // ============================================================
  // Upload Path
  // ============================================================

  test('uploaded bAV document with approved DRV refund becomes eligible', async ({
    page,
  }) => {
    const api = await mockPrivateUploadExtraction(page, {
      provider: 'Allianz',
      statePensionRefundReceived: 'yes',
      bavStatementValueType: 'capital_amount',
      bavStatementAmount: '12400',
    });

    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Upload document');
    await uploadPrivatePensionDocument(page);

    expect(api.sawPrivatePensionType()).toBe(true);
    await expect(
      page.getByRole('heading', {
        name: 'We found these details in your document',
      })
    ).toBeVisible();
    await expect(page.getByLabel('Provider')).toHaveValue('Allianz');
    await expect(page.getByLabel('Pension value')).toHaveValue('12400');
    await expect(
      page.getByLabel('Value type shown on your document')
    ).toHaveValue('capital_amount');

    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Have you already received your German state pension refund?',
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        'For some bAV cash-outs, an approved German state pension refund can be important'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Yes, my German state pension refund has been approved',
      })
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expectEligibleResult(page);
  });

  test('uploaded bAV document with missing details asks for details and routes unapproved DRV refunds to review', async ({
    page,
  }) => {
    await mockPrivateUploadExtraction(page, {
      provider: null,
      statePensionRefundReceived: null,
      bavStatementValueType: null,
      bavStatementAmount: null,
    });

    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Upload document');
    await uploadPrivatePensionDocument(page);

    await expect(
      page.getByRole('heading', { name: 'A few details are still needed' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'We could not confirm everything from your document. Please add the missing details so we can check whether your bAV cash-out can be started.'
      )
    ).toBeVisible();
    await expect(
      page.getByText('Missing details', { exact: true })
    ).toHaveCount(3);

    await page.getByLabel('Provider').selectOption('BVV');
    await page.getByLabel('Pension value').fill('8750');
    await page
      .getByLabel('Value type shown on your document')
      .selectOption('capital_amount');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(
      page.getByRole('heading', {
        name: 'Have you already received your German state pension refund?',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue', exact: true })
    ).toBeDisabled();
    await page
      .getByRole('button', {
        name: 'No, I have not received a German state pension refund',
      })
      .click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expectReviewResult(page);
  });
});
