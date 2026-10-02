import { countryPageGraph } from '@/lib/jsonld';
import { findCountry } from '@/content/registries/countries';
import { t } from '@/content/tokens';
import type {
  CountryPageData,
  CountrySection,
  CountrySectionKind,
  FaqItem,
  JumpAnchor,
} from '@/content/types';
import { Blocks } from '../ui/Blocks';
import { Callout } from '../ui/Callout';
import { FaqList } from '../ui/FaqList';
import { JsonLd } from '../ui/JsonLd';
import { Pill } from '../ui/Pill';
import { Section, type SectionTone } from '../ui/Section';
import { CountryHero, CountryJumpBar, CtaCard } from './CountryHero';
import './country.css';

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
  cost: 'Fees',
  timing: 'How long',
  faq: 'FAQ',
  reviews: 'Reviews',
  other: 'More',
};

export const COUNTRY_CTA = {
  primary: { label: 'Check My Eligibility', href: '/refund-calculator' },
  secondary: { label: 'Start My Claim', href: '/get-your-refund' },
} as const;

function CtaPills() {
  return (
    <>
      <Pill href={COUNTRY_CTA.primary.href} size="lg">
        {COUNTRY_CTA.primary.label}
      </Pill>
      <Pill href={COUNTRY_CTA.secondary.href} variant="secondary" size="lg">
        {COUNTRY_CTA.secondary.label}
      </Pill>
    </>
  );
}

/** Bands alternate white / #f1f1f1, starting white after the hero. */
function toneAt(index: number): SectionTone {
  return index % 2 === 1 ? 'plain' : 'surface';
}

function CountrySectionView({
  section,
  index,
  faq,
}: {
  section: CountrySection;
  index: number;
  faq: FaqItem[];
}) {
  const label = RAIL_LABELS[section.kind];
  const tone = toneAt(index);
  if (section.kind === 'faq') {
    // August pages: the FAQ H2 sits where the handoff put it.
    return (
      <Section
        id={section.id}
        index={index}
        label={label}
        title={section.h2}
        tone={tone}
      >
        <FaqList items={faq} />
      </Section>
    );
  }
  if (section.kind === 'intake') {
    // "What you need to start": outline callout (Figma 1058:10776).
    return (
      <Section
        id={section.id}
        index={index}
        label={label}
        title={section.h2}
        tone={tone}
      >
        <Callout tone="outline" as="p">
          <Blocks blocks={section.blocks} />
        </Callout>
      </Section>
    );
  }
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
  const hasDisclaimer = page.closeDisclaimer !== false;
  const closeBody = hasDisclaimer ? page.close.slice(0, -1) : page.close;
  const disclaimer = hasDisclaimer
    ? page.close[page.close.length - 1]
    : undefined;
  // August pages carry their own CTA component in the closing section.
  const closeHasCta = closeBody.some((b) => b.t === 'cta');
  const faqInPlace = page.sections.some((s) => s.kind === 'faq');
  const showTrailingFaq = !faqInPlace && page.faq.length > 0;
  const faqIndex = page.sections.length + 1;
  const lastIndex = showTrailingFaq ? faqIndex : page.sections.length;
  const country = findCountry(page.slug);
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Rules by country', href: '/other-countries' },
    { label: country ? country.name : page.h1, href: '/' + page.slug },
  ];

  return (
    <article className="mk-country">
      <JsonLd graph={countryPageGraph(page)} />

      <CountryHero
        crumbs={crumbs}
        eyebrow="Country guide"
        h1={page.h1}
        hero={page.hero}
        actions={<CtaPills />}
        glanceLabel="At a glance"
        trust={trust}
        bullets={page.bullets}
        jump={jump}
        jumpOutside={jump.length > 0}
      />
      {jump.length > 0 ? <CountryJumpBar items={jump} /> : null}

      {page.sections.map((s, i) => (
        <CountrySectionView
          key={s.id}
          section={s}
          index={i + 1}
          faq={page.faq}
        />
      ))}

      {showTrailingFaq ? (
        <Section
          id="faq"
          index={faqIndex}
          label="FAQ"
          title="Frequently asked questions"
          tone={toneAt(faqIndex)}
        >
          <FaqList items={page.faq} />
        </Section>
      ) : null}

      <CtaCard
        id="ready-to-claim"
        title={page.closeTitle || 'Ready to claim?'}
        afterSurface={lastIndex > 0 && toneAt(lastIndex) === 'surface'}
      >
        <Blocks blocks={closeBody} />
        {closeHasCta ? null : (
          <div className="mk-cta-row">
            <CtaPills />
          </div>
        )}
        {disclaimer && disclaimer.t === 'p' ? (
          <Blocks blocks={[{ t: 'note', x: disclaimer.x }]} />
        ) : null}
      </CtaCard>
    </article>
  );
}
