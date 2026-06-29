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
