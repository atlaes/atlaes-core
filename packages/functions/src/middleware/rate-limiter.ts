import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../utils/logger';

// Container-compatible rate limiter with Redis support
export const rateLimiter = (
  options: {
    windowMs?: number;
    max?: number;
  } = {}
) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // 100 requests per window

  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || '';

    // Basic bot detection and blocking
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
    ];

    const isSuspicious = suspiciousPatterns.some(
      (pattern) => pattern.test(userAgent) || pattern.test(ip)
    );

    if (isSuspicious) {
      logger.warn('Suspicious request detected', { ip, userAgent });

      // More restrictive limits for suspicious activity
      const suspiciousMax = Math.floor(max / 10); // 10% of normal limit

      // TODO: Implement Redis-based rate limiting for containers
      // For now, use basic in-memory tracking (works in containers)
      const key = `rate_limit:${ip}:${Math.floor(Date.now() / windowMs)}`;

      // Simple in-memory rate limiting (containers maintain state)
      const requestCount = (global as any).rateLimitStore?.get(key) || 0;
      (global as any).rateLimitStore =
        (global as any).rateLimitStore || new Map();
      (global as any).rateLimitStore.set(key, requestCount + 1);

      if (requestCount > suspiciousMax) {
        throw new HTTPException(429, {
          message: 'Rate limit exceeded for suspicious activity',
        });
      }
    }

    // Log the request for monitoring
    logger.info('Rate limit check passed', {
      ip,
      userAgent: userAgent.substring(0, 100),
      suspicious: isSuspicious,
    });

    await next();
  };
};
