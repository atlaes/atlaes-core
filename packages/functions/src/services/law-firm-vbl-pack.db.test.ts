/**
 * A VBL refund handled by the law firm: the firm's package download hands
 * over the L203 package stored at submission, never the DRV pack (which
 * needs DRV data a VBL claim does not collect). S3 is stubbed.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const s3 = vi.hoisted(() => ({
  uploadFile: vi.fn(async () => undefined),
  downloadFile: vi.fn(async () => Buffer.from('%PDF-1.7 l203')),
  getPresignedUrl: vi.fn(async (key: string) => `https://s3.test/${key}`),
  deleteFile: vi.fn(async () => undefined),
}));

import { db } from '../utils/db';
import { claimsTable } from '../drizzle/schema/claims';
import { users } from '../drizzle/schema/shared';

// The suite runs with isolate: false, so a hoisted vi.mock would not reach
// a law-firm module an earlier file already loaded. Load it fresh with the
// S3 stub instead.
async function lawFirmWithS3Stub() {
  vi.resetModules();
  vi.doMock('../utils/s3', () => s3);
  return (await import('./law-firm')).LawFirmService;
}

const ids: { user?: string; claim?: string } = {};

afterAll(async () => {
  if (ids.claim)
    await db.delete(claimsTable).where(eq(claimsTable.id, ids.claim));
  if (ids.user) await db.delete(users).where(eq(users.id, ids.user));
});

describe('law-firm package for a VBL refund', () => {
  it('uses the stored L203 package, not the DRV pack', async () => {
    const [u] = await db
      .insert(users)
      .values({
        email: `vbl-firm-${Date.now()}@example.com`,
        emailVerified: true,
      })
      .returning();
    ids.user = u.id;
    const [claim] = await db
      .insert(claimsTable)
      .values({
        userId: u.id,
        status: 'submitted',
        workflowState: 'submitted',
        caseType: 'vbl_refund',
        pensionProvider: 'VBL',
        handlingRoute: 'law_firm',
        firstName: 'Jonas',
        lastName: 'Weber',
        lawFirmRef: 'AZ-1/26',
        pdfS3Key: 'claims/x/vbl-claim.pdf',
        submittedAt: new Date(),
      })
      .returning();
    ids.claim = claim.id;

    const LawFirmService = await lawFirmWithS3Stub();
    const key = await LawFirmService.ensureSubmissionPack(claim, u.id);
    vi.doUnmock('../utils/s3');
    vi.resetModules();

    expect(key).toBeTruthy();
    expect(s3.downloadFile).toHaveBeenCalledWith('claims/x/vbl-claim.pdf');
    const [row] = await db
      .select({ manifest: claimsTable.submissionPackManifest })
      .from(claimsTable)
      .where(eq(claimsTable.id, claim.id));
    expect(row.manifest).toMatchObject({
      kind: 'vbl_claim_package',
      sourceKey: 'claims/x/vbl-claim.pdf',
    });
  });
});
