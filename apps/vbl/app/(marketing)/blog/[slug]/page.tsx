import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { CtaBand } from '@/components/marketing/CtaBand';
import { BlogBlocks, BlogLink } from '@/components/marketing/BlogContent';
import {
  SITE_NAME,
  SITE_URL,
  fetchPost,
  formatDate,
  imageUrl,
  postPath,
  readingTime,
  type PublicPost,
} from '@/lib/blog-api';

// ---------------------------------------------------------------------------
// Blog article (CMS post, docs/blog-cms.md): compact dark header with
// breadcrumb + by-line, cover image, prose column, FAQ at the `faq` marker,
// the post's CTA buttons and the shared closing CTA band.
// ---------------------------------------------------------------------------

interface Props {
  params: { slug: string };
}

const UI = {
  en: { home: 'Home', faq: 'Frequently asked questions', by: 'By' },
  de: { home: 'Startseite', faq: 'Häufige Fragen', by: 'Von' },
};

function canonical(post: PublicPost): string {
  return post.canonicalUrl || SITE_URL + postPath(post.slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPost(params.slug);
  if (!post) return {};
  const title = post.seoTitle || post.title;
  const description = post.metaDescription || post.excerpt || undefined;
  const images = post.coverImageUrl
    ? [
        {
          url: imageUrl(post.coverImageUrl),
          alt: post.coverImageAlt || post.title,
        },
      ]
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: canonical(post) },
    ...(post.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: SITE_URL + postPath(post.slug),
      siteName: SITE_NAME,
      type: 'article',
      locale: post.lang === 'de' ? 'de_DE' : 'en_GB',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      ...(post.authorName ? { authors: [post.authorName] } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

function jsonLd(post: PublicPost) {
  const url = SITE_URL + postPath(post.slug);
  const publisher = {
    '@type': 'Organization',
    '@id': SITE_URL + '/#organization',
    name: SITE_NAME,
    url: SITE_URL + '/',
    logo: {
      '@type': 'ImageObject',
      url: SITE_URL + '/companypension-cashouts-refunds.svg',
    },
  };
  const nodes: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      '@id': url + '#article',
      headline: post.title,
      description: post.metaDescription || post.excerpt || undefined,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical(post) },
      inLanguage: post.lang,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      ...(post.coverImageUrl
        ? {
            image: {
              '@type': 'ImageObject',
              url: imageUrl(post.coverImageUrl),
              ...(post.coverImageAlt ? { caption: post.coverImageAlt } : {}),
            },
          }
        : {}),
      author: post.authorName
        ? { '@type': 'Person', name: post.authorName }
        : { '@id': publisher['@id'] },
      publisher: { '@id': publisher['@id'] },
    },
    publisher,
    {
      '@type': 'BreadcrumbList',
      '@id': url + '#breadcrumbs',
      itemListElement: [
        { name: UI.en.home, item: SITE_URL + '/' },
        { name: 'Blog', item: SITE_URL + '/blog' },
        { name: post.title, item: url },
      ].map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
    },
  ];
  if (post.faq.length) {
    nodes.push({
      '@type': 'FAQPage',
      '@id': url + '#faq',
      mainEntity: post.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': nodes };
}

const PRIMARY_BTN =
  'flex h-[56px] items-center justify-center rounded-brand bg-accent px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover';
const SECONDARY_BTN =
  'flex h-[56px] items-center justify-center rounded-brand border border-brand/30 px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-brand/5';

export default async function BlogPostPage({ params }: Props) {
  const post = await fetchPost(params.slug);
  if (!post) notFound();
  const ui = post.lang === 'de' ? UI.de : UI.en;
  const updated = post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10);
  const blocks = post.blocks.some((b) => b.t === 'faq')
    ? post.blocks
    : // Defensive: the API appends the marker whenever there are FAQs.
      post.faq.length
      ? [...post.blocks, { t: 'faq' as const }]
      : post.blocks;

  return (
    <article lang={post.lang && post.lang !== 'en' ? post.lang : undefined}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd(post)).replace(/</g, '\\u003c'),
        }}
      />

      {/* ---- HEADER (same chrome as LegalPageHeader) ---- */}
      <header className="relative overflow-hidden bg-brand text-white">
        <Image
          src="/marketing/home/hero-background.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover object-top"
        />
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-16 pt-36 text-center sm:pb-20 sm:pt-44">
          <nav aria-label="Breadcrumb" className="mb-6 max-w-full">
            <ol className="flex flex-wrap items-center justify-center gap-1 text-sm text-white/70">
              <li>
                <Link href="/" className="hover:text-white">
                  {ui.home}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </li>
              <li
                aria-current="page"
                className="max-w-[60vw] truncate text-white/90 sm:max-w-md"
              >
                {post.title}
              </li>
            </ol>
          </nav>

          <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {post.title}
          </h1>

          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-white/75 sm:text-base">
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt, post.lang)}
            </time>
            {updated ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {post.lang === 'de' ? 'Aktualisiert ' : 'Updated '}
                  <time dateTime={post.updatedAt}>
                    {formatDate(post.updatedAt, post.lang)}
                  </time>
                </span>
              </>
            ) : null}
            {post.authorName ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {ui.by} {post.authorName}
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{readingTime(post.readingMinutes, post.lang)}</span>
          </p>
        </div>
      </header>

      {/* ---- BODY ---- */}
      <section className="bg-white">
        <div className="mx-auto max-w-[860px] px-6 py-16 sm:py-20">
          {post.coverImageUrl ? (
            <figure className="mb-12">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(post.coverImageUrl)}
                alt={post.coverImageAlt || ''}
                className="h-auto w-full rounded-2xl border border-gray-200"
              />
            </figure>
          ) : null}

          <div className="text-base leading-relaxed text-gray-700 sm:text-lg">
            <BlogBlocks blocks={blocks} faq={post.faq} faqTitle={ui.faq} />
          </div>

          {post.ctas.length ? (
            <div className="mt-12 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              {post.ctas.map((c, i) => (
                <BlogLink
                  key={c.href + i}
                  href={c.href}
                  className={i === 0 ? PRIMARY_BTN : SECONDARY_BTN}
                >
                  {c.label}
                </BlogLink>
              ))}
            </div>
          ) : null}

          <p className="mt-14 border-t border-gray-200 pt-6 text-sm">
            <Link
              href="/blog"
              className="font-semibold text-brand underline underline-offset-2"
            >
              {post.lang === 'de' ? '← Alle Artikel' : '← All articles'}
            </Link>
          </p>
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
    </article>
  );
}
