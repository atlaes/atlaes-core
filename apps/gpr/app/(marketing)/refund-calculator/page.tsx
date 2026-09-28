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
import { FaqList } from '@/components/marketing/ui/FaqList';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { CalculatorEmbed } from './CalculatorEmbed';
import './refund-calculator.css';
import {
  CALC_CLOSE,
  CALC_FAQ,
  CALC_FAQ_H2,
  CALC_HERO,
  CALC_HOW_TO,
  CALC_META,
  CALC_REFUNDS,
  CALC_RULES,
  CALC_SCHEMA,
  PATH,
} from '@/content/pages/refund-calculator';

export const metadata: Metadata = {
  title: CALC_META.title,
  description: CALC_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: CALC_META.title,
    description: CALC_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: CALC_META.title,
    description: CALC_META.description,
  },
};

/** Appendix B v3: WebPage + BreadcrumbList + WebApplication + Service + FAQPage. */
function calculatorGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    organizationStub(),
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: CALC_SCHEMA.webPageName,
      description: CALC_SCHEMA.webPageDescription,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
      mainEntity: { '@id': url + '#calculator' },
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'Refund Calculator', path: PATH },
    ]),
    {
      '@type': 'WebApplication',
      '@id': url + '#calculator',
      name: CALC_SCHEMA.appName,
      url,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      description: CALC_SCHEMA.appDescription,
      provider: { '@id': ORGANIZATION_ID },
    },
    {
      '@type': 'Service',
      '@id': url + '#service',
      name: CALC_SCHEMA.serviceName,
      serviceType: 'German pension contribution refund service',
      url,
      areaServed: 'Worldwide',
      description: CALC_SCHEMA.serviceDescription,
      provider: { '@id': ORGANIZATION_ID },
    },
    faqPageNode(url + '#faq', CALC_FAQ),
  ]);
}

export default function RefundCalculatorRoute() {
  return (
    <article className="mk-refund-calculator">
      <JsonLd graph={calculatorGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{CALC_HERO.h1}</h1>
            <p className="mk-p">{CALC_HERO.intro}</p>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section id="calculator" index={1} label="Calculator">
        <div className="mk-calc-embed">
          <CalculatorEmbed />
        </div>
        <p className="mk-p">{CALC_HERO.privacy}</p>
      </Section>

      <Section
        id="how-to-use-the-calculator"
        index={2}
        label="How to use"
        title={CALC_HOW_TO.h2}
        tone="surface"
      >
        <Blocks blocks={CALC_HOW_TO.blocks} />
      </Section>

      <Section
        id="the-rules-behind-the-verdict"
        index={3}
        label="The rules"
        title={CALC_RULES.h2}
      >
        {CALC_RULES.sections.map((s) => (
          <div key={s.id} id={s.id}>
            <h3 className="mk-h3">{s.h3}</h3>
            <Blocks blocks={s.blocks} />
          </div>
        ))}
      </Section>

      <Section
        id="what-refunds-actually-look-like"
        index={4}
        label="Refund amounts"
        title={CALC_REFUNDS.h2}
        tone="surface"
      >
        <Blocks blocks={CALC_REFUNDS.blocks} />
      </Section>

      <Section id="faq" index={5} label="FAQ" title={CALC_FAQ_H2}>
        <FaqList items={CALC_FAQ} />
      </Section>

      <Section
        id="claim-your-german-pension-refund-today"
        index={6}
        label="Get started"
        title={CALC_CLOSE.h2}
        tone="tint"
      >
        <p className="mk-p">
          <Inline x={CALC_CLOSE.text.x} sp={CALC_CLOSE.text.sp} />
        </p>
        <div className="mk-cta-row">
          <Pill href={CALC_CLOSE.cta.href} size="lg">
            {CALC_CLOSE.cta.label}
          </Pill>
        </div>
      </Section>
    </article>
  );
}
