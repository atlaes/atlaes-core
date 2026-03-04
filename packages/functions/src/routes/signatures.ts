import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { db } from '../utils/db';
import { signatures } from '../drizzle/schema/shared';
import { uploadFile, getPresignedUrl } from '../utils/s3';
import { eq, and } from 'drizzle-orm';

const signaturesRouter = new Hono();

const uploadSignatureSchema = z.object({
  signatureData: z.string().min(1, 'Signature data is required'),
});

/**
 * Upload a signature
 * POST /api/signatures/upload
 *
 * Accepts base64-encoded signature data (data URL),
 * uploads PNG to S3, and saves a record in the signatures table.
 */
signaturesRouter.post('/upload', authMiddleware, zValidator('json', uploadSignatureSchema), async (c) => {
  try {
    const user = c.get('user');
    const { signatureData } = c.req.valid('json');

    // Extract the base64 content from the data URL
    const base64Match = signatureData.match(/^data:image\/(\w+);base64,(.+)$/);
    let buffer: Buffer;
    let extension = 'png';

    if (base64Match) {
      extension = base64Match[1];
      buffer = Buffer.from(base64Match[2], 'base64');
    } else {
      // Assume raw base64 PNG
      buffer = Buffer.from(signatureData, 'base64');
    }

    const s3Key = `signatures/${user.id}/${randomUUID()}.${extension}`;

    // Upload to S3
    await uploadFile(s3Key, buffer, `image/${extension}`);

    // Save record in database
    const [signature] = await db
      .insert(signatures)
      .values({
        userId: user.id,
        signatureData,
        s3Key,
        isActive: true,
      })
      .returning();

    logger.info(`Signature uploaded: ${signature.id} by user ${user.id}`);

    return c.json({
      success: true,
      signature: {
        id: signature.id,
        s3Key: signature.s3Key,
        createdAt: signature.createdAt,
      },
    });
  } catch (error) {
    logger.error('Signature upload error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload signature',
      },
      500
    );
  }
});

/**
 * Get a signature by ID (returns presigned download URL)
 * GET /api/signatures/:id
 */
signaturesRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const signatureId = c.req.param('id');

    const [signature] = await db
      .select()
      .from(signatures)
      .where(and(eq(signatures.id, signatureId), eq(signatures.userId, user.id)))
      .limit(1);

    if (!signature) {
      return c.json({ success: false, error: 'Signature not found' }, 404);
    }

    let downloadUrl: string | null = null;
    if (signature.s3Key) {
      downloadUrl = await getPresignedUrl(signature.s3Key) ?? null;
    }

    return c.json({
      success: true,
      signature: {
        id: signature.id,
        downloadUrl,
        createdAt: signature.createdAt,
      },
    });
  } catch (error) {
    logger.error('Get signature error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get signature',
      },
      500
    );
  }
});

export default signaturesRouter;
