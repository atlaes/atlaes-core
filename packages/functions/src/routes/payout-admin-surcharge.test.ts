import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../utils/db';
import { auditLogs, users } from '../drizzle/schema/shared';
import { claimsTable } from '../drizzle/schema/claims';
import { payoutReleases } from '../drizzle/schema/payout';
import { fundsReceipts, invoices } from '../drizzle/schema/payout-queue';
import { AuthService } from '../utils/auth';
import {
  setInvoiceProviderForTests,
  type CreateInvoiceInput,
  type InvoiceProvider,
} from '../services/invoicing';
import { FundsService } from '../services/payout-queue/funds';
import payoutAdmin from './payout-admin';

// EUR 50 deregistration surcharge against a real database (migration 0028):
// admin flag + audit row, E1 figures, receipt and invoice lines.
//   pnpm vitest run src/routes/payout-admin-surcharge.test.ts
const tag = Math.random().toString(36).slice(2, 8);
const userIds: string[] = [];
let claimId = '';
let adminToken = '';
let userToken = '';
let app: Hono;
const invoiceInputs: CreateInvoiceInput[] = [];

interface AdminBody {
  deregistrationSurcharge: Record<string, unknown>;
  releases: { panel: { rows: { label: string; value: number }[] } }[];
}

const fakeProvider: InvoiceProvider = {
  name: 'lexoffice',
  async createInvoice(input) {
    invoiceInputs.push(input);
    return {
      status: 'issued',
      providerId: `lx-${tag}`,
      invoiceNumber: `RE-${tag}`,
    };
  },
  async createCancellation() {
    return { status: 'issued', providerId: 'cn-1', invoiceNumber: 'GS-1' };
  },
  async markPaid() {
    return { synced: false, note: 'test' };
  },
};

async function makeUser(role: string) {
  const [u] = await db
    .insert(users)
    .values({
      email: `test-surcharge-${role}-${tag}@example.com`,
      emailVerified: true,
      role,
    })
    .returning();
  userIds.push(u.id);
  return {
    id: u.id,
    token: AuthService.generateTokens({
      userId: u.id,
      email: u.email,
      emailVerified: true,
      role,
    }).accessToken,
  };
}

const call = (method: string, path: string, token: string, body?: unknown) =>
  app.request(`/api/admin/payout${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeAll(async () => {
  setInvoiceProviderForTests(fakeProvider);
  app = new Hono();
  app.route('/api/admin/payout', payoutAdmin);
  const admin = await makeUser('admin');
  const client = await makeUser('user');
  adminToken = admin.token;
  userToken = client.token;
  const [c] = await db
    .insert(claimsTable)
    .values({
      userId: client.id,
      status: 'submitted',
      firstName: 'Anita',
      lastName: `Sharma${tag}`,
      currentCountry: 'India',
      lawFirmRef: '06153-26',
    })
    .returning();
  claimId = c.id;
});

afterAll(async () => {
  setInvoiceProviderForTests(null);
  if (claimId) {
    await db.delete(invoices).where(eq(invoices.claimId, claimId));
    await db.delete(fundsReceipts).where(eq(fundsReceipts.claimId, claimId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claimId));
  }
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

describe('admin deregistration surcharge', () => {
  it('starts off and unlocked; admins only; validates the body', async () => {
    const res = await call('GET', `/claims/${claimId}`, adminToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminBody;
    expect(body.deregistrationSurcharge).toMatchObject({
      enabled: false,
      amountEur: 50,
      appliedEur: null,
      locked: false,
    });
    expect(
      (
        await call(
          'PUT',
          `/claims/${claimId}/deregistration-surcharge`,
          userToken,
          { enabled: true }
        )
      ).status
    ).toBe(403);
    expect(
      (
        await call(
          'PUT',
          `/claims/${claimId}/deregistration-surcharge`,
          adminToken,
          { enabled: 'yes' }
        )
      ).status
    ).toBe(400);
  });

  it('sets the flag with an audit row', async () => {
    const res = await call(
      'PUT',
      `/claims/${claimId}/deregistration-surcharge`,
      adminToken,
      { enabled: true, reason: 'No Abmeldebestätigung available' }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminBody;
    expect(body.deregistrationSurcharge).toMatchObject({
      enabled: true,
      reason: 'No Abmeldebestätigung available',
      setBy: userIds[0],
      locked: false,
    });
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(claim.deregistrationSurcharge).toBe(true);
    const audit = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceId, claimId),
          eq(auditLogs.action, 'deregistration_surcharge_set')
        )
      );
    expect(audit).toHaveLength(1);
    expect(audit[0].userId).toBe(userIds[0]);
    expect(audit[0].details).toMatchObject({
      enabled: true,
      previous: false,
      amountEur: 50,
    });
  });

  it('flows into E1: release, receipt and a separate invoice line', async () => {
    const result = await FundsService.recordFundsReceived({
      claimId,
      amountEur: 3038.49,
      valueDate: '2026-10-20',
      actorId: userIds[0],
    });
    expect(result.split).toMatchObject({
      percentageFee: 296.25,
      deregistrationSurcharge: 50,
      fee: 346.25,
      lawFirmFee: 178.5,
      atlaesShare: 167.75,
      clientAmount: 2692.24,
    });
    expect(result.receipt.deregistrationSurcharge).toBe('50.00');
    expect(result.receipt.atlaesShare).toBe('167.75');
    const [release] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.claimId, claimId));
    expect(release).toMatchObject({
      feeEur: '346.25',
      atlaesShareEur: '167.75',
      clientAmountEur: '2692.24',
      deregistrationSurchargeEur: '50.00',
    });
    expect(
      Number(release.lawFirmFeeEur) +
        Number(release.atlaesShareEur) +
        Number(release.clientAmountEur)
    ).toBeCloseTo(3038.49, 2);
    expect(invoiceInputs).toHaveLength(1);
    expect(invoiceInputs[0].grossAmount).toBe(167.75);
    expect(invoiceInputs[0].lines).toEqual([
      {
        name: 'Servicedienstleistungen zur Beitragserstattung',
        grossAmount: 117.75,
      },
      { name: 'Zusatzleistung: Abmeldung in Deutschland', grossAmount: 50 },
    ]);
  });

  it('shows the applied amount and locks the flag once funds are recorded', async () => {
    const res = await call('GET', `/claims/${claimId}`, adminToken);
    const body = (await res.json()) as AdminBody;
    expect(body.deregistrationSurcharge).toMatchObject({
      enabled: true,
      appliedEur: 50,
      locked: true,
    });
    const rows = body.releases[0].panel.rows;
    expect(rows.map((r) => r.value)).toEqual([
      3038.49, 296.25, 50, 178.5, 117.75, 2692.24,
    ]);
    expect(rows[2].label).toBe(
      'Optional service — German deregistration, including VAT'
    );
    const put = await call(
      'PUT',
      `/claims/${claimId}/deregistration-surcharge`,
      adminToken,
      { enabled: false }
    );
    expect(put.status).toBe(409);
  });
});
