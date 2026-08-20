import { test, expect } from '@playwright/test';

// E2E for the Results.tsx → OnboardingFlow.tsx bridge that uses
// /api/vbl/pending-calculator-sessions to carry calculator state across
// the magic-link / OAuth roundtrip.
//
// Two paths are tested:
//   1. Happy path: ?session=<token> in the URL triggers a GET to the
//      backend and hydrates the onboarding state from the response.
//   2. Soft-fail path: no ?session= param falls back to the legacy
//      sessionStorage['calculator-selection'] payload — and crucially
//      does NOT fire a GET against the pending-sessions endpoint.

const FIXTURE_TOKEN = '11111111-1111-1111-1111-111111111111';

const FIXTURE_SESSION = {
  id: 'fixture-id',
  token: FIXTURE_TOKEN,
  email: null,
  jobs: [],
  calculationResult: null,
  scenario: 'private_may_be_possible',
  // Single claim type → no PensionTypeSelection screen, goes
  // straight to "Create your secure claim".
  pensionProvider: 'BVV',
  claimTypes: ['private'],
  privateProvider: 'BVV',
  publicStageProvider: '',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
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
        const req = route.request();
        if (req.method() === 'GET') {
          getRequestUrls.push(req.url());
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, session: FIXTURE_SESSION }),
          });
          return;
        }
        await route.continue();
      }
    );

    await page.goto(`/calculator/onboarding?session=${FIXTURE_TOKEN}`);

    // Wait for the GET to fire with the right token in the URL.
    await expect
      .poll(() => getRequestUrls.find((u) => u.includes(FIXTURE_TOKEN)) ?? null)
      .not.toBeNull();

    // Single claim type → PensionTypeSelection is skipped and we land
    // straight on "Create your secure claim".
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
        page.evaluate(() =>
          window.localStorage.getItem('vbl_flow_identity_v1')
        )
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

    // Seed the legacy payload before the page loads. Single claim type
    // again so we end up on Create Account directly.
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

    // No token in the URL → the bridge GET should never have fired.
    expect(getFired).toBe(false);
  });
});
