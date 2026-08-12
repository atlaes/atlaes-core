import { test, expect } from '@playwright/test';

test('refund-calculator renders the hero heading', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(page.locator('h1')).toContainText(
    'Estimate your VBL, ZVK, VddB or VddKO refund'
  );
});

test('upload CTA links into the calculator flow', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(
    page.getByRole('link', { name: /upload my pension document/i }).first()
  ).toHaveAttribute('href', /\/calculator/);
});

test('manual-entry CTA links into the calculator flow', async ({ page }) => {
  await page.goto('/refund-calculator');
  await expect(
    page.getByRole('link', { name: /enter details manually/i }).first()
  ).toHaveAttribute('href', /\/calculator/);
});

test('platform-scope section shows the Limited authorization block', async ({
  page,
}) => {
  await page.goto('/refund-calculator');
  await expect(
    page.getByRole('heading', { name: 'Limited authorization' })
  ).toBeVisible();
  await expect(
    page.getByText(
      'The authorization does not make ATLAES GmbH the applicant or claimant.'
    )
  ).toBeVisible();
});

test('refund calculator follows the approved continuation and pricing layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/refund-calculator');

  await expect(
    page.getByRole('heading', {
      name: 'Made for people who no longer want to deal with German paperwork',
    })
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', {
      name: 'A digital application platform, not pension advice',
    })
  ).toHaveCount(0);

  const nextStep = page.getByText('Your next step', { exact: true });
  await expect(nextStep).toHaveCSS('width', '228px');
  await expect(nextStep).toHaveCSS('height', '40px');

  const nextStepSection = page
    .getByRole('heading', {
      name: 'Like the estimate? Continue with your refund online.',
    })
    .locator('xpath=ancestor::section[1]');
  const continueCta = nextStepSection.getByRole('link', {
    name: 'Start my refund',
  });
  await expect(continueCta).toHaveCSS('width', '369px');
  await expect(continueCta).toHaveCSS('height', '63px');

  const pricingSection = page
    .getByRole('heading', { name: 'What does the full refund process cost?' })
    .locator('xpath=ancestor::section[1]');
  for (const name of ['Start my refund', 'View full pricing']) {
    const action = pricingSection.getByRole('link', { name });
    await expect(action).toHaveCSS('width', '355px');
    await expect(action).toHaveCSS('height', '63px');
  }

  const payoutCopy = pricingSection.getByText(
    /pension institution pays the refund directly to the bank account/i
  );
  await expect(payoutCopy).toBeVisible();
  await expect(pricingSection.locator('.max-w-xl')).not.toContainText(
    /pension institution pays the refund directly/i
  );
});
