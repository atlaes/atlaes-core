import { test, expect } from '@playwright/test';

test('faq renders hero and the category cards', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.locator('h1')).toHaveText(
    'German company pension questions, answered'
  );
  // Hero CTAs route to the claim flow and the calculator.
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
  await expect(
    page.getByRole('link', { name: 'Calculate my refund' }).first()
  ).toHaveAttribute('href', '/calculator');
  // All six category cards from the design render.
  for (const category of [
    'General questions',
    'bAV cash-outs',
    'VBL and ZVK refunds',
    'VddB and VddKO refunds',
    'Digital process and documents',
    'Pricing and payment',
  ]) {
    await expect(page.getByText(category, { exact: true })).toBeVisible();
  }
});

test('faq accordion shows the first answer and expands another item', async ({
  page,
}) => {
  await page.goto('/faq');

  // First item open by default with its transcribed answer.
  const firstQuestion = page.getByRole('button', {
    name: 'What is a company pension refund?',
  });
  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText(
      'A company pension refund means applying to get eligible employee contributions back from a contribution-based company pension scheme.'
    )
  ).toBeVisible();

  // aria-controls wiring stays intact after the useId prefix fix.
  const controls = await firstQuestion.getAttribute('aria-controls');
  expect(controls).toBeTruthy();
  await expect(page.locator(`[id="${controls}"]`)).toBeVisible();

  // Expanding a second item works and collapses the first.
  const secondQuestion = page.getByRole('button', {
    name: 'Do I need to wait 24 months?',
  });
  await secondQuestion.click();
  await expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

  // Collapsing the open item closes it (toggle off).
  await secondQuestion.click();
  await expect(secondQuestion).toHaveAttribute('aria-expanded', 'false');
});

test('faq closing CTA band links to the claim flow', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.getByText('Start online', { exact: true })).toBeVisible();
  // The closing band is the last of each CTA on the page.
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).last()
  ).toHaveAttribute('href', '/get-started');
  await expect(
    page.getByRole('link', { name: 'Calculate my refund' }).last()
  ).toHaveAttribute('href', '/calculator');
});
