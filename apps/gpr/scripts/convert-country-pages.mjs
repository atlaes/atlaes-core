#!/usr/bin/env node
/**
 * Convert the parsed country handoffs (`pages/<slug>.json`, produced by
 * `parse_country.py` for the September 2026 set or by
 * `parse-country-handoff.mjs` for the August 2026 set) into
 * `content/countries/<slug>.ts`.
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
 *   - writes one TypeScript module per country plus `index.ts` (the index
 *     lists every module present in the output directory, so the two sets
 *     can be converted independently).
 *
 * August 2026 handoffs (`format: 'august'` in the JSON) predate the set-wide
 * rules: sections are mapped generically by kind, quarterly values are
 * replaced value by value (the sentences differ per page and copy is law),
 * mid-page CTA components become `cta` blocks, the review wall becomes a
 * `reviews` block, the closing H2 keeps its own title, and FAQs that exist
 * only in Appendix B are rendered visibly (FAQPage content must be on the
 * page). Copy is never reworded. Run Prettier afterwards.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
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

const Q_MARK = '[' + 'Q]';

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

/**
 * August handoffs: register values as they appear in the delivered copy,
 * replaced value by value (the sentences around them are the client's
 * wording and stay). Order matters: longer phrases first.
 */
const AUGUST_VALUES = [
  ['€11,571.66', '{{M-04.mean}}'],
  ['€10,327.10', '{{M-04.median}}'],
  ['around €11,600', '{{M-04.meanRounded}}'],
  ['€11,572', '{{M-04.meanShort}}'],
  ['calculated 24 August 2026', 'calculated {{M-04.calculatedOn}}'],
  ['under €200 to over €53,000', '{{M-17.range}}'],
  ['under €200', '{{M-17.low}}'],
  ['over €53,000', '{{M-17.high}}'],
  [
    'More than three quarters of our 300 most recent completed refunds',
    '{{TM-01.shareCap}} of our {{TM-01.population}}',
  ],
  [
    'more than three quarters of our 300 most recent completed refunds',
    '{{TM-01.share}} of our {{TM-01.population}}',
  ],
  ['229 of 300 (76.3%)', '{{M-12.count}} of {{M-12.total}} ({{M-12.pct}})'],
  [
    'within 90 days of complete submission',
    'within {{M-12.days}} days of complete submission',
  ],
  ['300 completed refunds', '{{M-12.total}} completed refunds'],
  ['93.3%', '{{M-20.pct}}'],
  ['76.3%', '{{M-12.pct}}'],
  ['median of 40.5 days', 'median of {{M-19.medianDays}} days'],
  ['about 41 days', '{{M-19.medianDaysRounded}} days'],
  ['4.98 out of 5', '{{M-15.ratingExactWords}}'],
  ['4.98/5', '{{M-15.ratingExact}}'],
  ['4.9/5', '{{M-15.rating}}'],
  ['checked 25 August 2026', 'checked {{M-15.checkedOn}}'],
  ['1,252 reviews', '{{M-16.countExact}} reviews'],
  ['1,007 reviews', '{{M-16.aggregated}} reviews'],
  ['more than 1,250 reviews', 'more than {{M-16.countFloor}} reviews'],
  // citizenship / residence cohorts (register rows M-05 … M-21)
  ['€13,407', '{{M-05.mean}}'],
  ['€12,698', '{{M-05.median}}'],
  ['€11,282', '{{M-06.mean}}'],
  ['€9,509', '{{M-06.median}}'],
  ['€10,978', '{{M-10.mean}}'],
  ['€8,649', '{{M-10.median}}'],
  ['€8,638', '{{M-11.mean}}'],
  ['€7,698', '{{M-11.median}}'],
  ['€11,027', '{{M-09.mean}}'],
  ['€6,867', '{{M-09.median}}'],
  ['€7,615', '{{M-07.mean}}'],
  ['€5,902', '{{M-07.median}}'],
  ['€6,417', '{{M-21.mean}}'],
  ['€5,121', '{{M-21.median}}'],
];
const COHORT_IDS = ['M-05', 'M-06', 'M-07', 'M-09', 'M-10', 'M-11', 'M-21'];

