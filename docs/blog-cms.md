# Blog CMS (GPR + companypension.de)

Ops write articles in the admin (**Blog**), the backend validates them for
SEO, and both sites render published posts from the public API.

| Site                              | Public URL     | Listing                                       |
| --------------------------------- | -------------- | --------------------------------------------- |
| GPR (`site: 'gpr'`)               | `/post/<slug>` | `/blog` (merged with the hand-built articles) |
| companypension.de (`site: 'vbl'`) | `/blog/<slug>` | `/blog`                                       |

Backend: `packages/functions/src/services/blog/` (`content.ts` format,
`seo.ts` checks, `index.ts` service), routes in `src/routes/blog.ts`, table
`shared.blog_posts` (migration 0030).

## Editor format (stored)

Text fields allow only `**bold**` and `[label](href)`; no HTML is stored.

```ts
type BlogBlock =
  | { t: 'p'; md: string }
  | { t: 'h2'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'ul' | 'ol'; items: string[] } // items: inline syntax
  | { t: 'quote' | 'note'; md: string }
  | { t: 'table'; rows: string[][] } // first row = header
  | { t: 'img'; url: string; alt: string; caption?: string };

interface BlogPostInput {
  site: 'gpr' | 'vbl';
  lang: 'en' | 'de';
  slug: string;
  title: string; // H1
  seoTitle?: string | null; // <title>, falls back to title
  metaDescription?: string | null;
  excerpt?: string | null;
  focusKeyword?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  authorName?: string | null;
  canonicalUrl?: string | null;
  noindex: boolean;
  blocks: BlogBlock[];
  faq: { q: string; a: string }[]; // a: inline syntax, \n\n = paragraph
  ctas: { label: string; href: string }[]; // max 5
}
```

## Render format (public API and admin preview)

Inline syntax becomes `{ x, sp }` rich text — plain text plus spans matched
by text (`{ k: 'b', x }` bold, `{ k: 'a', x, href }` link), the same shape as
`apps/gpr/content/types.ts` `Span`. h2s carry an anchor `id`; when the post
has FAQs a `{ t: 'faq' }` block marks where the FAQ section goes.

```ts
type Rich = { x: string; sp: Span[] };
type RenderedBlock =
  | ({ t: 'p' | 'quote' | 'note' } & Rich)
  | { t: 'h2'; x: string; id: string }
  | { t: 'h3'; x: string }
  | { t: 'ul' | 'ol'; items: Rich[] }
  | { t: 'table'; rows: string[][] }
  | { t: 'img'; url: string; alt: string; caption?: string }
  | { t: 'faq' };

interface PublicPostSummary {
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
interface PublicPost extends PublicPostSummary {
  site: 'gpr' | 'vbl';
  seoTitle: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  blocks: RenderedBlock[];
  faq: { q: string; a: string; blocks: RenderedBlock[] }[];
  ctas: { label: string; href: string }[];
}
```

## API

Public (no auth, not rate-limited, `Cache-Control: max-age=60`):

- `GET /api/blog/:site/posts?lang=` → `{ success, posts: PublicPostSummary[] }`
- `GET /api/blog/:site/posts/:slug` → `{ success, post: PublicPost }` or 404
- `GET /api/blog/images/:name` → image bytes (immutable cache)

Admin (`Authorization: Bearer`, role admin), base `/api/admin/blog`:

- `GET /?site=&status=` → `{ posts: { id, site, lang, slug, path, title, status, scheduled, publishedAt, updatedAt, seoScore, seoErrors, wordCount }[] }`
- `POST /validate` `{ id?, post: BlogPostInput }` → `{ seo: SeoReport, preview: PublicPost }`
- `POST /` `BlogPostInput` → 201 `{ post, seo, preview }` (always a draft)
- `GET /:id`, `PUT /:id` (body `BlogPostInput`) → `{ post, seo, preview }`
- `DELETE /:id` → `{ success }`
- `POST /:id/publish` `{ publishedAt?: ISO }` → `{ post, seo, preview }`; 422 `{ error, seo }` on SEO errors. A future `publishedAt` schedules the post.
- `POST /:id/unpublish` → back to draft
- `POST /images` multipart `file` (JPG/PNG/WebP/GIF/AVIF, ≤ 5 MB) → 201 `{ url }`

Errors: 400 `{ error, issues }` invalid body, 404, 409 slug taken, 422 SEO
errors (saving a _published_ post into an invalid state is also refused).

`post` is the DB row: the input fields plus `id, status, publishedAt,
createdAt, updatedAt`.

## SEO checks

`SeoReport = { score: 0–100, canPublish, wordCount, checks: { id, group:
'basics'|'keyword'|'content'|'links'|'media', level: 'error'|'warning'|'ok',
message }[] }`. Errors block publishing:
missing title / meta description / body, invalid or duplicate slug (or one
taken by a hand-built GPR post), invalid links or canonical URL, images or
cover without alt text, empty headings, incomplete FAQs, CTA without label.
Warnings: SEO title 30–60 and meta 70–160 characters, duplicate SEO title,
focus keyword in SEO title / H1 / meta / slug / first paragraph / an H2,
keyword density 0.5–3 %, under 300 words, heading order, paragraphs over 150
words, no internal or outbound link, vague link text, no cover image,
noindex.
