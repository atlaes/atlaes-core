import type { Context, Next } from 'hono';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Rejects requests whose named path params are not well-formed UUIDs.
 *
 * Our primary keys are Postgres `uuid` columns. Comparing them against an
 * arbitrary string (e.g. `/claims/wpsc-session`) makes Postgres throw
 * `invalid input syntax for type uuid` before the row lookup even runs, which
 * surfaces as a 500. A malformed id can never match a row, so answer 404 up
 * front instead.
 */
export const validateUuidParams =
  (...names: string[]) =>
  async (c: Context, next: Next) => {
    for (const name of names) {
      const value = c.req.param(name);
      if (value !== undefined && !isUuid(value)) {
        return c.json({ success: false, error: 'Not found' }, 404);
      }
    }
    await next();
  };