/** Anything that still looks like a register figure after tokenising. */
const LEAK = new RegExp(
  [
    '€11,57[12]',
    '€11,600',
    '€10,327',
    '€53,000',
    '€200\\b',
    '300 most recent',
    '\\b300 completed',
    '229 of 300',
    '4\\.9/5',
    '4\\.98',
    'more than 1,250',
    '1,25[02] reviews',
    '1,007',
    '24 August 2026',
    '25 August 2026',
    '76\\.3%',
    '93\\.3%',
    '40\\.5',
    'about 41 days',
    '2026 Q3',
    '€13,407',
    '€12,698',
    '€11,282',
    '€9,509',
    '€10,978',
    '€8,649',
    '€8,638',
    '€7,698',
    '€11,027',
    '€6,867',
    '€7,615',
    '€5,902',
    '€6,417',
    '€5,121',
    '\\[Q\\]',
  ].join('|')
);

function checkLeak(out, where, leaks) {
  const stripped = out.replace(/\{\{[^}]+\}\}/g, '');
  if (LEAK.test(stripped))
    leaks.push(
      `${where}: ${stripped.match(LEAK)[0]} — "${stripped.slice(0, 90)}"`
    );
}

function tokenise(text, where, leaks) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  checkLeak(out, where, leaks);
  return out;
}

/**
 * August copy: sentence references where the approved sentence appears
 * verbatim, then value references; "(2026 Q3 …)" takes the period of the
 * nearest preceding cohort figure (or the page's primary cohort).
 */
function tokeniseAugust(text, where, leaks, primaryCohort) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  for (const [from, to] of AUGUST_VALUES) out = out.split(from).join(to);
  out = out.replace(/2026 Q3/g, (_m, offset) => {
    const before = out.slice(0, offset);
    let best = null;
    let bestAt = -1;
    for (const id of COHORT_IDS) {
      const at = before.lastIndexOf('{{' + id + '.');
      if (at > bestAt) {
        bestAt = at;
        best = id;
      }
    }
    const id = best || primaryCohort;
    if (!id) return '2026 Q3';
    return `{{${id}.period}}`;
  });
  checkLeak(out, where, leaks);
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

/** August handoffs: H2 wording varies per page; map by topic, in order. */
const AUGUST_KIND_RULES = [
  [/frequently asked questions/i, 'faq'],
  [/^(what clients say|more reviews)|success story/i, 'reviews'],
  [/^(living (in|outside)|not a .* citizen, but living)/i, 'residence'],
  [/\b(EPF|EPS)\b/, 'local-scheme'],
  [/dual-citizenship/i, 'dual-citizenship'],
  [/spouse|parent|family member|inherit|survivor/i, 'family'],
  [
    /^(do i qualify|who (can|qualifies)|can .*claim a refund|are .* eligible|eligibility for|the three conditions|the rest of the checklist|the full checklist|one cap, two maps)/i,
    'qualify',
  ],
  [
    /timing your application|when (can|does|exactly)|window open|application date|filing date|filing windows|note on timing|SGK clock/i,
    'waiting-period',
  ],
  [
    /60-month|sixty months|no cap|no month limit|every month is claimable/i,
    'sixty-month',
  ],
  [
    /^(documents, process, payout|papers and process|cost, documents, process)$/i,
    'intake',
  ],
  [/\b(cost|costs|fee|price|charge)\b/i, 'cost'],
  [
    /^(documents|the document list|what you need|what to have ready|paperwork|what documents|what do you need to apply)/i,
    'intake',
  ],
  [
    /digital|online|paper|pixels|stamp|screenwork|envelope|process look like|process work/i,
    'certification',
  ],
  [
    /bank account|getting paid|payout|paid out|receiving the money|money's route|receive my money|where is the refund paid|payment without/i,
    'payout',
  ],
  [
    /how long|timeline|how fast|waiting, measured|pace, measured|^timing|until the money arrives|before the refund lands|filing to payout/i,
    'timing',
  ],
  [
    /how much|what comes back|refund contains|numbers look like|refund is worth|is in it|expect to receive|what does the refund|can i claim|usually get|worth/i,
    'amount',
  ],
  [/which jobs/i, 'years'],
];
function kindOfAugust(h2) {
  for (const [re, kind] of AUGUST_KIND_RULES) if (re.test(h2)) return kind;
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

/** Template CTA labels (CountryPage COUNTRY_CTA) for label-less components. */
const DEFAULT_CTA_LABEL = {
  '/get-your-refund': 'Start My Claim',
  '/refund-calculator': 'Check My Eligibility',
};

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

// --- conversion (September 2026 format) -------------------------------------
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
  uniqueIds(sections);

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
  return { page, leaks, notes: [] };
}

