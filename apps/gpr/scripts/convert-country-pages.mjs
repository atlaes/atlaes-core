#!/usr/bin/env node
/**
 * Convert the parsed country handoffs (scratchpad `pages/<slug>.json`,
 * produced by `parse_country.py`) into `content/countries/<slug>.ts`.
 *
 *   node scripts/convert-country-pages.mjs \
 *     --in  <dir with <slug>.json> \
 *     --handoffs "/home/deck/Downloads/GPR other pages" \
 *     [--out content/countries]
 *
 * What it does, per the country README (17 Sep 2026):
 *   - strips the `*[component: …]*` placeholders (they are build
 *     instructions) and the leading check marks on the hero bullets;
 *   - replaces every quarterly-value sentence with its token reference so
 *     the page renders from `content/tokens.json` (M-04, M-17, TM-01/M-12,
 *     M-15/M-16) — the converter fails if an expected sentence is missing;
 *   - classifies every H2 (section `kind`), assigns HTML ids and the
 *     six jump-menu anchors (per-page map for residence pages);
 *   - reads Appendix B of the handoff for the Service name / audience /
 *     description and marks which FAQs are in the FAQPage (`inSchema`);
 *   - writes one TypeScript module per country plus `index.ts`.
 * Copy is never reworded. Run Prettier afterwards.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};
const IN = opt('--in', null);
const HANDOFFS = opt('--handoffs', null);
const OUT = opt('--out', join(root, 'content', 'countries'));
if (!IN) {
  console.error(
    'usage: convert-country-pages.mjs --in <json dir> [--handoffs <md dir>] [--out <dir>]'
  );
  process.exit(2);
}

// --- approved sentences → token references --------------------------------
const TRUST = '⭐ Over 4.9/5 on ProvenExpert from more than 1,250 reviews';
const HERO_AMOUNT =
  'Across our retained completed paid cases — all nationalities — refunds averaged around €11,600; completed refunds on record run from under €200 to over €53,000';
const HERO_TIMING =
  'More than three quarters of our 300 most recent completed refunds reached the client escrow account within three months';
const AMOUNT_EXACT =
  'Across our retained completed paid cases — all nationalities — the average refund was €11,571.66 and the median €10,327.10 (calculated 24 August 2026), with completed refunds on record from under €200 to over €53,000.';
const TIMING_EVIDENCE =
  'More than three quarters of our 300 most recent completed refunds reached the client escrow account within three months. In our analysis calculated on 25 August 2026, 229 of these 300 completed paid refunds (76.3%) reached escrow within 90 days of complete submission.';
const SCHEMA_AMOUNT =
  'Across our retained completed paid cases — all nationalities — refunds averaged €11,571.66 (calculated 24 August 2026).';

const REPLACEMENTS = [
  [AMOUNT_EXACT, '{{M-04.sentence}}'],
  [TIMING_EVIDENCE, '{{TM-01.sentence}} {{M-12.sentence}}'],
  [HERO_AMOUNT, '{{M-04.sentence.hero}}'],
  [HERO_TIMING, '{{TM-01.sentence.hero}}'],
];

/** Anything that still looks like a register figure after tokenising. */
const LEAK =
  /€11,57[12]|€11,600|€10,327|€53,000|300 most recent|4\.9\/5|more than 1,250|1,25[02] reviews|24 August 2026|25 August 2026|76\.3%|\[Q\]/;

function tokenise(text, where, leaks) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  const stripped = out.replace(/\{\{[^}]+\}\}/g, '');
  if (LEAK.test(stripped))
    leaks.push(
      `${where}: ${stripped.match(LEAK)[0]} — "${stripped.slice(0, 90)}"`
    );
  return out;
}

// --- section classification ------------------------------------------------
const KIND_RULES = [
  [/^Do I qualify/i, 'qualify'],
  [/find your row/i, 'citizenship-table'],
  [/^What we do for you/i, 'service'],
  [/^What you need to start/i, 'intake'],
  [/60-month limit/i, 'sixty-month'],
  [/no contribution-month limit/i, 'qualify'],
  [/24-month waiting period/i, 'waiting-period'],
  [/illustrative journeys/i, 'journeys'],
  [/^Which of your years/i, 'years'],
  [/^How much comes back/i, 'amount'],
  [/^Which German pension office/i, 'office'],
  [/^Getting paid/i, 'payout'],
  [/^Digital for most clients/i, 'certification'],
  [/with another citizenship/i, 'dual-citizenship'],
  [/family member/i, 'family'],
  [/^(What|Living in|Other citizenships)/i, 'residence'],
  [/^(Do|Does)\b/i, 'local-scheme'],
];
function kindOf(h2) {
  for (const [re, kind] of KIND_RULES) if (re.test(h2)) return kind;
  return 'other';
}

