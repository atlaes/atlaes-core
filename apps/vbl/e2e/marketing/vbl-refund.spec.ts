import { test, expect } from '@playwright/test';

test('vbl-refund renders hero, callout and funnel CTAs', async ({ page }) => {
  await page.goto('/vbl-refund');
  await expect(page.locator('h1')).toContainText(
    'Get your VBL contributions back online'
  );
  await expect(page.getByText('Important').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('vbl-refund shows the VBL vs DRV comparison table', async ({ page }) => {
  await page.goto('/vbl-refund');
  await expect(
    page.getByRole('columnheader', { name: 'DRV state pension refund' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', { name: '24-month waiting period?' })
  ).toBeVisible();
});

test('vbl-refund uses the approved eligibility CTA dimensions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vbl-refund');

  const eligibilitySection = page
    .getByRole('heading', { name: 'Can I get a VBL refund?' })
    .locator('xpath=ancestor::section[1]');
  const action = eligibilitySection.getByRole('link', {
    name: 'Start My VBL Refund',
    exact: true,
  });
  await expect(action).toHaveCSS('width', '564px');
  await expect(action).toHaveCSS('height', '63px');
});
