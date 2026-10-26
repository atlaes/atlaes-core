import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requireRole } from './roles';
import type { AuthUser } from './auth';

function appWithUser(user: AuthUser | null, ...roles: string[]) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (user) c.set('user', user);
    await next();
  });
  app.get('/x', requireRole(...roles), (c) => c.json({ ok: true }));
  return app;
}

const asRole = (role: string): AuthUser => ({
  id: 'u1',
  email: 'x@example.com',
  emailVerified: true,
  role,
});

describe('requireRole', () => {
  it('passes a listed role', async () => {
    const res = await appWithUser(asRole('law_firm'), 'law_firm').request('/x');
    expect(res.status).toBe(200);
  });

  it('accepts any of several roles', async () => {
    const res = await appWithUser(asRole('admin'), 'law_firm', 'admin').request(
      '/x'
    );
    expect(res.status).toBe(200);
  });

  it('rejects an unlisted role with 403', async () => {
    const res = await appWithUser(asRole('user'), 'admin').request('/x');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Forbidden: admin access required',
    });
  });

  it('rejects a missing user', async () => {
    const res = await appWithUser(null, 'admin').request('/x');
    expect(res.status).toBe(403);
  });

  it('does not let a law-firm user through an admin gate', async () => {
    const res = await appWithUser(asRole('law_firm'), 'admin').request('/x');
    expect(res.status).toBe(403);
  });
});
