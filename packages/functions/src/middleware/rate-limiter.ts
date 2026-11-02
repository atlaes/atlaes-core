import type { Context, MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { logger } from '../utils/logger';
import { isE2eRequest } from '../utils/e2e';

/**
 * Fixed-window rate limiting, in memory per container.
 *
 * The backend is one long-lived Fargate service behind the ALB (no Redis
 * resource is deployed and nothing shares state between tasks), so an
 * in-process store is the honest option: each task enforces the limit for
 * the traffic it sees. The crons and the Stripe webhook Lambda never mount
 * these limiters.
 *
 * Two shapes:
 *   - `rateLimiter(options)`: Hono middleware keyed by client IP (or a
 *     custom key), answering 429 with Retry-After once the window is full.
 *   - `new RateLimit(options)`: the same counter for keys only known inside
 *     a handler, e.g. the e-mail address of a magic-link request.
 */

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms at which the window resets. */
  resetAt: number;
  retryAfterSeconds: number;
  /** True exactly once per window: the request that crossed the limit. */
  firstRejection: boolean;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Expired buckets are swept at most this often (and whenever the map is full). */
const PRUNE_INTERVAL_MS = 60 * 1000;

export class RateLimit {
  readonly windowMs: number;
  readonly max: number;
  private readonly maxEntries: number;
  private readonly buckets = new Map<string, Bucket>();
  private lastPruneAt = 0;

  constructor(options: { windowMs: number; max: number; maxEntries?: number }) {
    if (options.windowMs <= 0 || options.max <= 0) {
      throw new Error('RateLimit needs a positive windowMs and max');
    }
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.maxEntries = options.maxEntries ?? 50_000;
  }

  /** Counts one request for `key` and says whether it is within the limit. */
  hit(key: string, now: number = Date.now()): RateLimitDecision {
    this.pruneIfDue(now);

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;

    return {
      allowed: bucket.count <= this.max,
      limit: this.max,
      remaining: Math.max(0, this.max - bucket.count),
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      firstRejection: bucket.count === this.max + 1,
    };
  }

  /** Drops every bucket whose window has ended. Returns how many were removed. */
  prune(now: number = Date.now()): number {
    let removed = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
        removed += 1;
      }
    }
    this.lastPruneAt = now;
    return removed;
  }

  get size(): number {
    return this.buckets.size;
  }

  reset(): void {
    this.buckets.clear();
    this.lastPruneAt = 0;
  }

  private pruneIfDue(now: number): void {
    const due = now - this.lastPruneAt >= PRUNE_INTERVAL_MS;
    if (!due && this.buckets.size < this.maxEntries) return;
    this.prune(now);
    // Still full after the sweep (a flood from many addresses): shed the
    // oldest live buckets rather than grow without bound. Map iteration is
    // insertion order, so the first entries are the oldest windows.
    if (this.buckets.size >= this.maxEntries) {
      const excess = this.buckets.size - this.maxEntries + 1;
      let dropped = 0;
      for (const key of this.buckets.keys()) {
        if (dropped >= excess) break;
        this.buckets.delete(key);
        dropped += 1;
      }
    }
  }
}

/**
 * The address to count against.
 *
 * The ALB appends the connecting address as the LAST entry of
 * X-Forwarded-For; anything before it was sent by the client and can be
 * forged, so the last hop is the only one to trust. Without the header
 * (local dev, direct calls) the socket peer is used.
 */
export function clientIp(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  const realIp = c.req.header('x-real-ip')?.trim();
  if (realIp) return realIp;
  try {
    const address = getConnInfo(c).remote.address;
    if (address) return address;
  } catch {
    // Not running under @hono/node-server (tests, app.request()).
  }
  return 'unknown';
}

/** The 429 response for an exhausted window, with the standard headers. */
export function rateLimitExceeded(
  c: Context,
  decision: RateLimitDecision,
  message = 'Too many requests. Please try again later.'
): Response {
  return c.json(
    {
      error: 'Too Many Requests',
      message,
      retryAfterSeconds: decision.retryAfterSeconds,
    },
    429,
    {
      'Retry-After': String(decision.retryAfterSeconds),
      'RateLimit-Limit': String(decision.limit),
      'RateLimit-Remaining': '0',
      'RateLimit-Reset': String(decision.retryAfterSeconds),
    }
  );
}

export interface RateLimiterOptions {
  /** Window length in milliseconds. Default 15 minutes. */
  windowMs?: number;
  /** Requests allowed per key and window. Default 100. */
  max?: number;
  /** Bucket key for a request; defaults to the client IP. */
  keyGenerator?: (c: Context) => string | Promise<string>;
  /** Message in the 429 body. */
  message?: string;
}

export const rateLimiter = (
  options: RateLimiterOptions = {}
): MiddlewareHandler => {
  const limit = new RateLimit({
    windowMs: options.windowMs ?? 15 * 60 * 1000,
    max: options.max ?? 100,
  });
  const keyFor = options.keyGenerator ?? clientIp;

  return async (c, next) => {
    // The staging e2e suite (secret header, non-production stage) runs many
    // requests from one runner IP; it is exempt.
    if (isE2eRequest(c)) {
      await next();
      return;
    }

    const key = await keyFor(c);
    const decision = limit.hit(key);

    if (!decision.allowed) {
      if (decision.firstRejection) {
        logger.warn('Rate limit exceeded', {
          key,
          method: c.req.method,
          path: c.req.path,
          limit: decision.limit,
          windowMs: limit.windowMs,
        });
      }
      return rateLimitExceeded(c, decision, options.message);
    }

    c.header('RateLimit-Limit', String(decision.limit));
    c.header('RateLimit-Remaining', String(decision.remaining));
    c.header('RateLimit-Reset', String(decision.retryAfterSeconds));
    await next();
  };
};
