import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validateUuidParams } from '../middleware/validate-uuid';
import { ClaimsApplicationService } from '../services/claims-application';
import {
  CLAIM_HANDLING_ROUTES,
  CLAIM_PAYOUT_TARGETS,
} from '../drizzle/schema/claims';
import { getPresignedUrl } from '../utils/s3';
import { LawFirmService } from '../services/law-firm';
import { AdminOverviewService } from '../services/admin-overview';
import { LAW_FIRM_MEMBER_ROLES } from '../drizzle/schema/shared';

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
// Ops home: needs attention + recent activity
// ============================================================

admin.get('/overview', async (c) => {
  try {
    const overview = await AdminOverviewService.getOverview();
    return c.json({ success: true, ...overview });
  } catch (error) {
    logger.error('Admin overview error:', toErrorMeta(error));
    return c.json({ success: false, error: 'Failed to load overview' }, 500);
  }
});

// ============================================================
// Claims List
// ============================================================

admin.get('/claims', async (c) => {
  try {
    const status = c.req.query('status') || undefined;
    const handlingRoute = c.req.query('handlingRoute') || undefined;
    const pensionType = c.req.query('pensionType') || undefined;
    const search = (c.req.query('search') || '').slice(0, 100) || undefined;
    const sortRaw = c.req.query('sort');
    const sort =
      sortRaw === 'submittedAt' ||
      sortRaw === 'updatedAt' ||
      sortRaw === 'createdAt'
        ? sortRaw
        : undefined;
    const dir = c.req.query('dir') === 'asc' ? 'asc' : 'desc';
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const result = await ClaimsApplicationService.getAllClaims({
      status,
      handlingRoute,
      pensionType,
      search,
      sort,
      dir,
      page,
      limit,
    });

    return c.json({ success: true, ...result });
  } catch (error) {
    logger.error('Admin claims list error:', error);
    return c.json({ success: false, error: 'Failed to get claims' }, 500);
  }
});

// ============================================================
// Claim Detail
// ============================================================

admin.get('/claims/:id', validateUuidParams('id'), async (c) => {
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
    return c.json({ success: false, error: 'Failed to get claim' }, 500);
  }
});

// ============================================================
// Claim Documents
// ============================================================

admin.get('/claims/:id/documents', validateUuidParams('id'), async (c) => {
  try {
    const claimId = c.req.param('id');
    const documents =
      await ClaimsApplicationService.getClaimDocumentsAsAdmin(claimId);

    return c.json({ success: true, documents });
  } catch (error) {
    logger.error('Admin claim documents error:', error);
    return c.json({ success: false, error: 'Failed to get documents' }, 500);
  }
});

// ============================================================
// Document Download (pre-signed URL)
// ============================================================

