/**
 * Client account (GPR `/account`): the Submitted-stage panel, letters the
 * client received directly, and documents for an open customer task.
 * Mounted at /api/account. All routes need the client's JWT.
 */

import { Hono } from 'hono';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { validateUuidParams } from '../middleware/validate-uuid';
import { ClientUpdatesService } from '../services/client-updates';

const account = new Hono();

account.use('*', authMiddleware);

/**
 * GET /api/account/case
 * Panel data: stage, next update by, next step, latest contact, customer
 * task (or "Nothing at the moment"), activity from verified events,
 * sent updates and documents. 404 when the user has no submitted claim.
 */
account.get('/case', async (c) => {
  try {
    const user = c.get('user');
    const panel = await ClientUpdatesService.getAccountCase(user.id);
    if (!panel) {
      return c.json({ success: false, error: 'No application found' }, 404);
    }
    return c.json({ success: true, ...panel });
  } catch (error) {
    logger.error('Account case error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Failed to load account' }, 500);
  }
});

/** GET /api/account/updates — every update sent (the "All updates" screen). */
account.get('/updates', async (c) => {
  try {
    const user = c.get('user');
    const panel = await ClientUpdatesService.getAccountCase(user.id);
    if (!panel) {
      return c.json({ success: false, error: 'No application found' }, 404);
    }
    return c.json({ success: true, updates: panel.updates });
  } catch (error) {
    logger.error('Account updates error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Failed to load updates' }, 500);
  }
});

/** GET /api/account/documents — claim documents, letters, task uploads. */
account.get('/documents', async (c) => {
  try {
    const user = c.get('user');
    const panel = await ClientUpdatesService.getAccountCase(user.id);
    if (!panel) {
      return c.json({ success: false, error: 'No application found' }, 404);
    }
    return c.json({ success: true, documents: panel.documents });
  } catch (error) {
    logger.error('Account documents error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Failed to load documents' }, 500);
  }
});

/**
 * POST /api/account/letters — multipart/form-data
 *   file (PDF/JPG/PNG ≤ 10MB), receivedDate? (YYYY-MM-DD), note?
 */
account.post('/letters', async (c) => {
  try {
    const user = c.get('user');
    const form = await c.req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }
    const receivedDateRaw = form.get('receivedDate');
    const receivedDate =
      typeof receivedDateRaw === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(receivedDateRaw)
        ? receivedDateRaw
        : null;
    const noteRaw = form.get('note');
    const note =
      typeof noteRaw === 'string' ? noteRaw.slice(0, 2000) || null : null;
    const result = await ClientUpdatesService.uploadLetter(user.id, file, {
      receivedDate,
      note,
    });
    return c.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    if (
      message === 'No application found' ||
      message.startsWith('File size') ||
      message.startsWith('Invalid file type')
    ) {
      return c.json(
        { success: false, error: message },
        message === 'No application found' ? 404 : 400
      );
    }
    logger.error('Account letter upload error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

/**
 * POST /api/account/tasks/:id/documents — multipart/form-data
 *   file (PDF/JPG/PNG ≤ 10MB). `:id` = the open customer task id from
 *   GET /case → anythingToDo.task.id.
 */
account.post('/tasks/:id/documents', validateUuidParams('id'), async (c) => {
  try {
    const user = c.get('user');
    const form = await c.req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }
    const result = await ClientUpdatesService.uploadTaskDocument(
      user.id,
      c.req.param('id'),
      file
    );
    return c.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    if (message === 'No application found' || message === 'Task not found') {
      return c.json({ success: false, error: message }, 404);
    }
    if (
      message.startsWith('File size') ||
      message.startsWith('Invalid file type')
    ) {
      return c.json({ success: false, error: message }, 400);
    }
    logger.error('Account task upload error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

export default account;
