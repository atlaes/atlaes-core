import { test, expect } from '@playwright/test';
import {
  navigateToGetStarted,
  navigatePublicSectorToEligible,
  navigateStageToEligible,
  navigatePrivateSectorToEligible,
  selectEmploymentType,
  selectPrivateEntryPath,
  selectPrivateStatePensionRefund,
  selectPrivatePensionProvider,
  fillPrivateStatementAmount,
  expectEligibleResult,
  completeCreateAccount,
  completePayment,
  completeIdentityUpload,
  completeMembership,
  completeAddress,
  completeBankDetails,
  completeSignature,
  completeReview,
  completeConfirmStep,
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
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
        isNewUser: false,
      })
    )
  );
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user })));
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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

    // New order: Bank details → Review → Confirm → Signature (terminal submit).
    await expect(
      page.getByRole('heading', { name: 'Review your refund request' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: 'Pension details' })
    ).toBeVisible();
    await page
      .getByRole('button', { name: /Continue to confirmation/i })
      .click();
    await completeConfirmStep(page);
    await completeSignature(page);
    await expect(
      page.getByRole('heading', {
        name: 'Your refund request has been submitted',
      })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: 'German State Pension Refund' })
    ).toBeVisible();

    // Task 13 fix round 1 (CRITICAL 1): submission clears both persisted
    // blobs via clearAllFlowPersistence(), and the write-through effects
    // must not resurrect them afterwards (they used to, racing the clear —
    // see OnboardingContext's successData guard). A refresh on the success
    // screen must not be able to resume a claim that's already submitted.
    const persistedAfterSubmit = await page.evaluate(() => ({
      onboarding: window.sessionStorage.getItem('vbl_onboarding_v1'),
      eligibility: window.sessionStorage.getItem('vbl_eligibility_v1'),
    }));
    expect(persistedAfterSubmit.onboarding).toBeNull();
    expect(persistedAfterSubmit.eligibility).toBeNull();
  });

  // ============================================================
  // Confirm step (public/stage flow, between Review and Signature)
  // ============================================================

  test('Confirm step blocks until all declarations are checked', async ({
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
    await completeReview(page);

    await expect(
      page.getByRole('heading', { name: 'Confirm your refund information' })
    ).toBeVisible({ timeout: 10_000 });

    // Section 1's four answers default to "No", but the eight declaration +
    // authorization checkboxes start unchecked, so the CTA is disabled.
    const continueBtn = page.getByRole('button', {
      name: /Continue to signature/i,
    });
    await expect(continueBtn).toBeDisabled();

    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes).toHaveCount(8);
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await expect(continueBtn).toBeEnabled();
  });

  test('Changing a Confirm answer to Yes stops the application', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await mockOnboardingApi(page);

    // Capture the stop call. Registered after mockOnboardingApi so it takes
    // precedence for the /stop path.
    await page.route('**/api/claims/*/stop', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claim: { id: 'claim_mock', status: 'rejected' },
        }),
      })
    );

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
    await completeReview(page);

    await expect(
      page.getByRole('heading', { name: 'Confirm your refund information' })
    ).toBeVisible({ timeout: 10_000 });

    // Edit the first Section-1 answer and switch it from No to Yes.
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();

    // The confirmation modal appears before the Yes is committed.
    await expect(
      page.getByRole('heading', {
        name: 'This answer will stop your refund application',
      })
    ).toBeVisible();

    // Confirming fires the stop endpoint (with a non-empty reasons array) and
    // shows the terminal stop screen.
    const stopRequest = page.waitForRequest('**/api/claims/*/stop');
    await page.getByRole('button', { name: 'Yes, change my answer' }).click();
    const stopBody = (await stopRequest).postDataJSON() as {
      reasons?: string[];
    };
    expect(Array.isArray(stopBody.reasons)).toBe(true);
    expect(stopBody.reasons?.length ?? 0).toBeGreaterThan(0);

    await expect(
      page.getByRole('heading', {
        name: /This refund cannot currently be started with CompanyPension/i,
      })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        'Your deposit will be refunded to the same payment method.'
      )
    ).toBeVisible();
  });

  // ============================================================
  // Task 13 fix round 1 (IMPORTANT 4): mid-onboarding position restore
  // ============================================================

  test('refreshing mid-onboarding restores the same sub-step and a restored field value', async ({
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

    // Now on the membership sub-step. Fill the membership number (this is
    // pre-claim-save form state that only lives in sessionStorage until the
    // user clicks Continue) and reload without continuing.
    await expect(
      page.getByRole('heading', { name: 'VBL pension details' })
    ).toBeVisible({ timeout: 5_000 });
    const providerSelect = page.locator('select').first();
    if ((await providerSelect.count()) > 0) {
      await providerSelect.selectOption('VBL');
    }
    const membershipInput = page.getByPlaceholder(
      /VBL insurance number|membership number/i
    );
    await membershipInput.fill('VBL999888');

    await page.reload();

    // Still on the membership sub-step (not bounced back to identity or the
    // eligibility start screen), and the membership number typed before the
    // reload is still there — proving both position and pre-claim data were
    // restored from sessionStorage, not just the identity fields already
    // saved to the mocked backend.
    await expect(
      page.getByRole('heading', { name: 'VBL pension details' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(membershipInput).toHaveValue('VBL999888');
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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

    // 8. Review now comes right after Bank details (before Confirm + the
    // terminal Signature step).
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
      .getByRole('button', {
        name: /Start bAV cash-out|Create your secure claim/i,
      })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Other provider eligible result reaches create account', async ({
    page,
  }) => {
    await navigateToGetStarted(page);
    await selectEmploymentType(page, 'Private Sector');
    await selectPrivateEntryPath(page, 'Answer questions');
    await selectPrivateStatePensionRefund(page, 'No');
    await selectPrivatePensionProvider(page, 'Other', 'TestPension');
    await fillPrivateStatementAmount(page, {
      statementAmount: '9000',
      valueType: 'capital_amount',
    });
    await expectEligibleResult(page);

    await page
      .getByRole('button', {
        name: /Start bAV cash-out|Create your secure claim/i,
      })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Stage eligible reaches create account', async ({ page }) => {
    await navigateStageToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Continue with Apple')).toBeVisible();
  });

  // ============================================================
  // Step Indicator & Sub-step Tabs
  // ============================================================

  test('Step indicator shows Check active initially', async ({ page }) => {
    await navigateToGetStarted(page);
    // The step labels should be present in the header
    await expect(page.getByText('Check', { exact: true })).toBeVisible();
    await expect(page.getByText('Secure Claim')).toBeVisible();
    await expect(page.getByText('Complete Details')).toBeVisible();
    await expect(page.getByText('Sign & Submit')).toBeVisible();
  });

  test('Secure claim screen uses Eligibility resource copy', async ({
    page,
  }) => {
    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
      .click();

    await completeCreateAccount(page);
    await expect(
      page.getByRole('heading', { name: /Start your refund claim/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(
        'Pay the €199 deposit to start your company pension refund claim.'
      )
    ).toBeVisible();
    await expect(
      page.getByText('deposit — credited toward your service fee')
    ).toBeVisible();
    await expect(
      page.getByText(
        /Money-back guarantee:.*pension provider rejects your claim/i
      )
    ).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  });

  test('Submit details tabs match Eligibility resource labels', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);

    await expect(page.getByText('Identity', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Pension Details', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Address', { exact: true })).toBeVisible();
    await expect(page.getByText('Bank Details', { exact: true })).toBeVisible();
    await expect(page.getByText('Signature', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Review & Submit', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Health Insurance')).not.toBeVisible();
    await expect(page.getByText('Employer Details')).not.toBeVisible();
  });

  test('Bank details supports own, trusted-person, and SummitFX branches', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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
    await expect(
      page.getByText('A trusted person’s EUR / SEPA account')
    ).toBeVisible();
    await expect(page.getByText('I want to open a EUR account')).toBeVisible();

    await page
      .getByRole('button', { name: /A trusted person’s EUR \/ SEPA account/i })
      .click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Enter the trusted person’s bank details',
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        'I confirm that I have permission to use this bank account and that I trust the account holder.'
      )
    ).toBeVisible();

    // Item 18a: the bottom-of-branch "Back" link is gone — only the global
    // top-left Back remains, and it returns to the account-type selection
    // phase (not the address sub-step) while inside a bank-details branch.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(
      page.getByRole('heading', { name: 'Where should the refund be paid?' })
    ).toBeVisible();
    await page
      .getByRole('button', { name: /I want to open a EUR account/i })
      .click();
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Open a EUR account' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'SummitFX uses your mobile number to set up and activate your EUR account.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Continue with SummitFX/i })
    ).toBeVisible();

    // Item 18b: re-clicking the already-active "Bank Details" tab resets
    // back to the account-type selection phase too.
    await page.getByRole('button', { name: 'Bank Details' }).click();
    await expect(
      page.getByRole('heading', { name: 'Where should the refund be paid?' })
    ).toBeVisible();
  });

  test('Review screen uses refund request copy and Continue to confirmation CTA', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);
    await completeBankDetails(page);

    // Review is reached right after Bank details now; its primary CTA advances
    // to the Confirm step ("Continue to confirmation") instead of submitting —
    // Signature is the terminal submit step in this flow.
    await expect(
      page.getByRole('heading', { name: 'Review your refund request' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: 'Pension details' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Continue to confirmation/i })
    ).toBeVisible();
  });

  test('Success screen uses submitted refund request copy', async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
      .click();
    await completeCreateAccount(page);
    await completePayment(page);
    await completeIdentityUpload(page);
    await completeMembership(page);
    await completeAddress(page);
    await completeBankDetails(page);
    await completeReview(page);
    await completeConfirmStep(page);
    await completeSignature(page);

    await expect(
      page.getByRole('heading', {
        name: 'Your refund request has been submitted',
      })
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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

  test('Bank details has expandable alternative options', async ({ page }) => {
    test.setTimeout(90_000);

    await navigatePublicSectorToEligible(page);
    await page
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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
      .getByRole('button', {
        name: /Continue securely|Create your secure claim/i,
      })
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

  // ============================================================
  // Item 21: delete + re-enter signature must not double-attach
  // ============================================================

  test('deleting and re-drawing the signature attaches it exactly once per Continue', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    await mockOnboardingApi(page);

    // mockOnboardingApi hardcodes the Stripe-return URL to localhost:3000;
    // override it here so the test works against any baseURL the runner
    // happens to use for this app.
    await page.route('**/api/payments/create-checkout-session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: `${baseURL}/get-started?payment=success&session_id=cs_mock`,
          sessionId: 'cs_mock',
        }),
      })
    );

    let attachCount = 0;
    await page.route('**/api/claims/claim_mock/signature', (route) => {
      attachCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claim: { id: 'claim_mock' },
        }),
      });
    });

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

    // New order: reach the terminal Signature step via Review → Confirm.
    await completeReview(page);
    await completeConfirmStep(page);

    // On the terminal Signature step: draw, delete, then re-draw before a
    // single Continue. The attach must fire exactly once for that one
    // Continue — not once per draw — confirming saveAndAdvance's removed dead
    // re-attach branch (and Signature.tsx's own single attach) haven't been
    // reintroduced.
    await expect(
      page.getByRole('heading', { name: 'Add your signature' })
    ).toBeVisible({ timeout: 5_000 });

    const canvas = page.locator('canvas');
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 150, box.y + 80);
      await page.mouse.up();
    }
    // Delete the drawn signature, then draw again and continue exactly once —
    // completeSignature re-draws, confirms the legal checkbox, and clicks
    // Continue, which (Signature being terminal) attaches and submits.
    await page.getByRole('button', { name: /Clear/i }).click();
    await completeSignature(page);

    await expect(
      page.getByRole('heading', {
        name: 'Your refund request has been submitted',
      })
    ).toBeVisible({ timeout: 20_000 });

    // Exactly one attach call for the single Continue, despite the draw →
    // clear → re-draw churn beforehand.
    expect(attachCount).toBe(1);
  });

  // ============================================================
  // Item 21: expired-access-token refresh must not corrupt the stored token
  // ============================================================

  test('an access-token refresh during signature attach stores a usable token, not "undefined"', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    await mockOnboardingApi(page);

    await page.route('**/api/payments/create-checkout-session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          url: `${baseURL}/get-started?payment=success&session_id=cs_mock`,
          sessionId: 'cs_mock',
        }),
      })
    );

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

    // New order: reach the terminal Signature step via Review → Confirm.
    await completeReview(page);
    await completeConfirmStep(page);

    // Simulate the access token having expired by the time the user reaches
    // the last onboarding step: the first signature-attach request 401s
    // exactly once, forcing the axios interceptor in lib/api.ts down its
    // refresh-and-retry path.
    let attachAttempts = 0;
    await page.route('**/api/claims/claim_mock/signature', (route) => {
      attachAttempts += 1;
      if (attachAttempts === 1) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expired' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, claim: { id: 'claim_mock' } }),
      });
    });

    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Tokens refreshed successfully',
          tokens: {
            accessToken: 'refreshed-access-token',
            refreshToken: 'refreshed-refresh-token',
          },
        }),
      })
    );

    await completeSignature(page);

    // The retried request must succeed (proving the interceptor picked up the
    // real refreshed access token) and the terminal Signature submit must
    // reach the success screen, instead of surfacing "Failed to save
    // signature: Invalid token."
    await expect(
      page.getByRole('heading', {
        name: 'Your refund request has been submitted',
      })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Invalid token/i)).not.toBeVisible();
    expect(attachAttempts).toBe(2);

    // The corrected access token must be the real value from the refresh
    // response, not the string "undefined" that response.data.accessToken
    // (missing the `.tokens` level) would have produced.
    const storedAccessToken = await page.evaluate(() =>
      window.localStorage.getItem('accessToken')
    );
    expect(storedAccessToken).toBe('refreshed-access-token');
  });
});
