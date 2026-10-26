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
import { CoreCta, CoreHero } from '../_core/CoreHero';
import '../_core/core.css';
import './faqs.css';

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
    <article className="mk-faqs mk-core">
      <JsonLd graph={faqsGraph()} />
      <AttributionCapture />

      {/* Hero (945:5584): white, navy "Jump to a topic" card */}
      <CoreHero
        crumbs={FAQS_HERO.crumbs}
        eyebrow={FAQS_HERO.eyebrow}
        eyebrowAbove
        title={FAQS_HERO.h1}
        className="mk-faqs-hero"
        aside={
          <nav
            className="mk-core-navy-card mk-faqs-topics"
            aria-label={FAQS_HERO.jumpLabel}
          >
            <p className="mk-core-card-label">{FAQS_HERO.jumpLabel}</p>
            <ul>
              {FAQS_TOPICS.map((tp) => (
                <li key={tp.id}>
                  <a href={'#' + tp.id}>
                    <span className="mk-faqs-topic-t">{tp.label}</span>
                    <span className="mk-faqs-topic-n">
                      {tp.items.length} questions
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        }
      >
        <p className="mk-core-lead">{FAQS_HERO.lead}</p>
        <p className="mk-p">
          <Inline x={FAQS_HERO.guide.x} sp={FAQS_HERO.guide.sp} />
        </p>
        <div className="mk-cta-row">
          <Pill href={FAQS_HERO.cta.href}>{FAQS_HERO.cta.label}</Pill>
        </div>
      </CoreHero>

      {FAQS_TOPICS.map((tp, i) => (
        <Section
          key={tp.id}
          id={tp.id}
          index={i + 1}
          label={tp.label}
          title={tp.h2}
          tone={i % 2 ? 'surface' : 'plain'}
          className="mk-faqs-topic"
        >
          <RichFaq items={tp.items} />
        </Section>
      ))}

      {/* Closing CTA (945:5656) */}
      <CoreCta
        id="ready-to-claim"
        title={FAQS_CLOSE.h2}
        cta={
          <Pill href={FAQS_CLOSE.cta.href} size="lg">
            {FAQS_CLOSE.cta.label}
          </Pill>
        }
      />
    </article>
  );
}
