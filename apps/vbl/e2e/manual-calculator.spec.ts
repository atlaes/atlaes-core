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

type PendingSessionPayload = {
  calculationResult?: {
    totalRefund: number;
    breakdown: unknown[];
    totalMonths: number;
  } | null;
  claimTypes: string[];
  pensionProvider?: string;
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
          // Mirrors the real VBLCalculationResult: the contribution period is
          // nested here. There is no top-level `monthsContributed` on the
          // response — that field belongs to the calculation *input*.
          calculationDetails: {
            contributionPeriod: 24,
            consecutivePeriod: 24,
            ageAtEmploymentEnd: 40,
            westGermanyEligible: true,
            timeSinceEmploymentEnd: 30,
          },
        },
      }),
    });
  });

  return {
    getPayload: () => payload,
  };
}

// Captures the POST the calculator makes when the user starts a claim, so
// tests can assert what is actually handed over to onboarding.
async function mockPendingSession(page: Page) {
  let payload: PendingSessionPayload | null = null;

  await page.route('**/api/vbl/pending-calculator-sessions', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    payload = route.request().postDataJSON() as PendingSessionPayload;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, token: 'test-token' }),
    });
  });

  return {
    getPayload: () => payload,
  };
}

// `details` overrides let a test mock a stage (VddB/VddKO) statement without
// repeating the whole extraction envelope.
async function mockExtraction(
  page: Page,
  details: Record<string, string | null> = {}
) {
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
            ...details,
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

// Walks the manual stage flow up to the contribution-period screen.
async function chooseStageProvider(page: Page, provider: string) {
  await chooseManual(page, 'VddB / VddKO refund');

  await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
  await continueButton(page).click();
  await chooseDropdownOption(page, 'Company pension', provider);
  await continueButton(page).click();
}

// Every post-estimate question renders as its own fieldset, so the repeated
// "Yes"/"No" answers can be scoped to the question they belong to.
async function answerEligibilityQuestions(page: Page, answer: 'Yes' | 'No') {
  const questions = page.getByRole('group');
  await expect(questions.first()).toBeVisible();

  const count = await questions.count();
  for (let index = 0; index < count; index += 1) {
    await questions.nth(index).getByLabel(answer, { exact: true }).check();
  }
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
    // Picking VBL gates Continue behind a plan choice.
    await page.getByRole('button', { name: 'VBLklassik' }).click();
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

  test('asks the public eligibility questions and hands the real contribution period to onboarding', async ({
    page,
  }) => {
    await mockCalculation(page);
    const session = await mockPendingSession(page);

    await chooseManual(page, 'VBL / ZVK refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VBL');
    // Picking VBL gates Continue behind a plan choice.
    await page.getByRole('button', { name: 'VBLklassik' }).click();
    await continueButton(page).click();
    await enterContributionPeriod(page, 'January', '2020', 'December', '2021');
    await page.getByLabel('Average monthly gross salary (€)').fill('3500');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your estimated VBL/ZVK refund' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();

    // The estimate no longer starts the claim directly — the eligibility
    // questionnaire runs first.
    await expect(
      page.getByRole('heading', {
        name: 'A few more details about your public-sector pension',
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Please answer these final questions so we can complete your refund check.'
      )
    ).toBeVisible();
    await expect(
      page.getByText('This includes another VBL or ZVK pension institution.')
    ).toBeVisible();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'Your refund can be started with CompanyPension',
      })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();

    // Regression: this used to read a `monthsContributed` field the API never
    // sends, so every claim reached onboarding with totalMonths: 0.
    await expect
      .poll(() => session.getPayload()?.calculationResult?.totalMonths ?? null)
      .toBe(24);
    await expect(page).toHaveURL(/\/calculator\/onboarding/);
  });

  test('stops the public flow when an eligibility question is answered yes', async ({
    page,
  }) => {
    await mockCalculation(page);

    await chooseManual(page, 'VBL / ZVK refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VBL');
    await page.getByRole('button', { name: 'VBLklassik' }).click();
    await continueButton(page).click();
    await enterContributionPeriod(page, 'January', '2020', 'December', '2021');
    await page.getByLabel('Average monthly gross salary (€)').fill('3500');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your estimated VBL/ZVK refund' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();

    await answerEligibilityQuestions(page, 'No');
    await page
      .getByRole('group', {
        name: /Did you later become a German civil servant/,
      })
      .getByLabel('Yes', { exact: true })
      .check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be started with CompanyPension',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Return to start' })
    ).toBeVisible();
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
      page.getByRole('heading', { name: 'Your estimated VddKO refund' })
    ).toBeVisible();
    await expect(page.getByText('€ 9,000')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start VddKO refund' })
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

  test('asks only the since-2001 stage question when the employment ended between 2001 and 2017', async ({
    page,
  }) => {
    await mockCalculation(page, 9000);

    await chooseStageProvider(page, 'VddB');
    // 36 contribution months ending December 2006 — inside the 2001-2017 window.
    await enterContributionPeriod(page, 'January', '2004', 'December', '2006');

    await expect(
      page.getByRole('heading', {
        name: 'How many VddB contribution months did you have since 1 January 2001?',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /since 1 January 2018/ })
    ).toHaveCount(0);

    await page.getByLabel('Less than 60 months').check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'What was your average gross monthly salary?',
      })
    ).toBeVisible();
    await page.getByLabel('Average monthly gross salary (€)').fill('5000');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your estimated VddB refund' })
    ).toBeVisible();
    await expect(page.getByText('€ 9,000')).toBeVisible();
  });

  test('blocks the stage flow at 60 or more contribution months since 2001', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddB');
    await enterContributionPeriod(page, 'January', '2004', 'December', '2006');

    await page.getByLabel('60 months or more').check();
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

  test('asks the since-2018 stage question first when the employment ended in 2018 or later', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddB');
    // 36 contribution months ending December 2020.
    await enterContributionPeriod(page, 'January', '2018', 'December', '2020');

    await expect(
      page.getByRole('heading', {
        name: 'How many VddB contribution months did you have since 1 January 2018?',
      })
    ).toBeVisible();

    await page.getByLabel('Less than 36 months').check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'How many VddB contribution months did you have since 1 January 2001?',
      })
    ).toBeVisible();
  });

  test('blocks the stage flow at 36 or more contribution months since 2018', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddB');
    await enterContributionPeriod(page, 'January', '2018', 'December', '2020');

    await page.getByLabel('36 months or more').check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'This refund cannot currently be claimed with CompanyPension',
      })
    ).toBeVisible();
  });

  test('offers a reminder when a stage refund is still inside the 24-month wait', async ({
    page,
  }) => {
    await mockCalculation(page, 9000);
    const currentYear = new Date().getFullYear();

    await chooseStageProvider(page, 'VddB');
    // 12 contribution months ending January of the current year, so the
    // 24-month wait after the employment ended is still running.
    await enterContributionPeriod(
      page,
      'February',
      String(currentYear - 1),
      'January',
      String(currentYear)
    );

    await page.getByLabel('Average monthly gross salary (€)').fill('5000');
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: 'Your estimated VddB refund' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start VddB refund' }).click();

    await expect(
      page.getByRole('heading', {
        name: 'A few more details about your VddB insurance',
      })
    ).toBeVisible();
    await expect(
      page.getByText('This means berufsunfähig or erwerbsunfähig.')
    ).toBeVisible();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: 'Your refund cannot be started yet' })
    ).toBeVisible();
    await expect(
      page.getByText(`You can return on or after January ${currentYear + 2}.`)
    ).toBeVisible();

    await page
      .getByRole('button', { name: 'Notify me when I can start' })
      .click();
    await page.getByLabel('Email address').fill('tester@example.com');
    await page.getByRole('button', { name: 'Set reminder' }).click();

    await expect(
      page.getByRole('heading', { name: 'Reminder set' })
    ).toBeVisible();
    await expect(
      page.getByText("We'll email you when you can start your refund.")
    ).toBeVisible();
  });

  test('lets a stage refund start once the 24-month wait has passed', async ({
    page,
  }) => {
    await mockCalculation(page, 9000);

    await chooseStageProvider(page, 'VddKO');
    await enterContributionPeriod(page, 'January', '2010', 'December', '2011');

    await page.getByLabel('Average monthly gross salary (€)').fill('5000');
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: 'Your estimated VddKO refund' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start VddKO refund' }).click();

    await expect(
      page.getByRole('heading', {
        name: 'A few more details about your VddKO insurance',
      })
    ).toBeVisible();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'Your refund can be started with CompanyPension',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start VddKO refund' })
    ).toBeVisible();
  });

  test('blocks stage contribution periods shorter than 12 months before collecting salary', async ({
    page,
  }) => {
    await chooseManual(page, 'VddB / VddKO refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VddB');
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

  test('lets public VBL/ZVK estimates through with periods shorter than 12 months', async ({
    page,
  }) => {
    const api = await mockCalculation(page);

    await chooseManual(page, 'VBL / ZVK refund');

    await chooseDropdownOption(page, 'Employer’s federal state', 'Bavaria');
    await continueButton(page).click();
    await chooseDropdownOption(page, 'Company pension', 'VBL');
    await page.getByRole('button', { name: 'VBLklassik' }).click();
    await continueButton(page).click();
    await enterContributionPeriod(page, 'January', '2024', 'January', '2024');

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
    expect(api.getPayload()).toEqual({
      jobs: [
        {
          employmentType: 'Public sector',
          supplementaryPensions: ['VBL'],
          startDate: '2024-01',
          endDate: '2024-01',
          averageMonthlyGrossSalary: '3500',
          germanFederalState: 'Bavaria',
        },
      ],
      userType: 'insured_person',
    });
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

  test('asks both stage questions on the upload path and skips the salary screen', async ({
    page,
  }) => {
    const api = await mockCalculation(page, 9000);
    // 36 contribution months ending December 2020, so both the since-2018 and
    // the since-2001 questions apply.
    await mockExtraction(page, {
      provider: 'VddB',
      vblPlan: null,
      federalState: 'Bavaria',
      startMonth: 'January',
      startYear: '2018',
      endMonth: 'December',
      endYear: '2020',
      employmentEndMonth: 'December',
      employmentEndYear: '2020',
      averageMonthlyGrossSalary: '5000',
    });

    await chooseUpload(page, 'VddB / VddKO refund');

    await expect(
      page.getByRole('heading', {
        name: 'We found these details in your document',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Company pension provider VddB/ })
    ).toBeVisible();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'How many VddB contribution months did you have since 1 January 2018?',
      })
    ).toBeVisible();
    await page.getByLabel('Less than 36 months').check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', {
        name: 'How many VddB contribution months did you have since 1 January 2001?',
      })
    ).toBeVisible();
    await page.getByLabel('Less than 60 months').check();
    await continueButton(page).click();

    // The upload already captured the salary, so the estimate runs straight
    // after the last question.
    await expect(
      page.getByRole('heading', { name: 'Your estimated VddB refund' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'What was your average gross monthly salary?',
      })
    ).toHaveCount(0);
    expect(api.getPayload()).toEqual({
      jobs: [
        {
          employmentType: 'Stage / Performing Arts',
          supplementaryPensions: ['VddB'],
          startDate: '2018-01',
          endDate: '2020-12',
          averageMonthlyGrossSalary: '5000',
          germanFederalState: 'Bavaria',
        },
      ],
      userType: 'insured_person',
    });
  });

  test('walks back out of the stage questions and re-routes after an end-date change', async ({
    page,
  }) => {
    await mockCalculation(page, 9000);

    await chooseStageProvider(page, 'VddB');
    // Ends December 2020, so the since-2018 question comes first.
    await enterContributionPeriod(page, 'January', '2004', 'December', '2020');

    await expect(
      page.getByRole('heading', { name: /since 1 January 2018/ })
    ).toBeVisible();
    await page.getByLabel('Less than 36 months').check();
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: /since 1 January 2001/ })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await expect(
      page.getByRole('heading', { name: /since 1 January 2018/ })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await expect(
      page.getByRole('heading', { name: 'When did you pay into this pension?' })
    ).toBeVisible();

    // Moving the end date into the 2001–2017 window must skip the since-2018
    // question, even though it was already answered.
    await chooseDropdownOption(page, 'End year', '2010');
    await continueButton(page).click();

    await expect(
      page.getByRole('heading', { name: /since 1 January 2001/ })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /since 1 January 2018/ })
    ).toHaveCount(0);
  });
});
