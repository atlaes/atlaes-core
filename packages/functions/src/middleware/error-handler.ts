import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from '../utils/logger';

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: c.req.url,
      method: c.req.method,
    });

    if (error instanceof HTTPException) {
      return c.json(
        {
          error: error.message,
          status: error.status,
        },
        error.status
      );
    }

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const message = isDevelopment 
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Internal server error';

    return c.json(
      {
        error: message,
        status: 500,
      },
      500
    );
  }
};
