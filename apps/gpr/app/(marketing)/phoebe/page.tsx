import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { RichFaq } from '@/components/marketing/home/RichFaq';
import { FlowCard } from '@/components/marketing/intake/FlowCard';
import '@/components/marketing/home/home.css';
import {
  PATH,
  PHOEBE_CLOSE,
  PHOEBE_FAQ,
  PHOEBE_FAQ_H2,
  PHOEBE_HERO,
  PHOEBE_META,
  PHOEBE_SECTIONS,
  PHOEBE_STEP1,
} from '@/content/pages/phoebe';

/** Creator landing (YouTube · Phoebe): noindex, follow; EN only; no structured data. */
export const metadata: Metadata = {
  title: PHOEBE_META.title,
  description: PHOEBE_META.description,
  alternates: pageAlternates({ path: PATH }),
  robots: { index: false, follow: true },
  openGraph: {
    title: PHOEBE_META.title,
    description: PHOEBE_META.description,
    url: PATH,
    type: 'website',
  },
};

export default function PhoebeRoute() {
  const faqIndex = PHOEBE_SECTIONS.length + 2;
  return (
    <article className="mk-phoebe">
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <h1 className="mk-h1">{PHOEBE_HERO.h1}</h1>
            <Blocks blocks={PHOEBE_HERO.intro} />
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="step-1"
        index={1}
        label={PHOEBE_STEP1.label}
        title={PHOEBE_STEP1.h2}
        tone="surface"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <FlowCard />
          <p className="mk-p">{PHOEBE_STEP1.after}</p>
        </div>
      </Section>

      {PHOEBE_SECTIONS.map((s, i) => (
        <Section
          key={s.id}
          id={s.id}
          index={i + 2}
          label={s.label}
          title={s.h2}
          tone={i % 2 ? 'surface' : 'plain'}
        >
          <Blocks blocks={s.blocks} />
        </Section>
      ))}

      <Section id="faq" index={faqIndex} label="FAQ" title={PHOEBE_FAQ_H2}>
        <RichFaq items={PHOEBE_FAQ} />
      </Section>

      <Section
        id="ready"
        index={faqIndex + 1}
        label="Ready"
        title={PHOEBE_CLOSE.h2}
        tone="tint"
      >
        <p className="mk-p">{PHOEBE_CLOSE.text}</p>
        <div className="mk-cta-row">
          <Pill href={PHOEBE_CLOSE.cta.href} size="lg">
            {PHOEBE_CLOSE.cta.label}
          </Pill>
        </div>
        <p className="mk-note">{PHOEBE_CLOSE.disclaimer}</p>
      </Section>
    </article>
  );
}
