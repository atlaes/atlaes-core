import { expect, type Page, test } from '@playwright/test';

type CalculatePayload = {
  jobs: Array<{
    employmentType: string;
    supplementaryPensions: string[];
    startDate: string;
    endDate: string;
    averageMonthlyGrossSalary: string;
    germanFederalState: string | null;
  }>;
};

const continueButton = (page: Page) =>
  page.getByRole('button', { name: 'Continue', exact: true });

async function chooseDropdownOption(page: Page, label: string, option: string) {
  await page.getByRole('button', { name: new RegExp(label) }).click();
  await expect(page.getByRole('option', { name: option })).toBeVisible();
  await page.getByRole('option', { name: option }).click();
}

async function mockCalculation(page: Page, amount = 12000) {
  let payload: CalculatePayload | null = null;

  await page.route('**/api/vbl/calculate-simple', async (route) => {
    payload = route.request().postDataJSON() as CalculatePayload;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        calculation: {
          isEligible: true,
          calculationMethod: 'post2018',
          baseRefundAmount: amount,
          vatAmount: 0,
          totalAmount: amount,
          vblKlassik: amount,
          eligibilityReasons: [],
          rulesApplied: [],
          monthsContributed: 24,
        },
      }),
    });
  });

  return {
    getPayload: () => payload,
  };
}

async function mockExtraction(page: Page) {
  await page.route('**/api/vbl/extract-pension-document', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        extraction: {
          details: {
            provider: 'VBL',
            vblPlan: 'VBLklassik',
            federalState: 'Berlin',
            startMonth: 'January',
            startYear: '2020',
            endMonth: 'December',
            endYear: '2021',
            employmentEndMonth: 'December',
            employmentEndYear: '2021',
            averageMonthlyGrossSalary: '3500',
            statePensionRefundReceived: null,
            bavStatementValueType: null,
            bavStatementAmount: null,
          },
          confidence: {
            provider: 0.95,
            vblPlan: 0.91,
            federalState: 0.86,
            dates: 0.9,
            employmentEndDate: 0.8,
            salary: 0.78,
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

async function chooseManual(page: Page, pensionName: string) {
  await page.goto('/calculator');
  await expect(
    page.getByRole('heading', { name: 'What refund do you want to estimate?' })
  ).toBeVisible();

  await page.getByRole('button', { name: pensionName }).click();
  await continueButton(page).click();

  await expect(
    page.getByRole('heading', {
      name: 'Upload a pension document or enter details manually',
    })
  ).toBeVisible();
  await page.getByRole('button', { name: /Enter details manually/ }).click();
  await continueButton(page).click();
}

async function chooseUpload(page: Page, pensionName: string) {
  await page.goto('/calculator');
  await expect(
    page.getByRole('heading', { name: 'What refund do you want to estimate?' })
  ).toBeVisible();

  await page.getByRole('button', { name: pensionName }).click();
  await continueButton(page).click();

  await expect(
    page.getByRole('heading', {
      name: 'Upload a pension document or enter details manually',
    })
  ).toBeVisible();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Upload document/ }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'vbl-statement.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF test'),
  });
  await expect(page.getByText('vbl-statement.pdf')).toBeVisible();
  await continueButton(page).click();
}

