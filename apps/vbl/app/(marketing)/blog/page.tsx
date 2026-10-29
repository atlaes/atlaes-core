import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { LegalPageHeader } from '@/components/marketing/LegalPageHeader';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  fetchPosts,
  formatDate,
  imageUrl,
  postPath,
  readingTime,
} from '@/lib/blog-api';

// ---------------------------------------------------------------------------
// Blog index (CMS posts, docs/blog-cms.md). Same chrome as the legal/utility
// pages: compact dark header, light card grid, closing CTA band.
// ---------------------------------------------------------------------------

const PATH = '/blog';
const TITLE = `Blog | ${SITE_NAME}`;
const DESCRIPTION =
  'Guides and news on German company pensions: bAV cash-outs and VBL, ZVK, VddB and VddKO refunds explained.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL + PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL + PATH,
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

export default async function BlogIndexPage() {
  const posts = await fetchPosts();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': SITE_URL + PATH + '#blog',
        url: SITE_URL + PATH,
        name: TITLE,
        description: DESCRIPTION,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        blogPost: posts.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          url: absoluteUrl(p.path || postPath(p.slug)),
          datePublished: p.publishedAt,
          dateModified: p.updatedAt,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL + '/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: SITE_URL + PATH,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <LegalPageHeader
        eyebrow="Blog"
        title="Company pension guides"
        highlight="and news"
        body="Plain-language articles on bAV cash-outs and VBL, ZVK, VddB and VddKO refunds."
      />

      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          {posts.length ? (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => {
                const href = postPath(p.slug);
                return (
                  <li
                    key={p.slug}
                    lang={p.lang && p.lang !== 'en' ? p.lang : undefined}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-brand/10">
                      {p.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl(p.coverImageUrl)}
                          alt={p.coverImageAlt || ''}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-6 sm:p-7">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
                        <time dateTime={p.publishedAt}>
                          {formatDate(p.publishedAt, p.lang)}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {readingTime(p.readingMinutes, p.lang)}
                        </span>
                      </p>
                      <h2 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight text-brand">
                        {/* Stretched link: the whole card is clickable. */}
                        <Link
                          href={href}
                          className="after:absolute after:inset-0 after:content-[''] group-hover:underline"
                        >
                          {p.title}
                        </Link>
                      </h2>
                      {p.excerpt ? (
                        <p className="mt-3 text-base leading-relaxed text-gray-600">
                          {p.excerpt}
                        </p>
                      ) : null}
                      <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand">
                        Read article
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl bg-white px-8 py-14 text-center shadow-sm ring-1 ring-black/5">
              <h2 className="font-display text-2xl font-bold tracking-tight text-brand">
                No articles yet
              </h2>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                Our first guides are on their way. In the meantime, the FAQ
                answers the most common questions about company pension
                cash-outs and refunds.
              </p>
              <Link
                href="/faq"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-brand bg-accent px-6 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
              >
                Read the FAQ
              </Link>
            </div>
          )}
        </div>
      </section>

      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Ready to check your{' '}
            <span className="text-accent">company pension?</span>
          </>
        }
        body="Start the guided claim flow for a bAV cash-out or a VBL, ZVK, VddB or VddKO refund."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
      />
    </>
  );
}
