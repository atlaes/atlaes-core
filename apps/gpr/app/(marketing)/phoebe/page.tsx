import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Inline } from '@/components/marketing/ui/Inline';
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
  type PhoebeSection,
} from '@/content/pages/phoebe';
import { SIB_HERO, SIB_STEP1 } from '@/content/pages/refundsib';
import type { Block, RichText } from '@/content/types';
import {
  CoreCta,
  CoreHero,
  CoreRail,
  CoreSplit,
} from '../_core/CoreHero';
import '../_core/core.css';

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

/** Text of a paragraph block and its bold lead ("Amount."). */
function leadOf(b: Block): { lead: string; rest: RichText } | null {
  if (b.t !== 'p') return null;
  const bold = b.sp ? b.sp.find((sp) => sp.k === 'b') : undefined;
  if (!bold || b.x.indexOf(bold.x) !== 0) return null;
  return {
    lead: bold.x,
    rest: {
      x: b.x.slice(bold.x.length).trim(),
      sp: (b.sp || []).filter((sp) => sp !== bold),
    },
  };
}

interface RuleRow {
  n: string;
  title: string;
  body: Block[];
}

/** "1. Citizenship — …" H3 groups → numbered rows; leading blocks → intro. */
function ruleRows(blocks: Block[]): { intro: Block[]; rows: RuleRow[] } {
  const intro: Block[] = [];
  const rows: RuleRow[] = [];
  blocks.forEach((b) => {
    if (b.t === 'h3') {
      const m = /^(\d+)\.\s*(.*)$/.exec(b.x);
      rows.push({
        n: m ? (m[1].length < 2 ? '0' + m[1] : m[1]) : '',
        title: m ? m[2] : b.x,
        body: [],
      });
    } else if (rows.length) {
      rows[rows.length - 1].body.push(b);
    } else {
      intro.push(b);
    }
  });
  return { intro, rows };
}

