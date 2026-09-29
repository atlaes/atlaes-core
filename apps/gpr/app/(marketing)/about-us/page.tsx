import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  PERSON_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { REVIEWER } from '@/content/site';
import { SITE_URL } from '@/content/registries/links';
import { resolveTokens } from '@/content/tokens';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import {
  ABOUT_CLOSE,
  ABOUT_COMPANY,
  ABOUT_COMPLEX,
  ABOUT_EDUCATION,
  ABOUT_HOW_WE_WORK,
  ABOUT_INTRO,
  ABOUT_META,
  ABOUT_SCHEMA,
  ABOUT_TRACK_RECORD,
  ABOUT_WHAT_WE_DO,
  PATH,
} from '@/content/pages/about-us';

const description = resolveTokens(ABOUT_META.description);

export const metadata: Metadata = {
  title: ABOUT_META.title,
  description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: ABOUT_META.title,
    description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: ABOUT_META.title,
    description,
  },
};

/**
 * Appendix B: AboutPage + Person ×2 + BreadcrumbList; the Organization is
 * the stub (foundingDate stays on the homepage markup only, ID-03).
 */
function aboutGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    {
      '@type': 'AboutPage',
      '@id': url + '#webpage',
      url,
      name: ABOUT_META.title,
      description: ABOUT_SCHEMA.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
      mainEntity: organizationStub(),
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: REVIEWER.name,
      jobTitle: ABOUT_SCHEMA.johannes.jobTitle,
      worksFor: { '@id': ORGANIZATION_ID },
      sameAs: ABOUT_SCHEMA.johannes.sameAs,
    },
    {
      '@type': 'Person',
      '@id': SITE_URL + ABOUT_SCHEMA.anna.idSuffix,
      name: ABOUT_SCHEMA.anna.name,
      jobTitle: ABOUT_SCHEMA.anna.jobTitle,
      worksFor: { '@id': ORGANIZATION_ID },
      sameAs: ABOUT_SCHEMA.anna.sameAs,
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'About Us', path: PATH },
    ]),
  ]);
}

/** "Clients rate the service **over 4.9/5 on ProvenExpert …**" with the link inside the bold run. */
function RatingLine() {
  const r = ABOUT_TRACK_RECORD.rating;
  return (
    <p className="mk-p">
      {r.lead}
      <strong>
        {resolveTokens(r.boldBefore)}
        <SmartLink href={r.linkHref} className="mk-link">
          {r.linkText}
        </SmartLink>
        {resolveTokens(r.boldAfter)}
      </strong>
      {resolveTokens(r.tail)}
      <SmartLink
        href={r.tailLinkHref}
        className="mk-link"
        darkClassName="mk-dark"
      >
        {r.tailLinkText}
      </SmartLink>
      {r.end}
    </p>
  );
}

export default function AboutRoute() {
  const c = ABOUT_COMPANY;
  return (
    <article className="mk-about">
      <JsonLd graph={aboutGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{ABOUT_INTRO.h1}</h1>
            <Blocks blocks={ABOUT_INTRO.blocks} />
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="what-we-do"
        index={1}
        label="What we do"
        title={ABOUT_WHAT_WE_DO.h2}
      >
        <Blocks blocks={ABOUT_WHAT_WE_DO.blocks} />
      </Section>

      <Section
        id="why-this-topic-is-complex"
        index={2}
        label="Complexity"
        title={ABOUT_COMPLEX.h2}
        tone="surface"
      >
        <Blocks blocks={ABOUT_COMPLEX.blocks} />
      </Section>

      <Section
        id="our-track-record"
        index={3}
        label="Track record"
        title={ABOUT_TRACK_RECORD.h2}
      >
        <Blocks blocks={[ABOUT_TRACK_RECORD.recovered]} />
        <RatingLine />
      </Section>

      <Section
        id="company-information"
        index={4}
        label="Company"
        title={c.h2}
        tone="surface"
      >
        <p className="mk-p">{c.lead}</p>
        <p className="mk-p">
          {c.address.map((line, i) => (
            <span key={line}>
              {i === 0 ? <strong>{line}</strong> : line}
              {i < c.address.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <p className="mk-p">
          {c.register}
          <br />
          {c.directors}
        </p>
        <p className="mk-p">
          {c.contact.phoneLabel}
          <a
            className="mk-link"
            href={'tel:' + c.contact.phone.replace(/\s+/g, '')}
          >
            {c.contact.phone}
          </a>
          {' · '}
          {c.contact.emailLabel}
          <a className="mk-link" href={'mailto:' + c.contact.email}>
            {c.contact.email}
          </a>
        </p>
        <Blocks blocks={c.blocks} />
      </Section>

      <Section
        id="how-we-work"
        index={5}
        label="How we work"
        title={ABOUT_HOW_WE_WORK.h2}
      >
        <Blocks blocks={ABOUT_HOW_WE_WORK.blocks} />
      </Section>

      <Section
        id="educational-approach"
        index={6}
        label="Education"
        title={ABOUT_EDUCATION.h2}
        tone="surface"
      >
        <Blocks blocks={ABOUT_EDUCATION.blocks} />
      </Section>

      <Section
        id="explore-your-german-pension-refund-today"
        index={7}
        label="Get started"
        title={ABOUT_CLOSE.h2}
        tone="tint"
      >
        <Blocks blocks={ABOUT_CLOSE.blocks} />
        <div className="mk-cta-row">
          <Pill href={ABOUT_CLOSE.cta.href} size="lg">
            {ABOUT_CLOSE.cta.label}
          </Pill>
        </div>
      </Section>
    </article>
  );
}
