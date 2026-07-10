import { test, expect } from '@playwright/test';

test('vddb-vddko-refund renders hero, important callout and funnel CTA', async ({
  page,
}) => {
  await page.goto('/vddb-vddko-refund');

  // Exact hero H1 extracted verbatim from Figma node 1080:10694.
  await expect(page.locator('h1')).toContainText(
    'Claim your German stage or orchestra pension refund online'
  );

  // ImportantCallout legal block is present (Figma 1102:258).
  await expect(page.getByText('Important information').first()).toBeVisible();

  // Primary funnel CTA routes into the claim flow (/get-started).
  await expect(
    page.getByRole('link', { name: 'Start VddB & VddKO Refunds' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('vddb-vddko-refund shows the VddB/VddKO/DRV/VBL/bAV comparison table', async ({
  page,
}) => {
  await page.goto('/vddb-vddko-refund');

  await expect(
    page.getByRole('columnheader', { name: 'Best next step' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', { name: 'VddB / Bühnenversorgung' })
  ).toBeVisible();
});
