import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { optionalAuthMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limiter';
import {
  ContractWithdrawalService,
  WithdrawalNotFoundError,
  WithdrawalDuplicateError,
  WITHDRAWAL_NOT_FOUND_MESSAGE,
} from '../services/contract-withdrawal';

const withdrawals = new Hono();

// ============================================================
// Validation Schemas
// ============================================================

const identifySchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  claimId: z.string().min(1).max(100),
  pensionTypeOrInstitution: z.string().min(1).max(255),
});

// Confirm accepts the identify payload again (public path) OR just the claimId
// (authenticated owner). fullName/email are optional so an authenticated user
// need not re-enter them; the service enforces the public-path re-match.
const confirmSchema = z.object({
  claimId: z.string().min(1).max(100),
  fullName: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  pensionTypeOrInstitution: z.string().max(255).optional(),
});

// ============================================================
// Public identification
// ============================================================

// Stricter per-route limiter on the public identify endpoint (on top of the
// global limiter) — it takes untrusted input and probes for claims.
withdrawals.post(
  '/identify',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }),
  zValidator('json', identifySchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const contract = await ContractWithdrawalService.identify(input);

      if (!contract) {
        // Never reveal which field (or whether the claim) matched.
        return c.json(
          { success: false, error: WITHDRAWAL_NOT_FOUND_MESSAGE },
          404
        );
      }

      return c.json({ success: true, contract });
    } catch (error) {
      logger.error('Withdrawal identify error:', error);
      return c.json(
        { success: false, error: 'Failed to identify contract' },
        500
      );
    }
  }
);

// ============================================================
// Shared confirmation (public + logged-in)
// ============================================================

withdrawals.post(
  '/confirm',
  optionalAuthMiddleware,
  zValidator('json', confirmSchema),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const user = c.get('user'); // undefined on the public path

      const result = await ContractWithdrawalService.confirm({
        claimId: body.claimId,
        actorUserId: user?.id,
        fullName: body.fullName,
        email: body.email,
        pensionTypeOrInstitution: body.pensionTypeOrInstitution,
      });

      // Confirmation email — best-effort. A delivery failure must not fail the
      // withdrawal (the record is already committed).
      try {
        const { sendContractWithdrawalEmail } =
          await import('../services/email');
        await sendContractWithdrawalEmail(result.emailUsed, {
          fullName: result.contract.fullName,
          claimId: result.contract.claimId,
          pensionTypeOrInstitution: result.contract.pensionTypeOrInstitution,
          declarationText: result.contract.declarationText,
          receivedAt: new Date(),
          applicationAlreadySubmitted:
            result.contract.applicationAlreadySubmitted,
        });
      } catch (emailError) {
        logger.warn('Failed to send contract-withdrawal email', {
          claimId: result.contract.claimId,
          error:
            emailError instanceof Error
              ? emailError.message
              : String(emailError),
        });
      }

      return c.json({
        success: true,
        contract: result.contract,
        message: 'Withdrawal received',
      });
    } catch (error) {
      if (error instanceof WithdrawalDuplicateError) {
        return c.json({ success: false, error: error.message }, 409);
      }
      if (error instanceof WithdrawalNotFoundError) {
        // Same generic message as identify — never reveal the reason.
        return c.json({ success: false, error: error.message }, 404);
      }
      logger.error('Withdrawal confirm error:', error);
      return c.json(
        { success: false, error: 'Failed to confirm withdrawal' },
        500
      );
    }
  }
);

export default withdrawals;
