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
  };
}

export class BavProviderService {
  static async list(): Promise<BavProvider[]> {
    const rows = await db
      .select()
      .from(bavProviders)
      .orderBy(sql`lower(${bavProviders.name})`);
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

  /** Case-insensitive lookup by provider name (whitespace-normalised). */
  static async findByName(
    name: string | null | undefined
  ): Promise<BavProvider | null> {
    if (blank(name)) return null;
    const [row] = await db
      .select()
      .from(bavProviders)
      .where(
        sql`lower(regexp_replace(${bavProviders.name}, '\\s+', ' ', 'g')) = ${normalizeProviderName(name as string)}`
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  static async create(input: BavProviderInput): Promise<BavProvider> {
    if (blank(input.name))
      throw new Error('Invalid provider: name is required');
    const existing = await this.findByName(input.name);
    if (existing) {
      throw new Error('Invalid provider: a provider with this name exists');
    }
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
    const clash = await this.findByName(input.name);
    if (clash && clash.id !== id) {
      throw new Error('Invalid provider: a provider with this name exists');
    }
    const [row] = await db
      .update(bavProviders)
      .set({ ...toColumns(input), updatedAt: new Date() })
      .where(eq(bavProviders.id, id))
      .returning();
    return row ? mapRow(row) : null;
  }

  static async remove(id: string): Promise<boolean> {
    const rows = await db
      .delete(bavProviders)
      .where(eq(bavProviders.id, id))
      .returning({ id: bavProviders.id });
    return rows.length > 0;
  }
}
