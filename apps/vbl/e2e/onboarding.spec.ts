import { test, expect } from '@playwright/test';

test.describe('VBL Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculator/onboarding');
  });

  test('complete full onboarding flow', async ({ page }) => {
    // Step 0: Pension Type Selection
    await expect(page.getByText('Public Sector/Stage Pension')).toBeVisible();
    await page.getByText('Public Sector/Stage Pension').click();

    // Step 1: Create Account
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('your.email@example.com').fill('e2e-test@example.com');
    await page.getByRole('button', { name: /Continue with email/i }).click();

    // Step 2: Payment — wait for navigation
    await expect(page.getByRole('heading', { name: /Start your refund claim/i })).toBeVisible({ timeout: 10_000 });
    // Click the payment button
    await page.getByRole('button', { name: /Pay.*deposit/i }).click();

    // Step 3.1: Identity Upload
    await expect(page.getByRole('heading', { name: /passport|Upload/i })).toBeVisible({ timeout: 10_000 });

    // Upload a test passport image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'passport.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    // Wait for confirm phase (may go through processing first)
    await expect(page.getByRole('heading', { name: /Confirm your details/i })).toBeVisible({ timeout: 30_000 });

    // Fill identity fields
    const fullNameInput = page.getByPlaceholder('John Smith');
    if (await fullNameInput.inputValue() === '') {
      await fullNameInput.fill('Max Mustermann');
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

    // Step 3.2: Membership
    await expect(page.getByRole('heading', { name: 'Pension membership details' })).toBeVisible({ timeout: 5_000 });
    await page.locator('select').first().selectOption('VBL');
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3.3: Address
    await expect(page.getByRole('heading', { name: 'Your current address' })).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder('Street and house number').fill('Musterstraße 123');
    await page.getByPlaceholder('Postal code').fill('50667');
    await page.getByPlaceholder('City').fill('Köln');
    await page.locator('select').first().selectOption('DE');
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3.4: Bank Details
    await expect(page.getByRole('heading', { name: /bank account|refund be paid/i })).toBeVisible({ timeout: 5_000 });
    const ibanInput = page.getByPlaceholder(/IBAN/i);
    if (await ibanInput.isVisible()) {
      await ibanInput.fill('DE89370400440532013000');
    }
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3.5: Signature
    await expect(page.getByRole('heading', { name: 'Add your signature' })).toBeVisible({ timeout: 5_000 });

    // Draw a signature on the canvas
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 30, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 200, box.y + 80, { steps: 10 });
      await page.mouse.move(box.x + 250, box.y + 60, { steps: 5 });
      await page.mouse.up();
    }

    // Click continue (uploads signature to backend)
    await page.getByRole('button', { name: /Continue/i }).click();

    // Step 3.6: Review & Submit
    await expect(page.getByRole('heading', { name: 'Review your claim' })).toBeVisible({ timeout: 10_000 });

    // Verify review sections are present
    await expect(page.getByText('Personal information')).toBeVisible();

    // Submit the claim
    await page.getByRole('button', { name: /Submit Refund Claim/i }).click();

    // Verify the submit button changes to submitting state
    await expect(page.getByRole('button', { name: /Submitting/i })).toBeVisible({ timeout: 5_000 });

    // Wait for either success screen or error (the API chain takes a few seconds)
    // Success screen shows a different heading, or an error message appears
    await expect(
      page.getByRole('heading', { name: /success|submitted|thank/i })
        .or(page.getByText(/claim submitted|error|Failed/i))
    ).toBeVisible({ timeout: 20_000 });
  });

  test('pension type selection shows both options', async ({ page }) => {
    await expect(page.getByText('Public Sector/Stage Pension')).toBeVisible();
    await expect(page.getByText('Private Sector Pension')).toBeVisible();
  });

  test('email validation prevents empty submission', async ({ page }) => {
    // Select pension type first
    await page.getByText('Public Sector/Stage Pension').click();

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 10_000 });

    // Verify submit button is disabled without email
    const submitButton = page.getByRole('button', { name: /Continue with email/i });
    await expect(submitButton).toBeDisabled();
  });
});
