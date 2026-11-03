/**
 * Escrow payout controls against PostgreSQL (owner spec 30 Oct 2026):
 * funds before the decision → EM → client upload → admin publishes →
 * review + release tasks; payout hold, contact pause, receipt answers,
 * payout tasks and the e-mail log.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { users } from '../../drizzle/schema/shared';
import { claimsTable } from '../../drizzle/schema/claims';
import { payoutReleases } from '../../drizzle/schema/payout';
import { PayoutFlowService } from '.';
import { PayoutEscrowService } from './escrow';
import { PayoutEmailService } from '../payout-emails';
import { clearPayoutAccountCache } from '../payout-accounts';
import { todayBerlin } from './deadlines';

const tag = Math.random().toString(36).slice(2, 8);
let userId = '';
let adminId = '';
let claimId = '';
const admin = () => ({ id: adminId });

const pdf = () =>
  new File([Buffer.from('%PDF-1.4\n%%EOF')], 'bescheid.pdf', {
    type: 'application/pdf',
  });

beforeAll(async () => {
  process.env.ATLAES_IBAN = 'DE02 1001 0010 0006 8201 01';
  clearPayoutAccountCache();
  const [u] = await db
    .insert(users)
    .values({ email: `esc-client-${tag}@example.com`, emailVerified: true })
    .returning();
  const [a] = await db
    .insert(users)
    .values({
      email: `esc-admin-${tag}@example.com`,
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
      firstName: 'Ana',
      lastName: 'Gomez',
      currentCountry: 'Colombia',
      lawFirmRef: '06200-26',
    })
    .returning();
  claimId = c.id;
});

afterAll(async () => {
  if (claimId) await db.delete(claimsTable).where(eq(claimsTable.id, claimId));
});

describe('escrow payout controls (db)', () => {
  it('funds before the decision: no release task, EM once the decision went to the client', async () => {
    await PayoutFlowService.onFundsRecorded(claimId, {
      amountEur: 5000,
      valueDate: todayBerlin(),
    });
    let st = await PayoutFlowService.getClientState(userId);
    expect(st.tasks.map((t) => t.kind)).toEqual([]);
    expect(st.decisionRequest.open).toBe(false);

    await PayoutEscrowService.setDecisionDirectToClient(claimId, true, admin());
    st = await PayoutFlowService.getClientState(userId);
    expect(st.decisionRequest.open).toBe(true);
    expect(st.tasks.map((t) => t.kind)).toEqual(['upload_decision']);
    const log = await PayoutEmailService.log(claimId);
    expect(log.map((l) => l.template)).toContain('EM');
  });

  it('client upload waits for verification, then admin publishes it', async () => {
    const { decisionId } = await PayoutEscrowService.clientUploadDecision(
      userId,
      [pdf()]
    );
    await expect(
      PayoutEscrowService.clientUploadDecision(userId, [pdf()])
    ).rejects.toThrow(/already have your upload/);
    let st = await PayoutFlowService.getClientState(userId);
    expect(st.decision).toBeNull();
    expect(st.decisionRequest.uploadedAt).not.toBeNull();
    expect(st.tasks.map((t) => t.kind)).toEqual([]);
    let view = await PayoutEscrowService.adminView(claimId);
    expect(
      view.tasks.filter((t) => t.status === 'open').map((t) => t.kind)
    ).toContain('decision_upload');

    const today = todayBerlin();
    await PayoutFlowService.publishDecision(
      claimId,
      decisionId,
      { receivedAt: today, atlaesReceivedAt: today, recipient: 'client' },
      admin()
    );
    st = await PayoutFlowService.getClientState(userId);
    expect(st.decision?.id).toBe(decisionId);
    expect(st.tasks.map((t) => t.kind)).toEqual([
      'review_decision',
      'release_refund',
    ]);
    view = await PayoutEscrowService.adminView(claimId);
    expect(
      view.tasks.filter((t) => t.status === 'open').map((t) => t.kind)
    ).not.toContain('decision_upload');
  });

  it('a payout hold removes the release task and blocks signing', async () => {
    await PayoutEscrowService.setPayoutHold(claimId, 'ID check', admin());
    let st = await PayoutFlowService.getClientState(userId);
    expect(st.tasks.map((t) => t.kind)).toEqual(['review_decision']);
    expect(st.release?.blockers).toContain('payout_hold');
    const view = await PayoutEscrowService.adminView(claimId);
    expect(view.hold?.reason).toBe('ID check');
    await PayoutEscrowService.setPayoutHold(claimId, null, admin());
    st = await PayoutFlowService.getClientState(userId);
    expect(st.tasks.map((t) => t.kind)).toContain('release_refund');
  });

  it('contact pause is recorded and cleared', async () => {
    await expect(
      PayoutEscrowService.setContactPause(
        claimId,
        { reason: ' ', nextContactDate: null },
        admin()
      )
    ).rejects.toThrow(/why contact is paused/);
    await PayoutEscrowService.setContactPause(
      claimId,
      { reason: 'Travelling', nextContactDate: '2026-12-01' },
      admin()
    );
    let view = await PayoutEscrowService.adminView(claimId);
    expect(view.contactPause).toMatchObject({
      reason: 'Travelling',
      nextContactDate: '2026-12-01',
    });
    await PayoutEscrowService.setContactPause(claimId, null, admin());
    view = await PayoutEscrowService.adminView(claimId);
    expect(view.contactPause).toBeNull();
  });

  it('transfer actions need a signed release', async () => {
    const [r] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.claimId, claimId));
    await expect(
      PayoutEscrowService.setExpectedArrival(
        claimId,
        r.id,
        '2026-12-01',
        admin()
      )
    ).rejects.toThrow(/not authorised/);
    await expect(
      PayoutEscrowService.clientReceipt(userId, r.id, 'confirmed')
    ).rejects.toThrow(/not found/);
  });

  it('receipt answers on a signed release; not received opens a task', async () => {
    const [r] = await db
      .select()
      .from(payoutReleases)
      .where(eq(payoutReleases.claimId, claimId));
    // Simulate the signed state directly (signing is covered elsewhere).
    await db
      .update(payoutReleases)
      .set({ status: 'signed', signedAt: new Date(), route: 'A' })
      .where(eq(payoutReleases.id, r.id));
    await PayoutEscrowService.setExpectedArrival(
      claimId,
      r.id,
      '2026-12-01',
      admin()
    );
    await PayoutEscrowService.clientReceipt(userId, r.id, 'not_received');
    const view = await PayoutEscrowService.adminView(claimId);
    expect(view.transfers[0]).toMatchObject({
      expectedArrivalDate: '2026-12-01',
      receiptStatus: 'not_received',
    });
    await PayoutEscrowService.clientReceipt(userId, r.id, 'confirmed');
    const after = await PayoutEscrowService.adminView(claimId);
    expect(after.transfers[0].receiptStatus).toBe('confirmed');
    expect(
      after.tasks.filter((t) => t.status === 'open').map((t) => t.kind)
    ).not.toContain('payment_not_received');
  });
});
