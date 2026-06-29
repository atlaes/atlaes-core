import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectFederalState,
  selectStagePensionDetails,
  selectStageContributionDuration,
  selectEmploymentEndDate,
  expectEligibleResult,
  expectNotEligibleResult,
  expectWaitingResult,
  monthsAgo,
} from './helpers';

test.describe('Stage / Performing Arts Eligibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
    await selectFederalState(page, 'Berlin (West)');
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
    await expect(
      page.getByText(/minimum contribution period of 12 months/)
    ).toBeVisible();
  });

  test('36+ months → not eligible', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddKO');
    await selectStageContributionDuration(page, '36 months or more');
    await expectNotEligibleResult(page);
    await expect(
      page.getByText(/contribution period exceeds the maximum limit/)
    ).toBeVisible();
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
      page.getByRole('button', { name: /Notify me when I'm eligible/i })
    ).toBeVisible();
    await expect(page.getByText('Close')).toBeVisible();
  });

  test('Close button resets flow from waiting', async ({ page }) => {
    await selectStagePensionDetails(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    const date = monthsAgo(6);
    await selectEmploymentEndDate(page, date.month, date.year);
    await expectWaitingResult(page);

    await page.getByText('Close').click();

    // Should be back at the employment type selection
    await expect(
      page.getByRole('heading', {
        name: 'What do you want to start?',
      })
    ).toBeVisible({ timeout: 5_000 });
  });
});
