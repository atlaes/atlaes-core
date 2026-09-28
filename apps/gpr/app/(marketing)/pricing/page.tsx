import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  faqPageNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { RichFaq } from '@/components/marketing/home/RichFaq';
import '@/components/marketing/home/home.css';
import './pricing.css';
import {
  PATH,
  PRICING_FAQ,
  PRICING_FAQ_FOOTER,
  PRICING_FAQ_H2,
  PRICING_FAQ_SCHEMA,
  PRICING_FEE_BUYS,
  PRICING_HERE_FOR_YOU,
  PRICING_HERO,
  PRICING_META,
  PRICING_PLANS,
  PRICING_SCHEMA,
} from '@/content/pages/pricing';

export const metadata: Metadata = {
  title: PRICING_META.title,
  description: PRICING_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: PRICING_META.title,
    description: PRICING_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PRICING_META.title,
    description: PRICING_META.description,
  },
};

/** Appendix B: WebPage + BreadcrumbList + Service + FAQPage (provider stub). */
function pricingGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    organizationStub(),
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: PRICING_META.title,
      description: PRICING_SCHEMA.webPageDescription,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'Pricing', path: PATH },
    ]),
    {
      '@type': 'Service',
      '@id': url + '#service',
      name: PRICING_SCHEMA.serviceName,
      serviceType: 'German pension contribution refund service',
      url,
      areaServed: 'Worldwide',
      description: PRICING_SCHEMA.serviceDescription,
      provider: { '@id': ORGANIZATION_ID },
    },
    faqPageNode(url + '#faq', PRICING_FAQ_SCHEMA),
  ]);
}

export default function PricingRoute() {
  return (
    <article className="mk-pricing">
      <JsonLd graph={pricingGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{PRICING_HERO.h1}</h1>
            <p className="mk-tagline">{PRICING_HERO.tagline}</p>
            <p className="mk-p">{PRICING_HERO.intro}</p>
            <div className="mk-cta-row">
              <Pill href={PRICING_HERO.cta.href} size="lg">
                {PRICING_HERO.cta.label}
              </Pill>
            </div>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="our-pricing-plans"
        index={1}
        label="Pricing plans"
        title={PRICING_PLANS.h2}
      >
        <p className="mk-p">{PRICING_PLANS.intro}</p>
        <ul className="mk-price-grid">
          {PRICING_PLANS.cards.map((c) => (
            <li
              key={c.id}
              id={c.id}
              className={
                'mk-price-card' + (c.featured ? ' mk-price-card-featured' : '')
              }
            >
              <p className="mk-price-badge">{c.badge}</p>
              <h3 className="mk-price-title">{c.title}</h3>
              <Blocks blocks={c.blocks} />
              <div className="mk-cta-row mk-price-cta">
                <Pill
                  href={c.button.href}
                  variant={c.featured ? 'primary' : 'secondary'}
                >
                  {c.button.label}
                </Pill>
              </div>
            </li>
          ))}
        </ul>
        <p className="mk-p">{PRICING_PLANS.after}</p>
      </Section>

      <Section
        id="faq"
        index={2}
        label="FAQ"
        title={PRICING_FAQ_H2}
        tone="surface"
      >
        <RichFaq items={PRICING_FAQ} />
        <p className="mk-section-footer">
          <Inline x={PRICING_FAQ_FOOTER.x} sp={PRICING_FAQ_FOOTER.sp} />
        </p>
      </Section>

      <Section
        id="what-the-fee-actually-buys"
        index={3}
        label="What you get"
        title={PRICING_FEE_BUYS.h2}
      >
        <Blocks blocks={PRICING_FEE_BUYS.blocks} />
      </Section>

      <Section
        id="we-are-here-for-you"
        index={4}
        label="Contact"
        title={PRICING_HERE_FOR_YOU.h2}
        tone="tint"
      >
        <Blocks blocks={PRICING_HERE_FOR_YOU.blocks} />
      </Section>
    </article>
  );
}
