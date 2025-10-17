import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  logger.info('Request completed', {
    method,
    url,
    status,
    duration: `${duration}ms`,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
  });
};
