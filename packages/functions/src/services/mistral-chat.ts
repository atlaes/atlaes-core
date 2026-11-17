import { logger } from '../utils/logger';

// One place for the Mistral chat call behind every OCR field extraction
// (passport/ID, pension statements, health insurance, DRV refund decision).
//
// Nov 2026: on staging the OCR step kept working while every extraction
// call with `mistral-large-latest` was rejected (HTTP 502 from our API
// within ~3 s), so uploads came back with empty fields. Mistral moved its
// Large line (Large 3 deprecated 31 Oct 2026, Large 4 released), and an alias
// or JSON-mode change on a single model should not take every upload down
// again. So: try the configured model, and when Mistral rejects the request
// in a way that points at the model (400/403/404/422), try the next current
// model. The first model that answers is remembered for the rest of the
// container's life, so later uploads do not pay for the failing call.
//
// 16 Nov 2026: for a few minutes every statement upload on staging ended in
// a 504 from the load balancer after 60 s. Each Mistral call had its own
// 60 s timeout, so one slow answer was enough to outlast the load balancer's
// 60 s idle timeout and the client never got our own error (and the passport
// step never got its "type it in yourself" fallback). Now one upload shares
// one deadline across all of its Mistral calls, each call is capped, the
// response body is read inside that cap, and a slow or failed answer
// (timeout, network error, 429, 5xx) is retried once with the small model
// while time is left.

export const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';

/** Tried after the configured model, in this order. */
export const FALLBACK_EXTRACTION_MODELS = [
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
] as const;

/** Statuses that say "this model/request shape", not "your key" or "later". */
const MODEL_REJECTED = new Set([400, 403, 404, 422]);

/**
 * Time one upload may spend on Mistral. The load balancer in front of the
 * backend closes a request after 60 s; the rest is left for the upload
 * itself, S3 and the database.
 */
export const MISTRAL_UPLOAD_BUDGET_MS = 45_000;
/** Cap for one OCR call. */
export const MISTRAL_OCR_TIMEOUT_MS = 25_000;
/** Cap for one chat (field extraction) call. */
export const MISTRAL_CHAT_TIMEOUT_MS = 25_000;
/** Below this, a call is not started: it would not finish in time. */
export const MISTRAL_MIN_ATTEMPT_MS = 4_000;
/** Tried once when the chosen model is slow or failing on Mistral's side. */
export const SLOW_ANSWER_FALLBACK_MODEL = 'mistral-small-latest';

/** A Mistral call ran out of time (its cap or the upload's deadline). */
export class MistralTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MistralTimeoutError';
  }
}

/** The shared time budget of one upload. */
export interface MistralDeadline {
  readonly startedAt: number;
  readonly budgetMs: number;
}

export function startMistralDeadline(
  budgetMs = MISTRAL_UPLOAD_BUDGET_MS
): MistralDeadline {
  return { startedAt: Date.now(), budgetMs };
}

export function mistralRemainingMs(deadline: MistralDeadline): number {
  return deadline.budgetMs - (Date.now() - deadline.startedAt);
}

function attemptTimeoutMs(
  deadline: MistralDeadline | undefined,
  capMs: number
): number {
  return deadline ? Math.min(capMs, mistralRemainingMs(deadline)) : capMs;
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

/**
 * fetch() against Mistral with a cap that also covers reading the body.
 * Returns a buffered Response (body still unread for the caller). Throws
 * MistralTimeoutError when the cap or the deadline runs out, and logs the
 * duration of every call so slow answers show up in the backend logs.
 */
export async function mistralFetch(
  url: string,
  init: RequestInit,
  {
    deadline,
    timeoutMs,
    context,
  }: { deadline?: MistralDeadline; timeoutMs: number; context: string }
): Promise<Response> {
  const ms = attemptTimeoutMs(deadline, timeoutMs);
  if (ms < MISTRAL_MIN_ATTEMPT_MS) {
    logger.warn('No time left for a Mistral call', { context, leftMs: ms });
    throw new MistralTimeoutError(`${context}: Mistral did not answer in time`);
  }

  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(ms),
    });
    const body = await response.text();
    logger.info('Mistral call finished', {
      context,
      status: response.status,
      durationMs: Date.now() - started,
    });
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    if (isTimeout(error)) {
      logger.warn('Mistral call timed out', {
        context,
        timeoutMs: ms,
        durationMs: Date.now() - started,
      });
      throw new MistralTimeoutError(
        `${context}: Mistral did not answer in time`
      );
    }
    throw error;
  }
}

let workingModel: string | null = null;

/** Test hook. */
export function resetMistralModelCache(): void {
  workingModel = null;
}

