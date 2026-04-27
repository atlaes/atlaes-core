import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { VBLPendingCalculatorSessionsService } from '../services/vbl-pending-calculator-sessions';
import { logger } from '../utils/logger';

const createSchema = z.object({
  jobs: z.array(z.record(z.unknown())),
  calculationResult: z
    .object({
      totalRefund: z.number(),
      breakdown: z.array(z.unknown()),
      totalMonths: z.number(),
    })
    .nullable()
    .optional(),
  scenario: z.string().max(64).optional(),
  dateOfBirth: z.string().optional(),
  currentAge: z.number().int().optional(),
  userType: z.string().max(32).optional(),
  pensionProvider: z.string().max(100).optional(),
  claimTypes: z.array(z.string()).default([]),
  publicStageProvider: z.string().max(100).optional(),
  privateProvider: z.string().max(100).optional(),
});

const linkEmailSchema = z.object({
  email: z.string().email(),
});

const router = new Hono();

router.post('/', zValidator('json', createSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const ipAddress =
      c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const userAgent = c.req.header('user-agent') ?? 'unknown';

    const session = await VBLPendingCalculatorSessionsService.create({
      ...input,
      ipAddress,
      userAgent,
    });

    return c.json({ success: true, token: session.token }, 201);
  } catch (error) {
    logger.error('VBL pending calculator session create error:', error);
    return c.json({ success: false, error: 'Failed to save session' }, 500);
  }
});

router.get('/:token', async (c) => {
  const token = c.req.param('token');
  const session = await VBLPendingCalculatorSessionsService.getByToken(token);
  if (!session) {
    return c.json(
      { success: false, error: 'Session not found or expired' },
      404
    );
  }
  return c.json({ success: true, session });
});

router.patch('/:token/email', zValidator('json', linkEmailSchema), async (c) => {
  const token = c.req.param('token');
  const { email } = c.req.valid('json');
  const session = await VBLPendingCalculatorSessionsService.linkEmail(
    token,
    email
  );
  if (!session) {
    return c.json({ success: false, error: 'Session not found' }, 404);
  }
  return c.json({ success: true, session });
});

export default router;
