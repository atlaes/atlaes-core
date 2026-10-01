import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { absoluteUrl, collectionPageGraph } from '@/lib/jsonld';
import { articles } from '@/content/articles';
import type { ArticleData } from '@/content/articles/types';
import { resolveTokens } from '@/content/tokens';
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
  article: ArticleData;
}

/** The repo's posts: the cornerstone guide first, then newest first. */
function blogPosts(): Post[] {
  const slugs = Object.keys(articles);
  const rest = slugs
    .filter((s) => s !== BLOG_PINNED)
    .sort((a, b) =>
      articles[b].datePublished.localeCompare(articles[a].datePublished)
    );
  const ordered = articles[BLOG_PINNED] ? [BLOG_PINNED, ...rest] : rest;
  return ordered.map((slug) => ({ slug, article: articles[slug] }));
}

function excerpt(p: Post): string {
  return resolveTokens(BLOG_EXCERPTS[p.slug] || p.article.meta);
}

export default function BlogRoute() {
  const posts = blogPosts();
  return (
    <article className="mk-art mk-blog">
      <JsonLd
        graph={collectionPageGraph({
          path: PATH,
          name: BLOG_META.title,
          description: BLOG_LIST.h2,
          items: posts.map((p) => ({
            name: p.article.h1,
            url: absoluteUrl(p.article.path),
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
              <li key={p.slug} className="mk-article">
                <div className="mk-article-image" aria-hidden="true" />
                <div className="mk-article-content">
                  <h3 className="mk-article-title">
                    <SmartLink
                      href={p.article.path}
                      className="mk-article-link"
                      darkClassName=""
                    >
                      {p.article.h1}
                    </SmartLink>
                  </h3>
                  <p className="mk-article-text">{excerpt(p)}</p>
                  <span className="mk-article-date">
                    <time dateTime={p.article.datePublished}>
                      {dateLabel(p.article.datePublished)}
                    </time>
                    {p.article.dateModified &&
                    p.article.dateModified !== p.article.datePublished ? (
                      <>
                        {' · Updated '}
                        <time dateTime={p.article.dateModified}>
                          {dateLabel(p.article.dateModified)}
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
