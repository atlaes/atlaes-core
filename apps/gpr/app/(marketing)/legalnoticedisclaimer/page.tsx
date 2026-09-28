import type { Metadata } from 'next';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Callout } from '@/components/marketing/ui/Callout';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Section } from '@/components/marketing/ui/Section';
import {
  LEGAL_BREADCRUMB_NAME,
  LEGAL_DISCLAIMER,
  LEGAL_H1,
  LEGAL_META,
  LEGAL_PROVIDER,
  LEGAL_REVIEW_LABEL,
  LEGAL_SCHEMA_DESCRIPTION,
  PATH,
  type LegalReviewItem,
} from '@/content/pages/legal-notice';

export const metadata: Metadata = {
  title: LEGAL_META.title,
  description: LEGAL_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: LEGAL_META.title,
    description: LEGAL_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: LEGAL_META.title,
    description: LEGAL_META.description,
  },
};

/** Appendix B: WebPage (imprint facts verbatim) + BreadcrumbList, welded to the Organization stub. */
function legalGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: LEGAL_META.title,
      description: LEGAL_SCHEMA_DESCRIPTION,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
      about: organizationStub(),
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: LEGAL_BREADCRUMB_NAME, path: PATH },
    ]),
  ]);
}

/** A `[LEGAL REVIEW n: …]` item, visible and labelled as pending review. */
function ReviewNote({ item }: { item: LegalReviewItem }) {
  return (
    <Callout tone="outline" as="p" title={LEGAL_REVIEW_LABEL}>
      <p className="mk-p">
        LEGAL REVIEW {item.n}: {item.text}
      </p>
    </Callout>
  );
}

export default function LegalNoticeRoute() {
  const p = LEGAL_PROVIDER;
  return (
    <article className="mk-legal-notice">
      <JsonLd graph={legalGraph()} />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{LEGAL_H1}</h1>
          </div>
        </div>
      </header>

      <Section
        id="provider-identification"
        index={1}
        label="Provider"
        title={p.h2}
      >
        <p className="mk-p">{p.lead}</p>
        <p className="mk-p">
          {p.address.map((line, i) => (
            <span key={line}>
              {i === 0 ? <strong>{line}</strong> : line}
              {i < p.address.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <p className="mk-p">
          {p.contact.map((c, i) => (
            <span key={c.value}>
              {c.label}
              <a className="mk-link" href={c.href}>
                {c.value}
              </a>
              {i < p.contact.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <p className="mk-p">
          {p.facts.map((line, i) => (
            <span key={line}>
              {line}
              {i < p.facts.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <Blocks blocks={p.blocks} />
        {p.review.map((item) => (
          <ReviewNote key={item.n} item={item} />
        ))}
        <p className="mk-p">
          <Inline x={p.privacy.x} sp={p.privacy.sp} />
        </p>
      </Section>

      <Section
        id="disclaimer"
        index={2}
        label="Disclaimer"
        title={LEGAL_DISCLAIMER.h2}
        tone="surface"
      >
        <p className="mk-note">{LEGAL_DISCLAIMER.draftNote}</p>
        {LEGAL_DISCLAIMER.parts.map((part) => (
          <div key={part.id} id={part.id}>
            <h3 className="mk-h3">{part.h3}</h3>
            <Blocks blocks={part.blocks} />
            {part.review ? <ReviewNote item={part.review} /> : null}
          </div>
        ))}
      </Section>
    </article>
  );
}
