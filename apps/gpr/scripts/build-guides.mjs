#!/usr/bin/env node
/**
 * Build the forms guides, the downloads directory and the articles from the
 * client handoffs (Stream C). Port of the scratchpad `emit_guide.py` parser:
 * the handoff markdown becomes blocks (p / h2 / h3 / quote / note / ul / ol /
 * table / kv / src / tool) with spans for bold and links, plus FAQ items.
 *
 *   node scripts/build-guides.mjs \
 *     [--handoffs "/home/deck/Downloads/GPR other pages"] [--only <id>]
 *
 * Rules applied (never rewording copy):
 *   - build instructions are stripped: "Wix implementation" notes,
 *     `*[component: …]*`, `[Q]` markers, "Reviewed by: [name — …]";
 *   - `*[link: …]*` / `[…]` placeholders become links resolved against the
 *     links and forms registries (`drv:<form>[:<lang>]`, `eantrag:`);
 *   - the A1310 change guide (8 Sep 2026): pairs A1–A4 on the V0901 guide,
 *     B2–B4 on /download — the Replace texts are the canonical copy;
 *   - quarterly figures on the processing-time page and in the cornerstone
 *     timing chapter are replaced by token references (`content/tokens.json`);
 *     the script fails on a leaked register figure or marker;
 *   - FAQ answers are checked against the schema paste source
 *     (`GPR_FormsPages_FAQ_Markup_2026-09-10.md` / the handoff appendices).
 * Run Prettier on the output afterwards.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
};
const HANDOFFS = opt('--handoffs', '/home/deck/Downloads/GPR other pages');
const ONLY = opt('--only', null);

const Q = '[' + 'Q]';
const SITE = 'https://www.germanypensionrefund.com';

// --- link labels (mirror of content/registries/links.ts) -----------------
const LABELS = {
  '/download': 'Downloads — official DRV forms',
  '/v0901-pension-refund-form-english': 'V0901 form guide (English)',
  '/v0900-formular': 'V0900-Formular erklärt (Deutsch)',
  '/v0100-form': 'V0100 account-clarification guide',
  '/v0800-child-raising-periods': 'V0800 child-raising-periods guide',
  '/a1310-payment-declaration': 'A1310 payment-declaration guide',
  '/post/how-to-get-a-german-pension-refund': 'Refund Guide',
  '/post/which-german-pension-office-handles-your-claim':
    'Which German pension office handles your claim',
  '/post/german-social-security-number': 'German social security number',
  '/post/german-pension-refund-waiting-period': 'Waiting period',
  '/post/brexit': 'Brexit',
  '/post/german-widow-pension': 'German widow pension',
  '/german-pension-refund-processing-time': 'Processing Times & Data',
  '/refund-calculator': 'Refund Calculator',
  '/pricing': 'Pricing',
  '/contact-us': 'Contact Us',
  '/faqs': 'FAQ',
  '/morocco': 'Morocco',
  '/tunisia': 'Tunisia',
};
const PATH_ALIASES = {
  '/v0100-account-clarification': '/v0100-form',
  '/v0900-beitragserstattung': '/v0900-formular',
};
const FORM_CODE =
  /\b(V0901|V0900|V0910|V0100|V0110|V0800|V0810|V0811|V0805|V0820|A1310(?:en|fr|sp|po|gre)?|A1311|R0985|E5816|E5817)\b/;
const A1310_LANG = {
  A1310en: 'de-en',
  A1310fr: 'de-fr',
  A1310sp: 'de-es',
  A1310po: 'de-pt',
  A1310gre: 'de-el-tr',
};
const DL_LANG = {
  'DE/EN': 'de-en',
  'DE/FR': 'de-fr',
  'DE/ES': 'de-es',
  'DE/IT': 'de-it',
  'DE/PT': 'de-pt',
  'DE/GR/TR': 'de-el-tr',
};

function drvHref(code, langHint) {
  if (A1310_LANG[code]) return 'drv:A1310:' + A1310_LANG[code];
  if (code === 'V0901') return 'drv:V0901:de-en';
  if (langHint) return `drv:${code}:${langHint}`;
  return 'drv:' + code;
}

// --- text helpers -----------------------------------------------------------
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const unesc = (s) => s.replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1');
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[’'"“”„]/g, '')
    .replace(/[^a-z0-9äöüß]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 7)
    .join('-');
}

/**
 * Resolve a `*[…]*` / `[…]` placeholder to { label, href } or null.
 * `ctx` is the surrounding text (list item / paragraph) for bare `[Link]`.
 */
