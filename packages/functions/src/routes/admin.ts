import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { ClaimsApplicationService } from '../services/claims-application';
import { getPresignedUrl } from '../utils/s3';

const admin = new Hono();

// All routes require auth + admin
admin.use('*', authMiddleware, adminMiddleware);

// ============================================================
// Dashboard Stats
// ============================================================

admin.get('/stats', async (c) => {
  try {
    const stats = await ClaimsApplicationService.getClaimStats();
    return c.json({ success: true, stats });
  } catch (error) {
    logger.error('Admin stats error:', error);
    return c.json({ success: false, error: 'Failed to get stats' }, 500);
  }
});

// ============================================================
// Claims List
// ============================================================

admin.get('/claims', async (c) => {
  try {
    const status = c.req.query('status') || undefined;
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const result = await ClaimsApplicationService.getAllClaims({
      status,
      page,
      limit,
    });

    return c.json({ success: true, ...result });
  } catch (error) {
    logger.error('Admin claims list error:', error);
    return c.json(
      { success: false, error: 'Failed to get claims' },
      500
    );
  }
});

// ============================================================
// Claim Detail
// ============================================================

admin.get('/claims/:id', async (c) => {
  try {
    const claimId = c.req.param('id');

    const [claim, documents, workflow, userInfo] = await Promise.all([
      ClaimsApplicationService.getClaimAsAdmin(claimId),
      ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId),
      ClaimsApplicationService.getWorkflowHistoryAsAdmin(claimId),
      ClaimsApplicationService.getClaimUserInfo(claimId),
    ]);

    if (!claim) {
      return c.json({ success: false, error: 'Claim not found' }, 404);
    }

    return c.json({
      success: true,
      claim,
      documents,
      workflow,
      userInfo,
    });
  } catch (error) {
    logger.error('Admin claim detail error:', error);
    return c.json(
      { success: false, error: 'Failed to get claim' },
      500
    );
  }
});

// ============================================================
// Claim Documents
// ============================================================

admin.get('/claims/:id/documents', async (c) => {
  try {
    const claimId = c.req.param('id');
    const documents =
      await ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId);

    return c.json({ success: true, documents });
  } catch (error) {
    logger.error('Admin claim documents error:', error);
    return c.json(
      { success: false, error: 'Failed to get documents' },
      500
    );
  }
});

// ============================================================
// Document Download (pre-signed URL)
// ============================================================

admin.get('/claims/:id/documents/:docId/download', async (c) => {
  try {
    const documentId = c.req.param('docId');

    const doc =
      await ClaimsApplicationService.getDocumentForDownload(documentId);
    if (!doc) {
      return c.json(
        { success: false, error: 'Document not found' },
        404
      );
    }

    const url = await getPresignedUrl(doc.s3Key);

    return c.json({
      success: true,
      downloadUrl: url,
      fileName: doc.fileName,
      fileType: doc.fileType,
    });
  } catch (error) {
    logger.error('Admin document download error:', error);
    return c.json(
      { success: false, error: 'Failed to generate download URL' },
      500
    );
  }
});

// ============================================================
// Workflow History
// ============================================================

admin.get('/claims/:id/workflow', async (c) => {
  try {
    const claimId = c.req.param('id');
    const history =
      await ClaimsApplicationService.getWorkflowHistoryAsAdmin(claimId);

    return c.json({ success: true, history });
  } catch (error) {
    logger.error('Admin workflow history error:', error);
    return c.json(
      { success: false, error: 'Failed to get workflow history' },
      500
    );
  }
});

// ============================================================
// Status Update
// ============================================================

const updateStatusSchema = z.object({
  status: z.enum(['processing', 'completed', 'rejected']),
  note: z.string().max(1000).optional(),
});

admin.put(
  '/claims/:id/status',
  zValidator('json', updateStatusSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const claimId = c.req.param('id');
      const { status, note } = c.req.valid('json');

      const claim = await ClaimsApplicationService.updateClaimStatus(
        claimId,
        status,
        user.id,
        note
      );

      return c.json({ success: true, claim });
    } catch (error) {
      logger.error('Admin status update error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update status';
      const statusCode = message.includes('Invalid transition') ? 400 : 500;
      return c.json({ success: false, error: message }, statusCode);
    }
  }
);

// ============================================================
// Admin Notes
// ============================================================

const addNoteSchema = z.object({
  note: z.string().min(1).max(2000),
});

admin.post(
  '/claims/:id/notes',
  zValidator('json', addNoteSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const claimId = c.req.param('id');
      const { note } = c.req.valid('json');

      await ClaimsApplicationService.addAdminNote(claimId, user.id, note);

      return c.json({ success: true, message: 'Note added' });
    } catch (error) {
      logger.error('Admin add note error:', error);
      return c.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to add note',
        },
        500
      );
    }
  }
);

export default admin;
