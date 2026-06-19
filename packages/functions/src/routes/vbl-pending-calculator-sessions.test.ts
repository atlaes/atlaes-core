import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from '../test/helpers';
import vblPendingCalculatorSessions from './vbl-pending-calculator-sessions';
import { db } from '../utils/db';
import { pendingCalculatorSessions } from '../drizzle/schema/vbl';

describe('vbl-pending-calculator-sessions routes', () => {
  const app = createTestApp(vblPendingCalculatorSessions);

  beforeEach(async () => {
    await db.delete(pendingCalculatorSessions);
  });

  it('POST / creates a session and returns the token', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jobs: [{ employmentType: 'Private sector' }],
        scenario: 'private_may_be_possible',
        claimTypes: ['private'],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('POST / rejects missing required fields', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /:token returns the session', async () => {
    const create = await app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobs: [], claimTypes: [] }),
    });
    const { token } = await create.json();

    const res = await app.request(`/${token}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.session.token).toBe(token);
  });

  it('GET /:token returns 404 for unknown token', async () => {
    const res = await app.request('/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('PATCH /:token/email links an email', async () => {
    const create = await app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobs: [], claimTypes: [] }),
    });
    const { token } = await create.json();

    const res = await app.request(`/${token}/email`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.email).toBe('test@example.com');
  });
});
