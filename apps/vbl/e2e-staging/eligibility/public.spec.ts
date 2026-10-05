import { expect, test, type Page } from '@playwright/test';
import path from 'path';
import {
  completePublicFinalQuestions,
  completePublicUploadFinalQuestions,
  expectEligibleResult,
  expectNotEligibleResult,
  navigateToGetStarted,
  selectContributionDuration,
  selectContributionPeriod,
  selectEmploymentEndDate,
  selectEmploymentType,
  selectFederalState,
  selectPensionProvider,
  selectPensionScheme,
  selectPublicEntryPath,
} from '../../e2e/get-started/helpers';
import { FIXTURES, PUBLIC_STATES } from '../support/calculator';
import specimens from '../fixtures/specimens.json';

/**
 * Scenario 1 (eligibility check) — /get-started public-sector flow on
 * staging. Rules: components/vbl/get-started/flows/public-sector.ts.
 * Eligible: West state + VBL + VBLklassik + < 60 months + (ended before
 * 2018 or not consecutive) + all final answers No. ZVK, VBLextra, 60+
 * months, consecutive post-2018 periods and any Yes are rejected.
 */

async function startManual(page: Page) {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'VBL / ZVK Refund');
  await selectPublicEntryPath(page, 'Answer questions');
}

test.describe('eligibility · public sector · every state and provider', () => {
  for (const state of PUBLIC_STATES) {
    test(`${state} · VBL / VBLklassik is eligible`, async ({ page }) => {
      await startManual(page);
      await selectFederalState(page, state);
      await selectPensionProvider(page, 'VBL');
      await selectPensionScheme(page, 'VBLklassik');
      await selectEmploymentEndDate(page, 'January', '2017');
      await selectContributionDuration(page, 'Less than 36 months');
      await completePublicFinalQuestions(page);
      await expectEligibleResult(page);
    });

    test(`${state} · VBL / VBLextra is rejected`, async ({ page }) => {
      await startManual(page);
      await selectFederalState(page, state);
      await selectPensionProvider(page, 'VBL');
      await selectPensionScheme(page, 'VBLextra');
      await expectNotEligibleResult(page);
    });

    test(`${state} · ZVK is rejected with a link home`, async ({ page }) => {
      await startManual(page);
      await selectFederalState(page, state);
      await selectPensionProvider(page, 'ZVK');
      await expectNotEligibleResult(page);
      await expect(
        page.getByRole('link', { name: /Return to homepage/i })
      ).toBeVisible();
    });
  }
});

test.describe('eligibility · public sector · periods and answers', () => {
  test('state list holds only the supported West states', async ({ page }) => {
    await startManual(page);
    const options = await page
      .locator('select')
      .locator('option')
      .allTextContents();
    expect(options.slice(1)).toEqual([...PUBLIC_STATES]);
  });

  test('36–59 months, ended before 2018 → eligible', async ({ page }) => {
    await startManual(page);
    await selectFederalState(page, 'Bavaria');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'June', '2015');
    await selectContributionDuration(page, '36 to 59 months');
    await completePublicFinalQuestions(page);
    await expectEligibleResult(page);
  });

  test('60 months or more → rejected', async ({ page }) => {
    await startManual(page);
    await selectFederalState(page, 'Bavaria');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'June', '2015');
    await selectContributionDuration(page, '60 months or more');
    await expectNotEligibleResult(page);
  });

  test('ended 2018+ with consecutive contributions → rejected', async ({
    page,
  }) => {
    await startManual(page);
    await selectFederalState(page, 'Hesse');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'March', '2022');
    await selectContributionPeriod(page, 'Yes');
    await expectNotEligibleResult(page);
  });

  test('ended 2018+ without consecutive contributions → eligible', async ({
    page,
  }) => {
    await startManual(page);
    await selectFederalState(page, 'Hesse');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEmploymentEndDate(page, 'March', '2022');
    await selectContributionPeriod(page, 'No');
    await selectContributionDuration(page, 'Less than 36 months');
    await completePublicFinalQuestions(page);
    await expectEligibleResult(page);
  });

  for (let index = 0; index < 4; index += 1) {
    test(`a Yes on final question ${index + 1} → cannot be started`, async ({
      page,
    }) => {
      await startManual(page);
      await selectFederalState(page, 'Saarland');
      await selectPensionProvider(page, 'VBL');
      await selectPensionScheme(page, 'VBLklassik');
      await selectEmploymentEndDate(page, 'January', '2016');
      await selectContributionDuration(page, 'Less than 36 months');
      const answers: ('Yes' | 'No')[] = ['No', 'No', 'No', 'No'];
      answers[index] = 'Yes';
      await completePublicFinalQuestions(page, answers);
      await expect(
        page.getByRole('heading', {
          name: 'This refund cannot currently be started with CompanyPension',
        })
      ).toBeVisible();
    });
  }

  test('"My state is not listed" shows the West-only notice', async ({
    page,
  }) => {
    await startManual(page);
    await page.getByRole('button', { name: /My state is not listed/i }).click();
    await expect(
      page.getByText(
        'This refund cannot currently be estimated with CompanyPension'
      )
    ).toBeVisible();
  });
});

test.describe('eligibility · public sector · upload path (real OCR)', () => {
  test('a specimen VBL statement passes the upload gate', async ({ page }) => {
    test.setTimeout(150_000);
    const statement = specimens.statements.VBL;
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'VBL / ZVK Refund');
    await selectPublicEntryPath(page, 'Upload document');
    await expect(
      page.getByRole('heading', { name: 'Upload your pension document' })
    ).toBeVisible();
    await page
      .locator('input[name="publicPensionDocument"]')
      .setInputFiles(path.join(FIXTURES, statement.file));
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByRole('heading', {
        name: /We found these details in your document|A few details are still needed/,
      })
    ).toBeVisible({ timeout: 90_000 });

    // Complete whatever the extraction left empty.
    const wanted: Array<[RegExp, string]> = [
      [/^Pension scheme/, 'VBL'],
      [/^Federal state or employer location$/, statement.federalState],
      [/^Start month$/, statement.start.month],
      [/^Start year$/, statement.start.year],
      [/^End month$/, statement.end.month],
      [/^End year$/, statement.end.year],
      [/^Employment end month$/, statement.end.month],
      [/^Employment end year$/, statement.end.year],
    ];
    const extracted: Record<string, string> = {};
    for (const [label, value] of wanted) {
      const select = page.getByLabel(label);
      const current = await select.inputValue();
      extracted[label.source] = current;
      if (current === '') await select.selectOption(value);
    }
    test.info().annotations.push({
      type: 'ocr',
      description: `extracted: ${JSON.stringify(extracted)}`,
    });
    if (
      (await page
        .getByRole('button', { name: 'VBLklassik' })
        .getAttribute('aria-pressed')) !== 'true'
    ) {
      await page.getByRole('button', { name: 'VBLklassik' }).click();
    }
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await completePublicUploadFinalQuestions(page);
    await expectEligibleResult(page);
  });
});
