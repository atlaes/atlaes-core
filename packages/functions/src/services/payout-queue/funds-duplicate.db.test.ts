/**
 * Funds recorded twice (audit H1): the admin "funds received" and a
 * matching statement line must not create a second release, receipt and
 * invoice for the same case. Second record while a release is open → 409.
 *   pnpm vitest run src/services/payout-queue/funds-duplicate.db.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../utils/db';
import { AuthService } from '../../utils/auth';
import { auditLogs, users } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import { payoutReleases } from '../../drizzle/schema/payout';
import {
  fundsReceipts,
  invoices,
  payoutLines,
} from '../../drizzle/schema/payout-queue';
import {
  payoutEmailLog,
  payoutTasks,
} from '../../drizzle/schema/payout-emails';
import { clearPayoutAccountCache } from '../payout-accounts';
import { PayoutFlowService } from '../payout-flow';
import { PayoutQueueService } from '.';
import { setInvoiceProviderForTests, type InvoiceProvider } from '../invoicing';
import { DEFAULT_LAW_FIRM_ID } from '../law-firm';
import { FundsService } from './funds';
import payoutAdmin from '../../routes/payout-admin';

const tag = Math.random().toString(36).slice(2, 8);
const userIds: string[] = [];
let claimId = '';
let adminToken = '';
let adminId = '';
let app: Hono;
let invoiceSeq = 0;

const fakeProvider: InvoiceProvider = {
  name: 'lexoffice',
  async createInvoice() {
    invoiceSeq++;
    return {
      status: 'issued',
      providerId: `lx-${tag}-${invoiceSeq}`,
      invoiceNumber: `RE-${tag}-${invoiceSeq}`,
    };
  },
  async createCancellation() {
    return { status: 'issued', providerId: 'cn-1', invoiceNumber: 'GS-1' };
  },
  async markPaid() {
    return { synced: false, note: 'test' };
  },
};

beforeAll(async () => {
  process.env.ATLAES_IBAN = 'DE02100100100006820101';
  clearPayoutAccountCache();
  setInvoiceProviderForTests(fakeProvider);
  app = new Hono();
  app.route('/api/admin/payout', payoutAdmin);
  const [admin] = await db
    .insert(users)
    .values({
      email: `test-funds-admin-${tag}@example.com`,
      emailVerified: true,
      role: 'admin',
    })
    .returning();
  const [client] = await db
    .insert(users)
    .values({
      email: `test-funds-client-${tag}@example.com`,
      emailVerified: true,
    })
    .returning();
  userIds.push(admin.id, client.id);
  adminId = admin.id;
  adminToken = AuthService.generateTokens({
    userId: admin.id,
    email: admin.email,
    emailVerified: true,
    role: 'admin',
  }).accessToken;
  const [c] = await db
    .insert(claimsTable)
    .values({
      userId: client.id,
      caseType: 'drv_refund',
      status: 'submitted',
      firstName: 'Anita',
      lastName: `Sharma${tag}`,
      currentCountry: 'India',
      handlingRoute: 'law_firm',
      lawFirmId: DEFAULT_LAW_FIRM_ID,
      lawFirmRef: '06153-26',
    })
    .returning();
  claimId = c.id;
});

afterAll(async () => {
  setInvoiceProviderForTests(null);
  if (claimId) {
    await db.delete(payoutLines).where(eq(payoutLines.claimId, claimId));
    await db.delete(payoutEmailLog).where(eq(payoutEmailLog.claimId, claimId));
    await db.delete(payoutTasks).where(eq(payoutTasks.claimId, claimId));
    await db.delete(invoices).where(eq(invoices.claimId, claimId));
    await db.delete(fundsReceipts).where(eq(fundsReceipts.claimId, claimId));
    await db.delete(payoutReleases).where(eq(payoutReleases.claimId, claimId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claimId));
  }
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

describe('funds received twice', () => {
  it('records once, then refuses with 409 while the release is open', async () => {
    const first = await FundsService.recordFundsReceived({
      claimId,
      amountEur: 3038.49,
      valueDate: '2026-09-18',
      statementReference: `BEITRAGSERSTATTUNG ${tag}`,
      actorId: adminId,
    });
    expect(first.payoutReleaseId).toBeTruthy();
    expect(first.invoiceNumber).toBe(`RE-${tag}-1`);

    // The statement import (same service) matching the same case later.
    await expect(
      FundsService.recordFundsReceived({
        claimId,
        amountEur: 3038.49,
        valueDate: '2026-09-19',
        statementReference: `BEITRAGSERSTATTUNG ${tag}`,
        actorId: null,
      })
    ).rejects.toMatchObject({ status: 409 });

    // And the admin route answers 409, not a second receipt.
    const res = await app.request(
      `http://localhost/api/admin/payout/claims/${claimId}/funds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amountEur: 3038.49, valueDate: '2026-09-19' }),
      }
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already recorded/);

    expect(
      await db
        .select()
        .from(payoutReleases)
        .where(eq(payoutReleases.claimId, claimId))
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(fundsReceipts)
        .where(eq(fundsReceipts.claimId, claimId))
    ).toHaveLength(1);
    expect(
      await db.select().from(invoices).where(eq(invoices.claimId, claimId))
    ).toHaveLength(1);
  });
});

async function signRelease(
  releaseId: string,
  review: { reviewRequired: boolean } = { reviewRequired: false }
) {
  await db
    .update(payoutReleases)
    .set({
      status: 'signed',
      signedAt: new Date(),
      route: 'A',
      zeS3Key: `claims/${claimId}/ze.pdf`,
      account: {
        accountHolder: 'Anita Sharma',
        bank: 'Commerzbank',
        country: 'DE',
        currency: 'EUR',
        iban: 'DE89370400440532013000',
      },
      reviewRequired: review.reviewRequired,
      reviewReasons: review.reviewRequired
        ? [{ kind: 'bank_details_changed', detail: 'IBAN changed' }]
        : [],
    })
    .where(eq(payoutReleases.id, releaseId));
}

const releasesOfClaim = () =>
  db.select().from(payoutReleases).where(eq(payoutReleases.claimId, claimId));

describe('funds received again after signing (pre-UAT P0 #3)', () => {
  it('refuses the same money once the release is signed', async () => {
    const [first] = await releasesOfClaim();
    await signRelease(first.id);

    // The bank statement arrives a week after ops recorded the funds.
    await expect(
      FundsService.recordFundsReceived({
        claimId,
        amountEur: 3038.49,
        valueDate: '2026-09-25',
        statementReference: null,
        actorId: null,
      })
    ).rejects.toMatchObject({ status: 409, code: 'funds_already_recorded' });

    // The same statement reference is always the same money.
    await expect(
      FundsService.recordFundsReceived({
        claimId,
        amountEur: 3038.49,
        valueDate: '2026-12-01',
        statementReference: `BEITRAGSERSTATTUNG ${tag}`,
        actorId: adminId,
        confirmAdditionalPayment: true,
      })
    ).rejects.toMatchObject({ status: 409 });
    expect(await releasesOfClaim()).toHaveLength(1);
  });

  it('records a further payment ops confirm', async () => {
    const res = await app.request(
      `http://localhost/api/admin/payout/claims/${claimId}/funds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountEur: 3038.49,
          valueDate: '2026-09-25',
          confirmAdditionalPayment: true,
        }),
      }
    );
    expect(res.status).toBe(201);
    expect(await releasesOfClaim()).toHaveLength(2);
  });
});

describe('payout-details review gate (pre-UAT P0 #4)', () => {
  it('a signed release under review is queued only after it is cleared', async () => {
    const second = (await releasesOfClaim()).find((r) => r.status === 'open')!;
    await signRelease(second.id, { reviewRequired: true });
    await db
      .update(claimsTable)
      .set({ payoutDetailsReviewRequired: true })
      .where(eq(claimsTable.id, claimId));

    // What sign() calls right after signing.
    expect(await PayoutQueueService.onReleased(second.id)).toEqual([]);
    const queued = await PayoutQueueService.listQueue(DEFAULT_LAW_FIRM_ID);
    expect(
      queued.cases.flatMap((c) => c.lines).some((l) => l.id === second.id)
    ).toBe(false);
    expect(
      await db
        .select()
        .from(payoutLines)
        .where(eq(payoutLines.payoutReleaseId, second.id))
    ).toHaveLength(0);

    await PayoutFlowService.clearReview(second.id, { id: adminId });
    const lines = await db
      .select()
      .from(payoutLines)
      .where(eq(payoutLines.payoutReleaseId, second.id));
    expect(lines.map((l) => l.kind).sort()).toEqual(['atlaes', 'client']);
  });
});

describe('cancelling an unsigned release (pre-UAT P1)', () => {
  it('cancels the release and its invoice, then lets the funds be recorded again', async () => {
    const [client] = await db
      .insert(users)
      .values({
        email: `test-funds-cancel-${tag}@example.com`,
        emailVerified: true,
      })
      .returning();
    userIds.push(client.id);
    const [c] = await db
      .insert(claimsTable)
      .values({
        userId: client.id,
        caseType: 'drv_refund',
        status: 'submitted',
        firstName: 'Ravi',
        lastName: `Kumar${tag}`,
        handlingRoute: 'law_firm',
        lawFirmId: DEFAULT_LAW_FIRM_ID,
        lawFirmRef: '06154-26',
      })
      .returning();
    try {
      // Typo: 3083.49 instead of 3038.49.
      const typo = await FundsService.recordFundsReceived({
        claimId: c.id,
        amountEur: 3083.49,
        valueDate: '2026-09-18',
        actorId: adminId,
      });

      const missingReason = await app.request(
        `http://localhost/api/admin/payout/releases/${typo.payoutReleaseId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      expect(missingReason.status).toBe(400);

      const res = await app.request(
        `http://localhost/api/admin/payout/releases/${typo.payoutReleaseId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'Amount typo' }),
        }
      );
      expect(res.status).toBe(200);

      const [release] = await db
        .select({ status: payoutReleases.status })
        .from(payoutReleases)
        .where(eq(payoutReleases.id, typo.payoutReleaseId!));
      expect(release.status).toBe('cancelled');
      const invs = await db
        .select({ kind: invoices.kind, status: invoices.status })
        .from(invoices)
        .where(eq(invoices.claimId, c.id));
      expect(invs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'invoice', status: 'cancelled' }),
          expect.objectContaining({ kind: 'cancellation' }),
        ])
      );

      // The correct amount can now be recorded.
      const fixed = await FundsService.recordFundsReceived({
        claimId: c.id,
        amountEur: 3038.49,
        valueDate: '2026-09-18',
        actorId: adminId,
      });
      expect(fixed.payoutReleaseId).not.toBe(typo.payoutReleaseId);

      // A cancelled release cannot be cancelled again.
      await expect(
        PayoutFlowService.cancelRelease(
          typo.payoutReleaseId!,
          { reason: 'again' },
          { id: adminId, email: 'admin@example.com' } as any
        )
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      await db.delete(payoutEmailLog).where(eq(payoutEmailLog.claimId, c.id));
      await db.delete(payoutTasks).where(eq(payoutTasks.claimId, c.id));
      await db.delete(invoices).where(eq(invoices.claimId, c.id));
      await db.delete(fundsReceipts).where(eq(fundsReceipts.claimId, c.id));
      await db.delete(payoutReleases).where(eq(payoutReleases.claimId, c.id));
      await db.delete(claimsTable).where(eq(claimsTable.id, c.id));
    }
  });
});
