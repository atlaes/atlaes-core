import fs from 'fs';
import path from 'path';

function resolveAsset(fileName: string): string {
  // Bundled: dist/index.js + dist/assets/vbl/*  → __dirname === dist/
  let assetPath = path.join(__dirname, 'assets', 'vbl', fileName);
  if (!fs.existsSync(assetPath)) {
    // Dev/tsx & vitest: src/services/claim-pdf → src/assets/vbl
    assetPath = path.join(__dirname, '..', '..', 'assets', 'vbl', fileName);
  }
  return assetPath;
}

export function loadL203Template(): Buffer {
  return fs.readFileSync(resolveAsset('l203-form.pdf'));
}

export function loadPoaHolderId(): Buffer {
  return fs.readFileSync(resolveAsset('poa-holder-id.pdf'));
}