function resolvePlaceholder(inner, ctx, page) {
  let s = unesc(inner).trim();
  if (
    /^(component|Wix implementation|build|E-Mail-Feld|Senden|Checkbox|name)/i.test(
      s
    )
  )
    return { drop: true };
  const prefixed = /^(link|links|Link|Links)\s*:\s*/.test(s);
  s = s.replace(/^(link|links|Link|Links)\s*:\s*/, '');
  const isBareLink = /^(link|links|Link|Links)$/.test(s);
  if (isBareLink) s = '';

  // split "label → target" / "label: target"
  let label = null;
  let target = s;
  let m = s.match(/^(.*?)\s*(?:→|:)\s*(\/\S.*)$/);
  if (m && m[1]) {
    label = m[1].trim();
    target = m[2].trim();
  }
  // internal path
  let href = null;
  const pm = target.match(/(?:^|[\s:→(])(\/[a-z0-9][a-z0-9/-]*)/i);
  if (pm) {
    href = PATH_ALIASES[pm[1]] || pm[1];
    if (label === null) {
      const own = target.replace(pm[1], '').trim();
      // "[/download]" or "link: /path — section" → registry label
      label = LABELS[href] || own || href;
      if (!prefixed && !isBareLink && s !== target) label = s;
      if (prefixed || isBareLink || s === pm[1] || /^\//.test(s))
        label = '→ ' + (LABELS[href] || href);
    } else if (/→/.test(inner) && /^\*/.test(inner)) {
      label = label + ' →';
    }
    return { label, href };
  }
  // V0900 guide / widow article pointers without a path
  if (/V0900 guide|V0900-Anleitung/i.test(target)) {
    return { label: '→ ' + LABELS['/v0900-formular'], href: '/v0900-formular' };
  }
  if (/Widow|Witwe/i.test(target)) {
    return {
      label: '→ ' + LABELS['/post/german-widow-pension'],
      href: '/post/german-widow-pension',
    };
  }
  if (/Datenschutz|privacy/i.test(target)) {
    return { label: s || 'Datenschutzerklärung', href: '/privacy-policy' };
  }
  // downloads-page brackets: "Official DRV download — V0901 DE/EN"
  const dl = target.match(/(V0901|A1310)\s+(DE\/[A-Z/]+)$/);
  if (dl) {
    return { label: s, href: `drv:${dl[1]}:${DL_LANG[dl[2]]}` };
  }
  // eAntrag
  if (
    /eAntrag|Online-Antrag/i.test(target) &&
    !/als PDF|as PDF/i.test(target)
  ) {
    return {
      label:
        s || (page.lang === 'de' ? 'Online-Antrag der DRV' : 'DRV eAntrag'),
      href: 'eantrag:',
    };
  }
  // form code in the placeholder itself
  let fm = target.match(FORM_CODE);
  if (fm) {
    const generic =
      page.lang === 'de' ? 'DRV-Formularseite' : 'Official DRV form page';
    const lbl = prefixed || !s ? generic : s;
    return { label: prefixed ? '→ ' + lbl : lbl, href: drvHref(fm[1]) };
  }
  // bare [Link] / [links: official DRV pages] → context decides
  if (
    isBareLink ||
    !s ||
    /official DRV (form )?pages?|Formularseite/i.test(s)
  ) {
    if (
      /eAntrag|Online-Antrag/i.test(ctx) &&
      !/(V0[0-9]{3}|A13)/.test(ctx.slice(0, 40))
    ) {
      return {
        label: page.lang === 'de' ? '→ Online-Antrag der DRV' : '→ DRV eAntrag',
        href: 'eantrag:',
      };
    }
    const cm = ctx.match(FORM_CODE);
    if (cm) {
      const many = /V0810 \/ V0811|links:/i.test(ctx + ' ' + inner);
      const lbl =
        page.lang === 'de'
          ? '→ DRV-Formularseite'
          : many
            ? '→ Official DRV form pages'
            : '→ Official DRV form page';
      return { label: lbl, href: drvHref(cm[1]) };
    }
  }
  return null;
}

/** Parse inline markdown into { x, sp } (bold + link spans). */
function inline(raw, page, ctx, warn) {
  let s = raw;
  s = s.replace(new RegExp('\\s*\\*\\*\\' + Q + '\\*\\*', 'g'), '');
  s = s.replace(new RegExp('\\s*\\' + Q, 'g'), '');
  const links = [];
  const token = (label, href) => {
    links.push({ label: label.replace(/\*\*/g, ''), href });
    return `\u0001${links.length - 1}\u0001`;
  };
  // 1. real markdown links
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    let h = href;
    if (h.indexOf(SITE) === 0) h = h.slice(SITE.length) || '/';
    h = PATH_ALIASES[h] || h;
    if (page.linkSwaps && page.linkSwaps[h]) h = page.linkSwaps[h];
    return token(label, h);
  });
  // 2. placeholders
  const ph = (m, inner, offset, str) => {
    const r = resolvePlaceholder(inner, ctx || raw, page);
    if (!r) {
      warn(`unresolved placeholder "${inner}"`);
      return '';
    }
    if (r.drop) return '';
    const label =
      /→\s*$/.test(str.slice(0, offset)) && /^→ /.test(r.label)
        ? r.label.slice(2)
        : r.label;
    return token(label, r.href);
  };
  s = s.replace(/\*\[([^\]]+)\]\*/g, ph);
  s = s.replace(/\[([^\]\u0001]+)\](?!\()/g, ph);
  // 3. single-asterisk italics → plain
  s = s.replace(/(?<![*\w])\*(?!\*)([^*\n]+?)\*(?![*\w])/g, '$1');
  // 4. bold runs + link tokens
  let out = '';
  const linkSpans = [];
  const boldSpans = [];
  for (const part of s.split(/(\*\*[^*]+?\*\*)/)) {
    const isB = part.startsWith('**') && part.endsWith('**') && part.length > 4;
    const body = isB ? part.slice(2, -2) : part;
    const st = out.length;
    for (const seg of body.split(/(\u0001\d+\u0001)/)) {
      const tm = seg.match(/^\u0001(\d+)\u0001$/);
      if (tm) {
        const l = links[+tm[1]];
        out += l.label;
        linkSpans.push({ k: 'a', x: norm(l.label), href: l.href });
      } else out += seg;
    }
    if (isB) boldSpans.push({ k: 'b', x: norm(out.slice(st)) });
  }
  out = out.replace(/\*\*/g, '');
  const x = unesc(norm(out));
  const sp = [...linkSpans, ...boldSpans]
    .map((p) => ({ ...p, x: unesc(p.x) }))
    .filter((p) => p.x && x.indexOf(p.x) !== -1);
  return { x, sp };
}

function plain(raw, page, warn) {
  return inline(raw, page, raw, warn).x;
}

/** Join hard-wrapped lines; a line ending in "/" continues without a space. */
function joinLines(ls) {
  return ls.reduce(
    (acc, l) => (acc === '' ? l : /\/$/.test(acc) ? acc + l : acc + ' ' + l),
    ''
  );
}

// --- block parser ---------------------------------------------------------
const SRC_PREFIX =
  /^(Sources:|Quellen:|Official basis:|Official sources:|Official basis\s|Legal basis and official guidance:|Main FAQ sources:|Tax source:|Last checked:|Zuletzt geprüft:)/;
const FAQ_H2 = /^(FAQ|Frequently asked questions|Häufig gestellte Fragen)$/i;
const ITEM = /^\s{0,3}(-|\d+\.)\s+/;