function RulesSection({ s, index }: { s: PhoebeSection; index: number }) {
  const { intro, rows } = ruleRows(s.blocks);
  return (
    <section id={s.id} className="mk-hs mk-tone-plain">
      <div className="mk-container mk-hs-stack">
        <div className="mk-hs-stack mk-core-head">
          <CoreRail index={index} label={s.label} />
          <h2 className="mk-h2 mk-h2-flush">{s.h2}</h2>
          <Blocks blocks={intro} />
        </div>
        <ol className="mk-core-rows">
          {rows.map((r) => (
            <li key={r.title} className="mk-core-row">
              <div className="mk-core-row-title">
                {r.n ? (
                  <span className="mk-core-row-n" aria-hidden="true">
                    {r.n}
                  </span>
                ) : null}
                <h3 className="mk-core-row-h">{r.title}</h3>
              </div>
              <div className="mk-core-row-body">
                <Blocks blocks={r.body} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ServiceSection({ s, index }: { s: PhoebeSection; index: number }) {
  const ul = s.blocks.find((b) => b.t === 'ul');
  const items = ul && ul.t === 'ul' ? ul.items : [];
  const at = ul ? s.blocks.indexOf(ul) : s.blocks.length;
  const before = s.blocks.slice(0, at);
  const after = s.blocks.slice(at + 1);
  return (
    <section id={s.id} className="mk-hs mk-tone-dark">
      <div className="mk-container mk-hs-stack">
        <div className="mk-hs-stack mk-core-head">
          <CoreRail index={index} label={s.label} />
          <h2 className="mk-h2 mk-h2-flush">{s.h2}</h2>
        </div>
        <div className="mk-core-w960">
          <Blocks blocks={before} />
        </div>
        <ol className="mk-core-dark-grid">
          {items.map((it, i) => (
            <li key={i} className="mk-core-dark-card">
              <span className="mk-core-dark-n" aria-hidden="true">
                {i < 9 ? '0' + (i + 1) : i + 1}
              </span>
              <p>
                <Inline x={it.x} sp={it.sp} />
              </p>
            </li>
          ))}
        </ol>
        {after.length ? (
          <div className="mk-core-foot">
            <Blocks blocks={after} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ExpectSection({ s, index }: { s: PhoebeSection; index: number }) {
  return (
    <CoreSplit
      id={s.id}
      index={index}
      label={s.label}
      title={s.h2}
      tone="surface"
      deco
    >
      <ul className="mk-core-tiles">
        {s.blocks.map((b, i) => {
          const l = leadOf(b);
          return (
            <li key={i} className="mk-core-tile">
              {l ? (
                <>
                  <h3 className="mk-core-tile-h">{l.lead}</h3>
                  <p className="mk-p">
                    <Inline x={l.rest.x} sp={l.rest.sp} />
                  </p>
                </>
              ) : (
                <Blocks blocks={[b]} />
              )}
            </li>
          );
        })}
      </ul>
    </CoreSplit>
  );
}

export default function PhoebeRoute() {
  const faqIndex = PHOEBE_SECTIONS.length + 2;
  const [lead, notice, ...about] = PHOEBE_HERO.intro;
  return (
    <article className="mk-phoebe mk-core">
      <AttributionCapture />

      {/* Hero (1080:5118): same structure as /refundsib */}
      <CoreHero
        crumbs={[{ label: 'Home', href: '/' }, { label: "Phoebe's viewers" }]}
        eyebrow="Creator landing page · YouTube · Phoebe"
        title={PHOEBE_HERO.h1}
        className="mk-core-partner-hero"
        after={
          <div className="mk-core-notes">
            <div className="mk-core-note-card">
              <p className="mk-label">{SIB_HERO.noticeLabel}</p>
              <Blocks blocks={[notice]} />
            </div>
            <div className="mk-core-note-card">
              <p className="mk-label">{SIB_HERO.aboutLabel}</p>
              <Blocks blocks={about} />
            </div>
          </div>
        }
      >
        <div className="mk-core-lead-wrap">
          <Blocks blocks={[lead]} />
        </div>
      </CoreHero>

      {/* Step 1: split, navy intake card */}
      <CoreSplit
        id="step-1"
        index={1}
        label={PHOEBE_STEP1.label}
        title={PHOEBE_STEP1.h2}
      >
        <div className="mk-core-intake">
          <p className="mk-core-intake-step">{SIB_STEP1.stepLabel}</p>
          <FlowCard />
        </div>
        <p className="mk-p mk-core-intake-after">{PHOEBE_STEP1.after}</p>
      </CoreSplit>

      {PHOEBE_SECTIONS.map((s, i) => {
        const index = i + 2;
        if (s.blocks.some((b) => b.t === 'h3'))
          return <RulesSection key={s.id} s={s} index={index} />;
        if (s.blocks.some((b) => b.t === 'ul'))
          return <ServiceSection key={s.id} s={s} index={index} />;
        if (s.blocks.every((b) => leadOf(b)))
          return <ExpectSection key={s.id} s={s} index={index} />;
        return (
          <Section
            key={s.id}
            id={s.id}
            index={index}
            label={s.label}
            title={s.h2}
            tone="surface"
          >
            <Blocks blocks={s.blocks} />
          </Section>
        );
      })}

      {/* FAQ — split screen */}
      <CoreSplit
        id="faq"
        index={faqIndex}
        label="FAQ"
        title={PHOEBE_FAQ_H2}
      >
        <RichFaq items={PHOEBE_FAQ} />
      </CoreSplit>

      {/* Closing CTA */}
      <CoreCta
        id="ready"
        title={PHOEBE_CLOSE.h2}
        cta={
          <Pill href={PHOEBE_CLOSE.cta.href} size="lg">
            {PHOEBE_CLOSE.cta.label}
          </Pill>
        }
        note={PHOEBE_CLOSE.disclaimer}
      >
        <p className="mk-p">{PHOEBE_CLOSE.text}</p>
      </CoreCta>
    </article>
  );
}
