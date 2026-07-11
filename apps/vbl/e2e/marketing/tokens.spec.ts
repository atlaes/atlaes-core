import { test, expect } from '@playwright/test';

test('marketing tokens are compiled into the stylesheet', async ({ page }) => {
  await page.goto('/');
  const brand = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'bg-brand';
    document.body.appendChild(el);
    return getComputedStyle(el).backgroundColor;
  });
  expect(brand).toBe('rgb(22, 51, 0)'); // #163300
});
