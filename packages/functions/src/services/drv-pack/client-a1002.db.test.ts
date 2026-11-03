/**
 * GET /api/claims/:id/forms/a1002 against PostgreSQL: the client's own
 * pre-filled A1002 for a DRV refund claim, language by residence.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import { db } from '../../utils/db';
import { claimsTable } from '../../drizzle/schema/claims';
import { users } from '../../drizzle/schema/shared';
import { AuthService } from '../../utils/auth';
import claims from '../../routes/claims';
import { clientA1002Data } from './client-a1002';

const tag = Math.random().toString(36).slice(2, 8);
const userIds: string[] = [];
let app: Hono;

async function newUser(): Promise<{ id: string; token: string }> {
  const email = `a1002-${tag}-${userIds.length}@example.com`;
  const [u] = await db
    .insert(users)
    .values({ email, emailVerified: true, authProvider: 'magic_link' })
    .returning();
  userIds.push(u.id);
  const { accessToken } = AuthService.generateTokens({
    userId: u.id,
    email,
    emailVerified: true,
  });
  return { id: u.id, token: accessToken };
}

async function newClaim(userId: string, data: Record<string, unknown>) {
  const [c] = await db
    .insert(claimsTable)
    .values({
      userId,
      status: 'draft',
      caseType: 'drv_refund',
      firstName: 'Ana',
      lastName: 'Souza',
      dateOfBirth: '1990-04-12',
      vsnr: '12 120490 S 001',
      currentAddressLine1: 'Rua das Flores 10',
      currentPostalCode: '01000-000',
      currentCity: 'São Paulo',
      currentCountry: 'Brazil',
      ...data,
    } as typeof claimsTable.$inferInsert)
    .returning();
  return c.id;
}

function get(claimId: string, token?: string) {
  return app.fetch(
    new Request(`http://localhost/api/claims/${claimId}/forms/a1002`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  );
}

beforeAll(() => {
  app = new Hono();
  app.route('/api/claims', claims);
});

afterAll(async () => {
  if (userIds.length) {
    await db.delete(claimsTable).where(inArray(claimsTable.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

describe('clientA1002Data', () => {
  const base = {
    firstName: 'Ana',
    lastName: 'Souza',
    dateOfBirth: '1990-04-12',
    birthName: null,
    placeOfBirth: null,
    vsnr: null,
    currentAddressLine1: 'Rua das Flores 10',
    currentAddressLine2: null,
    currentPostalCode: '01000-000',
    currentCity: 'São Paulo',
    currentCountry: 'Brazil',
  };

  it('picks the language by residence and writes the country in German', () => {
    expect(clientA1002Data(base).data).toMatchObject({
      language: 'pg',
      country: 'Brasilien',
      address: 'Rua das Flores 10, 01000-000 São Paulo',
      vsnr: '',
    });
    expect(
      clientA1002Data({ ...base, currentCountry: 'Chile' }).data?.language
    ).toBe('sp');
    expect(
      clientA1002Data({ ...base, currentCountry: 'India' }).data?.language
    ).toBe('en');
    expect(
      clientA1002Data({ ...base, currentCountry: null }).data?.language
    ).toBe('en');
  });

  it('needs name and date of birth', () => {
    expect(
      clientA1002Data({ ...base, firstName: ' ', dateOfBirth: null }).missing
    ).toEqual(['first name', 'date of birth']);
  });
});

describe('GET /api/claims/:id/forms/a1002', () => {
  it('returns the pre-filled form as a PDF download', async () => {
    const u = await newUser();
    const claimId = await newClaim(u.id, { currentCountry: 'India' });
    const res = await get(claimId, u.token);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain(
      'A1002-EN-certificate-of-life.pdf'
    );
    const doc = await PDFDocument.load(new Uint8Array(await res.arrayBuffer()));
    expect(doc.getPageCount()).toBeGreaterThan(0);
    const [row] = await db
      .select({ at: claimsTable.identityFormDownloadedAt })
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(row.at).toBeInstanceOf(Date);
  });

  it.each([
    ['Brazil', 'PG'],
    ['Argentina', 'SP'],
  ])('residence %s gets the %s form', async (country, lang) => {
    const u = await newUser();
    const claimId = await newClaim(u.id, { currentCountry: country });
    const res = await get(claimId, u.token);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toContain(`A1002-${lang}-`);
  });

  it('requires sign-in', async () => {
    const u = await newUser();
    const claimId = await newClaim(u.id, {});
    expect((await get(claimId)).status).toBe(401);
  });

  it("does not serve another user's claim", async () => {
    const owner = await newUser();
    const other = await newUser();
    const claimId = await newClaim(owner.id, {});
    expect((await get(claimId, other.token)).status).toBe(404);
  });

  it('is only for DRV refund claims', async () => {
    const u = await newUser();
    const claimId = await newClaim(u.id, { caseType: 'vbl_refund' });
    expect((await get(claimId, u.token)).status).toBe(409);
  });

  it('asks for the personal details when they are missing', async () => {
    const u = await newUser();
    const claimId = await newClaim(u.id, { dateOfBirth: null });
    const res = await get(claimId, u.token);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('date of birth');
  });
});
