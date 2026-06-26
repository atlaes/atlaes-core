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
    /companypension-cashouts-refunds\.svg/
  );
});

test('serves the supplied Company Pension logo lockup asset', async ({
  page,
}) => {
  const response = await page.request.get('/companypension-cashouts-refunds.svg');
  expect(response.ok()).toBe(true);

  const svg = await response.text();
  expect(svg).toContain('viewBox="0 0 760 160"');
  expect(svg).toContain('>Company<');
  expect(svg).toContain('>Pension<');
  expect(svg).toContain('>CASH-OUTS &amp; REFUNDS<');
  expect(svg).not.toContain('>CompanyPension<');
});
