import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { EXTERNAL } from '@/content/registries/links';
import { Callout } from '@/components/marketing/ui/Callout';
import { FaqList } from '@/components/marketing/ui/FaqList';
import { Inline } from '@/components/marketing/ui/Inline';
import { Pill } from '@/components/marketing/ui/Pill';
import { Section } from '@/components/marketing/ui/Section';
import { FlowCard } from '@/components/marketing/intake/FlowCard';
import '@/components/marketing/home/home.css';
import {
  PATH,
  SIB_CLOSE,
  SIB_EXPECT,
  SIB_FAQ,
  SIB_HERO,
  SIB_META,
  SIB_RULES,
  SIB_SERVICE,
  SIB_STEP1,
} from '@/content/pages/refundsib';
import { Crumbs } from '../other-countries/RulesPage';

/** Partner landing (Settle in Berlin): noindex, follow; EN only; no JSON-LD. */
export const metadata: Metadata = {
  title: SIB_META.title,
  description: SIB_META.description,
  alternates: pageAlternates({ path: PATH }),
  robots: { index: false, follow: true },
  openGraph: {
    title: SIB_META.title,
    description: SIB_META.description,
    url: PATH,
    type: 'website',
  },
};

export default function RefundSibRoute() {
  return (
    <article className="mk-refundsib">
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <Crumbs items={SIB_HERO.crumbs} />
            <ul className="mk-chips" aria-label="Partner">
              <li>{SIB_HERO.badge.toUpperCase()}</li>
            </ul>
            <p className="mk-kicker">›› {SIB_HERO.eyebrow.toUpperCase()}</p>
            <h1 className="mk-h1">{SIB_HERO.h1}</h1>
            <p className="mk-p">{SIB_HERO.lead}</p>
            <Callout tone="outline" as="p" title={SIB_HERO.noticeLabel}>
              <p className="mk-p">{SIB_HERO.notice}</p>
            </Callout>
            <Callout tone="tint" as="p" title={SIB_HERO.aboutLabel}>
              <p className="mk-p">
                <Inline x={SIB_HERO.about} />
              </p>
            </Callout>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="step-1"
        index={1}
        label={SIB_STEP1.label}
        title={SIB_STEP1.h2}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mk-note">{SIB_STEP1.stepLabel}</p>
            <FlowCard />
            <p className="mk-note">{SIB_STEP1.hint}</p>
          </div>
          <p className="mk-p">{SIB_STEP1.aside}</p>
        </div>
      </Section>

      <Section
        id="rules"
        index={2}
        label={SIB_RULES.label}
        title={SIB_RULES.h2}
        tone="surface"
      >
        <p className="mk-p">{SIB_RULES.intro}</p>
        <ol className="mk-ol">
          {SIB_RULES.rules.map((r) => (
            <li key={r.n}>
              <h3 className="mk-h3">{r.h3}</h3>
              <p className="mk-p">{r.p}</p>
            </li>
          ))}
        </ol>
        <p className="mk-note">
          <Inline x={SIB_RULES.note.x} sp={SIB_RULES.note.sp} />
        </p>
      </Section>

      <Section
        id="what-we-do"
        index={3}
        label={SIB_SERVICE.label}
        title={SIB_SERVICE.h2}
      >
        <p className="mk-p">{SIB_SERVICE.intro}</p>
        <ol className="mk-ol">
          {SIB_SERVICE.cards.map((c) => (
            <li key={c.n}>{c.p}</li>
          ))}
        </ol>
        <p className="mk-p">
          <Inline x={SIB_SERVICE.fee.x} sp={SIB_SERVICE.fee.sp} />
        </p>
      </Section>

      <Section
        id="what-to-expect"
        index={4}
        label={SIB_EXPECT.label}
        title={SIB_EXPECT.h2}
        tone="surface"
      >
        {SIB_EXPECT.cards.map((c) => (
          <div key={c.h3}>
            <h3 className="mk-h3">{c.h3}</h3>
            <p className="mk-p">
              <Inline
                x={c.x}
                sp={
                  c.provenExpert
                    ? [
                        {
                          k: 'a',
                          x: 'ProvenExpert',
                          href: EXTERNAL.provenExpert,
                        },
                      ]
                    : c.sp
                }
              />
            </p>
          </div>
        ))}
      </Section>

      <Section id="faq" index={5} label={SIB_FAQ.label} title={SIB_FAQ.h2}>
        <FaqList items={SIB_FAQ.items} />
      </Section>

      <Section
        id="ready"
        index={6}
        label="Ready"
        title={SIB_CLOSE.h2}
        tone="tint"
      >
        <p className="mk-p">{SIB_CLOSE.text}</p>
        <div className="mk-cta-row">
          <Pill href={SIB_CLOSE.cta.href} size="lg">
            {SIB_CLOSE.cta.label}
          </Pill>
        </div>
      </Section>
    </article>
  );
}
