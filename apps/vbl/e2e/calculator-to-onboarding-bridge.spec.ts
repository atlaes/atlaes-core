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
  scenario: 'public_eligible',
  // Single claim type → no PensionTypeSelection screen, goes
  // straight to the secure-claim account screen.
  pensionProvider: 'VBLklassik',
  claimTypes: ['public'],
  privateProvider: '',
  publicStageProvider: 'VBLklassik',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

test.describe('Calculator → Onboarding bridge', () => {
  test('hydrates onboarding from ?session=<token> via GET /api/vbl/pending-calculator-sessions/:token', async ({
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
    // straight on the secure-claim account screen.
    await expect(
      page.getByRole('heading', { name: 'Create your secure claim' })
    ).toBeVisible({ timeout: 10_000 });

    // Production email verification opens /get-started in a new tab. Keep
    // the single-claim pension identity in localStorage so that tab can
    // restore the locked provider field instead of rendering it empty and
    // leaving Continue permanently disabled.
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
      pensionType: 'public',
      pensionProvider: 'VBLklassik',
    });

    await context.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user_mock',
            email: 'calculator@example.com',
            emailVerified: true,
          },
        }),
      })
    );
    await page.evaluate(() =>
      localStorage.setItem('accessToken', 'mock-access-token')
    );

    // A new page has its own empty sessionStorage, matching the production
    // magic-link tab. The persisted identity must still restore the
    // calculator-selected VBL claim rather than an empty public default.
    const resumedPage = await context.newPage();
    await resumedPage.goto('/get-started?fromAuth=1');
    await expect(
      resumedPage.getByRole('heading', {
        name: 'Start your refund claim',
      })
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
