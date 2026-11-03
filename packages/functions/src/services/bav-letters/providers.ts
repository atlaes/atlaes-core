/**
 * bAV provider matrix (client answer item 7): CRUD for ops and the
 * case-insensitive lookup used at claim submission. The pure address rule
 * lives in provider-matrix.ts.
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../utils/db';
import { bavProviders } from '../../drizzle/schema/claims';
import {
  normalizeProviderName,
  type BavProvider,
  type BavProviderInput,
} from './provider-matrix';

export {
  normalizeProviderName,
  providerAddressPatch,
  providerMatches,
  type BavProvider,
  type BavProviderInput,
  type ClaimRecipientFields,
  type RecipientPatch,
} from './provider-matrix';

const blank = (v: string | null | undefined): boolean =>
  typeof v !== 'string' || v.trim() === '';

function mapRow(row: typeof bavProviders.$inferSelect): BavProvider {
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    defaultAddresseeType: (row.defaultAddresseeType ?? null) as
      | 'employer'
      | 'provider'
      | null,
    department: row.department,
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    requiresBankAddress: row.requiresBankAddress,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toColumns(input: BavProviderInput) {
  const s = (v: string | null | undefined) =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
  return {
    name: input.name.trim().replace(/\s+/g, ' '),
    defaultAddresseeType: input.defaultAddresseeType ?? null,
    department: s(input.department),
    street: s(input.street),
    postalCode: s(input.postalCode),
    city: s(input.city),
    country: s(input.country),
    requiresBankAddress: input.requiresBankAddress ?? false,
    notes: s(input.notes),
    // Left untouched when the caller does not send it (the claim's
    // "save to provider matrix" path knows nothing of short names).
    ...(input.shortName !== undefined
      ? { shortName: s(input.shortName)?.replace(/\s+/g, ' ') ?? null }
      : {}),
  };
}

export class BavProviderService {
  static async list(): Promise<BavProvider[]> {
    const rows = await db
      .select()
      .from(bavProviders)
      .orderBy(
        sql`lower(coalesce(${bavProviders.shortName}, ${bavProviders.name}))`
      );
    return rows.map(mapRow);
  }

  static async get(id: string): Promise<BavProvider | null> {
    const [row] = await db
      .select()
      .from(bavProviders)
      .where(eq(bavProviders.id, id))
      .limit(1);
    return row ? mapRow(row) : null;
  }

  /**
   * Case-insensitive lookup by provider name (whitespace-normalised); a
   * full-name match wins over a short-label match ("VBL").
   */
  static async findByName(
    name: string | null | undefined
  ): Promise<BavProvider | null> {
    if (blank(name)) return null;
    const wanted = normalizeProviderName(name as string);
    const [row] = await db
      .select()
      .from(bavProviders)
      .where(
        sql`lower(regexp_replace(${bavProviders.name}, '\\s+', ' ', 'g')) = ${wanted}
          or lower(regexp_replace(coalesce(${bavProviders.shortName}, ''), '\\s+', ' ', 'g')) = ${wanted}`
      )
      .orderBy(
        sql`case when lower(regexp_replace(${bavProviders.name}, '\\s+', ' ', 'g')) = ${wanted} then 0 else 1 end`
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  /** Lookup by short label only (dropdown uniqueness check). */
  static async findByShortName(
    shortName: string | null | undefined
  ): Promise<BavProvider | null> {
    if (blank(shortName)) return null;
    const [row] = await db
      .select()
      .from(bavProviders)
      .where(
        sql`lower(regexp_replace(coalesce(${bavProviders.shortName}, ''), '\\s+', ' ', 'g')) = ${normalizeProviderName(shortName as string)}`
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  static async create(input: BavProviderInput): Promise<BavProvider> {
    if (blank(input.name))
      throw new Error('Invalid provider: name is required');
    await this.assertUnique(input, null);
    const [row] = await db
      .insert(bavProviders)
      .values(toColumns(input))
      .returning();
    return mapRow(row);
  }

  static async update(
    id: string,
    input: BavProviderInput
  ): Promise<BavProvider | null> {
    if (blank(input.name))
      throw new Error('Invalid provider: name is required');
    await this.assertUnique(input, id);
    const [row] = await db
      .update(bavProviders)
      .set({ ...toColumns(input), updatedAt: new Date() })
      .where(eq(bavProviders.id, id))
      .returning();
    return row ? mapRow(row) : null;
  }

  private static async assertUnique(
    input: BavProviderInput,
    id: string | null
  ): Promise<void> {
    const clash = await this.findByName(input.name);
    if (clash && clash.id !== id) {
      throw new Error('Invalid provider: a provider with this name exists');
    }
    if (!blank(input.shortName)) {
      const labelClash =
        (await this.findByShortName(input.shortName)) ??
        (await this.findByName(input.shortName));
      if (labelClash && labelClash.id !== id) {
        throw new Error(
          'Invalid provider: another provider uses this short name'
        );
      }
    }
  }

  static async remove(id: string): Promise<boolean> {
    const rows = await db
      .delete(bavProviders)
      .where(eq(bavProviders.id, id))
      .returning({ id: bavProviders.id });
    return rows.length > 0;
  }
}
