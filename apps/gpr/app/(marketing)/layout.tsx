import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/layout/SiteHeader';
import { SiteFooter } from '@/components/marketing/layout/SiteFooter';
import { SITE_URL } from '@/content/registries/links';
import './marketing.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: {
    siteName: 'Germany Pension Refund',
    type: 'website',
    locale: 'en',
  },
};

/**
 * Marketing route group. The root layout keeps the funnel's providers and
 * Inter font; this layout adds the server-rendered header and footer built
 * from the registries and scopes the brand design tokens (`.mk`).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mk">
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mk-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
