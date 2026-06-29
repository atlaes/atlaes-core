import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectPublicEntryPath,
  selectFederalState,
  selectPensionProvider,
  selectPensionScheme,
  selectEmploymentEndDate,
  selectStagePensionDetails,
  selectStageContributionDuration,
  selectPrivatePensionProvider,
} from './helpers';

test.describe('Eligibility Edge Cases', () => {
  test.describe('Initial State', () => {
    test('Page loads with the start options visible', async ({ page }) => {
      await navigateToGetStarted(page);
      await expect(
        page.getByText('bAV / Company Pension Cash-Out')
      ).toBeVisible();
      await expect(page.getByText('VBL / ZVK Refund')).toBeVisible();
      await expect(page.getByText('VddB / VddKO Refund')).toBeVisible();
      await expect(page.getByText('Not sure')).toBeVisible();
    });

    test('Default VBL / ZVK choice opens the upload/manual choice', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await page.getByRole('button', { name: 'Start check' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Upload your pension document or continue manually',
        })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Public Sector Back Navigation', () => {
    test('Back from upload/manual choice returns to start choice', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'VBL / ZVK Refund');
      await expect(
        page.getByRole('heading', {
          name: 'Upload your pension document or continue manually',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { name: 'What do you want to start?' })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from federal state returns to upload/manual choice', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'VBL / ZVK Refund');
      await selectPublicEntryPath(page, 'Answer questions');
      await expect(
        page.getByRole('heading', {
          name: 'Where was your public-sector employer located?',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Upload your pension document or continue manually',
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from pension provider returns to federal state', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'VBL / ZVK Refund');
      await selectPublicEntryPath(page, 'Answer questions');
      await selectFederalState(page, 'Bavaria');
      await expect(
        page.getByRole('heading', { name: 'Select your company pension' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Where was your public-sector employer located?',
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from pension scheme returns to provider', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'VBL / ZVK Refund');
      await selectPublicEntryPath(page, 'Answer questions');
      await selectFederalState(page, 'Berlin (West)');
      await selectPensionProvider(page, 'VBL');
      await expect(
        page.getByRole('heading', { name: 'Select your company pension' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { name: 'Select your company pension' })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from contribution period returns to employment end date', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'VBL / ZVK Refund');
      await selectPublicEntryPath(page, 'Answer questions');
      await selectFederalState(page, 'Berlin (West)');
      await selectPensionProvider(page, 'VBL');
      await selectPensionScheme(page, 'VBLklassik');
      await selectEmploymentEndDate(page, 'January', '2017');
      await expect(
        page.getByRole('heading', { name: 'VBL contribution period' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { name: 'When did your employment end?' })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from non-VBL end date returns to provider', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'VBL / ZVK Refund');
      await selectPublicEntryPath(page, 'Answer questions');
      await selectFederalState(page, 'Hesse');
      await selectPensionProvider(page, 'ZVK Darmstadt');
      await expect(
        page.getByRole('heading', { name: 'When did your employment end?' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { name: 'Select your company pension' })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Stage Back Navigation', () => {
    test('Back from stage details returns to federal state', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
      await selectFederalState(page, 'Berlin (West)');
      await expect(
        page.getByRole('heading', {
          name: 'Stage / Orchestra pension details',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { name: 'Where was your employer located?' })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from stage duration returns to details', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
      await selectFederalState(page, 'Berlin (West)');
      await selectStagePensionDetails(page, 'VddB');
      await expect(
        page.getByRole('heading', {
          name: 'How many months did you contribute in total?',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Stage / Orchestra pension details',
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from end date returns to duration', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Stage / Performing Arts/ Orchestra');
      await selectFederalState(page, 'Berlin (West)');
      await selectStagePensionDetails(page, 'VddB');
      await selectStageContributionDuration(page, '12 to 35 months');
      await expect(
        page.getByRole('heading', { name: 'When did your employment end?' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'How many months did you contribute in total?',
        })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Private Sector Back Navigation', () => {
    test('Back from private provider returns to start choice', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Private Sector');
      await expect(
        page.getByRole('heading', {
          name: 'Which company pension did you contribute to?',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', { name: 'What do you want to start?' })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from contribution details returns to provider', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Private Sector');
      await selectPrivatePensionProvider(page, 'BVV');
      await expect(
        page.getByRole('heading', { name: 'Contribution details' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Which company pension did you contribute to?',
        })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Misc', () => {
    test('No back button on start choice', async ({ page }) => {
      await navigateToGetStarted(page);
      await expect(
        page.getByRole('button', { name: 'Back' })
      ).not.toBeVisible();
    });

    test('Switching start choices before clicking continue', async ({
      page,
    }) => {
      await navigateToGetStarted(page);

      await page.getByRole('button', { name: /VBL \/ ZVK Refund/i }).click();
      await page
        .getByRole('button', { name: /bAV \/ Company Pension Cash-Out/i })
        .click();
      await page.getByRole('button', { name: /VddB \/ VddKO Refund/i }).click();

      await page.getByRole('button', { name: 'Start check' }).click();
      await expect(
        page.getByRole('heading', { name: 'Where was your employer located?' })
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});
