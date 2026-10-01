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
import { CoreHero } from '../_core/CoreHero';
import '../_core/core.css';
import './legal-notice.css';

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
    <p className="mk-legal-review">
      <span className="mk-legal-review-label">{LEGAL_REVIEW_LABEL}</span>
      LEGAL REVIEW {item.n}: {item.text}
    </p>
  );
}

export default function LegalNoticeRoute() {
  const p = LEGAL_PROVIDER;
  return (
    <article className="mk-legal-notice mk-core">
      <JsonLd graph={legalGraph()} />

      {/* Hero (925:2064): white, breadcrumb, eyebrow, H1 */}
      <CoreHero
        crumbs={[{ label: 'Home', href: '/' }, { label: LEGAL_BREADCRUMB_NAME }]}
        eyebrow="Legal notice · Impressum & disclaimer"
        title={LEGAL_H1}
      />

      <Section
        id="provider-identification"
        index={1}
        label="Provider identification"
        title={p.h2}
        className="mk-legal-section"
      >
        <p className="mk-p">{p.lead}</p>
        <p className="mk-legal-org">{p.address[0]}</p>
        <ul className="mk-ul">
          {p.address.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <ul className="mk-ul">
          {p.contact.map((c) => (
            <li key={c.value}>
              {c.label}
              <a className="mk-link" href={c.href}>
                {c.value}
              </a>
            </li>
          ))}
        </ul>
        <ul className="mk-ul">
          {p.facts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
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
        className="mk-legal-section"
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
