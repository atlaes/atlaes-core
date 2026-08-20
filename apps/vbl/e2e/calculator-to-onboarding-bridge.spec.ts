import { test, expect } from '@playwright/test';

// E2E for the Results.tsx → OnboardingFlow.tsx bridge that uses
// /api/vbl/pending-calculator-sessions to carry calculator state across
// the magic-link / OAuth roundtrip.

const FIXTURE_TOKEN = '11111111-1111-1111-1111-111111111111';
const fixtureDates = {
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

const PRIVATE_FIXTURE_SESSION = {
  id: 'private-fixture-id',
  token: FIXTURE_TOKEN,
  email: null,
  jobs: [],
  calculationResult: null,
  scenario: 'private_may_be_possible',
  pensionProvider: 'BVV',
  claimTypes: ['private'],
  privateProvider: 'BVV',
  publicStageProvider: '',
  ...fixtureDates,
};

const PUBLIC_FIXTURE_SESSION = {
  id: 'public-fixture-id',
  token: FIXTURE_TOKEN,
  email: null,
  jobs: [],
  calculationResult: null,
  scenario: 'public_eligible',
  pensionProvider: 'VBLklassik',
  claimTypes: ['public'],
  privateProvider: '',
  publicStageProvider: 'VBLklassik',
  ...fixtureDates,
};

test.describe('Calculator → Onboarding bridge', () => {
  test('hydrates a private calculator origin and restores the default private paygate after auth', async ({
    page,
    context,
  }) => {
    const getRequestUrls: string[] = [];

    await context.route(
      '**/api/vbl/pending-calculator-sessions/**',
      async (route) => {
        const request = route.request();
        if (request.method() === 'GET') {
          getRequestUrls.push(request.url());
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              session: PRIVATE_FIXTURE_SESSION,
            }),
          });
          return;
        }
        await route.continue();
      }
    );

    await page.goto(`/calculator/onboarding?session=${FIXTURE_TOKEN}`);

    await expect
      .poll(() => getRequestUrls.find((url) => url.includes(FIXTURE_TOKEN)))
      .not.toBeUndefined();
    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem('vbl_flow_identity_v1');
          if (!raw) return null;
          const identity = JSON.parse(raw);
          return {
            origin: identity.origin,
            pensionType: identity.pensionType,
          };
        })
      )
      .toEqual({ origin: 'calculator', pensionType: 'private' });

    await context.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'private-user',
            email: 'private@example.com',
            emailVerified: true,
          },
        }),
      });
    });
    await page.evaluate(() => {
      window.localStorage.setItem('accessToken', 'private-auth-token');
    });
    await page.goto('/get-started?fromAuth=1&origin=calculator');

    await expect(
      page.getByRole('heading', { name: 'Start your bAV cash-out request' })
    ).toBeVisible({ timeout: 10_000 });

    const privatePaymentButton = page.getByRole('button', {
      name: 'Pay €199 deposit and continue',
    });
    const privateDeclarations = page.getByRole('checkbox');
    await expect(privateDeclarations).toHaveCount(2);
    await expect(privatePaymentButton).toBeDisabled();
    await privateDeclarations.nth(0).check();
    await expect(privatePaymentButton).toBeDisabled();
    await privateDeclarations.nth(1).check();
    await expect(privatePaymentButton).toBeEnabled();
  });

  test('restores a public calculator provider in a new auth tab', async ({
    page,
    context,
  }) => {
    const getRequestUrls: string[] = [];

    await context.route(
      '**/api/vbl/pending-calculator-sessions/**',
      async (route) => {
        const request = route.request();
        if (request.method() === 'GET') {
          getRequestUrls.push(request.url());
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              session: PUBLIC_FIXTURE_SESSION,
            }),
          });
          return;
        }
        await route.continue();
      }
    );

    await page.goto(`/calculator/onboarding?session=${FIXTURE_TOKEN}`);
    await expect
      .poll(() => getRequestUrls.find((url) => url.includes(FIXTURE_TOKEN)))
      .not.toBeUndefined();
    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });

    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('vbl_flow_identity_v1'))
      )
      .not.toBeNull();
    const persistedIdentity = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('vbl_flow_identity_v1') ?? 'null')
    );
    expect(persistedIdentity).toMatchObject({
      version: 1,
      origin: 'calculator',
      pensionType: 'public',
      pensionProvider: 'VBLklassik',
    });

    await context.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'public-user',
            email: 'calculator@example.com',
            emailVerified: true,
          },
        }),
      })
    );
    await page.evaluate(() =>
      localStorage.setItem('accessToken', 'mock-access-token')
    );

    const resumedPage = await context.newPage();
    await resumedPage.goto('/get-started?fromAuth=1');
    await expect(
      resumedPage.getByRole('heading', { name: 'Start your refund claim' })
    ).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() =>
        resumedPage.evaluate(() => {
          const raw = sessionStorage.getItem('vbl_onboarding_v1');
          if (!raw) return null;
          return JSON.parse(raw).data?.membership?.pensionProvider ?? null;
        })
      )
      .toBe('VBLklassik');
    await resumedPage.close();
  });

  test('calculator-entry-a keeps the default origin and magic-link target', async ({
    page,
  }) => {
    const redirectUrls: (string | undefined)[] = [];
    await page.route('**/api/auth/magic-link/request', async (route) => {
      const requestBody = route.request().postDataJSON() as {
        redirectUrl?: string;
      };
      redirectUrls.push(requestBody.redirectUrl);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Magic link sent' }),
      });
    });

    await page.goto('/calculator-entry-a');
    await page
      .getByRole('button', { name: /Public sector refund claim/i })
      .click();
    await page.getByLabel('Email address').fill('default@example.com');
    await page.getByRole('button', { name: /Continue with email/i }).click();

    await expect
      .poll(() => redirectUrls[redirectUrls.length - 1])
      .toBe('/get-started?fromAuth=1');
    await expect
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('vbl_flow_identity_v1'))
      )
      .toBeNull();
  });

  test('soft-fail: no ?session= and legacy sessionStorage drives the UI without a GET', async ({
    page,
    context,
  }) => {
    let getFired = false;

    await context.route(
      '**/api/vbl/pending-calculator-sessions/**',
      async (route) => {
        if (route.request().method() === 'GET') {
          getFired = true;
        }
        await route.continue();
      }
    );

    await page.addInitScript(() => {
      sessionStorage.setItem(
        'calculator-selection',
        JSON.stringify({
          pensionProvider: 'BVV',
          claimTypes: ['private'],
          privateProvider: 'BVV',
          publicStageProvider: '',
        })
      );
    });

    await page.goto('/calculator/onboarding');

    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });
    expect(getFired).toBe(false);
  });
});
