/**
 * Blog CMS (docs/blog-cms.md): server-side fetch helpers and render types
 * for the companypension.de blog (`/blog`, `/blog/<slug>`).
 *
 * Types are copied from packages/functions/src/services/blog/content.ts
 * (the app cannot import the backend).
 */

export const BLOG_SITE = 'vbl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Public origin of the marketing site (canonical URLs, JSON-LD). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://companypension.de'
).replace(/\/+$/, '');

export const SITE_NAME = 'CompanyPension';

/** Seconds a CMS response is reused (matches the API's max-age). */
const REVALIDATE = 60;

// ---------------------------------------------------------------------------
// Render format (public API)
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
  /** Position of the FAQ section; present when the post has FAQs. */
  | { t: 'faq' };

export interface RenderedFaqItem {
  q: string;
  /** Plain answer (FAQPage schema). */
  a: string;
  /** Visible answer with links / bold. */
  blocks: RenderedBlock[];
}

export interface PublicPostSummary {
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

export interface PublicPost extends PublicPostSummary {
  site: 'gpr' | 'vbl';
  seoTitle: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  blocks: RenderedBlock[];
  faq: RenderedFaqItem[];
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

/**
 * Published posts, newest first; `[]` when the API is unavailable. Without
 * `lang` every language is listed (the site has a single blog index).
 */
export async function fetchPosts(
  lang?: 'en' | 'de'
): Promise<PublicPostSummary[]> {
  const query = lang ? `?lang=${lang}` : '';
  const data = await getJson<{ posts?: PublicPostSummary[] }>(
    `/api/blog/${BLOG_SITE}/posts${query}`
  );
  return Array.isArray(data?.posts) ? data.posts : [];
}

/** One published post, or `null` (not found / API unavailable). */
export async function fetchPost(slug: string): Promise<PublicPost | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const data = await getJson<{ post?: PublicPost }>(
    `/api/blog/${BLOG_SITE}/posts/${encodeURIComponent(slug)}`
  );
  return data?.post ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function postPath(slug: string): string {
  return `/blog/${slug}`;
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return SITE_URL + (path.charAt(0) === '/' ? path : '/' + path);
}

/** Uploaded images come back absolute; a relative one is on the API host. */
export function imageUrl(url: string): string {
  return url.charAt(0) === '/' && url.charAt(1) !== '/' ? API_URL + url : url;
}

/** `2026-10-20T…` → `20 October 2026` (UTC, so server and client agree). */
export function formatDate(iso: string, lang: string = 'en'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function readingTime(minutes: number, lang: string = 'en'): string {
  const n = Math.max(1, Math.round(minutes || 1));
  return lang === 'de' ? `${n} Min. Lesezeit` : `${n} min read`;
}
