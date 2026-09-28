import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { absoluteUrl, collectionPageGraph } from '@/lib/jsonld';
import { articles } from '@/content/articles';
import type { ArticleData } from '@/content/articles/types';
import { resolveTokens } from '@/content/tokens';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Section } from '@/components/marketing/ui/Section';
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
import { Crumbs } from '../other-countries/RulesPage';

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
    <article className="mk-blog">
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

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <Crumbs items={BLOG_HERO.crumbs} />
            <p className="mk-kicker">›› {BLOG_HERO.eyebrow.toUpperCase()}</p>
            <h1 className="mk-h1">{BLOG_HERO.h1}</h1>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="all-posts"
        index={1}
        label={BLOG_LIST.label}
        title={BLOG_LIST.h2}
      >
        <ul className="mk-article-grid">
          {posts.map((p) => (
            <li key={p.slug} className="mk-article">
              <p className="mk-article-title">
                <SmartLink
                  href={p.article.path}
                  className="mk-link"
                  darkClassName=""
                >
                  {p.article.h1}
                </SmartLink>
              </p>
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
              <p className="mk-article-text">{excerpt(p)}</p>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
