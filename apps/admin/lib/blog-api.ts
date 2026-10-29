import apiClient from './api';

/**
 * Blog CMS admin API (`/api/admin/blog`, docs/blog-cms.md). Types copied
 * from packages/functions/src/services/blog/{content,seo,index}.ts — the
 * admin cannot import the backend, keep them in sync by hand.
 */

// ------------------------------------------------------------ editor format

export type BlogSite = 'gpr' | 'vbl';
export type BlogLang = 'en' | 'de';
export type BlogStatus = 'draft' | 'published';

export const BLOG_SITE_LABEL: Record<BlogSite, string> = {
  gpr: 'GPR',
  vbl: 'CompanyPension',
};

/** Public origin of each site (live links, search snippet). */
export const BLOG_SITE_ORIGIN: Record<BlogSite, string> = {
  gpr: 'https://germanypensionrefund.com',
  vbl: 'https://companypension.de',
};

export type BlogBlock =
  | { t: 'p'; md: string }
  | { t: 'h2'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'quote'; md: string }
  | { t: 'note'; md: string }
  /** First row = header. */
  | { t: 'table'; rows: string[][] }
  | { t: 'img'; url: string; alt: string; caption?: string };

export type BlogBlockType = BlogBlock['t'];

export interface BlogFaqItem {
  q: string;
  /** Inline syntax allowed; a blank line starts a new paragraph. */
  a: string;
}

export interface BlogCta {
  label: string;
  href: string;
}

export const BLOG_CTA_MAX = 5;

export interface BlogPostInput {
  site: BlogSite;
  lang: BlogLang;
  slug: string;
  title: string;
  seoTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string | null;
  focusKeyword?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  authorName?: string | null;
  canonicalUrl?: string | null;
  noindex: boolean;
  blocks: BlogBlock[];
  faq: BlogFaqItem[];
  ctas: BlogCta[];
}

/** DB row: the input fields plus status and timestamps. */
export interface BlogPost extends BlogPostInput {
  id: string;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostSummary {
  id: string;
  site: BlogSite;
  lang: string;
  slug: string;
  path: string;
  title: string;
  status: BlogStatus;
  /** published + publishedAt in the future. */
  scheduled: boolean;
  publishedAt: string | null;
  updatedAt: string;
  seoScore: number;
  seoErrors: number;
  wordCount: number;
}

// ------------------------------------------------------------ render format

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
  | { t: 'faq' };

export interface RenderedFaqItem {
  q: string;
  a: string;
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
  site: BlogSite;
  seoTitle: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  blocks: RenderedBlock[];
  faq: RenderedFaqItem[];
  ctas: BlogCta[];
}

// ---------------------------------------------------------------------- SEO

export type SeoLevel = 'error' | 'warning' | 'ok';
export type SeoGroup = 'basics' | 'keyword' | 'content' | 'links' | 'media';

export interface SeoCheck {
  id: string;
  group: SeoGroup;
  level: SeoLevel;
  message: string;
}

export interface SeoReport {
  score: number;
  canPublish: boolean;
  wordCount: number;
  checks: SeoCheck[];
}

export const SEO_LIMITS = {
  titleMin: 30,
  titleMax: 60,
  metaMin: 70,
  metaMax: 160,
  excerptMax: 300,
} as const;

// ------------------------------------------------------------------ helpers

/** Same as content.ts `slugify`. */
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

export function postPath(site: BlogSite, slug: string): string {
  return site === 'gpr' ? `/post/${slug}` : `/blog/${slug}`;
}

export function postUrl(site: BlogSite, slug: string): string {
  return `${BLOG_SITE_ORIGIN[site]}${postPath(site, slug)}`;
}

/** Published with a future date. */
export function isScheduled(p: {
  status: string;
  publishedAt: string | null;
}): boolean {
  return (
    p.status === 'published' &&
    !!p.publishedAt &&
    new Date(p.publishedAt).getTime() > Date.now()
  );
}

/** Error body shapes the blog routes return. */
export interface BlogApiError {
  status: number | null;
  message: string;
  issues: { path: string; message: string }[];
  seo: SeoReport | null;
}

export function toBlogApiError(error: unknown, fallback: string): BlogApiError {
  const e = error as {
    response?: {
      status?: number;
      data?: {
        error?: string;
        issues?: { path: string; message: string }[];
        seo?: SeoReport;
      };
    };
    message?: string;
  } | null;
  const data = e?.response?.data;
  return {
    status: e?.response?.status ?? null,
    message: data?.error ?? e?.message ?? fallback,
    issues: Array.isArray(data?.issues) ? data.issues : [],
    seo: data?.seo ?? null,
  };
}

// ---------------------------------------------------------------- endpoints

export interface BlogPostResult {
  post: BlogPost;
  seo: SeoReport;
  preview: PublicPost;
}

export interface BlogValidateResult {
  seo: SeoReport;
  preview: PublicPost;
}

const BASE = '/admin/blog';

export async function listBlogPosts(
  filters: { site?: BlogSite; status?: BlogStatus } = {}
): Promise<BlogPostSummary[]> {
  const params: Record<string, string> = {};
  if (filters.site) params.site = filters.site;
  if (filters.status) params.status = filters.status;
  const { data } = await apiClient.get(`${BASE}/`, { params });
  return data.posts;
}

export async function getBlogPost(id: string): Promise<BlogPostResult> {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return { post: data.post, seo: data.seo, preview: data.preview };
}

export async function createBlogPost(
  input: BlogPostInput
): Promise<BlogPostResult> {
  const { data } = await apiClient.post(`${BASE}/`, input);
  return { post: data.post, seo: data.seo, preview: data.preview };
}

export async function updateBlogPost(
  id: string,
  input: BlogPostInput
): Promise<BlogPostResult> {
  const { data } = await apiClient.put(`${BASE}/${id}`, input);
  return { post: data.post, seo: data.seo, preview: data.preview };
}

export async function deleteBlogPost(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

/** A future `publishedAt` (ISO) schedules the post. */
export async function publishBlogPost(
  id: string,
  publishedAt?: string
): Promise<BlogPostResult> {
  const { data } = await apiClient.post(
    `${BASE}/${id}/publish`,
    publishedAt ? { publishedAt } : {}
  );
  return { post: data.post, seo: data.seo, preview: data.preview };
}

export async function unpublishBlogPost(id: string): Promise<BlogPostResult> {
  const { data } = await apiClient.post(`${BASE}/${id}/unpublish`);
  return { post: data.post, seo: data.seo, preview: data.preview };
}

export async function validateBlogPost(
  post: BlogPostInput,
  id?: string
): Promise<BlogValidateResult> {
  const { data } = await apiClient.post(`${BASE}/validate`, {
    ...(id ? { id } : {}),
    post,
  });
  return { seo: data.seo, preview: data.preview };
}

/** JPG/PNG/WebP/GIF/AVIF up to 5 MB → public image URL. */
export async function uploadBlogImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post(`${BASE}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
