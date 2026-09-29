/**
 * Admin side of the client-update engine: case fields, warnings, contact
 * log CRUD, draft tasks (pick template part, fill placeholders, send),
 * office actions, decision/funds events and a manual daily run.
 * Mounted at /api/admin/client-updates; auth + admin like routes/admin.ts.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validateUuidParams } from '../middleware/validate-uuid';
import { ClientUpdatesService } from '../services/client-updates';
import {
  CLIENT_UPDATE_TEMPLATES,
  CONTACT_CHANNELS,
  CONTACT_TYPES,
  INFO_REQUEST_SOURCES,
  M4_STATUS_PARAGRAPHS,
  OFFICE_ACTION_TYPES,
} from '../drizzle/schema/client-updates';

const router = new Hono();

router.use('*', authMiddleware, adminMiddleware);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const stringMap = z.record(z.string(), z.string().nullable());

function actorOf(c: any) {
  const user = c.get('user');
  return { id: user.id as string, email: user.email as string };
}

function fail(c: any, error: unknown, label: string) {
  const message = error instanceof Error ? error.message : 'Request failed';
  if (/not found/i.test(message) || /^No application/.test(message)) {
    return c.json({ success: false, error: message }, 404);
  }
  if (/needs|not open|Not an|Invalid|Rescheduling/.test(message)) {
    return c.json({ success: false, error: message }, 400);
  }
  logger.error(`${label} error:`, toErrorMeta(error));
  return c.json({ success: false, error: 'Request failed' }, 500);
}

/** Zod parse with a 400 on failure; avoids zValidator after validateUuidParams. */
async function parseJson<T extends z.ZodTypeAny>(
  c: any,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: Response }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      res: c.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        400
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

// ---------------------------------------------------------------------------
// Warnings and tasks (dashboard)
// ---------------------------------------------------------------------------

/** GET /warnings → [{ claimId, claimant, kind, since, detail }] */
router.get('/warnings', async (c) => {
  try {
    const warnings = await ClientUpdatesService.listWarnings();
    return c.json({ success: true, warnings });
  } catch (error) {
    return fail(c, error, 'Client-update warnings');
  }
});

/** GET /tasks?status=open&claimId=&assignedTo= */
router.get('/tasks', async (c) => {
  try {
    const tasks = await ClientUpdatesService.listTasks({
      status: c.req.query('status') || undefined,
      claimId: c.req.query('claimId') || undefined,
      assignedTo: c.req.query('assignedTo') || undefined,
    });
    return c.json({ success: true, tasks });
  } catch (error) {
    return fail(c, error, 'Client-update tasks');
  }
});

router.get('/tasks/:taskId', validateUuidParams('taskId'), async (c) => {
  try {
    const task = await ClientUpdatesService.getTask(c.req.param('taskId'));
    if (!task) return c.json({ success: false, error: 'Task not found' }, 404);
    return c.json({ success: true, task });
  } catch (error) {
    return fail(c, error, 'Client-update task');
  }
});

const draftPatchSchema = z.object({
  templateKey: z.enum(CLIENT_UPDATE_TEMPLATES).optional(),
  variables: stringMap.optional(),
  statusParagraph: z.enum(M4_STATUS_PARAGRAPHS).nullable().optional(),
  lastContactKind: z.enum(['confirmed', 'asked']).nullable().optional(),
  includeBlockB: z.boolean().optional(),
  draftSubject: z.string().max(300).optional(),
  draftBody: z.string().max(20000).optional(),
});

/** PATCH /tasks/:taskId — pick the template part / fill placeholders / edit text. */
router.patch('/tasks/:taskId', validateUuidParams('taskId'), async (c) => {
  const parsed = await parseJson(c, draftPatchSchema);
  if (!parsed.ok) return parsed.res;
  try {
    const task = await ClientUpdatesService.updateTaskDraft(
      c.req.param('taskId'),
      parsed.data,
      actorOf(c)
    );
    return c.json({ success: true, task });
  } catch (error) {
    return fail(c, error, 'Client-update draft edit');
  }
});

const sendSchema = z.object({
  promisedUpdateDate: isoDate.nullable().optional(),
  routineAcknowledgement: z.boolean().optional(),
  statedContactDates: z.array(isoDate).optional(),
});

/**
 * POST /tasks/:taskId/send — sends the draft to the client. 409 with
 * `problems` when a pre-send check fails; the task stays open.
 */
