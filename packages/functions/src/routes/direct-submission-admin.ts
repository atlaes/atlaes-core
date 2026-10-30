/**
 * Direct client submission of DRV refund cases and of KVBW ZVK / VddB /
 * VddKO refunds (owner specs 29 Oct 2026).
 * Mounted at /api/admin/direct-submission; auth + admin like
 * routes/admin.ts. See services/direct-submission.ts for the rules.
 *
 *   GET  /claims/:id                    state: route, missing data, pack,
 *                                       release, dispatch, release blockers
 *   POST /claims/:id/generate           (re)build the direct pack and store
 *                                       it on the case (before release)
 *   GET  /claims/:id/download           presigned URL of the stored pack
 *                                       (preview; never marks submitted)
 *   POST /claims/:id/release            release the completed pack for
 *                                       dispatch (409 with blockers)
 *   POST /claims/:id/release/withdraw   { note? } — before the dispatch
 *   POST /claims/:id/dispatch           { sender, method, date, note? } —
 *                                       actual submission → submitted
 *   POST /claims/:id/payment-confirmed  { date, note? } — client confirmed
 *                                       the refund arrived
 *   PUT  /claims/:id/benefit            { benefit | null } — VddB/VddKO
 *                                       benefit applied for (form field 1)
 */

import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validateUuidParams } from '../middleware/validate-uuid';
import { logger, toErrorMeta } from '../utils/logger';
import { STAGE_BENEFITS } from '../services/provider-refund/providers';
import {
  DISPATCH_METHODS,
  DirectSubmissionError,
  DirectSubmissionService,
  type Actor,
} from '../services/direct-submission';

const router = new Hono();
router.use('*', authMiddleware, adminMiddleware);

const actorOf = (c: Context): Actor => {
  const u = c.get('user') as { id: string; email: string };
  return { id: u.id, email: u.email };
};

function fail(c: Context, error: unknown, label: string) {
  if (error instanceof DirectSubmissionError) {
    return c.json(
      { success: false, error: error.message, details: error.details },
      error.status
    );
  }
  logger.error(`[DirectSubmission] ${label} failed`, toErrorMeta(error));
  return c.json({ success: false, error: `${label} failed` }, 500);
}

async function json(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const id = (c: Context) => c.req.param('id') as string;

router.get('/claims/:id', validateUuidParams('id'), async (c) => {
  try {
    return c.json({
      success: true,
      state: await DirectSubmissionService.getState(id(c)),
    });
  } catch (error) {
    return fail(c, error, 'Loading the direct submission');
  }
});

router.post('/claims/:id/generate', validateUuidParams('id'), async (c) => {
  try {
    return c.json({
      success: true,
      state: await DirectSubmissionService.generate(id(c), actorOf(c)),
    });
  } catch (error) {
    return fail(c, error, 'Generating the direct pack');
  }
});

router.get('/claims/:id/download', validateUuidParams('id'), async (c) => {
  try {
    return c.json({
      success: true,
      ...(await DirectSubmissionService.downloadUrl(id(c), actorOf(c))),
    });
  } catch (error) {
    return fail(c, error, 'Downloading the direct pack');
  }
});

router.post('/claims/:id/release', validateUuidParams('id'), async (c) => {
  try {
    return c.json({
      success: true,
      state: await DirectSubmissionService.release(id(c), actorOf(c)),
    });
  } catch (error) {
    return fail(c, error, 'Releasing the direct pack');
  }
});

router.post(
  '/claims/:id/release/withdraw',
  validateUuidParams('id'),
  async (c) => {
    const parsed = z
      .object({ note: z.string().trim().max(1000).nullish() })
      .safeParse(await json(c));
    if (!parsed.success)
      return c.json({ success: false, error: 'Invalid note' }, 400);
    try {
      return c.json({
        success: true,
        state: await DirectSubmissionService.withdrawRelease(
          id(c),
          actorOf(c),
          parsed.data.note ?? null
        ),
      });
    } catch (error) {
      return fail(c, error, 'Withdrawing the release');
    }
  }
);

const dispatchSchema = z.object({
  sender: z.string().trim().min(1, 'Enter who sent the pack').max(200),
  method: z.enum(DISPATCH_METHODS),
  date: isoDate,
  note: z.string().trim().max(1000).nullish(),
});

router.post('/claims/:id/dispatch', validateUuidParams('id'), async (c) => {
  const parsed = dispatchSchema.safeParse(await json(c));
  if (!parsed.success)
    return c.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
        details: parsed.error.flatten(),
      },
      400
    );
  try {
    return c.json({
      success: true,
      state: await DirectSubmissionService.recordDispatch(
        id(c),
        actorOf(c),
        parsed.data
      ),
    });
  } catch (error) {
    return fail(c, error, 'Recording the dispatch');
  }
});

router.post(
  '/claims/:id/payment-confirmed',
  validateUuidParams('id'),
  async (c) => {
    const parsed = z
      .object({ date: isoDate, note: z.string().trim().max(1000).nullish() })
      .safeParse(await json(c));
    if (!parsed.success)
      return c.json(
        { success: false, error: 'Enter the date (YYYY-MM-DD)' },
        400
      );
    try {
      return c.json({
        success: true,
        state: await DirectSubmissionService.confirmPayment(
          id(c),
          actorOf(c),
          parsed.data
        ),
      });
    } catch (error) {
      return fail(c, error, 'Recording the payment confirmation');
    }
  }
);

const benefitSchema = z.object({ benefit: z.enum(STAGE_BENEFITS).nullable() });

router.put('/claims/:id/benefit', validateUuidParams('id'), async (c) => {
  const parsed = benefitSchema.safeParse(await json(c));
  if (!parsed.success)
    return c.json({ success: false, error: 'Unknown benefit' }, 400);
  try {
    return c.json({
      success: true,
      state: await DirectSubmissionService.setBenefit(
        id(c),
        actorOf(c),
        parsed.data.benefit
      ),
    });
  } catch (error) {
    return fail(c, error, 'Saving the benefit');
  }
});

export default router;
