import jwt from 'jsonwebtoken';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../../utils/db';
import { getJwtSecret } from '../../utils/env';
import { AuthService, type AuthTokens } from '../../utils/auth';
import { auditLogs, users } from '../../drizzle/schema/shared';
import {
  lawFirmIpAllowlist,
  userTotp,
  type StoredRecoveryCode,
} from '../../drizzle/schema/two-factor';
import {
  formatManualKey,
  generateTotpSecret,
  otpauthUri,
  verifyTotp,
} from './totp';
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  recoveryCodeMatches,
} from './secret-box';
import { qrSvg } from './qr';
import { isValidCidr } from './ip-allowlist';

/** Name shown in the authenticator app (Figma 01: "Vividius Law-firm portal"). */
export const TOTP_ISSUER =
  process.env.PORTAL_TOTP_ISSUER || 'Vividius Law-firm portal';

/** Roles that must pass TOTP before a portal session is issued. */
export const TWO_FACTOR_ROLES = ['law_firm', 'admin'] as const;

/** Sign-in challenge lifetime (between magic link and code). */
export const CHALLENGE_TTL_SECONDS = 5 * 60;

/** A portal session is good for this long after the code was entered. */
export const PORTAL_MFA_MAX_AGE_SECONDS =
  Number(process.env.PORTAL_MFA_MAX_AGE_HOURS ?? 12) * 3600;

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;

