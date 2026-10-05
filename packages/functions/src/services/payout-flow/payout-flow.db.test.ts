/**
 * Client review-and-release flow against PostgreSQL: decision (E2) →
 * funds (E1) → tasks → confirm → bank details (review flag) → invoice →
 * sign → claim enters the payout queue; missing-period report.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { crc32, deflateSync } from 'zlib';
import { db } from '../../utils/db';
import { users } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import {
  payoutCustomerInputs,
  payoutReleases,
} from '../../drizzle/schema/payout';
import { PayoutFlowService } from '.';

const tag = Math.random().toString(36).slice(2, 8);
let userId = '';
let adminId = '';
let claimId = '';

/** Minimal RGBA PNG with a diagonal stroke. */
function png(w = 120, h = 40): string {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // pseudo-random ink so the PNG is not trivially compressible
      if ((x * 7919 + y * 104729) % 13 < 3)
        raw[y * (w * 4 + 1) + 1 + x * 4 + 3] = 255;
    }
  }
  const buf = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return 'data:image/png;base64,' + buf.toString('base64');
}

beforeAll(async () => {
  process.env.ATLAES_IBAN = 'DE02 1001 0010 0006 8201 01';
  const [u] = await db
    .insert(users)
    .values({ email: `p1-client-${tag}@example.com`, emailVerified: true })
    .returning();
  const [a] = await db
    .insert(users)
    .values({
      email: `p1-admin-${tag}@example.com`,
      emailVerified: true,
      role: 'admin',
    })
    .returning();
  userId = u.id;
  adminId = a.id;
  const [c] = await db
    .insert(claimsTable)
    .values({
      userId,
      status: 'submitted',
      firstName: 'Joseph',
      lastName: 'Okafor',
      nationality: 'Nigeria',
      currentCountry: 'Nigeria',
      accountHolderName: 'Joseph Okafor',
      bankName: 'Commerzbank',
      iban: 'DE89370400440532013000',
      swiftBic: 'COBADEFFXXX',
      bankCountry: 'Germany',
      preferredCurrency: 'EUR',
      lawFirmRef: '06153-26',
    })
    .returning();
  claimId = c.id;
});

afterAll(async () => {
  if (claimId) await db.delete(claimsTable).where(eq(claimsTable.id, claimId));
});

