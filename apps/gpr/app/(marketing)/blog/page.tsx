import type { Metadata } from 'next';
import Link from 'next/link';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { absoluteUrl, collectionPageGraph } from '@/lib/jsonld';
import { articles } from '@/content/articles';
import type { ArticleData } from '@/content/articles/types';
import { resolveTokens } from '@/content/tokens';
import {
  absoluteImageUrl,
  fetchCmsPosts,
  inertText,
  isoDate,
  type CmsPostSummary,
} from '@/lib/blog-api';
import { ArticleHero } from '@/components/marketing/article/ArticlePage';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Rail } from '@/components/marketing/ui/Section';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import '@/components/marketing/home/home.css';
import {
  BLOG_EXCERPTS,
  BLOG_HERO,
  BLOG_LIST,
  BLOG_META,
  BLOG_PINNED,
  PATH,
} from '@/content/pages/blog';

export const metadata: Metadata = {
  title: BLOG_META.title,
  description: BLOG_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: BLOG_META.title,
    description: BLOG_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BLOG_META.title,
    description: BLOG_META.description,
  },
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `2025-07-15` → `Jul 15, 2025`. */
function dateLabel(iso: string): string {
  const p = iso.split('-');
  return (MONTHS[Number(p[1]) - 1] || p[1]) + ' ' + Number(p[2]) + ', ' + p[0];
}

interface Post {
  slug: string;
  path: string;
  title: string;
  excerpt: string;
  datePublished: string;
  dateModified: string;
  /** CMS posts only (the hand-built cards keep the tint placeholder). */
  cover?: { url: string; alt: string };
  /** CMS posts are not in the links registry, so they link directly. */
  cms: boolean;
}

function repoPost(slug: string, article: ArticleData): Post {
  return {
    slug,
    path: article.path,
    title: article.h1,
    excerpt: resolveTokens(BLOG_EXCERPTS[slug] || article.meta),
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    cms: false,
  };
}

function cmsPost(p: CmsPostSummary): Post {
  return {
    slug: p.slug,
    path: p.path || `/post/${p.slug}`,
    title: inertText(p.title),
    excerpt: inertText(p.excerpt || ''),
    datePublished: isoDate(p.publishedAt),
    dateModified: isoDate(p.updatedAt || p.publishedAt),
    ...(p.coverImageUrl
      ? {
          cover: {
            url: absoluteImageUrl(p.coverImageUrl),
            alt: p.coverImageAlt || '',
          },
        }
      : {}),
    cms: true,
  };
}

/**
 * The repo's posts merged with the published CMS posts: the cornerstone
 * guide first, then newest first.
 */
function blogPosts(cms: CmsPostSummary[]): Post[] {
  const repo = Object.keys(articles).map((s) => repoPost(s, articles[s]));
  const paths = new Set(repo.map((p) => p.path));
  const all = [...repo, ...cms.map(cmsPost).filter((p) => !paths.has(p.path))];
  const pinned = all.filter((p) => !p.cms && p.slug === BLOG_PINNED);
  const rest = all
    .filter((p) => p.cms || p.slug !== BLOG_PINNED)
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  return [...pinned, ...rest];
}

export default async function BlogRoute() {
  // The listing is the English site's (the de. view has no news index).
  const posts = blogPosts(await fetchCmsPosts('en'));
  return (
    <article className="mk-art mk-blog">
      <JsonLd
        graph={collectionPageGraph({
          path: PATH,
          name: BLOG_META.title,
          description: BLOG_LIST.h2,
          items: posts.map((p) => ({
            name: p.title,
            url: absoluteUrl(p.path),
          })),
          breadcrumbs: [
            { name: 'Home', path: '/' },
            { name: 'News', path: PATH },
          ],
        })}
      />
      <AttributionCapture />

      <ArticleHero
        lang="en"
        crumbs={BLOG_HERO.crumbs.map((c, i) =>
          i === BLOG_HERO.crumbs.length - 1 ? { label: c.label } : c
        )}
        eyebrow={BLOG_HERO.eyebrow}
        h1={BLOG_HERO.h1}
      />

      {/* All posts band (Figma 927:11397): surface, rail + H2, 3-up cards */}
      <section id="all-posts" className="mk-blog-list">
        <div className="mk-blog-list-inner">
          <div className="mk-articles-head">
            <Rail index={1} label={BLOG_LIST.label} />
            <h2 className="mk-h2">{BLOG_LIST.h2}</h2>
          </div>
          <ul className="mk-article-grid">
            {posts.map((p) => (
              <li key={p.path} className="mk-article">
                {p.cover ? (
                  <div className="mk-article-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.cover.url} alt={p.cover.alt} loading="lazy" />
                  </div>
                ) : (
                  <div className="mk-article-image" aria-hidden="true" />
                )}
                <div className="mk-article-content">
                  <h3 className="mk-article-title">
                    {p.cms ? (
                      <Link href={p.path} className="mk-article-link">
                        {p.title}
                      </Link>
                    ) : (
                      <SmartLink
                        href={p.path}
                        className="mk-article-link"
                        darkClassName=""
                      >
                        {p.title}
                      </SmartLink>
                    )}
                  </h3>
                  {p.excerpt ? (
                    <p className="mk-article-text">{p.excerpt}</p>
                  ) : null}
                  <span className="mk-article-date">
                    <time dateTime={p.datePublished}>
                      {dateLabel(p.datePublished)}
                    </time>
                    {p.dateModified && p.dateModified !== p.datePublished ? (
                      <>
                        {' · Updated '}
                        <time dateTime={p.dateModified}>
                          {dateLabel(p.dateModified)}
                        </time>
                      </>
                    ) : null}
                  </span>
                  <span className="mk-article-arrow" aria-hidden="true">
                    ››
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
