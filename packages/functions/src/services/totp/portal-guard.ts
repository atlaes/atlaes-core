import type { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import { getJwtSecret } from '../../utils/env';
import { db } from '../../utils/db';
import { auditLogs } from '../../drizzle/schema/shared';
import { logger, toErrorMeta } from '../../utils/logger';
import { FirmIpAllowlistService, isMfaFresh } from './service';
import { ipAllowed, trustedClientIp } from './ip-allowlist';

export function portalClientIp(c: Context): string | null {
  return trustedClientIp(
    c.req.header('x-forwarded-for'),
    c.req.header('x-real-ip')
  );
}

/**
 * Law-firm portal gate, mounted after authMiddleware/requireRole/firmScope
 * in routes/law-firm.ts:
 *  1. the access token must carry a fresh `mfa` claim (set only by
 *     /api/auth/2fa after a TOTP or recovery code) — tokens from any other
 *     sign-in path (password, Google, Apple, plain magic link) are refused;
 *  2. when the firm has an IP allowlist, a law_firm user's address must be
 *     on it. Admins checking the portal are exempt (they are not in the
 *     firm's office).
 * Answers 403 with `code` so the app can route to the 2FA screen.
 */
export const requirePortalSecurity = async (c: Context, next: Next) => {
  const header = c.req.header('Authorization') ?? '';
  let payload: unknown = null;
  try {
    payload = verify(header.replace(/^Bearer\s+/i, ''), getJwtSecret());
  } catch {
    payload = null;
  }
  if (!isMfaFresh(payload)) {
    return c.json(
      {
        success: false,
        error: 'Two-factor sign-in required',
        code: 'two_factor_required',
      },
      403
    );
  }

  const user = c.get('user');
  const firmCtx = (c as unknown as { get(k: string): unknown }).get('firm') as
    | { firm: { id: string } }
    | undefined;
  if (user?.role === 'law_firm' && firmCtx) {
    try {
      const cidrs = await FirmIpAllowlistService.cidrs(firmCtx.firm.id);
      const ip = portalClientIp(c);
      if (!ipAllowed(ip, cidrs)) {
        await db
          .insert(auditLogs)
          .values({
            userId: user.id,
            action: 'law_firm_ip_blocked',
            resource: 'law_firm',
            resourceId: firmCtx.firm.id,
            details: { ip, path: c.req.path },
            ipAddress: ip?.slice(0, 45) ?? null,
          })
          .catch(() => {});
        return c.json(
          {
            success: false,
            error: 'Access from this network is not allowed for your firm',
            code: 'ip_not_allowed',
          },
          403
        );
      }
    } catch (error) {
      // Fail closed: an allowlist we cannot read is not "no allowlist".
      logger.error('IP allowlist check failed', toErrorMeta(error));
      return c.json({ success: false, error: 'Access check failed' }, 503);
    }
  }
  await next();
};
