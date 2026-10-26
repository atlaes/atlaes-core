#!/usr/bin/env node
/**
 * Parse a country-page content handoff (Markdown) into the intermediate
 * page JSON consumed by `convert-country-pages.mjs`. Node port of the
 * original `parse_country.py` (scratchpad), extended for the August 2026
 * handoff format (USA, India v2, Canada, Australia, …).
 *
 *   node scripts/parse-country-handoff.mjs --out <dir> <handoff.md> [...]
 *
 * Output per handoff: `<out>/<slug>.json` with
 *   { slug, format, title, meta, h1, date, hero[], trust, bullets[],
 *     sections[{ h2, blocks[] }], faq[{ q, a }], close[], closeTitle,
 *     appendixA[], schema (Appendix B @graph or null), source }
 *
 * Blocks: p | h3 | note | ul | ol | table | component. Text blocks carry
 * `x` (plain text) and `sp` (link / bold spans matched by text). Components
 * (`*[component: …]*`, `*[links: …]*`) are classified but not rendered here;
 * the converter maps them to CTA / reviews blocks or drops them.
 *
 * Copy is never reworded: only Markdown syntax is removed and the
 * quarterly-value markers are stripped (the values themselves are tokenised
 * by the converter). Every body line must match a known rule; anything else
 * is reported so a new handoff shape cannot pass silently.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

// --- CLI -------------------------------------------------------------------
const args = process.argv.slice(2);
const files = [];
let OUT = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') OUT = args[++i];
  else files.push(args[i]);
}
if (!OUT || files.length === 0) {
  console.error(
    'usage: parse-country-handoff.mjs --out <json dir> <handoff.md> [...]'
  );
  process.exit(2);
}

/** Live-site slugs that differ from the slug line in the handoff. */
const SLUG_OVERRIDES = {
  'south-korea': 'southkorea', // registry + live site use /southkorea
};

/** Quarterly marker, built at runtime so the literal never appears here. */
const Q_MARK = '**[' + 'Q]**';

// --- inline markdown → text + spans ---------------------------------------
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;
const ITALIC = /(^|[^*])\*([^*\n]+)\*(?!\*)/g;

/** Returns { x, sp, italics } for one paragraph of Markdown. */
function inline(md, notes, where) {
  let text = md;
  const sp = [];
  // markers first (they sit between words with a space on one side)
  text = text.split(' ' + Q_MARK).join('');
  text = text.split(Q_MARK + ' ').join('');
  text = text.split(Q_MARK).join('');
  // links
  text = text.replace(LINK, (_m, label, href) => {
    const plain = label.replace(BOLD, '$1');
    sp.push({ k: 'a', x: plain, href });
    return label; // bold inside a link is handled by the bold pass below
  });
  // bold
  text = text.replace(BOLD, (_m, inner) => {
    sp.push({ k: 'b', x: inner });
    return inner;
  });
  // italics (no italic span kind in the content model → plain text)
  text = text.replace(ITALIC, (_m, pre, inner) => {
    notes.push(`${where}: italic "${inner.slice(0, 40)}" rendered plain`);
    return pre + inner;
  });
  return { x: text.trim(), sp };
}

function plain(md) {
  return inline(md, [], '').x;
}

// --- components -------------------------------------------------------------
/** `"Label" block → href`, `"Label" CTA button → href`, `"Label" → href` */
const PAIR = /"([^"]+)"[^→"·]*→\s*(\S+)/g;
/** `Label → href` (links lines) and label-less `final CTA → href`. */
const BARE_PAIR = /([^·→]*?)\s*→\s*(\S+)/g;

/** Classify `*[component: …]*` / `*[links: …]*` lines. */
function component(kind, body) {
  const raw = body.trim();
  const c = { t: 'component', raw };
  if (/^hero /i.test(raw) || /^trust block/i.test(raw)) {
    c.kind = 'hero';
    return c;
  }
  if (/review wall — reviews snapshot, same source as homepage/i.test(raw)) {
    c.kind = 'reviews';
    return c;
  }
  if (
    /client story|reviews wall — keep|client quotes|carried over unchanged/i.test(
      raw
    )
  ) {
    c.kind = 'unplaced';
    return c;
  }
  // CTA: quoted "Label" → href pairs, else Label → href pairs
  const items = [];
  let m;
  PAIR.lastIndex = 0;
  while ((m = PAIR.exec(raw))) items.push({ label: m[1], href: m[2] });
  {
    BARE_PAIR.lastIndex = 0;
    const bare = [];
    while ((m = BARE_PAIR.exec(raw))) {
      let label = m[1]
        .replace(/^.*?(?:secondary link:|CTA button|block|CTA)\s*/i, '')
        .replace(/^["\s·]+|["\s·]+$/g, '');
      bare.push({ label, href: m[2] });
    }
    // quoted pairs win where present; bare pairs fill the unquoted ones
    for (const b of bare) {
      if (!items.find((it) => it.href === b.href)) items.push(b);
    }
  }
  // "secondary link: free refund calculator → url" keeps the label text
  items.forEach((it) => {
    it.label = it.label.replace(/^secondary link:\s*/i, '').trim();
    it.href = it.href.replace(/[)\]]+$/, '');
  });
  if (items.length === 0) {
    c.kind = 'unplaced';
    return c;
  }
  c.kind = 'cta';
  c.items = items;
  return c;
}

