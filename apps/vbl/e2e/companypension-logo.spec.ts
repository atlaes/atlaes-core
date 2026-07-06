import { expect, test } from '@playwright/test';

test('uses the CompanyPension cash-outs and refunds logo on auth screens', async ({
  page,
}) => {
  await page.goto('/auth');

  const logo = page.getByRole('img', {
    name: 'Company Pension Cash-outs & Refunds',
  });

  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute(
    'src',
    /companypension-cashouts-refunds\.svg\?v=20260706/
  );
});

test('serves the supplied Company Pension logo lockup asset', async ({
  page,
}) => {
  const response = await page.request.get(
    '/companypension-cashouts-refunds.svg?v=20260706'
  );
  expect(response.ok()).toBe(true);

  const svg = await response.text();
  expect(svg).toContain('viewBox="0 0 260 56"');
  // Gradient hexagon "CP" mark
  expect(svg).toContain('paint0_linear_1681_1765');
  expect(svg).toContain('paint1_linear_1681_1765');
  // White "Company Pension" wordmark
  expect(svg).toContain('fill="#F3F4F4"');
  // Green "CASH-OUTS & REFUNDS" tagline
  expect(svg).toContain('fill="#B7D857"');
});
