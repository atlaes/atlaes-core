import { test, expect } from '@playwright/test';

test('home renders hero, nav and funnel CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText(
    'Cash out or refund your German company pension online'
  );
  await expect(page.getByRole('navigation').first()).toBeVisible();
  const startCta = page.getByRole('link', { name: 'Start your claim' }).first();
  await expect(startCta).toHaveAttribute('href', '/get-started');
  const calcCta = page
    .getByRole('link', { name: /calculate my refund/i })
    .first();
  await expect(calcCta).toHaveAttribute('href', '/calculator');
});

test('home no longer force-redirects to /auth', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).pathname).toBe('/');
});
