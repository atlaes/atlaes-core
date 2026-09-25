import type { Metadata } from 'next';
import type { ArticleData } from '@/content/articles/types';
import { resolveTokens } from '@/content/tokens';
import { pageAlternates } from '@/lib/hreflang';

/** Next.js metadata from the page data (title / meta exactly as handed off). */
export function articleMetadata(a: ArticleData): Metadata {
  const title = resolveTokens(a.title);
  const description = resolveTokens(a.meta);
  return {
    title,
    description,
    alternates: pageAlternates({ path: a.path }),
    openGraph: {
      title,
      description,
      url: a.path,
      type: a.kind === 'collection' ? 'website' : 'article',
      locale: a.lang,
      ...(a.imageUrl ? { images: [a.imageUrl] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
