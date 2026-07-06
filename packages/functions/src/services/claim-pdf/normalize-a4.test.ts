import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { PDFDocument, degrees } from 'pdf-lib';
import { A4, mm } from './constants';
import { appendImageAsA4Page, appendPdfNormalizedToA4 } from './normalize-a4';

// 1x1 transparent PNG (same fixture used in cover-letter.test.ts).
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
);

// Minimal valid 1x1 JPEG (with EXIF header), used to exercise the
// 'image/jpeg' / 'image/jpg' embed path in appendImageAsA4Page.
const JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A+mKKKK/Kz/QA/9k='
  ),
  (c) => c.charCodeAt(0)
);

async function buildFixturePdf(sizes: [number, number][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const [w, h] of sizes) {
    const page = doc.addPage([w, h]);
    // A page with no content stream at all makes `embedPage` throw
    // ("Can't embed page with missing Contents"), which real-world
    // scanned/converted PDFs never hit (they always have marks on the
    // page) but a bare pdf-lib-created blank page can. Draw a trivial
    // rectangle so every fixture page has a content stream.
    page.drawRectangle({ x: 0, y: 0, width: 1, height: 1 });
  }
  return doc.save();
}

function expectA4(width: number, height: number) {
  expect(width).toBeCloseTo(A4.width, 1);
  expect(height).toBeCloseTo(A4.height, 1);
}

/**
 * Extracts every FlateDecode-compressed content stream from a saved PDF's
 * raw bytes and decodes it to a plain-text operator list, for
 * white-box assertions on drawing geometry that pdf-lib's public API
 * doesn't otherwise expose (there is no "list the draw ops on this page"
 * accessor).
 */
function extractContentStreams(bytes: Uint8Array): string[] {
  const text = Buffer.from(bytes).toString('latin1');
  const streams: string[] = [];
  const re = /<<([^>]*?)>>\s*stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (!/\/Filter\s*\/FlateDecode/.test(m[1])) continue;
    const start = m.index + m[0].length;
    const end = text.indexOf('endstream', start);
    if (end === -1) continue;
    // Trim the trailing EOL pdf-lib inserts before "endstream".
    const raw = Buffer.from(text.slice(start, end), 'latin1');
    try {
      streams.push(inflateSync(raw).toString('latin1'));
    } catch {
      // Not every FlateDecode stream is a content stream (e.g. cross
      // reference streams, images); skip ones that don't inflate as
      // expected content -- inflateSync throwing means it wasn't
      // decodable garbage-in for our purposes anyway.
    }
  }
  return streams;
}

