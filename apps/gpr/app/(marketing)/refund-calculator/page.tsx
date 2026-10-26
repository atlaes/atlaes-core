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
import { resolveTokens } from '@/content/tokens';
import type { Block, RichText } from '@/content/types';
import {
  STAT_MICROCOPY,
  STAT_TILES,
} from '@/components/marketing/home/home-content';
import { CalculatorEmbed } from './CalculatorEmbed';
import {
  CoreCta,
  CoreHero,
  CoreRail,
  CoreSplit,
  CoreStats,
} from '../_core/CoreHero';
import '../_core/core.css';
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

/** Ordered how-to steps → [bold lead, rest of the sentence]. */
function howToSteps(blocks: Block[]): Array<[string, string]> {
  const ol = blocks.find((b) => b.t === 'ol');
  const items: RichText[] = ol && ol.t === 'ol' ? ol.items : [];
  return items.map((it) => {
    const b = it.sp ? it.sp.find((sp) => sp.k === 'b') : undefined;
    const lead = b ? b.x : '';
    const rest =
      lead && it.x.indexOf(lead) === 0 ? it.x.slice(lead.length) : it.x;
    return [lead, rest.trim()];
  });
}

export default function RefundCalculatorRoute() {
  const steps = howToSteps(CALC_HOW_TO.blocks);
  const howAfter = CALC_HOW_TO.blocks.filter((b) => b.t !== 'ol');
  return (
    <article className="mk-refund-calculator mk-core">
      <JsonLd graph={calculatorGraph()} />
      <AttributionCapture />

      {/* Hero (257:427): white split, navy steps card, stat strip */}
      <CoreHero
        size={60}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Refund Calculator' }]}
        eyebrow="Free tool · Refund calculator"
        title={CALC_HERO.h1}
        aside={
          <ol className="mk-core-navy-card mk-calc-answers" aria-hidden="true">
            {steps.map(([lead], i) => (
              <li key={lead}>
                <span className="mk-calc-answer-n">{i + 1}</span>
                <span className="mk-calc-answer-t">{lead}</span>
              </li>
            ))}
          </ol>
        }
        after={
          <div className="mk-calc-stats">
            <CoreStats
              tiles={STAT_TILES.map((tile) => ({
                figure: resolveTokens(tile.figure),
                caption: <Inline x={tile.caption.x} sp={tile.caption.sp} />,
              }))}
            />
            <p className="mk-calc-stats-note">
              <Inline x={STAT_MICROCOPY.x} sp={STAT_MICROCOPY.sp} />
            </p>
          </div>
        }
      >
        <p className="mk-core-lead">{CALC_HERO.intro}</p>
      </CoreHero>

      {/* Calculator (725:11301): the existing widget, container only */}
      <section id="calculator" className="mk-hs mk-tone-plain mk-calc-widget">
        <div className="mk-container">
          <div className="mk-calc-embed">
            <CalculatorEmbed />
          </div>
          <p className="mk-note mk-calc-privacy">{CALC_HERO.privacy}</p>
        </div>
      </section>

      {/* How to use (725:11248): horizontal numbered timeline */}
      <section
        id="how-to-use-the-calculator"
        className="mk-hs mk-tone-surface mk-calc-how"
      >
        <div className="mk-container mk-hs-stack">
          <div className="mk-hs-stack mk-calc-how-head">
            <CoreRail index={2} label="How to use" />
            <h2 className="mk-h2 mk-h2-flush">{CALC_HOW_TO.h2}</h2>
          </div>
          <ol className="mk-calc-steps">
            {steps.map(([lead, rest], i) => (
              <li key={lead}>
                <span className="mk-calc-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mk-calc-step-h">{lead}</h3>
                <p className="mk-p">{rest}</p>
              </li>
            ))}
          </ol>
          <div className="mk-calc-how-foot">
            <Blocks blocks={howAfter} />
          </div>
        </div>
      </section>

      {/* Rules (744:11370): dark, numbered stacked cards */}
      <section
        id="the-rules-behind-the-verdict"
        className="mk-hs mk-tone-dark mk-calc-rules"
      >
        <div className="mk-container mk-hs-stack">
          <div className="mk-hs-stack mk-calc-how-head">
            <CoreRail index={3} label="Rules" />
            <h2 className="mk-h2 mk-h2-flush">{CALC_RULES.h2}</h2>
          </div>
          <ol className="mk-calc-rule-list">
            {CALC_RULES.sections.map((r, i) => (
              <li key={r.id} id={r.id} className="mk-calc-rule">
                <div className="mk-calc-rule-head">
                  <span className="mk-calc-rule-n" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <h3 className="mk-calc-rule-h">{r.h3}</h3>
                </div>
                <div className="mk-calc-rule-body">
                  <Blocks blocks={r.blocks} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Section
        id="what-refunds-actually-look-like"
        index={4}
        label="What refunds look like"
        title={CALC_REFUNDS.h2}
        className="mk-calc-refunds"
      >
        <Blocks blocks={CALC_REFUNDS.blocks} />
      </Section>

      <CoreSplit
        id="faq"
        index={5}
        label="FAQ"
        title={CALC_FAQ_H2}
        tone="surface"
      >
        <FaqList items={CALC_FAQ} />
      </CoreSplit>

      {/* Closing CTA (750:11440) */}
      <CoreCta
        id="claim-your-german-pension-refund-today"
        title={CALC_CLOSE.h2}
        cta={
          <Pill href={CALC_CLOSE.cta.href} size="lg">
            {CALC_CLOSE.cta.label}
          </Pill>
        }
      >
        <p className="mk-p">
          <Inline x={CALC_CLOSE.text.x} sp={CALC_CLOSE.text.sp} />
        </p>
      </CoreCta>
    </article>
  );
}
