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

test('home hero shows the two app mockup windows', async ({ page }) => {
  await page.goto('/');
  // Both mockup windows anchored at the bottom of the dark hero (side-by-side
  // at >=lg). Desktop Chrome (1280px) renders the lg block, which is first in
  // the DOM, so .first() targets the visible instance.
  await expect(
    page.getByRole('img', { name: /create your secure claim/i }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /refund request submitted/i }).first()
  ).toBeVisible();
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
