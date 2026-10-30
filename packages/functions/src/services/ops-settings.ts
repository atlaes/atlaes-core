/**
 * Plain configuration ops edit in the admin (Settings), stored in
 * shared.ops_settings (migration 0031).
 *
 * - "postal_agent": the postal authority named in direct-route cover
 *   letters and the Postempfangsvollmacht (owner spec 29 Oct 2026). Until
 *   ops save one, the owner's address is used: Anna Kliem, Kaskelstr. 46,
 *   10317 Berlin.
 * - "direct_dispatch_operator": who posts direct-route packs; prefilled
 *   as the sender when admin records the dispatch.
 *
 * Cached 30 s per container and cleared on change. Every change writes an
 * audit row.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../utils/db';
import { logger, toErrorMeta } from '../utils/logger';
import { auditLogs, users } from '../drizzle/schema/shared';
import { opsSettings } from '../drizzle/schema/ops-settings';

const line = (max: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ' '))
    .pipe(z.string().max(max));

export const postalAgentSchema = z.object({
  /** Salutation before the name in the direct DRV cover letter
   *  ("Frau Anna Kliem"); empty for none. Rows saved before this field
   *  existed read as "Frau". */
  salutation: z.enum(['Frau', 'Herr', '']).default('Frau'),
  name: line(120).pipe(z.string().min(1, 'Enter the name')),
  /** Optional c/o or company line, printed under the name. */
  coLine: line(120).optional().nullable(),
  street: line(120).pipe(z.string().min(1, 'Enter the street')),
  postalCode: line(12).pipe(z.string().min(4, 'Enter the postal code')),
  city: line(80).pipe(z.string().min(1, 'Enter the city')),
});
export type PostalAgent = z.output<typeof postalAgentSchema>;

export const dispatchOperatorSchema = z.object({
  name: line(200).pipe(z.string().min(1, 'Enter who sends the packs')),
});
export type DispatchOperator = z.infer<typeof dispatchOperatorSchema>;

export const DEFAULT_POSTAL_AGENT: PostalAgent = {
  salutation: 'Frau',
  name: 'Anna Kliem',
  coLine: null,
  street: 'Kaskelstr. 46',
  postalCode: '10317',
  city: 'Berlin',
};

const SETTINGS = {
  postal_agent: {
    label: 'Postal authority (direct route)',
    schema: postalAgentSchema,
    fallback: DEFAULT_POSTAL_AGENT as unknown,
  },
  direct_dispatch_operator: {
    label: 'Direct-route dispatch operator',
    schema: dispatchOperatorSchema,
    fallback: null as unknown,
  },
} as const;

export type OpsSettingKey = keyof typeof SETTINGS;
export const OPS_SETTING_KEYS = Object.keys(SETTINGS) as OpsSettingKey[];

export interface OpsSettingView {
  key: OpsSettingKey;
  label: string;
  value: unknown;
  source: 'admin' | 'default';
  updatedAt: string | null;
  updatedByEmail: string | null;
}

export interface Actor {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const CACHE_MS = 30_000;
let cache: { at: number; rows: Map<string, OpsSettingView> } | null = null;

/** Tests only (and after every change). */
export function clearOpsSettingsCache(): void {
  cache = null;
}

async function load(): Promise<Map<string, OpsSettingView>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await db
    .select({
      key: opsSettings.key,
      value: opsSettings.value,
      updatedAt: opsSettings.updatedAt,
      updatedByEmail: users.email,
    })
    .from(opsSettings)
    .leftJoin(users, eq(users.id, opsSettings.updatedBy));
  const map = new Map<string, OpsSettingView>();
  for (const r of rows) {
    if (!(r.key in SETTINGS)) continue;
    const key = r.key as OpsSettingKey;
    const parsed = SETTINGS[key].schema.safeParse(r.value);
    if (!parsed.success) continue;
    map.set(key, {
      key,
      label: SETTINGS[key].label,
      value: parsed.data,
      source: 'admin',
      updatedAt: r.updatedAt.toISOString(),
      updatedByEmail: r.updatedByEmail ?? null,
    });
  }
  cache = { at: Date.now(), rows: map };
  return map;
}

function view(key: OpsSettingKey, rows: Map<string, OpsSettingView>) {
  return (
    rows.get(key) ?? {
      key,
      label: SETTINGS[key].label,
      value: SETTINGS[key].fallback,
      source: 'default' as const,
      updatedAt: null,
      updatedByEmail: null,
    }
  );
}

/** Multiline postal block: name, optional c/o line, street, "PLZ City". */
export function postalAgentLines(agent: PostalAgent): string[] {
  return [
    agent.name,
    ...(agent.coLine ? [agent.coLine] : []),
    agent.street,
    `${agent.postalCode} ${agent.city}`,
  ];
}

export class OpsSettingsError extends Error {
  constructor(
    message: string,
    readonly issues: { path: string; message: string }[] = []
  ) {
    super(message);
  }
}

export class OpsSettingsService {
  static async list(): Promise<OpsSettingView[]> {
    const rows = await load();
    return OPS_SETTING_KEYS.map((key) => view(key, rows));
  }

  static async postalAgent(): Promise<PostalAgent> {
    try {
      return view('postal_agent', await load()).value as PostalAgent;
    } catch (error) {
      logger.error('[OpsSettings] load failed', toErrorMeta(error));
      return DEFAULT_POSTAL_AGENT;
    }
  }

  static async dispatchOperator(): Promise<DispatchOperator | null> {
    try {
      return view('direct_dispatch_operator', await load())
        .value as DispatchOperator | null;
    } catch (error) {
      logger.error('[OpsSettings] load failed', toErrorMeta(error));
      return null;
    }
  }

  static async set(
    key: OpsSettingKey,
    input: unknown,
    actor: Actor
  ): Promise<OpsSettingView> {
    const parsed = SETTINGS[key].schema.safeParse(input);
    if (!parsed.success) {
      throw new OpsSettingsError(
        parsed.error.issues[0]?.message ?? 'Invalid value',
        parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }))
      );
    }
    const now = new Date();
    const [before] = await db
      .select({ value: opsSettings.value })
      .from(opsSettings)
      .where(eq(opsSettings.key, key));
    await db
      .insert(opsSettings)
      .values({ key, value: parsed.data, updatedBy: actor.id, updatedAt: now })
      .onConflictDoUpdate({
        target: opsSettings.key,
        set: { value: parsed.data, updatedBy: actor.id, updatedAt: now },
      });
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'ops_setting_updated',
      resource: 'ops_setting',
      details: { key, before: before?.value ?? null, after: parsed.data },
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    clearOpsSettingsCache();
    return view(key, await load());
  }
}
