import { test, expect } from '@playwright/test';

test('reviews renders hero and review cards', async ({ page }) => {
  await page.goto('/reviews');
  await expect(page.locator('h1')).toContainText(
    'What users say about CompanyPension'
  );
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
  await expect(
    page.getByRole('link', { name: /calculate my refund/i }).first()
  ).toHaveAttribute('href', '/calculator');
});

test('reviews shows testimonials and rating summary', async ({ page }) => {
  await page.goto('/reviews');
  await expect(page.getByText('Latest CompanyPension reviews')).toBeVisible();
  // Verbatim testimonial copy (from the Figma testimonial text nodes).
  await expect(
    page.getByText(
      'CompanyPension made the VBL refund process incredibly easy.',
      { exact: false }
    )
  ).toBeVisible();
  await expect(page.getByText('David R.')).toBeVisible();
  // Third-party rating summary now uses the real platform badges (the Google
  // "4.9" rating is baked into the exported logo image), so assert the badge.
  await expect(page.getByRole('img', { name: /google rating/i })).toBeVisible();
});

test('reviews closing CTA links to the funnel', async ({ page }) => {
  await page.goto('/reviews');
  await expect(
    page.getByRole('link', { name: 'See how it works' })
  ).toHaveAttribute('href', '/how-it-works');
  await expect(
    page.getByRole('link', { name: 'View pricing' })
  ).toHaveAttribute('href', '/pricing');
});

test('reviews uses equal approved CTA dimensions in the digital-process band', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reviews');

  const section = page
    .getByRole('heading', { name: 'Built for online pension applications' })
    .locator('xpath=ancestor::section[1]');
  for (const name of ['See how it works', 'View pricing']) {
    const action = section.getByRole('link', { name });
    await expect(action).toHaveCSS('width', '345px');
    await expect(action).toHaveCSS('height', '63px');
  }
});
