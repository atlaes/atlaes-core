import { request } from '@playwright/test';
import {
  expect,
  loginViaMagicLink,
  requireE2eSecret,
  test,
  userApi,
  apiLogin,
} from '../support/auth';
import { API_URL } from '../support/env';

/**
 * Scenario 4 (part) — the staging test login itself: magic-link sign-in in
 * the browser, and the guard around it.
 */

test.beforeEach(() => requireE2eSecret());

test('magic link signs a new @e2e.test user in and opens the dashboard', async ({
  page,
  e2eEmail,
}) => {
  const email = e2eEmail('login');
  await loginViaMagicLink(page, email, '/dashboard');
  await expect(page.getByText('Welcome back')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your Applications' })
  ).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  expect(token).toBeTruthy();
});

test('the API session behind the login is the @e2e.test user', async ({
  e2eEmail,
}) => {
  const email = e2eEmail('api');
  const { accessToken } = await apiLogin(email);
  const api = await userApi(accessToken);
  const me = await api.get('/api/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).user.email).toBe(email);
  await api.dispose();
});

test('without the secret header the link is not returned', async ({
  e2eEmail,
}) => {
  const email = e2eEmail('nosecret');
  const api = await request.newContext({ baseURL: API_URL });
  const res = await api.post('/api/auth/magic-link/request', {
    data: { email },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).magicLink).toBeUndefined();
  await api.dispose();
});

test('the cleanup endpoint is invisible without the secret', async () => {
  const api = await request.newContext({ baseURL: API_URL });
  const res = await api.post('/api/e2e/cleanup', {
    data: { olderThanMinutes: 0 },
  });
  expect(res.status()).toBe(404);
  expect(await res.json()).toMatchObject({ error: 'Not Found' });
  await api.dispose();
});
