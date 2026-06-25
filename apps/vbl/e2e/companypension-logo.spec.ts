import { expect, test } from '@playwright/test';

test('uses the CompanyPension cash-outs and refunds logo on auth screens', async ({
  page,
}) => {
  await page.goto('/auth');

  const logo = page.getByRole('img', {
    name: 'CompanyPension Cash-outs & Refunds',
  });

  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute(
    'src',
    /companypension-cashouts-refunds\.svg/
  );
});
