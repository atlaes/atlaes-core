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

async function mockOnboardingApi(page: import('@playwright/test').Page) {
  const user = {
    id: 'user_mock',
    email: TEST_EMAIL,
    emailVerified: true,
  };
  const claim = {
    id: 'claim_mock',
    userId: user.id,
    status: 'draft',
    workflowState: 'draft',
    completedSteps: {},
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/auth/magic-link/request', (route) =>
    route.fulfill(
      json({
        message: 'Magic link sent',
        magicLink: 'http://localhost:3000/auth/magic-link?token=mock-token',
      })
    )
  );
  await page.route('**/api/auth/magic-link/verify', (route) =>
    route.fulfill(
      json({
        message: 'Verified',
        user,
        tokens: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
        isNewUser: false,
      })
    )
  );
  await page.route('**/api/auth/me', (route) =>
    route.fulfill(json({ user }))
  );
  await page.route('**/api/claims', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(json({ success: true, claim }));
    }
    return route.fulfill(json({ success: true, claims: [claim] }));
  });
  await page.route('**/api/claims/claim_mock', (route) =>
    route.fulfill(json({ success: true, claim }))
  );
  await page.route('**/api/claims/claim_mock/documents', (route) =>
    route.fulfill(json({ success: true }))
  );
  await page.route('**/api/claims/claim_mock/steps/**', (route) =>
    route.fulfill(json({ success: true, claim }))
  );
  await page.route('**/api/claims/claim_mock/signature', (route) =>
    route.fulfill(json({ success: true, claim }))
  );
  await page.route('**/api/claims/claim_mock/submit', (route) =>
    route.fulfill(
      json({
        success: true,
        message: 'Claim submitted',
        claim: {
          ...claim,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        },
      })
    )
  );
  await page.route('**/api/payments/create-checkout-session', (route) =>
    route.fulfill(
      json({
        success: true,
        url: 'http://localhost:3000/get-started?payment=success&session_id=cs_mock',
        sessionId: 'cs_mock',
      })
    )
  );
  await page.route('**/api/payments/verify-session', (route) =>
    route.fulfill(
      json({
        success: true,
        claimId: claim.id,
        paymentStatus: 'paid',
      })
    )
  );
  await page.route('**/api/documents/upload', (route) =>
    route.fulfill(
      json({
        success: true,
        document: {
          id: 'document_mock',
          fileName: 'passport.jpg',
          fileType: 'application/pdf',
          fileSize: 1000,
          documentType: 'passport',
          status: 'processed',
          createdAt: new Date().toISOString(),
        },
        ocr: {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-15',
          gender: 'male',
          placeOfBirth: 'Sydney',
          nationality: 'Australian',
          passportNumber: 'P1234567',
          passportIssueDate: '',
          passportExpiryDate: '',
          issuingCountry: 'AU',
        },
      })
    )
  );
  await page.route('**/api/signatures/upload', (route) =>
    route.fulfill(
      json({
        success: true,
        signature: {
          id: 'signature_mock',
          s3Key: 'mock-signature.png',
          createdAt: new Date().toISOString(),
        },
      })
    )
  );
}

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get('http://localhost:3001/api/health');
    backendAvailable = response.ok();
  } catch {
    backendAvailable = false;
  }
});