// --- parser -------------------------------------------------------------------
function parseHandoff(text, file) {
  const notes = [];
  const lines = text.split(/\r?\n/);
  const head = (re) => {
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };

  const urlLine = head(/\*\*URL:\*\*\s*(\/[a-z0-9-]+)/);
  if (!urlLine) throw new Error(`${file}: no **URL:** line`);
  let slug = urlLine.slice(1);
  if (SLUG_OVERRIDES[slug]) slug = SLUG_OVERRIDES[slug];
  const date = head(/\*\*Date:\*\*\s*([^·\n]+)/) || '';
  const version = head(/\*\*Version:\*\*\s*(v[\d.]+)/);
  const format = version ? 'september' : 'august';

  let title = head(/- \*\*Title tag:\*\*\s*(.+)/) || '';
  title = title.replace(/\s*\*\([^)]*\)\*\s*$/, '').trim();
  let meta = head(/- \*\*Meta description:\*\*\s*(.+)/) || '';
  meta = meta.replace(/\s*\*\([^)]*\)\*\s*$/, '').trim();
  if (/^["“].*["”]$/.test(meta)) meta = meta.slice(1, -1);
  meta = plain(meta);

  // body = from "# H1:" up to Appendix A
  const h1Idx = lines.findIndex((l) => /^# H1:/.test(l));
  let endIdx = lines.findIndex((l) => /^## Appendix A/.test(l));
  if (h1Idx === -1) throw new Error(`${file}: no H1`);
  if (endIdx === -1) endIdx = lines.length;

  const h1 = lines[h1Idx].replace(/^# H1:\s*/, '').trim();
  const hero = [];
  let trust = null;
  const bullets = [];
  const sections = [];
  let cur = null; // current section
  let mode = 'hero'; // hero | bullets | body
  let list = null; // open ul/ol block
  let table = null; // open table block

  const closeList = () => {
    list = null;
  };
  const closeTable = () => {
    table = null;
  };
  const push = (block) => {
    if (!cur) {
      if (block.t === 'p') hero.push(block);
      else if (block.t === 'component' && block.kind === 'hero') return;
      else notes.push(`${slug}: block before first H2 dropped (${block.t})`);
      return;
    }
    cur.blocks.push(block);
  };

  for (let i = h1Idx + 1; i < endIdx; i++) {
    const line = lines[i];
    const s = line.trim();
    const where = `${slug}:${i + 1}`;
    if (s === '' || s === '---') {
      closeList();
      closeTable();
      continue;
    }
    // components
    let m = s.match(/^\*\[(component|links):\s*(.*)\]\*$/);
    if (m) {
      closeList();
      closeTable();
      const c = component(m[1], m[2]);
      if (c.kind === 'hero') continue; // hero CTA / images: template chrome
      push(c);
      continue;
    }
    // hero trust + bullets
    m = s.match(/^\*\*Trust(?:-block review line| bar):\*\*\s*(.*)$/);
    if (m) {
      trust = plain(m[1]);
      continue;
    }
    if (/^\*\*(Hero bullets|Trust-block bullets):\*\*$/.test(s)) {
      mode = 'bullets';
      continue;
    }
    if (mode === 'bullets' && /^- ✅\s*/.test(s)) {
      bullets.push(plain(s.replace(/^- ✅\s*/, '')));
      continue;
    }
    // headings
    m = s.match(/^## H2:\s*(.*)$/);
    if (m) {
      closeList();
      closeTable();
      mode = 'body';
      cur = { h2: m[1].trim(), blocks: [] };
      sections.push(cur);
      continue;
    }
    m = s.match(/^###\s*(?:H3:\s*)?(.*)$/);
    if (m) {
      closeList();
      closeTable();
      push({ t: 'h3', x: plain(m[1]) });
      continue;
    }
    // tables
    if (/^\|.*\|$/.test(s)) {
      closeList();
      if (/^\|\s*:?-{2,}/.test(s)) continue; // separator row
      const cells = s
        .slice(1, -1)
        .split('|')
        .map((c) => plain(c.trim()));
      if (!table) {
        table = { t: 'table', rows: [] };
        push(table);
      }
      table.rows.push(cells);
      continue;
    }
    closeTable();
    // lists
    m = s.match(/^- (.*)$/);
    if (m) {
      if (!list || list.t !== 'ul') {
        list = { t: 'ul', items: [] };
        push(list);
      }
      list.items.push(inline(m[1], notes, where));
      continue;
    }
    m = s.match(/^\d+\.\s+(.*)$/);
    if (m) {
      if (!list || list.t !== 'ol') {
        list = { t: 'ol', items: [] };
        push(list);
      }
      list.items.push(inline(m[1], notes, where));
      continue;
    }
    closeList();
    // whole-line italic → note
    if (/^\*[^*].*[^*]\*$/.test(s)) {
      push({ t: 'note', x: plain(s.slice(1, -1)) });
      continue;
    }
    // paragraph
    const p = inline(s, notes, where);
    push({ t: 'p', x: p.x, sp: p.sp });
  }

  // --- FAQ section(s) → faq[] ------------------------------------------------
  const faq = [];
  const isFaqH2 = (h2) => /frequently asked questions/i.test(h2);
  for (const sec of sections) {
    if (!isFaqH2(sec.h2)) continue;
    let pendingQ = null;
    const leftovers = [];
    for (const b of sec.blocks) {
      if (b.t !== 'p') {
        leftovers.push(b);
        continue;
      }
      const bold = (b.sp || []).find((x) => x.k === 'b');
      if (bold && b.x.indexOf(bold.x) === 0) {
        const rest = b.x.slice(bold.x.length).trim();
        if (pendingQ) {
          notes.push(`${slug}: FAQ "${pendingQ.slice(0, 40)}" has no answer`);
        }
        if (rest) {
          faq.push({ q: bold.x.trim(), a: rest });
          pendingQ = null;
        } else {
          pendingQ = bold.x.trim();
        }
      } else if (pendingQ) {
        faq.push({ q: pendingQ, a: b.x });
        pendingQ = null;
      } else {
        leftovers.push(b);
      }
    }
    if (pendingQ) notes.push(`${slug}: FAQ "${pendingQ}" has no answer`);
    sec.faq = true;
    sec.blocks = leftovers;
    if (leftovers.length)
      notes.push(`${slug}: ${leftovers.length} non-Q/A block(s) in the FAQ`);
  }

  // --- closing section = last H2 ------------------------------------------------
  let close = [];
  let closeTitle = null;
  if (sections.length && !sections[sections.length - 1].faq) {
    const last = sections.pop();
    closeTitle = last.h2;
    close = last.blocks;
  } else {
    notes.push(`${slug}: no closing section found`);
  }

  // --- Appendix A (register ids) --------------------------------------------
  const appendixA = [];
  const appA = text.split(/^## Appendix A[^\n]*$/m)[1];
  if (appA) {
    const tbl = appA.split(/^## Appendix B/m)[0];
    for (const row of tbl.split('\n')) {
      const cells = row.split('|').map((c) => c.trim());
      if (cells.length >= 4 && /^(M|TM|S)-\d/.test(cells[2])) {
        appendixA.push({
          value: cells[1],
          ids: cells[2].split('/').map((x) => x.trim()),
          nextRefresh: cells[3],
        });
      }
    }
  }

  // --- Appendix B (JSON-LD) --------------------------------------------------
  let schema = null;
  const appB = text.split(/^## Appendix B[^\n]*$/m)[1];
  if (appB) {
    const fence = appB.match(/```json\s*\n([\s\S]*?)\n```/);
    const single = appB.match(/^\{"@context".*$/m);
    const raw = fence ? fence[1] : single ? single[0] : null;
    if (raw) {
      try {
        schema = JSON.parse(raw);
      } catch (e) {
        notes.push(`${slug}: Appendix B JSON does not parse (${e.message})`);
      }
    } else {
      notes.push(`${slug}: Appendix B has no JSON block`);
    }
  }

  if (!trust) notes.push(`${slug}: no trust bar`);
  if (bullets.length !== 5)
    notes.push(`${slug}: ${bullets.length} hero bullets (expected 5)`);

  return {
    json: {
      slug,
      format,
      version: version || null,
      date,
      title,
      meta,
      h1,
      hero,
      trust,
      bullets,
      sections,
      faq,
      close,
      closeTitle,
      appendixA,
      schema,
      source: basename(file),
    },
    notes,
  };
}

// --- main ---------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
let allNotes = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  const { json, notes } = parseHandoff(text, f);
  writeFileSync(join(OUT, `${json.slug}.json`), JSON.stringify(json, null, 2));
  allNotes = allNotes.concat(notes);
  const comps = json.sections
    .flatMap((s) => s.blocks)
    .concat(json.close)
    .filter((b) => b.t === 'component')
    .map((b) => b.kind);
  console.log(
    `${json.slug.padEnd(16)} ${json.format.padEnd(9)} sections=${json.sections.length} faq=${json.faq.length} close=${json.close.length} components=[${comps.join(',')}]`
  );
}
if (allNotes.length) {
  console.log(`\n${allNotes.length} note(s):`);
  for (const n of allNotes) console.log('  - ' + n);
}
