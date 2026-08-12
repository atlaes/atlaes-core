import { test, expect } from '@playwright/test';

test('about renders hero', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('h1')).toContainText(
    'Built to make German company pension claims easier'
  );
});

test('about shows the About eyebrow and hero CTAs', async ({ page }) => {
  await page.goto('/about');
  await expect(
    page.getByText('About CompanyPension', { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
  await expect(
    page.getByRole('link', { name: 'See how it works' }).first()
  ).toHaveAttribute('href', '/how-it-works');
});

test('about lists the supported claim types', async ({ page }) => {
  await page.goto('/about');
  await expect(
    page.getByRole('heading', { name: 'bAV / Company pension cash-outs' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'VBL and ZVK refunds' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'VddB and VddKO refunds' })
  ).toBeVisible();
});

test('about names the operating company', async ({ page }) => {
  await page.goto('/about');
  await expect(
    page.getByRole('heading', { name: 'Operated by ATLAES GmbH in Berlin' })
  ).toBeVisible();
});

test('about closing band routes to the funnel', async ({ page }) => {
  await page.goto('/about');
  await expect(
    page.getByRole('link', { name: 'Calculate my refund' }).first()
  ).toHaveAttribute('href', '/calculator');
});

test('about uses the approved number colour and supported-claim CTA size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/about');

  const digitalSection = page
    .getByRole('heading', {
      name: 'Upload instead of entering everything manually',
    })
    .locator('xpath=ancestor::section[1]');
  await expect(digitalSection.getByText('01', { exact: true })).toHaveCSS(
    'color',
    'rgb(92, 92, 92)'
  );

  const principlesSection = page
    .getByRole('heading', { name: 'How CompanyPension is built' })
    .locator('xpath=ancestor::section[1]');
  await expect(principlesSection.getByText('01', { exact: true })).toHaveCSS(
    'color',
    'rgb(92, 92, 92)'
  );

  const supportedSection = page
    .getByRole('heading', {
      name: /Cash-outs and refunds for German company pensions/,
    })
    .locator('xpath=ancestor::section[1]');
  const startClaim = supportedSection.getByRole('link', {
    name: 'Start your claim',
    exact: true,
  });
  await expect(startClaim).toHaveCSS('width', '461px');
  await expect(startClaim).toHaveCSS('height', '63px');
});
