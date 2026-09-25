import type { Metadata } from 'next';
import { ArticlePage } from '@/components/marketing/article/ArticlePage';
import { articleMetadata } from '@/components/marketing/article/metadata';
import { getArticle } from '@/content/articles';

const SLUG = 'how-to-get-a-german-pension-refund';

export function generateMetadata(): Metadata {
  const page = getArticle(SLUG);
  return page ? articleMetadata(page) : {};
}

export default function Page() {
  const page = getArticle(SLUG);
  if (!page) throw new Error('Missing page data: ' + SLUG);
  return <ArticlePage data={page} />;
}