function uniqueIds(sections) {
  const seen = new Set();
  sections.forEach((s) => {
    let id = s.id;
    let n = 2;
    while (seen.has(id)) id = `${s.id}-${n++}`;
    s.id = id;
    seen.add(id);
  });
}

// --- conversion (August 2026 format) -----------------------------------------
function convertAugust(json) {
  const leaks = [];
  const notes = [];
  const slug = json.slug;
  const appendixIds = json.appendixA.flatMap((r) => r.ids);
  const primaryCohort = appendixIds.find((id) => COHORT_IDS.includes(id));
  const tk = (text, where) =>
    tokeniseAugust(text, where, leaks, primaryCohort || null);
  const rich = (b, where) => ({
    x: tk(b.x, where),
    sp: (b.sp || []).map((sp) =>
      sp.k === 'a'
        ? { k: 'a', x: tk(sp.x, where), href: sp.href }
        : { k: 'b', x: tk(sp.x, where) }
    ),
  });

  const hero = json.hero.map((b) => ({ t: 'p', ...rich(b, `${slug} hero`) }));
  if (json.trust !== TRUST)
    leaks.push(
      `${slug}: trust bar differs from the approved M-15/M-16 sentence`
    );
  const trust = '{{M-15.sentence}}';
  const bullets = json.bullets.map((b, i) =>
    tk(b.replace(/^✅\s*/, ''), `${slug} bullet ${i + 1}`)
  );

  const convertBlocks = (blocks, whereBase) => {
    const out = [];
    blocks.forEach((b, bi) => {
      const where = `${whereBase} #${bi}`;
      if (b.t === 'p') out.push({ t: 'p', ...rich(b, where) });
      else if (b.t === 'h3' || b.t === 'note')
        out.push({ t: b.t, x: tk(b.x, where) });
      else if (b.t === 'ul' || b.t === 'ol')
        out.push({ t: b.t, items: b.items.map((it) => rich(it, where)) });
      else if (b.t === 'table')
        out.push({
          t: 'table',
          rows: b.rows.map((r) => r.map((c) => tk(c, where))),
        });
      else if (b.t === 'component') {
        if (b.kind === 'cta') {
          const items = b.items.map((it) => {
            const path = it.href.replace(
              /^https:\/\/www\.germanypensionrefund\.com/,
              ''
            );
            let label = it.label;
            if (!label) {
              label = DEFAULT_CTA_LABEL[path] || 'Start My Claim';
              notes.push(
                `${slug}: label-less CTA → ${path} uses the template label "${label}"`
              );
            }
            return { label, href: it.href };
          });
          out.push({ t: 'cta', items });
        } else if (b.kind === 'reviews') {
          out.push({ t: 'reviews' });
        } else {
          notes.push(`${slug}: not placed — [${b.raw}]`);
        }
      } else throw new Error(`${slug}: unknown block type ${b.t}`);
    });
    return out;
  };

  const sections = [];
  json.sections.forEach((s) => {
    const kind = s.faq ? 'faq' : kindOfAugust(s.h2);
    const blocks = convertBlocks(s.blocks, `${slug} § ${s.h2.slice(0, 30)}`);
    if (kind !== 'faq' && blocks.length === 0) {
      notes.push(`${slug}: section "${s.h2}" dropped — nothing placeable`);
      return;
    }
    sections.push({
      id: kind === 'faq' ? 'faq' : slugify(s.h2),
      kind,
      h2: s.h2,
      blocks: kind === 'faq' ? [] : blocks,
    });
  });

  // jump menu: the six labels by kind; anchors without a section are dropped.
  // Pages that open with a residence section instead of "Do I qualify"
  // (Israel) use that opening section for the first anchor.
  const anchors = {};
  const used = new Set();
  if (
    !sections.some((s) => s.kind === 'qualify') &&
    sections[0] &&
    sections[0].kind === 'residence'
  ) {
    sections[0].id = 'do-i-qualify';
    anchors['do-i-qualify'] = 'do-i-qualify';
    used.add(sections[0]);
  }
  for (const [anchor, test] of ANCHOR_RULES) {
    if (anchors[anchor]) continue;
    const sec = sections.find((s) => test(s) && !used.has(s));
    if (sec) {
      sec.id = anchor;
      anchors[anchor] = anchor;
      used.add(sec);
    }
  }
  uniqueIds(sections);

  // FAQ: the visible FAQ is the page's own section (as delivered); the
  // FAQPage schema is Appendix B, which these handoffs word separately
  // ("a faithful condensation of the visible copy"). Pages without an
  // on-page FAQ section (USA, India, Australia) show none.
  const g = json.schema && json.schema['@graph'];
  const svc = g && g.find((n) => n['@type'] === 'Service');
  const faqNode = g && g.find((n) => n['@type'] === 'FAQPage');
  const schemaFaq = faqNode
    ? faqNode.mainEntity.map((q) => ({
        q: q.name,
        a: tk(q.acceptedAnswer.text, `${slug} schema faq`),
      }))
    : null;
  const faq = json.faq.map((f) => ({ q: f.q, a: tk(f.a, `${slug} faq`) }));
  if (!schemaFaq) leaks.push(`${slug}: Appendix B has no FAQPage`);
  else {
    const shared = faq.filter((f) => schemaFaq.find((s) => s.q === f.q));
    notes.push(
      `${slug}: visible FAQ ${faq.length} item(s), FAQPage schema ${schemaFaq.length} item(s) from Appendix B (${shared.length} shared)`
    );
  }
  if (faq.length) anchors.faq = 'faq';
  else
    notes.push(
      `${slug}: no on-page FAQ section — none rendered, no FAQ anchor`
    );

  const close = convertBlocks(json.close, `${slug} close`);
  const last = close[close.length - 1];
  const closeDisclaimer = Boolean(
    last &&
    last.t === 'p' &&
    /^Germany Pension Refund is a private service/.test(last.x)
  );

  const schema = svc
    ? {
        serviceName: svc.name,
        audienceType: svc.audience.audienceType,
        description: tk(svc.description, `${slug} schema`),
      }
    : {
        serviceName: json.title.replace(/\s*\(2026\)\s*$/, ''),
        audienceType: '',
        description: '',
      };
  if (!svc) leaks.push(`${slug}: Appendix B has no Service node`);

  const page = {
    slug,
    title: json.title,
    meta: tk(json.meta, `${slug} meta`),
    h1: json.h1,
    archetype: 'august',
    version: json.version ? `${json.version} (${json.date})` : json.date,
    hero,
    trust,
    bullets,
    sections,
    faq,
    schemaFaq: schemaFaq || undefined,
    close,
    closeTitle: json.closeTitle,
    closeDisclaimer,
    anchors,
    schema,
  };
  return { page, leaks, notes };
}

