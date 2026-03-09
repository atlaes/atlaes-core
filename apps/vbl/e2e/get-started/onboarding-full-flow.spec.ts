import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  navigatePublicSectorToEligible,
  navigateStageToEligible,
  navigatePrivateSectorToEligible,
  selectEmploymentType,
  selectPrivatePensionProvider,
  fillPrivateContributionDetails,
  expectReviewResult,
  completeCreateAccount,
  completePayment,
  completeIdentityUpload,
  completeMembership,
  completeAddress,
  completeBankDetails,
  completeSignature,
  submitClaimOnReview,
  TEST_EMAIL,
} from './helpers';

// ============================================================
// Backend Health Check — skip all onboarding tests if unavailable
// ============================================================

let backendAvailable = false;

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get('http://localhost:3001/api/health');
    backendAvailable = response.ok();
  } catch {
    backendAvailable = false;
  }
});

test.describe('Onboarding Full Flow', () => {
  test.beforeEach(async () => {
    test.skip(
      !backendAvailable,
      'Backend API on port 3001 is not available — skipping onboarding tests'
    );
  });

  // ============================================================
  // Full E2E Happy Path
  // ============================================================

  test('Full flow: public eligible → onboarding → review step', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // 1. Complete eligibility
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();

    // 2. Create Account
    await completeCreateAccount(page);

    // 3. Payment
    await completePayment(page);

    // 4. Identity Upload
    await completeIdentityUpload(page);

    // 5. Membership
    await completeMembership(page);

    // 6. Address
    await completeAddress(page);

    // 7. Bank Details
    await completeBankDetails(page);

    // 8. Signature
    await completeSignature(page);

    // 9. Should reach Review your claim
    await expect(
      page.getByRole('heading', { name: /Review your claim/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ============================================================
  // Cross-Flow to Onboarding (Other Types)
  // ============================================================

  test('Private eligible reaches create account', async ({ page }) => {
    await navigatePrivateSectorToEligible(page);
    await page
      .getByRole('button', { name: /Start Claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Review result reaches create account', async ({ page }) => {
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivatePensionProvider(page, 'Other', 'TestPension');
    await fillPrivateContributionDetails(page, {
      startMonth: 'January',
      startYear: '2018',
      endMonth: 'December',
      endYear: '2020',
      employerPaid: 'Yes',
    });
    await expectReviewResult(page);

    await page
      .getByRole('button', { name: 'Proceed with review' })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Stage eligible reaches create account', async ({ page }) => {
    await navigateStageToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ============================================================
  // Create Account Validation
  // ============================================================

  test('Email required before continue', async ({ page }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible({ timeout: 10_000 });

    const submitBtn = page.getByRole('button', {
      name: /Continue with email/i,
    });
    await expect(submitBtn).toBeDisabled();
  });

  test('Google and Apple buttons visible', async ({ page }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('Continue with Google')
    ).toBeVisible();
    await expect(
      page.getByText('Continue with Apple')
    ).toBeVisible();
  });

  // ============================================================
  // Step Indicator & Sub-step Tabs
  // ============================================================

  test('Step indicator shows Eligibility active initially', async ({
    page,
  }) => {
    await navigateToGetStarted(page);
    // The step labels should be present in the header
    await expect(
      page.getByText('Eligibility', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Create Account')).toBeVisible();
    await expect(page.getByText('Start Claim')).toBeVisible();
    await expect(page.getByText('Submit Details')).toBeVisible();
  });

  test('Sub-step tabs visible only on step 4 (Submit Details)', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();

    // Step 2 — Create Account: no sub-step tabs
    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Identity')).not.toBeVisible();

    // Step 3 — Payment
    await completeCreateAccount(page);
    await expect(
      page.getByRole('heading', { name: /Start your refund claim/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Identity')).not.toBeVisible();

    // Step 4 — Submit Details: sub-step tabs should appear
    await completePayment(page);
    // Now on identity step — sub-step tabs should be visible
    await expect(page.getByText('Identity')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Address')).toBeVisible();
    await expect(page.getByText('Bank Details')).toBeVisible();
    await expect(page.getByText('Signature')).toBeVisible();
  });

  // ============================================================
  // Onboarding Back Navigation
  // ============================================================

  test('Back from identity → payment', async ({ page }) => {
    test.setTimeout(60_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);

    // Now on identity step
    await expect(
      page.getByRole('heading', { name: /passport|Upload/i })
    ).toBeVisible({ timeout: 10_000 });

    // Click back
    await page.getByRole('button', { name: 'Back' }).click();

    // Should go back to payment
    await expect(
      page.getByRole('heading', { name: /Start your refund claim/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  // ============================================================
  // Bank Details Expandable Options
  // ============================================================

  test('Bank details has expandable alternative options', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);

    // Now on bank details
    await expect(
      page.getByRole('heading', {
        name: /bank account|refund be paid/i,
      })
    ).toBeVisible({ timeout: 5_000 });

    // Check for expandable toggle
    const toggle = page.getByText(
      /Don't have a EUR\/SEPA account/i
    );
    await expect(toggle).toBeVisible();
  });

  // ============================================================
  // Signature Modes
  // ============================================================

  test('Signature has draw and upload modes', async ({ page }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);
    await completeBankDetails(page);

    // Now on signature step
    await expect(
      page.getByRole('heading', { name: 'Add your signature' })
    ).toBeVisible({ timeout: 5_000 });

    // Draw mode (default)
    await expect(page.getByText('Draw Signature')).toBeVisible();
    await expect(page.getByText('Upload Image')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    // Switch to upload mode
    await page.getByText('Upload Image').click();
    await expect(page.locator('input[type="file"]')).toBeAttached();

    // Switch back
    await page.getByText('Draw Signature').click();
    await expect(page.locator('canvas')).toBeVisible();
  });
});
