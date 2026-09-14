import fs from 'fs';
import path from 'path';
import type { LawFirmAccount } from './context';

/**
 * Runtime configuration for the LAW variants that is not intake data:
 * the Anderkonto (from env) and the letterhead asset (from disk). Both are
 * optional so DIRECT packages never depend on them; the LAW package
 * builder reports what is missing instead of failing silently.
 *
 *   LAW_FIRM_IBAN / LAW_FIRM_BIC / LAW_FIRM_BANK   Anderkonto details
 *   src/assets/bav/law-firm-letterhead.pdf          Vividius letterhead
 */

export function loadLawFirmAccount(): LawFirmAccount | null {
  const iban = process.env.LAW_FIRM_IBAN?.trim();
  const bic = process.env.LAW_FIRM_BIC?.trim();
  const bank = process.env.LAW_FIRM_BANK?.trim();
  if (!iban || !bic || !bank) return null;
  return { iban, bic, bank };
}

const LETTERHEAD_FILE = 'law-firm-letterhead.pdf';

function resolveAsset(fileName: string): string | null {
  const candidates = [
    path.join(__dirname, 'assets', 'bav', fileName), // dist/
    path.join(__dirname, '..', '..', 'assets', 'bav', fileName), // src/
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/** Letterhead PDF bytes, or null when the asset has not been delivered yet. */
export function loadLawFirmLetterhead(): Uint8Array | null {
  const file = resolveAsset(LETTERHEAD_FILE);
  return file ? new Uint8Array(fs.readFileSync(file)) : null;
}