function emit(page) {
  const body = JSON.stringify(page, null, 2);
  const legacy =
    page.archetype === 'august'
      ? `// Copy as delivered in the August 2026 handoff — it carries the older service\n// wording; the client will send refreshed copy later (regenerate from it then).\n`
      : '';
  return (
    `// Generated by scripts/convert-country-pages.mjs from the ${page.version} handoff\n` +
    `// (${page.title}). Do not edit copy here — regenerate from the handoff.\n` +
    legacy +
    `import type { CountryPageData } from '../types';\n\n` +
    `const page: CountryPageData = ${body};\n\n` +
    `export default page;\n`
  );
}

mkdirSync(OUT, { recursive: true });
const files = readdirSync(IN)
  .filter((f) => f.endsWith('.json'))
  .sort();
const allLeaks = [];
const allNotes = [];
for (const f of files) {
  const json = JSON.parse(readFileSync(join(IN, f), 'utf8'));
  const { page, leaks, notes } =
    json.format === 'august' ? convertAugust(json) : convert(json);
  writeFileSync(join(OUT, `${page.slug}.ts`), emit(page));
  allLeaks.push(...leaks);
  allNotes.push(...notes);
  console.log(
    `${page.slug.padEnd(16)} ${page.archetype.padEnd(20)} ${String(page.version).padEnd(5)} sections=${page.sections.length} faq=${page.faq.length} (${(page.schemaFaq || page.faq).filter((q) => q.inSchema !== false).length} in schema) anchors=${Object.keys(page.anchors).length}`
  );
}

// index.ts lists every country module present in the output directory
const slugs = readdirSync(OUT)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => f.replace(/\.ts$/, ''))
  .sort();
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

if (allNotes.length) {
  console.log(`\n${allNotes.length} note(s):`);
  for (const n of allNotes) console.log('  - ' + n);
}
if (allLeaks.length) {
  console.error(`\n${allLeaks.length} warning(s):`);
  for (const l of allLeaks) console.error('  - ' + l);
  process.exitCode = 1;
} else {
  console.log(
    `\n${files.length} pages written to ${OUT} (index: ${slugs.length})`
  );
}
