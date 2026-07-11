import { test, expect } from '@playwright/test';

test('company-pension-cash-out renders hero, important callout and funnel CTA', async ({
  page,
}) => {
  await page.goto('/company-pension-cash-out');

  // Exact hero h1 (Figma 1254:10537)
  await expect(page.locator('h1')).toHaveText(
    'Cash out your German company pension online'
  );

  // ImportantCallout is present (Figma 1265:2750)
  await expect(
    page.getByRole('heading', {
      name: 'A digital application platform—not a pension advisor or claims agent',
    })
  ).toBeVisible();

  // Funnel CTA points at /get-started (no calculator for bAV cash-outs)
  await expect(
    page.getByRole('link', { name: 'Start my cash-out' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('company-pension-cash-out shows the cash-out vs DRV comparison table', async ({
  page,
}) => {
  await page.goto('/company-pension-cash-out');
  await expect(
    page.getByRole('columnheader', { name: 'German state pension refund' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', {
      name: 'Does the DRV refund include the company pension?',
    })
  ).toBeVisible();
});
