import { test, expect } from '@playwright/test';

test('zvk-refund renders hero, important callout and funnel CTA', async ({
  page,
}) => {
  await page.goto('/zvk-refund');
  await expect(page.locator('h1')).toContainText(
    'Claim your ZVK refund online'
  );
  await expect(
    page.getByRole('region', { name: 'Important information' }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start My ZVK Refund' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('zvk-refund shows the ZVK/VBL/DRV/bAV comparison table', async ({
  page,
}) => {
  await page.goto('/zvk-refund');
  await expect(
    page.getByRole('columnheader', { name: 'Best next step' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', { name: 'ZVK / Zusatzversorgungskasse' })
  ).toBeVisible();
});
