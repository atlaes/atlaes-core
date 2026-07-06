/**
 * Dev-only preview/QA script for the combined VBL claim PDF package.
 *
 * Builds a full sample package via `assembleClaimPdf` using realistic fixture
 * data (umlaut name, long German address, Philippine PoA-holder mailing
 * scenario) and writes the resulting PDF to the path given as argv[2].
 *
 * Two synthetic "passport" branches are supported so both code paths in
 * `assembleClaimPdf` (application/pdf vs image/*) can be previewed:
 *
 *   pnpm tsx scripts/preview-claim-pdf.ts <outpath>            # PDF passport
 *   pnpm tsx scripts/preview-claim-pdf.ts <outpath> --image     # PNG passport
 *
 * This script does not assert anything — it is a fixture generator for
 * manual/mechanical QA (pdftotext/pdfinfo/pdftoppm). See
 * .superpowers/sdd/task-9-brief.md for the verification steps.
 */
import { PDFDocument, rgb } from 'pdf-lib';
import {
  assembleClaimPdf,
  ClaimPdfInput,
} from '../src/services/claim-pdf/assemble';

// pdf-lib cannot rasterize/encode PNGs itself, so we hand-roll a minimal PNG
// encoder here (8-bit RGB, stored/uncompressed via a zlib deflate pass) and
// use it to synthesize both the signature image and the image-passport
// fixture. This keeps the script self-contained without new dependencies.
function encodePng(
  width: number,
  height: number,
  paintPixel: (x: number, y: number) => [number, number, number]
): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zlib = require('zlib') as typeof import('zlib');

  const stride = width * 3 + 1; // +1 filter-type byte per row
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paintPixel(x, y);
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const idatData = zlib.deflateSync(raw);

  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (truecolor, no alpha)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  return new Uint8Array(png);
}

/** Solid-colored rectangle PNG. */
function buildSolidPng(
  width: number,
  height: number,
  color: [number, number, number]
): Uint8Array {
  return encodePng(width, height, () => color);
}

/**
 * A visibly "signature-like" PNG: white background with a few diagonal
 * navy-blue strokes, so it reads as ink on the cover letter / L203 pages
 * rather than a flat decorative block.
 */
function buildSignaturePng(): Uint8Array {
  const width = 240;
  const height = 80;
  const white: [number, number, number] = [255, 255, 255];
  const ink: [number, number, number] = [20, 40, 140];

  // A handful of diagonal bands (mod-based) approximate pen strokes.
  const strokes = [
    { offset: 20, thickness: 4 },
    { offset: 60, thickness: 3 },
    { offset: 110, thickness: 5 },
    { offset: 160, thickness: 3 },
    { offset: 200, thickness: 4 },
  ];

  return encodePng(width, height, (x, y) => {
    for (const { offset, thickness } of strokes) {
      // Diagonal stroke: y roughly tracks (x - offset) * 0.6, wavy via sin.
      const wave = Math.sin(x / 18) * 10;
      const strokeY = height / 2 + (x - offset) * 0.15 + wave;
      if (
        Math.abs(y - strokeY) < thickness &&
        x > offset - 30 &&
        x < offset + 60
      ) {
        return ink;
      }
    }
    return white;
  });
}

/** Builds a synthetic passport as a small PDF page with colored rectangles. */
async function buildPassportPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Roughly ID-card proportioned page (e.g. scanned passport bio page).
  const page = doc.addPage([420, 595]);
  const { width, height } = page.getSize();

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.85, 0.9, 0.95),
  });

  // "Photo" block
  page.drawRectangle({
    x: 30,
    y: height - 220,
    width: 140,
    height: 180,
    color: rgb(0.3, 0.35, 0.5),
  });

  // "Machine-readable zone" bars near the bottom
  for (let i = 0; i < 3; i++) {
    page.drawRectangle({
      x: 30,
      y: 40 + i * 22,
      width: width - 60,
      height: 14,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 40,
    width,
    height: 40,
    color: rgb(0.1, 0.2, 0.5),
  });

  page.drawText('SYNTHETIC PASSPORT - PREVIEW ONLY', {
    x: 20,
    y: height - 28,
    size: 12,
    color: rgb(1, 1, 1),
  });

  page.drawText('Republic of the Philippines', {
    x: 190,
    y: height - 60,
    size: 11,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('Surname: GROSS', {
    x: 190,
    y: height - 90,
    size: 10,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('Given Names: JURGEN', {
    x: 190,
    y: height - 108,
    size: 10,
    color: rgb(0.1, 0.1, 0.1),
  });

  return doc.save();
}

/** Builds a synthetic passport as a raw PNG image (colored rectangle). */
function buildPassportPng(): Uint8Array {
  // A simple 420x595 solid teal rectangle stands in for a scanned photo ID
  // image (JPEG/PNG upload branch of assembleClaimPdf).
  return buildSolidPng(420, 595, [0, 128, 128]);
}

async function main(): Promise<void> {
  const outPath = process.argv[2];
  if (!outPath) {
    console.error(
      'Usage: pnpm tsx scripts/preview-claim-pdf.ts <outpath> [--image]'
    );
    process.exit(1);
  }
  const useImagePassport = process.argv.includes('--image');

  const claim: ClaimPdfInput['claim'] = {
    firstName: 'Jürgen',
    lastName: 'Groß',
    dateOfBirth: '1958-11-23',
    placeOfBirth: 'Bad Nauheim',
    currentAddressLine1: 'Wilson Street 245',
    currentAddressLine2: 'Barangay Corazon de Jesus, San Juan City',
    currentCity: 'Metro Manila',
    currentPostalCode: '1500',
    currentCountry: 'Philippines',
    svNummer: '65231158G1',
    iban: 'DE89370400440532013000',
    swiftBic: 'COBADEFFXXX',
    accountHolderName: 'Jürgen Groß',
    bankName: 'Commerzbank AG',
    bankCity: 'Frankfurt am Main',
  };

  const signaturePng = buildSignaturePng();

  const passport: ClaimPdfInput['passport'] = useImagePassport
    ? { bytes: buildPassportPng(), fileType: 'image/png' }
    : { bytes: await buildPassportPdf(), fileType: 'application/pdf' };

  const pdfBytes = await assembleClaimPdf({
    claim,
    signaturePng,
    passport,
    now: new Date('2026-07-06T00:00:00Z'),
  });

  const fs = await import('fs');
  fs.writeFileSync(outPath, pdfBytes);

  console.log(
    `Wrote ${pdfBytes.byteLength} bytes to ${outPath} (passport: ${passport.fileType})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
