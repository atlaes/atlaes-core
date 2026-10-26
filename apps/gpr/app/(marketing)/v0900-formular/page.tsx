import type { Metadata } from 'next';
import { ArticlePage } from '@/components/marketing/article/ArticlePage';
import { articleMetadata } from '@/components/marketing/article/metadata';
import { getGuide } from '@/content/guides';

const SLUG = 'v0900-formular';

export function generateMetadata(): Metadata {
  const page = getGuide(SLUG);
  return page ? articleMetadata(page) : {};
}

export default function Page() {
  const page = getGuide(SLUG);
  if (!page) throw new Error('Missing page data: ' + SLUG);
  return <ArticlePage data={page} />;
}
