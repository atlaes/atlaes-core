import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { REVIEWS, reviewDateLabel } from '@/content/reviews';
import { resolveTokens } from '@/content/tokens';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import '@/components/marketing/home/home.css';
import './testimonials.css';
import {
  AWARDS,
  PATH,
  TESTIMONIALS_BREADCRUMB_NAME,
  TESTIMONIALS_HERO,
  TESTIMONIALS_META,
  TESTIMONIALS_SCHEMA_DESCRIPTION,
  TESTIMONIALS_SEAL,
  TESTIMONIALS_TRUST,
  TESTIMONIALS_WHAT,
} from '@/content/pages/testimonials';

const description = resolveTokens(TESTIMONIALS_META.description);

export const metadata: Metadata = {
  title: TESTIMONIALS_META.title,
  description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: TESTIMONIALS_META.title,
    description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TESTIMONIALS_META.title,
    description,
  },
};

/** Appendix B: WebPage + BreadcrumbList only — no AggregateRating / Review. */
function testimonialsGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: TESTIMONIALS_META.title,
      description: resolveTokens(TESTIMONIALS_SCHEMA_DESCRIPTION),
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
      about: organizationStub(),
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: TESTIMONIALS_BREADCRUMB_NAME, path: PATH },
    ]),
  ]);
}

/** Award badges: only title/year pairs with a retained certificate. */
function AwardBadges() {
  return (
    <ul className="mk-badges" aria-label="ProvenExpert awards">
      {AWARDS.map((a) =>
        a.years.map((y) => (
          <li key={a.title + y} className="mk-badge">
            <span className="mk-badge-title">{a.title}</span>
            <span className="mk-badge-year">{y}</span>
          </li>
        ))
      )}
    </ul>
  );
}

export default function TestimonialsRoute() {
  return (
    <article className="mk-testimonials">
      <JsonLd graph={testimonialsGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{TESTIMONIALS_HERO.h1}</h1>
            <p className="mk-p">{TESTIMONIALS_HERO.intro}</p>
            <div className="mk-seal">
              <p className="mk-seal-score">
                <span aria-hidden="true">⭐ </span>
                {resolveTokens(TESTIMONIALS_SEAL.sentence)}
              </p>
              <a
                href={TESTIMONIALS_SEAL.href}
                className="mk-link"
                target="_blank"
                rel="noopener"
              >
                {TESTIMONIALS_SEAL.linkLabel}
              </a>
            </div>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="what-clients-tell-us"
        index={1}
        label="Reviews"
        title={TESTIMONIALS_WHAT.h2}
      >
        <Blocks blocks={TESTIMONIALS_WHAT.blocks} />
        <ul className="mk-review-grid">
          {REVIEWS.map((r) => (
            <li key={r.sourceUrl} className="mk-review">
              <div className="mk-review-head">
                <span aria-hidden="true">{r.flag}</span>
                <a
                  href={r.profileUrl}
                  className="mk-review-name"
                  target="_blank"
                  rel="noopener"
                >
                  {r.name}
                </a>
                <time className="mk-review-date" dateTime={r.date}>
                  {reviewDateLabel(r.date)}
                </time>
              </div>
              <p className="mk-review-title">{r.title}</p>
              <p className="mk-review-text">&ldquo;{r.text}&rdquo;</p>
              <p className="mk-review-src">
                <a
                  href={r.sourceUrl}
                  className="mk-link"
                  target="_blank"
                  rel="noopener"
                >
                  {r.sourceLabel}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="put-your-trust-in-germany-pension-refund-today"
        index={2}
        label="Get started"
        title={TESTIMONIALS_TRUST.h2}
        tone="tint"
      >
        <p className="mk-p">
          <Inline
            x={TESTIMONIALS_TRUST.text.x}
            sp={TESTIMONIALS_TRUST.text.sp}
          />
        </p>
        <div className="mk-cta-row">
          <Pill href={TESTIMONIALS_TRUST.cta.href} size="lg">
            {TESTIMONIALS_TRUST.cta.label}
          </Pill>
        </div>
        <AwardBadges />
      </Section>
    </article>
  );
}
