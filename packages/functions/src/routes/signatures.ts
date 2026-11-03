import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { logger, toErrorMeta } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { db } from '../utils/db';
import { signatures } from '../drizzle/schema/shared';
import { uploadFile, getPresignedUrl } from '../utils/s3';
import { eq, and } from 'drizzle-orm';

const signaturesRouter = new Hono();

/** Decoded size cap for a drawn signature; a 600x200 PNG is a few KB. */
export const MAX_SIGNATURE_BYTES = 1024 * 1024;
const DATA_URL_PREFIX = 'data:image/png;base64,';
const MAX_SIGNATURE_BASE64_LENGTH =
  Math.ceil(MAX_SIGNATURE_BYTES / 3) * 4 + DATA_URL_PREFIX.length;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const uploadSignatureSchema = z.object({
  signatureData: z
    .string()
    .min(1, 'Signature data is required')
    // Refused before decoding: base64 of the cap plus the data URL prefix.
    .max(
      MAX_SIGNATURE_BASE64_LENGTH,
      'Signature image must be 1 MB or smaller'
    ),
});

/**
 * Accepts a `data:image/png;base64,...` URL (or, for older clients, the bare
 * base64) and returns the PNG bytes. Another MIME type, a data URL that is
 * not base64, bytes that are not a PNG, or more than 1 MB decoded are
 * refused with the message to send back as a 400.
 */
export function decodeSignaturePng(
  signatureData: string
): { buffer: Buffer } | { error: string } {
  let base64 = signatureData.trim();
  const dataUrl = /^data:([^;,]*)((?:;[^;,]*)*),([\s\S]*)$/.exec(base64);
  if (dataUrl) {
    const [, mimeType, params, payload] = dataUrl;
    if (mimeType.trim().toLowerCase() !== 'image/png') {
      return {
        error: 'Signature must be a PNG image (data:image/png;base64,...)',
      };
    }
    if (!/;base64$/i.test(params)) {
      return { error: 'Signature data URL must be base64-encoded' };
    }
    base64 = payload;
  }
  if (base64.length > MAX_SIGNATURE_BASE64_LENGTH) {
    return { error: 'Signature image must be 1 MB or smaller' };
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    return { error: 'Signature image must be 1 MB or smaller' };
  }
  if (
    buffer.length < PNG_SIGNATURE.length ||
    !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    return { error: 'Signature must be a PNG image' };
  }
  return { buffer };
}

/**
 * Upload a signature
 * POST /api/signatures/upload (also mounted as POST /api/signatures)
 *
 * Accepts a PNG data URL, uploads the PNG to S3 and saves a record in the
 * signatures table.
 */
async function uploadSignature(c: Context) {
  try {
    const user = c.get('user');
    const parsed = uploadSignatureSchema.safeParse(
      await c.req.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Invalid signature data',
        },
        400
      );
    }
    const { signatureData } = parsed.data;

    const decoded = decodeSignaturePng(signatureData);
    if ('error' in decoded) {
      return c.json({ success: false, error: decoded.error }, 400);
    }

    const s3Key = `signatures/${user.id}/${randomUUID()}.png`;

    // Upload to S3
    await uploadFile(s3Key, decoded.buffer, 'image/png');

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
    logger.error('Signature upload error:', toErrorMeta(error));
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to upload signature',
      },
      500
    );
  }
}

signaturesRouter.post('/upload', authMiddleware, uploadSignature);
// The GPR app posts to the collection root; same handler.
signaturesRouter.post('/', authMiddleware, uploadSignature);

/**
 * Get a signature by ID (returns presigned download URL)
 * GET /api/signatures/:id
 */
signaturesRouter.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const signatureId = c.req.param('id');
    if (!signatureId) {
      return c.json({ success: false, error: 'Signature not found' }, 404);
    }

    const [signature] = await db
      .select()
      .from(signatures)
      .where(
        and(eq(signatures.id, signatureId), eq(signatures.userId, user.id))
      )
      .limit(1);

    if (!signature) {
      return c.json({ success: false, error: 'Signature not found' }, 404);
    }

    let downloadUrl: string | null = null;
    if (signature.s3Key) {
      downloadUrl = (await getPresignedUrl(signature.s3Key)) ?? null;
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
    logger.error('Get signature error:', toErrorMeta(error));
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get signature',
      },
      500
    );
  }
});

export default signaturesRouter;
