import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { db } from '../utils/db';
import { documents } from '../drizzle/schema/shared';
import { extractPassportData, PassportOCRResult } from '../services/mindee';

const documentsRouter = new Hono();

// Document type validation
const documentTypes = ['passport', 'payslip', 'abmeldung', 'bank_statement', 'certified_id_form', 'other'] as const;

/**
 * Upload a document
 * POST /api/documents/upload
 *
 * Accepts multipart/form-data with:
 * - file: The file to upload
 * - documentType: The type of document (optional)
 */
documentsRouter.post('/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file');
    const documentType = formData.get('documentType') as string | null;

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          error: 'No file provided',
        },
        400
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json(
        {
          success: false,
          error: 'File size exceeds 10MB limit',
        },
        400
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        {
          success: false,
          error: 'Invalid file type. Allowed: PDF, JPG, PNG',
        },
        400
      );
    }

    // Generate a unique S3 key (in production, this would upload to S3)
    const fileExtension = file.name.split('.').pop() || 'bin';
    const s3Key = `documents/${user.id}/${randomUUID()}.${fileExtension}`;

    // Get file buffer for OCR processing
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // In development, we'll just store the metadata
    // In production, you would upload to S3 here:
    // await s3Client.upload({ Bucket: 'your-bucket', Key: s3Key, Body: fileBuffer })

    // Create document record in database
    const [document] = await db
      .insert(documents)
      .values({
        userId: user.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key: s3Key,
        documentType: documentType || null,
        status: 'completed', // In production, might be 'pending' until OCR processes
      })
      .returning();

    logger.info(`Document uploaded: ${document.id} by user ${user.id}`);

    // If this is a passport, extract data using OCR
    let ocrResult: PassportOCRResult | null = null;
    if (documentType === 'passport') {
      logger.info('Triggering passport OCR...');
      ocrResult = await extractPassportData(fileBuffer, file.name);
      if (ocrResult.success) {
        logger.info('Passport OCR completed successfully');
      } else {
        logger.warn('Passport OCR failed:', ocrResult.error);
      }
    }

    return c.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        documentType: document.documentType,
        status: document.status,
        createdAt: document.createdAt,
      },
      // Include OCR data if available
      ocr: ocrResult?.success ? ocrResult.data : null,
    });
  } catch (error) {
    logger.error('Document upload error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      },
      500
    );
  }
});

/**
 * Get user's documents
 * GET /api/documents
 */
documentsRouter.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { eq } = await import('drizzle-orm');

    const userDocuments = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        documentType: documents.documentType,
        status: documents.status,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(documents.createdAt);

    return c.json({
      success: true,
      documents: userDocuments,
    });
  } catch (error) {
    logger.error('Get documents error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get documents',
      },
      500
    );
  }
});

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
documentsRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');
    const { eq, and } = await import('drizzle-orm');

    // Verify the document belongs to the user
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1);

    if (!doc) {
      return c.json(
        {
          success: false,
          error: 'Document not found',
        },
        404
      );
    }

    // In production, you would also delete from S3:
    // await s3Client.deleteObject({ Bucket: 'your-bucket', Key: doc.s3Key })

    // Delete from database
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));

    logger.info(`Document deleted: ${documentId} by user ${user.id}`);

    return c.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('Delete document error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
      },
      500
    );
  }
});

export default documentsRouter;