router.post('/tasks/:taskId/send', validateUuidParams('taskId'), async (c) => {
  const parsed = await parseJson(c, sendSchema);
  if (!parsed.ok) return parsed.res;
  try {
    const result = await ClientUpdatesService.sendTask(
      c.req.param('taskId'),
      actorOf(c),
      parsed.data
    );
    if (!result.sent) {
      return c.json({ success: false, ...result }, 409);
    }
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Client-update send');
  }
});

const completeSchema = z.object({
  complaintFiled: z.boolean(),
  note: z.string().max(5000).nullable().optional(),
});

/** POST /tasks/:taskId/complete — close a senior-review task (→ M6A / M6B). */
router.post(
  '/tasks/:taskId/complete',
  validateUuidParams('taskId'),
  async (c) => {
    const parsed = await parseJson(c, completeSchema);
    if (!parsed.ok) return parsed.res;
    try {
      const result = await ClientUpdatesService.completeTask(
        c.req.param('taskId'),
        actorOf(c),
        parsed.data
      );
      return c.json({ success: true, ...result });
    } catch (error) {
      return fail(c, error, 'Client-update review complete');
    }
  }
);

/** POST /run-daily — what the cron does, on demand. */
router.post('/run-daily', async (c) => {
  try {
    const result = await ClientUpdatesService.runDaily();
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Client-update daily run');
  }
});

// ---------------------------------------------------------------------------
// Per-claim case
// ---------------------------------------------------------------------------

/** GET /claims/:id → case fields, milestones, warnings, contacts, tasks, letters, templates */
router.get('/claims/:id', validateUuidParams('id'), async (c) => {
  try {
    const data = await ClientUpdatesService.getAdminCase(c.req.param('id'));
    return c.json({ success: true, ...data });
  } catch (error) {
    return fail(c, error, 'Client-update case');
  }
});

const caseFieldsSchema = z.object({
  pensionOffice: z.string().max(255).nullable().optional(),
  communicationOwner: z.string().max(100).nullable().optional(),
  communicationOwnerEmail: z.string().email().max(255).nullable().optional(),
  reviewerName: z.string().max(100).nullable().optional(),
  reviewerRole: z
    .enum(['head of customer service', 'managing director'])
    .nullable()
    .optional(),
  caseManagerSignature: z.string().max(2000).nullable().optional(),
  submissionDate: isoDate.nullable().optional(),
  openCustomerTask: z
    .object({
      id: z.string().uuid(),
      text: z.string().min(1).max(2000),
      dueDate: isoDate.nullable(),
      button: z.string().max(60),
      contactLogId: z.string().uuid().nullable(),
      createdAt: z.string(),
      documentsReceivedAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

/** PATCH /claims/:id — case fields (owner, office, reviewer, signature, posting date). */
router.patch('/claims/:id', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(c, caseFieldsSchema);
  if (!parsed.ok) return parsed.res;
  try {
    const row = await ClientUpdatesService.updateCaseFields(
      c.req.param('id'),
      parsed.data,
      actorOf(c)
    );
    return c.json({ success: true, case: row });
  } catch (error) {
    return fail(c, error, 'Client-update case edit');
  }
});

/** POST /claims/:id/submitted { submissionDate } — ops confirm the posting date. */
router.post('/claims/:id/submitted', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(c, z.object({ submissionDate: isoDate }));
  if (!parsed.ok) return parsed.res;
  try {
    const result = await ClientUpdatesService.onSubmitted(
      c.req.param('id'),
      parsed.data.submissionDate
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Client-update submitted');
  }
});

/** POST /claims/:id/handoff { handoffDate? } — T1 draft when handed to the firm. */
router.post('/claims/:id/handoff', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(
    c,
    z.object({ handoffDate: isoDate.optional() })
  );
  if (!parsed.ok) return parsed.res;
  try {
    const result = await ClientUpdatesService.onHandedToLawFirm(
      c.req.param('id'),
      parsed.data.handoffDate ?? new Date()
    );
    return c.json({ success: true, ...(result ?? { taskId: null }) });
  } catch (error) {
    return fail(c, error, 'Client-update handoff');
  }
});

const eventSchema = z.object({ receivedAt: isoDate.optional() });

/** POST /claims/:id/decision { receivedAt? } — stops the sequence. */
router.post('/claims/:id/decision', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(c, eventSchema);
  if (!parsed.ok) return parsed.res;
  try {
    await ClientUpdatesService.onDecision(
      c.req.param('id'),
      parsed.data.receivedAt
        ? new Date(`${parsed.data.receivedAt}T12:00:00Z`)
        : new Date(),
      actorOf(c)
    );
    return c.json({ success: true });
  } catch (error) {
    return fail(c, error, 'Client-update decision');
  }
});

/** POST /claims/:id/funds { receivedAt? } — stops the sequence; flags funds before decision. */
router.post('/claims/:id/funds', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(c, eventSchema);
  if (!parsed.ok) return parsed.res;
  try {
    const result = await ClientUpdatesService.onFundsReceived(
      c.req.param('id'),
      parsed.data.receivedAt
        ? new Date(`${parsed.data.receivedAt}T12:00:00Z`)
        : new Date(),
      actorOf(c)
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    return fail(c, error, 'Client-update funds');
  }
});

const officeActionSchema = z.object({
  type: z.enum(OFFICE_ACTION_TYPES),
  label: z.string().min(1).max(255),
  dueDate: isoDate,
  owner: z.string().min(1).max(100),
  status: z.enum(['open', 'done', 'rescheduled']).optional(),
  reason: z.string().max(1000).nullable().optional(),
});

/** PUT /claims/:id/office-action — set, complete or reschedule (with owner + reason). */
router.put('/claims/:id/office-action', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(c, officeActionSchema);
  if (!parsed.ok) return parsed.res;
  try {
    const action = await ClientUpdatesService.setOfficeAction(
      c.req.param('id'),
      parsed.data,
      actorOf(c)
    );
    return c.json({ success: true, nextOfficeAction: action });
  } catch (error) {
    return fail(c, error, 'Client-update office action');
  }
});

