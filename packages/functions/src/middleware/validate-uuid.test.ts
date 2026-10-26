import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { validateUuidParams, isUuid } from './validate-uuid';

describe('validateUuidParams', () => {
  const app = new Hono();
  app.get('/:id', validateUuidParams('id'), (c) =>
    c.json({ id: c.req.param('id') })
  );
  app.get('/:id/docs/:docId', validateUuidParams('id', 'docId'), (c) =>
    c.json({ ok: true })
  );

  const valid = '11111111-2222-4333-8444-555555555555';

  it('passes well-formed UUIDs through', async () => {
    const res = await app.request(`/${valid}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: valid });
  });

  it('returns 404 for a malformed id instead of reaching the database', async () => {
    const res = await app.request('/wpsc-session');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'Not found' });
  });

  it('validates every named param', async () => {
    expect((await app.request(`/${valid}/docs/${valid}`)).status).toBe(200);
    expect((await app.request(`/${valid}/docs/nope`)).status).toBe(404);
    expect((await app.request(`/nope/docs/${valid}`)).status).toBe(404);
  });

  it('isUuid accepts upper-case and rejects near-misses', () => {
    expect(isUuid(valid.toUpperCase())).toBe(true);
    expect(isUuid('')).toBe(false);
    expect(isUuid(`${valid}x`)).toBe(false);
    expect(isUuid('11111111222243338444555555555555')).toBe(false);
  });
});
