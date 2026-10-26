import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/hreflang';
import { FORMER_YUGOSLAVIA } from '@/content/pages/former-yugoslavia';
import { RulesPage } from '../other-countries/RulesPage';

const page = FORMER_YUGOSLAVIA;

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

/** Combined page; `#bosnia-herzegovina`, `#kosovo`, `#montenegro`, `#serbia` are the 301 targets. */
export default function FormerYugoslaviaRoute() {
  return <RulesPage page={page} />;
}
