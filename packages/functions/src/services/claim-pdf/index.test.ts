import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import * as schema from '../../drizzle/schema';
import { claimsTable } from '../../drizzle/schema/claims';
import {
  users,
  profiles,
  documents,
  signatures,
} from '../../drizzle/schema/shared';
import { ClaimsApplicationService } from '../claims-application';
import * as s3 from '../../utils/s3';
import { ClaimPdfService } from './index';
import { completeClaim } from '../../test/fixtures';

// Test database connection
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;

const createdUserIds: string[] = [];
const createdClaimIds: string[] = [];

// 1x1 transparent PNG (same fixture used across claim-pdf tests).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('ClaimPdfService', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET =
      'test-jwt-secret-key-for-testing-purposes-only-32-chars';

    testClient = postgres(TEST_DATABASE_URL, { max: 5 });
    testDb = drizzle(testClient, { schema });
  });

  afterAll(async () => {
    await cleanupTestData();
    await testClient.end();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestData();
    createdUserIds.length = 0;
    createdClaimIds.length = 0;
  });

  beforeEach(() => {
    vi.spyOn(s3, 'downloadFile').mockResolvedValue(PNG_1X1);
    vi.spyOn(s3, 'uploadFile').mockResolvedValue(undefined);
  });

  async function cleanupTestData() {
    try {
      for (const claimId of createdClaimIds) {
        await testClient`
          DELETE FROM claims.claim_documents WHERE claim_id = ${claimId}::uuid
        `;
        await testClient`
          DELETE FROM claims.claim_workflow_states WHERE claim_id = ${claimId}::uuid
        `;
        await testClient`
          DELETE FROM claims.claims WHERE id = ${claimId}::uuid
        `;
      }

      for (const userId of createdUserIds) {
        await testClient`
          DELETE FROM claims.claim_documents
          WHERE claim_id IN (SELECT id FROM claims.claims WHERE user_id = ${userId}::uuid)
        `;
        await testClient`
          DELETE FROM claims.claim_workflow_states
          WHERE claim_id IN (SELECT id FROM claims.claims WHERE user_id = ${userId}::uuid)
        `;
        await testClient`
          DELETE FROM claims.claims WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.audit_logs WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.signatures WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.documents WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.profiles WHERE user_id = ${userId}::uuid
        `;
        await testClient`
          DELETE FROM shared.users WHERE id = ${userId}::uuid
        `;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  async function createTestUser(): Promise<string> {
    const testEmail = `test-claim-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    const [user] = await testDb
      .insert(users)
      .values({
        email: testEmail,
        emailVerified: true,
        authProvider: 'magic_link',
      })
      .returning();

    await testDb.insert(profiles).values({
      userId: user.id,
      firstName: 'Test',
      lastName: 'User',
    });

    createdUserIds.push(user.id);
    return user.id;
  }

  async function createTestDocument(
    userId: string,
    role: string = 'passport'
  ): Promise<string> {
    const [doc] = await testDb
      .insert(documents)
      .values({
        userId,
        fileName: `test-${role}.png`,
        fileType: 'image/png',
        fileSize: 1024,
        s3Key: `test/${userId}/${role}.png`,
        documentType: role,
        status: 'completed',
      })
      .returning();

    return doc.id;
  }

  async function createTestSignature(userId: string): Promise<string> {
    const [sig] = await testDb
      .insert(signatures)
      .values({
        userId,
        signatureData: `data:image/png;base64,${PNG_1X1.toString('base64')}`,
        isActive: true,
      })
      .returning();

    return sig.id;
  }

  async function createCompletePdfReadyClaim(
    overrides: Record<string, unknown> = {}
  ): Promise<{ userId: string; claimId: string }> {
    const userId = await createTestUser();
    const created = await ClaimsApplicationService.createClaim(userId);
    createdClaimIds.push(created.id);

    await ClaimsApplicationService.updateClaim(created.id, userId, {
      ...completeClaim,
      svNummer: 'AB12334567',
      iban: 'DE89370400440532013000',
      ...overrides,
    } as any);

    const passportId = await createTestDocument(userId, 'passport');
    await ClaimsApplicationService.addDocument(
      created.id,
      userId,
      passportId,
      'passport'
    );

    const signatureId = await createTestSignature(userId);
    await ClaimsApplicationService.attachSignature(
      created.id,
      userId,
      signatureId
    );

    return { userId, claimId: created.id };
  }

  describe('generateAndStoreForClaim', () => {
    it('assembles, uploads, and stores the combined claim PDF', async () => {
      const { userId, claimId } = await createCompletePdfReadyClaim();

      const result = await ClaimPdfService.generateAndStoreForClaim(
        claimId,
        userId
      );

      expect(result.pdfS3Key).toMatch(
        /^claims\/.+\/vbl-claim-package-\d+\.pdf$/
      );
      expect(result.bytes).toBeInstanceOf(Uint8Array);

      expect(s3.uploadFile).toHaveBeenCalledTimes(1);
      const uploadCall = vi.mocked(s3.uploadFile).mock.calls[0];
      expect(uploadCall[0]).toBe(result.pdfS3Key);
      expect(uploadCall[2]).toBe('application/pdf');

      // Uploaded bytes must be a parseable PDF and match the returned bytes.
      const uploadedBuffer = uploadCall[1] as Buffer;
      const parsed = await PDFDocument.load(uploadedBuffer);
      expect(parsed.getPageCount()).toBeGreaterThan(0);
      expect(Buffer.from(result.bytes).equals(uploadedBuffer)).toBe(true);

      const [row] = await testDb
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.id, claimId))
        .limit(1);
      expect((row as any).pdfS3Key).toBe(result.pdfS3Key);
    });

    it('rejects when a required field (iban) is missing, listing it in the error', async () => {
      const { userId, claimId } = await createCompletePdfReadyClaim({
        iban: null,
      });

      await expect(
        ClaimPdfService.generateAndStoreForClaim(claimId, userId)
      ).rejects.toThrow(/iban/i);
    });
  });
});
