import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { articleGraph, type JsonLdGraph } from '@/lib/jsonld';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Callout } from '@/components/marketing/ui/Callout';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { JumpMenu } from '@/components/marketing/ui/JumpMenu';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { RichFaq } from '@/components/marketing/home/RichFaq';
import { CaptureBox } from '@/components/marketing/widgets/CaptureBox';
import { WaitingPeriodCalculator } from '@/components/marketing/widgets/WaitingPeriodCalculator';
import {
  HUB_CLOSE,
  HUB_CTA,
  HUB_DATES,
  HUB_DISCLAIMER,
  HUB_FAQ,
  HUB_FAQ_H2,
  HUB_FAQ_SCHEMA,
  HUB_FOOTER,
  HUB_H1,
  HUB_HEADLINE,
  HUB_HERO,
  HUB_IMAGE,
  HUB_JUMP,
  HUB_JUMP_LABEL,
  HUB_META,
  HUB_SECTIONS,
  HUB_TRUST,
  PATH,
} from './content';

export const metadata: Metadata = {
  title: HUB_META.title,
  description: HUB_META.description,
  alternates: pageAlternates({ path: PATH, hasDe: true }),
  openGraph: {
    title: HUB_META.title,
    description: HUB_META.description,
    url: PATH,
    type: 'article',
    locale: 'de',
    images: [HUB_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: HUB_META.title,
    description: HUB_META.description,
  },
};

/**
 * Appendix B.1 of the handoff: Person + Article + BreadcrumbList (entry 1)
 * and FAQPage with the seven schema questions (entry 2), both `inLanguage`
 * de, in one graph via the shared builders.
 */
function hubGraph(): JsonLdGraph {
  const g = articleGraph({
    path: PATH,
    headline: HUB_HEADLINE,
    description: HUB_META.description,
    datePublished: HUB_DATES.published,
    dateModified: HUB_DATES.modified,
    inLanguage: 'de',
    breadcrumbs: [
      { name: 'Startseite', path: '/' },
      { name: HUB_HEADLINE, path: PATH },
    ],
    faq: HUB_FAQ_SCHEMA,
    imageUrl: HUB_IMAGE,
  });
  g['@graph'].forEach((node) => {
    if (node['@type'] === 'FAQPage') node.inLanguage = 'de';
  });
  return g;
}

export default function RentenbeitragserstattungPage() {
  const faqIndex = HUB_SECTIONS.length + 1;
  return (
    <article className="mk-hub" lang="de">
      <JsonLd graph={hubGraph()} />
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{HUB_H1}</h1>
            <Blocks blocks={HUB_HERO} />
            <Callout tone="surface" as="p">
              <p className="mk-p">{HUB_DISCLAIMER}</p>
            </Callout>
            <p className="mk-note">{HUB_JUMP_LABEL}:</p>
            <JumpMenu items={HUB_JUMP} ariaLabel={HUB_JUMP_LABEL} />
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      {HUB_SECTIONS.map((s, i) => (
        <Section
          key={s.id}
          id={s.id}
          index={i + 1}
          label={s.label}
          title={s.h2}
          tone={i % 2 ? 'surface' : 'plain'}
        >
          <Blocks blocks={s.blocks} />
          {s.id === 'wartefrist' ? (
            <>
              <WaitingPeriodCalculator
                lang="de"
                via="wartefrist-rechner"
                as="h3"
              />
              <CaptureBox
                type="wegzug-guide"
                placement="rentenbeitragserstattung"
                as="h3"
              />
            </>
          ) : null}
          {s.id === 'service' ? (
            <>
              <p className="mk-p">
                <Inline x={HUB_TRUST.x} sp={HUB_TRUST.sp} />
              </p>
              <div className="mk-cta-row">
                <Pill href={HUB_CTA.check.href} size="lg" variant="secondary">
                  {HUB_CTA.check.label}
                </Pill>
                <Pill href={HUB_CTA.start.href} size="lg">
                  {HUB_CTA.start.label}
                </Pill>
              </div>
            </>
          ) : null}
        </Section>
      ))}

      <Section
        id="faq"
        index={faqIndex}
        label="FAQ"
        title={HUB_FAQ_H2}
        tone="surface"
      >
        <RichFaq items={HUB_FAQ.map((f) => ({ q: f.q, blocks: f.blocks }))} />
      </Section>

      <Section id="start" index={faqIndex + 1} label="Start" tone="tint">
        <p className="mk-p">{HUB_CLOSE.text}</p>
        <div className="mk-cta-row">
          <Pill href={HUB_CTA.start.href} size="lg">
            {HUB_CTA.start.label}
          </Pill>
          <Pill href={HUB_CTA.check.href} size="lg" variant="ghost">
            {HUB_CTA.check.label}
          </Pill>
        </div>
        <p className="mk-note">{HUB_FOOTER.org}</p>
        <p className="mk-note">{HUB_FOOTER.sources}</p>
        <p className="mk-note">{HUB_FOOTER.checked}</p>
      </Section>
    </article>
  );
}
