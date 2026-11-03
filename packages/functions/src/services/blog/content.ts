/**
 * Blog content model.
 *
 * Editor format (stored in shared.blog_posts.blocks): text fields accept a
 * small inline syntax — `**bold**` and `[label](href)` — and nothing else,
 * so no HTML is ever stored or rendered.
 *
 * Render format (public API): the inline syntax is turned into the GPR
 * site's `{ x, sp }` rich text (plain text plus spans matched by text, see
 * apps/gpr/content/types.ts), and h2s get stable anchor ids. Both sites
 * render that format directly.
 */
import { z } from 'zod';

export const BLOG_SITES = ['gpr', 'vbl'] as const;
export type BlogSite = (typeof BLOG_SITES)[number];

export const BLOG_LANGS = ['en', 'de'] as const;
export type BlogLang = (typeof BLOG_LANGS)[number];

export const BLOG_STATUSES = ['draft', 'published'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** Public path of a post on its site. */
export function postPath(site: BlogSite, slug: string): string {
  return site === 'gpr' ? `/post/${slug}` : `/blog/${slug}`;
}

// ---------------------------------------------------------------------------
// Editor format
// ---------------------------------------------------------------------------

const md = z.string().max(5000);
const plain = z.string().max(300);

export const blogBlockSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('p'), md }),
  z.object({ t: z.literal('h2'), text: plain }),
  z.object({ t: z.literal('h3'), text: plain }),
  z.object({ t: z.literal('ul'), items: z.array(md).max(50) }),
  z.object({ t: z.literal('ol'), items: z.array(md).max(50) }),
  z.object({ t: z.literal('quote'), md }),
  z.object({ t: z.literal('note'), md }),
  /** First row = header. */
  z.object({
    t: z.literal('table'),
    rows: z.array(z.array(z.string().max(500)).max(10)).max(60),
  }),
  z.object({
    t: z.literal('img'),
    url: z.string().max(2000),
    alt: z.string().max(250),
    caption: z.string().max(300).optional(),
  }),
]);
export type BlogBlock = z.infer<typeof blogBlockSchema>;

export const blogFaqItemSchema = z.object({
  q: z.string().max(300),
  /** Answer, inline syntax allowed. */
  a: z.string().max(3000),
});
export type BlogFaqItem = z.infer<typeof blogFaqItemSchema>;

export const blogCtaSchema = z.object({
  label: z.string().max(120),
  href: z.string().max(2000),
});
export type BlogCta = z.infer<typeof blogCtaSchema>;

// ---------------------------------------------------------------------------
// Inline syntax
// ---------------------------------------------------------------------------

export interface Span {
  k: 'a' | 'b';
  x: string;
  href?: string;
}

export interface Rich {
  x: string;
  sp: Span[];
}

export interface InlineLink {
  label: string;
  href: string;
}

const INLINE = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** `**bold**` and `[label](href)` → plain text plus spans. */
export function parseInline(source: string): Rich {
  let x = '';
  const sp: Span[] = [];
  let last = 0;
  for (const m of source.matchAll(INLINE)) {
    x += source.slice(last, m.index);
    if (m[1] !== undefined) {
      x += m[1];
      sp.push({ k: 'b', x: m[1] });
    } else {
      x += m[2];
      sp.push({ k: 'a', x: m[2], href: m[3] });
    }
    last = (m.index ?? 0) + m[0].length;
  }
  x += source.slice(last);
  return { x, sp };
}

/** Text with the inline syntax removed (word counts, schema text). */
export function plainText(source: string): string {
  return parseInline(source).x;
}

export function inlineLinks(source: string): InlineLink[] {
  return parseInline(source)
    .sp.filter((s) => s.k === 'a')
    .map((s) => ({ label: s.x, href: s.href ?? '' }));
}

/** Every text field of the body, in reading order (inline syntax kept). */
export function blockTexts(block: BlogBlock): string[] {
  switch (block.t) {
    case 'p':
    case 'quote':
    case 'note':
      return [block.md];
    case 'h2':
    case 'h3':
      return [block.text];
    case 'ul':
    case 'ol':
      return block.items;
    case 'table':
      return block.rows.flat();
    case 'img':
      return block.caption ? [block.caption] : [];
  }
}

// ---------------------------------------------------------------------------
// Render format
// ---------------------------------------------------------------------------

export type RenderedBlock =
  | ({ t: 'p' } & Rich)
  | { t: 'h2'; x: string; id: string }
  | { t: 'h3'; x: string }
  | ({ t: 'quote' } & Rich)
  | ({ t: 'note' } & Rich)
  | { t: 'ul'; items: Rich[] }
  | { t: 'ol'; items: Rich[] }
  | { t: 'table'; rows: string[][] }
  | { t: 'img'; url: string; alt: string; caption?: string }
  /** Position of the FAQ section; appended when the post has FAQs. */
  | { t: 'faq' };

export interface RenderedFaqItem {
  q: string;
  /** Plain answer (FAQPage schema). */
  a: string;
  /** Visible answer with links / bold. */
  blocks: RenderedBlock[];
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/ß/g, 'ss')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function renderBlocks(
  blocks: BlogBlock[],
  hasFaq: boolean
): RenderedBlock[] {
  const ids = new Set<string>();
  const out = blocks.map((b): RenderedBlock => {
    switch (b.t) {
      case 'p':
      case 'quote':
      case 'note':
        return { t: b.t, ...parseInline(b.md) };
      case 'h2': {
        const base = slugify(b.text) || 'section';
        let id = base;
        for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
        ids.add(id);
        return { t: 'h2', x: b.text, id };
      }
      case 'h3':
        return { t: 'h3', x: b.text };
      case 'ul':
      case 'ol':
        return { t: b.t, items: b.items.map(parseInline) };
      case 'table':
        return { t: 'table', rows: b.rows };
      case 'img':
        return {
          t: 'img',
          url: b.url,
          alt: b.alt,
          ...(b.caption ? { caption: b.caption } : {}),
        };
    }
  });
  return hasFaq ? [...out, { t: 'faq' }] : out;
}

export function renderFaq(faq: BlogFaqItem[]): RenderedFaqItem[] {
  return faq.map((item) => ({
    q: item.q,
    a: plainText(item.a),
    blocks: item.a
      .split(/\n{2,}/)
      .filter((para) => para.trim())
      .map((para) => ({ t: 'p' as const, ...parseInline(para.trim()) })),
  }));
}

/** Words in the post body (headings, text, lists, tables, FAQ). */
export function countWords(blocks: BlogBlock[], faq: BlogFaqItem[]): number {
  const text = [
    ...blocks.flatMap(blockTexts),
    ...faq.flatMap((f) => [f.q, f.a]),
  ]
    .map(plainText)
    .join(' ');
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
