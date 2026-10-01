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
import { resolveTokens, t } from '@/content/tokens';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import '@/components/marketing/home/home.css';
import { CoreCta, CoreHero, CoreRail } from '../_core/CoreHero';
import '../_core/core.css';
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

/** "Top Service Provider · Top Recommendation 2024 and 2025" from AWARDS. */
function awardsLine(): string {
  const titles = AWARDS.map((a) => a.title);
  const years: string[] = [];
  AWARDS.forEach((a) =>
    a.years.forEach((y) => {
      if (years.indexOf(y) === -1) years.push(y);
    })
  );
  return titles.join(' · ') + ' ' + years.join(' and ');
}

/** Rating card (765:9463): score, stars, exact sentence, awards, link. */
function RatingCard() {
  const score = t('M-15.ratingExact').split('/')[0];
  return (
    <div className="mk-core-card mk-testi-card">
      <span className="mk-testi-quote" aria-hidden="true">
        ››
      </span>
      <div className="mk-testi-score">
        <span className="mk-testi-figure" aria-hidden="true">
          {score}
        </span>
        <span className="mk-testi-stars" aria-hidden="true">
          ★★★★★
        </span>
      </div>
      <p className="mk-testi-sentence">
        {resolveTokens(TESTIMONIALS_SEAL.sentence)}
      </p>
      <p className="mk-testi-awards">{awardsLine()}</p>
      <a
        href={TESTIMONIALS_SEAL.href}
        className="mk-link mk-testi-link"
        target="_blank"
        rel="noopener"
      >
        {TESTIMONIALS_SEAL.linkLabel}
      </a>
    </div>
  );
}

export default function TestimonialsRoute() {
  return (
    <article className="mk-testimonials mk-core">
      <JsonLd graph={testimonialsGraph()} />
      <AttributionCapture />

      {/* Hero (765:9458): navy, white rating card */}
      <CoreHero
        tone="navy"
        size={72}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: TESTIMONIALS_BREADCRUMB_NAME },
        ]}
        eyebrow="Reviews · What clients say"
        title={TESTIMONIALS_HERO.h1}
        className="mk-testi-hero"
        aside={<RatingCard />}
      >
        <p className="mk-core-lead">{TESTIMONIALS_HERO.intro}</p>
      </CoreHero>

      {/* What clients tell us (765:9467) */}
      <section id="what-clients-tell-us" className="mk-hs mk-tone-plain">
        <div className="mk-container mk-hs-stack mk-testi-what">
          <CoreRail index={1} label="What clients tell us" />
          <div>
            <h2 className="mk-h2">{TESTIMONIALS_WHAT.h2}</h2>
            <Blocks blocks={TESTIMONIALS_WHAT.blocks} />
          </div>
          <ul className="mk-review-grid">
            {REVIEWS.map((r) => (
              <li key={r.sourceUrl} className="mk-review">
                <div className="mk-review-head">
                  <a
                    href={r.profileUrl}
                    className="mk-review-name"
                    target="_blank"
                    rel="noopener"
                  >
                    <span aria-hidden="true">{r.flag} </span>
                    {r.name}
                  </a>
                  <time className="mk-review-date" dateTime={r.date}>
                    {reviewDateLabel(r.date)}
                  </time>
                </div>
                <span className="mk-review-rating" aria-hidden="true">
                  ★★★★★
                </span>
                <p className="mk-review-title">{r.title}</p>
                <p className="mk-review-text">&ldquo;{r.text}&rdquo;</p>
                <p className="mk-review-src">
                  <a
                    href={r.sourceUrl}
                    className="mk-review-src-link"
                    target="_blank"
                    rel="noopener"
                  >
                    {r.sourceLabel}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA (765:9650) */}
      <CoreCta
        id="put-your-trust-in-germany-pension-refund-today"
        title={TESTIMONIALS_TRUST.h2}
        cta={
          <Pill href={TESTIMONIALS_TRUST.cta.href} size="lg">
            {TESTIMONIALS_TRUST.cta.label}
          </Pill>
        }
      >
        <p className="mk-p">
          <Inline
            x={TESTIMONIALS_TRUST.text.x}
            sp={TESTIMONIALS_TRUST.text.sp}
          />
        </p>
      </CoreCta>
    </article>
  );
}
