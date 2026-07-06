import { PDFDocument, PDFPage } from 'pdf-lib';
import { A4, mm } from './constants';

/** Tolerance (in pt) within which a source page is treated as "already A4". */
const A4_TOLERANCE_PT = 6;

const MARGIN = mm(15);
const MAX_IMAGE_WIDTH = A4.width - 2 * MARGIN;
const MAX_IMAGE_HEIGHT = A4.height - 2 * MARGIN;

/**
 * Returns a page's *visual* (rendered) dimensions, accounting for /Rotate.
 * pdf-lib's `getSize()` always reports the raw MediaBox width/height, which
 * for a page rotated 90 or 270 degrees does not match what a viewer
 * actually displays -- the axes are swapped on screen. Every place that
 * needs to reason about how a page LOOKS (the A4-tolerance check, the
 * scaled-to-fit computation) must use this instead of `getSize()` directly.
 */
function getEffectiveSize(page: PDFPage): { width: number; height: number } {
  const { width, height } = page.getSize();
  const angle = ((page.getRotation().angle % 360) + 360) % 360;
  return angle === 90 || angle === 270
    ? { width: height, height: width }
    : { width, height };
}

function isWithinA4Tolerance(width: number, height: number): boolean {
  return (
    Math.abs(width - A4.width) <= A4_TOLERANCE_PT &&
    Math.abs(height - A4.height) <= A4_TOLERANCE_PT
  );
}

/**
 * Adds a single new A4 page to `doc` containing `image`, scaled to fit
 * inside 15mm margins on every side and centered on both axes, aspect
 * ratio preserved.
 */
export async function appendImageAsA4Page(
  doc: PDFDocument,
  image: Uint8Array,
  mime: 'image/jpeg' | 'image/png' | 'image/jpg'
): Promise<void> {
  const embedded =
    mime === 'image/png'
      ? await doc.embedPng(image)
      : await doc.embedJpg(image);

  const scale = Math.min(
    MAX_IMAGE_WIDTH / embedded.width,
    MAX_IMAGE_HEIGHT / embedded.height
  );
  const width = embedded.width * scale;
  const height = embedded.height * scale;
  const x = (A4.width - width) / 2;
  const y = (A4.height - height) / 2;

  const page = doc.addPage([A4.width, A4.height]);
  page.drawImage(embedded, { x, y, width, height });
}

/**
 * Appends every page of `pdfBytes` onto `doc`, normalized to exactly A4.
 * Pages already within +/-6pt of A4 portrait (accounting for rotation) are
 * copied verbatim via `copyPages`. All other pages are embedded and drawn
 * scaled-to-fit + centered (no margin) on a fresh A4 page. Source page
 * order is preserved.
 *
 * Rotation caveat: `PDFDocument.embedPage` embeds the source page's raw,
 * un-rotated content box and does not honor `/Rotate` -- this is a known
 * pdf-lib limitation (there is no built-in way to bake a source page's
 * rotation into an embedded-page XObject). For a rotated non-A4 page we
 * still compute the fit/tolerance using the *effective* (rotation-swapped)
 * dimensions via `getEffectiveSize`, and draw the embedded page rotated by
 * the same angle with position compensated so it lands centered on the new
 * A4 page. Verbatim `copyPages` is unaffected since it copies the page
 * (including its /Rotate entry) as-is, which viewers render correctly.
 */
export async function appendPdfNormalizedToA4(
  doc: PDFDocument,
  pdfBytes: Uint8Array
): Promise<void> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const srcPages = srcDoc.getPages();

  for (let i = 0; i < srcPages.length; i++) {
    const srcPage = srcPages[i];
    const { width, height } = getEffectiveSize(srcPage);

    if (isWithinA4Tolerance(width, height)) {
      const [copied] = await doc.copyPages(srcDoc, [i]);
      doc.addPage(copied);
      continue;
    }

    const angle = ((srcPage.getRotation().angle % 360) + 360) % 360;
    const embedded = await doc.embedPage(srcPage);

    // Scale factor computed from EFFECTIVE (visual, rotation-swapped)
    // dimensions so the drawn box fits inside A4 exactly as it would be
    // seen by a viewer.
    const scale = Math.min(A4.width / width, A4.height / height);
    const drawWidth = width * scale; // effective drawn width
    const drawHeight = height * scale; // effective drawn height

    const newPage = doc.addPage([A4.width, A4.height]);

    if (angle === 90 || angle === 270) {
      // `drawPage`'s `width`/`height` scale the embedded page's RAW
      // (un-rotated) box -- pdf-lib's `drawPage` operator applies
      // translate(x,y) -> rotate(angle) -> scale(rawW, rawH) and then
      // paints the unit square, so for a 90/270 rotation the box's
      // corners land relative to (x, y) as the PIVOT, not the bottom-left
      // of the final visual box. Concretely (rawW = raw box width,
      // rawH = raw box height, i.e. drawHeight/drawWidth swapped back):
      //   90:  visual box spans x in [-rawH, 0], y in [0, rawW]
      //        -> (x, y) is the visual box's BOTTOM-RIGHT corner.
      //   270: visual box spans x in [0, rawH], y in [-rawW, 0]
      //        -> (x, y) is the visual box's TOP-LEFT corner.
      // The visual box size is (drawHeight x drawWidth) for the raw axes
      // (raw width axis == effective height, raw height axis ==
      // effective width), which equals (drawWidth x drawHeight) after
      // the 90/270 swap -- i.e. exactly the centered target box on A4.
      const rawDrawWidth = height * scale; // raw width axis (unrotated)
      const rawDrawHeight = width * scale; // raw height axis (unrotated)
      const visualX = (A4.width - drawWidth) / 2;
      const visualY = (A4.height - drawHeight) / 2;
      const [x, y] =
        angle === 90
          ? [visualX + drawWidth, visualY] // bottom-right of visual box
          : [visualX, visualY + drawHeight]; // top-left of visual box
      newPage.drawPage(embedded, {
        x,
        y,
        width: rawDrawWidth,
        height: rawDrawHeight,
        rotate: srcPage.getRotation(),
      });
    } else {
      // angle is 0 or 180: raw and effective axes coincide, so (x, y) is
      // simply the bottom-left corner of the (possibly 180-flipped) box.
      const x = (A4.width - drawWidth) / 2;
      const y = (A4.height - drawHeight) / 2;
      if (angle === 180) {
        // 180 box spans x in [-rawW, 0], y in [-rawH, 0] -> (x,y) is the
        // TOP-RIGHT corner of the visual box.
        newPage.drawPage(embedded, {
          x: x + drawWidth,
          y: y + drawHeight,
          width: drawWidth,
          height: drawHeight,
          rotate: srcPage.getRotation(),
        });
      } else {
        newPage.drawPage(embedded, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }
    }
  }
}
