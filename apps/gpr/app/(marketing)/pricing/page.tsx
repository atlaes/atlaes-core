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
import { RichFaq } from '@/components/marketing/home/RichFaq';
import type { Block, RichText } from '@/content/types';
import '@/components/marketing/home/home.css';
import {
  CoreHero,
  CoreRail,
  CoreSplit,
} from '../_core/CoreHero';
import '../_core/core.css';
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

type Card = (typeof PRICING_PLANS.cards)[number];

function listItems(blocks: Block[]): RichText[] {
  const ul = blocks.find((b) => b.t === 'ul');
  return ul && ul.t === 'ul' ? ul.items : [];
}

/** Bold lead of a list item ("9.75% of your refund"). */
function boldOf(it: RichText | undefined): string {
  const b = it && it.sp ? it.sp.find((sp) => sp.k === 'b') : undefined;
  return b ? b.x : '';
}

/** "€50 add-on, including VAT" → ["€50", "add-on, including VAT"]. */
function splitFigure(x: string): [string, string] {
  const i = x.indexOf(' ');
  return i > 0 && /[0-9€%]/.test(x.slice(0, i))
    ? [x.slice(0, i), x.slice(i + 1)]
    : [x, ''];
}

/** Price line of a plan card: the featured card shows its fee figure. */
function cardFigure(c: Card): [string, string] {
  if (c.featured) {
    const lead = boldOf(listItems(c.blocks)[0]).replace(/^[^:]*:\s*/, '');
    if (lead) return splitFigure(lead);
  }
  return splitFigure(c.badge);
}

export default function PricingRoute() {
  const core = PRICING_PLANS.cards.find((c) => c.featured);
  const coreItems = core ? listItems(core.blocks) : [];
  const [fee, feeOf] = core ? cardFigure(core) : ['', ''];
  const lead = PRICING_FEE_BUYS.blocks.slice(0, 1);
  const cols = PRICING_FEE_BUYS.blocks.slice(1);
  const half = Math.ceil(cols.length / 2);
  return (
    <article className="mk-pricing mk-core">
      <JsonLd graph={pricingGraph()} />
      <AttributionCapture />

      {/* Hero (256:337): navy, white fee card */}
      <CoreHero
        tone="navy"
        size={60}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Pricing' }]}
        eyebrow="Pricing"
        title={PRICING_HERO.h1}
        aside={
          core ? (
            <div className="mk-core-card mk-price-hero-card" aria-hidden="true">
              <p className="mk-core-card-label">{core.badge}</p>
              <p className="mk-price-hero-fee">
                <span className="mk-price-hero-figure">{fee}</span>
                <span className="mk-price-hero-of">{feeOf}</span>
              </p>
              <p className="mk-price-hero-cap">{boldOf(coreItems[1])}</p>
              <ul className="mk-price-hero-checks">
                {coreItems.slice(2, 5).map((it) => (
                  <li key={it.x}>{it.x}</li>
                ))}
              </ul>
            </div>
          ) : undefined
        }
      >
        <p className="mk-core-lead">{PRICING_HERO.tagline}</p>
        <p className="mk-core-lead">{PRICING_HERO.intro}</p>
        <div className="mk-cta-row">
          <Pill href={PRICING_HERO.cta.href} variant="inverse">
            {PRICING_HERO.cta.label}
          </Pill>
        </div>
      </CoreHero>

      {/* Plans (708:10191): three cards, core card navy + chip */}
      <section id="our-pricing-plans" className="mk-hs mk-tone-surface">
        <div className="mk-container mk-hs-stack mk-price-plans">
          <div className="mk-hs-stack mk-price-plans-head">
            <CoreRail index={1} label="Pricing plans" />
            <div>
              <h2 className="mk-h2">{PRICING_PLANS.h2}</h2>
              <p className="mk-p">{PRICING_PLANS.intro}</p>
            </div>
          </div>
          <ul className="mk-price-grid">
            {PRICING_PLANS.cards.map((c) => {
              const [fig, figOf] = cardFigure(c);
              return (
                <li
                  key={c.id}
                  id={c.id}
                  className={
                    'mk-price-card' +
                    (c.featured ? ' mk-price-card-featured mk-tone-navy' : '')
                  }
                >
                  {c.featured ? (
                    <p className="mk-price-chip">{c.badge}</p>
                  ) : null}
                  <div className="mk-price-head">
                    <h3 className="mk-price-title">{c.title}</h3>
                    <p className="mk-price-figure">
                      {fig}
                      {figOf ? (
                        <span className="mk-price-figure-of"> {figOf}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="mk-price-body">
                    <Blocks blocks={c.blocks} />
                  </div>
                  <Pill
                    href={c.button.href}
                    size="sm"
                    variant={c.featured ? 'inverse' : 'primary'}
                    className="mk-price-cta"
                  >
                    {c.button.label}
                  </Pill>
                </li>
              );
            })}
          </ul>
          <p className="mk-price-after">{PRICING_PLANS.after}</p>
        </div>
      </section>

      {/* FAQ — split screen (708:10285) */}
      <CoreSplit
        id="faq"
        index={2}
        label="FAQ"
        title={PRICING_FAQ_H2}
        deco
        side={
          <p className="mk-p">
            <Inline x={PRICING_FAQ_FOOTER.x} sp={PRICING_FAQ_FOOTER.sp} />
          </p>
        }
      >
        <RichFaq items={PRICING_FAQ} />
      </CoreSplit>

      {/* What the fee buys (721:10417): dark, lead + two columns */}
      <section
        id="what-the-fee-actually-buys"
        className="mk-hs mk-tone-dark mk-price-buys"
      >
        <div className="mk-container mk-hs-stack">
          <CoreRail index={3} label="What the fee buys" />
          <div>
            <h2 className="mk-h2">{PRICING_FEE_BUYS.h2}</h2>
            <div className="mk-price-buys-lead">
              <Blocks blocks={lead} />
            </div>
            <div className="mk-two">
              <div>
                <Blocks blocks={cols.slice(0, half)} />
              </div>
              <div>
                <Blocks blocks={cols.slice(half)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* We are here for you (750:11478): centred */}
      <section id="we-are-here-for-you" className="mk-hs mk-tone-plain">
        <div className="mk-container mk-price-here">
          <h2 className="mk-h2">{PRICING_HERE_FOR_YOU.h2}</h2>
          <Blocks blocks={PRICING_HERE_FOR_YOU.blocks} />
        </div>
      </section>
    </article>
  );
}