const ANCHOR_RULES = [
  [
    'do-i-qualify',
    (s) => s.kind === 'qualify' || s.kind === 'citizenship-table',
  ],
  ['what-we-do', (s) => s.kind === 'service'],
  ['journeys', (s) => s.kind === 'journeys'],
  ['getting-paid', (s) => s.kind === 'payout'],
  ['certified-signatures', (s) => s.kind === 'certification'],
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[’'"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 6)
    .join('-');
}

function archetypeOf(slug, sections) {
  if (slug === 'indonesia') return 'hybrid';
  const first = sections[0];
  if (first.kind === 'residence' || first.kind === 'citizenship-table')
    return 'residence';
  const si = sections.findIndex((s) => s.kind === 'service');
  const sixty = sections.findIndex((s) => s.kind === 'sixty-month');
  return sixty !== -1 && sixty < si ? 'citizenship-60-first' : 'citizenship';
}

// --- handoff (Appendix B, version) ---------------------------------------
function findHandoff(slug) {
  if (!HANDOFFS || !existsSync(HANDOFFS)) return null;
  const key = slug.replace(/-/g, '').toLowerCase();
  const files = readdirSync(HANDOFFS).filter((f) =>
    /_Page_Content_Handoff_.*\.md$/.test(f)
  );
  const hit = files.find(
    (f) => f.replace(/^GPR_/, '').split('_')[0].toLowerCase() === key
  );
  return hit ? join(HANDOFFS, hit) : null;
}

function readSchema(slug, leaks) {
  const file = findHandoff(slug);
  if (!file) return { version: 'unknown', service: null, faqNames: null };
  const txt = readFileSync(file, 'utf8');
  const vm = txt.match(/\*\*Version:\*\*\s*(v[\d.]+)/);
  const line = txt.match(/^\{"@context".*$/m);
  if (!line)
    return { version: vm ? vm[1] : 'unknown', service: null, faqNames: null };
  const g = JSON.parse(line[0]);
  const svc = g['@graph'].find((n) => n['@type'] === 'Service');
  const faq = g['@graph'].find((n) => n['@type'] === 'FAQPage');
  let description = svc.description;
  if (description.indexOf(SCHEMA_AMOUNT) === -1) {
    leaks.push(
      `${slug}: schema description does not end with the M-04 schema sentence`
    );
  }
  description = description
    .split(SCHEMA_AMOUNT)
    .join('{{M-04.sentence.schema}}');
  return {
    version: vm ? vm[1] : 'unknown',
    service: {
      serviceName: svc.name,
      audienceType: svc.audience.audienceType,
      description,
    },
    faqNames: faq
      ? faq.mainEntity.map((q) => ({
          name: q.name,
          text: q.acceptedAnswer.text,
        }))
      : null,
  };
}

// --- conversion -------------------------------------------------------------
function convert(json) {
  const leaks = [];
  const slug = json.slug;
  const { version, service, faqNames } = readSchema(slug, leaks);

  const hero = json.hero.map((b) => ({
    ...b,
    x: tokenise(b.x, `${slug} hero`, leaks),
  }));
  if (json.trust !== TRUST)
    leaks.push(
      `${slug}: trust bar differs from the approved M-15/M-16 sentence`
    );
  const trust = '{{M-15.sentence}}';
  const bullets = json.bullets.map((b, i) =>
    tokenise(b.replace(/^✅\s*/, ''), `${slug} bullet ${i + 1}`, leaks)
  );

  const sections = json.sections.map((s) => {
    const kind = kindOf(s.h2);
    const blocks = s.blocks.map((b, bi) => {
      const where = `${slug} § ${s.h2.slice(0, 30)} #${bi}`;
      if (b.t === 'p')
        return { t: 'p', x: tokenise(b.x, where, leaks), sp: b.sp || [] };
      if (b.t === 'h3' || b.t === 'note')
        return { t: b.t, x: tokenise(b.x, where, leaks) };
      if (b.t === 'ul' || b.t === 'ol')
        return {
          t: b.t,
          items: b.items.map((it) => ({
            x: tokenise(it.x, where, leaks),
            sp: it.sp || [],
          })),
        };
      if (b.t === 'table')
        return {
          t: 'table',
          rows: b.rows.map((r) => r.map((c) => tokenise(c, where, leaks))),
        };
      throw new Error(`${slug}: unknown block type ${b.t}`);
    });
    return { id: slugify(s.h2), kind, h2: s.h2, blocks };
  });

  // anchors: first section matching each rule; the H2 id becomes the anchor
  const anchors = {};
  const used = new Set();
  for (const [anchor, test] of ANCHOR_RULES) {
    const sec = sections.find((s) => test(s) && !used.has(s));
    if (sec) {
      sec.id = anchor;
      anchors[anchor] = anchor;
      used.add(sec);
    } else {
      leaks.push(`${slug}: no section for jump anchor ${anchor}`);
    }
  }
  anchors.faq = 'faq';
  // ids must be unique
  const seen = new Set();
  sections.forEach((s) => {
    let id = s.id;
    let n = 2;
    while (seen.has(id)) id = `${s.id}-${n++}`;
    s.id = id;
    seen.add(id);
  });

  const faq = json.faq.map((f) => {
    const item = { q: f.q, a: tokenise(f.a, `${slug} faq`, leaks) };
    if (faqNames) {
      const hit = faqNames.find((n) => n.name === f.q);
      if (!hit) item.inSchema = false;
      else if (hit.text !== f.a)
        leaks.push(
          `${slug}: FAQ answer differs from Appendix B — "${f.q.slice(0, 50)}"`
        );
    }
    return item;
  });
  if (faqNames) {
    faqNames.forEach((n) => {
      if (!json.faq.find((f) => f.q === n.name))
        leaks.push(
          `${slug}: schema FAQ not on page — "${n.name.slice(0, 50)}"`
        );
    });
  }

  const close = json.close.map((b) => {
    let x = tokenise(b.x, `${slug} close`, leaks);
    if (/^\*[^*].*\*$/.test(x)) x = x.slice(1, -1); // italic disclaimer
    return { t: 'p', x, sp: b.sp || [] };
  });

  const page = {
    slug,
    title: json.title,
    meta: json.meta,
    h1: json.h1,
    archetype: archetypeOf(slug, sections),
    version,
    hero,
    trust,
    bullets,
    sections,
    faq,
    close,
    anchors,
    schema: service || {
      serviceName: json.title.replace(/\s*\(2026\)\s*$/, ''),
      audienceType: '',
      description: '',
    },
  };
  if (!service)
    leaks.push(
      `${slug}: Appendix B not found — schema fields are placeholders`
    );
  return { page, leaks };
}

function emit(page) {
  const body = JSON.stringify(page, null, 2);
  return (
    `// Generated by scripts/convert-country-pages.mjs from the ${page.version} handoff\n` +
    `// (${page.title}). Do not edit copy here — regenerate from the handoff.\n` +
    `import type { CountryPageData } from '../types';\n\n` +
    `const page: CountryPageData = ${body};\n\n` +
    `export default page;\n`
  );
}

mkdirSync(OUT, { recursive: true });
const files = readdirSync(IN)
  .filter((f) => f.endsWith('.json'))
  .sort();
const slugs = [];
const allLeaks = [];
for (const f of files) {
  const json = JSON.parse(readFileSync(join(IN, f), 'utf8'));
  const { page, leaks } = convert(json);
  writeFileSync(join(OUT, `${page.slug}.ts`), emit(page));
  slugs.push(page.slug);
  allLeaks.push(...leaks);
  console.log(
    `${page.slug.padEnd(14)} ${page.archetype.padEnd(20)} ${page.version.padEnd(5)} sections=${page.sections.length} faq=${page.faq.length} (${page.faq.filter((q) => q.inSchema !== false).length} in schema) anchors=${Object.keys(page.anchors).length}`
  );
}

const index =
  `// Generated by scripts/convert-country-pages.mjs — one module per country.\n` +
  `import type { CountryPageData } from '../types';\n` +
  slugs.map((s) => `import ${camel(s)} from './${s}';`).join('\n') +
  `\n\nexport const countryPages: Record<string, CountryPageData> = {\n` +
  slugs.map((s) => `  '${s}': ${camel(s)},`).join('\n') +
  `\n};\n\nexport const countryPageList: CountryPageData[] = Object.keys(countryPages).map(\n  (k) => countryPages[k]\n);\n\n` +
  `export function getCountryPage(slug: string): CountryPageData | undefined {\n  return countryPages[slug];\n}\n`;
writeFileSync(join(OUT, 'index.ts'), index);

function camel(s) {
  return s.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
}

if (allLeaks.length) {
  console.error(`\n${allLeaks.length} warning(s):`);
  for (const l of allLeaks) console.error('  - ' + l);
  process.exitCode = 1;
} else {
  console.log(`\n${slugs.length} pages written to ${OUT}`);
}
