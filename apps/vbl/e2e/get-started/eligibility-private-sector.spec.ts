import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  selectEmploymentType,
  selectPrivatePensionProvider,
  fillPrivateContributionDetails,
  expectEligibleResult,
  expectReviewResult,
} from './helpers';

test.describe('Private Sector Eligibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToGetStarted(page);
  });

  // ============================================================
  // Info Banner
  // ============================================================

  test('Info banner appears when Private Sector selected', async ({
    page,
  }) => {
    await page.getByText('Private Sector').click();
    await expect(
      page.getByText(
        /Private sector company pensions usually do not allow a direct refund/
      )
    ).toBeVisible();
  });

  // ============================================================
  // Happy Paths — Eligible
  // ============================================================

  test('BVV + employer paid yes → eligible', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'BVV');
    await fillPrivateContributionDetails(page, {
      startMonth: 'January',
      startYear: '2018',
      endMonth: 'December',
      endYear: '2020',
      employerPaid: 'Yes',
    });
    await expectEligibleResult(page);
    // Private eligible has specific text
    await expect(
      page.getByText('A lump-sum settlement may be possible')
    ).toBeVisible();
  });

  test('Allianz + employer paid yes → eligible', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'Allianz');
    await fillPrivateContributionDetails(page, {
      startMonth: 'March',
      startYear: '2019',
      endMonth: 'June',
      endYear: '2021',
      employerPaid: 'Yes',
    });
    await expectEligibleResult(page);
  });

  // ============================================================
  // Review — Individual Assessment
  // ============================================================

  test('Other provider + employer yes → review', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'Other', 'MyPensionCo');
    await fillPrivateContributionDetails(page, {
      startMonth: 'February',
      startYear: '2017',
      endMonth: 'August',
      endYear: '2019',
      employerPaid: 'Yes',
    });
    await expectReviewResult(page);
  });

  test('Not sure is not offered in the bAV contribution details flow', async ({
    page,
  }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'BVV');

    await expect(
      page.getByRole('heading', { name: 'Contribution details' })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole('button', { name: 'Not sure' })
    ).toHaveCount(0);
  });

  // ============================================================
  // Validation
  // ============================================================

  test('Other requires name before continue', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await expect(
      page.getByRole('heading', {
        name: 'Which company pension did you contribute to?',
      })
    ).toBeVisible({ timeout: 5_000 });

    await page.locator('select').selectOption('Other');

    // Continue button should be disabled without provider name
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();

    // Fill provider name
    await page
      .getByPlaceholder('Pension provider name')
      .fill('MyPensionCo');
    await expect(continueBtn).toBeEnabled();
  });

  test('Continue disabled without required fields on contribution details', async ({
    page,
  }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'BVV');

    await expect(
      page.getByRole('heading', { name: 'Contribution details' })
    ).toBeVisible({ timeout: 5_000 });

    // Continue should be disabled initially (no dates/employer-paid selected)
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();
  });

  test('Monthly contribution is optional', async ({ page }) => {
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'Swiss_Life');

    await expect(
      page.getByRole('heading', { name: 'Contribution details' })
    ).toBeVisible({ timeout: 5_000 });

    // Verify the optional label is visible
    await expect(page.getByText('(optional)')).toBeVisible();

    // Fill required fields without monthly amount
    const selects = page.locator('select');
    await selects.nth(0).selectOption('January');
    await selects.nth(1).selectOption('2018');
    await selects.nth(2).selectOption('December');
    await selects.nth(3).selectOption('2020');
    await page
      .getByRole('button', { name: 'Yes', exact: true })
      .click();

    // Continue should be enabled even without monthly amount
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeEnabled();
  });
});
