/**
 * Direct client submission of a DRV refund against PostgreSQL: route
 * isolation from the law firm, generate → release → dispatch, the route
 * lock after submission, the route switch clearing the frozen pack, no
 * escrow payout for the direct route, and no L203/lettershop for DRV
 * claims. Uploads are stubbed through LawFirmService.loadClaimAttachments
 * (S3 is skipped in tests); specimen data only.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { crc32, deflateSync } from 'zlib';
import { eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';

import { db } from '../utils/db';
import { documents, signatures, users } from '../drizzle/schema/shared';
import {
  claimDocuments,
  claimsTable,
  claimWorkflowStates,
} from '../drizzle/schema/claims';
import { DirectSubmissionService } from './direct-submission';
import { DEFAULT_LAW_FIRM_ID, LawFirmService } from './law-firm';
import { ClaimsApplicationService } from './claims-application';
import { FundsService } from './payout-queue/funds';
import { ClaimPdfService } from './claim-pdf';
import { LettershopService } from './lettershop';
import { PayoutFlowService } from './payout-flow';

const tag = Math.random().toString(36).slice(2, 8);
const lastName = `Direkt${tag}`;
let userId = '';
let user2Id = '';
let adminId = '';
let claimId = '';
let claim2Id = '';

function pngDataUrl(w = 120, h = 40): string {
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
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (Math.abs(y - x / 3) < 2) raw[y * (w * 4 + 1) + 1 + x * 4 + 3] = 255;
  const buf = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return 'data:image/png;base64,' + buf.toString('base64');
}

async function onePagePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 300]).drawText('specimen', { x: 20, y: 150, size: 20 });
  return Buffer.from(await doc.save());
}

const drvFields = {
  caseType: 'drv_refund',
  status: 'submitted',
  firstName: 'Priya',
  lastName,
  dateOfBirth: '1990-03-12',
  nationality: 'India',
  placeOfBirth: 'Pune',
  passportNumber: 'Z1234567',
  currentAddressLine1: '14 MG Road',
  currentCity: 'Pune',
  currentPostalCode: '411001',
  currentCountry: 'IN',
  germanStreet: 'Musterstraße 1',
  germanPostalCode: '10115',
  germanCity: 'Berlin',
  moveOutDate: '2024-06-30',
  vsnr: '65 120390 S 512',
  sex: 'female',
  germanContributionMonths: 38,
  accountHolderName: `Priya ${lastName}`,
  bankName: 'Commerzbank',
  bankCity: 'Köln',
  iban: 'DE89370400440532013000',
} as const;

async function attach(claim: string, owner: string, role: string) {
  const key = `test/${tag}/${role}.pdf`;
  const [d] = await db
    .insert(documents)
    .values({
      userId: owner,
      fileName: `${role}.pdf`,
      fileType: 'application/pdf',
      fileSize: 100,
      s3Key: key,
      documentType: role,
    })
    .returning();
  await db
    .insert(claimDocuments)
    .values({ claimId: claim, documentId: d.id, documentRole: role });
}

beforeAll(async () => {
  const mk = async (email: string, role?: string) =>
    (
      await db
        .insert(users)
        .values({ email, emailVerified: true, ...(role ? { role } : {}) })
        .returning()
    )[0].id;
  userId = await mk(`direct-client-${tag}@example.com`);
  user2Id = await mk(`direct-client2-${tag}@example.com`);
  adminId = await mk(`direct-admin-${tag}@example.com`, 'admin');
  const [sig] = await db
    .insert(signatures)
    .values({ userId, signatureData: pngDataUrl() })
    .returning();
  const [c] = await db
    .insert(claimsTable)
    .values({
      ...drvFields,
      userId,
      signatureId: sig.id,
      handlingRoute: 'direct',
      // Stale firm data must not make the case visible to the firm.
      lawFirmId: DEFAULT_LAW_FIRM_ID,
      lawFirmReleasedAt: new Date(),
    })
    .returning();
  claimId = c.id;
  await attach(claimId, userId, 'passport');
  await attach(claimId, userId, 'payslip');
  const pdf = new Uint8Array(await onePagePdf());
  vi.spyOn(LawFirmService, 'loadClaimAttachments').mockResolvedValue({
    passport: pdf,
    payslip: pdf,
    abmeldung: null,
  });

  const [c2] = await db
    .insert(claimsTable)
    .values({
      ...drvFields,
      userId: user2Id,
      handlingRoute: 'direct',
      submissionPackS3Key: 'claims/x/submission-pack/old.pdf',
      submissionPackGeneratedAt: new Date(),
      submissionPackManifest: { route: 'direct' },
      directPackReleasedAt: new Date(),
      directPackReleasedBy: adminId,
    })
    .returning();
  claim2Id = c2.id;
});

afterAll(async () => {
  vi.restoreAllMocks();
  for (const id of [claimId, claim2Id])
    if (id)
      await db
        .delete(claimsTable)
        .where(eq(claimsTable.id, id))
        .catch(() => undefined); // rows referenced by payout tables stay
});

const admin = () => ({ id: adminId, email: 'admin@example.com' });

describe('direct client submission (db)', () => {
  it('keeps a direct case out of the firm portal', async () => {
    const list = await LawFirmService.listClaimsForFirm(DEFAULT_LAW_FIRM_ID, {
      search: lastName,
    });
    expect(list.claims.map((c) => c.id)).not.toContain(claimId);
    expect(
      await LawFirmService.getDownloadForFirm(
        DEFAULT_LAW_FIRM_ID,
        claimId,
        adminId,
        'package'
      )
    ).toBeNull();
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    await expect(
      LawFirmService.ensureSubmissionPack(row, adminId)
    ).rejects.toThrow(/not routed via the law firm/);
  });

  it('reports the state and refuses release before generation', async () => {
    const s = await DirectSubmissionService.getState(claimId);
    expect(s.applicable).toBe(true);
    expect(s.routeLabel).toBe('Direct client submission');
    expect(s.missing).toEqual([]);
    expect(s.bankBranch).toBe('germany');
    expect(s.releaseBlockers).toContain('Generate the direct pack first.');
    expect(s.postalAgent.name).toBe('Anna Kliem');
    await expect(
      DirectSubmissionService.release(claimId, admin())
    ).rejects.toMatchObject({ status: 409 });
  });

  it('generates the signed direct pack and stores it on the case', async () => {
    const s = await DirectSubmissionService.generate(claimId, admin());
    expect(s.pack?.signed).toBe(true);
    expect(s.pack?.route).toBe('direct');
    expect(s.pack?.documents.map((d) => d.key)).toEqual([
      'cover',
      'v0901',
      'postal_authority',
      'a1002',
      'reply',
      'payslip',
      'id',
    ]);
    expect(s.releaseBlockers).toEqual([]);
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claimId));
    expect(row.submissionPackS3Key).toMatch(/submission-pack/);
    expect((row.submissionPackManifest as { route: string }).route).toBe(
      'direct'
    );
    // Generating or downloading is not a submission.
    const dl = await DirectSubmissionService.downloadUrl(claimId, admin());
    expect(dl.fileName).toMatch(/^DRV_Direktantrag_/);
    expect(row.submissionDispatchedAt).toBeNull();
  });

  it('needs a release before the dispatch; release freezes the pack', async () => {
    await expect(
      DirectSubmissionService.recordDispatch(claimId, admin(), {
        sender: 'ATLAES',
        method: 'post',
        date: '2026-10-28',
      })
    ).rejects.toMatchObject({ status: 409 });
    const released = await DirectSubmissionService.release(claimId, admin());
    expect(released.release?.releasedAt).toBeTruthy();
    await expect(
      DirectSubmissionService.generate(claimId, admin())
    ).rejects.toThrow(/withdraw the release/);
    await DirectSubmissionService.withdrawRelease(claimId, admin());
    const again = await DirectSubmissionService.release(claimId, admin());
    expect(again.release).not.toBeNull();
  });

  it('records the dispatch as the submission', async () => {
    await expect(
      DirectSubmissionService.recordDispatch(claimId, admin(), {
        sender: 'ATLAES',
        method: 'post',
        date: '2099-01-01',
      })
    ).rejects.toThrow(/future/);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
    }).format(new Date());
    const s = await DirectSubmissionService.recordDispatch(claimId, admin(), {
      sender: 'ATLAES Ops',
      method: 'einschreiben',
      date: today,
    });
    expect(s.dispatch?.method).toBe('einschreiben');
    expect(s.dispatch?.sender).toBe('ATLAES Ops');
    expect(s.submittedToDrv).toBe(true);
    const wf = await db
      .select()
      .from(claimWorkflowStates)
      .where(eq(claimWorkflowStates.claimId, claimId));
    expect(
      wf.some(
        (w) =>
          (w.metadata as { action?: string })?.action ===
          'direct_submission_dispatched'
      )
    ).toBe(true);
    await expect(
      DirectSubmissionService.recordDispatch(claimId, admin(), {
        sender: 'x',
        method: 'post',
        date: today,
      })
    ).rejects.toThrow(/correction workflow/);
  });

  it('locks the route switch after the submission', async () => {
    await expect(
      ClaimsApplicationService.setHandlingRoute(claimId, adminId, {
        handlingRoute: 'law_firm',
      })
    ).rejects.toThrow(/correction workflow/);
  });

  it('creates no escrow release, queue line or ZE for the direct route', async () => {
    await expect(
      FundsService.recordFundsReceived({
        claimId,
        amountEur: 1000,
        valueDate: '2026-10-28',
        actorId: adminId,
      })
    ).rejects.toMatchObject({ status: 409, code: 'direct_route' });
    const st = await PayoutFlowService.getClientState(userId);
    expect(st.payoutRoute).toBe('direct_to_client');
    expect(st.zeApplicable).toBe(false);
    expect(st.release).toBeNull();
    expect(st.tasks.some((t) => t.kind === 'release_refund')).toBe(false);
  });

  it('clears the frozen pack and release when the route changes before submission', async () => {
    await ClaimsApplicationService.setHandlingRoute(claim2Id, adminId, {
      handlingRoute: 'law_firm',
    });
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claim2Id));
    expect(row.handlingRoute).toBe('law_firm');
    expect(row.submissionPackS3Key).toBeNull();
    expect(row.submissionPackManifest).toBeNull();
    expect(row.directPackReleasedAt).toBeNull();
    // Back to direct: the firm's release is removed again.
    await ClaimsApplicationService.setHandlingRoute(claim2Id, adminId, {
      handlingRoute: 'direct',
    });
    const [back] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claim2Id));
    expect(back.lawFirmReleasedAt).toBeNull();
    expect(back.lawFirmId).toBeNull();
  });

  it('never sends a DRV claim to the L203 or the lettershop', async () => {
    const generate = vi
      .spyOn(ClaimPdfService, 'generateAndStoreForClaim')
      .mockRejectedValue(new Error('must not be called'));
    const send = vi
      .spyOn(LettershopService, 'sendClaimPdf')
      .mockRejectedValue(new Error('must not be called'));
    for (const handlingRoute of ['direct', 'law_firm'])
      await (ClaimsApplicationService as any).dispatchSubmittedClaim(
        claim2Id,
        user2Id,
        { ...drvFields, id: claim2Id, handlingRoute, pensionProvider: null }
      );
    expect(generate).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, claim2Id));
    expect(row.submissionHold).toBeNull();
  });
});
