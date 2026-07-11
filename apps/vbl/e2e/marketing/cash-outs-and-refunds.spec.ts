import { test, expect } from '@playwright/test';

test('cash-outs-and-refunds overview renders hero and funnel CTA', async ({
  page,
}) => {
  await page.goto('/cash-outs-and-refunds');
  await expect(page.locator('h1')).toContainText(
    'Cash out or refund your German company pension online'
  );
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('cash-outs-and-refunds overview links to the product pages', async ({
  page,
}) => {
  await page.goto('/cash-outs-and-refunds');
  await expect(
    page.getByRole('link', { name: 'Open company pension cash-out' }).first()
  ).toHaveAttribute('href', '/company-pension-cash-out');
  await expect(
    page.getByRole('link', { name: 'Check my VBL refund' }).first()
  ).toHaveAttribute('href', '/vbl-refund');
  await expect(
    page.getByRole('link', { name: 'Open VddB and VddKO refunds' }).first()
  ).toHaveAttribute('href', '/vddb-vddko-refund');
});
