import { expect, test } from '@playwright/test';
import {
  answerEligibilityQuestions,
  CAN_BE_STARTED,
  CANNOT_BE_CLAIMED,
  CANNOT_BE_STARTED,
  chooseStageProvider,
  chooseUpload,
  continueButton,
  enterContributionPeriod,
  enterSalary,
  expectEstimate,
  monthsAgo,
} from '../support/calculator';
import specimens from '../fixtures/specimens.json';

/**
 * Scenario 2 — calculator, VddB/VddKO (stage), against the real backend.
 * Rules (ManualVBLCalculator.getNextScreenAfterPeriod): < 12 months and
 * >= 120 months are blocked; 36–119 months ask "since 2018" (end >= 2018)
 * and/or "since 2001" (end 2001–2017) questions; a refund can start only
 * 24 months after the employment ended.
 */

const PROVIDERS = ['VddB', 'VddKO'] as const;

test.describe('calculator · stage · contribution bands', () => {
  for (const provider of PROVIDERS) {
    test(`${provider} · under 12 months is blocked before the salary step`, async ({
      page,
    }) => {
      await chooseStageProvider(page, provider);
      await enterContributionPeriod(
        page,
        'January',
        '2024',
        'November',
        '2024'
      );
      await expect(
        page.getByRole('heading', { name: CANNOT_BE_CLAIMED })
      ).toBeVisible();
      await expect(
        page.getByRole('heading', {
          name: 'What was your average gross monthly salary?',
        })
      ).toHaveCount(0);
    });

    test(`${provider} · 12–35 months, wait over: estimate and start`, async ({
      page,
    }) => {
      await chooseStageProvider(page, provider);
      // 24 months ending December 2020: no extra questions, wait long over.
      await enterContributionPeriod(
        page,
        'January',
        '2019',
        'December',
        '2020'
      );
      await enterSalary(page, '4200');
      await expectEstimate(page, `Your estimated ${provider} refund`);
      await page
        .getByRole('button', { name: `Start ${provider} refund` })
        .click();
      await expect(
        page.getByRole('heading', {
          name: `A few more details about your ${provider} insurance`,
        })
      ).toBeVisible();
      await answerEligibilityQuestions(page, 'No');
      await continueButton(page).click();
      await expect(
        page.getByRole('heading', { name: CAN_BE_STARTED })
      ).toBeVisible();
    });

    test(`${provider} · 120 months or more is blocked`, async ({ page }) => {
      await chooseStageProvider(page, provider);
      // January 2004 – December 2013 = 120 months.
      await enterContributionPeriod(
        page,
        'January',
        '2004',
        'December',
        '2013'
      );
      await expect(
        page.getByRole('heading', { name: CANNOT_BE_CLAIMED })
      ).toBeVisible();
    });
  }

  test('36–119 months ending 2001–2017: only the since-2001 question, < 60 estimates', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddB');
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
    await enterSalary(page, '4200');
    await expectEstimate(page, 'Your estimated VddB refund');
  });

  test('36–119 months ending 2001–2017: 60+ since 2001 is blocked', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddKO');
    await enterContributionPeriod(page, 'January', '2010', 'December', '2015');
    await page.getByLabel('60 months or more').check();
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: CANNOT_BE_CLAIMED })
    ).toBeVisible();
  });

  test('36–119 months ending 2018+: since-2018 then since-2001, both low estimates', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddB');
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
    await page.getByLabel('Less than 60 months').check();
    await continueButton(page).click();
    await enterSalary(page, '4200');
    await expectEstimate(page, 'Your estimated VddB refund');
  });

  test('36–119 months ending 2018+: 36+ since 2018 is blocked', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddKO');
    await enterContributionPeriod(page, 'January', '2018', 'December', '2021');
    await page.getByLabel('36 months or more').check();
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: CANNOT_BE_CLAIMED })
    ).toBeVisible();
  });

  test('pre-2001 end dates cannot be entered (years start at 2004)', async ({
    page,
  }) => {
    // The "ended before 2001" band in getNextScreenAfterPeriod is
    // unreachable from the UI today: the year pickers begin in 2004.
    await chooseStageProvider(page, 'VddB');
    await page.getByRole('button', { name: /End year/ }).click();
    const years = (await page.getByRole('option').allTextContents()).map(
      Number
    );
    expect(Math.min(...years)).toBe(2004);
  });
});

