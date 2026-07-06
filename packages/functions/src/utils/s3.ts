import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

// In SST, the bucket name is injected via Resource linking
// In dev, fall back to env var
const BUCKET_NAME = process.env.SST_RESOURCE_AtlaesBucket
  ? JSON.parse(process.env.SST_RESOURCE_AtlaesBucket).name
  : process.env.AWS_S3_BUCKET || '';

const REGION = process.env.AWS_REGION || 'eu-central-1';

const s3Client = new S3Client({ region: REGION });

// In local dev without SST resource injection, skip S3 operations.
// The SST_RESOURCE_AtlaesBucket env var is only set when running in SST (staging/prod).
const isS3Available = !!process.env.SST_RESOURCE_AtlaesBucket;

if (!isS3Available) {
  logger.info(
    'S3 bucket not available (local dev) — file storage operations will be skipped'
  );
}

/**
 * Upload a file to S3. Skips in dev mode if no bucket is configured.
 */
export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (!isS3Available) {
    logger.info(`S3 upload skipped (dev mode): ${key}`);
    return;
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  logger.info(`S3 upload: ${key}`);
}

/**
 * Get a presigned download URL (valid for 1 hour).
 * Returns null in dev mode if no bucket is configured.
 */
export async function getPresignedUrl(key: string): Promise<string | null> {
  if (!isS3Available) {
    logger.info(`S3 presigned URL skipped (dev mode): ${key}`);
    return null;
  }
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
  return url;
}

/**
 * Download a file from S3. Throws in local dev when no bucket is
 * configured (mirrors `uploadFile`'s guard style, but a missing download
 * has no safe no-op — callers need the bytes to proceed).
 */
export async function downloadFile(key: string): Promise<Buffer> {
  if (!isS3Available) {
    throw new Error(
      `S3 download unavailable (dev mode, no bucket configured): ${key}`
    );
  }
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
  if (!response.Body) {
    throw new Error(`S3 object has no body: ${key}`);
  }
  const bytes = await response.Body.transformToByteArray();
  logger.info(`S3 download: ${key}`);
  return Buffer.from(bytes);
}

/**
 * Delete a file from S3. Skips in dev mode if no bucket is configured.
 */
export async function deleteFile(key: string): Promise<void> {
  if (!isS3Available) {
    logger.info(`S3 delete skipped (dev mode): ${key}`);
    return;
  }
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
  logger.info(`S3 delete: ${key}`);
}
