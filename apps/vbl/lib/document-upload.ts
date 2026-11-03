// Client-side mirror of the limits in packages/functions/src/routes/
// documents.ts (POST /documents/upload): PDF, JPEG or PNG, at most 10 MB.
// Checking here gives the user a clear message before the upload instead of
// a generic failure after it (e.g. for iPhone HEIC photos).
export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

// Some browsers report an empty type for drag-and-drop; fall back to the
// extension in that case.
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

export const DOCUMENT_UPLOAD_ACCEPT =
  'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';

export function isAllowedDocumentType(file: File): boolean {
  if (file.type) return ALLOWED_MIME_TYPES.has(file.type.toLowerCase());
  return ALLOWED_EXTENSIONS.test(file.name);
}

export function getDocumentUploadError(file: File): string | null {
  if (!isAllowedDocumentType(file)) {
    return 'This file format is not supported. Please upload a PDF, JPG or PNG file.';
  }
  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return 'This file is too large. Please upload a file of 10 MB or less.';
  }
  return null;
}
