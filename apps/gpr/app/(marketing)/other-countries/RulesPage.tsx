import { AttributionCapture } from '@/lib/attribution';
import {
  absoluteUrl,
  faqPageNode,
  graph,
  organizationStub,
} from '@/lib/jsonld';
import { resolveTokens, t } from '@/content/tokens';
import { EXTERNAL } from '@/content/registries/links';
import type { RulesPageData, RulesSection } from '@/content/pages/types';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Callout } from '@/components/marketing/ui/Callout';
import { FaqList } from '@/components/marketing/ui/FaqList';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { JumpMenu } from '@/components/marketing/ui/JumpMenu';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import '@/components/marketing/home/home.css';

/** Service + FAQPage, the country-page graph shape (README). */
function rulesPageGraph(page: RulesPageData) {
  const url = absoluteUrl(page.path);
  return graph([
    {
      '@type': 'Service',
      '@id': url + '#service',
      name: page.schema.serviceName,
      serviceType: 'German pension contribution refund service',
      url,
      description: resolveTokens(page.schema.description),
      areaServed: 'Worldwide',
      audience: { '@type': 'Audience', audienceType: page.schema.audienceType },
      provider: organizationStub(),
    },
    faqPageNode(url + '#faq', page.faq),
  ]);
}

/** Trust line with ProvenExpert linked (same as the country template). */
function TrustLine({ sentence }: { sentence: string }) {
  const idx = sentence.indexOf('ProvenExpert');
  return (
    <p className="mk-trust">
      <span aria-hidden="true">⭐ </span>
      {idx === -1 ? (
        sentence
      ) : (
        <>
          {sentence.slice(0, idx)}
          <a href={EXTERNAL.provenExpert} target="_blank" rel="noopener">
            ProvenExpert
          </a>
          {sentence.slice(idx + 'ProvenExpert'.length)}
        </>
      )}
    </p>
  );
}

export function Crumbs({
  items,
}: {
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mk-note">
      {items.map((c, i) => (
        <span key={c.href + c.label}>
          {i ? ' › ' : ''}
          {i === items.length - 1 ? (
            c.label
          ) : (
            <SmartLink href={c.href} className="mk-link" darkClassName="">
              {c.label}
            </SmartLink>
          )}
        </span>
      ))}
    </nav>
  );
}

type Item =
  | { kind: 'section'; section: RulesSection }
  | { kind: 'faq' }
  | { kind: 'reviews' };

/** Sections in data order; FAQ and reviews slot in where the data says. */
function order(page: RulesPageData): Item[] {
  const out: Item[] = [];
  let faqDone = false;
  const pushFaq = () => {
    if (faqDone) return;
    out.push({ kind: 'faq' });
    faqDone = true;
    if (page.reviews && page.reviews.after === 'faq')
      out.push({ kind: 'reviews' });
  };
  page.sections.forEach((s) => {
    out.push({ kind: 'section', section: s });
    if (page.faqAfter === s.id) pushFaq();
    if (page.reviews && page.reviews.after === s.id)
      out.push({ kind: 'reviews' });
  });
  pushFaq();
  return out;
}

export function RulesPage({ page }: { page: RulesPageData }) {
  const trust = t(page.trust.replace(/[{}]/g, '').trim());
  const items = order(page);
  return (
    <article className="mk-rules">
      <JsonLd graph={rulesPageGraph(page)} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <Crumbs items={page.crumbs} />
            <p className="mk-kicker">›› {page.eyebrow.toUpperCase()}</p>
            <h1 className="mk-h1">{page.h1}</h1>
            <Blocks blocks={page.hero} />
            <div className="mk-cta-row">
              <Pill href={page.cta.href} size="lg">
                {page.cta.label}
              </Pill>
            </div>
            <Callout tone="outline" as="p" title={page.glanceLabel}>
              <TrustLine sentence={trust} />
              <ul className="mk-bullets">
                {page.bullets.map((b, i) => (
                  <li key={i}>
                    <Inline x={b} />
                  </li>
                ))}
              </ul>
            </Callout>
            <JumpMenu items={page.jump} />
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      {items.map((it, i) => {
        const index = i + 1;
        if (it.kind === 'section') {
          const s = it.section;
          return (
            <Section
              key={s.id}
              id={s.id}
              index={index}
              label={s.label}
              title={s.h2}
              tone={s.tone || 'plain'}
            >
              <Blocks blocks={s.blocks} />
            </Section>
          );
        }
        if (it.kind === 'faq') {
          return (
            <Section
              key="faq"
              id="faq"
              index={index}
              label="FAQ"
              title={page.faqH2}
            >
              <FaqList items={page.faq} />
            </Section>
          );
        }
        const r = page.reviews!;
        return (
          <Section
            key="reviews"
            id="reviews"
            index={index}
            label={r.label}
            title={r.h2}
            tone="surface"
          >
            <Blocks blocks={[r.intro]} />
            <ul className="mk-review-grid">
              {r.items.map((q) => (
                <li key={q.name + q.title} className="mk-review">
                  <div className="mk-review-head">
                    <span className="mk-review-name">{q.name}</span>
                    {q.date ? (
                      <span className="mk-review-date">{q.date}</span>
                    ) : null}
                  </div>
                  <p className="mk-review-title">{q.title}</p>
                  <p className="mk-review-text">&ldquo;{q.text}&rdquo;</p>
                </li>
              ))}
            </ul>
          </Section>
        );
      })}

      <Section
        id="ready-to-claim"
        index={items.length + 1}
        label="Ready to claim"
        title={page.closeH2}
        tone="tint"
      >
        <Blocks blocks={page.close} />
        <div className="mk-cta-row">
          <Pill href={page.closeCta.href} size="lg">
            {page.closeCta.label}
          </Pill>
        </div>
        <p className="mk-note">{page.disclaimer}</p>
      </Section>
    </article>
  );
}
