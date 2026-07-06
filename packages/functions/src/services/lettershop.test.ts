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
import * as schema from '../drizzle/schema';
import { claimsTable } from '../drizzle/schema/claims';
import { users, profiles, auditLogs } from '../drizzle/schema/shared';
import { ClaimsApplicationService } from './claims-application';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://vbl_user:vbl_password@localhost:5432/vbl_development';

let testClient: ReturnType<typeof postgres>;
let testDb: ReturnType<typeof drizzle>;

const createdUserIds: string[] = [];
const createdClaimIds: string[] = [];

// Mock ssh2-sftp-client so no real network connection is ever attempted.
const connectMock = vi.fn();
const putMock = vi.fn();
const endMock = vi.fn();

vi.mock('ssh2-sftp-client', () => {
  class MockSftpClient {
    connect = connectMock;
    put = putMock;
    end = endMock;
  }
  return { default: MockSftpClient };
});

async function createTestUser(): Promise<string> {
  const testEmail = `test-lettershop-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  const [user] = await testDb
    .insert(users)
    .values({
      email: testEmail,
      emailVerified: true,
      authProvider: 'magic_link',
    })
    .returning();

  await testDb.insert(profiles).values({
    userId: (user as any).id,
    firstName: 'Test',
    lastName: 'User',
  });

  createdUserIds.push((user as any).id);
  return (user as any).id;
}

async function createTestClaim(userId: string): Promise<string> {
  const created = await ClaimsApplicationService.createClaim(userId);
  createdClaimIds.push(created.id);
  return created.id;
}

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

describe('LettershopService', () => {
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
    connectMock.mockReset();
    putMock.mockReset();
    endMock.mockReset();
    delete process.env.LETTERSHOP_SFTP_HOST;
    delete process.env.LETTERSHOP_SFTP_PORT;
    delete process.env.LETTERSHOP_SFTP_USER;
    delete process.env.LETTERSHOP_SFTP_PASSWORD;
    delete process.env.LETTERSHOP_SFTP_PRIVATE_KEY_PATH;
    delete process.env.LETTERSHOP_MODE;
    await cleanupTestData();
    createdUserIds.length = 0;
    createdClaimIds.length = 0;
    vi.resetModules();
  });

  beforeEach(() => {
    connectMock.mockResolvedValue(undefined);
    putMock.mockResolvedValue(undefined);
    endMock.mockResolvedValue(undefined);
  });

  describe('buildFilename', () => {
    it('builds a live filename with the vendor 13-digit parameter prefix', async () => {
      const { LettershopService } = await import('./lettershop');
      const claimId = 'abc-123';
      const filename = LettershopService.buildFilename(claimId, 'live');

      expect(filename).toMatch(/^1001000000000-vbl-claim-abc-123-\d+\.pdf$/);
    });

    it('builds a test-mode filename with the deliberately invalid TESTMODE prefix', async () => {
      const { LettershopService } = await import('./lettershop');
      const claimId = 'abc-123';
      const filename = LettershopService.buildFilename(claimId, 'test');

      expect(filename).toMatch(/^TESTMODE-vbl-claim-abc-123-\d+\.pdf$/);
    });

    it('only ever produces filenames matching the vendor-allowed character set', async () => {
      const { LettershopService } = await import('./lettershop');
      const liveFilename = LettershopService.buildFilename('claim-1', 'live');
      const testFilename = LettershopService.buildFilename('claim-1', 'test');

      const allowed = /^[A-Za-z0-9.\-_#]+\.pdf$/;
      expect(liveFilename).toMatch(allowed);
      expect(testFilename).toMatch(allowed);
    });

    it('produces unique filenames across calls (timestamp-based)', async () => {
      const { LettershopService } = await import('./lettershop');
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      const first = LettershopService.buildFilename('claim-1', 'live');
      vi.setSystemTime(2000);
      const second = LettershopService.buildFilename('claim-1', 'live');
      vi.useRealTimers();

      expect(first).not.toBe(second);
      expect(first).toContain('-1000.pdf');
      expect(second).toContain('-2000.pdf');
    });
  });

  describe('sendClaimPdf', () => {
    it('returns null and never constructs the SFTP client when unconfigured (mode defaults off)', async () => {
      delete process.env.LETTERSHOP_SFTP_HOST;
      delete process.env.LETTERSHOP_SFTP_USER;
      delete process.env.LETTERSHOP_MODE;

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(result).toBeNull();
      expect(connectMock).not.toHaveBeenCalled();
      expect(putMock).not.toHaveBeenCalled();
    });

    it('returns null when LETTERSHOP_MODE is explicitly off, even with credentials present', async () => {
      process.env.LETTERSHOP_SFTP_HOST = 'api.onlinebrief24.de';
      process.env.LETTERSHOP_SFTP_USER = 'test@example.com';
      process.env.LETTERSHOP_SFTP_PASSWORD = 'fake-password';
      process.env.LETTERSHOP_MODE = 'off';

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(result).toBeNull();
      expect(connectMock).not.toHaveBeenCalled();
    });

    it('uploads the PDF via SFTP, stores the submission id, and audit-logs it (test mode)', async () => {
      process.env.LETTERSHOP_SFTP_HOST = 'api.onlinebrief24.de';
      process.env.LETTERSHOP_SFTP_USER = 'test@example.com';
      process.env.LETTERSHOP_SFTP_PASSWORD = 'fake-password';
      process.env.LETTERSHOP_MODE = 'test';

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3, 4]),
        userId
      );

      expect(result).not.toBeNull();
      expect(result!.submissionId).toMatch(
        new RegExp(`^TESTMODE-vbl-claim-${claimId}-\\d+\\.pdf$`)
      );

      expect(connectMock).toHaveBeenCalledTimes(1);
      const authConfig = connectMock.mock.calls[0][0];
      expect(authConfig.host).toBe('api.onlinebrief24.de');
      expect(authConfig.username).toBe('test@example.com');
      expect(authConfig.password).toBe('fake-password');

      expect(putMock).toHaveBeenCalledTimes(1);
      const putCall = putMock.mock.calls[0];
      expect(putCall[0]).toBeInstanceOf(Buffer);
      expect(putCall[1]).toBe(`/upload/api/${result!.submissionId}`);

      expect(endMock).toHaveBeenCalledTimes(1);

      const [row] = await testDb
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.id, claimId))
        .limit(1);
      expect((row as any).lettershopSubmissionId).toBe(result!.submissionId);

      const logs = await testDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, claimId));
      const lettershopLog = logs.find(
        (l: any) => l.action === 'lettershop_submitted'
      );
      expect(lettershopLog).toBeDefined();
      expect((lettershopLog as any).userId).toBe(userId);
    });

    it('calls end() even when put() rejects, and propagates the error', async () => {
      process.env.LETTERSHOP_SFTP_HOST = 'api.onlinebrief24.de';
      process.env.LETTERSHOP_SFTP_USER = 'test@example.com';
      process.env.LETTERSHOP_SFTP_PASSWORD = 'fake-password';
      process.env.LETTERSHOP_MODE = 'test';

      putMock.mockRejectedValue(new Error('upload failed'));

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      await expect(
        LettershopService.sendClaimPdf(
          claimId,
          new Uint8Array([1, 2, 3]),
          userId
        )
      ).rejects.toThrow(/upload failed/);

      expect(endMock).toHaveBeenCalledTimes(1);
    });
  });
});
