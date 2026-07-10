import { test, expect } from '@playwright/test';

test('how-it-works renders hero and CTAs', async ({ page }) => {
  await page.goto('/how-it-works');
  await expect(page.locator('h1')).toContainText('How CompanyPension works');
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
  await expect(
    page.getByRole('link', { name: /calculate my refund/i }).first()
  ).toHaveAttribute('href', '/calculator');
});

test('how-it-works lists the five-step process', async ({ page }) => {
  await page.goto('/how-it-works');
  await expect(
    page.getByText('Complete your company pension claim online in five steps')
  ).toBeVisible();
  await expect(page.getByText('Step 5')).toBeVisible();
});
