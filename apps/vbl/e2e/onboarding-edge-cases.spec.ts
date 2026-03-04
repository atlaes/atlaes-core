import { test, expect } from '@playwright/test';

test.describe('Onboarding Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculator/onboarding');
  });

  // ============================================================
  // Pension Type Selection
  // ============================================================

  test.describe('Pension Type Selection', () => {
    test('private sector opens external link', async ({ page, context }) => {
      // Listen for new page (popup/tab)
      const pagePromise = context.waitForEvent('page');

      await page.getByText('Private Sector Pension').click();

      const newPage = await pagePromise;
      expect(newPage.url()).toContain('bvv.de');
      await newPage.close();
    });

    test('only public sector advances to next step', async ({ page }) => {
      await page.getByText('Public Sector/Stage Pension').click();

      // Should navigate to create account
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // ============================================================
  // Create Account Validation
  // ============================================================

  test.describe('Create Account', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('submit button disabled without email', async ({ page }) => {
      const button = page.getByRole('button', { name: /Continue with email/i });
      await expect(button).toBeDisabled();
    });

    test('submit button enabled with valid email', async ({ page }) => {
      await page.getByPlaceholder('your.email@example.com').fill('valid@example.com');
      const button = page.getByRole('button', { name: /Continue with email/i });
      await expect(button).toBeEnabled();
    });

    test('shows Google and Apple login buttons', async ({ page }) => {
      await expect(page.getByText('Continue with Google')).toBeVisible();
      await expect(page.getByText('Continue with Apple')).toBeVisible();
    });

    test('shows "or" divider between email and social login', async ({ page }) => {
      await expect(page.getByText('or')).toBeVisible();
    });
  });

  // ============================================================
  // Payment Step
  // ============================================================

  test.describe('Payment', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to payment step
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('your.email@example.com').fill('e2e-payment@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('displays correct deposit amount', async ({ page }) => {
      await expect(page.getByText('€199')).toBeVisible();
    });

    test('displays fee breakdown', async ({ page }) => {
      await expect(page.getByText(/Service fee.*9\.75%/)).toBeVisible();
      await expect(page.getByText(/Money-back guarantee/)).toBeVisible();
    });

    test('button shows processing state', async ({ page }) => {
      await page.getByRole('button', { name: /Pay.*deposit/i }).click();
      // Should show processing state
      await expect(page.getByText('Processing...')).toBeVisible({ timeout: 3_000 });
    });
  });

  // ============================================================
  // Identity Step
  // ============================================================

  test.describe('Identity', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate through to identity step
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('your.email@example.com').fill('e2e-identity@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /Pay.*deposit/i }).click();
      await expect(
        page.getByRole('heading', { name: /passport|Upload/i })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('shows upload area for passport', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    });

    test('confirm phase requires full name', async ({ page }) => {
      // Upload a fake passport to trigger confirm phase
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'passport.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      // Wait for confirm phase
      await expect(
        page.getByRole('heading', { name: /Confirm your details/i })
      ).toBeVisible({ timeout: 30_000 });

      // Full name input should be visible
      const fullNameInput = page.getByPlaceholder('John Smith');
      await expect(fullNameInput).toBeVisible();
    });

    test('confirm phase has gender select', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'passport.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(
        page.getByRole('heading', { name: /Confirm your details/i })
      ).toBeVisible({ timeout: 30_000 });

      const genderSelect = page.locator('select').first();
      await expect(genderSelect).toBeVisible();
    });
  });

  // ============================================================
  // Bank Details Options
  // ============================================================

  test.describe('Bank Details', () => {
    // Helper to navigate to bank details step
    async function navigateToBankDetails(page: any) {
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('your.email@example.com').fill('e2e-bank@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
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
        page.getByRole('heading', { name: /Confirm your details/i })
      ).toBeVisible({ timeout: 30_000 });

      // Fill identity
      const fullNameInput = page.getByPlaceholder('John Smith');
      if (await fullNameInput.inputValue() === '') {
        await fullNameInput.fill('Test User');
      }
      const dobInput = page.locator('input[type="date"]');
      if (await dobInput.inputValue() === '') {
        await dobInput.fill('1990-01-15');
      }
      const genderSelect = page.locator('select').first();
      if (await genderSelect.inputValue() === '') {
        await genderSelect.selectOption('male');
      }
      await page.getByRole('button', { name: /Continue/i }).click();

      // Membership
      await expect(
        page.getByRole('heading', { name: 'Pension membership details' })
      ).toBeVisible({ timeout: 5_000 });
      await page.locator('select').first().selectOption('VBL');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Address
      await expect(
        page.getByRole('heading', { name: 'Your current address' })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder('Street and house number').fill('Test St 1');
      await page.getByPlaceholder('Postal code').fill('50667');
      await page.getByPlaceholder('City').fill('Köln');
      await page.locator('select').first().selectOption('DE');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Should be at bank details
      await expect(
        page.getByRole('heading', { name: /bank account|refund be paid/i })
      ).toBeVisible({ timeout: 5_000 });
    }

    test('shows IBAN input by default', async ({ page }) => {
      await navigateToBankDetails(page);
      await expect(page.getByPlaceholder(/IBAN/i)).toBeVisible();
    });

    test('shows expandable alternative options', async ({ page }) => {
      await navigateToBankDetails(page);
      // Click the expandable toggle
      const toggle = page.getByText(/Don't have a EUR\/SEPA account/i);
      await expect(toggle).toBeVisible();
      await toggle.click();

      // Should show 3 alternative options
      await expect(page.getByText('Open free EUR account')).toBeVisible();
      await expect(page.getByText(/trusted third-party/i)).toBeVisible();
      await expect(page.getByText(/add my IBAN/i)).toBeVisible();
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
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('your.email@example.com').fill('e2e-sig@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });
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
        page.getByRole('heading', { name: /Confirm your details/i })
      ).toBeVisible({ timeout: 30_000 });
      const fullNameInput = page.getByPlaceholder('John Smith');
      if (await fullNameInput.inputValue() === '') await fullNameInput.fill('Test User');
      const dobInput = page.locator('input[type="date"]');
      if (await dobInput.inputValue() === '') await dobInput.fill('1990-01-15');
      const genderSelect = page.locator('select').first();
      if (await genderSelect.inputValue() === '') await genderSelect.selectOption('male');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Membership
      await expect(
        page.getByRole('heading', { name: 'Pension membership details' })
      ).toBeVisible({ timeout: 5_000 });
      await page.locator('select').first().selectOption('VBL');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Address
      await expect(
        page.getByRole('heading', { name: 'Your current address' })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder('Street and house number').fill('Test St 1');
      await page.getByPlaceholder('Postal code').fill('50667');
      await page.getByPlaceholder('City').fill('Köln');
      await page.locator('select').first().selectOption('DE');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Bank Details
      await expect(
        page.getByRole('heading', { name: /bank account|refund be paid/i })
      ).toBeVisible({ timeout: 5_000 });
      await page.getByPlaceholder(/IBAN/i).fill('DE89370400440532013000');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Signature step
      await expect(
        page.getByRole('heading', { name: 'Add your signature' })
      ).toBeVisible({ timeout: 5_000 });

      // Verify both mode buttons exist
      await expect(page.getByText('Draw Signature')).toBeVisible();
      await expect(page.getByText('Upload Image')).toBeVisible();

      // Verify canvas exists in draw mode (default)
      await expect(page.locator('canvas')).toBeVisible();

      // Switch to upload mode
      await page.getByText('Upload Image').click();
      // File input should be available
      await expect(page.locator('input[type="file"]')).toBeAttached();

      // Switch back to draw mode
      await page.getByText('Draw Signature').click();
      await expect(page.locator('canvas')).toBeVisible();
    });
  });

  // ============================================================
  // Navigation (Back Button)
  // ============================================================

  test.describe('Navigation', () => {
    test('back button from create account returns to pension type', async ({ page }) => {
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });

      // Click back
      const backButton = page.getByRole('button', { name: /Back/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        // Should show pension type selection again
        await expect(page.getByText('Public Sector/Stage Pension')).toBeVisible();
      }
    });

    test('back button from payment returns to create account', async ({ page }) => {
      await page.getByText('Public Sector/Stage Pension').click();
      await expect(
        page.getByRole('heading', { name: 'Create your account' })
      ).toBeVisible({ timeout: 10_000 });
      await page.getByPlaceholder('your.email@example.com').fill('e2e-nav@example.com');
      await page.getByRole('button', { name: /Continue with email/i }).click();
      await expect(
        page.getByRole('heading', { name: /Start your refund claim/i })
      ).toBeVisible({ timeout: 10_000 });

      // Click back
      const backButton = page.getByRole('button', { name: /Back/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(
          page.getByRole('heading', { name: 'Create your account' })
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });
});