/** Models to try, first to last, without duplicates. */
export function extractionModelCandidates(configured: string): string[] {
  const out: string[] = [];
  for (const m of [workingModel, configured, ...FALLBACK_EXTRACTION_MODELS]) {
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

export interface MistralChatResult {
  /** The last response, body unread (callers parse it as before). */
  response: Response;
  /** The model that produced `response`. */
  model: string;
}

/**
 * POST a chat completion. `payload` is the request body without `model`.
 * Returns the first accepted response, or the last rejection if every model
 * was rejected. Key errors (401) are returned at once. A slow or failed
 * answer (timeout, network error, 429, 5xx) is retried once with
 * SLOW_ANSWER_FALLBACK_MODEL while the deadline allows; if that fails too,
 * the last response is returned, or MistralTimeoutError is thrown when
 * there is none.
 */
export async function postMistralChat({
  apiKey,
  model,
  payload,
  timeoutMs = MISTRAL_CHAT_TIMEOUT_MS,
  deadline,
  context,
}: {
  apiKey: string;
  model: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
  /** Shared by every Mistral call of one upload. */
  deadline?: MistralDeadline;
  /** For the logs, e.g. 'passport extraction'. */
  context: string;
}): Promise<MistralChatResult> {
  const attempt = (candidate: string) =>
    attemptChat({ apiKey, candidate, payload, timeoutMs, deadline, context });

  const candidates = extractionModelCandidates(model);
  let last: MistralChatResult | null = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const outcome = await attempt(candidate);

    if (outcome.kind === 'transient') {
      return retrySlowAnswer({
        candidate,
        outcome,
        attempt,
        deadline,
        context,
      });
    }

    const { response } = outcome;
    last = { response, model: candidate };

    if (response.ok) {
      if (workingModel !== candidate) {
        if (candidate !== model) {
          logger.warn('Mistral extraction is using a fallback model', {
            context,
            configured: model,
            model: candidate,
          });
        }
        workingModel = candidate;
      }
      return last;
    }

    const isLast = i === candidates.length - 1;
    if (!MODEL_REJECTED.has(response.status) || isLast) return last;

    // Log Mistral's reason (model name, JSON mode, ...) and try the next one.
    const reason = await response
      .clone()
      .text()
      .catch(() => '');
    logger.warn('Mistral rejected the extraction model, trying the next', {
      context,
      model: candidate,
      next: candidates[i + 1],
      status: response.status,
      body: reason.slice(0, 1000),
    });
    if (workingModel === candidate) workingModel = null;
  }

  // candidates is never empty; this satisfies the type checker.
  return last as MistralChatResult;
}

type ChatOutcome =
  | { kind: 'response'; response: Response }
  | { kind: 'transient'; response?: Response; error?: unknown };

async function attemptChat({
  apiKey,
  candidate,
  payload,
  timeoutMs,
  deadline,
  context,
}: {
  apiKey: string;
  candidate: string;
  payload: Record<string, unknown>;
  timeoutMs: number;
  deadline?: MistralDeadline;
  context: string;
}): Promise<ChatOutcome> {
  let response: Response;
  try {
    response = await mistralFetch(
      MISTRAL_CHAT_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, model: candidate }),
      },
      { deadline, timeoutMs, context: `${context} (${candidate})` }
    );
  } catch (error) {
    // Timeout, or the connection failed (fetch rejects with a TypeError).
    if (error instanceof MistralTimeoutError || error instanceof TypeError) {
      return { kind: 'transient', error };
    }
    throw error;
  }
  if (response.status === 429 || response.status >= 500) {
    return { kind: 'transient', response };
  }
  return { kind: 'response', response };
}

async function retrySlowAnswer({
  candidate,
  outcome,
  attempt,
  deadline,
  context,
}: {
  candidate: string;
  outcome: Extract<ChatOutcome, { kind: 'transient' }>;
  attempt: (candidate: string) => Promise<ChatOutcome>;
  deadline?: MistralDeadline;
  context: string;
}): Promise<MistralChatResult> {
  let failure = outcome;
  let failedModel = candidate;
  const timeLeft =
    !deadline || mistralRemainingMs(deadline) >= MISTRAL_MIN_ATTEMPT_MS;

  if (candidate !== SLOW_ANSWER_FALLBACK_MODEL && timeLeft) {
    logger.warn('Mistral extraction slow or failing, retrying once', {
      context,
      model: candidate,
      next: SLOW_ANSWER_FALLBACK_MODEL,
      status: outcome.response?.status,
      error: outcome.error instanceof Error ? outcome.error.message : undefined,
    });
    const retry = await attempt(SLOW_ANSWER_FALLBACK_MODEL);
    // Not remembered as the working model: the first one is only slow.
    if (retry.kind === 'response') {
      return { response: retry.response, model: SLOW_ANSWER_FALLBACK_MODEL };
    }
    failure = retry;
    failedModel = SLOW_ANSWER_FALLBACK_MODEL;
  }

  if (failure.response)
    return { response: failure.response, model: failedModel };
  throw failure.error;
}
