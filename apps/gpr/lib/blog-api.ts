/**
 * Blog CMS (docs/blog-cms.md): server-side fetch helpers for the public blog
 * API and the mapper from a CMS post to the site's `ArticleData`, so CMS
 * posts render through the same `ArticlePage` as the hand-built articles.
 *
 * The render types are copied from packages/functions/src/services/blog/
 * content.ts (the app cannot import the backend).
 */
import type {
  ArticleBlock,
  ArticleData,
  ArticleFaqItem,
  Rich,
} from '@/content/articles/types';
import type { Span } from '@/content/types';

export const BLOG_SITE = 'gpr';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Seconds a CMS response is reused (matches the API's max-age). */
const REVALIDATE = 60;

// ---------------------------------------------------------------------------
// Render format (public API)
// ---------------------------------------------------------------------------

export interface CmsRich {
  x: string;
  sp: Span[];
}

export type CmsBlock =
  | ({ t: 'p' } & CmsRich)
  | { t: 'h2'; x: string; id: string }
  | { t: 'h3'; x: string }
  | ({ t: 'quote' } & CmsRich)
  | ({ t: 'note' } & CmsRich)
  | { t: 'ul'; items: CmsRich[] }
  | { t: 'ol'; items: CmsRich[] }
  | { t: 'table'; rows: string[][] }
  | { t: 'img'; url: string; alt: string; caption?: string }
  | { t: 'faq' };

export interface CmsPostSummary {
  slug: string;
  path: string;
  lang: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string | null;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
}

export interface CmsPost extends CmsPostSummary {
  site: 'gpr' | 'vbl';
  seoTitle: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  blocks: CmsBlock[];
  faq: { q: string; a: string; blocks: CmsBlock[] }[];
  ctas: { label: string; href: string }[];
}

// ---------------------------------------------------------------------------
// Fetch helpers (server components only)
// ---------------------------------------------------------------------------

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(API_URL + path, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Published CMS posts, newest first; `[]` when the API is unavailable. */
export async function fetchCmsPosts(
  lang: 'en' | 'de' = 'en'
): Promise<CmsPostSummary[]> {
  const data = await getJson<{ posts?: CmsPostSummary[] }>(
    `/api/blog/${BLOG_SITE}/posts?lang=${lang}`
  );
  return Array.isArray(data?.posts) ? data.posts : [];
}

/** One published CMS post, or `null` (not found / API unavailable). */
export async function fetchCmsPost(slug: string): Promise<CmsPost | null> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
  const data = await getJson<{ post?: CmsPost }>(
    `/api/blog/${BLOG_SITE}/posts/${encodeURIComponent(slug)}`
  );
  return data?.post ?? null;
}

// ---------------------------------------------------------------------------
// CMS post → ArticleData
// ---------------------------------------------------------------------------

/**
 * The article components run every string through `resolveTokens()`, which
 * throws on a literal Q marker and on an unknown `{{ID.key}}` reference.
 * CMS text is user input with no tokens, so break both patterns with an
 * invisible word joiner (U+2060) before they reach the renderer.
 */
const WJ = '⁠';
const Q_MARKER = '[' + 'Q]';

export function inertText(s: string): string {
  if (s.indexOf('{{') === -1 && s.indexOf(Q_MARKER) === -1) return s;
  return s
    .split('{{')
    .join('{' + WJ + '{')
    .split(Q_MARKER)
    .join('[Q' + WJ + ']');
}

function rich(r: CmsRich): Rich {
  return {
    x: inertText(r.x),
    sp: (r.sp || []).map((s) => ({ ...s, x: inertText(s.x) })),
  };
}

export function mapCmsBlock(b: CmsBlock): ArticleBlock {
  switch (b.t) {
    case 'p':
    case 'quote':
    case 'note':
      return { t: b.t, ...rich(b) };
    case 'h2':
      return { t: 'h2', x: inertText(b.x), id: b.id };
    case 'h3':
      return { t: 'h3', x: inertText(b.x) };
    case 'ul':
    case 'ol':
      return { t: b.t, items: b.items.map(rich) };
    case 'table':
      return { t: 'table', rows: b.rows.map((r) => r.map(inertText)) };
    case 'img':
      return {
        t: 'img',
        url: absoluteImageUrl(b.url),
        alt: b.alt,
        ...(b.caption ? { caption: b.caption } : {}),
      };
    case 'faq':
      return { t: 'faq' };
  }
}

/** Uploaded images come back absolute; a relative one is on the API host. */
export function absoluteImageUrl(url: string): string {
  return url.charAt(0) === '/' && url.charAt(1) !== '/' ? API_URL + url : url;
}

/** ISO timestamp → `YYYY-MM-DD`. */
export function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

const MONTHS = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
};

/** `2026-09-11` → `11 September 2026` / `11. September 2026`. */
export function longDate(date: string, lang: 'en' | 'de'): string {
  const [y, m, d] = date.split('-');
  const month = MONTHS[lang][Number(m) - 1] || m;
  return `${Number(d)}${lang === 'de' ? '.' : ''} ${month} ${y}`;
}

const UI = {
  en: {
    home: 'Home',
    news: 'News',
    eyebrow: 'Article',
    rail: 'Article',
    updated: 'Updated:',
    faq: 'Frequently asked questions',
  },
  de: {
    home: 'Startseite',
    news: 'News',
    eyebrow: 'Artikel',
    rail: 'Artikel',
    updated: 'Aktualisiert:',
    faq: 'Häufige Fragen',
  },
};

export function cmsPostToArticle(post: CmsPost): ArticleData {
  const lang: 'en' | 'de' = post.lang === 'de' ? 'de' : 'en';
  const ui = UI[lang];
  const title = inertText(post.title);
  const datePublished = isoDate(post.publishedAt);
  const dateModified = isoDate(post.updatedAt || post.publishedAt);
  const faq: ArticleFaqItem[] = (post.faq || []).map((f) => ({
    q: inertText(f.q),
    a: inertText(f.a),
    blocks: (f.blocks || []).map(mapCmsBlock),
  }));
  return {
    path: `/post/${post.slug}`,
    kind: 'post',
    lang,
    title: inertText(post.seoTitle || post.title),
    meta: inertText(post.metaDescription || post.excerpt || ''),
    h1: title,
    headline: title,
    eyebrow: ui.eyebrow,
    rail: ui.rail,
    crumbs: [
      { label: ui.home, href: '/' },
      { label: ui.news, href: '/blog' },
      { label: title },
    ],
    reviewLine: `${ui.updated} ${longDate(dateModified, lang)}`,
    showReviewer: false,
    datePublished,
    dateModified,
    ...(post.coverImageUrl
      ? { imageUrl: absoluteImageUrl(post.coverImageUrl) }
      : {}),
    blocks: (post.blocks || []).map(mapCmsBlock),
    faqTitle: faq.length ? ui.faq : undefined,
    faq,
    faqInSchema: faq.length > 0,
    cta: (post.ctas || []).map((c) => ({
      label: inertText(c.label),
      href: c.href,
    })),
    source: `blog-cms:${post.site}/${post.slug}`,
  };
}
