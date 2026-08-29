#!/usr/bin/env node
/**
 * Diff the live VBL Figma file against the design exports committed in
 * apps/vbl/app_resource/. Answers the one question we cannot answer offline:
 * which committed exports are stale, and which live frames were never exported?
 *
 * Usage:
 *   FIGMA_TOKEN=figd_xxx node scripts/figma-calculator-diff.mjs
 *   FIGMA_TOKEN=figd_xxx node scripts/figma-calculator-diff.mjs --write out/
 *
 * Create a token at: Figma → Settings → Security → Personal access tokens
 * (scope: File content, read-only).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FILE_KEY = 'mO3AWonbCFSZFxXhFUDuMt';
const TOKEN = process.env.FIGMA_TOKEN;
const REPO = path.resolve(import.meta.dirname, '..');
const EXPORT_DIRS = [
  'apps/vbl/app_resource/Calculator',
  'apps/vbl/app_resource/Get-Started/Public-sector-flow',
  'apps/vbl/app_resource/Get-Started/Stage-flow',
  'apps/vbl/app_resource/Get-Started/Private-Flow',
  'apps/vbl/app_resource/Entry-A',
  'apps/vbl/app_resource/Eligibility',
];

const writeIdx = process.argv.indexOf('--write');
const WRITE_DIR = writeIdx === -1 ? null : process.argv[writeIdx + 1];

if (!TOKEN) {
  console.error(
    'FIGMA_TOKEN is not set.\n\n' +
      'Create one at Figma → Settings → Security → Personal access tokens\n' +
      '(read-only "File content" scope is enough), then re-run:\n\n' +
      '  FIGMA_TOKEN=figd_xxx node scripts/figma-calculator-diff.mjs\n'
  );
  process.exit(2);
}

const api = async (url) => {
  const res = await fetch(url, { headers: { 'X-Figma-Token': TOKEN } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
};

// Collect frames worth comparing, with their page name.
//
// Visibility is INHERITED: this file keeps superseded design work on the canvas
// with the top-level group toggled off, so a visible-looking text node can sit
// inside a hidden ancestor. Reading such a node as current spec is how you end
// up implementing a design decision that was reversed months ago — so hidden
// subtrees are skipped wholesale and only counted.
const collectFrames = (node, page, out, hidden = false, stats = null) => {
  if (!node) return out;
  const isHidden = hidden || node.visible === false;
  if (['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(node.type)) {
    if (isHidden) {
      if (stats) stats.hiddenFrames += 1;
    } else {
      out.push({ id: node.id, name: node.name, page });
    }
  }
  // Descend even when hidden so the skipped count is accurate.
  for (const child of node.children ?? []) {
    collectFrames(child, page, out, isHidden, stats);
  }
  return out;
};

// Normalize an export filename / frame name so "Screen 5 — Contribution
// period.png" and the live frame "Screen 5 — Contribution period" match.
const norm = (s) =>
  s
    .replace(/\.png$/i, '')
    .replace(/[—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const listExports = () => {
  const found = new Map();
  for (const dir of EXPORT_DIRS) {
    const abs = path.join(REPO, dir);
    if (!fs.existsSync(abs)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.png$/i.test(entry.name)) {
          found.set(norm(entry.name), path.relative(REPO, p));
        }
      }
    };
    walk(abs);
  }
  return found;
};

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const main = async () => {
  console.log(`Fetching live Figma file ${FILE_KEY} …`);
  const file = await api(
    `https://api.figma.com/v1/files/${FILE_KEY}?depth=3`
  );
  console.log(`  name:         ${file.name}`);
  console.log(`  lastModified: ${file.lastModified}`);
  console.log(`  version:      ${file.version}\n`);

  const frames = [];
  const stats = { hiddenFrames: 0 };
  for (const page of file.document.children ?? []) {
    collectFrames(page, page.name, frames, false, stats);
  }
  console.log(`Live frames discovered: ${frames.length}`);
  console.log(
    `Hidden frames skipped:  ${stats.hiddenFrames} (superseded design — not spec)`
  );

  const exports = listExports();
  console.log(`Committed exports:      ${exports.size}\n`);

  const matched = [];
  const liveOnly = [];
  for (const f of frames) {
    const hit = exports.get(norm(f.name));
    if (hit) matched.push({ ...f, file: hit });
    else liveOnly.push(f);
  }
  const matchedNames = new Set(matched.map((m) => norm(m.name)));
  const exportOnly = [...exports.entries()].filter(
    ([k]) => !matchedNames.has(k)
  );

  // Render matched frames and compare bytes against the committed PNG.
  console.log('Rendering matched frames for byte comparison …');
  const stale = [];
  const identical = [];
  const batch = 20;
  for (let i = 0; i < matched.length; i += batch) {
    const slice = matched.slice(i, i + batch);
    const ids = slice.map((s) => s.id).join(',');
    const imgs = await api(
      `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`
    );
    for (const item of slice) {
      const url = imgs.images?.[item.id];
      if (!url) continue;
      const live = Buffer.from(await (await fetch(url)).arrayBuffer());
      const committed = fs.readFileSync(path.join(REPO, item.file));
      const same = sha(live) === sha(committed);
      (same ? identical : stale).push(item);
      if (WRITE_DIR && !same) {
        fs.mkdirSync(WRITE_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(WRITE_DIR, `${item.name.replace(/[/\\]/g, '_')}.live.png`),
          live
        );
      }
    }
  }

  const report = (title, rows) => {
    console.log(`\n${title} (${rows.length})`);
    if (!rows.length) return console.log('  —');
    for (const r of rows) {
      console.log(`  • [${r.page}] ${r.name}${r.file ? `  ↔ ${r.file}` : ''}`);
    }
  };

  report('STALE — live frame differs from committed export', stale);
  report('LIVE-ONLY — in Figma, never exported to the repo', liveOnly);
  console.log(`\nEXPORT-ONLY — committed but no live frame (${exportOnly.length})`);
  if (!exportOnly.length) console.log('  —');
  for (const [, f] of exportOnly) console.log(`  • ${f}`);
  console.log(`\nIDENTICAL: ${identical.length}`);

  if (WRITE_DIR && stale.length) {
    console.log(`\nLive renders of stale frames written to ${WRITE_DIR}/`);
  }
};

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  if (String(err.message).startsWith('403')) {
    console.error(
      'A 403 usually means the token lacks access to this file, or the file\n' +
        'belongs to an org whose settings block personal access tokens.'
    );
  }
  process.exit(1);
});
