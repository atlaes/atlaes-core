export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

class SimpleLogger implements Logger {
  private formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new SimpleLogger();

/**
 * Serialize an unknown caught value into logger-friendly metadata.
 *
 * `logger.error(message, error)` silently loses the useful bits of a real
 * Error: `JSON.stringify(error)` on a plain Error produces `{}` because
 * `message`/`stack` are non-enumerable, so passing an Error directly as the
 * `meta` argument logs nothing actionable. Use this helper to pass the
 * actual error message/stack/name through so root causes (e.g. a Postgres
 * "column does not exist" error from schema drift) are visible in logs
 * instead of being swallowed.
 */
export function toErrorMeta(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      error: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { error };
}
