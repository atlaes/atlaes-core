import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MISTRAL_UPLOAD_BUDGET_MS,
  MistralTimeoutError,
  extractionModelCandidates,
  mistralFetch,
  postMistralChat,
  resetMistralModelCache,
  startMistralDeadline,
  type MistralDeadline,
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

const call = (model = 'mistral-large-latest', deadline?: MistralDeadline) =>
  postMistralChat({
    apiKey: 'test-key',
    model,
    deadline,
    context: 'test',
    payload: { temperature: 0, messages: [] },
  });

const timedOut = () =>
  Promise.reject(new DOMException('The operation timed out', 'TimeoutError'));

/** A deadline with only `leftMs` of its budget remaining. */
const deadlineWith = (leftMs: number): MistralDeadline => ({
  startedAt: Date.now() - (MISTRAL_UPLOAD_BUDGET_MS - leftMs),
  budgetMs: MISTRAL_UPLOAD_BUDGET_MS,
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

  it('returns a key error (401) at once', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(fail(401));
    global.fetch = fetchMock;
    const res = await call();
    expect(res.response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 503])(
    'retries once with the small model on %s, without remembering it',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(fail(status))
        .mockResolvedValueOnce(ok())
        .mockResolvedValueOnce(ok());
      global.fetch = fetchMock;

      const first = await call();
      expect(first.model).toBe('mistral-small-latest');
      expect(await first.response.json()).toHaveProperty('choices');

      // The configured model is only slow, so the next upload tries it again.
      const second = await call();
      expect(second.model).toBe('mistral-large-latest');
      expect(modelsCalled(fetchMock)).toEqual([
        'mistral-large-latest',
        'mistral-small-latest',
        'mistral-large-latest',
      ]);
    }
  );

  it('returns the retry response when the small model fails too', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fail(503))
      .mockResolvedValueOnce(fail(500));
    global.fetch = fetchMock;
    const res = await call();
    expect(res.response.status).toBe(500);
    expect(res.model).toBe('mistral-small-latest');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the small model itself is the one failing', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(fail(503));
    global.fetch = fetchMock;
    const res = await call('mistral-small-latest');
    expect(res.response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries with the small model after a timeout', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(timedOut)
      .mockResolvedValueOnce(ok());
    global.fetch = fetchMock;
    const res = await call('mistral-medium-latest', startMistralDeadline());
    expect(res.model).toBe('mistral-small-latest');
    expect(res.response.ok).toBe(true);
    expect(modelsCalled(fetchMock)).toEqual([
      'mistral-medium-latest',
      'mistral-small-latest',
    ]);
  });

  it('retries after a network error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok());
    global.fetch = fetchMock;
    const res = await call('mistral-medium-latest');
    expect(res.model).toBe('mistral-small-latest');
  });

  it('throws MistralTimeoutError when the retry times out too', async () => {
    const fetchMock = vi.fn().mockImplementation(timedOut);
    global.fetch = fetchMock;
    await expect(
      call('mistral-medium-latest', startMistralDeadline())
    ).rejects.toBeInstanceOf(MistralTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caps each call by the time left on the deadline', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    global.fetch = vi.fn().mockResolvedValueOnce(ok());
    await call('mistral-medium-latest', deadlineWith(10_000));
    const ms = timeout.mock.calls[0][0];
    expect(ms).toBeLessThanOrEqual(10_000);
    expect(ms).toBeGreaterThan(9_000);
    timeout.mockRestore();
  });

  it('does not start a call when the deadline is nearly spent', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    await expect(
      call('mistral-medium-latest', deadlineWith(1_000))
    ).rejects.toBeInstanceOf(MistralTimeoutError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the retry when no time is left after a timeout', async () => {
    const fetchMock = vi.fn().mockImplementation(timedOut);
    global.fetch = fetchMock;
    const now = Date.now();
    const clock = vi
      .spyOn(Date, 'now')
      .mockReturnValueOnce(now) // first call: 10 s left
      .mockReturnValue(now + 8_000); // after it timed out: 2 s left
    await expect(
      call('mistral-medium-latest', {
        startedAt: now - (MISTRAL_UPLOAD_BUDGET_MS - 10_000),
        budgetMs: MISTRAL_UPLOAD_BUDGET_MS,
      })
    ).rejects.toBeInstanceOf(MistralTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clock.mockRestore();
  });

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

describe('mistralFetch', () => {
  it('hands back the body unread after reading it inside the cap', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(ok());
    const res = await mistralFetch(
      'https://api.mistral.ai/v1/ocr',
      { method: 'POST' },
      { timeoutMs: 5_000, context: 'test' }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveProperty('choices');
  });

  it('turns a body that stalls past the cap into MistralTimeoutError', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      text: timedOut,
    });
    await expect(
      mistralFetch(
        'https://api.mistral.ai/v1/ocr',
        { method: 'POST' },
        { timeoutMs: 5_000, context: 'test' }
      )
    ).rejects.toBeInstanceOf(MistralTimeoutError);
  });
});
