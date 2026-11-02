import { afterEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { RateLimit, clientIp, rateLimiter } from './rate-limiter';

// Pure tests: no database. The limiter is in-memory per process.
//   pnpm vitest run src/middleware/rate-limiter.test.ts

const MINUTE = 60 * 1000;

function appWith(middleware: ReturnType<typeof rateLimiter>) {
  const app = new Hono();
  app.use('*', middleware);
  app.get('/ping', (c) => c.json({ ok: true }));
  app.post('/ping', (c) => c.json({ ok: true }));
  return app;
}

const get = (app: Hono, headers: Record<string, string> = {}) =>
  app.request('/ping', { method: 'GET', headers });

describe('RateLimit', () => {
  it('allows max requests per window and rejects the next ones', () => {
    const limit = new RateLimit({ windowMs: MINUTE, max: 3 });
    const now = 1_000_000;
    expect(limit.hit('a', now).allowed).toBe(true);
    expect(limit.hit('a', now + 1).allowed).toBe(true);
    const third = limit.hit('a', now + 2);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = limit.hit('a', now + 3);
    expect(fourth.allowed).toBe(false);
    expect(fourth.firstRejection).toBe(true);
    expect(fourth.retryAfterSeconds).toBe(60);

    const fifth = limit.hit('a', now + 4);
    expect(fifth.allowed).toBe(false);
    expect(fifth.firstRejection).toBe(false);
  });

  it('keeps keys apart and starts a fresh window after windowMs', () => {
    const limit = new RateLimit({ windowMs: MINUTE, max: 1 });
    const now = 5_000_000;
    expect(limit.hit('a', now).allowed).toBe(true);
    expect(limit.hit('b', now).allowed).toBe(true);
    expect(limit.hit('a', now + 10).allowed).toBe(false);
    expect(limit.hit('a', now + MINUTE).allowed).toBe(true);
  });

  it('prunes expired buckets', () => {
    const limit = new RateLimit({ windowMs: MINUTE, max: 5 });
    const now = 9_000_000;
    limit.hit('a', now);
    limit.hit('b', now);
    expect(limit.size).toBe(2);
    expect(limit.prune(now + MINUTE - 1)).toBe(0);
    expect(limit.prune(now + MINUTE)).toBe(2);
    expect(limit.size).toBe(0);
  });

  it('sweeps on its own once the prune interval has passed', () => {
    const limit = new RateLimit({ windowMs: MINUTE, max: 5 });
    const now = 20_000_000;
    limit.hit('old', now);
    // A hit two minutes later: the old bucket is expired and the sweep is due.
    limit.hit('new', now + 2 * MINUTE);
    expect(limit.size).toBe(1);
  });

  it('never grows past maxEntries', () => {
    const limit = new RateLimit({ windowMs: MINUTE, max: 5, maxEntries: 10 });
    const now = 30_000_000;
    for (let i = 0; i < 50; i++) limit.hit(`ip-${i}`, now);
    expect(limit.size).toBeLessThanOrEqual(10);
  });
});

describe('clientIp', () => {
  const app = new Hono();
  app.get('/ip', (c) => c.text(clientIp(c)));

  it('uses the last X-Forwarded-For hop (the one the load balancer added)', async () => {
    const res = await app.request('/ip', {
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 203.0.113.9' },
    });
    expect(await res.text()).toBe('203.0.113.9');
  });

  it('falls back to X-Real-IP, then to "unknown"', async () => {
    expect(
      await (
        await app.request('/ip', { headers: { 'x-real-ip': '198.51.100.4' } })
      ).text()
    ).toBe('198.51.100.4');
    expect(await (await app.request('/ip')).text()).toBe('unknown');
  });
});

describe('rateLimiter middleware', () => {
  afterEach(() => {
    delete process.env.APP_STAGE;
    delete process.env.E2E_LOGIN_SECRET;
  });

  it('answers 429 with Retry-After once the window is full', async () => {
    const app = appWith(rateLimiter({ windowMs: MINUTE, max: 2 }));
    const headers = { 'x-forwarded-for': '203.0.113.1' };

    const first = await get(app, headers);
    expect(first.status).toBe(200);
    expect(first.headers.get('RateLimit-Limit')).toBe('2');
    expect(first.headers.get('RateLimit-Remaining')).toBe('1');
    expect((await get(app, headers)).status).toBe(200);

    const blocked = await get(app, headers);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(blocked.headers.get('RateLimit-Remaining')).toBe('0');
    const body = (await blocked.json()) as { error: string; message: string };
    expect(body.error).toBe('Too Many Requests');
    expect(body.message).toContain('Too many requests');
  });

  it('counts every request, whatever the user agent', async () => {
    const app = appWith(rateLimiter({ windowMs: MINUTE, max: 1 }));
    const headers = {
      'x-forwarded-for': '203.0.113.2',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };
    expect((await get(app, headers)).status).toBe(200);
    expect((await get(app, headers)).status).toBe(429);
  });

  it('ignores a forged X-Forwarded-For prefix', async () => {
    const app = appWith(rateLimiter({ windowMs: MINUTE, max: 1 }));
    expect(
      (await get(app, { 'x-forwarded-for': '10.0.0.1, 203.0.113.3' })).status
    ).toBe(200);
    // Same real client, different spoofed first hop: still the same bucket.
    expect(
      (await get(app, { 'x-forwarded-for': '10.0.0.2, 203.0.113.3' })).status
    ).toBe(429);
  });

  it('keeps separate clients separate', async () => {
    const app = appWith(rateLimiter({ windowMs: MINUTE, max: 1 }));
    expect((await get(app, { 'x-forwarded-for': '203.0.113.4' })).status).toBe(
      200
    );
    expect((await get(app, { 'x-forwarded-for': '203.0.113.5' })).status).toBe(
      200
    );
  });

  it('supports a custom key, e.g. per account', async () => {
    const app = appWith(
      rateLimiter({
        windowMs: MINUTE,
        max: 1,
        keyGenerator: (c) => c.req.header('x-account') ?? 'anonymous',
      })
    );
    expect((await get(app, { 'x-account': 'a' })).status).toBe(200);
    expect((await get(app, { 'x-account': 'a' })).status).toBe(429);
    expect((await get(app, { 'x-account': 'b' })).status).toBe(200);
  });

  it('exempts the staging e2e suite (secret header on a non-production stage)', async () => {
    process.env.APP_STAGE = 'staging';
    process.env.E2E_LOGIN_SECRET =
      'e2e-secret-that-is-at-least-32-characters-long';
    const app = appWith(rateLimiter({ windowMs: MINUTE, max: 1 }));
    const headers = {
      'x-forwarded-for': '203.0.113.6',
      'X-E2E-Secret': process.env.E2E_LOGIN_SECRET,
    };
    expect((await get(app, headers)).status).toBe(200);
    expect((await get(app, headers)).status).toBe(200);
    expect((await get(app, headers)).status).toBe(200);
  });
});
