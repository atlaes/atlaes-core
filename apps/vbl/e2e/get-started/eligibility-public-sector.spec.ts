import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectFederalState,
  selectPensionProvider,
  selectPensionScheme,
  selectEUContinuation,
  selectEmploymentEndDate,
  selectContributionPeriod,
  selectContributionDuration,
  expectEligibleResult,
  expectNotEligibleResult,
} from './helpers';

test.describe('Public Sector Eligibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Public sector');
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
    await selectEUContinuation(page, 'Yes');
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
    await selectEUContinuation(page, 'Yes');
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
    await selectEUContinuation(page, 'Yes');
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
        page.getByText('Not eligible for a supplementary pension refund')
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
      page.getByText('Not eligible for a supplementary pension refund')
    ).toBeVisible();
  });

  test('Consecutive contribution yes with 2018+ end date → not eligible', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hamburg');
    await selectPensionProvider(page, 'Hamburgisches Zusatzversorgungsgesetz');
    await selectEUContinuation(page, 'Yes');
    await selectEmploymentEndDate(page, 'January', '2018');
    await selectContributionPeriod(page, 'Yes');
    await expectNotEligibleResult(page);
  });

  test('Consecutive contribution yes with pre-2018 end date continues', async ({
    page,
  }) => {
    await selectFederalState(page, 'Hamburg');
    await selectPensionProvider(page, 'Hamburgisches Zusatzversorgungsgesetz');
    await selectEUContinuation(page, 'Yes');
    await selectEmploymentEndDate(page, 'December', '2017');
    await selectContributionPeriod(page, 'Yes');
    await selectContributionDuration(page, 'Less than 36 months');
    await expectEligibleResult(page);
  });

  test('60+ months → not eligible', async ({ page }) => {
    await selectFederalState(page, 'Bremen');
    await selectPensionProvider(page, 'VBL');
    await selectPensionScheme(page, 'VBLklassik');
    await selectEUContinuation(page, 'Yes');
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

    // Click "Go back" button — this calls reset()
    await page.getByRole('button', { name: 'Go back' }).click();

    // Should be back at the employment type selection
    await expect(
      page.getByRole('heading', {
        name: "Let's check your eligibility",
      })
    ).toBeVisible({ timeout: 5_000 });
  });
});
