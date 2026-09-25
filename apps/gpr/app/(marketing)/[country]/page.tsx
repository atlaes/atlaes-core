import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CountryPage } from '@/components/marketing/country/CountryPage';
import { getCountryPage } from '@/content/countries';
import { GENERATED_COUNTRY_SLUGS } from '@/content/registries/countries';
import { pageAlternates } from '@/lib/hreflang';

interface Params {
  params: { country: string };
}

/** Only the slugs in the registry render; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ country: string }> {
  return GENERATED_COUNTRY_SLUGS.map((country) => ({ country }));
}

export function generateMetadata({ params }: Params): Metadata {
  const page = getCountryPage(params.country);
  if (!page) return {};
  const path = '/' + page.slug;
  return {
    title: page.title,
    description: page.meta,
    alternates: pageAlternates({ path }),
    openGraph: {
      title: page.title,
      description: page.meta,
      url: path,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.meta,
    },
  };
}

export default function CountryRoute({ params }: Params) {
  const page = getCountryPage(params.country);
  if (!page) notFound();
  return <CountryPage page={page} />;
}
