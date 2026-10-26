import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/layout/SiteHeader';
import { SiteFooter } from '@/components/marketing/layout/SiteFooter';
import { SITE_URL } from '@/content/registries/links';
import { MOTION_ATTR } from '@/components/marketing/motion/flag';
import { MotionObserver } from '@/components/marketing/motion/MotionObserver';
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
 * `data-motion` is the global motion switch (`NEXT_PUBLIC_GPR_MOTION=off`
 * at build time turns every effect off); `MotionObserver` is the one
 * client island that drives reveals and the header scroll state.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mk" data-motion={MOTION_ATTR}>
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mk-main">
        {children}
      </main>
      <SiteFooter />
      {MOTION_ATTR === 'on' ? <MotionObserver /> : null}
    </div>
  );
}
