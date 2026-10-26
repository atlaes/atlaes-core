import fs from 'fs';
import path from 'path';
import { compileTemplate, type CompiledTemplate } from './template-engine';

/**
 * Template IDs from the client spec, section 1 (template matrix).
 *
 *   A-LAW     § 3 Abs. 3 BetrAVG, Vividius letterhead, signed by the lawyer
 *   A-DIRECT  § 3 Abs. 3 BetrAVG, signed by the user, PEV for Anna Kliem
 *   B-LAW     § 3 Abs. 2 BetrAVG (Kleinstanwartschaft), Vividius
 *   B-DIRECT  § 3 Abs. 2 BetrAVG, signed by the user
 *   PEV       Postempfangsvollmacht (DIRECT packages)
 *   VOLL      Anwaltsvollmacht Vividius (LAW packages)
 */
export type BavTemplateId =
  | 'A-LAW'
  | 'A-DIRECT'
  | 'B-LAW'
  | 'B-DIRECT'
  | 'PEV'
  | 'VOLL';

export const BAV_TEMPLATE_IDS: readonly BavTemplateId[] = [
  'A-LAW',
  'A-DIRECT',
  'B-LAW',
  'B-DIRECT',
  'PEV',
  'VOLL',
];

const FILE_BY_ID: Record<BavTemplateId, string> = {
  'A-LAW': 'a-law.txt',
  'A-DIRECT': 'a-direct.txt',
  'B-LAW': 'b-law.txt',
  'B-DIRECT': 'b-direct.txt',
  PEV: 'pev.txt',
  VOLL: 'voll.txt',
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