test.describe('Onboarding Eligibility resource copy', () => {
  test('secure claim screen is reachable from public eligibility without backend services', async ({
    page,
  }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        "Create secure access to continue your refund request. We'll guide you step by step through the online process."
      )
    ).toBeVisible();
    await expect(page.getByPlaceholder('Email...')).toBeVisible();
  });

  test('mocked public onboarding reaches review and submitted states', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockOnboardingApi(page);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Create your secure claim/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);
    await completeBankDetails(page);
    await completeSignature(page);

    await expect(
      page.getByRole('heading', { name: 'Review your refund request' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: 'Pension details' })
    ).toBeVisible();
    await submitClaimOnReview(page);
    await expect(
      page.getByRole('heading', {
        name: 'Your refund request has been submitted',
      })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: 'German State Pension Refund' })
    ).toBeVisible();
  });
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
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
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
      page.getByRole('heading', { name: /Review your refund request/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ============================================================
  // Cross-Flow to Onboarding (Other Types)
  // ============================================================

  test('Private eligible reaches create account', async ({ page }) => {
    await navigatePrivateSectorToEligible(page);
    await page
      .getByRole('button', { name: /Start Claim|Create your secure claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
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
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Stage eligible reaches create account', async ({ page }) => {
    await navigateStageToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ============================================================
  // Create Account Validation
  // ============================================================

  test('Email required before continue', async ({ page }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });

    const submitBtn = page.getByRole('button', {
      name: /Continue with email/i,
    });
    await expect(submitBtn).toBeDisabled();
  });

  test('Google and Apple buttons visible', async ({ page }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
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

  test('Step indicator shows Check active initially', async ({
    page,
  }) => {
    await navigateToGetStarted(page);
    // The step labels should be present in the header
    await expect(
      page.getByText('Check', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Secure Claim')).toBeVisible();
    await expect(page.getByText('Complete Details')).toBeVisible();
    await expect(page.getByText('Sign & Submit')).toBeVisible();
  });

  test('Secure claim screen uses Eligibility resource copy', async ({
    page,
  }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        "Create secure access to continue your refund request. We'll guide you step by step through the online process."
      )
    ).toBeVisible();
    await expect(page.getByPlaceholder('Email...')).toBeVisible();
    await expect(
      page.getByText("No password needed — we'll send you a secure log in link")
    ).toBeVisible();
  });

  test('Payment screen explains deposit, service fee, and guarantee copy', async ({
    page,
  }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    await completeCreateAccount(page);
    await expect(
      page.getByRole('heading', { name: /Start your refund claim/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('Pay the €199 deposit to start your company pension refund claim.')
    ).toBeVisible();
    await expect(
      page.getByText('deposit — credited toward your service fee')
    ).toBeVisible();
    await expect(
      page.getByText(/Money-back guarantee:.*pension provider rejects your claim/i)
    ).toBeVisible();
  });

  test('Submit details tabs match Eligibility resource labels', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);

    await expect(page.getByText('Identity', { exact: true })).toBeVisible();
    await expect(page.getByText('Pension Details', { exact: true })).toBeVisible();
    await expect(page.getByText('Address', { exact: true })).toBeVisible();
    await expect(page.getByText('Bank Details', { exact: true })).toBeVisible();
    await expect(page.getByText('Signature', { exact: true })).toBeVisible();
    await expect(page.getByText('Review & Submit', { exact: true })).toBeVisible();
    await expect(page.getByText('Health Insurance')).not.toBeVisible();
    await expect(page.getByText('Employer Details')).not.toBeVisible();
  });

  test('Bank details supports own, trusted-person, and SummitFX branches', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);

    await expect(
      page.getByRole('heading', { name: 'Where should the refund be paid?' })
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('My own EUR / SEPA account')).toBeVisible();
    await expect(page.getByText("A trusted person’s EUR / SEPA account")).toBeVisible();
    await expect(page.getByText('I want to open a free EUR account')).toBeVisible();

    await page.getByRole('button', { name: /A trusted person’s EUR \/ SEPA account/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(
      page.getByRole('heading', { name: "Enter the trusted person’s bank details" })
    ).toBeVisible();
    await expect(
      page.getByText('I confirm that I have permission to use this bank account and that I trust the account holder.')
    ).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).last().click();
    await page.getByRole('button', { name: /I want to open a free EUR account/i }).click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Open your free EUR account' })
    ).toBeVisible();
    await expect(
      page.getByText('SummitFX uses your mobile number to set up and activate your EUR account.')
    ).toBeVisible();
  });

  test('Review screen uses refund request copy and Submit claim CTA', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);
    await completeBankDetails(page);
    await completeSignature(page);

    await expect(
      page.getByRole('heading', { name: 'Review your refund request' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: 'Pension details' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Submit claim' })
    ).toBeVisible();
  });

  test('Success screen uses submitted refund request copy', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);
    await completeBankDetails(page);
    await completeSignature(page);
    await submitClaimOnReview(page);

    await expect(
      page.getByRole('heading', { name: 'Your refund request has been submitted' })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText('The pension provider reviews your refund request.')
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'German State Pension Refund' })
    ).toBeVisible();
  });

  test('Sub-step tabs visible only on step 4 (Submit Details)', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();

    // Step 2 — Create Account: no sub-step tabs
    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
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
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
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
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);

    // Now on bank details
    await expect(
      page.getByRole('heading', { name: 'Where should the refund be paid?' })
    ).toBeVisible({ timeout: 5_000 });
  });

  // ============================================================
  // Signature Modes
  // ============================================================

  test('Signature has draw and upload modes', async ({ page }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', { name: /Continue securely|Create your secure claim/i })
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
    await expect(page.getByText('Draw signature')).toBeVisible();
    await expect(page.getByText('Upload signature image')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    // Switch to upload mode
    await page.getByText('Upload signature image').click();
    await expect(page.locator('input[type="file"]')).toBeAttached();

    // Switch back
    await page.getByText('Draw signature').click();
    await expect(page.locator('canvas')).toBeVisible();
  });
});
