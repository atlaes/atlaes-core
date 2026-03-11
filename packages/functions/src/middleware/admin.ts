import { Context, Next } from 'hono';

export const adminMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: admin access required' }, 403);
  }
  await next();
};
