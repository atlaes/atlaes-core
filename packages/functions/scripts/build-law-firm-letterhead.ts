/**
 * Builds the Vividius letterhead used as the first-page background of the
 * LAW variants of the bAV Abfindung letters (client answer item 4).
 *
 *   pnpm exec tsx scripts/build-law-firm-letterhead.ts [outFile]
 *   (or, where tsx's IPC socket is blocked:
 *   node --require ./node_modules/tsx/dist/cjs/index.cjs scripts/build-law-firm-letterhead.ts)
 *
 * Default output: src/assets/bav/law-firm-letterhead.pdf, which
 * services/bav-letters/law-firm-config.ts loads at runtime. One A4 page:
 * the firm's logo top-right, placed exactly as the DRV cover letter does
 * (drv-pack/cover-letter.ts, COVER.letterhead), and the footer with the
 * firm's address block. The body area between is left blank; the letter
 * renderer starts the text below the logo (render-letter LAYOUT).
 */
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { A4 } from '../src/services/claim-pdf/constants';
import { COVER, VIVIDIUS } from '../src/services/drv-pack/cover-letter';
import { loadGprAsset } from '../src/services/drv-pack/assets';

/** Footer lines: the address block first, then contact and bank details. */
export function letterheadFooterLines(): string[] {
  return [
    `${VIVIDIUS.name} · ${VIVIDIUS.street} · ${VIVIDIUS.postalCode} ${VIVIDIUS.city} · Deutschland · Inhaberin: ${VIVIDIUS.lawyer} – ${VIVIDIUS.lawyerTitle}, Fachanwältin für Gewerblichen Rechtsschutz`,
    ...VIVIDIUS.footerLines.slice(1),
  ];
}

export async function buildLawFirmLetterhead(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Vividius Rechtsanwälte – Briefkopf');
  doc.setProducer('atlaes build-law-firm-letterhead');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const logo = await doc.embedJpg(loadGprAsset('letterhead'));
  const page = doc.addPage([A4.width, A4.height]);

  // Logo top-right, same geometry as the DRV cover letter.
  const height = (COVER.letterhead.width * 94) / 396;
  const scale = height / logo.height;
  page.drawImage(logo, {
    x: A4.width - COVER.marginRight - COVER.letterhead.width,
    y: A4.height - COVER.letterhead.top - height,
    width: logo.width * scale,
    height,
  });

  // Footer with the firm's address block.
  const ascent = font.heightAtSize(COVER.smallSize, { descender: false });
  letterheadFooterLines().forEach((text, i) => {
    page.drawText(text, {
      x: COVER.marginLeft,
      y: A4.height - (COVER.footerTop + i * 9) - ascent,
      size: COVER.smallSize,
      font,
    });
  });

  return doc.save();
}

async function main() {
  const outFile =
    process.argv[2] ??
    path.join(
      __dirname,
      '..',
      'src',
      'assets',
      'bav',
      'law-firm-letterhead.pdf'
    );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, await buildLawFirmLetterhead());
  console.log(`wrote ${outFile}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
