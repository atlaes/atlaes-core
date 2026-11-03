import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticlePage } from '@/components/marketing/article/ArticlePage';
import { articleMetadata } from '@/components/marketing/article/metadata';
import { DE_SITE_URL, SITE_URL } from '@/content/registries/links';
import { cmsPostToArticle, fetchCmsPost } from '@/lib/blog-api';

/**
 * Blog CMS posts (docs/blog-cms.md). The hand-built posts have their own
 * static folders under `post/`, which win over this dynamic route; the
 * backend refuses those slugs for CMS posts.
 */
interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchCmsPost(params.slug);
  if (!post) return {};
  const data = cmsPostToArticle(post);
  const base = articleMetadata(data);
  const origin = data.lang === 'de' ? DE_SITE_URL : SITE_URL;
  const image = data.imageUrl
    ? [{ url: data.imageUrl, alt: post.coverImageAlt || post.title }]
    : undefined;
  return {
    ...base,
    alternates: { canonical: post.canonicalUrl || origin + data.path },
    ...(post.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: base.openGraph?.title,
      description: base.openGraph?.description,
      url: data.path,
      type: 'article',
      locale: data.lang,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      ...(post.authorName ? { authors: [post.authorName] } : {}),
      ...(image ? { images: image } : {}),
    },
    twitter: {
      ...base.twitter,
      ...(image ? { images: image } : {}),
    },
  };
}

export default async function Page({ params }: Props) {
  const post = await fetchCmsPost(params.slug);
  if (!post) notFound();
  return <ArticlePage data={cmsPostToArticle(post)} />;
}