function parseBody(body, page) {
  const warnings = [];
  const warn = (m) => warnings.push(`${page.id}: ${m}`);
  const h2set = new Set((page.h2 || []).map((h) => h.trim()));
  const h3set = new Set((page.h3 || []).map((h) => h.trim()));
  const lines = body.split('\n');
  const blocks = [];
  let h1 = page.h1 || '';
  let buf = [];
  let i = 0;

  const pushRich = (t, text, ctx) => {
    const r = inline(text, page, ctx, warn);
    if (r.x) blocks.push({ t, ...r });
  };

  const flush = () => {
    if (!buf.length) return;
    // a bold-only first line (FAQ question) is its own paragraph
    if (buf.length > 1 && /^\*\*[^*]+\*\*$/.test(buf[0])) {
      const q = buf.shift();
      const rest = buf;
      buf = [q];
      flush();
      buf = rest;
    }
    let text = joinLines(buf);
    buf = [];
    const trimmed = text.trim();
    // build instructions
    if (
      /^(\*\*)?Wix implementation/.test(trimmed) ||
      /^\*\[Wix implementation/.test(trimmed)
    ) {
      const rule = (page.wixRules || []).find((r) => r.match.test(trimmed));
      if (rule) rule.tools.forEach((kind) => blocks.push({ t: 'tool', kind }));
      return;
    }
    if (/^\*\[component:/.test(trimmed)) return;
    if (/^(Updated|Aktualisiert): /.test(trimmed)) {
      page._updated = trimmed;
      return;
    }
    // paragraph-level replacements (change guide, cascade pairs)
    for (const rep of page.paraReplace || []) {
      if (rep.match.test(norm(text))) {
        text = rep.text;
        rep.used = true;
      }
    }
    if (page.nameRule) {
      text = text.replace(/\bGPR\b(?!-(PTS|RFS))/g, 'Germany Pension Refund');
    }
    const t2 = text.trim();
    // italic-only paragraph → note (ID-02 disclaimer → quote)
    if (/^\*[^*].*[^*]\*$/.test(t2) && !/\*\*/.test(t2.slice(1, -1))) {
      const inner = t2.slice(1, -1);
      if (
        page.bylineItalic &&
        /^By Johannes Kühn/.test(inner) &&
        !page._byline
      ) {
        page._byline = plain(inner, page, warn);
        return;
      }
      if (
        /is a (private )?service|ist ein privater Dienstleister/.test(inner)
      ) {
        pushRich('quote', inner);
      } else pushRich('note', inner);
      return;
    }
    const r = inline(text, page, text, warn);
    if (!r.x) return;
    if (SRC_PREFIX.test(r.x)) {
      blocks.push({ t: 'src', ...r });
      return;
    }
    blocks.push({ t: 'p', ...r });
  };

  while (i < lines.length) {
    const l = lines[i];
    const tr = l.trim();
    if (!tr) {
      flush();
      i++;
      continue;
    }
    const ut = unesc(tr);
    if (h2set.has(ut)) {
      flush();
      blocks.push({ t: 'h2', x: ut });
      i++;
      continue;
    }
    if (h3set.has(ut)) {
      flush();
      blocks.push({ t: 'h3', x: ut });
      i++;
      continue;
    }
    if (page.h1 && ut === page.h1 && blocks.length === 0 && !buf.length) {
      i++;
      continue;
    }
    if (l.startsWith('# ') && !h1) {
      flush();
      h1 = plain(l.slice(2), page, warn);
      i++;
      continue;
    }
    if (l.startsWith('## ')) {
      flush();
      blocks.push({ t: 'h2', x: plain(l.slice(3), page, warn) });
      i++;
      continue;
    }
    if (l.startsWith('### ')) {
      flush();
      blocks.push({ t: 'h3', x: plain(l.slice(4), page, warn) });
      i++;
      continue;
    }
    if (/^---+$/.test(tr)) {
      flush();
      i++;
      continue;
    }
    if (l.startsWith('|')) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i]
          .trim()
          .replace(/\\\|/g, '\u0002')
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => plain(c.replace(/\u0002/g, '|'), page, warn));
        i++;
        if (row.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue;
        rows.push(row);
      }
      if (rows.length) {
        if (page.kvTables && rows[0].length === 2)
          blocks.push({ t: 'kv', rows });
        else blocks.push({ t: 'table', rows });
      }
      continue;
    }
    if (l.startsWith('>')) {
      flush();
      const q = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        q.push(lines[i].replace(/^>\s?/, '').trim());
        i++;
      }
      const text = q.join(' ');
      if (!/Wix implementation/.test(text)) pushRich('quote', text);
      continue;
    }
    if (ITEM.test(l)) {
      flush();
      const kind = /^\s{0,3}-/.test(l) ? 'ul' : 'ol';
      const items = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (ITEM.test(cur) && (/^\s{0,3}-/.test(cur) ? 'ul' : 'ol') === kind) {
          items.push([cur.replace(ITEM, '').trim()]);
          i++;
        } else if (!cur.trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          const nx = lines[j] || '';
          if (
            j < lines.length &&
            ((ITEM.test(nx) && (/^\s{0,3}-/.test(nx) ? 'ul' : 'ol') === kind) ||
              (/^\s{2,}\S/.test(nx) && items.length))
          ) {
            i = j;
          } else break;
        } else if (/^\s{2,}\S/.test(cur) && items.length) {
          items[items.length - 1].push(cur.trim());
          i++;
        } else break;
      }
      blocks.push({
        t: kind,
        items: items.map((it) =>
          inline(joinLines(it), page, joinLines(it), warn)
        ),
      });
      continue;
    }
    buf.push(tr);
    i++;
  }
  flush();
  return { h1, blocks, warnings };
}

// --- post-processing ------------------------------------------------------
function extractFaq(blocks, page) {
  const out = [];
  let faq = [];
  let faqTitle;
  let inFaq = false;
  let cur = null;
  const isQuestion = (b) =>
    b.t === 'h3' ||
    (b.t === 'p' &&
      b.sp.length === 1 &&
      b.sp[0].k === 'b' &&
      b.sp[0].x === b.x) ||
    (inFaq &&
      b.t === 'p' &&
      !b.sp.length &&
      b.x.length < 170 &&
      /\?$/.test(b.x));
  for (const b of blocks) {
    if (b.t === 'h2') {
      if (inFaq) {
        if (cur) faq.push(cur);
        cur = null;
        inFaq = false;
      }
      if (FAQ_H2.test(b.x) && !faqTitle) {
        inFaq = true;
        faqTitle = page.lang === 'de' ? b.x : 'Frequently asked questions';
        out.push({ t: 'faq' });
        continue;
      }
    }
    if (
      inFaq &&
      ((b.t === 'src' && /^(Sources|Quellen|Main FAQ sources):/.test(b.x)) ||
        b.t === 'tool')
    ) {
      if (cur) faq.push(cur);
      cur = null;
      inFaq = false;
    }
    if (!inFaq) {
      out.push(b);
      continue;
    }
    if (isQuestion(b)) {
      if (cur) faq.push(cur);
      cur = { q: b.x, blocks: [] };
    } else if (cur) cur.blocks.push(b);
    else out.push(b);
  }
  if (cur) faq.push(cur);
  faq = faq.map((f) => {
    const single = f.blocks.length === 1 && f.blocks[0].t === 'p';
    const a = f.blocks
      .filter((b) => b.t === 'p' || b.t === 'note')
      .map((b) => b.x)
      .join(' ');
    const item = { q: f.q, a, inSchema: page.faqInSchema };
    if (!single || f.blocks[0].sp.some((s) => s.k === 'a'))
      item.blocks = f.blocks;
    return item;
  });
  return { blocks: out, faq, faqTitle };
}

function extractReview(blocks, page) {
  let review = page.reviewLine || page._byline || page._updated;
  const out = [];
  for (const b of blocks) {
    if (b.t === 'src') {
      let x = b.x.replace(
        /\s*·\s*(Reviewed by|Geprüft von):\s*(\[[^\]]*\])?\s*$/,
        ''
      );
      const lm = x.match(/\s*(Last checked|Zuletzt geprüft): ([^·]+?)\s*$/);
      if (lm) {
        if (!review) review = `${lm[1]}: ${lm[2].trim()}`;
        x = x.slice(0, lm.index).trim();
      }
      if (!x) continue;
      out.push({ ...b, x, sp: b.sp.filter((s) => x.indexOf(s.x) !== -1) });
    } else out.push(b);
  }
  return { blocks: out, review };
}