describe('appendImageAsA4Page', () => {
  it('adds exactly one A4 page for a PNG image', async () => {
    const doc = await PDFDocument.create();
    await appendImageAsA4Page(doc, PNG, 'image/png');
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expectA4(width, height);
  });

  it('adds exactly one A4 page for an image/jpeg image', async () => {
    const doc = await PDFDocument.create();
    await appendImageAsA4Page(doc, JPEG, 'image/jpeg');
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expectA4(width, height);
  });

  it('treats image/jpg the same as image/jpeg (documents upload allowlist alias)', async () => {
    const doc = await PDFDocument.create();
    await appendImageAsA4Page(doc, JPEG, 'image/jpg');
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expectA4(width, height);
  });

  it('scales the image to fit inside 15mm margins, centered, preserving aspect ratio', async () => {
    const doc = await PDFDocument.create();
    await appendImageAsA4Page(doc, PNG, 'image/png');
    const bytes = await doc.save();
    // Several FlateDecode streams exist in the saved PDF (the image's own
    // raster data, this page's content stream, internal object/xref
    // streams); the content stream is the one containing an XObject `Do`
    // invocation.
    const [stream] = extractContentStreams(bytes).filter((s) =>
      s.includes(' Do')
    );
    expect(stream).toBeDefined();
    // drawImage (see pdf-lib's operations.js) emits exactly 4 `cm` lines
    // in a fixed order: translate(x,y), rotate, scale(w,h), skew --
    // followed by the `/ImageN Do` paint. All 4 are shaped
    // "a b c d e f cm", so we take them positionally rather than by
    // pattern (a plain regex can't tell the 4 lines apart, since an
    // identity transform "1 0 0 1 0 0 cm" is textually ambiguous with a
    // "scale by 1" line).
    const cmLines = [
      ...stream.matchAll(
        /^([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) cm$/gm
      ),
    ];
    expect(cmLines.length).toBe(4);
    expect(stream).toMatch(/\/Image\S* Do/);

    const [, , , , , translateX, translateY] = cmLines[0];
    const [, scaleW, , , scaleH] = cmLines[2];
    const x = parseFloat(translateX);
    const y = parseFloat(translateY);
    const w = parseFloat(scaleW);
    const h = parseFloat(scaleH);

    const maxW = A4.width - 2 * mm(15);
    const maxH = A4.height - 2 * mm(15);
    // The source PNG is 1x1 (square), so aspect-preserving fit-to-box
    // scaling should produce a square image capped by the smaller of the
    // two margin-constrained dimensions.
    expect(w).toBeCloseTo(h, 5);
    expect(w).toBeLessThanOrEqual(Math.min(maxW, maxH) + 0.01);
    // Centered on both axes.
    expect(x + w / 2).toBeCloseTo(A4.width / 2, 1);
    expect(y + h / 2).toBeCloseTo(A4.height / 2, 1);
  });
});

describe('appendPdfNormalizedToA4', () => {
  it('copies an exact-A4 source page verbatim and preserves page count', async () => {
    const src = await buildFixturePdf([[A4.width, A4.height]]);
    const doc = await PDFDocument.create();
    await appendPdfNormalizedToA4(doc, src);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expectA4(width, height);
  });

  it('normalizes a US-Letter page (612x792) to A4', async () => {
    const src = await buildFixturePdf([[612, 792]]);
    const doc = await PDFDocument.create();
    await appendPdfNormalizedToA4(doc, src);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expectA4(width, height);
  });

  it('normalizes an A5 page (420x595) to A4', async () => {
    const src = await buildFixturePdf([[420, 595]]);
    const doc = await PDFDocument.create();
    await appendPdfNormalizedToA4(doc, src);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expectA4(width, height);
  });

  it('preserves page order and normalizes every page across mixed sizes', async () => {
    const src = await buildFixturePdf([
      [612, 792], // US-Letter -> normalized
      [A4.width, A4.height], // exact A4 -> verbatim copy
      [420, 595], // A5 -> normalized
    ]);
    const doc = await PDFDocument.create();
    await appendPdfNormalizedToA4(doc, src);
    expect(doc.getPageCount()).toBe(3);
    for (let i = 0; i < 3; i++) {
      const { width, height } = doc.getPage(i).getSize();
      expectA4(width, height);
    }
  });

  it('treats a page within 6pt tolerance of A4 as verbatim-copyable', async () => {
    const src = await buildFixturePdf([[A4.width + 5, A4.height - 5]]);
    const doc = await PDFDocument.create();
    await appendPdfNormalizedToA4(doc, src);
    expect(doc.getPageCount()).toBe(1);
    // Verbatim copy keeps the original (near-A4 but not exact) size --
    // this documents the tolerance-based verbatim-copy behavior.
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(A4.width + 5, 1);
    expect(height).toBeCloseTo(A4.height - 5, 1);
  });

  it('appends normalized pages onto an existing document without disturbing prior pages', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([A4.width, A4.height]);
    const src = await buildFixturePdf([[612, 792]]);
    await appendPdfNormalizedToA4(doc, src);
    expect(doc.getPageCount()).toBe(2);
    const { width, height } = doc.getPage(1).getSize();
    expectA4(width, height);
  });

  describe('rotated source pages', () => {
    async function buildRotatedFixturePdf(
      width: number,
      height: number,
      angle: 90 | 180 | 270
    ): Promise<Uint8Array> {
      const doc = await PDFDocument.create();
      const page = doc.addPage([width, height]);
      page.drawRectangle({ x: 0, y: 0, width: 1, height: 1 });
      page.setRotation(degrees(angle));
      return doc.save();
    }

    it('normalizes a 90-degree-rotated non-A4 page to A4', async () => {
      // Raw box 792x612 (US-Letter landscape orientation in raw MediaBox
      // terms), rotated 90 -- effective/visual size is 612x792 portrait,
      // which is itself non-A4 and must be normalized.
      const src = await buildRotatedFixturePdf(792, 612, 90);
      const doc = await PDFDocument.create();
      await appendPdfNormalizedToA4(doc, src);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expectA4(width, height);
      expect(doc.getPage(0).getRotation().angle).toBe(0);
    });

    it('normalizes a 270-degree-rotated non-A4 page to A4', async () => {
      const src = await buildRotatedFixturePdf(792, 612, 270);
      const doc = await PDFDocument.create();
      await appendPdfNormalizedToA4(doc, src);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expectA4(width, height);
    });

    it('normalizes a 180-degree-rotated non-A4 page to A4', async () => {
      const src = await buildRotatedFixturePdf(612, 792, 180);
      const doc = await PDFDocument.create();
      await appendPdfNormalizedToA4(doc, src);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expectA4(width, height);
    });

    it('treats a 90-degree-rotated page whose EFFECTIVE size is within A4 tolerance as verbatim-copyable', async () => {
      // Raw box A4.height x A4.width (i.e. A4 landscape in raw terms),
      // rotated 90 -- effective size becomes A4 portrait, within
      // tolerance, so this must take the copyPages path and keep its
      // /Rotate entry (viewers render it correctly as-is).
      const src = await buildRotatedFixturePdf(A4.height, A4.width, 90);
      const doc = await PDFDocument.create();
      await appendPdfNormalizedToA4(doc, src);
      expect(doc.getPageCount()).toBe(1);
      const page = doc.getPage(0);
      // Verbatim copy: raw box unchanged, rotation preserved.
      const { width, height } = page.getSize();
      expect(width).toBeCloseTo(A4.height, 1);
      expect(height).toBeCloseTo(A4.width, 1);
      expect(page.getRotation().angle).toBe(90);
    });

    it('draws a 90-degree-rotated page centered in the visual (rotation-swapped) A4 box', async () => {
      // Raw box 792x612 rotated 90 -> effective visual size 612x792.
      const src = await buildRotatedFixturePdf(792, 612, 90);
      const doc = await PDFDocument.create();
      await appendPdfNormalizedToA4(doc, src);
      const bytes = await doc.save();
      const [stream] = extractContentStreams(bytes).filter((s) =>
        s.includes('EmbeddedPdfPage')
      );
      expect(stream).toBeDefined();

      // pdf-lib's drawPage operator emits three separate `cm` lines:
      // translate(x,y), rotate(angle), scale(rawW,rawH). We only need
      // the translate (pivot point) to verify centering, since the
      // rotate/scale components are dictated by pdf-lib itself once we
      // pass the correct angle and raw dimensions.
      const translateMatch = stream.match(
        /1 0 0 1 ([\d.eE+-]+) ([\d.eE+-]+) cm/
      );
      expect(translateMatch).not.toBeNull();
      const pivotX = parseFloat(translateMatch![1]);
      const pivotY = parseFloat(translateMatch![2]);

      // Effective (visual) size after rotation: 612x792, scaled to fit
      // A4 (595.28x841.89) with no margin.
      const effWidth = 612;
      const effHeight = 792;
      const scale = Math.min(A4.width / effWidth, A4.height / effHeight);
      const drawWidth = effWidth * scale;
      const drawHeight = effHeight * scale;
      const visualX = (A4.width - drawWidth) / 2;
      const visualY = (A4.height - drawHeight) / 2;

      // For a 90-degree rotation, pdf-lib's transform places the pivot
      // (translate point) at the visual box's BOTTOM-RIGHT corner.
      expect(pivotX).toBeCloseTo(visualX + drawWidth, 1);
      expect(pivotY).toBeCloseTo(visualY, 1);
    });
  });
});