export class TwoFactorError extends Error {
  constructor(
    public code:
      | 'challenge_invalid'
      | 'not_enrolled'
      | 'already_enrolled'
      | 'invalid_code'
      | 'locked'
      | 'forbidden',
    message: string,
    public status: 400 | 401 | 403 | 409 | 423 = 400,
    public extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export interface TwoFactorSubject {
  userId: string;
  email: string;
  emailVerified: boolean;
  role: string;
}

// ---------------- challenge tokens ----------------

interface ChallengePayload extends TwoFactorSubject {
  type: '2fa_challenge';
}

export function createChallengeToken(subject: TwoFactorSubject): {
  challengeToken: string;
  challengeExpiresAt: string;
} {
  const payload: ChallengePayload = { ...subject, type: '2fa_challenge' };
  const challengeToken = jwt.sign(payload, getJwtSecret(), {
    expiresIn: CHALLENGE_TTL_SECONDS,
  });
  return {
    challengeToken,
    challengeExpiresAt: new Date(
      Date.now() + CHALLENGE_TTL_SECONDS * 1000
    ).toISOString(),
  };
}

export function verifyChallengeToken(token: string): TwoFactorSubject {
  try {
    const p = jwt.verify(token, getJwtSecret()) as Partial<ChallengePayload>;
    if (p.type !== '2fa_challenge' || !p.userId || !p.email || !p.role) {
      throw new Error('wrong type');
    }
    return {
      userId: p.userId,
      email: p.email,
      emailVerified: !!p.emailVerified,
      role: p.role,
    };
  } catch {
    throw new TwoFactorError(
      'challenge_invalid',
      'Your sign-in has expired. Request a new sign-in link.',
      401
    );
  }
}

/** Seconds-since-epoch the access token's second factor was completed. */
export function mfaTimestamp(payload: unknown): number | null {
  const mfa = (payload as { mfa?: unknown } | null)?.mfa;
  return typeof mfa === 'number' && Number.isFinite(mfa) ? mfa : null;
}

export function isMfaFresh(payload: unknown, now = Date.now() / 1000): boolean {
  const at = mfaTimestamp(payload);
  return at !== null && at <= now + 60 && now - at <= PORTAL_MFA_MAX_AGE_SECONDS;
}

export function issuePortalTokens(subject: TwoFactorSubject): AuthTokens {
  return AuthService.generateTokens({
    userId: subject.userId,
    email: subject.email,
    emailVerified: subject.emailVerified,
    role: subject.role,
    mfa: Math.floor(Date.now() / 1000),
  });
}

// ---------------- persistence ----------------

async function audit(
  userId: string,
  action: string,
  ip: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  await db.insert(auditLogs).values({
    userId,
    action,
    resource: 'user_totp',
    resourceId: userId,
    details: { ...details, ip },
    ipAddress: ip?.slice(0, 45) ?? null,
  });
}

async function getRow(userId: string) {
  const [row] = await db
    .select()
    .from(userTotp)
    .where(eq(userTotp.userId, userId))
    .limit(1);
  return row ?? null;
}

function assertNotLocked(row: { lockedUntil: Date | null }): void {
  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    throw new TwoFactorError(
      'locked',
      'Too many incorrect codes. Try again later.',
      423,
      { lockedUntil: row.lockedUntil.toISOString() }
    );
  }
}

async function registerFailure(
  userId: string,
  failedAttempts: number,
  ip: string | null
): Promise<never> {
  const attempts = failedAttempts + 1;
  const lock = attempts >= MAX_FAILED_ATTEMPTS;
  await db
    .update(userTotp)
    .set({
      failedAttempts: lock ? 0 : attempts,
      lockedUntil: lock ? new Date(Date.now() + LOCK_SECONDS * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(userTotp.userId, userId));
  await audit(userId, 'two_factor_failed', ip, { attempts, locked: lock });
  if (lock) {
    throw new TwoFactorError(
      'locked',
      'Too many incorrect codes. Try again later.',
      423
    );
  }
  throw new TwoFactorError(
    'invalid_code',
    'That code is not valid. Check your authenticator app and try again.',
    400,
    { attemptsLeft: MAX_FAILED_ATTEMPTS - attempts }
  );
}

export class TotpService {
  static async isEnrolled(userId: string): Promise<boolean> {
    const row = await getRow(userId);
    return !!row?.enabled;
  }

  /**
   * Creates (or replaces an unconfirmed) secret. Refused once 2FA is on:
   * re-enrolment needs an admin reset, so a stolen sign-in link alone
   * cannot swap the authenticator.
   */
  static async startEnrolment(subject: TwoFactorSubject): Promise<{
    otpauthUri: string;
    manualKey: string;
    qrSvg: string;
    issuer: string;
  }> {
    const existing = await getRow(subject.userId);
    if (existing?.enabled) {
      throw new TwoFactorError(
        'already_enrolled',
        'Two-factor sign-in is already set up for this account.',
        409
      );
    }
    const secret = generateTotpSecret();
    const sealed = encryptSecret(secret);
    await db
      .insert(userTotp)
      .values({ userId: subject.userId, secretEncrypted: sealed })
      .onConflictDoUpdate({
        target: userTotp.userId,
        set: {
          secretEncrypted: sealed,
          enabled: false,
          enabledAt: null,
          lastUsedStep: null,
          recoveryCodes: [],
          updatedAt: new Date(),
        },
      });
    const uri = otpauthUri({
      issuer: TOTP_ISSUER,
      account: subject.email,
      secret,
    });
    return {
      otpauthUri: uri,
      manualKey: formatManualKey(secret),
      qrSvg: qrSvg(uri),
      issuer: TOTP_ISSUER,
    };
  }

  /** First code from the new authenticator; returns recovery codes once. */
  static async confirmEnrolment(
    subject: TwoFactorSubject,
    code: string,
    ip: string | null
  ): Promise<{ recoveryCodes: string[] }> {
    const row = await getRow(subject.userId);
    if (!row) {
      throw new TwoFactorError(
        'not_enrolled',
        'Start the set-up again to get a new key.',
        400
      );
    }
    if (row.enabled) {
      throw new TwoFactorError(
        'already_enrolled',
        'Two-factor sign-in is already set up for this account.',
        409
      );
    }
    assertNotLocked(row);
    const step = verifyTotp(decryptSecret(row.secretEncrypted), code);
    if (step === null) {
      return registerFailure(subject.userId, row.failedAttempts, ip);
    }
    const recoveryCodes = generateRecoveryCodes();
    const stored: StoredRecoveryCode[] = recoveryCodes.map((c) => ({
      hash: hashRecoveryCode(c),
      usedAt: null,
    }));
    const updated = await db
      .update(userTotp)
      .set({
        enabled: true,
        enabledAt: new Date(),
        lastUsedStep: step,
        failedAttempts: 0,
        lockedUntil: null,
        recoveryCodes: stored,
        updatedAt: new Date(),
      })
      .where(and(eq(userTotp.userId, subject.userId), eq(userTotp.enabled, false)))
      .returning({ userId: userTotp.userId });
    if (updated.length === 0) {
      throw new TwoFactorError(
        'already_enrolled',
        'Two-factor sign-in is already set up for this account.',
        409
      );
    }
    await audit(subject.userId, 'two_factor_enrolled', ip);
    return { recoveryCodes };
  }

  /** Second factor at sign-in: a 6-digit code or one recovery code. */
  static async verify(
    subject: TwoFactorSubject,
    input: { code?: string; recoveryCode?: string },
    ip: string | null
  ): Promise<{ method: 'totp' | 'recovery'; recoveryCodesLeft: number }> {
    const row = await getRow(subject.userId);
    if (!row?.enabled) {
      throw new TwoFactorError(
        'not_enrolled',
        'Two-factor sign-in is not set up for this account yet.',
        400
      );
    }
    assertNotLocked(row);
    const unused = row.recoveryCodes.filter((r) => !r.usedAt);

    if (input.recoveryCode) {
      const match = unused.find((r) =>
        recoveryCodeMatches(input.recoveryCode!, r.hash)
      );
      if (!match) return registerFailure(subject.userId, row.failedAttempts, ip);
      const usedAt = new Date().toISOString();
      const next = row.recoveryCodes.map((r) =>
        r.hash === match.hash ? { ...r, usedAt } : r
      );
      // Guarded on the previous array so two parallel uses of one code
      // cannot both succeed.
      const updated = await db
        .update(userTotp)
        .set({
          recoveryCodes: next,
          failedAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userTotp.userId, subject.userId),
            sql`${userTotp.recoveryCodes} = ${JSON.stringify(row.recoveryCodes)}::jsonb`
          )
        )
        .returning({ userId: userTotp.userId });
      if (updated.length === 0) {
        return registerFailure(subject.userId, row.failedAttempts, ip);
      }
      await audit(subject.userId, 'two_factor_recovery_used', ip, {
        recoveryCodesLeft: unused.length - 1,
      });
      return { method: 'recovery', recoveryCodesLeft: unused.length - 1 };
    }

    const step = verifyTotp(
      decryptSecret(row.secretEncrypted),
      input.code ?? '',
      { lastUsedStep: row.lastUsedStep }
    );
    if (step === null) {
      return registerFailure(subject.userId, row.failedAttempts, ip);
    }
    // Compare-and-set on last_used_step: a code is accepted once, even
    // when two requests race with it.
    const updated = await db
      .update(userTotp)
      .set({
        lastUsedStep: step,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userTotp.userId, subject.userId),
          or(isNull(userTotp.lastUsedStep), lt(userTotp.lastUsedStep, step))
        )
      )
      .returning({ userId: userTotp.userId });
    if (updated.length === 0) {
      return registerFailure(subject.userId, row.failedAttempts, ip);
    }
    await audit(subject.userId, 'two_factor_verified', ip);
    return { method: 'totp', recoveryCodesLeft: unused.length };
  }

  /** Admin: remove a member's authenticator (lost phone). */
  static async reset(
    userId: string,
    adminId: string,
    ip: string | null
  ): Promise<boolean> {
    const deleted = await db
      .delete(userTotp)
      .where(eq(userTotp.userId, userId))
      .returning({ userId: userTotp.userId });
    await audit(userId, 'two_factor_reset', ip, { by: adminId });
    return deleted.length > 0;
  }

  static async loadSubject(userId: string): Promise<TwoFactorSubject | null> {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);
    if (!u) return null;
    return {
      userId: u.id,
      email: u.email,
      emailVerified: !!u.emailVerified,
      role: u.role || 'user',
    };
  }
}

