import { AttributionCapture } from '@/lib/attribution';
import {
  absoluteUrl,
  faqPageNode,
  graph,
  organizationStub,
} from '@/lib/jsonld';
import { resolveTokens, t } from '@/content/tokens';
import type { RulesPageData, RulesSection } from '@/content/pages/types';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { FaqList } from '@/components/marketing/ui/FaqList';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section, type SectionTone } from '@/components/marketing/ui/Section';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import {
  CountryHero,
  CtaCard,
} from '@/components/marketing/country/CountryHero';
import '@/components/marketing/home/home.css';
import '@/components/marketing/country/country.css';

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

/**
 * Bands alternate #f1f1f1 / white, starting #f1f1f1 after the hero
 * (Figma 917:5629, 926:12479). Reviews always sit on #f1f1f1 and do not
 * advance the alternation.
 */
function tones(items: Item[]): SectionTone[] {
  let n = 0;
  return items.map((it) => {
    if (it.kind === 'reviews') return 'surface';
    n += 1;
    return n % 2 === 1 ? 'surface' : 'plain';
  });
}

export function RulesPage({ page }: { page: RulesPageData }) {
  const trust = t(page.trust.replace(/[{}]/g, '').trim());
  const items = order(page);
  const tone = tones(items);
  return (
    <article className="mk-rules">
      <JsonLd graph={rulesPageGraph(page)} />
      <AttributionCapture />

      <CountryHero
        crumbs={page.crumbs}
        eyebrow={page.eyebrow}
        h1={page.h1}
        hero={page.hero}
        actions={
          <Pill href={page.cta.href} size="lg">
            {page.cta.label}
          </Pill>
        }
        glanceLabel={page.glanceLabel}
        trust={trust}
        bullets={page.bullets}
        jump={page.jump}
      />

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
              tone={tone[i]}
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
              tone={tone[i]}
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

      <CtaCard
        id="ready-to-claim"
        title={page.closeH2}
        afterSurface={tone.length > 0 && tone[tone.length - 1] === 'surface'}
      >
        <Blocks blocks={page.close} />
        <div className="mk-cta-row">
          <Pill href={page.closeCta.href} size="lg">
            {page.closeCta.label}
          </Pill>
        </div>
        <p className="mk-note">{page.disclaimer}</p>
      </CtaCard>
    </article>
  );
}
