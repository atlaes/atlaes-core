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

export const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';

/** Tried after the configured model, in this order. */
export const FALLBACK_EXTRACTION_MODELS = [
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
] as const;

/** Statuses that say "this model/request shape", not "your key" or "later". */
const MODEL_REJECTED = new Set([400, 403, 404, 422]);

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
 * was rejected. Key errors (401), rate limits and server errors are returned
 * at once: another model would not help.
 */
export async function postMistralChat({
  apiKey,
  model,
  payload,
  timeoutMs = 60_000,
  context,
}: {
  apiKey: string;
  model: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
  /** For the logs, e.g. 'passport extraction'. */
  context: string;
}): Promise<MistralChatResult> {
  const candidates = extractionModelCandidates(model);
  let last: MistralChatResult | null = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const response = await fetch(MISTRAL_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, model: candidate }),
      signal: AbortSignal.timeout(timeoutMs),
    });
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
    const reason = await response.text().catch(() => '');
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
