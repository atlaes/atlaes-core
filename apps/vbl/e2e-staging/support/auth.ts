import {
  expect,
  request as playwrightRequest,
  test as base,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';
import {
  API_URL,
  BASE_URL,
  E2E_EMAIL_DOMAIN,
  E2E_SECRET,
  E2E_SECRET_HEADER,
  MISSING_SECRET_MESSAGE,
  RUN_ID,
} from './env';

/** Where every address a run creates is recorded for the global teardown. */
export const EMAIL_LOG = path.join(
  __dirname,
  '..',
  '..',
  'test-results-staging',
  `e2e-emails-${RUN_ID}.txt`
);

let counter = 0;

/** `vbl-<tag>-<runId>@e2e.test`, unique per call within a run. */
export function testEmail(tag: string): string {
  counter += 1;
  const safeTag = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const unique = `${RUN_ID}-${process.pid.toString(36)}${counter}`;
  const email = `vbl-${safeTag}-${unique}@${E2E_EMAIL_DOMAIN}`;
  mkdirSync(path.dirname(EMAIL_LOG), { recursive: true });
  appendFileSync(EMAIL_LOG, `${email}\n`);
  return email;
}

export function hasE2eSecret(): boolean {
  return E2E_SECRET.length > 0;
}

/** Skip the current test (or describe block) when the secret is missing. */
export function requireE2eSecret() {
  base.skip(!hasE2eSecret(), MISSING_SECRET_MESSAGE);
}

async function apiContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { [E2E_SECRET_HEADER]: E2E_SECRET },
  });
}

/**
 * Asks the backend for a magic link the e2e way: secret header + an
 * @e2e.test address. The backend skips the e-mail and returns the link.
 */
export async function requestMagicLink(
  email: string,
  redirectUrl?: string
): Promise<{ token: string; redirect: string | null }> {
  const api = await apiContext();
  try {
    const res = await api.post('/api/auth/magic-link/request', {
      data: { email, ...(redirectUrl ? { redirectUrl } : {}) },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { magicLink?: string };
    expect(
      body.magicLink,
      'The backend did not return the magic link. Is the e2e login deployed ' +
        'and E2E_LOGIN_SECRET identical on both sides?'
    ).toBeTruthy();
    const link = new URL(body.magicLink as string);
    return {
      token: link.searchParams.get('token') ?? '',
      redirect: link.searchParams.get('redirect'),
    };
  } finally {
    await api.dispose();
  }
}

/**
 * Signs `page` in by opening the magic link in the browser, exactly like a
 * user clicking it in the e-mail. The link is rebuilt on BASE_URL so the
 * same specs work against a local stack whose backend points elsewhere.
 */
export async function loginViaMagicLink(
  page: Page,
  email: string,
  redirectUrl = '/dashboard'
) {
  const { token } = await requestMagicLink(email, redirectUrl);
  const url = new URL('/auth/magic-link', BASE_URL);
  url.searchParams.set('token', token);
  url.searchParams.set('redirect', redirectUrl);
  await page.goto(url.toString());
  await expect(
    page.getByRole('heading', { name: 'Login Successful!' })
  ).toBeVisible({ timeout: 20_000 });
  const redirectPath = redirectUrl.split('?')[0];
  await page.waitForURL((u) => u.pathname === redirectPath, {
    timeout: 20_000,
  });
}

/** API-only sign-in: returns an access token for direct API assertions. */
export async function apiLogin(
  email: string
): Promise<{ accessToken: string; userId: string }> {
  const { token } = await requestMagicLink(email);
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  try {
    const res = await api.post('/api/auth/magic-link/verify', {
      data: { token },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as {
      user: { id: string };
      tokens: { accessToken: string };
    };
    return { accessToken: body.tokens.accessToken, userId: body.user.id };
  } finally {
    await api.dispose();
  }
}

/** Authenticated API context for the user behind `accessToken`. */
export async function userApi(accessToken: string) {
  return playwrightRequest.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface CleanupResult {
  success: boolean;
  users: number;
  claims: number;
  documents: number;
  s3ObjectsDeleted: number;
  lettershop: {
    deletedJobIds: string[];
    manualJobIds: { id: string; claimId: string; reason: string }[];
  };
}

/**
 * Deletes everything the given @e2e.test addresses own on staging
 * (POST /api/e2e/cleanup). `olderThanMinutes` additionally sweeps leftovers
 * of crashed runs.
 */
export async function cleanup(
  emails: string[],
  olderThanMinutes?: number
): Promise<CleanupResult | null> {
  if (!hasE2eSecret()) return null;
  if (emails.length === 0 && olderThanMinutes === undefined) return null;
  const api = await apiContext();
  try {
    const res = await api.post('/api/e2e/cleanup', {
      data: {
        ...(emails.length ? { emails } : {}),
        ...(olderThanMinutes !== undefined ? { olderThanMinutes } : {}),
      },
    });
    if (res.status() !== 200) {
      throw new Error(
        `E2E cleanup failed (${res.status()}): ${await res.text()}`
      );
    }
    const body = (await res.json()) as CleanupResult;
    if (body.lettershop?.manualJobIds?.length) {
      console.warn(
        '[e2e cleanup] Lettershop test jobs to delete by hand in the ' +
          'onlinebrief24 Kundencenter (Warenkorb):',
        JSON.stringify(body.lettershop.manualJobIds)
      );
    }
    return body;
  } finally {
    await api.dispose();
  }
}

/**
 * `test` with an `e2eEmail` fixture: a fresh @e2e.test address per test,
 * cleaned up (user, claims, documents, S3, lettershop) when the test ends.
 */
export const test = base.extend<{ e2eEmail: (tag: string) => string }>({
  // eslint-disable-next-line no-empty-pattern
  e2eEmail: async ({}, use) => {
    const created: string[] = [];
    await use((tag: string) => {
      const email = testEmail(tag);
      created.push(email);
      return email;
    });
    if (created.length) {
      const result = await cleanup(created);
      if (result) {
        console.log(
          `[e2e cleanup] ${created.join(', ')}: users=${result.users} ` +
            `claims=${result.claims} documents=${result.documents} ` +
            `s3=${result.s3ObjectsDeleted} ` +
            `lettershopDeleted=${result.lettershop.deletedJobIds.length}`
        );
      }
    }
  },
});

export { expect };
