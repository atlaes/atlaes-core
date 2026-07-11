import { test, expect } from '@playwright/test';

test('pricing renders hero and fee copy', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.locator('h1')).toContainText(
    'Simple pricing for cash-outs and refunds'
  );
  await expect(page.getByText('9.75%').first()).toBeVisible();
  await expect(page.getByText('€199').first()).toBeVisible();
});

test('pricing shows the two claim-type cards and their CTAs', async ({
  page,
}) => {
  await page.goto('/pricing');
  await expect(
    page.getByRole('heading', { name: 'Company pension cash-outs' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'VBL, ZVK, VddB and VddKO refunds' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start bAV cash-out' })
  ).toHaveAttribute('href', '/get-started');
  await expect(
    page.getByRole('link', { name: 'Start my refund' })
  ).toHaveAttribute('href', '/get-started');
});

test('pricing FAQ shows the first answer and links out', async ({ page }) => {
  await page.goto('/pricing');
  await expect(
    page.getByRole('heading', { name: 'Frequently asked questions' })
  ).toBeVisible();
  await expect(page.getByText('Why do I pay a deposit first?')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Show more questions' })
  ).toHaveAttribute('href', '/faq');
});
