import { expect, test, type Page } from '@playwright/test';
import {
  expectEligibleResult,
  expectNotEligibleResult,
  expectWaitingResult,
  monthsAgo,
  navigateToGetStarted,
  selectEmploymentEndDate,
  selectEmploymentType,
  selectPublicEntryPath,
  selectStageContributionDuration,
  selectStagePensionDetails,
} from '../../e2e/get-started/helpers';

/**
 * Scenario 2 (eligibility check) — /get-started VddB/VddKO flow on staging.
 * Rules: components/vbl/get-started/flows/stage.ts. Under 12 and 120+
 * months are rejected; 12–35 and 36–119 ask the employment end date;
 * 36–119 adds the since-2018 / since-2001 questions by end date; a refund
 * starts 24 months after the employment ended.
 */

async function startStage(page: Page, provider: 'VddB' | 'VddKO') {
  await navigateToGetStarted(page);
  await selectEmploymentType(page, 'VddB / VddKO Refund');
  await selectPublicEntryPath(page, 'Answer questions');
  await selectStagePensionDetails(page, provider);
}

test.describe('eligibility · stage', () => {
  for (const provider of ['VddB', 'VddKO'] as const) {
    test(`${provider} · less than 12 months → rejected`, async ({ page }) => {
      await startStage(page, provider);
      await selectStageContributionDuration(page, 'Less than 12 months');
      await expectNotEligibleResult(page);
    });

    test(`${provider} · 12–35 months, wait over → eligible`, async ({
      page,
    }) => {
      await startStage(page, provider);
      await selectStageContributionDuration(page, '12 to 35 months');
      await selectEmploymentEndDate(page, 'January', '2020');
      await expectEligibleResult(page);
    });

    test(`${provider} · 120 months or more → rejected`, async ({ page }) => {
      await startStage(page, provider);
      await selectStageContributionDuration(page, '120 months or more');
      await expectNotEligibleResult(page);
    });
  }

  test('36–119 months ending 2001–2017: since-2001 < 60 → eligible', async ({
    page,
  }) => {
    await startStage(page, 'VddB');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectEmploymentEndDate(page, 'June', '2012');
    await selectStageContributionDuration(page, 'Less than 60 months');
    await expectEligibleResult(page);
  });

  test('36–119 months ending 2001–2017: since-2001 60+ → rejected', async ({
    page,
  }) => {
    await startStage(page, 'VddKO');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectEmploymentEndDate(page, 'June', '2012');
    await selectStageContributionDuration(page, '60 months or more');
    await expectNotEligibleResult(page);
  });

  test('36–119 months ending 2018+: since-2018 36+ → rejected', async ({
    page,
  }) => {
    await startStage(page, 'VddB');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectEmploymentEndDate(page, 'June', '2021');
    await selectStageContributionDuration(page, '36 months or more');
    await expectNotEligibleResult(page);
  });

  test('36–119 months ending 2018+: < 36 then < 60 → eligible', async ({
    page,
  }) => {
    await startStage(page, 'VddKO');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectEmploymentEndDate(page, 'June', '2021');
    await selectStageContributionDuration(page, 'Less than 36 months');
    await selectStageContributionDuration(page, 'Less than 60 months');
    await expectEligibleResult(page);
  });

  test('36–119 months ending 2018+: < 36 then 60+ → rejected', async ({
    page,
  }) => {
    await startStage(page, 'VddB');
    await selectStageContributionDuration(page, '36 to 119 months');
    await selectEmploymentEndDate(page, 'June', '2021');
    await selectStageContributionDuration(page, 'Less than 36 months');
    await selectStageContributionDuration(page, '60 months or more');
    await expectNotEligibleResult(page);
  });

  test('pre-2001 end dates cannot be entered (years start at 2004)', async ({
    page,
  }) => {
    await startStage(page, 'VddB');
    await selectStageContributionDuration(page, '36 to 119 months');
    const years = await page
      .locator('select')
      .nth(1)
      .locator('option')
      .allTextContents();
    expect(years).toContain('2004');
    expect(years).not.toContain('2003');
    expect(years).not.toContain('2000');
  });

  test('inside the 24-month wait → waiting screen with the start date', async ({
    page,
  }) => {
    const end = monthsAgo(6);
    await startStage(page, 'VddB');
    await selectStageContributionDuration(page, '12 to 35 months');
    await selectEmploymentEndDate(page, end.month, end.year);
    await expectWaitingResult(page);
  });

  test('exactly 24 months after the end → eligible', async ({ page }) => {
    const end = monthsAgo(24);
    await startStage(page, 'VddKO');
    await selectStageContributionDuration(page, '12 to 35 months');
    await selectEmploymentEndDate(page, end.month, end.year);
    await expectEligibleResult(page);
  });
});
