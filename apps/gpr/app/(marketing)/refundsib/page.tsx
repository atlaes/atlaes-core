import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { EXTERNAL } from '@/content/registries/links';
import { FaqList } from '@/components/marketing/ui/FaqList';
import { Inline } from '@/components/marketing/ui/Inline';
import { Pill } from '@/components/marketing/ui/Pill';
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
import {
  CoreCta,
  CoreHero,
  CoreRail,
  CoreSplit,
} from '../_core/CoreHero';
import '../_core/core.css';

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
    <article className="mk-refundsib mk-core">
      <AttributionCapture />

      {/* Hero (822:2058): partner badge, H1, notice + who-we-are cards */}
      <CoreHero
        crumbs={SIB_HERO.crumbs}
        badge={<p className="mk-core-badge">{SIB_HERO.badge}</p>}
        eyebrow={SIB_HERO.eyebrow}
        title={SIB_HERO.h1}
        className="mk-core-partner-hero"
        after={
          <div className="mk-core-notes">
            <div className="mk-core-note-card">
              <p className="mk-label">{SIB_HERO.noticeLabel}</p>
              <p className="mk-p">{SIB_HERO.notice}</p>
            </div>
            <div className="mk-core-note-card">
              <p className="mk-label">{SIB_HERO.aboutLabel}</p>
              <p className="mk-p">
                <Inline x={SIB_HERO.about} />
              </p>
            </div>
          </div>
        }
      >
        <p className="mk-core-lead">{SIB_HERO.lead}</p>
      </CoreHero>

      {/* Step 1 (822:2072): split, navy intake card */}
      <CoreSplit
        id="step-1"
        index={1}
        label={SIB_STEP1.label}
        title={SIB_STEP1.h2}
      >
        <div className="mk-core-intake">
          <p className="mk-core-intake-step">{SIB_STEP1.stepLabel}</p>
          <FlowCard />
          <p className="mk-core-intake-hint">{SIB_STEP1.hint}</p>
        </div>
        <p className="mk-p mk-core-intake-after">{SIB_STEP1.aside}</p>
      </CoreSplit>

      {/* Rules (822:2083): rows 01 / 02 / 03 */}
      <section id="rules" className="mk-hs mk-tone-surface">
        <div className="mk-container mk-hs-stack">
          <div className="mk-hs-stack mk-core-head">
            <CoreRail index={2} label={SIB_RULES.label} />
            <h2 className="mk-h2 mk-h2-flush">{SIB_RULES.h2}</h2>
            <p className="mk-p">{SIB_RULES.intro}</p>
          </div>
          <ol className="mk-core-rows">
            {SIB_RULES.rules.map((r) => (
              <li key={r.n} className="mk-core-row">
                <div className="mk-core-row-title">
                  <span className="mk-core-row-n" aria-hidden="true">
                    {r.n}
                  </span>
                  <h3 className="mk-core-row-h">{r.h3}</h3>
                </div>
                <div className="mk-core-row-body">
                  <p className="mk-p">{r.p}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mk-p mk-core-muted">
            <Inline x={SIB_RULES.note.x} sp={SIB_RULES.note.sp} />
          </p>
        </div>
      </section>

      {/* What we do (822:2107): dark numbered cards + fee foot */}
      <section id="what-we-do" className="mk-hs mk-tone-dark">
        <div className="mk-container mk-hs-stack">
          <div className="mk-hs-stack mk-core-head">
            <CoreRail index={3} label={SIB_SERVICE.label} />
            <h2 className="mk-h2 mk-h2-flush">{SIB_SERVICE.h2}</h2>
          </div>
          <p className="mk-p mk-core-w960">{SIB_SERVICE.intro}</p>
          <ol className="mk-core-dark-grid">
            {SIB_SERVICE.cards.map((c) => (
              <li key={c.n} className="mk-core-dark-card">
                <span className="mk-core-dark-n" aria-hidden="true">
                  {c.n}
                </span>
                <p>{c.p}</p>
              </li>
            ))}
          </ol>
          <p className="mk-p mk-core-foot">
            <Inline x={SIB_SERVICE.fee.x} sp={SIB_SERVICE.fee.sp} />
          </p>
        </div>
      </section>

      {/* What to expect (822:2138): split, white tiles */}
      <CoreSplit
        id="what-to-expect"
        index={4}
        label={SIB_EXPECT.label}
        title={SIB_EXPECT.h2}
        tone="surface"
        deco
      >
        <ul className="mk-core-tiles">
          {SIB_EXPECT.cards.map((c) => (
            <li key={c.h3} className="mk-core-tile">
              <h3 className="mk-core-tile-h">{c.h3}</h3>
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
            </li>
          ))}
        </ul>
      </CoreSplit>

      {/* FAQ — split screen (822:2155) */}
      <CoreSplit id="faq" index={5} label={SIB_FAQ.label} title={SIB_FAQ.h2}>
        <FaqList items={SIB_FAQ.items} />
      </CoreSplit>

      {/* Closing CTA (822:2169) */}
      <CoreCta
        id="ready"
        title={SIB_CLOSE.h2}
        cta={
          <Pill href={SIB_CLOSE.cta.href} size="lg">
            {SIB_CLOSE.cta.label}
          </Pill>
        }
      >
        <p className="mk-p">{SIB_CLOSE.text}</p>
      </CoreCta>
    </article>
  );
}
