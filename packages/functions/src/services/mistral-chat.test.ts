import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractionModelCandidates,
  postMistralChat,
  resetMistralModelCache,
} from './mistral-chat';

const originalFetch = global.fetch;

const ok = () =>
  new Response(
    JSON.stringify({ choices: [{ message: { content: '{"a":"b"}' } }] }),
    { status: 200 }
  );
const fail = (status: number) =>
  new Response(JSON.stringify({ message: 'nope' }), { status });

const modelsCalled = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(
    (call) => JSON.parse(call[1].body as string).model as string
  );

const call = (model = 'mistral-large-latest') =>
  postMistralChat({
    apiKey: 'test-key',
    model,
    context: 'test',
    payload: { temperature: 0, messages: [] },
  });

// Module state survives across files (isolate: false).
beforeEach(() => resetMistralModelCache());

afterEach(() => {
  global.fetch = originalFetch;
  resetMistralModelCache();
});

describe('extractionModelCandidates', () => {
  it('puts the configured model first and drops duplicates', () => {
    expect(extractionModelCandidates('mistral-large-latest')).toEqual([
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
    ]);
    expect(extractionModelCandidates('mistral-large-4')).toEqual([
      'mistral-large-4',
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
    ]);
  });
});

describe('postMistralChat', () => {
  it('uses the configured model when it answers', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok());
    global.fetch = fetchMock;
    const res = await call();
    expect(res.response.ok).toBe(true);
    expect(res.model).toBe('mistral-large-latest');
    expect(modelsCalled(fetchMock)).toEqual(['mistral-large-latest']);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ temperature: 0, messages: [] });
  });

  it.each([400, 403, 404, 422])(
    'falls back to the next model on %s and remembers it',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(fail(status))
        .mockResolvedValueOnce(ok())
        .mockResolvedValueOnce(ok());
      global.fetch = fetchMock;

      const first = await call();
      expect(first.model).toBe('mistral-medium-latest');
      expect(await first.response.json()).toHaveProperty('choices');

      // The next upload goes straight to the model that worked.
      const second = await call();
      expect(second.model).toBe('mistral-medium-latest');
      expect(modelsCalled(fetchMock)).toEqual([
        'mistral-large-latest',
        'mistral-medium-latest',
        'mistral-medium-latest',
      ]);
    }
  );

  it.each([401, 429, 500, 503])(
    'returns %s at once (key, rate limit or outage)',
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValueOnce(fail(status));
      global.fetch = fetchMock;
      const res = await call();
      expect(res.response.status).toBe(status);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it('returns the last rejection, body unread, when every model fails', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => fail(400));
    global.fetch = fetchMock;
    const res = await call();
    expect(res.response.status).toBe(400);
    expect(res.model).toBe('mistral-small-latest');
    expect(await res.response.json()).toEqual({ message: 'nope' });
    expect(modelsCalled(fetchMock)).toEqual([
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
    ]);
  });

  it('forgets a remembered model once it starts failing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fail(404))
      .mockResolvedValueOnce(ok()) // medium remembered
      .mockResolvedValueOnce(fail(404)) // medium now rejected
      .mockResolvedValueOnce(ok()); // configured large works again
    global.fetch = fetchMock;
    await call();
    const res = await call();
    expect(res.model).toBe('mistral-large-latest');
    expect(modelsCalled(fetchMock)).toEqual([
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-medium-latest',
      'mistral-large-latest',
    ]);
  });
});
