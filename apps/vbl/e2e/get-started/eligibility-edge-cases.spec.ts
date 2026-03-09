import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectFederalState,
  selectPensionProvider,
  selectPensionScheme,
  selectStagePensionDetails,
  selectStageContributionDuration,
  selectPrivatePensionProvider,
  selectContributionPeriod,
  monthsAgo,
} from './helpers';

test.describe('Eligibility Edge Cases', () => {
  // ============================================================
  // Initial State
  // ============================================================

  test.describe('Initial State', () => {
    test('Page loads with 3 employment types visible', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await expect(page.getByText('Public sector')).toBeVisible();
      await expect(
        page.getByText('Stage / Performing Arts/ Orchestra')
      ).toBeVisible();
      await expect(page.getByText('Private Sector')).toBeVisible();
    });

    test('Continue disabled without selection', async ({ page }) => {
      await navigateToGetStarted(page);
      const continueBtn = page.getByRole('button', {
        name: 'Continue',
      });
      await expect(continueBtn).toBeDisabled();
    });
  });

  // ============================================================
  // Public Sector Back Navigation
  // ============================================================

  test.describe('Public Sector Back Navigation', () => {
    test('Back from federal state → employment type', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Public sector');
      await expect(
        page.getByRole('heading', {
          name: 'Where was your employer located?',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: "Let's check your eligibility",
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from pension provider → federal state', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Public sector');
      await selectFederalState(page, 'Bavaria');
      await expect(
        page.getByRole('heading', {
          name: 'Select your company pension provider',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Where was your employer located?',
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from pension scheme → provider', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Public sector');
      await selectFederalState(page, 'Berlin');
      await selectPensionProvider(page, 'VBL');
      await expect(
        page.getByRole('heading', {
          name: 'Select your pension scheme',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Select your company pension provider',
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from contribution period → scheme (VBL)', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Public sector');
      await selectFederalState(page, 'Berlin');
      await selectPensionProvider(page, 'VBL');
      await selectPensionScheme(page, 'VBLklassik');
      await expect(
        page.getByRole('heading', { name: 'Contribution period' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Select your pension scheme',
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from contribution period → provider (non-VBL, scheme skipped)', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(page, 'Public sector');
      await selectFederalState(page, 'Hesse');
      await selectPensionProvider(page, 'ZVK');
      // Pension scheme was skipped, so back should go to provider
      await expect(
        page.getByRole('heading', { name: 'Contribution period' })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Select your company pension provider',
        })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  // ============================================================
  // Stage Back Navigation
  // ============================================================

  test.describe('Stage Back Navigation', () => {
    test('Back from stage details → employment type', async ({
      page,
    }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(
        page,
        'Stage / Performing Arts/ Orchestra'
      );
      await expect(
        page.getByRole('heading', {
          name: 'Stage / Orchestra pension details',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: "Let's check your eligibility",
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from stage duration → details', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(
        page,
        'Stage / Performing Arts/ Orchestra'
      );
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

    test('Back from end date → duration', async ({ page }) => {
      await navigateToGetStarted(page);
      await selectEmploymentType(
        page,
        'Stage / Performing Arts/ Orchestra'
      );
      await selectStagePensionDetails(page, 'VddB');
      await selectStageContributionDuration(page, '12 to 35 months');
      await expect(
        page.getByRole('heading', {
          name: 'When did your employment end?',
        })
      ).toBeVisible({ timeout: 5_000 });

      await page.getByRole('button', { name: 'Back' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'How many months did you contribute in total?',
        })
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  // ============================================================
  // Private Sector Back Navigation
  // ============================================================

  test.describe('Private Sector Back Navigation', () => {
    test('Back from private provider → employment type', async ({
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
        page.getByRole('heading', {
          name: "Let's check your eligibility",
        })
      ).toBeVisible({ timeout: 5_000 });
    });

    test('Back from contribution details → provider', async ({
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

  // ============================================================
  // Miscellaneous Edge Cases
  // ============================================================

  test.describe('Misc', () => {
    test('No back button on employment type step', async ({ page }) => {
      await navigateToGetStarted(page);
      // The back button should not be present on the first step
      await expect(
        page.getByRole('button', { name: 'Back' })
      ).not.toBeVisible();
    });

    test('Switching employment types before clicking continue', async ({
      page,
    }) => {
      await navigateToGetStarted(page);

      // Select Public sector
      await page.getByText('Public sector').click();

      // Switch to Private Sector
      await page.getByText('Private Sector').click();

      // The info banner for private should appear
      await expect(
        page.getByText(
          /Private sector company pensions usually do not allow/
        )
      ).toBeVisible();

      // Switch to Stage
      await page.getByText('Stage / Performing Arts/ Orchestra').click();

      // Private info banner should disappear
      await expect(
        page.getByText(
          /Private sector company pensions usually do not allow/
        )
      ).not.toBeVisible();

      // Continue with Stage selected → should go to stage details
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(
        page.getByRole('heading', {
          name: 'Stage / Orchestra pension details',
        })
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});
