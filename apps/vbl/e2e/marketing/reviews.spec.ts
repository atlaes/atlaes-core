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
  // Third-party rating summary.
  await expect(page.getByText('4.9', { exact: false }).first()).toBeVisible();
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
