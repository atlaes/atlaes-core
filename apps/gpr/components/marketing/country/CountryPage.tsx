import { countryPageGraph } from '@/lib/jsonld';
import { EXTERNAL } from '@/content/registries/links';
import { t } from '@/content/tokens';
import type {
  CountryPageData,
  CountrySection,
  CountrySectionKind,
  JumpAnchor,
} from '@/content/types';
import { Blocks } from '../ui/Blocks';
import { Callout } from '../ui/Callout';
import { FaqList } from '../ui/FaqList';
import { JsonLd } from '../ui/JsonLd';
import { JumpMenu } from '../ui/JumpMenu';
import { Pill } from '../ui/Pill';
import { Section } from '../ui/Section';

/** Jump-menu labels (README build rule 2), in menu order. */
const JUMP_LABELS: Array<[JumpAnchor, string]> = [
  ['do-i-qualify', 'Do I qualify'],
  ['what-we-do', 'What we do'],
  ['journeys', 'Journeys'],
  ['getting-paid', 'Getting paid'],
  ['certified-signatures', 'Certified signatures'],
  ['faq', 'FAQ'],
];

/** Rail labels per section kind (design element, not copy). */
const RAIL_LABELS: Record<CountrySectionKind, string> = {
  qualify: 'Do I qualify',
  'citizenship-table': 'Your row',
  residence: 'Residence',
  service: 'What we do',
  intake: 'Getting started',
  'sixty-month': '60-month rule',
  'waiting-period': '24-month wait',
  'local-scheme': 'Local scheme',
  journeys: 'Journeys',
  years: 'Your years',
  amount: 'Amount & tax',
  office: 'Pension office',
  payout: 'Getting paid',
  certification: 'Signatures',
  'dual-citizenship': 'Dual citizenship',
  family: 'Family',
  other: 'More',
};

export const COUNTRY_CTA = {
  primary: { label: 'Check My Eligibility', href: '/refund-calculator' },
  secondary: { label: 'Start My Claim', href: '/get-your-refund' },
} as const;

/** Trust bar: M-15/M-16 sentence with ProvenExpert linked. */
function TrustBar({ sentence }: { sentence: string }) {
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

function CtaRow() {
  return (
    <div className="mk-cta-row">
      <Pill href={COUNTRY_CTA.primary.href} size="lg">
        {COUNTRY_CTA.primary.label}
      </Pill>
      <Pill href={COUNTRY_CTA.secondary.href} variant="secondary" size="lg">
        {COUNTRY_CTA.secondary.label}
      </Pill>
    </div>
  );
}

function CountrySectionView({
  section,
  index,
}: {
  section: CountrySection;
  index: number;
}) {
  const label = RAIL_LABELS[section.kind];
  if (section.kind === 'intake') {
    // "What you need to start" renders as a callout (new-platform intake copy).
    return (
      <Section id={section.id} index={index} label={label} title={section.h2}>
        <Callout tone="tint" as="p">
          <Blocks blocks={section.blocks} />
        </Callout>
      </Section>
    );
  }
  const tone = section.kind === 'service' ? 'surface' : 'plain';
  return (
    <Section
      id={section.id}
      index={index}
      label={label}
      title={section.h2}
      tone={tone}
    >
      <Blocks blocks={section.blocks} />
    </Section>
  );
}

/**
 * Country page template. Sections render in data order, so the three
 * archetypes fall out of the data; the jump menu uses the page's anchor
 * map; the FAQ is visible HTML; JSON-LD comes from `countryPageGraph`.
 */
export function CountryPage({ page }: { page: CountryPageData }) {
  const jump = JUMP_LABELS.filter(([a]) => page.anchors[a]).map(
    ([a, label]) => ({
      href: '#' + page.anchors[a],
      label,
    })
  );
  const trust =
    page.trust.indexOf('{{') === 0
      ? t(page.trust.replace(/[{}]/g, '').trim())
      : page.trust;
  const closeBody = page.close.slice(0, -1);
  const disclaimer = page.close[page.close.length - 1];
  const faqIndex = page.sections.length + 1;

  return (
    <article className="mk-country">
      <JsonLd graph={countryPageGraph(page)} />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{page.h1}</h1>
            <Blocks blocks={page.hero} />
            <TrustBar sentence={trust} />
            <ul className="mk-bullets">
              {page.bullets.map((b, i) => (
                <li key={i}>
                  <Blocks blocks={[{ t: 'p', x: b, sp: [] }]} />
                </li>
              ))}
            </ul>
            <CtaRow />
            <JumpMenu items={jump} />
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      {page.sections.map((s, i) => (
        <CountrySectionView key={s.id} section={s} index={i + 1} />
      ))}

      <Section
        id="faq"
        index={faqIndex}
        label="FAQ"
        title="Frequently asked questions"
      >
        <FaqList items={page.faq} />
      </Section>

      <Section
        id="ready-to-claim"
        index={faqIndex + 1}
        label="Ready to claim"
        title="Ready to claim?"
        tone="tint"
      >
        <Blocks blocks={closeBody} />
        <CtaRow />
        {disclaimer && disclaimer.t === 'p' ? (
          <Blocks blocks={[{ t: 'note', x: disclaimer.x }]} />
        ) : null}
      </Section>
    </article>
  );
}
