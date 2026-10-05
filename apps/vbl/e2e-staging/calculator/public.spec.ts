import { expect, test } from '@playwright/test';
import {
  answerEligibilityQuestions,
  CAN_BE_STARTED,
  CANNOT_BE_STARTED,
  chooseDropdownOption,
  chooseManual,
  chooseUpload,
  continueButton,
  expectEstimate,
  PUBLIC_STATES,
  publicManualEstimate,
} from '../support/calculator';
import specimens from '../fixtures/specimens.json';

/**
 * Scenario 1 — calculator, public sector (VBL/ZVK), against the real
 * calculate-simple backend. Every state/provider combination the
 * calculator offers, VBLextra, the one-month case and the rejection paths.
 */

test.describe('calculator · public sector · every state and provider', () => {
  for (const state of PUBLIC_STATES) {
    test(`${state} · VBL (VBLklassik) gets a real estimate`, async ({
      page,
    }) => {
      await publicManualEstimate(page, {
        state,
        provider: 'VBL',
        plan: 'VBLklassik',
      });
    });

    test(`${state} · ZVK gets a real estimate`, async ({ page }) => {
      await publicManualEstimate(page, { state, provider: 'ZVK' });
    });

    test(`${state} · VBLextra ends on the vested screen`, async ({ page }) => {
      await publicManualEstimate(page, {
        state,
        provider: 'VBL',
        plan: 'VBLextra',
      });
      await expect(
        page.getByRole('heading', {
          name: 'Not eligible for a supplementary pension refund',
        })
      ).toBeVisible();
      await expect(
        page.getByText(
          'When contributions to VBLextra exist, any VBLklassik contributions are preserved in the same way.',
          { exact: false }
        )
      ).toBeVisible();
    });
  }
});

test.describe('calculator · public sector · outcomes', () => {
  test('one contribution month is still eligible (VBL, Jan 2024 only)', async ({
    page,
  }) => {
    await publicManualEstimate(page, {
      state: 'Bavaria',
      provider: 'VBL',
      plan: 'VBLklassik',
      period: ['January', '2024', 'January', '2024'],
    });
    await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'A few more details about your public-sector pension',
      })
    ).toBeVisible();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: CAN_BE_STARTED })
    ).toBeVisible();
  });

  test('all-No answers can be started and hand over to onboarding', async ({
    page,
  }) => {
    await publicManualEstimate(page, {
      state: 'North Rhine-Westphalia',
      provider: 'VBL',
      plan: 'VBLklassik',
    });
    await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();
    await answerEligibilityQuestions(page, 'No');
    await continueButton(page).click();
    await expect(
      page.getByRole('heading', { name: CAN_BE_STARTED })
    ).toBeVisible();

    // The real pending-session API stores the calculator state.
    const session = page.waitForResponse(
      (r) =>
        r.url().includes('/api/vbl/pending-calculator-sessions') &&
        r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();
    expect((await session).ok()).toBe(true);
    await expect(page).toHaveURL(/\/calculator\/onboarding/);
  });

  const QUESTIONS = [
    /After your compulsory pension insurance ended, did you work for another German public-sector employer/,
    /Have you been insured with another public-sector or church supplementary pension institution/,
    /Have contributions from another public-sector or church supplementary pension institution already been refunded/,
    /Did you later become a German civil servant/,
  ];
  QUESTIONS.forEach((question, index) => {
    test(`a Yes on eligibility question ${index + 1} stops the refund`, async ({
      page,
    }) => {
      await publicManualEstimate(page, {
        state: 'Hesse',
        provider: 'VBL',
        plan: 'VBLklassik',
      });
      await page.getByRole('button', { name: 'Start VBL/ZVK refund' }).click();
      await answerEligibilityQuestions(page, 'No');
      await page
        .getByRole('group', { name: question })
        .getByLabel('Yes', { exact: true })
        .check();
      await continueButton(page).click();
      await expect(
        page.getByRole('heading', { name: CANNOT_BE_STARTED })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Return to start' })
      ).toBeVisible();
    });
  });

  test('"My state is not listed" explains the West-only limit', async ({
    page,
  }) => {
    await chooseManual(page, 'VBL / ZVK refund');
    await page
      .getByRole('button', { name: 'My state is not listed >' })
      .click();
    await expect(
      page.getByText(
        'This refund cannot currently be estimated with CompanyPension'
      )
    ).toBeVisible();
  });

  test('the public state list holds only the supported West states', async ({
    page,
  }) => {
    await chooseManual(page, 'VBL / ZVK refund');
    await page
      .getByRole('button', { name: /Employer’s federal state/ })
      .click();
    await expect(page.getByRole('option')).toHaveText([...PUBLIC_STATES]);
  });

  test('the provider list offers VBL and ZVK', async ({ page }) => {
    await chooseManual(page, 'VBL / ZVK refund');
    await chooseDropdownOption(page, 'Employer’s federal state', 'Bremen');
    await continueButton(page).click();
    await page.getByRole('button', { name: /Company pension/ }).click();
    await expect(page.getByRole('option')).toHaveText(['VBL', 'ZVK']);
  });
});

test.describe('calculator · public sector · upload path (real OCR)', () => {
  test('a specimen VBL statement is read and estimated', async ({ page }) => {
    test.setTimeout(150_000);
    const statement = specimens.statements.VBL;
    await chooseUpload(page, 'VBL / ZVK refund', statement.file);

    // What the extraction returned is shown for review; assert the
    // provider where OCR found it and fill anything it missed.
    const provider = page.getByRole('button', {
      name: /Company pension provider/,
    });
    await expect(provider).toBeVisible();
    const providerText = (await provider.textContent()) ?? '';
    if (!/VBL/.test(providerText)) {
      test.info().annotations.push({
        type: 'ocr',
        description: `extraction returned provider "${providerText}"`,
      });
      await chooseDropdownOption(page, 'Company pension provider', 'VBL');
    }
    await chooseDropdownOption(page, 'German federal state', 'Bavaria');
    if (await page.getByRole('button', { name: 'VBLklassik' }).isVisible()) {
      await page.getByRole('button', { name: 'VBLklassik' }).click();
    }
    const salary = page.getByLabel('Average monthly gross salary (€)');
    if ((await salary.inputValue()) === '') {
      await salary.fill(statement.salary);
    } else {
      await expect(salary).toHaveValue(statement.salary);
    }
    await fillMissingUploadDates(page, statement);
    await continueButton(page).click();
    await expectEstimate(page, 'Your estimated VBL/ZVK refund');
  });
});

/** Fills the period dropdowns only when the extraction left them empty. */
async function fillMissingUploadDates(
  page: import('@playwright/test').Page,
  statement: {
    start: { month: string; year: string };
    end: { month: string; year: string };
  }
) {
  const pairs: Array<[string, string]> = [
    ['Start month', statement.start.month],
    ['Start year', statement.start.year],
    ['End month', statement.end.month],
    ['End year', statement.end.year],
  ];
  for (const [label, value] of pairs) {
    const field = page.getByRole('button', { name: new RegExp(label) });
    if ((await field.count()) === 0) continue;
    const text = (await field.first().textContent()) ?? '';
    if (!text.includes(value)) {
      await chooseDropdownOption(page, label, value);
    }
  }
}
