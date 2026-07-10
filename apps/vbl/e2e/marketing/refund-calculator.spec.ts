import { test, expect } from '@playwright/test';

test('refund-calculator renders the hero heading', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(page.locator('h1')).toContainText(
    'Estimate your VBL, ZVK, VddB or VddKO refund'
  );
});

test('upload CTA links into the calculator flow', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(
    page.getByRole('link', { name: /upload my pension document/i }).first()
  ).toHaveAttribute('href', /\/calculator/);
});

test('manual-entry CTA links into the calculator flow', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(
    page.getByRole('link', { name: /enter details manually/i }).first()
  ).toHaveAttribute('href', /\/calculator/);
});

test('platform-scope section shows the Limited authorization block', async ({
  page,
}) => {
  await page.goto('/refund-calculator');
  await expect(
    page.getByRole('heading', { name: 'Limited authorization' })
  ).toBeVisible();
  await expect(
    page.getByText(
      'The authorization does not make ATLAES GmbH the applicant or claimant.'
    )
  ).toBeVisible();
});
