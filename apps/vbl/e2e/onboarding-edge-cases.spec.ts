import { test, expect, type Page } from '@playwright/test';

async function mockCalculatorOnboardingApi(page: Page) {
  const user = {
    id: 'user_mock',
    email: 'calculator-edge@example.com',
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
  await page.route('**/api/claims', (route) =>
    route.fulfill(
      json(
        route.request().method() === 'POST'
          ? { success: true, claim }
          : { success: true, claims: [claim] }
      )
    )
  );
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
  await page.route('**/api/payments/create-checkout-session', (route) =>
    route.fulfill(
      json({
        success: true,
        url: new URL(
          '/get-started?payment=success&session_id=cs_mock',
          page.url()
        ).toString(),
        sessionId: 'cs_mock',
      })
    )
  );
  await page.route('**/api/payments/verify-session', (route) =>
    route.fulfill(
      json({ success: true, claimId: claim.id, paymentStatus: 'paid' })
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
}

test.describe('Onboarding Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await mockCalculatorOnboardingApi(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'vbl_flow_identity_v1',
        JSON.stringify({
          version: 1,
          pensionType: 'public',
          pensionProvider: 'VBLklassik',
          origin: 'calculator',
        })
      );
    });
    await page.goto('/calculator/onboarding');
  });

  // ============================================================
  // Pension Type Selection
  // ============================================================

  test.describe('Pension Type Selection', () => {
    test('shows the approved public then private claim choices', async ({
      page,
    }) => {
      await expect(
        page.getByRole('heading', {
          name: 'Which claim would you like to start first?',
        })
      ).toBeVisible();
      const choices = page.locator('button').filter({ has: page.locator('p') });
      await expect(
        choices.filter({ hasText: 'Public sector refund claim' })
      ).toHaveCount(1);
      await expect(
        choices.filter({ hasText: 'Private-sector settlement claim' })
      ).toHaveCount(1);
      expect(
        (await choices.allTextContents()).map((text) =>
          text.replace(/\s+/g, ' ').trim()
        )
      ).toEqual([
        'Public sector refund claim',
        'Private-sector settlement claimBVV',
      ]);
    });

    test('public sector claim advances to the account step', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();

      // Should navigate to create account
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // ============================================================
  // Create Account Validation
  // ============================================================

  test.describe('Create Account', () => {
    test.beforeEach(async ({ page }) => {
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('submit button disabled without email', async ({ page }) => {
      const button = page.getByRole('button', { name: /Continue with email/i });
      await expect(button).toBeDisabled();
    });

    test('submit button enabled with valid email', async ({ page }) => {
      await page.getByPlaceholder('Email...').fill('valid@example.com');
      const button = page.getByRole('button', { name: /Continue with email/i });
      await expect(button).toBeEnabled();
    });

    test('shows Google and Apple login buttons', async ({ page }) => {
      await expect(page.getByText('Continue with Google')).toBeVisible();
      await expect(page.getByText('Continue with Apple')).toBeVisible();
    });

    test('shows "or" divider between email and social login', async ({
      page,
    }) => {
      await expect(page.getByText('or', { exact: true })).toBeVisible();
    });
  });

  // ============================================================
  // Payment Step
  // ============================================================

  test.describe('Payment', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to payment step
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('Email...').fill('e2e-payment@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('displays correct deposit amount', async ({ page }) => {
      await expect(page.getByText('€199', { exact: true })).toBeVisible();
    });

    test('displays fee breakdown', async ({ page }) => {
      await expect(page.getByText(/Service fee.*9\.75%/)).toBeVisible();
      await expect(page.getByText(/Money-back guarantee/)).toBeVisible();
    });

    test('requires calculator declarations before checkout', async ({
      page,
    }) => {
      const payButton = page.getByRole('button', {
        name: 'Pay €199 deposit',
      });
      const declarations = page.getByRole('checkbox');

      await expect(payButton).toBeDisabled();
      await expect(declarations).toHaveCount(2);
      await declarations.nth(0).check();
      await expect(payButton).toBeDisabled();
      await declarations.nth(1).check();
      await expect(payButton).toBeEnabled();
    });
  });

  // ============================================================
  // Identity Step
  // ============================================================

  test.describe('Identity', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate through to identity step
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('Email...').fill('e2e-identity@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
      const declarations = page.getByRole('checkbox');
      await declarations.nth(0).check();
      await declarations.nth(1).check();
      await page.getByRole('button', { name: /Pay.*deposit/i }).click();
      await expect(
        page.getByRole('heading', { name: /passport|Upload/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('shows upload area for passport', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    });

    test('confirm phase uses Full Name and Date of Birth', async ({ page }) => {
      // Upload a fake passport to trigger confirm phase
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'passport.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      // Wait for confirm phase
      await expect(
        page.getByRole('heading', { name: /Confirm your identity details/i })
      ).toBeVisible({ timeout: 30_000 });

      await expect(page.getByLabel('Full Name')).toHaveValue('Test User');
      await expect(page.getByLabel('Date of Birth')).toHaveValue('1990-01-15');
      await expect(page.getByPlaceholder('John')).toHaveCount(0);
      await expect(page.getByPlaceholder('Day')).toHaveCount(0);
    });

    test('confirm phase has gender select', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'passport.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(
        page.getByRole('heading', { name: /Confirm your identity details/i })
      ).toBeVisible({ timeout: 30_000 });

      const genderSelect = page.locator('#calculator-gender');
      await expect(genderSelect).toBeVisible();
    });
  });

  // ============================================================
  // Bank Details Options
  // ============================================================

  test.describe('Bank Details', () => {
    // Helper to navigate to bank details step
    async function navigateToBankDetails(page: any) {
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('Email...').fill('e2e-bank@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
      const declarations = page.getByRole('checkbox');
      await declarations.nth(0).check();
      await declarations.nth(1).check();
      await page.getByRole('button', { name: /Pay.*deposit/i }).click();
      await expect(
        page.getByRole('heading', { name: /passport|Upload/i })
      ).toBeVisible({ timeout: 10_000 });

      // Upload passport
      await page.locator('input[type="file"]').setInputFiles({
        name: 'passport.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(
        page.getByRole('heading', { name: /Confirm your identity details/i })
      ).toBeVisible({ timeout: 30_000 });

      await page.getByLabel('Full Name').fill('Test User');
      await page.getByLabel('Date of Birth').fill('1990-01-15');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Membership
      await expect(
        page.getByRole('heading', { name: 'VBL pension details' })
      ).toBeVisible({ timeout: 5_000 });
      const providerSelect = page.locator('select').first();
      if ((await providerSelect.count()) > 0) {
        await providerSelect.selectOption('VBL');
      }
      await page
        .getByPlaceholder('Enter your VBL insurance number')
        .fill('VBL123456');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Address
      await expect(
        page.getByRole('heading', { name: 'Your current residential address' })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder('Street and house number').fill('Test St 1');
      await page.getByPlaceholder('Postal code').fill('50667');
      await page.getByPlaceholder('City').fill('Köln');
      await page.locator('select').first().selectOption('DE');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Enter the current own-account branch.
      await expect(
        page.getByRole('heading', { name: 'Where should the refund be paid?' })
      ).toBeVisible({ timeout: 5_000 });
      await page
        .getByRole('button', { name: /My own EUR \/ SEPA account/i })
        .click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Enter your bank details' })
      ).toBeVisible({ timeout: 5_000 });
    }

    test('shows IBAN input by default', async ({ page }) => {
      await navigateToBankDetails(page);
      await expect(page.getByPlaceholder(/IBAN/i)).toBeVisible();
    });

    test('shows expandable alternative options', async ({ page }) => {
      await navigateToBankDetails(page);
      // The current flow presents the own-account, trusted-person, and
      // SummitFX options before the IBAN entry branch.
      await page.getByRole('button', { name: /Back/i }).click();
      await expect(
        page.getByRole('button', { name: /trusted person/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /open a EUR account/i })
      ).toBeVisible();
    });

    test('can proceed with IBAN entered', async ({ page }) => {
      await navigateToBankDetails(page);
      await page.getByPlaceholder(/IBAN/i).fill('DE89370400440532013000');
      const continueBtn = page.getByRole('button', { name: /Continue/i });
      await expect(continueBtn).toBeEnabled();
    });
  });

  // ============================================================
  // Signature Step
  // ============================================================

  test.describe('Signature', () => {
    test('shows draw and upload mode buttons', async ({ page }) => {
      // Navigate to signature step — using a shortcut approach:
      // We test the UI elements exist rather than navigating the full flow again
      await page.goto('/calculator/onboarding');
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('Email...').fill('e2e-sig@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
      const declarations = page.getByRole('checkbox');
      await declarations.nth(0).check();
      await declarations.nth(1).check();
      await page.getByRole('button', { name: /Pay.*deposit/i }).click();

      // Fast-forward through identity
      await expect(
        page.getByRole('heading', { name: /passport|Upload/i })
      ).toBeVisible({ timeout: 10_000 });
      await page.locator('input[type="file"]').setInputFiles({
        name: 'passport.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });
      await expect(
        page.getByRole('heading', { name: /Confirm your identity details/i })
      ).toBeVisible({ timeout: 30_000 });
      await page.getByLabel('Full Name').fill('Test User');
      await page.getByLabel('Date of Birth').fill('1990-01-15');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Membership
      await expect(
        page.getByRole('heading', { name: 'VBL pension details' })
      ).toBeVisible({ timeout: 5_000 });
      const providerSelect = page.locator('select').first();
      if ((await providerSelect.count()) > 0) {
        await providerSelect.selectOption('VBL');
      }
      await page
        .getByPlaceholder('Enter your VBL insurance number')
        .fill('VBL123456');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Address
      await expect(
        page.getByRole('heading', { name: 'Your current residential address' })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder('Street and house number').fill('Test St 1');
      await page.getByPlaceholder('Postal code').fill('50667');
      await page.getByPlaceholder('City').fill('Köln');
      await page.locator('select').first().selectOption('DE');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Bank Details
      await expect(
        page.getByRole('heading', { name: 'Where should the refund be paid?' })
      ).toBeVisible({ timeout: 5_000 });
      await page
        .getByRole('button', { name: /My own EUR \/ SEPA account/i })
        .click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Enter your bank details' })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder(/IBAN/i).fill('DE89370400440532013000');
      await page.getByRole('button', { name: /Continue/i }).click();

      // The calculator flow now reaches Signature through Review → Confirm.
      await expect(
        page.getByRole('heading', { name: 'Review', exact: true })
      ).toBeVisible({ timeout: 5_000 });
      await page
        .getByRole('button', { name: 'Continue to declarations' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Confirm your refund information' })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByRole('button', { name: 'Continue to signature' }).click();

      // Signature step
      await expect(
        page.getByRole('heading', { name: 'Add your signature' })
      ).toBeVisible({ timeout: 5_000 });

      // Verify both mode buttons exist
      await expect(page.getByText('Draw signature')).toBeVisible();
      await expect(page.getByText('Upload signature image')).toBeVisible();

      // Verify canvas exists in draw mode (default)
      await expect(page.locator('canvas')).toBeVisible();

      // Switch to upload mode
      await page.getByText('Upload signature image').click();
      // File input should be available
      await expect(page.locator('input[type="file"]')).toBeAttached();

      // Switch back to draw mode
      await page.getByText('Draw signature').click();
      await expect(page.locator('canvas')).toBeVisible();
    });
  });

  // ============================================================
  // Navigation (Back Button)
  // ============================================================

  test.describe('Navigation', () => {
    test('back button from create account returns to pension type', async ({
      page,
    }) => {
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });

      // Click back
      const backButton = page.getByRole('button', { name: /Back/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        // Should show pension type selection again
        await expect(
          page.getByRole('button', { name: 'Public sector refund claim' })
        ).toBeVisible();
      }
    });

    test('calculator payment has no Back button', async ({ page }) => {
      await page
        .getByRole('button', { name: 'Public sector refund claim' })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Create your secure claim' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('Email...').fill('e2e-nav@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });

      await expect(
        page.getByRole('button', { name: 'Back', exact: true })
      ).toHaveCount(0);
    });
  });
});
