import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { JumpMenu } from '@/components/marketing/ui/JumpMenu';
import { Section } from '@/components/marketing/ui/Section';
import {
  PATH,
  PRIVACY_FOOT,
  PRIVACY_META,
  PRIVACY_SECTIONS,
  PRIVACY_TITLE,
  type PrivacyBlock,
} from '@/content/pages/privacy-policy';
import { CoreHero } from '../_core/CoreHero';
import '../_core/core.css';
import './privacy-policy.css';

export const metadata: Metadata = {
  title: PRIVACY_META.title,
  description: PRIVACY_META.description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: PRIVACY_META.title,
    description: PRIVACY_META.description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: PRIVACY_META.title,
    description: PRIVACY_META.description,
  },
};

/** Optional wrapper only (WebPage + BreadcrumbList); nothing inside the licensed text. */
function privacyGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    {
      '@type': 'WebPage',
      '@id': url + '#webpage',
      url,
      name: PRIVACY_META.title,
      description: PRIVACY_META.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
      about: organizationStub(),
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'Privacy Policy', path: PATH },
    ]),
  ]);
}

const URL_RE = /https?:\/\/[^\s]+/g;

/** Render bare URLs in the licensed text as links (text stays verbatim). */
function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text))) {
    let href = m[0];
    // Trailing sentence punctuation belongs to the prose, not the URL.
    const trail = /[.,;:)]+$/.exec(href);
    if (trail) href = href.slice(0, -trail[0].length);
    const start = m.index;
    const end = start + href.length;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={start}
        href={href}
        className="mk-link"
        target="_blank"
        rel="noopener"
      >
        {href}
      </a>
    );
    last = end;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function PrivacyBlocks({ blocks }: { blocks: PrivacyBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h3':
            return (
              <h3 key={i} className="mk-h3">
                {b.x}
              </h3>
            );
          case 'ul':
            return (
              <ul key={i} className="mk-ul">
                {b.items.map((it) => (
                  <li key={it}>{linkify(it)}</li>
                ))}
              </ul>
            );
          default:
            return (
              <p key={i} className="mk-p">
                {linkify(b.x)}
              </p>
            );
        }
      })}
    </>
  );
}

export default function PrivacyPolicyRoute() {
  return (
    <article className="mk-privacy-policy mk-core">
      <JsonLd graph={privacyGraph()} />

      {/* Hero (926:2217): white, breadcrumb, eyebrow, H1 */}
      <CoreHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]}
        eyebrow="Privacy policy · GDPR"
        title={PRIVACY_TITLE}
      />

      <Section
        id="privacy-policy"
        index={1}
        label="Privacy policy"
        className="mk-privacy-section"
      >
        <JumpMenu
          items={PRIVACY_SECTIONS.map((s) => ({
            href: '#' + s.id,
            label: s.n + ') ' + s.h2,
          }))}
        />
        {PRIVACY_SECTIONS.map((s) => (
          <div key={s.id}>
            <h2 id={s.id} className="mk-h2">
              {s.n}) {s.h2}
            </h2>
            <PrivacyBlocks blocks={s.blocks} />
          </div>
        ))}
        {PRIVACY_FOOT.map((line) => (
          <p key={line} className="mk-note">
            {linkify(line)}
          </p>
        ))}
      </Section>
    </article>
  );
}
