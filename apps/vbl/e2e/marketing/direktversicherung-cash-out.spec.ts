import { test, expect } from '@playwright/test';

test('direktversicherung-cash-out renders hero, callout and funnel CTA', async ({
  page,
}) => {
  await page.goto('/direktversicherung-cash-out');

  // Exact hero h1 (verbatim from Figma node 1118:8403).
  await expect(page.locator('h1')).toContainText(
    'Cash out your Direktversicherung online'
  );

  // "Important information" callout closes the page.
  await expect(page.getByText('Important information').first()).toBeVisible();

  // No calculator on bAV cash-outs: every funnel CTA points at /get-started.
  await expect(
    page
      .getByRole('link', { name: 'Start my Direktversicherung cash-out' })
      .first()
  ).toHaveAttribute('href', '/get-started');
});

test('direktversicherung-cash-out shows the pension-type comparison table', async ({
  page,
}) => {
  await page.goto('/direktversicherung-cash-out');
  await expect(
    page.getByRole('columnheader', { name: 'Best next step' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', { name: 'Direktversicherung', exact: true })
  ).toBeVisible();
});