describe('payout flow (db)', () => {
  it('records the decision with deadlines and shows the review task', async () => {
    const file = new File([Buffer.from('%PDF-1.4\n%%EOF')], 'bescheid.pdf', {
      type: 'application/pdf',
    });
    const d = await PayoutFlowService.recordDecision(
      claimId,
      {
        file,
        receivedAt: '2026-09-21',
        refundAmountEur: 29601.9,
        periods: [
          {
            from: '2019-03-01',
            to: '2019-12-31',
            entgeltEur: 38250,
            contributionsEur: 3557.25,
          },
        ],
        runExtraction: false,
      },
      { id: adminId }
    );
    expect(d.objectionDeadline).toBe('2026-10-21');
    expect(d.clientReviewBy).toBe('2026-10-14');
    const st = await PayoutFlowService.getClientState(userId);
    expect(st.tasks.map((t) => t.kind)).toEqual(['review_decision']);
    expect(st.decision?.periods).toHaveLength(1);
  });

  it('records funds (E1) and opens the release task with panel C', async () => {
    const r = await PayoutFlowService.onFundsRecorded(claimId, {
      amountEur: 29601.9,
      valueDate: '2026-09-22',
    });
    expect(Number(r.clientAmountEur)).toBe(27101.9);
    const st = await PayoutFlowService.getClientState(userId);
    expect(st.tasks.map((t) => t.kind)).toEqual([
      'review_decision',
      'release_refund',
    ]);
    expect(st.release?.panel.variant).toBe('standard');
    expect(st.release?.blockers).toEqual(
      expect.arrayContaining(['bank_details_missing', 'invoice_missing'])
    );
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(claim.payoutSmallRefund).toBe(false);
    expect(claim.payoutAmountMismatch).toBe(false);
  });

  it('confirms the decision', async () => {
    const st = await PayoutFlowService.getClientState(userId);
    await PayoutFlowService.confirmDecision(userId, st.decision!.id);
    await expect(
      PayoutFlowService.confirmDecision(userId, st.decision!.id)
    ).rejects.toThrow(/no longer open/);
    const after = await PayoutFlowService.getClientState(userId);
    expect(after.tasks.map((t) => t.kind)).toEqual(['release_refund']);
  });

  it('validates bank details and flags the country mismatch for review', async () => {
    const st = await PayoutFlowService.getClientState(userId);
    const bad = await PayoutFlowService.saveBankDetails(
      userId,
      st.release!.id,
      {
        accountHolder: 'Joseph Okafor',
        bank: 'Commerzbank',
        country: 'DE',
        currency: 'EUR',
        iban: 'DE89370400440532013001',
      }
    );
    expect(bad.validation.ok).toBe(false);
    const ok = await PayoutFlowService.saveBankDetails(userId, st.release!.id, {
      accountHolder: 'Joseph Okafor',
      bank: 'Commerzbank',
      country: 'DE',
      currency: 'EUR',
      iban: 'DE89370400440532013000',
      bic: 'COBADEFFXXX',
    });
    expect(ok.validation.ok).toBe(true);
    expect(ok.release.route).toBe('A');
    expect(ok.release.reviewRequired).toBe(true); // DE account, Nigerian resident
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(claim.payoutDetailsReviewRequired).toBe(true);
  });

  it('refuses to sign without an invoice number, then signs and releases', async () => {
    const st = await PayoutFlowService.getClientState(userId);
    const id = st.release!.id;
    await expect(
      PayoutFlowService.sign(userId, id, {
        signatureDataUrl: png(),
        ip: '203.0.113.9',
      })
    ).rejects.toThrow(/cannot be signed yet/);
    await PayoutFlowService.setInvoiceNumber(id, 'RE-2026-0415');
    const preview = await PayoutFlowService.previewZe(userId, id);
    expect(preview.blockers).toEqual([]);
    expect(preview.text.german.flatMap((s) => s.lines).join('\n')).toContain(
      'Verwendungszweck: RE-2026-0415'
    );
    const res = await PayoutFlowService.sign(userId, id, {
      signatureDataUrl: png(),
      ip: '203.0.113.9',
    });
    expect(res.release.status).toBe('signed');
    const [rel] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.id, id));
    expect(rel.zeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect((rel.auditRecord as any).ip).toBe('203.0.113.9');
    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(claim.payoutReleasedAt).toBeInstanceOf(Date);
    expect(claim.payoutReleaseId).toBe(id);
    expect(claim.payoutZeDocumentId).toBe(rel.zeDocumentId);
    // still flagged until ATLAES Admin clears the review
    expect(claim.payoutDetailsReviewRequired).toBe(true);
    await PayoutFlowService.clearReview(id, { id: adminId });
    const [cleared] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(cleared.payoutDetailsReviewRequired).toBe(false);
  });

  it('small refund + missing-period report on a second decision', async () => {
    const r = await PayoutFlowService.onFundsRecorded(claimId, {
      amountEur: 1500,
      valueDate: '2026-11-02',
    });
    expect(r.smallRefund).toBe(true);
    const file = new File([Buffer.from('%PDF-1.4\n%%EOF')], 'bescheid2.pdf', {
      type: 'application/pdf',
    });
    const d = await PayoutFlowService.recordDecision(
      claimId,
      { file, receivedAt: '2026-01-31', runExtraction: false },
      { id: adminId }
    );
    expect(d.objectionDeadline).toBe('2026-02-28');
    const slip = new File([Buffer.from('%PDF-1.4\n%%EOF')], 'payslip.pdf', {
      type: 'application/pdf',
    });
    const { inputId } = await PayoutFlowService.reportMissing(
      userId,
      d.id,
      'March 2019 to August 2019 at Acme, Berlin missing',
      [slip]
    );
    const [input] = await db
      .select()
      .from(payoutCustomerInputs)
      .where(eq(payoutCustomerInputs.id, inputId));
    expect(input.objectionDeadline).toBe('2026-02-28');
    expect(input.documentIds).toHaveLength(1);
    const st = await PayoutFlowService.getClientState(userId);
    expect(st.decision?.reviewOutcome).toBe('disputed');
    expect(st.release?.panel.variant).toBe('small');
    expect(st.tasks.map((t) => t.kind)).toEqual(['release_refund']);
  });
});
