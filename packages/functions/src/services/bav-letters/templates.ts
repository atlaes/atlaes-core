import fs from 'fs';
import path from 'path';
import { compileTemplate, type CompiledTemplate } from './template-engine';

/**
 * Template IDs from the owner's bAV route spec (29 Oct 2026): one cover
 * letter per route × claim status, plus the authority for each route.
 *
 *   DIRECT-VESTED      § 3 Abs. 3 BetrAVG after the DRV refund, signed by the client
 *   DIRECT-NON_VESTED  provider payout procedure (configurable subject), client
 *   LAW-VESTED         § 3 Abs. 3 BetrAVG, Vividius letterhead, signed by the lawyer
 *   LAW-NON_VESTED     provider payout procedure, Vividius
 *   PEV                Postempfangsvollmacht for the postal agent (direct route)
 *   VOLL               Vollmacht for the law firm (law-firm route)
 */
export type BavTemplateId =
  | 'DIRECT-VESTED'
  | 'DIRECT-NON_VESTED'
  | 'LAW-VESTED'
  | 'LAW-NON_VESTED'
  | 'PEV'
  | 'VOLL';

export type BavCoverTemplateId = Exclude<BavTemplateId, 'PEV' | 'VOLL'>;

export const BAV_TEMPLATE_IDS: readonly BavTemplateId[] = [
  'DIRECT-VESTED',
  'DIRECT-NON_VESTED',
  'LAW-VESTED',
  'LAW-NON_VESTED',
  'PEV',
  'VOLL',
];

export const BAV_COVER_TEMPLATE_IDS: readonly BavCoverTemplateId[] = [
  'DIRECT-VESTED',
  'DIRECT-NON_VESTED',
  'LAW-VESTED',
  'LAW-NON_VESTED',
];

const FILE_BY_ID: Record<BavTemplateId, string> = {
  'DIRECT-VESTED': 'cover-direct-vested.txt',
  'DIRECT-NON_VESTED': 'cover-direct-non-vested.txt',
  'LAW-VESTED': 'cover-law-vested.txt',
  'LAW-NON_VESTED': 'cover-law-non-vested.txt',
  PEV: 'pev.txt',
  VOLL: 'voll.txt',
};

/** The spec's file name pattern bAV_Cover_Letter_[Route]_[Status]. */
export const BAV_COVER_TEMPLATE_NAMES: Record<BavCoverTemplateId, string> = {
  'DIRECT-VESTED': 'bAV_Cover_Letter_Direct_Vested',
  'DIRECT-NON_VESTED': 'bAV_Cover_Letter_Direct_Non_Vested',
  'LAW-VESTED': 'bAV_Cover_Letter_Law_Firm_Vested',
  'LAW-NON_VESTED': 'bAV_Cover_Letter_Law_Firm_Non_Vested',
};

function resolveAsset(fileName: string): string {
  // Bundled: dist/index.js + dist/assets/bav/*  → __dirname === dist/
  let assetPath = path.join(__dirname, 'assets', 'bav', fileName);
  if (!fs.existsSync(assetPath)) {
    // Dev/tsx & vitest: src/services/bav-letters → src/assets/bav
    assetPath = path.join(__dirname, '..', '..', 'assets', 'bav', fileName);
  }
  return assetPath;
}

export function loadBavTemplateSource(id: BavTemplateId): string {
  return fs.readFileSync(resolveAsset(FILE_BY_ID[id]), 'utf8');
}

const cache = new Map<BavTemplateId, CompiledTemplate>();

/** Compiled template, cached per process. */
export function getBavTemplate(id: BavTemplateId): CompiledTemplate {
  let compiled = cache.get(id);
  if (!compiled) {
    compiled = compileTemplate(loadBavTemplateSource(id));
    cache.set(id, compiled);
  }
  return compiled;
}