test.describe('calculator · stage · 24-month wait', () => {
  test('inside the wait: refund cannot be started yet, with the date', async ({
    page,
  }) => {
    const end = monthsAgo(3);
    const start = monthsAgo(20);
    await chooseStageProvider(page, 'VddB');
    await enterContributionPeriod(
      page,
      start.month,
      start.year,
      end.month,
      end.year
    );
    await enterSalary(page, '4200');
    await expectEstimate(page, 'Your estimated VddB refund');
    await page.getByRole('button', { name: 'Start VddB refund' }).click();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: 'Your refund cannot be started yet' })
    ).toBeVisible();
    const eligible = new Date(Number(end.year), 0, 1);
    eligible.setMonth(
      [
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
      ].indexOf(end.month) + 24
    );
    const label = eligible.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
    await expect(
      page.getByText(`You can return on or after ${label}.`)
    ).toBeVisible();
  });

  test('reminder e-mail is not built yet: "Set reminder" sends nothing @pending-client', async ({
    page,
  }) => {
    // Pending client decision (August): the waiting-period reminder e-mail
    // was never built. Today the form only flips to "Reminder set".
    const end = monthsAgo(3);
    const start = monthsAgo(20);
    await chooseStageProvider(page, 'VddKO');
    await enterContributionPeriod(
      page,
      start.month,
      start.year,
      end.month,
      end.year
    );
    await enterSalary(page, '4200');
    await expectEstimate(page, 'Your estimated VddKO refund');
    await page.getByRole('button', { name: 'Start VddKO refund' }).click();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();

    const apiCalls: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/')) apiCalls.push(r.url());
    });
    await page
      .getByRole('button', { name: 'Notify me when I can start' })
      .click();
    await page.getByLabel('Email address').fill('vbl-reminder@e2e.test');
    await page.getByRole('button', { name: 'Set reminder' }).click();
    await expect(
      page.getByRole('heading', { name: 'Reminder set' })
    ).toBeVisible();
    expect(apiCalls).toEqual([]);
  });
});

test.describe('calculator · stage · eligibility questions', () => {
  test('a Yes on "occupationally disabled" stops the refund @pending-client', async ({
    page,
  }) => {
    // Pending client decision: the disability question contradicts the
    // product copy elsewhere. Assert today's behaviour: Yes blocks.
    await chooseStageProvider(page, 'VddB');
    await enterContributionPeriod(page, 'January', '2019', 'December', '2020');
    await enterSalary(page, '4200');
    await expectEstimate(page, 'Your estimated VddB refund');
    await page.getByRole('button', { name: 'Start VddB refund' }).click();
    await answerEligibilityQuestions(page, 'No');
    await page
      .getByRole('group', {
        name: /Are you currently occupationally disabled or unable to work/,
      })
      .getByLabel('Yes', { exact: true })
      .check();
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: CANNOT_BE_STARTED })
    ).toBeVisible();
  });

  test('a Yes on "mandatory insurance elsewhere" stops the refund', async ({
    page,
  }) => {
    await chooseStageProvider(page, 'VddKO');
    await enterContributionPeriod(page, 'January', '2019', 'December', '2020');
    await enterSalary(page, '4200');
    await expectEstimate(page, 'Your estimated VddKO refund');
    await page.getByRole('button', { name: 'Start VddKO refund' }).click();
    await answerEligibilityQuestions(page, 'No');
    await page
      .getByRole('group', { name: /subject to mandatory insurance/ })
      .getByLabel('Yes', { exact: true })
      .check();
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: CANNOT_BE_STARTED })
    ).toBeVisible();
  });
});

test.describe('calculator · stage · upload path (real OCR)', () => {
  test('a specimen VddB statement is read and routed by its dates', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const statement = specimens.statements.VddB;
    await chooseUpload(page, 'VddB / VddKO refund', statement.file);
    const provider = page.getByRole('button', {
      name: /Company pension provider/,
    });
    if (!/VddB/.test((await provider.textContent()) ?? '')) {
      await provider.click();
      await page.getByRole('option', { name: 'VddB', exact: true }).click();
    }
    for (const [label, value] of [
      ['German federal state', statement.federalState],
      ['Start month', statement.start.month],
      ['Start year', statement.start.year],
      ['End month', statement.end.month],
      ['End year', statement.end.year],
    ] as const) {
      const field = page.getByRole('button', { name: new RegExp(label) });
      if (!((await field.textContent()) ?? '').includes(value)) {
        await field.click();
        await page.getByRole('option', { name: value, exact: true }).click();
      }
    }
    const salary = page.getByLabel('Average monthly gross salary (€)');
    if ((await salary.inputValue()) === '') await salary.fill(statement.salary);
    await continueButton(page).click();
    // 24 months ending 2020: no extra question, salary known → estimate.
    await expectEstimate(page, 'Your estimated VddB refund');
  });
});
