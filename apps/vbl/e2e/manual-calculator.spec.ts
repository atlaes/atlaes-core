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

test.describe('Manual VBL calculator', () => {
  test('matches the pension type design copy and only shows refund options', async ({
    page,
  }) => {
    await page.goto('/calculator');

    await expect(
      page.getByRole('heading', { name: 'What refund do you want to estimate?' })
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
    await expect(page.getByText('My state is not listed >')).toBeVisible();
    await page.getByLabel('Employer’s federal state').selectOption('Bavaria');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Select your company pension' })
    ).toBeVisible();
    await page.getByLabel('Company pension').selectOption('VBL');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'When did you pay into this pension?' })
    ).toBeVisible();
    await page.getByLabel('Start month').selectOption('January');
    await page.getByLabel('Start year').selectOption('2020');
    await page.getByLabel('End month').selectOption('December');
    await page.getByLabel('End year').selectOption('2021');
    await continueButton(page).click();

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

    await page.getByLabel('Employer’s federal state').selectOption('Bavaria');
    await continueButton(page).click();
    await page.getByLabel('Company pension').selectOption('VddKO');
    await continueButton(page).click();
    await page.getByLabel('Start month').selectOption('January');
    await page.getByLabel('Start year').selectOption('2023');
    await page.getByLabel('End month').selectOption('December');
    await page.getByLabel('End year').selectOption('2024');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'A few more details are needed for your estimate',
      })
    ).toBeVisible();
    await page.getByLabel('Less than 36 months').check();
    await page.getByLabel('Less than 60 months').check();
    await continueButton(page).click();

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

    await page.getByLabel('Employer’s federal state').selectOption('Bavaria');
    await continueButton(page).click();
    await page.getByLabel('Company pension').selectOption('VddB');
    await continueButton(page).click();
    await page.getByLabel('Start month').selectOption('January');
    await page.getByLabel('Start year').selectOption('2020');
    await page.getByLabel('End month').selectOption('December');
    await page.getByLabel('End year').selectOption('2023');
    await continueButton(page).click();

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
});