// ---------------- IP allowlist ----------------

const allowlistCache = new Map<string, { at: number; cidrs: string[] }>();
const ALLOWLIST_CACHE_MS = 60_000;

export class FirmIpAllowlistService {
  static async cidrs(firmId: string): Promise<string[]> {
    const hit = allowlistCache.get(firmId);
    if (hit && Date.now() - hit.at < ALLOWLIST_CACHE_MS) return hit.cidrs;
    const rows = await db
      .select({ cidr: lawFirmIpAllowlist.cidr })
      .from(lawFirmIpAllowlist)
      .where(eq(lawFirmIpAllowlist.lawFirmId, firmId));
    const cidrs = rows.map((r: { cidr: string }) => r.cidr);
    allowlistCache.set(firmId, { at: Date.now(), cidrs });
    return cidrs;
  }

  static async list(firmId: string) {
    return db
      .select()
      .from(lawFirmIpAllowlist)
      .where(eq(lawFirmIpAllowlist.lawFirmId, firmId))
      .orderBy(lawFirmIpAllowlist.createdAt);
  }

  /** Replaces the firm's list. An empty list switches the check off. */
  static async replace(
    firmId: string,
    entries: { cidr: string; label?: string | null }[],
    adminId: string,
    ip: string | null
  ) {
    const invalid = entries.filter((e) => !isValidCidr(e.cidr));
    if (invalid.length > 0) {
      throw new TwoFactorError(
        'forbidden',
        `Invalid IP or CIDR: ${invalid.map((e) => e.cidr).join(', ')}`,
        400
      );
    }
    await db.transaction(async (tx: any) => {
      await tx
        .delete(lawFirmIpAllowlist)
        .where(eq(lawFirmIpAllowlist.lawFirmId, firmId));
      const unique = [...new Map(entries.map((e) => [e.cidr.trim(), e])).values()];
      if (unique.length > 0) {
        await tx.insert(lawFirmIpAllowlist).values(
          unique.map((e) => ({
            lawFirmId: firmId,
            cidr: e.cidr.trim(),
            label: e.label ?? null,
            createdBy: adminId,
          }))
        );
      }
      await tx.insert(auditLogs).values({
        userId: adminId,
        action: 'law_firm_ip_allowlist_updated',
        resource: 'law_firm',
        resourceId: firmId,
        details: { cidrs: unique.map((e) => e.cidr.trim()), ip },
        ipAddress: ip?.slice(0, 45) ?? null,
      });
    });
    allowlistCache.delete(firmId);
    return this.list(firmId);
  }
}
