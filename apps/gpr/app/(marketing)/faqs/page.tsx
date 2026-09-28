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
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { JumpMenu } from '@/components/marketing/ui/JumpMenu';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { RichFaq } from '@/components/marketing/home/RichFaq';
import '@/components/marketing/home/home.css';
import {
  FAQS_CLOSE,
  FAQS_HERO,
  FAQS_META,
  FAQS_SCHEMA,
  FAQS_TOPICS,
  PATH,
} from '@/content/pages/faqs';
import { Crumbs } from '../other-countries/RulesPage';

export const metadata: Metadata = {
  title: FAQS_META.title,
  description: FAQS_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: FAQS_META.title,
    description: FAQS_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: FAQS_META.title,
    description: FAQS_META.description,
  },
};

/** BreadcrumbList + WebPage (Organization stub) + FAQPage from the live page's schema texts. */
function faqsGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    organizationStub(),
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'FAQ', path: PATH },
    ]),
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: FAQS_META.title,
      description: FAQS_META.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
    },
    faqPageNode(url + '#faq', FAQS_SCHEMA),
  ]);
}

export default function FaqsRoute() {
  return (
    <article className="mk-faqs">
      <JsonLd graph={faqsGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <Crumbs items={FAQS_HERO.crumbs} />
            <p className="mk-kicker">›› {FAQS_HERO.eyebrow.toUpperCase()}</p>
            <h1 className="mk-h1">{FAQS_HERO.h1}</h1>
            <p className="mk-p">{FAQS_HERO.lead}</p>
            <p className="mk-p">
              <Inline x={FAQS_HERO.guide.x} sp={FAQS_HERO.guide.sp} />
            </p>
            <div className="mk-cta-row">
              <Pill href={FAQS_HERO.cta.href} size="lg">
                {FAQS_HERO.cta.label}
              </Pill>
            </div>
            <JumpMenu
              ariaLabel={FAQS_HERO.jumpLabel}
              items={FAQS_TOPICS.map((tp) => ({
                href: '#' + tp.id,
                label: tp.label + ' · ' + tp.items.length + ' questions',
              }))}
            />
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      {FAQS_TOPICS.map((tp, i) => (
        <Section
          key={tp.id}
          id={tp.id}
          index={i + 1}
          label={tp.label}
          title={tp.h2}
          tone={i % 2 ? 'surface' : 'plain'}
        >
          <RichFaq items={tp.items} />
        </Section>
      ))}

      <Section
        id="ready-to-claim"
        index={FAQS_TOPICS.length + 1}
        label="Get started"
        title={FAQS_CLOSE.h2}
        tone="tint"
      >
        <div className="mk-cta-row">
          <Pill href={FAQS_CLOSE.cta.href} size="lg">
            {FAQS_CLOSE.cta.label}
          </Pill>
        </div>
      </Section>
    </article>
  );
}
