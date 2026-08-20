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

test('zvk-refund uses dark process and pricing bands and loads its lazy artwork', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/zvk-refund');

  for (const heading of [
    'A guided online process for ZVK refunds',
    'Pricing for ZVK refunds',
  ]) {
    const section = page
      .getByRole('heading', { name: heading })
      .locator('xpath=ancestor::section[1]');
    await expect(section).toHaveCSS('background-color', 'rgb(22, 51, 0)');
  }

  const illustration = page.locator(
    'img[alt^="ZVK Refund (contribution reimbursement)"]'
  );
  await illustration.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      illustration.evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0);
});
