import type { Metadata } from 'next';
import { HomePage } from '@/components/marketing/home/HomePage';
import { HOME_META } from '@/components/marketing/home/home-content';
import { pageAlternates } from '@/lib/hreflang';

/**
 * `/` — the marketing homepage (Homepage Build Sheet, 8 Sep 2026). This
 * replaces the old funnel redirect page: the intake flow is reached via
 * the hero flow card and every CTA (`FUNNEL_ENTRY`), the account via
 * `/auth`, which redirects signed-in users on to their claims.
 */
export const metadata: Metadata = {
  title: HOME_META.title,
  description: HOME_META.description,
  alternates: pageAlternates({ path: '/' }),
  openGraph: {
    title: HOME_META.title,
    description: HOME_META.ogDescription,
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_META.title,
    description: HOME_META.ogDescription,
  },
};

export default function HomeRoute() {
  return <HomePage />;
}
