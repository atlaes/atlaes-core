import { test, expect } from '@playwright/test';

test('vbl-vs-drv renders the hero and funnel CTA', async ({ page }) => {
  await page.goto('/vbl-vs-drv');
  await expect(page.locator('h1')).toContainText(
    'VBL and DRV are not the same pension'
  );
  await expect(
    page.getByRole('link', { name: 'Check my VBL refund' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('vbl-vs-drv shows the DRV vs VBL comparison table', async ({ page }) => {
  await page.goto('/vbl-vs-drv');
  await expect(
    page.getByRole('columnheader', { name: 'DRV refund' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', { name: 'Does one include the other?' })
  ).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'Best next step' })
  ).toBeVisible();
});
