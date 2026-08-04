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
import { createHash } from 'crypto';
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

// Mock fetch so no real request ever reaches the vendor — a live POST in
// test mode would still create a real (if unbilled) cart entry.
const fetchMock = vi.fn();

function okResponse(id = 6035143, status = 'queue') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: 200,
      message: 'OK',
      data: { id, status },
    }),
  };
}

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

/** Sets both halves of the credential pair plus a mode. */
function configureCredentials(mode: 'test' | 'live' | 'off') {
  process.env.LETTERSHOP_API_KEY = 'fake-api-key';
  process.env.LETTERSHOP_API_SECRET = 'fake-api-secret';
  process.env.LETTERSHOP_MODE = mode;
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
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    delete process.env.LETTERSHOP_API_KEY;
    delete process.env.LETTERSHOP_API_SECRET;
    delete process.env.LETTERSHOP_API_BASE_URL;
    delete process.env.LETTERSHOP_MODE;
    await cleanupTestData();
    createdUserIds.length = 0;
    createdClaimIds.length = 0;
    vi.resetModules();
  });

  beforeEach(() => {
    fetchMock.mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  describe('buildOriginalFilename', () => {
    it('builds a traceable filename without the retired 13-digit filecode', async () => {
      const { LettershopService } = await import('./lettershop');
      const filename = LettershopService.buildOriginalFilename('abc-123');

      expect(filename).toMatch(/^vbl-claim-abc-123-\d+\.pdf$/);
      // The vendor rejected 'TESTMODE-vbl-...' filenames on the SFTP
      // interface; print parameters now live in `specification` instead.
      expect(filename).not.toContain('TESTMODE');
      expect(filename).not.toMatch(/^\d{13}-/);
    });

    it('produces unique filenames across calls (timestamp-based)', async () => {
      const { LettershopService } = await import('./lettershop');
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      const first = LettershopService.buildOriginalFilename('claim-1');
      vi.setSystemTime(2000);
      const second = LettershopService.buildOriginalFilename('claim-1');
      vi.useRealTimers();

      expect(first).not.toBe(second);
      expect(first).toContain('-1000.pdf');
      expect(second).toContain('-2000.pdf');
    });
  });

  describe('sendClaimPdf', () => {
    it('returns null and never calls the API when unconfigured', async () => {
      delete process.env.LETTERSHOP_API_KEY;
      delete process.env.LETTERSHOP_API_SECRET;

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns null when only one half of the credential pair is set', async () => {
      process.env.LETTERSHOP_API_KEY = 'fake-api-key';
      delete process.env.LETTERSHOP_API_SECRET;
      process.env.LETTERSHOP_MODE = 'live';

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns null when LETTERSHOP_MODE is off, even with credentials present', async () => {
      configureCredentials('off');

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('posts the PDF, stores the printjob id, and audit-logs it', async () => {
      configureCredentials('live');

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);
      const pdfBytes = new Uint8Array([1, 2, 3, 4]);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        pdfBytes,
        userId
      );

      expect(result).toEqual({ submissionId: '6035143' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.onlinebrief24.de/v1/printjobs');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');

      const sent = JSON.parse(init.body);
      expect(sent.auth).toEqual({
        apiKey: 'fake-api-key',
        apiSecret: 'fake-api-secret',
        mode: 'live',
      });
      expect(sent.letter.base64_file).toBe(
        Buffer.from(pdfBytes).toString('base64')
      );
      expect(sent.letter.specification).toEqual({
        color: '4',
        mode: 'simplex',
        shipping: 'national',
        c4: 0,
      });
      expect(sent.letter.filename_original).toMatch(
        new RegExp(`^vbl-claim-${claimId}-\\d+\\.pdf$`)
      );

      const [row] = await testDb
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.id, claimId))
        .limit(1);
      expect((row as any).lettershopSubmissionId).toBe('6035143');

      const logs = await testDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, claimId));
      const lettershopLog = logs.find(
        (l: any) => l.action === 'lettershop_submitted'
      );
      expect(lettershopLog).toBeDefined();
      expect((lettershopLog as any).userId).toBe(userId);
      expect((lettershopLog as any).details.mode).toBe('live');
    });

    it('checksums the base64 string, not the raw PDF bytes', async () => {
      configureCredentials('live');

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);
      const pdfBytes = new Uint8Array([1, 2, 3, 4]);

      await LettershopService.sendClaimPdf(claimId, pdfBytes, userId);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      const base64 = Buffer.from(pdfBytes).toString('base64');

      expect(sent.letter.base64_file_checksum).toBe(
        createHash('md5').update(base64).digest('hex')
      );
      // Guard against the easy mistake of hashing the decoded bytes.
      expect(sent.letter.base64_file_checksum).not.toBe(
        createHash('md5').update(Buffer.from(pdfBytes)).digest('hex')
      );
    });

    it('passes mode=test through so the order parks in the vendor cart', async () => {
      configureCredentials('test');
      // 'draft' is the vendor's own word for "sitting in the Warenkorb"
      // (doc §4, GET /v1/printjobs filters) — the proof that auth.mode
      // took effect rather than just being accepted.
      fetchMock.mockResolvedValue(okResponse(6035143, 'draft'));

      const { LettershopService } = await import('./lettershop');
      const { logger } = await import('../utils/logger');
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.auth.mode).toBe('test');

      // A cart entry is still a real printjob id worth recording — it is
      // what someone needs to find or release the order in the Kundencenter.
      expect(result).toEqual({ submissionId: '6035143' });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('screams when a test-mode job comes back queued for production', async () => {
      configureCredentials('test');
      // The failure that costs money: auth.mode said 'test', but the job
      // is in the production queue, not the cart.
      fetchMock.mockResolvedValue(okResponse(6035143, 'queue'));

      const { LettershopService } = await import('./lettershop');
      const { logger } = await import('../utils/logger');
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const result = await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Lettershop job landed in an unexpected state',
        expect.objectContaining({
          mode: 'test',
          jobStatus: 'queue',
          expectedStatus: 'draft',
          headedForProduction: true,
        })
      );

      // Reported, not thrown: the job exists on their side either way, and
      // the id is what a human needs to delete it inside the 15-minute
      // window. Throwing would lose the id and invite a duplicate send.
      expect(result).toEqual({ submissionId: '6035143' });

      const [claim] = await testDb
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.id, claimId))
        .limit(1);
      expect((claim as any).lettershopSubmissionId).toBe('6035143');
    });

    it('honours a LETTERSHOP_API_BASE_URL override', async () => {
      configureCredentials('test');
      process.env.LETTERSHOP_API_BASE_URL = 'https://api.example.test/v1';

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      await LettershopService.sendClaimPdf(
        claimId,
        new Uint8Array([1, 2, 3]),
        userId
      );

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.example.test/v1/printjobs'
      );
    });

    it('throws on an auth failure even though it arrives without a status field', async () => {
      configureCredentials('live');

      // Exactly what the vendor returns for bad credentials.
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized.' }),
      });

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      await expect(
        LettershopService.sendClaimPdf(
          claimId,
          new Uint8Array([1, 2, 3]),
          userId
        )
      ).rejects.toThrow(/Unauthorized/);

      const [row] = await testDb
        .select()
        .from(claimsTable)
        .where(eq(claimsTable.id, claimId))
        .limit(1);
      expect((row as any).lettershopSubmissionId).toBeNull();
    });

    it('throws when the body reports a non-200 status despite HTTP 200', async () => {
      configureCredentials('live');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 400, message: 'Bad Request' }),
      });

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      await expect(
        LettershopService.sendClaimPdf(
          claimId,
          new Uint8Array([1, 2, 3]),
          userId
        )
      ).rejects.toThrow(/Bad Request/);
    });

    it('throws when a 200 response carries no printjob id', async () => {
      configureCredentials('live');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, message: 'OK', data: {} }),
      });

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      await expect(
        LettershopService.sendClaimPdf(
          claimId,
          new Uint8Array([1, 2, 3]),
          userId
        )
      ).rejects.toThrow(/rejected the job/);
    });

    it('rejects a PDF over the vendor 50 MB limit before sending it', async () => {
      configureCredentials('live');

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const oversized = new Uint8Array(50 * 1024 * 1024 + 1);

      await expect(
        LettershopService.sendClaimPdf(claimId, oversized, userId)
      ).rejects.toThrow(/over the vendor's/);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    // The doc caps the REQUEST at 50 MB, and the request carries base64,
    // which is ~4/3 the size of the PDF. A 40 MB PDF is therefore already
    // a ~53 MB request — under a raw-bytes guard it would have been sent.
    it('rejects a PDF that only exceeds 50 MB once base64-encoded', async () => {
      configureCredentials('live');

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      const underRawLimit = new Uint8Array(40 * 1024 * 1024);
      expect(underRawLimit.byteLength).toBeLessThan(50 * 1024 * 1024);

      await expect(
        LettershopService.sendClaimPdf(claimId, underRawLimit, userId)
      ).rejects.toThrow(/base64 bytes/);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('propagates network errors', async () => {
      configureCredentials('live');

      fetchMock.mockRejectedValue(new Error('network unreachable'));

      const { LettershopService } = await import('./lettershop');
      const userId = await createTestUser();
      const claimId = await createTestClaim(userId);

      await expect(
        LettershopService.sendClaimPdf(
          claimId,
          new Uint8Array([1, 2, 3]),
          userId
        )
      ).rejects.toThrow(/network unreachable/);
    });
  });
});
