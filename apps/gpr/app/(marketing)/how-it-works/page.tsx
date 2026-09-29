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
import { DISCLAIMER_ID02 } from '@/content/site';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { RichFaq } from '@/components/marketing/home/RichFaq';
import '@/components/marketing/home/home.css';
import {
  HIW_CLOSE,
  HIW_FAQ,
  HIW_FAQ_H2,
  HIW_FAQ_SCHEMA,
  HIW_HERO,
  HIW_META,
  HIW_SECTIONS,
  PATH,
} from './content';

export const metadata: Metadata = {
  title: HIW_META.title,
  description: HIW_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: HIW_META.title,
    description: HIW_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: HIW_META.title,
    description: HIW_META.description,
  },
};

/** BreadcrumbList + WebPage (welded to the Organization stub) + FAQPage. No HowTo. */
function howItWorksGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    organizationStub(),
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'How It Works', path: PATH },
    ]),
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: HIW_META.title,
      description: HIW_META.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
    },
    faqPageNode(url + '#faq', HIW_FAQ_SCHEMA),
  ]);
}

export default function HowItWorksRoute() {
  const faqIndex = HIW_SECTIONS.length + 1;
  return (
    <article className="mk-how-it-works">
      <JsonLd graph={howItWorksGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{HIW_HERO.h1}</h1>
            <p className="mk-p">{HIW_HERO.intro}</p>
            <p className="mk-kicker">{HIW_HERO.kicker}</p>
            <div className="mk-cta-row">
              <Pill href={HIW_HERO.cta.href} size="lg">
                {HIW_HERO.cta.label}
              </Pill>
            </div>
            <p className="mk-cta-micro">{HIW_HERO.ctaMicro}</p>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      {HIW_SECTIONS.map((s, i) => (
        <Section
          key={s.id}
          id={s.id}
          index={i + 1}
          label={s.label}
          title={s.n ? s.n + '. ' + s.h2 : s.h2}
          tone={s.n ? 'plain' : i % 2 ? 'surface' : 'plain'}
        >
          <Blocks blocks={s.blocks} />
          {s.documents ? (
            <ul className="mk-bullets">
              {s.documents.map((d) => (
                <li key={d}>
                  <Inline x={d} />
                </li>
              ))}
            </ul>
          ) : null}
          {s.after ? <Blocks blocks={s.after} /> : null}
        </Section>
      ))}

      <Section
        id="faq"
        index={faqIndex}
        label="FAQ"
        title={HIW_FAQ_H2}
        tone="surface"
      >
        <RichFaq items={HIW_FAQ} />
      </Section>

      <Section
        id="find-out-what-you-could-get-back"
        index={faqIndex + 1}
        label="Get started"
        title={HIW_CLOSE.h2}
        tone="tint"
      >
        <p className="mk-p">{HIW_CLOSE.text}</p>
        <div className="mk-cta-row">
          <Pill href={HIW_CLOSE.cta.href} size="lg">
            {HIW_CLOSE.cta.label}
          </Pill>
        </div>
        <p className="mk-note">{DISCLAIMER_ID02}</p>
      </Section>
    </article>
  );
}
