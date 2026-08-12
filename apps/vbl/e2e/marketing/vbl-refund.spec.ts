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
    ['Can I get a VBL refund?', 'rgb(243, 244, 244)', null],
    [
      'Built for VBLklassik refunds',
      'rgb(243, 244, 244)',
      'For people who paid into VBLklassik while working',
    ],
    [
      'Worked in Germany’s public sector and paid into VBL?',
      'rgb(255, 255, 255)',
      null,
    ],
    ['When can I get a VBL refund?', 'rgb(249, 254, 245)', null],
    ['When is a VBL refund not possible?', 'rgb(251, 244, 242)', null],
    [
      'Do ZVK or other public-sector pension periods count?',
      'rgb(243, 244, 244)',
      null,
    ],
    [
      'What is the difference between VBL West and VBL East?',
      'rgb(255, 255, 255)',
      null,
    ],
    ['How much can I get back from VBL?', 'rgb(243, 244, 244)', null],
    [
      'Your DRV refund does not include your VBL refund',
      'rgb(255, 255, 255)',
      null,
    ],
    [
      'A VBL refund is for people who have left public-sector employment',
      'rgb(243, 244, 244)',
      null,
    ],
    ['What documents do I need for a VBL refund?', 'rgb(243, 244, 244)', null],
  ] as const;

  for (const [heading, background, distinguishingCopy] of expectedBands) {
    const headingLocator = page.getByRole('heading', {
      name: heading,
      exact: true,
    });
    let section = headingLocator.locator('xpath=ancestor::section[1]');

    if (distinguishingCopy) {
      section = section.filter({ hasText: distinguishingCopy });
    } else {
      await expect(headingLocator).toHaveCount(1);
    }

    await expect(section).toHaveCount(1);
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

test('vbl-refund renders the approved cards, split imagery and action sizes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/vbl-refund');

  const pensionTypeSection = page
    .getByRole('heading', { name: 'VBLklassik or VBLextra?', exact: true })
    .locator('xpath=ancestor::section[1]');
  await expect(
    pensionTypeSection.getByRole('heading', { level: 3 })
  ).toHaveCount(3);
  await expect(
    pensionTypeSection.getByRole('heading', {
      level: 3,
      name: 'Not sure which one you had?',
      exact: true,
    })
  ).toBeVisible();

  const audienceSection = page
    .getByRole('heading', {
      name: 'Worked in Germany’s public sector and paid into VBL?',
      exact: true,
    })
    .locator('xpath=ancestor::section[1]');
  const audienceImage = audienceSection.getByRole('img', {
    name: 'Woman reviewing her VBL refund documents online',
    exact: true,
  });
  await expect(audienceImage).toBeVisible();
  await expect
    .poll(() =>
      audienceImage.evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0);

  const ineligibleSection = page
    .getByRole('heading', {
      name: 'When is a VBL refund not possible?',
      exact: true,
    })
    .locator('xpath=ancestor::section[1]');
  await expect(
    ineligibleSection.getByTestId('vbl-ineligible-background')
  ).toHaveCSS('opacity', '0.34');

  const sourceAlphaRanges = await page.evaluate(async () => {
    const paths = [
      '/marketing/vbl-refund/laptop-vbl-document-checklist.png',
      '/marketing/vbl-refund/vbl-refund-eligibility-calendar.png',
      '/marketing/vbl-refund/vbl-refund-ineligible-review.png',
    ];

    return Promise.all(
      paths.map(async (path) => {
        const image = new Image();
        image.src = path;
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error(`Could not inspect ${path}`);
        context.drawImage(image, 0, 0);

        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;
        let minimum = 255;
        let maximum = 0;
        for (let index = 3; index < pixels.length; index += 4) {
          minimum = Math.min(minimum, pixels[index]);
          maximum = Math.max(maximum, pixels[index]);
        }

        return { path, minimum, maximum };
      })
    );
  });
  expect(sourceAlphaRanges).toEqual([
    {
      path: '/marketing/vbl-refund/laptop-vbl-document-checklist.png',
      minimum: 255,
      maximum: 255,
    },
    {
      path: '/marketing/vbl-refund/vbl-refund-eligibility-calendar.png',
      minimum: 255,
      maximum: 255,
    },
    {
      path: '/marketing/vbl-refund/vbl-refund-ineligible-review.png',
      minimum: 255,
      maximum: 255,
    },
  ]);

  const actionSections = [
    'Can I get a VBL refund?',
    'Worked in Germany’s public sector and paid into VBL?',
    'When can I get a VBL refund?',
    'When is a VBL refund not possible?',
  ];

  for (const heading of actionSections) {
    const section = page
      .getByRole('heading', { name: heading, exact: true })
      .locator('xpath=ancestor::section[1]');
    const action = section.getByRole('link', {
      name: /start my vbl refund|check my vbl refund/i,
    });
    await expect(action).toHaveCSS('width', '564px');
    await expect(action).toHaveCSS('height', '63px');
  }
});
