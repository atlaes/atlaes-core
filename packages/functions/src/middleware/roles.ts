import type { Context, Next } from 'hono';

/**
 * Role gate for authenticated routes. Runs after `authMiddleware`, which
 * puts the decoded JWT user on the context; a route lists the roles it
 * accepts and anything else answers 403. Replaces the literal admin check
 * so law-firm and admin routes share one mechanism.
 */
export const requireRole =
  (...roles: string[]) =>
  async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json(
        { error: `Forbidden: ${roles.join(' or ')} access required` },
        403
      );
    }
    await next();
  };