admin.get(
  '/claims/:id/documents/:docId/download',
  validateUuidParams('id', 'docId'),
  async (c) => {
    try {
      const documentId = c.req.param('docId');

      const doc =
        await ClaimsApplicationService.getDocumentForDownload(documentId);
      if (!doc) {
        return c.json({ success: false, error: 'Document not found' }, 404);
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
  }
);

// ============================================================
// Workflow History
// ============================================================

admin.get('/claims/:id/workflow', validateUuidParams('id'), async (c) => {
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
  validateUuidParams('id'),
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
// Generated package (letter PDF)
// ============================================================

// Presigned URL for the claim's generated package (VBL or bAV), for ops
// to check it or hand it to the law firm.
admin.get('/claims/:id/package', validateUuidParams('id'), async (c) => {
  try {
    const claimId = c.req.param('id');
    const claim = await ClaimsApplicationService.getClaimAsAdmin(claimId);
    if (!claim) {
      return c.json({ success: false, error: 'Claim not found' }, 404);
    }
    if (!claim.pdfS3Key) {
      return c.json(
        { success: false, error: 'No package has been generated yet' },
        404
      );
    }
    const downloadUrl = await getPresignedUrl(claim.pdfS3Key);
    return c.json({ success: true, pdfS3Key: claim.pdfS3Key, downloadUrl });
  } catch (error) {
    logger.error('Admin package download error:', error);
    return c.json({ success: false, error: 'Failed to get package' }, 500);
  }
});

// Regenerate the bAV Abfindung package (e.g. after ops changed the
// handling route or the recipient address). VBL packages are regenerated
// by the claimant via POST /api/claims/:id/generate-pdf.
admin.post(
  '/claims/:id/package/regenerate',
  validateUuidParams('id'),
  async (c) => {
    try {
      const user = c.get('user');
      const claimId = c.req.param('id');
      const claim = await ClaimsApplicationService.getClaimAsAdmin(claimId);
      if (!claim) {
        return c.json({ success: false, error: 'Claim not found' }, 404);
      }
      if (claim.pensionType !== 'private') {
        return c.json(
          {
            success: false,
            error: 'Only bAV cash-out packages can be regenerated here',
          },
          400
        );
      }
      const { BavLetterPackageService } =
        await import('../services/bav-letters');
      const result = await BavLetterPackageService.generateAndStoreForClaim(
        claimId,
        user.id,
        { asAdmin: true }
      );
      const downloadUrl = await getPresignedUrl(result.pdfS3Key);
      return c.json({
        success: true,
        pdfS3Key: result.pdfS3Key,
        downloadUrl,
        templateId: result.templateId,
        signer: result.signer,
        copyS3Key: result.copy?.s3Key ?? null,
        missingPlaceholders: result.missingPlaceholders,
      });
    } catch (error) {
      logger.error('Admin package regenerate error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to regenerate package';
      const statusCode = message.startsWith('Cannot generate') ? 400 : 500;
      return c.json({ success: false, error: message }, statusCode);
    }
  }
);

// ============================================================
// Handling Route (direct vs law firm)
// ============================================================

const updateRoutingSchema = z.object({
  handlingRoute: z.enum(CLAIM_HANDLING_ROUTES),
  payoutTarget: z.enum(CLAIM_PAYOUT_TARGETS).nullable().optional(),
  lawFirmRef: z.string().max(100).nullable().optional(),
  note: z.string().max(1000).optional(),
});

admin.put(
  '/claims/:id/routing',
  validateUuidParams('id'),
  zValidator('json', updateRoutingSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const claimId = c.req.param('id');
      const input = c.req.valid('json');

      const claim = await ClaimsApplicationService.setHandlingRoute(
        claimId,
        user.id,
        input
      );

      return c.json({ success: true, claim });
    } catch (error) {
      logger.error('Admin routing update error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update routing';
      const statusCode = message.includes('Invalid routing')
        ? 400
        : message === 'Claim not found'
          ? 404
          : 500;
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
  validateUuidParams('id'),
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
          error: error instanceof Error ? error.message : 'Failed to add note',
        },
        500
      );
    }
  }
);

// ============================================================
// Law firm: correspondence the firm uploaded, case events
// ============================================================

admin.get('/claims/:id/correspondence', validateUuidParams('id'), async (c) => {
  try {
    const claimId = c.req.param('id');
    const [correspondence, events] = await Promise.all([
      LawFirmService.listCorrespondence(claimId),
      LawFirmService.listCaseEvents(claimId),
    ]);
    return c.json({ success: true, correspondence, events });
  } catch (error) {
    logger.error('Admin correspondence list error:', error);
    return c.json(
      { success: false, error: 'Failed to get correspondence' },
      500
    );
  }
});

admin.get(
  '/claims/:id/correspondence/:corrId/download',
  validateUuidParams('id', 'corrId'),
  async (c) => {
    try {
      const result = await LawFirmService.getCorrespondenceDownload(
        c.req.param('id'),
        c.req.param('corrId'),
        null
      );
      if (!result) {
        return c.json({ success: false, error: 'Not found' }, 404);
      }
      return c.json({ success: true, ...result });
    } catch (error) {
      logger.error('Admin correspondence download error:', error);
      return c.json(
        { success: false, error: 'Failed to generate download URL' },
        500
      );
    }
  }
);

// ============================================================
// Law firms and their members (invitation only)
// ============================================================

admin.get('/law-firms', async (c) => {
  try {
    const firms = await LawFirmService.listFirms();
    return c.json({ success: true, firms });
  } catch (error) {
    logger.error('Admin law firms list error:', error);
    return c.json({ success: false, error: 'Failed to get law firms' }, 500);
  }
});

admin.get('/law-firms/:id/members', validateUuidParams('id'), async (c) => {
  try {
    const firm = await LawFirmService.getFirm(c.req.param('id'));
    if (!firm) {
      return c.json({ success: false, error: 'Law firm not found' }, 404);
    }
    const members = await LawFirmService.listMembers(firm.id);
    return c.json({ success: true, firm, members });
  } catch (error) {
    logger.error('Admin law firm members error:', error);
    return c.json({ success: false, error: 'Failed to get members' }, 500);
  }
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(LAW_FIRM_MEMBER_ROLES).optional(),
});

admin.post(
  '/law-firms/:id/members',
  validateUuidParams('id'),
  zValidator('json', inviteMemberSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const member = await LawFirmService.inviteMember(
        c.req.param('id'),
        user.id,
        c.req.valid('json')
      );
      return c.json({ success: true, member }, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to invite member';
      const status = message.startsWith('Invalid')
        ? 400
        : message === 'Law firm not found'
          ? 404
          : 500;
      if (status === 500) logger.error('Admin invite member error:', error);
      return c.json({ success: false, error: message }, status);
    }
  }
);

admin.delete(
  '/law-firms/:id/members/:memberId',
  validateUuidParams('id', 'memberId'),
  async (c) => {
    try {
      const user = c.get('user');
      const removed = await LawFirmService.removeMember(
        c.req.param('id'),
        c.req.param('memberId'),
        user.id
      );
      if (!removed) {
        return c.json({ success: false, error: 'Member not found' }, 404);
      }
      return c.json({ success: true });
    } catch (error) {
      logger.error('Admin remove member error:', error);
      return c.json({ success: false, error: 'Failed to remove member' }, 500);
    }
  }
);

export default admin;
