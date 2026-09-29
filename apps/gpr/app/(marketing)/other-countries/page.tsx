import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/hreflang';
import { OTHER_COUNTRIES } from '@/content/pages/other-countries';
import { RulesPage } from './RulesPage';

const page = OTHER_COUNTRIES;

export const metadata: Metadata = {
  title: page.title,
  description: page.meta,
  alternates: pageAlternates({ path: page.path }),
  openGraph: {
    title: page.title,
    description: page.meta,
    url: page.path,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: page.title,
    description: page.meta,
  },
};

export default function OtherCountriesRoute() {
  return <RulesPage page={page} />;
}
