/**
 * KVBW ZVK / VddB / VddKO direct submission against PostgreSQL: the
 * direct-submission card applies to these refunds (not to VBL claims),
 * the benefit setting, generate → release (despite the queue hold) →
 * dispatch, which clears the 'manual_submission_required' hold. Uploads
 * are stubbed through LawFirmService (S3 is skipped in tests); specimen
 * data only.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { crc32, deflateSync } from 'zlib';
import { eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';

import { db } from '../../utils/db';
import { documents, signatures, users } from '../../drizzle/schema/shared';
import { claimDocuments, claimsTable } from '../../drizzle/schema/claims';
import { DirectSubmissionService } from '../direct-submission';
import { LawFirmService } from '../law-firm';
import { todayBerlin } from '../payout-flow/deadlines';

const tag = Math.random().toString(36).slice(2, 8);
let userId = '';
let adminId = '';
let vddbId = '';
let kvbwId = '';
let vblId = '';

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

async function onePagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 300]).drawText('specimen', { x: 20, y: 150, size: 20 });
  return doc.save();
}

const base = {
  caseType: 'vbl_refund',
  pensionType: 'public',
  status: 'submitted',
  firstName: 'Mara',
  lastName: `Buehne${tag}`,
  dateOfBirth: '1988-04-12',
  placeOfBirth: 'Cork',
  currentAddressLine1: '12 Harbour Street',
  currentCity: 'Dublin',
  currentPostalCode: 'D02 X285',
  currentCountry: 'Ireland',
  svNummer: 'J/B-123456',
  iban: 'DE89370400440532013000',
  swiftBic: 'COBADEFFXXX',
  bankName: 'Example Bank',
  bankCity: 'Frankfurt am Main',
  handlingRoute: 'direct',
  submissionHold: 'manual_submission_required',
  submissionHoldReason: 'specimen',
} as const;

const stageDetails = {
  stageName: 'SPECIMEN Stadttheater',
  rolePosition: 'Tänzerin',
  employmentEndDate: '2025-07-31',
  permanentlyStopped: 'yes',
  reasonForLeaving: 'relocation',
  currentOccupation: 'Lehrerin',
  unableToWorkHealth: 'no',
};

beforeAll(async () => {
  const mk = async (email: string, role?: string) =>
    (
      await db
        .insert(users)
        .values({ email, emailVerified: true, ...(role ? { role } : {}) })
        .returning()
    )[0].id;
  userId = await mk(`provider-client-${tag}@example.com`);
  adminId = await mk(`provider-admin-${tag}@example.com`, 'admin');
  const [sig] = await db
    .insert(signatures)
    .values({ userId, signatureData: pngDataUrl() })
    .returning();
  const insert = async (values: Record<string, unknown>) =>
    (
      await db
        .insert(claimsTable)
        .values({ ...base, userId, signatureId: sig.id, ...values } as never)
        .returning()
    )[0].id;
  vddbId = await insert({ pensionProvider: 'VddB', stageDetails });
  kvbwId = await insert({ pensionProvider: 'KVBW', svNummer: '0012345678' });
  vblId = await insert({ pensionProvider: 'VBLklassik', submissionHold: null });

  const pdf = await onePagePdf();
  vi.spyOn(LawFirmService, 'loadClaimAttachments').mockResolvedValue({
    passport: pdf,
    payslip: null,
    abmeldung: null,
  });
  vi.spyOn(LawFirmService, 'loadProviderAttachments').mockImplementation(
    async (id: string) => ({
      providerForm: id === kvbwId ? pdf : null,
      extras:
        id === vddbId
          ? [{ label: 'Angaben zur Steuer-Identifikationsnummer', pdf }]
          : [],
    })
  );
});

afterAll(async () => {
  vi.restoreAllMocks();
  for (const id of [vddbId, kvbwId, vblId])
    if (id)
      await db
        .delete(claimsTable)
        .where(eq(claimsTable.id, id))
        .catch(() => undefined);
});

const admin = () => ({ id: adminId, email: 'admin@example.com' });

describe('provider refund direct submission (db)', () => {
  it('applies to KVBW/VddB/VddKO but not to VBL claims', async () => {
    const vbl = await DirectSubmissionService.getState(vblId);
    expect(vbl.applicable).toBe(false);
    expect(vbl.notApplicableReason).toMatch(/lettershop/);

    const s = await DirectSubmissionService.getState(vddbId);
    expect(s).toMatchObject({
      applicable: true,
      kind: 'provider',
      provider: { code: 'VddB', label: 'VddB' },
      benefit: { value: 'partial_refund', setByAdmin: false },
      missing: [],
    });
    expect(s.benefit?.options.map((o) => o.value)).toContain('full_refund');
    // The queue hold does not block; a missing pack does.
    expect(s.releaseBlockers).toEqual(['Generate the direct pack first.']);
  });

  it('lets admin choose the benefit the form offers', async () => {
    const s = await DirectSubmissionService.setBenefit(
      vddbId,
      admin(),
      'full_refund'
    );
    expect(s.benefit).toMatchObject({ value: 'full_refund', setByAdmin: true });
    await expect(
      DirectSubmissionService.setBenefit(kvbwId, admin(), 'full_refund')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('generates, releases and dispatches; the dispatch clears the hold', async () => {
    const generated = await DirectSubmissionService.generate(vddbId, admin());
    expect(generated.pack?.documents.map((d) => d.key)).toEqual([
      'cover',
      'application',
      'postal_authority',
      'id',
      'extra-1',
    ]);
    expect(generated.pack?.recipient?.carrierName).toBe(
      'Versorgungsanstalt der deutschen Bühnen'
    );
    expect(generated.releaseBlockers).toEqual([]);
    const dl = await DirectSubmissionService.downloadUrl(vddbId, admin());
    expect(dl.fileName).toMatch(/^VddB_Direktantrag_/);

    await DirectSubmissionService.release(vddbId, admin());
    const done = await DirectSubmissionService.recordDispatch(vddbId, admin(), {
      sender: 'ATLAES',
      method: 'post',
      date: todayBerlin(),
    });
    expect(done.dispatch?.sender).toBe('ATLAES');
    const [row] = await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.id, vddbId));
    expect(row.submissionHold).toBeNull();
    expect(row.submissionDispatchedAt).not.toBeNull();
  });

  it('lists the uploaded form and extras on provider cases', async () => {
    const attach = async (fileName: string, role: string) => {
      const [doc] = await db
        .insert(documents)
        .values({
          userId,
          fileName,
          fileType: 'application/pdf',
          fileSize: 1,
          s3Key: `test/${tag}/${fileName}`,
        } as never)
        .returning();
      await db
        .insert(claimDocuments)
        .values({
          claimId: kvbwId,
          documentId: doc.id,
          documentRole: role,
        } as never);
    };
    await attach('KVBW Antrag.pdf', 'provider_form');
    await attach('Steuer-ID.pdf', 'bav_extra');
    await attach('passport.pdf', 'passport');
    const s = await DirectSubmissionService.getState(kvbwId);
    expect(s.uploads.map((u) => [u.role, u.fileName])).toEqual([
      ['provider_form', 'KVBW Antrag.pdf'],
      ['bav_extra', 'Steuer-ID.pdf'],
    ]);
  });

  it('builds the KVBW pack around the uploaded form', async () => {
    const s = await DirectSubmissionService.generate(kvbwId, admin());
    expect(s.provider?.code).toBe('KVBW_ZVK');
    expect(s.pack?.anlagen[0]).toBe(
      'Antrag auf Erstattung der Beiträge bzw. der Arbeitnehmerbeteiligung'
    );
  });
});
