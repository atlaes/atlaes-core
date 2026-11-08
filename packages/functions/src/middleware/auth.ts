import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { getJwtSecret } from '../utils/env';
import { logger } from '../utils/logger';
import { db } from '../utils/db';
import { users } from '../drizzle/schema/shared';

/**
 * A session issued before the e-mail address was proven (password
 * registration) stays valid only while the account is still unverified.
 * Once the owner proves the address (magic link, Google, verification
 * link) those sessions end: otherwise someone who registered a victim's
 * address first keeps access to the victim's account and claim data.
 */
export async function unverifiedSessionStillValid(
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return !!row && !row.emailVerified;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
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
    const decoded = verify(token, getJwtSecret()) as any;

    // Session tokens carry no `type`; the 2FA challenge and the e-mail
    // link tokens do and are not sessions.
    if (
      !decoded ||
      !decoded.userId ||
      !decoded.email ||
      decoded.type ||
      isLegacyRefreshToken(decoded)
    ) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    if (
      decoded.emailVerified !== true &&
      !(await unverifiedSessionStillValid(decoded.userId))
    ) {
      return c.json(
        { error: 'Your session has ended. Please sign in again.' },
        401
      );
    }

    // Set user context
    c.set('user', {
      id: decoded.userId,
      email: decoded.email,
      emailVerified: decoded.emailVerified || false,
      role: decoded.role || 'user',
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

/**
 * Refresh tokens from before the access/refresh split carry no `type` but
 * live 7 days; access tokens live 15 minutes. Without this check such a
 * token would pass as a session for up to 7 days after the deploy, beyond
 * the reach of logout. Harmless once those tokens have expired.
 */
function isLegacyRefreshToken(decoded: { iat?: number; exp?: number }) {
  return (
    typeof decoded.iat === 'number' &&
    typeof decoded.exp === 'number' &&
    decoded.exp - decoded.iat > 2 * 60 * 60
  );
}

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        const decoded = verify(token, getJwtSecret()) as any;

        if (
          decoded &&
          decoded.userId &&
          decoded.email &&
          !decoded.type &&
          !isLegacyRefreshToken(decoded) &&
          (decoded.emailVerified === true ||
            (await unverifiedSessionStillValid(decoded.userId)))
        ) {
          c.set('user', {
            id: decoded.userId,
            email: decoded.email,
            emailVerified: decoded.emailVerified || false,
            role: decoded.role || 'user',
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
