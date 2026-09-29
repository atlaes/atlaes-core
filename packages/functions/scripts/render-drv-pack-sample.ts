/**
 * Renders a sample DRV submission pack for visual QA.
 *
 *   pnpm exec tsx scripts/render-drv-pack-sample.ts [outDir] [--sig client-signature.png]
 *
 * Writes <outDir>/drv-pack-sample.pdf plus the manifest as JSON. Convert
 * pages with `pdftoppm -r 60 -png drv-pack-sample.pdf page` to eyeball
 * field placement.
 */
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { sampleClient } from '../src/services/drv-pack/fixtures';
import {
  buildSubmissionPack,
  type PackClient,
} from '../src/services/drv-pack/pack';
import { resolveCarrier } from '../src/services/drv-pack/resolve-carrier';

async function placeholder(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  page.drawText(text, {
    x: 40,
    y: 300,
    size: 24,
    font: await doc.embedFont(StandardFonts.Helvetica),
  });
  return doc.save();
}

function signatureFromArgs(): Uint8Array | null {
  const i = process.argv.indexOf('--sig');
  if (i === -1 || !process.argv[i + 1]) return null;
  return fs.readFileSync(process.argv[i + 1]);
}

async function main() {
  const outDir = process.argv[2] ?? path.join(__dirname, '..', 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const sig = signatureFromArgs();
  const client: PackClient = { ...sampleClient, signaturePng: sig };
  const resolution = resolveCarrier({
    lastOffice: 'UNKNOWN',
    vsnr: client.vsnr,
    citizenship: 'IN',
    residence: 'IN',
  });
  const pack = await buildSubmissionPack({
    aktenzeichen: '06152-26',
    date: new Date(),
    client,
    resolution,
    payslipPdf: await placeholder('Payslip copy'),
    idCopyPdf: await placeholder('Passport copy'),
  });
  fs.writeFileSync(path.join(outDir, 'drv-pack-sample.pdf'), pack.pdf);
  fs.writeFileSync(
    path.join(outDir, 'drv-pack-sample.manifest.json'),
    JSON.stringify(pack.manifest, null, 2)
  );
  console.log(`wrote ${pack.manifest.totalPages} pages → ${outDir}`);
  console.log(
    pack.manifest.documents.map((d) => `${d.key}: ${d.pages}`).join(', ')
  );
  if (pack.manifest.warnings.length)
    console.log('warnings:', pack.manifest.warnings);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
