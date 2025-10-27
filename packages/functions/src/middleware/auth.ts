import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthContext {
  user: AuthUser;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    // Verify JWT token
    const decoded = verify(token, env.JWT_SECRET) as any;

    if (!decoded || !decoded.userId || !decoded.email) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Set user context
    c.set('user', {
      id: decoded.userId,
      email: decoded.email,
      emailVerified: decoded.emailVerified || false,
    });

    await next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);

    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return c.json({ error: 'Token expired' }, 401);
      }
      if (error.name === 'JsonWebTokenError') {
        return c.json({ error: 'Invalid token' }, 401);
      }
    }

    return c.json({ error: 'Authentication failed' }, 401);
  }
};

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        const decoded = verify(token, env.JWT_SECRET) as any;

        if (decoded && decoded.userId && decoded.email) {
          c.set('user', {
            id: decoded.userId,
            email: decoded.email,
            emailVerified: decoded.emailVerified || false,
          });
        }
      }
    }

    await next();
  } catch (error: any) {
    // For optional auth, we don't fail on token errors
    logger.warn('Optional auth middleware error:', error);
    await next();
  }
};
