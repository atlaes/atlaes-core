#!/usr/bin/env node
/**
 * CI guard for quarterly tokens (Karl brief, 8 Sep 2026):
 *   1. no literal Q marker in apps/gpr/content/**, components/marketing/**,
 *      app/(marketing)/**;
 *   2. every {{ID.key}} / {{ID.sentence[.name]}} reference in content
 *      resolves against content/tokens.json (and every {ID.key} slot inside
 *      the store resolves too);
 *   3. if a build output exists (.next/server/app/**\/*.html|*.rsc|*.body),
 *      no Q marker and no unresolved "{{" reference survived into it.
 *
 * Usage: node scripts/check-q-markers.mjs   (pnpm --filter gpr check:content)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = JSON.parse(
  readFileSync(join(root, 'content', 'tokens.json'), 'utf8')
);

const SOURCE_DIRS = [
  'content',
  join('components', 'marketing'),
  join('app', '(marketing)'),
];
const SOURCE_EXT = /\.(ts|tsx|json|md|mdx)$/;
const BUILD_DIR = join(root, '.next', 'server', 'app');
const BUILD_EXT = /\.(html|rsc|body)$/;

const MARKER = '[' + 'Q]';
const REF =
  /\{\{\s*([A-Z]+-\d+)\.([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s*\}\}/g;
const SLOT = /\{([A-Z]+-\d+)\.([A-Za-z0-9_]+)\}/g;

function walk(dir, ext, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(p, ext, out);
    } else if (ext.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function refResolves(id, key, name) {
  const tok = store.tokens[id];
  if (!tok) return false;
  if (key === 'sentence')
    return Boolean(tok.sentences && tok.sentences[name || 'default']);
  return Boolean(
    tok.values && tok.values[key] !== undefined && tok.values[key] !== ''
  );
}

const errors = [];

// 1 + 2: sources
for (const dir of SOURCE_DIRS) {
  for (const file of walk(join(root, dir), SOURCE_EXT)) {
    const rel = relative(root, file);
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // allow the guard itself and code that mentions the marker in a string check
      if (line.includes(MARKER)) {
        errors.push(`${rel}:${i + 1}: literal [Q] marker`);
      }
      let m;
      REF.lastIndex = 0;
      while ((m = REF.exec(line))) {
        if (!refResolves(m[1], m[2], m[3])) {
          errors.push(`${rel}:${i + 1}: unresolved token reference ${m[0]}`);
        }
      }
    });
  }
}

// 2b: slots inside the store itself
for (const [id, tok] of Object.entries(store.tokens)) {
  for (const [name, sentence] of Object.entries(tok.sentences || {})) {
    let m;
    SLOT.lastIndex = 0;
    while ((m = SLOT.exec(sentence))) {
      if (!refResolves(m[1], m[2])) {
        errors.push(
          `content/tokens.json: ${id}.sentences.${name} uses unknown slot {${m[1]}.${m[2]}}`
        );
      }
    }
  }
  if (!tok.dataset || !tok.asOf)
    errors.push(`content/tokens.json: ${id} is missing dataset or asOf`);
}

// 3: rendered output, when present
let scanned = 0;
for (const file of walk(BUILD_DIR, BUILD_EXT)) {
  scanned += 1;
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  if (text.includes(MARKER))
    errors.push(`${rel}: rendered page contains a literal ${MARKER}`);
  REF.lastIndex = 0;
  const m = REF.exec(text);
  if (m)
    errors.push(`${rel}: rendered page contains an unresolved token ${m[0]}`);
}

if (errors.length) {
  console.error('check-q-markers: FAILED');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(
  `check-q-markers: OK (${Object.keys(store.tokens).length} tokens, next refresh ${store.nextRefresh}, ${scanned} rendered files scanned)`
);
