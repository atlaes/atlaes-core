import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';
import { getJwtSecret } from '../utils/env';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  FirmIpAllowlistService,
  TotpService,
  TwoFactorError,
  TWO_FACTOR_ROLES,
  issuePortalTokens,
  verifyChallengeToken,
  type TwoFactorSubject,
} from '../services/totp/service';
import { portalClientIp } from '../services/totp/portal-guard';

/**
 * Two-factor sign-in for the law-firm portal, mounted at /api/auth/2fa.
 *
 * Who is the subject:
 *  - law-firm members: `challengeToken` from POST /api/auth/magic-link/verify
 *    (law_firm users get a challenge there instead of tokens);
 *  - admins (or anyone already holding a token) stepping up for the
 *    portal: their Bearer access token.
 * Both paths end in tokens carrying the `mfa` claim the portal requires.
 */
const twoFactor = new Hono();

async function body(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

async function resolveSubject(
  c: Context,
  challengeToken: string | undefined
): Promise<TwoFactorSubject> {
  let subject: TwoFactorSubject | null = null;
  if (challengeToken) {
    subject = verifyChallengeToken(challengeToken);
  } else {
    const header = c.req.header('Authorization') ?? '';
    try {
      const p = verify(header.replace(/^Bearer\s+/i, ''), getJwtSecret()) as {
        userId?: string;
        type?: string;
      };
      if (p.userId && !p.type) subject = await TotpService.loadSubject(p.userId);
    } catch {
      subject = null;
    }
    if (!subject) {
      throw new TwoFactorError(
        'challenge_invalid',
        'Your sign-in has expired. Request a new sign-in link.',
        401
      );
    }
  }
  if (!(TWO_FACTOR_ROLES as readonly string[]).includes(subject.role)) {
    throw new TwoFactorError(
      'forbidden',
      'Two-factor sign-in is only available for portal accounts.',
      403
    );
  }
  // Role in the challenge is from sign-in time; re-read it so a removed
  // member cannot finish a pending sign-in.
  const fresh = await TotpService.loadSubject(subject.userId);
  if (!fresh || fresh.role !== subject.role) {
    throw new TwoFactorError(
      'challenge_invalid',
      'Your sign-in has expired. Request a new sign-in link.',
      401
    );
  }
  return fresh;
}

function fail(c: Context, error: unknown) {
  if (error instanceof TwoFactorError) {
    return c.json(
      { success: false, error: error.message, code: error.code, ...error.extra },
      error.status
    );
  }
  logger.error('2FA request failed', toErrorMeta(error));
  return c.json({ success: false, error: 'Two-factor request failed' }, 500);
}

function invalid(c: Context, issues: z.ZodIssue[]) {
  return c.json(
    {
      success: false,
      error: 'Validation failed',
      issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    },
    400
  );
}

const subjectSchema = z.object({ challengeToken: z.string().min(1).optional() });
const codeSchema = subjectSchema.extend({
  code: z.string().regex(/^\s*\d{3}\s?\d{3}\s*$/, 'Enter the 6-digit code'),
});
const verifySchema = subjectSchema
  .extend({
    code: z.string().regex(/^\s*\d{3}\s?\d{3}\s*$/).optional(),
    recoveryCode: z.string().min(8).max(32).optional(),
  })
  .refine((v) => !!v.code !== !!v.recoveryCode, {
    message: 'Send either code or recoveryCode',
  });

function sessionResponse(subject: TwoFactorSubject) {
  return {
    user: {
      id: subject.userId,
      email: subject.email,
      emailVerified: subject.emailVerified,
      role: subject.role,
    },
    tokens: issuePortalTokens(subject),
  };
}

// Is 2FA set up? (drives "enrol" vs "enter code")
twoFactor.post('/status', async (c) => {
  try {
    const parsed = subjectSchema.safeParse(await body(c));
    if (!parsed.success) return invalid(c, parsed.error.issues);
    const subject = await resolveSubject(c, parsed.data.challengeToken);
    return c.json({
      success: true,
      email: subject.email,
      enrolled: await TotpService.isEnrolled(subject.userId),
    });
  } catch (error) {
    return fail(c, error);
  }
});

// First-time set-up: new secret, QR (SVG) and manual key
twoFactor.post('/enrol/start', async (c) => {
  try {
    const parsed = subjectSchema.safeParse(await body(c));
    if (!parsed.success) return invalid(c, parsed.error.issues);
    const subject = await resolveSubject(c, parsed.data.challengeToken);
    const enrolment = await TotpService.startEnrolment(subject);
    return c.json({ success: true, ...enrolment });
  } catch (error) {
    return fail(c, error);
  }
});

// Confirm set-up with the first code → recovery codes (shown once) + session
twoFactor.post('/enrol/confirm', async (c) => {
  try {
    const parsed = codeSchema.safeParse(await body(c));
    if (!parsed.success) return invalid(c, parsed.error.issues);
    const subject = await resolveSubject(c, parsed.data.challengeToken);
    const { recoveryCodes } = await TotpService.confirmEnrolment(
      subject,
      parsed.data.code,
      portalClientIp(c)
    );
    return c.json({ success: true, recoveryCodes, ...sessionResponse(subject) });
  } catch (error) {
    return fail(c, error);
  }
});

// Sign-in: 6-digit code or a recovery code → session
twoFactor.post('/verify', async (c) => {
  try {
    const parsed = verifySchema.safeParse(await body(c));
    if (!parsed.success) return invalid(c, parsed.error.issues);
    const subject = await resolveSubject(c, parsed.data.challengeToken);
    const result = await TotpService.verify(
      subject,
      { code: parsed.data.code, recoveryCode: parsed.data.recoveryCode },
      portalClientIp(c)
    );
    return c.json({ success: true, ...result, ...sessionResponse(subject) });
  } catch (error) {
    return fail(c, error);
  }
});

// ---------------- admin ----------------

const admin = new Hono();
admin.use('*', authMiddleware, requireRole('admin'));

const uuid = z.string().uuid();

// Lost authenticator: remove it; the member enrols again at next sign-in
admin.delete('/users/:userId', async (c) => {
  try {
    const userId = uuid.safeParse(c.req.param('userId'));
    if (!userId.success) return invalid(c, userId.error.issues);
    const removed = await TotpService.reset(
      userId.data,
      c.get('user').id,
      portalClientIp(c)
    );
    return c.json({ success: true, removed });
  } catch (error) {
    return fail(c, error);
  }
});

admin.get('/firms/:firmId/ip-allowlist', async (c) => {
  try {
    const firmId = uuid.safeParse(c.req.param('firmId'));
    if (!firmId.success) return invalid(c, firmId.error.issues);
    const entries = await FirmIpAllowlistService.list(firmId.data);
    return c.json({ success: true, entries });
  } catch (error) {
    return fail(c, error);
  }
});

const allowlistSchema = z.object({
  entries: z
    .array(
      z.object({
        cidr: z.string().min(2).max(64),
        label: z.string().max(255).nullable().optional(),
      })
    )
    .max(50),
});

// Replace the list; [] switches the restriction off
admin.put('/firms/:firmId/ip-allowlist', async (c) => {
  try {
    const firmId = uuid.safeParse(c.req.param('firmId'));
    if (!firmId.success) return invalid(c, firmId.error.issues);
    const parsed = allowlistSchema.safeParse(await body(c));
    if (!parsed.success) return invalid(c, parsed.error.issues);
    const entries = await FirmIpAllowlistService.replace(
      firmId.data,
      parsed.data.entries,
      c.get('user').id,
      portalClientIp(c)
    );
    return c.json({ success: true, entries });
  } catch (error) {
    return fail(c, error);
  }
});

twoFactor.route('/admin', admin);

export default twoFactor;