// ---------------------------------------------------------------------------
// Contact log CRUD
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  contactDate: isoDate,
  channel: z.enum(CONTACT_CHANNELS),
  type: z.enum(CONTACT_TYPES),
  outcome: z.string().min(1).max(5000),
  summaryEn: z.string().max(5000).nullable().optional(),
  uncertain: z.boolean().optional(),
  customerAction: z.string().max(2000).nullable().optional(),
  customerActionDue: isoDate.nullable().optional(),
  updateWarranted: z.boolean().optional(),
  statusParagraph: z.enum(M4_STATUS_PARAGRAPHS).nullable().optional(),
  infoRequestSource: z.enum(INFO_REQUEST_SOURCES).nullable().optional(),
  newOffice: z.string().max(255).nullable().optional(),
  details: stringMap.nullable().optional(),
  loggedByName: z.string().max(100).nullable().optional(),
});

router.get('/claims/:id/contacts', validateUuidParams('id'), async (c) => {
  try {
    const contacts = await ClientUpdatesService.listContacts(c.req.param('id'));
    return c.json({ success: true, contacts });
  } catch (error) {
    return fail(c, error, 'Client-update contacts');
  }
});

/**
 * POST /claims/:id/contacts — log a contact. With updateWarranted the
 * matching e-mail is drafted as a task (returned as `taskId`).
 */
router.post('/claims/:id/contacts', validateUuidParams('id'), async (c) => {
  const parsed = await parseJson(c, contactSchema);
  if (!parsed.ok) return parsed.res;
  try {
    const result = await ClientUpdatesService.logContact(
      c.req.param('id'),
      parsed.data,
      actorOf(c)
    );
    return c.json({ success: true, ...result }, 201);
  } catch (error) {
    return fail(c, error, 'Client-update contact create');
  }
});

router.patch(
  '/contacts/:contactId',
  validateUuidParams('contactId'),
  async (c) => {
    const parsed = await parseJson(c, contactSchema.partial());
    if (!parsed.ok) return parsed.res;
    try {
      const contact = await ClientUpdatesService.updateContact(
        c.req.param('contactId'),
        parsed.data,
        actorOf(c)
      );
      return c.json({ success: true, contact });
    } catch (error) {
      return fail(c, error, 'Client-update contact edit');
    }
  }
);

router.delete(
  '/contacts/:contactId',
  validateUuidParams('contactId'),
  async (c) => {
    try {
      await ClientUpdatesService.deleteContact(
        c.req.param('contactId'),
        actorOf(c)
      );
      return c.json({ success: true });
    } catch (error) {
      return fail(c, error, 'Client-update contact delete');
    }
  }
);

export default router;
