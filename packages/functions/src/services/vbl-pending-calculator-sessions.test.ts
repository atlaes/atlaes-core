import { describe, it, expect, beforeEach } from 'vitest';
import { VBLPendingCalculatorSessionsService } from './vbl-pending-calculator-sessions';
import { db } from '../utils/db';
import { pendingCalculatorSessions } from '../drizzle/schema/vbl';
import { eq } from 'drizzle-orm';

describe('VBLPendingCalculatorSessionsService', () => {
  beforeEach(async () => {
    await db.delete(pendingCalculatorSessions);
  });

  describe('create', () => {
    it('creates a session with a token and 7-day expiry', async () => {
      const session = await VBLPendingCalculatorSessionsService.create({
        jobs: [{ employmentType: 'Private sector', companyPension: 'BVV' }],
        calculationResult: { totalRefund: 1000, breakdown: [], totalMonths: 24 },
        scenario: 'private_may_be_possible',
        claimTypes: ['private'],
        privateProvider: 'BVV',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      });

      expect(session.token).toMatch(/^[0-9a-f-]{36}$/);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000 + 1000);
    });
  });

  describe('getByToken', () => {
    it('returns the session when token matches and not expired', async () => {
      const created = await VBLPendingCalculatorSessionsService.create({
        jobs: [],
        scenario: 'eligible',
        claimTypes: ['public'],
      });
      const fetched = await VBLPendingCalculatorSessionsService.getByToken(created.token);
      expect(fetched?.id).toBe(created.id);
    });

    it('returns null when token does not exist', async () => {
      const fetched = await VBLPendingCalculatorSessionsService.getByToken(
        '00000000-0000-0000-0000-000000000000'
      );
      expect(fetched).toBeNull();
    });

    it('returns null when session is expired', async () => {
      const created = await VBLPendingCalculatorSessionsService.create({ jobs: [], claimTypes: [] });
      // Manually expire
      await db
        .update(pendingCalculatorSessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(pendingCalculatorSessions.id, created.id));
      const fetched = await VBLPendingCalculatorSessionsService.getByToken(created.token);
      expect(fetched).toBeNull();
    });
  });

  describe('linkEmail', () => {
    it('attaches an email to an existing session', async () => {
      const created = await VBLPendingCalculatorSessionsService.create({ jobs: [], claimTypes: [] });
      const linked = await VBLPendingCalculatorSessionsService.linkEmail(
        created.token,
        'test@example.com'
      );
      expect(linked?.email).toBe('test@example.com');
    });

    it('returns null for unknown token', async () => {
      const linked = await VBLPendingCalculatorSessionsService.linkEmail(
        '00000000-0000-0000-0000-000000000000',
        'test@example.com'
      );
      expect(linked).toBeNull();
    });
  });
});
