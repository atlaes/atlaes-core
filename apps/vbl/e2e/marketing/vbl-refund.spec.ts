import { test, expect } from '@playwright/test';

test('vbl-refund renders hero, callout and funnel CTAs', async ({ page }) => {
  await page.goto('/vbl-refund');
  await expect(page.locator('h1')).toContainText(
    'Get your VBL contributions back online'
  );
  await expect(page.getByText('Important').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Start your claim' }).first()
  ).toHaveAttribute('href', '/get-started');
});

test('vbl-refund shows the VBL vs DRV comparison table', async ({ page }) => {
  await page.goto('/vbl-refund');
  await expect(
    page.getByRole('columnheader', { name: 'DRV state pension refund' })
  ).toBeVisible();
  await expect(
    page.getByRole('rowheader', { name: '24-month waiting period?' })
  ).toBeVisible();
});

test('vbl-refund uses the approved eligibility CTA dimensions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vbl-refund');

  const eligibilitySection = page
    .getByRole('heading', { name: 'Can I get a VBL refund?' })
    .locator('xpath=ancestor::section[1]');
  const action = eligibilitySection.getByRole('link', {
    name: 'Start My VBL Refund',
    exact: true,
  });
  await expect(action).toHaveCSS('width', '564px');
  await expect(action).toHaveCSS('height', '63px');
});

test('vbl-refund follows the approved Figma section structure and bands', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vbl-refund');

  await expect(
    page.getByRole('heading', {
      name: 'Made for people who no longer want to deal with German paperwork',
    })
  ).toHaveCount(0);

  const expectedBands = [
    ['Can I get a VBL refund?', 'rgb(243, 244, 244)'],
    ['Built for VBLklassik refunds', 'rgb(243, 244, 244)'],
    [
      'Worked in Germany’s public sector and paid into VBL?',
      'rgb(255, 255, 255)',
    ],
    ['When can I get a VBL refund?', 'rgb(249, 254, 245)'],
    ['When is a VBL refund not possible?', 'rgb(251, 244, 242)'],
    [
      'Do ZVK or other public-sector pension periods count?',
      'rgb(243, 244, 244)',
    ],
    [
      'What is the difference between VBL West and VBL East?',
      'rgb(255, 255, 255)',
    ],
    ['How much can I get back from VBL?', 'rgb(243, 244, 244)'],
    ['Your DRV refund does not include your VBL refund', 'rgb(255, 255, 255)'],
    [
      'A VBL refund is for people who have left public-sector employment',
      'rgb(243, 244, 244)',
    ],
    ['What documents do I need for a VBL refund?', 'rgb(243, 244, 244)'],
  ] as const;

  for (const [heading, background] of expectedBands) {
    const section = page
      .getByRole('heading', { name: heading, exact: true })
      .first()
      .locator('xpath=ancestor::section[1]');
    await expect(section).toHaveCSS('background-color', background);
  }

  const importantInformation = page.getByRole('region', {
    name: 'Important information',
  });
  await expect(importantInformation).toHaveCount(2);
  await expect(importantInformation.nth(0)).toHaveCSS(
    'background-color',
    'rgb(243, 244, 244)'
  );
  await expect(importantInformation.nth(1)).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  );
});