async function enterContributionPeriod(
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

test.describe('Manual VBL calculator', () => {
  test('matches the pension type design copy and only shows refund options', async ({
    page,
  }) => {
    await page.goto('/calculator');

    await expect(
      page.getByRole('heading', {
        name: 'What refund do you want to estimate?',
      })
    ).toBeVisible();
    await expect(
      page.getByText('Estimate your possible VBL, ZVK, VddB or VddKO refund.')
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'VBL / ZVK refund Estimate your possible public-sector company pension refund.',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'VddB / VddKO refund Estimate your possible stage or orchestra pension refund.',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /bAV|Company Pension Cash-Out/ })
    ).toHaveCount(0);
  });

  test('calculates the manual VBL/ZVK estimate and sends the public-sector payload', async ({
    page,
  }) => {
    const api = await mockCalculation(page);

    await chooseManual(page, 'VBL / ZVK refund');

    await expect(
      page.getByRole('heading', {
        name: 'Where was your public-sector employer located?',
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Select the German federal state where your employer was based. CompanyPension currently only checks contributions in West Germany states.'
      )
    ).toBeVisible();
    const stateNotListed = page.getByRole('button', {
      name: 'My state is not listed >',
    });
    await expect(stateNotListed).toBeVisible();
    await expect(
      page.getByText(
        'This refund cannot currently be estimated with CompanyPension'
      )
    ).toHaveCount(0);
    await stateNotListed.click();
    await expect(
      page.getByText(
        'This refund cannot currently be estimated with CompanyPension'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        'CompanyPension currently checks VBL West contribution refunds. If your contributions were paid only while working in a state that is not listed, this refund cannot currently continue through the online calculator.'
      )
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Employer’s federal state/ })
      .click();
    await expect(page.getByRole('option', { name: 'Bavaria' })).toBeVisible();
    await page.getByRole('option', { name: 'Bavaria' }).click();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Select your company pension' })
    ).toBeVisible();
    await chooseDropdownOption(page, 'Company pension', 'VBL');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'When did you pay into this pension?' })
    ).toBeVisible();
    await enterContributionPeriod(page, 'January', '2020', 'December', '2021');

    await expect(
      page.getByRole('heading', {
        name: 'What was your average gross monthly salary?',
      })
    ).toBeVisible();
    await page.getByLabel('Average monthly gross salary (€)').fill('3500');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your estimated VBL/ZVK refund' })
    ).toBeVisible();
    await expect(page.getByText('€ 12,000')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start VBL/ZVK refund' })
    ).toBeVisible();

    expect(api.getPayload()).toEqual({
      jobs: [
        {
          employmentType: 'Public sector',
          supplementaryPensions: ['VBL'],
          startDate: '2020-01',
          endDate: '2021-12',
          averageMonthlyGrossSalary: '3500',
          germanFederalState: 'Bavaria',
        },
      ],
      userType: 'insured_person',
    });
  });

  test('calculates the manual VddB/VddKO estimate and sends the stage provider payload', async ({
    page,
  }) => {
    const api = await mockCalculation(page, 9000);

    await chooseManual(page, 'VddB / VddKO refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VddKO');
    await continueButton(page).click();

    await enterContributionPeriod(page, 'January', '2023', 'December', '2024');
    await expect(
      page.getByRole('heading', {
        name: 'What was your average gross monthly salary?',
      })
    ).toBeVisible();
    await page.getByLabel('Average monthly gross salary (€)').fill('5000');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your estimated VddB/VddKO refund' })
    ).toBeVisible();
    await expect(page.getByText('€ 9,000')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start VddB/VddKO refund' })
    ).toBeVisible();

    expect(api.getPayload()).toEqual({
      jobs: [
        {
          employmentType: 'Orchestra',
          supplementaryPensions: ['VddKO'],
          startDate: '2023-01',
          endDate: '2024-12',
          averageMonthlyGrossSalary: '5000',
          germanFederalState: 'Bavaria',
        },
      ],
      userType: 'insured_person',
    });
  });

  test('blocks VddB/VddKO manual estimates when contribution thresholds are exceeded', async ({
    page,
  }) => {
    await chooseManual(page, 'VddB / VddKO refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VddB');
    await continueButton(page).click();

    await enterContributionPeriod(page, 'January', '2017', 'December', '2019');
    await page.getByLabel('36 months or more').check();
    await page.getByLabel('Less than 60 months').check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be claimed with CompanyPension',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Return to start' })
    ).toBeVisible();
  });

  test('does not show the additional contribution check when VddB/VddKO starts in 2018 or later', async ({
    page,
  }) => {
    await chooseManual(page, 'VddB / VddKO refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VddB');
    await continueButton(page).click();
    await enterContributionPeriod(page, 'January', '2020', 'December', '2022');

    await expect(
      page.getByRole('heading', {
        name: 'A few more details are needed for your estimate',
      })
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be claimed with CompanyPension',
      })
    ).toBeVisible();
  });

  test('blocks contribution periods shorter than 12 months before collecting salary', async ({
    page,
  }) => {
    await chooseManual(page, 'VBL / ZVK refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VBL');
    await continueButton(page).click();
    await enterContributionPeriod(page, 'January', '2024', 'November', '2024');

    await expect(
      page.getByRole('heading', {
        name: 'What was your average gross monthly salary?',
      })
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be claimed with CompanyPension',
      })
    ).toBeVisible();
  });

  test('reviews uploaded VBL extraction details before calculating an estimate', async ({
    page,
  }) => {
    const api = await mockCalculation(page, 7500);
    await mockExtraction(page);

    await chooseUpload(page, 'VBL / ZVK refund');

    await expect(
      page.getByRole('heading', {
        name: 'We found these details in your document',
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Please check and correct anything that is missing or incorrect.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Company pension provider VBL/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /German federal state Berlin/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'VBLklassik' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'VBLextra' })).toBeVisible();
    await expect(
      page.getByLabel('Average monthly gross salary (€)')
    ).toHaveValue('3500');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your estimated VBL/ZVK refund' })
    ).toBeVisible();
    await expect(page.getByText('€ 7,500')).toBeVisible();
    expect(api.getPayload()).toEqual({
      jobs: [
        {
          employmentType: 'Public sector',
          supplementaryPensions: ['VBL'],
          startDate: '2020-01',
          endDate: '2021-12',
          averageMonthlyGrossSalary: '3500',
          germanFederalState: 'Berlin',
        },
      ],
      userType: 'insured_person',
    });
  });
});
