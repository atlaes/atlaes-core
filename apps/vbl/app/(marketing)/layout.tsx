import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative font-sans">
      {/* MarketingNav is an absolute, transparent overlay (no bg strip of
          its own) so every page's dark Hero background shows through
          behind the pill nav. `relative` here anchors that absolute
          positioning to the top of the page content. */}
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
