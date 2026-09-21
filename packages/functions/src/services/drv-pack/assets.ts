import fs from 'fs';
import path from 'path';

/**
 * GPR (DRV refund) pack assets. Templates come from the DRV form set the
 * client delivered on 21 Sep 2026 (folder "New GPR 2") and the Vividius
 * letter samples (folder "Letter").
 */
function resolveAsset(fileName: string): string {
  // Bundled: dist/index.js + dist/assets/gpr/*  → __dirname === dist/
  let assetPath = path.join(__dirname, 'assets', 'gpr', fileName);
  if (!fs.existsSync(assetPath)) {
    // Dev/tsx & vitest: src/services/drv-pack → src/assets/gpr
    assetPath = path.join(__dirname, '..', '..', 'assets', 'gpr', fileName);
  }
  return assetPath;
}

export const GPR_ASSETS = {
  v0901: 'v0901-form.pdf', // V0901-00, Version 20021-ENG, 14 pages, AcroForm
  a1310: 'a1310-form.pdf', // A1310-00, Version 08008-ENG, 2 pages, AcroForm
  a1002En: 'a1002-en.pdf', // flat, overlay
  a1002Sp: 'a1002-sp.pdf', // AcroForm
  a1002Pg: 'a1002-pg.pdf', // scan, overlay (fillable original requested)
  rueckantwort: 'rueckantwort.pdf', // vector, "pursue claim" pre-ticked
  letterhead: 'vividius-logo.jpg', // Vividius Rechtsanwälte logo, 283×86 JPEG
  signature: 'vividius-signature.png', // Katja Chudoba handwritten, 396×94 PNG
} as const;

/**
 * Returns a standalone Uint8Array (not a pooled Buffer): pdf-lib's image
 * embedders read `bytes.buffer` from offset 0, which breaks on Node's
 * shared Buffer pool ("SOI not found in JPEG").
 */
export function loadGprAsset(name: keyof typeof GPR_ASSETS): Uint8Array {
  return new Uint8Array(fs.readFileSync(resolveAsset(GPR_ASSETS[name])));
}
