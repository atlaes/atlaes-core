// Browser-side helpers for the Signature step. The backend
// (POST /signatures/upload) stores the signature as a PNG, so every uploaded
// image is decoded and re-encoded to PNG here, downscaled when it is a
// large photo, and blank canvases are rejected before anything is sent.

// Large enough for a crisp signature on the generated PDFs, small enough
// that a 12 MP phone photo of a signature doesn't become a multi-MB payload.
export const SIGNATURE_MAX_WIDTH = 1200;
export const SIGNATURE_MAX_HEIGHT = 600;
export const SIGNATURE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const SIGNATURE_UPLOAD_ACCEPT =
  'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode signature image'));
    img.src = src;
  });

// True when at least one pixel is not fully transparent. The drawn
// signature canvas is transparent until the user actually leaves ink, so a
// click without movement (which still fires mouseup) stays "blank".
export function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const { width, height } = canvas;
  if (!width || !height) return false;
  const context = canvas.getContext('2d');
  if (!context) return false;
  const { data } = context.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return true;
  }
  return false;
}

// Decodes any browser-readable image and returns it as a PNG data URL,
// scaled down to fit SIGNATURE_MAX_WIDTH x SIGNATURE_MAX_HEIGHT. Rejects
// when the browser cannot decode the file (e.g. HEIC outside Safari).
export async function normalizeSignatureImage(
  dataUrl: string
): Promise<string> {
  const img = await loadImage(dataUrl);
  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Could not decode signature image');
  }

  const scale = Math.min(
    1,
    SIGNATURE_MAX_WIDTH / sourceWidth,
    SIGNATURE_MAX_HEIGHT / sourceHeight
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
