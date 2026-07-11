import { test, expect } from '@playwright/test';

test('company-pension-vs-drv renders the hero and funnel CTA', async ({
  page,
}) => {
  await page.goto('/company-pension-vs-drv');
  await expect(page.locator('h1')).toContainText(
    'Your DRV refund does not include your company pension'
  );
  await expect(
    page.getByRole('link', { name: 'Check my company pension' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('company-pension-vs-drv links "See all cash-outs & refunds" to the landing', async ({
  page,
}) => {
  await page.goto('/company-pension-vs-drv');
  await expect(
    page.getByRole('link', { name: 'See all cash-outs & refunds' }).first()
  ).toHaveAttribute('href', '/cash-outs-and-refunds');
});

test('company-pension-vs-drv shows the DRV vs company pension comparison table', async ({
  page,
}) => {
  await page.goto('/company-pension-vs-drv');
  await expect(
    page.getByRole('columnheader', {
      name: 'Company pension refund / cash-out',
    })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', {
      name: 'Does the DRV refund include the company pension?',
    })
  ).toBeVisible();
});
