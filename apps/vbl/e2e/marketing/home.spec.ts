import { test, expect } from '@playwright/test';

test('home renders hero, nav and funnel CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText(
    'Cash out or refund your German company pension online'
  );
  await expect(page.getByRole('navigation').first()).toBeVisible();
  const startCta = page.getByRole('link', { name: 'Start your claim' }).first();
  await expect(startCta).toHaveAttribute('href', '/get-started');
  const calcCta = page
    .getByRole('link', { name: /calculate my refund/i })
    .first();
  await expect(calcCta).toHaveAttribute('href', '/calculator');
});

test('home hero follows the updated design without legacy app mockups', async ({
  page,
}) => {
  await page.goto('/');
  // The updated Home Figma frame removed both legacy app-window images. Keep
  // this assertion aligned with the current hero contract so the marketing
  // suite does not require assets that the page intentionally dropped.
  await expect(
    page.getByRole('img', { name: /create your secure claim/i })
  ).toHaveCount(0);
  await expect(
    page.getByRole('img', { name: /refund request submitted/i })
  ).toHaveCount(0);
});

test('home no longer force-redirects to /auth', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).pathname).toBe('/');
});

test('home FAQ accordion shows first answer and expands another item', async ({
  page,
}) => {
  await page.goto('/');

  // First item open by default with its real answer.
  const firstQuestion = page.getByRole('button', {
    name: 'Can I get money back from my German company pension?',
  });
  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText(
      'It may be possible, depending on the type of pension and the applicable rules.'
    )
  ).toBeVisible();

  // Expanding another item shows its answer and collapses the first.
  const calculatorQuestion = page.getByRole('button', {
    name: 'Do I need to use the calculator first?',
  });
  await calculatorQuestion.click();
  await expect(calculatorQuestion).toHaveAttribute('aria-expanded', 'true');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.getByText(
      'No. You can start your claim directly if you already know your pension type or provider.'
    )
  ).toBeVisible();

  // Go to FAQ link below the accordion.
  await expect(page.getByRole('link', { name: 'Go to FAQ' })).toHaveAttribute(
    'href',
    '/faq'
  );
});