function assignIds(blocks) {
  const seen = new Set();
  return blocks.map((b) => {
    if (b.t !== 'h2') return b;
    let id = slugify(b.x) || 'section';
    let n = 2;
    while (seen.has(id)) id = `${slugify(b.x)}-${n++}`;
    seen.add(id);
    return { ...b, id };
  });
}

function mapText(blocks, fn) {
  const rich = (r) => ({
    ...r,
    x: fn(r.x),
    sp: r.sp.map((s) => ({ ...s, x: fn(s.x) })),
  });
  return blocks.map((b) => {
    if (b.t === 'p' || b.t === 'quote' || b.t === 'note' || b.t === 'src')
      return rich(b);
    if (b.t === 'ul' || b.t === 'ol') return { ...b, items: b.items.map(rich) };
    if (b.t === 'table' || b.t === 'kv')
      return { ...b, rows: b.rows.map((r) => r.map(fn)) };
    if (b.t === 'h2' || b.t === 'h3') return { ...b, x: fn(b.x) };
    return b;
  });
}

// --- schema sources (FAQ paste text) ---------------------------------------
function readFaqMarkup(sectionRe) {
  const txt = readFileSync(
    join(HANDOFFS, 'GPR_FormsPages_FAQ_Markup_2026-09-10.md'),
    'utf8'
  );
  const idx = txt.search(sectionRe);
  if (idx === -1) return null;
  const rest = txt.slice(idx);
  const line = rest.match(/^\{"@context".*$/m);
  return line ? faqFromGraph(JSON.parse(line[0])) : null;
}
function faqFromGraph(g) {
  const node = g['@graph'].find((n) => n['@type'] === 'FAQPage');
  return node
    ? node.mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }))
    : [];
}
function readAppendixFaq(file) {
  const txt = readFileSync(join(HANDOFFS, file), 'utf8');
  const line = txt.match(/^\{"@context".*"FAQPage".*$/m);
  return line ? faqFromGraph(JSON.parse(line[0])) : null;
}

// --- page configuration ----------------------------------------------------
const LOGO =
  'https://static.wixstatic.com/media/da88a8_eeadb28f689f4702b5a53c1ff8bab97d~mv2.png';
const CTA_EN = [
  { label: 'Check your eligibility — free →', href: '/refund-calculator' },
  { label: 'Start my claim', href: '/get-your-refund' },
];
const FORMS_CRUMB = { label: 'Forms & guides', href: '/download' };
const NEWS_CRUMB = { label: 'News', href: '/blog' };

const A1310_GUIDE = '/a1310-payment-declaration';

const PAGES = [
  {
    id: 'v0901-pension-refund-form-english',
    out: 'guides',
    kind: 'guide',
    lang: 'en',
    file: 'GPR_FormsPage_V0901_EN_v1.1_2026-08-31.md',
    extract: 'fenced',
    path: '/v0901-pension-refund-form-english',
    title:
      'V0901 Form in English: German Pension Refund Application Guide (2026)',
    meta: 'V0901 is the official German pension refund application from abroad. Section-by-section English walkthrough, A1310 — and the mistakes that delay refunds.',
    eyebrow: 'Form guide · V0901',
    rail: 'Form guide',
    crumbs: [{ label: 'Home', href: '/' }, FORMS_CRUMB, { label: 'V0901' }],
    datePublished: '2026-09-02',
    dateModified: '2026-09-10',
    faqInSchema: true,
    faqSchema: () => readFaqMarkup(/## 1 · V0901 guide/),
    cta: CTA_EN,
    downloads: ['V0901', 'A1310'],
    rawReplace: [
      // A1 (apply now)
      [
        'or have us prepare\neverything for you.',
        'or have us prepare everything, with the filing handled by our German partner law firm.',
      ],
    ],
    paraReplace: [
      {
        // A2 — walkthrough, "The payment declaration (A1310)."
        match: /^\*\*The payment declaration \(A1310\)\.\*\* Your bank details/,
        text: `**The payment declaration (A1310).** V0901 asks for payment details in Section 11 — but in the refund cases we see, DRV generally still requires the separate, signed A1310 as the payment declaration for the payout, so send it with the application. Your bank details — IBAN/SWIFT or the local format — go on the A1310, which covers every country except Italy (Italy uses A1311); it also records who may use the account, with the form's own restrictions for US, Canadian and third-party accounts — see [our A1310 guide, section by section](${A1310_GUIDE}). A third-party account can be used where the required account-holder declaration and compliance checks are satisfied. A German bank account is not required.`,
      },
      {
        // A4 — FAQ "Do I need form A1310?"
        match:
          /^If the refund should reach an account outside Germany — almost always, yes\./,
        text: `In practice, almost always — yes. V0901 asks for payment details in Section 11, but in the refund cases we see, DRV generally still requires the separate, signed A1310 as the payment declaration for the payout. A1310 covers every country except Italy (A1311). A German bank account is not required. Section-by-section guide: [Form A1310 explained in English](${A1310_GUIDE}).`,
      },
    ],
    itemReplace: [
      {
        // A3 — mistake 2
        match: /^A missing or incomplete payment declaration\./,
        text: `**A missing or incomplete payment declaration.** In the refund cases we see, DRV generally does not release a refund to an account outside Germany without a usable, signed A1310 — the form's account-holder options and their US, Canadian and EU restrictions are explained in [our A1310 guide](${A1310_GUIDE}).`,
      },
    ],
    source:
      'GPR_FormsPage_V0901_EN_v1.1_2026-08-31.md + A1310 change guide pairs A1–A4 (8 Sep 2026)',
  },
  {
    id: 'v0900-formular',
    out: 'guides',
    kind: 'guide',
    lang: 'de',
    file: 'GPR_FormsPage_V0900_DE_v1.1_2026-09-03.md',
    extract: 'fenced',
    path: '/v0900-formular',
    title: 'V0900: Beitragserstattung im Inland — Anleitung (2026)',
    meta: 'V0900 erklärt: Wer die Beitragserstattung im Inland bekommt — Beamte, Regelaltersgrenze, Hinterbliebene —, wie der Online-Antrag läuft, welche Fehler Sie vermeiden.',
    eyebrow: 'Formular-Anleitung · V0900',
    rail: 'Anleitung',
    crumbs: [
      { label: 'Startseite', href: '/' },
      { label: 'Formulare', href: '/download' },
      { label: 'V0900' },
    ],
    datePublished: '2026-09-03',
    dateModified: '2026-09-03',
    faqInSchema: true,
    faqSchema: () => readFaqMarkup(/## 2 · V0900 guide/),
    cta: [
      {
        label: 'Zur englischen V0901-Anleitung →',
        href: '/v0901-pension-refund-form-english',
      },
      { label: 'Alle Formulare', href: '/download' },
    ],
    rawReplace: [
      [
        '*Zur englischen V0901-Anleitung* [Link: /v0901-pension-refund-form-english]',
        '[Zur englischen V0901-Anleitung](/v0901-pension-refund-form-english)',
      ],
    ],
    rawStrip: [/\*\*\[Capture-Box[\s\S]*?\n---\n/],
    source:
      'GPR_FormsPage_V0900_DE_v1.1_2026-09-03.md (live slug /v0900-formular)',
  },
  {
    id: 'v0100-form',
    out: 'guides',
    kind: 'guide',
    lang: 'en',
    file: 'GPR_FormsPage_V0100_EN_v1.3_2026-09-04.md',
    extract: 'fenced',
    path: '/v0100-form',
    title: 'Form V0100: German Pension Account Clarification (2026)',
    meta: 'The pension office sent you form V0100? What a Kontenklärung is, how to clear your German pension record from abroad — and what it means for your refund.',
    eyebrow: 'Form guide · V0100',
    rail: 'Form guide',
    crumbs: [{ label: 'Home', href: '/' }, FORMS_CRUMB, { label: 'V0100' }],
    datePublished: '2026-09-09',
    dateModified: '2026-09-10',
    faqInSchema: true,
    faqSchema: () => readFaqMarkup(/## 3 · V0100 guide/),
    cta: CTA_EN,
    source: 'GPR_FormsPage_V0100_EN_v1.3_2026-09-04.md (live slug /v0100-form)',
  },
  {
    id: 'v0800-child-raising-periods',
    out: 'guides',
    kind: 'guide',
    lang: 'en',
    file: 'GPR_FormsPage_V0800_EN_v1.2_2026-09-04.md',
    extract: 'fenced',
    path: '/v0800-child-raising-periods',
    title: 'V0800 Form in English: Child-Raising Pension Periods (2026)',
    meta: 'The pension office sent you form V0800? What Kindererziehungszeiten are, who gets the months, and how they can affect a German pension refund.',
    eyebrow: 'Form guide · V0800',
    rail: 'Form guide',
    crumbs: [{ label: 'Home', href: '/' }, FORMS_CRUMB, { label: 'V0800' }],
    datePublished: '2026-09-09',
    dateModified: '2026-09-10',
    faqInSchema: true,
    faqSchema: () => readFaqMarkup(/## 4 · V0800 guide/),
    cta: CTA_EN,
    source: 'GPR_FormsPage_V0800_EN_v1.2_2026-09-04.md',
  },
  {
    id: 'a1310-payment-declaration',
    out: 'guides',
    kind: 'guide',
    lang: 'en',
    file: 'GPR_FormsPage_A1310_EN_v1.3_2026-09-08.md',
    extract: 'fenced',
    path: '/a1310-payment-declaration',
    title: 'Form A1310: German Pension Refund Payment Declaration (2026)',
    meta: 'A1310 is the signed payment declaration DRV uses to pay your German pension refund abroad. Which edition to download, how to complete it, what to check.',
    eyebrow: 'Form guide · A1310',
    rail: 'Form guide',
    crumbs: [{ label: 'Home', href: '/' }, FORMS_CRUMB, { label: 'A1310' }],
    datePublished: '2026-09-09',
    dateModified: '2026-09-10',
    faqInSchema: true,
    faqSchema: () => readFaqMarkup(/## 5 · A1310 guide/),
    cta: CTA_EN,
    rawReplace: [
      [
        '*[link: /morocco]* · *[link: /tunisia]*',
        '[Morocco](/morocco) · [Tunisia](/tunisia)',
      ],
      // cornerstone line approved in the FAQ markup package (10 Sep 2026)
      [
        '- **Which pension office handles your claim:** *[link:\n  /post/which-german-pension-office-handles-your-claim]*',
        '- **Which pension office handles your claim:** *[link:\n  /post/which-german-pension-office-handles-your-claim]*\n- **The complete guide to the whole refund process — eligibility, timing, payout:** [How to Get a German Pension Refund (2026)](/post/how-to-get-a-german-pension-refund)',
      ],
    ],
    source:
      'GPR_FormsPage_A1310_EN_v1.3_2026-09-08.md + cornerstone line (FAQ markup package, 10 Sep 2026)',
  },
  {
    id: 'download',
    out: 'guides',
    kind: 'collection',
    lang: 'en',
    file: 'GPR_Downloads_Page_Content_Handoff_2026-08-27.md',
    extract: 'downloads',
    path: '/download',
    title: 'German Pension Refund Forms: Official DRV Downloads, Explained',
    meta: 'Every official form for a German pension refund — V0901, V0900, payment declarations and supporting forms — linked at the source, with what each one is for.',
    eyebrow: 'Official DRV forms',
    rail: 'Forms registry',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Forms & Downloads' }],
    reviewLine: 'Forms verified 26–27 August 2026',
    datePublished: '2026-08-27',
    dateModified: '2026-09-10',
    faqInSchema: false,
    cta: [
      { label: 'Start Eligibility Check →', href: '/refund-calculator' },
      { label: 'Start my claim', href: '/get-your-refund' },
    ],
    rawReplace: [
      // B2
      [
        'R0985 — Angaben zum Zahlungsweg** *(Stand 01.07.2025 **' +
          Q +
          '**)* — the form for providing or changing the bank connection for payments.',
        'R0985 — Angaben zum Zahlungsweg** *(Stand 01.07.2025 **' +
          Q +
          '**)* — DRV\'s payment-route form for a German domestic account („Angaben zum Zahlungsweg bei Inlandskonto"); for an account abroad, the payment declaration applies.',
      ],
      // B3
      [
        'A1312, A1313, A3863 and the language-suffixed A1310sp/A1310gr — have been retired',
        'A1312, A1313 and A3863 — have been retired',
      ],
      // B4 (incl. the last sentence — the A1310 guide is live)
      [
        'The pension office pays refunds only against a payment declaration for your account.',
        'The pension office pays refunds only once it has a completed payment declaration identifying the payment account. V0901 asks for payment details in Section 11, but in the refund cases we see, the office generally still requires the separate, signed A1310 for the payout — send it with the application. How to complete it, section by section: [Form A1310 explained in English](/a1310-payment-declaration).',
      ],
    ],
    source:
      'GPR_Downloads_Page_Content_Handoff_2026-08-27.md + A1310 change guide pairs B2–B4 (B1 = registry URL)',
  },
  {
    id: 'how-to-get-a-german-pension-refund',
    out: 'articles',
    kind: 'post',
    lang: 'en',
    file: 'GPR_Cornerstone_Article_FINAL_2026-08-25_text-extract.md',
    extract: 'markers',
    path: '/post/how-to-get-a-german-pension-refund',
    title: 'German Pension Refund: Eligibility & How to Claim (2026)',
    meta: 'See who qualifies for a German pension refund, how much you can get back, which forms to use, where to apply and how long it takes. Free checker and calculator.',
    eyebrow: 'Complete guide',
    rail: 'Refund guide',
    crumbs: [
      { label: 'Home', href: '/' },
      NEWS_CRUMB,
      { label: 'Refund guide' },
    ],
    reviewLine:
      'Last legal and form review: 7 August 2026 · Service and processing-data update: {{M-12.calculatedOn}}',
    datePublished: '2026-08-25',
    dateModified: '2026-09-10',
    faqInSchema: false,
    cta: CTA_EN,
    nameRule: true,
    wixRules: [
      {
        match: /Embed the eligibility checker first/,
        tools: ['checker', 'calculator'],
      },
      { match: /place a short CTA/, tools: ['assessment'] },
      { match: /Place the refund calculator/, tools: ['calculator'] },
      { match: /Embed the waiting-period calculator/, tools: ['waiting'] },
      { match: /Embed the office finder/, tools: ['office-finder'] },
    ],
    paraReplace: [
      {
        // Timing chapter: the recent-500 figures are retired (D-03); the
        // register values come from the token store (TM-01/M-12/M-19/M-13/M-20).
        match:
          /^\*\*Short answer: over 80% of recent refunds reached the client escrow account/,
        text: '**Short answer: {{TM-01.sentence}}** {{M-12.sentence}} {{M-19.sentence}} {{M-13.sentence}} {{M-20.sentence}} We measure calendar days from complete submission to the escrow value date. Individual processing times vary. These are dated first-party Germany Pension Refund results, not a pension-office promise or individual guarantee — [see the full data and methodology](/german-pension-refund-processing-time).',
      },
    ],
    itemReplace: [
      {
        // waiting-period guide cascade P698 (links only)
        match:
          /^At least 24 full calendar months have passed since your last mandatory pension insurance in Germany, the EU/,
        text: "**At least 24 full calendar months have passed since your last mandatory pension insurance** in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia. New mandatory insurance in any of these countries restarts the 24 months (one exception: Kosovo's Trust/KPST fund — see the second table). Use our [24-month waiting-period calculator](/post/german-pension-refund-waiting-period) to find the exact date your waiting period ends.",
      },
      {
        // cascade P992 (links only)
        match: /^Check eligibility and calculate your filing date\./,
        text: '**Check eligibility and calculate your filing date.** Confirm every citizenship, your residence, current pension insurance, voluntary-insurance rights, your German contribution months and the 24-month waiting period. The eligibility checker above and our [waiting-period calculator](/post/german-pension-refund-waiting-period) do this math — the country sections explain it.',
      },
    ],
    source:
      'GPR_Cornerstone_Article_FINAL_2026-08-25_text-extract.md (v11.1 manuscript) + timing chapter from the token store + waiting-period cascade pairs P698/P992',
  },
  {
    id: 'which-german-pension-office-handles-your-claim',
    out: 'articles',
    kind: 'post',
    lang: 'en',
    file: 'GPR_Article_Which_Pension_Office_v1.2_2026-08-27.md',
    extract: 'markers',
    path: '/post/which-german-pension-office-handles-your-claim',
    title: 'Which DRV Office Handles Your German Pension Refund?',
    meta: 'DRV Bund, Knappschaft-Bahn-See or a regional carrier? See which Deutsche Rentenversicherung office decides your refund claim and where to send it. Free office finder.',
    h1: 'Which German Pension Office Handles Your Refund Claim?',
    eyebrow: 'Routing guide',
    rail: 'Routing guide',
    crumbs: [
      { label: 'Home', href: '/' },
      NEWS_CRUMB,
      { label: 'Which pension office' },
    ],
    reviewLine:
      'Source-law review: 7 August 2026 (Canonical Rule Sheet) · Routing facts verified against the official VKVV area-number schedule and the DRV liaison-office table: 25 August 2026',
    datePublished: '2026-08-27',
    dateModified: '2026-08-27',
    faqInSchema: false,
    cta: CTA_EN,
    h2: [
      'Why the right first office matters',
      'One network, sixteen carriers — and two different jobs',
      'The six rules, in order (§§ 126–128a SGB VI)',
      'What the first two digits of your number can — and can’t — tell you',
      'Routing can change your paperwork — the Oldenburg-Bremen example',
      'How to find out who has your file right now',
      'Frequently asked questions',
      'Next step',
    ],
    h3: [
      '1. Knappschaft-Bahn-See — if you were ever insured there',
      '2. DRV Bund — if it was your last carrier',
      '3. The liaison office for your country connection',
      '4. The liaison office for your residence',
      '5. The regional carrier holding your account',
      '6. No number, no letters — identification by personal data',
    ],
    wixRules: [
      { match: /Embed the office finder here/, tools: ['office-finder'] },
    ],
    rawReplace: [
      // SSN guide cascade: the reserved link is live now
      [
        'The issuing office is far more likely to find your record than an\nunrelated office — that is the digits’ real value.',
        'The issuing office is far more likely to find your record than an\nunrelated office — that is the digits’ real value. *[link: /post/german-social-security-number]*',
      ],
    ],
    source: 'GPR_Article_Which_Pension_Office_v1.2_2026-08-27.md',
  },
  {
    id: 'german-social-security-number',
    out: 'articles',
    kind: 'post',
    lang: 'en',
    file: 'GPR_Article_Social_Security_Number_v1.2_2026-09-07.md',
    extract: 'markers',
    path: '/post/german-social-security-number',
    title: 'How to Get a Social Security Number in Germany',
    meta: 'What the German social security number (Sozialversicherungsnummer) is, how to get it as an employee, freelancer or student — and how to find a lost number.',
    eyebrow: 'Guide',
    rail: 'Guide',
    crumbs: [
      { label: 'Home', href: '/' },
      NEWS_CRUMB,
      { label: 'Social security number' },
    ],
    reviewLine:
      'Facts checked against Deutsche Rentenversicherung sources: 2 September 2026',
    datePublished: '2025-06-02',
    dateModified: '2026-09-07',
    faqInSchema: false,
    cta: CTA_EN,
    source: 'GPR_Article_Social_Security_Number_v1.2_2026-09-07.md',
  },
  {
    id: 'german-pension-refund-waiting-period',
    out: 'articles',
    kind: 'post',
    lang: 'en',
    file: 'GPR_WaitingPeriod_Guide_Content_Handoff_2026-09-10.md',
    extract: 'fenced',
    path: '/post/german-pension-refund-waiting-period',
    title: 'German Pension Refund: The 24-Month Waiting Period (2026)',
    meta: 'When the 24-month waiting period for a German pension refund starts, what restarts it and the first day you can apply — with a free date calculator.',
    eyebrow: 'Guide',
    rail: 'Waiting period',
    crumbs: [
      { label: 'Home', href: '/' },
      NEWS_CRUMB,
      { label: 'Waiting period' },
    ],
    bylineItalic: true,
    datePublished: '2026-09-10',
    dateModified: '2026-09-10',
    faqInSchema: true,
    faqSchema: () =>
      readAppendixFaq('GPR_WaitingPeriod_Guide_Content_Handoff_2026-09-10.md'),
    cta: CTA_EN,
    wixRules: [
      { match: /embed the waiting-period calculator/, tools: ['waiting'] },
    ],
    source: 'GPR_WaitingPeriod_Guide_Content_Handoff_2026-09-10.md (v1.1)',
  },
  {
    id: 'brexit',
    out: 'articles',
    kind: 'post',
    lang: 'en',
    file: 'GPR_Brexit_Post_Refresh_Content_Handoff_2026-09-10.md',
    extract: 'markers',
    path: '/post/brexit',
    title: 'German Pension Refund After Brexit: UK Nationals and UK Residents',
    meta: 'Why UK citizens and anyone living in the UK generally cannot get a German pension refund before retirement age after Brexit — and the three exceptions.',
    eyebrow: 'Article · UK nationals and UK residents',
    rail: 'Article',
    crumbs: [{ label: 'Home', href: '/' }, NEWS_CRUMB, { label: 'Brexit' }],
    datePublished: '2026-04-21',
    dateModified: '2026-09-11',
    imageUrl:
      'https://static.wixstatic.com/media/4a4b7f_b8d9b8e7933143f09d8d9ce68aed35b5~mv2.png',
    faqInSchema: true,
    faqSchema: () =>
      readAppendixFaq('GPR_Brexit_Post_Refresh_Content_Handoff_2026-09-10.md'),
    cta: CTA_EN,
    // open point 3: the waiting-period guide is live → swap the anchor
    linkSwaps: {},
    rawReplace: [
      [
        '[waiting-period calculator](https://www.germanypensionrefund.com/refund-calculator)',
        '[waiting-period calculator](/post/german-pension-refund-waiting-period)',
      ],
    ],
    source:
      'GPR_Brexit_Post_Refresh_Content_Handoff_2026-09-10.md (v1.1 refresh)',
  },
  {
    id: 'german-pension-refund-processing-time',
    out: 'articles',
    kind: 'evergreen',
    lang: 'en',
    file: 'GPR_Processing_Time_Methodology_Article_v2.7_2026-08-26.md',
    extract: 'markers',
    path: '/german-pension-refund-processing-time',
    title: 'German Pension Refund Processing Time: 300 Completed Refunds',
    meta: 'How long our 300 most recent completed refunds took: median {{M-19.medianDays}} days, {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days — and exactly how we measure.',
    eyebrow: 'Processing times & data',
    rail: 'The data',
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Processing Times & Data' },
    ],
    reviewLine:
      'Processing-data analysis: {{M-12.calculatedOn}} · Dataset {{S-14.dataset}} · Figures refreshed quarterly.',
    datePublished: '2026-08-25',
    dateModified: '2026-08-26',
    faqInSchema: false,
    cta: CTA_EN,
    kvTables: true,
    wixRules: [
      { match: /embed gpr-processing-time-chart/, tools: ['processing-chart'] },
    ],
    tokenise: [
      ['GPR-PTS-2026-Q3-v3', '{{S-14.dataset}}'],
      ['229 of 300', '{{M-12.count}} of {{M-12.total}}'],
      [
        "229 of Germany Pension Refund's 300",
        "{{M-12.count}} of Germany Pension Refund's {{M-12.total}}",
      ],
      ['229/300', '{{M-12.count}}/{{M-12.total}}'],
      ['76.3%', '{{M-12.pct}}'],
      ['61.7%', '{{M-13.pct}}'],
      ['93.3%', '{{M-20.pct}}'],
      ['40.5-day', '{{M-19.medianDays}}-day'],
      ['40.5 days', '{{M-19.medianDays}} days'],
      ['25 August 2026', '{{M-12.calculatedOn}}'],
      ['90 days', '{{M-12.days}} days'],
      ['56 days', '{{M-13.days}} days'],
      ['180 days', '{{M-20.days}} days'],
    ],
    leak: /40\.5|61\.7|76\.3|93\.3|\b229\b|GPR-PTS|25 August 2026/,
    source:
      'GPR_Processing_Time_Methodology_Article_v2.7_2026-08-26.md + gpr-processing-time-jsonld.html; figures from content/tokens.json',
  },
];

// --- body extraction --------------------------------------------------------
function extractBody(txt, page) {
  if (page.extract === 'fenced') {
    const m = txt.match(/## PAGE COPY[\s\S]*?```markdown\n([\s\S]*?)\n```/);
    if (!m) throw new Error(`${page.id}: PAGE COPY fence not found`);
    return m[1];
  }
  if (page.extract === 'downloads') {
    let body = txt.slice(txt.indexOf('# H1:'), txt.indexOf('*[component: CTA'));
    body = body.replace('# H1: ', '# ').replace(/^## H2: /gm, '## ');
    return body;
  }
  const start = txt.search(/ARTICLE COPY STARTS HERE/);
  const end = txt.search(/ARTICLE COPY ENDS HERE/);
  if (start === -1 || end === -1)
    throw new Error(`${page.id}: copy markers not found`);
  const body = txt.slice(start, end);
  return body.slice(body.indexOf('\n') + 1);
}

function applyItemReplace(blocks, page) {
  if (!page.itemReplace) return blocks;
  return blocks.map((b) => {
    if (b.t !== 'ul' && b.t !== 'ol') return b;
    return {
      ...b,
      items: b.items.map((it) => {
        const rep = page.itemReplace.find((r) => r.match.test(it.x));
        if (!rep) return it;
        rep.used = true;
        return inline(rep.text, page, rep.text, () => {});
      }),
    };
  });
}

// --- build ------------------------------------------------------------------
function build(page) {
  const warnings = [];
  const txt = readFileSync(join(HANDOFFS, page.file), 'utf8');
  let body = extractBody(txt, page);
  for (const re of page.rawStrip || []) body = body.replace(re, '');
  for (const [from, to] of page.rawReplace || []) {
    if (body.indexOf(from) === -1)
      warnings.push(
        `${page.id}: raw replacement not found — "${from.slice(0, 60)}"`
      );
    body = body.split(from).join(to);
  }
  const parsed = parseBody(body, page);
  warnings.push(...parsed.warnings);
  for (const rep of page.paraReplace || []) {
    if (!rep.used)
      warnings.push(
        `${page.id}: paragraph replacement not applied — ${rep.match}`
      );
  }
  let blocks = applyItemReplace(parsed.blocks, page);
  for (const rep of page.itemReplace || []) {
    if (!rep.used)
      warnings.push(
        `${page.id}: list-item replacement not applied — ${rep.match}`
      );
  }
  if (page.tokenise) {
    blocks = mapText(blocks, (s) => {
      let o = s;
      for (const [from, to] of page.tokenise) o = o.split(from).join(to);
      return o;
    });
  }
  const rv = extractReview(blocks, page);
  blocks = rv.blocks;
  const fq = extractFaq(blocks, page);
  blocks = assignIds(fq.blocks);
  if (page.downloads) {
    const idx = blocks.findIndex((b) => b.t === 'src');
    const dl = { t: 'downloads', forms: page.downloads };
    if (idx === -1) blocks.push(dl);
    else blocks.splice(idx, 0, dl);
  }
  let faq = fq.faq;
  if (page.tokenise) {
    faq = faq.map((f) => {
      let a = f.a;
      for (const [from, to] of page.tokenise) a = a.split(from).join(to);
      return {
        ...f,
        a,
        blocks: f.blocks
          ? mapText(f.blocks, (s) => {
              let o = s;
              for (const [from, to] of page.tokenise)
                o = o.split(from).join(to);
              return o;
            })
          : undefined,
      };
    });
  }
  // schema check (DP-03)
  if (page.faqSchema) {
    const schema = page.faqSchema();
    if (!schema) warnings.push(`${page.id}: schema FAQ source not found`);
    else {
      schema.forEach((s) => {
        const hit = faq.find((f) => f.q === s.q);
        if (!hit) {
          warnings.push(
            `${page.id}: schema FAQ not on page — "${s.q.slice(0, 50)}"`
          );
          return;
        }
        // The paste source drops link pointers and "see the chapter above"
        // tails from the visible answer (established markup practice).
        const pointers = (hit.blocks || []).flatMap((b) =>
          (b.sp || [])
            .filter((p) => p.k === 'a' && /^→ /.test(p.x))
            .map((p) => p.x)
        );
        let visible = hit.a;
        pointers.forEach((ptr) => (visible = visible.split(ptr).join('')));
        visible = norm(
          visible
            .replace(/\s*—\s*(see the chapter above|siehe oben)\.?/g, '.')
            .replace(/\s*Section-by-section guide: [^.]+\.$/, '')
            .replace(/\.\./g, '.')
        );
        if (visible !== norm(s.a))
          warnings.push(
            `${page.id}: FAQ answer differs from the schema paste — "${s.q.slice(0, 50)}"\n      page:   ${visible}\n      schema: ${s.a}`
          );
        if (hit.a !== s.a && !hit.blocks)
          hit.blocks = [{ t: 'p', x: hit.a, sp: [] }];
        hit.a = s.a;
      });
      faq.forEach((f) => {
        if (!schema.find((s) => s.q === f.q)) {
          warnings.push(
            `${page.id}: FAQ not in schema — "${f.q.slice(0, 50)}"`
          );
          f.inSchema = false;
        }
      });
    }
  }
  // leak check
  const leak = page.leak || null;
  const all = [];
  const collect = (bs) =>
    bs.forEach((b) => {
      if (b.x) all.push(b.x);
      if (b.items) b.items.forEach((it) => all.push(it.x));
      if (b.rows) b.rows.forEach((r) => all.push(...r));
    });
  collect(blocks);
  faq.forEach((f) => {
    all.push(f.q, f.a);
    if (f.blocks) collect(f.blocks);
  });
  for (const s of all) {
    const stripped = s.replace(/\{\{[^}]+\}\}/g, '');
    if (stripped.indexOf(Q) !== -1)
      warnings.push(`${page.id}: marker leaked — "${s.slice(0, 80)}"`);
    if (/\[(link|links|Link|component|name)\b/.test(stripped))
      warnings.push(`${page.id}: bracket leaked — "${s.slice(0, 80)}"`);
    if (leak && leak.test(stripped))
      warnings.push(
        `${page.id}: figure leaked — "${stripped.match(leak)[0]}" in "${s.slice(0, 80)}"`
      );
  }
  const data = {
    path: page.path,
    kind: page.kind,
    lang: page.lang,
    title: page.title,
    meta: page.meta,
    h1: parsed.h1,
    headline: page.title.replace(/\s*\(2026\)\s*$/, ''),
    eyebrow: page.eyebrow,
    rail: page.rail,
    crumbs: page.crumbs,
    reviewLine: rv.review,
    showReviewer: page.kind !== 'collection' && page.id !== 'brexit',
    datePublished: page.datePublished,
    dateModified: page.dateModified,
    imageUrl: page.imageUrl || LOGO,
    blocks,
    faqTitle: fq.faqTitle,
    faq,
    faqInSchema: Boolean(page.faqInSchema),
    cta: page.cta,
    source: page.source,
  };
  return { data, warnings };
}

function emit(page, data) {
  return (
    `// Generated by scripts/build-guides.mjs from ${page.file}.\n` +
    `// Do not edit copy here — regenerate from the handoff.\n` +
    `import type { ArticleData } from '../articles/types';\n\n` +
    `const page: ArticleData = ${JSON.stringify(data, null, 2)};\n\n` +
    `export default page;\n`
  );
}

const camel = (s) => s.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
const outputs = { guides: [], articles: [] };
const allWarnings = [];
for (const page of PAGES) {
  if (ONLY && page.id !== ONLY) continue;
  const { data, warnings } = build(page);
  const dir = join(root, 'content', page.out);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${page.id}.ts`), emit(page, data));
  outputs[page.out].push(page.id);
  allWarnings.push(...warnings);
  const h2s = data.blocks.filter((b) => b.t === 'h2').length;
  console.log(
    `${page.id.padEnd(48)} blocks=${String(data.blocks.length).padStart(3)} h2=${String(h2s).padStart(2)} faq=${data.faq.length} (${data.faq.filter((f) => f.inSchema).length} in schema)`
  );
}

if (!ONLY) {
  for (const out of Object.keys(outputs)) {
    const ids = outputs[out];
    const typesImport = out === 'guides' ? '../articles/types' : './types';
    const idx =
      `// Generated by scripts/build-guides.mjs — one module per page.\n` +
      `import type { ArticleData } from '${typesImport}';\n` +
      ids.map((s) => `import ${camel(s)} from './${s}';`).join('\n') +
      `\n\nexport const ${out}: Record<string, ArticleData> = {\n` +
      ids.map((s) => `  '${s}': ${camel(s)},`).join('\n') +
      `\n};\n\nexport function get${out === 'guides' ? 'Guide' : 'Article'}(slug: string): ArticleData | undefined {\n  return ${out}[slug];\n}\n`;
    writeFileSync(join(root, 'content', out, 'index.ts'), idx);
  }
}

if (allWarnings.length) {
  console.error(`\n${allWarnings.length} warning(s):`);
  for (const w of allWarnings) console.error('  - ' + w);
  process.exitCode = 1;
} else console.log('\nOK');
