/**
 * Integration credentials that ops set in the admin instead of a deploy
 * secret. First (and so far only) key: the Lexware Office API key used for
 * invoicing.
 *
 * - Stored sealed (services/totp/secret-box.ts); the API never returns the
 *   key, only its last four characters.
 * - A key is checked against Lexware (GET /v1/profile) before it is saved,
 *   so a typo never replaces a working key.
 * - Resolution order for the invoicing provider: admin-stored key, then the
 *   LEXOFFICE_API_KEY env secret, then the no-op provider. Cached for 60 s
 *   per container; saving or removing clears this container's cache.
 * - Every change writes an audit row (never the key itself).
 */

import { eq } from 'drizzle-orm';
import { db } from '../utils/db';
import { logger, toErrorMeta } from '../utils/logger';
import { auditLogs, users } from '../drizzle/schema/shared';
import { integrationSettings } from '../drizzle/schema/integration-settings';
import { decryptSecret, encryptSecret } from './totp/secret-box';
import { invoicingConfig } from './invoicing/config';
import {
  LexofficeError,
  LexofficeInvoiceProvider,
  type LexofficeProfile,
} from './invoicing/lexoffice';

export const LEXOFFICE_KEY = 'lexoffice';

export type LexofficeKeySource = 'admin' | 'env' | 'none';

export interface LexofficeStatus {
  source: LexofficeKeySource;
  last4: string | null;
  companyName: string | null;
  updatedAt: string | null;
  updatedByEmail: string | null;
  baseUrl: string;
}

export interface Actor {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class IntegrationKeyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 422 | 502
  ) {
    super(message);
  }
}

const CACHE_MS = 60_000;
let cache: { at: number; key: string | null } | null = null;

/** Tests only. */
export function clearIntegrationCache(): void {
  cache = null;
}

const last4Of = (key: string) => key.slice(-4);

async function storedLexofficeKey(): Promise<string | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.key;
  let key: string | null = null;
  try {
    const [row] = await db
      .select({ secret: integrationSettings.secretEncrypted })
      .from(integrationSettings)
      .where(eq(integrationSettings.key, LEXOFFICE_KEY))
      .limit(1);
    key = row ? decryptSecret(row.secret).toString('utf8') : null;
  } catch (error) {
    // A row that no longer decrypts (encryption key rotated) must not stop
    // invoicing; fall through to the env secret and say so in the logs.
    logger.error(
      '[Integrations] stored Lexware key unreadable',
      toErrorMeta(error)
    );
    key = null;
  }
  cache = { at: Date.now(), key };
  return key;
}

/** The key the invoicing provider should use, and where it came from. */
export async function resolveLexofficeKey(): Promise<{
  key: string | null;
  source: LexofficeKeySource;
}> {
  const stored = await storedLexofficeKey();
  if (stored) return { key: stored, source: 'admin' };
  const env = invoicingConfig().lexofficeApiKey;
  return env ? { key: env, source: 'env' } : { key: null, source: 'none' };
}

function provider(apiKey: string): LexofficeInvoiceProvider {
  return new LexofficeInvoiceProvider({
    apiKey,
    baseUrl: invoicingConfig().lexofficeBaseUrl,
  });
}

/** Calls GET /v1/profile; maps Lexware's answer to an admin-facing error. */
async function checkKey(apiKey: string): Promise<LexofficeProfile> {
  try {
    return await provider(apiKey).profile();
  } catch (error) {
    if (
      error instanceof LexofficeError &&
      (error.status === 401 || error.status === 403)
    ) {
      throw new IntegrationKeyError('Lexware rejected this API key', 422);
    }
    logger.warn(
      '[Integrations] Lexware profile check failed',
      toErrorMeta(error)
    );
    throw new IntegrationKeyError(
      'Could not reach Lexware to check the key; nothing was changed',
      502
    );
  }
}

export class IntegrationSettingsService {
  static async lexofficeStatus(): Promise<LexofficeStatus> {
    const baseUrl = invoicingConfig().lexofficeBaseUrl;
    const [row] = await db
      .select({
        last4: integrationSettings.last4,
        details: integrationSettings.details,
        updatedAt: integrationSettings.updatedAt,
        updatedByEmail: users.email,
      })
      .from(integrationSettings)
      .leftJoin(users, eq(users.id, integrationSettings.updatedBy))
      .where(eq(integrationSettings.key, LEXOFFICE_KEY))
      .limit(1);
    if (row) {
      return {
        source: 'admin',
        last4: row.last4,
        companyName: (row.details?.companyName as string | undefined) ?? null,
        updatedAt: row.updatedAt.toISOString(),
        updatedByEmail: row.updatedByEmail ?? null,
        baseUrl,
      };
    }
    const env = invoicingConfig().lexofficeApiKey;
    return {
      source: env ? 'env' : 'none',
      last4: env ? last4Of(env) : null,
      companyName: null,
      updatedAt: null,
      updatedByEmail: null,
      baseUrl,
    };
  }

  /** Checks the key with Lexware, then stores it sealed. */
  static async setLexofficeKey(
    rawKey: string,
    actor: Actor
  ): Promise<LexofficeStatus> {
    const apiKey = rawKey.trim();
    if (apiKey.length < 20 || /\s/.test(apiKey)) {
      throw new IntegrationKeyError('That does not look like an API key', 400);
    }
    const profile = await checkKey(apiKey);
    const values = {
      secretEncrypted: encryptSecret(Buffer.from(apiKey, 'utf8')),
      last4: last4Of(apiKey),
      details: {
        companyName: profile.companyName,
        organizationId: profile.organizationId,
        subscriptionStatus: profile.subscriptionStatus,
        checkedAt: new Date().toISOString(),
      },
      updatedBy: actor.id,
      updatedAt: new Date(),
    };
    await db
      .insert(integrationSettings)
      .values({ key: LEXOFFICE_KEY, ...values })
      .onConflictDoUpdate({ target: integrationSettings.key, set: values });
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'integration_key_set',
      resource: 'integration',
      details: {
        integration: LEXOFFICE_KEY,
        last4: values.last4,
        companyName: profile.companyName,
      },
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    clearIntegrationCache();
    return this.lexofficeStatus();
  }

  /** Removes the admin-stored key; invoicing falls back to the env secret. */
  static async removeLexofficeKey(actor: Actor): Promise<LexofficeStatus> {
    const deleted = await db
      .delete(integrationSettings)
      .where(eq(integrationSettings.key, LEXOFFICE_KEY))
      .returning({ last4: integrationSettings.last4 });
    if (deleted.length > 0) {
      await db.insert(auditLogs).values({
        userId: actor.id,
        action: 'integration_key_removed',
        resource: 'integration',
        details: { integration: LEXOFFICE_KEY, last4: deleted[0].last4 },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      });
    }
    clearIntegrationCache();
    return this.lexofficeStatus();
  }

  /** Checks whichever key invoicing would use right now. */
  static async testLexoffice(): Promise<{
    source: LexofficeKeySource;
    ok: boolean;
    companyName: string | null;
    error: string | null;
  }> {
    clearIntegrationCache();
    const { key, source } = await resolveLexofficeKey();
    if (!key) {
      return {
        source,
        ok: false,
        companyName: null,
        error: 'No Lexware key configured; invoices stay pending',
      };
    }
    try {
      const profile = await checkKey(key);
      return {
        source,
        ok: true,
        companyName: profile.companyName,
        error: null,
      };
    } catch (error) {
      return {
        source,
        ok: false,
        companyName: null,
        error: error instanceof Error ? error.message : 'Check failed',
      };
    }
  }
}
