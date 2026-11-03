import fs from 'fs';
import path from 'path';
import type { LawFirmAccount } from './context';
import { VIVIDIUS } from '../drv-pack/cover-letter';

/**
 * Runtime configuration for the LAW variants that is not intake data:
 * the Anderkonto and the letterhead asset (from disk). The letterhead is
 * optional so DIRECT packages never depend on it; the LAW package
 * builder reports what is missing instead of failing silently.
 *
 *   LAW_FIRM_IBAN / LAW_FIRM_BIC / LAW_FIRM_BANK   Anderkonto override; by
 *     default the firm's escrow account printed on its letterhead (the
 *     same account the DRV pack uses, drv-pack/cover-letter.ts VIVIDIUS)
 *   src/assets/bav/law-firm-letterhead.pdf          Vividius letterhead
 */

export function loadLawFirmAccount(): LawFirmAccount {
  const iban = process.env.LAW_FIRM_IBAN?.trim();
  const bic = process.env.LAW_FIRM_BIC?.trim();
  const bank = process.env.LAW_FIRM_BANK?.trim();
  if (iban && bic && bank) return { iban, bic, bank };
  return {
    iban: VIVIDIUS.escrowIban,
    bic: VIVIDIUS.escrowBic,
    bank: VIVIDIUS.escrowBank,
  };
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
