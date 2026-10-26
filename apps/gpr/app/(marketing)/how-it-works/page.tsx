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
import { RichFaq } from '@/components/marketing/home/RichFaq';
import type { Block } from '@/content/types';
import { StepProgress } from '@/components/marketing/motion/StepProgress';
import '@/components/marketing/home/home.css';
import {
  CoreCta,
  CoreDeco,
  CoreHero,
  CoreRail,
  CoreSplit,
} from '../_core/CoreHero';
import '../_core/core.css';
import './how-it-works.css';
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

/** First paragraph's text, split into the figure ("9.75%") and the rest. */
function feeFigure(b: Block | undefined): [string, string] {
  const x = b && b.t === 'p' ? b.x : '';
  const i = x.indexOf(' ');
  return i > 0 ? [x.slice(0, i), x.slice(i + 1)] : [x, ''];
}

export default function HowItWorksRoute() {
  const steps = HIW_SECTIONS.slice(0, 4);
  const fee = HIW_SECTIONS.find((s) => s.id === 'no-refund-no-service-fee');
  const rest = HIW_SECTIONS.slice(4).filter((s) => s !== fee);
  const [figure, figureText] = feeFigure(fee ? fee.blocks[0] : undefined);
  let index = 1;
  return (
    <article className="mk-how-it-works mk-core">
      <JsonLd graph={howItWorksGraph()} />
      <AttributionCapture />

      {/* Hero (854:3438): tint, split with the four-step preview card */}
      <CoreHero
        tone="tint"
        crumbs={[{ label: 'Home', href: '/' }, { label: 'How It Works' }]}
        eyebrow="How it works"
        title={HIW_HERO.h1}
        aside={
          <div className="mk-core-card mk-hiw-preview" aria-hidden="true">
            <p className="mk-core-card-label">The four steps</p>
            <ol className="mk-hiw-preview-list">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <span className="mk-core-num">0{i + 1}</span>
                  <span className="mk-hiw-preview-t">{s.h2}</span>
                </li>
              ))}
            </ol>
          </div>
        }
      >
        <p className="mk-core-lead">{HIW_HERO.intro}</p>
        <ul className="mk-core-chips">
          {HIW_HERO.kicker.split(' · ').map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
        <div className="mk-cta-row">
          <Pill href={HIW_HERO.cta.href}>{HIW_HERO.cta.label}</Pill>
        </div>
        <p className="mk-core-micro">{HIW_HERO.ctaMicro}</p>
      </CoreHero>

      {/* Steps (854:3458): rail column + numbered timeline */}
      <section className="mk-hs mk-tone-plain mk-hiw-steps">
        <div className="mk-container mk-hiw-steps-grid" data-reveal="off">
          <CoreRail index={index++} label="How it works" />
          <ol className="mk-hiw-timeline">
            {steps.map((s, i) => (
              <li key={s.id} className="mk-hiw-step">
                <span className="mk-hiw-node" aria-hidden="true">
                  0{i + 1}
                </span>
                <div className="mk-hiw-step-body" data-reveal="">
                  <h2 id={s.id} className="mk-h2">
                    {s.h2}
                  </h2>
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
                </div>
              </li>
            ))}
          </ol>
          <StepProgress />
        </div>
      </section>

      {/* Fee (854:3508): #f1f1f1, blue 9.75 % card + copy */}
      {fee ? (
        <section id={fee.id} className="mk-hs mk-tone-surface">
          <div className="mk-container mk-hs-stack mk-hiw-fee">
            <div className="mk-hs-stack mk-hiw-fee-head">
              <CoreRail index={index++} label={fee.label} />
              <h2 className="mk-h2 mk-h2-flush">{fee.h2}</h2>
            </div>
            <div className="mk-split mk-split-half">
              <div className="mk-hiw-fee-card">
                <p className="mk-hiw-fee-figure">{figure}</p>
                <p className="mk-hiw-fee-text">{figureText}</p>
              </div>
              <div className="mk-hiw-fee-copy">
                <Blocks blocks={fee.blocks.slice(1)} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Takeover (854:3527): dark band, rail + body, deco */}
      {rest.map((s) => (
        <section
          key={s.id}
          id={s.id}
          className="mk-section mk-tone-dark mk-core-has-deco mk-hiw-takeover"
        >
          <CoreDeco className="mk-hiw-takeover-deco" />
          <div className="mk-section-inner">
            <CoreRail index={index++} label={s.label} />
            <div className="mk-body">
              <h2 className="mk-h2">{s.h2}</h2>
              <Blocks blocks={s.blocks} />
            </div>
          </div>
        </section>
      ))}

      {/* FAQ — split screen (854:3537) */}
      <CoreSplit id="faq" index={index++} label="FAQ" title={HIW_FAQ_H2}>
        <RichFaq items={HIW_FAQ} />
      </CoreSplit>

      {/* Closing CTA (854:3555) */}
      <CoreCta
        id="find-out-what-you-could-get-back"
        title={HIW_CLOSE.h2}
        cta={
          <Pill href={HIW_CLOSE.cta.href} size="lg">
            {HIW_CLOSE.cta.label}
          </Pill>
        }
        note={DISCLAIMER_ID02}
      >
        <p className="mk-p">{HIW_CLOSE.text}</p>
      </CoreCta>
    </article>
  );
}
