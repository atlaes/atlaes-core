import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { Inline } from '@/components/marketing/ui/Inline';
import { Section } from '@/components/marketing/ui/Section';
import '@/components/marketing/home/home.css';
import {
  CLIENT_EMAIL,
  DATA_REQUEST_HERO,
  DATA_REQUEST_HOW,
  DATA_REQUEST_META,
  DATA_REQUEST_RIGHTS,
  PATH,
  PRIVACY_EMAIL,
} from '@/content/pages/data-request';
import { CoreHero, CoreRail } from '../_core/CoreHero';
import '../_core/core.css';
import './data-request.css';

/** The live page is noindex; kept, with follow and a canonical. */
export const metadata: Metadata = {
  title: DATA_REQUEST_META.title,
  description: DATA_REQUEST_META.description,
  alternates: pageAlternates({ path: PATH }),
  robots: { index: false, follow: true },
  openGraph: {
    title: DATA_REQUEST_META.title,
    description: DATA_REQUEST_META.description,
    url: PATH,
    type: 'website',
  },
};

export default function DataRequestRoute() {
  return (
    <article className="mk-data-request mk-core">
      <AttributionCapture />

      {/* Hero (926:8184): white, breadcrumb, eyebrow, H1, lead */}
      <CoreHero
        crumbs={DATA_REQUEST_HERO.crumbs}
        eyebrow={DATA_REQUEST_HERO.eyebrow + ' · ' + DATA_REQUEST_HERO.updated}
        title={DATA_REQUEST_HERO.h1}
        className="mk-dr-hero"
      >
        <p className="mk-core-lead">{DATA_REQUEST_HERO.lead}</p>
      </CoreHero>

      <Section
        id="your-rights"
        index={1}
        label="Your rights"
        title={DATA_REQUEST_RIGHTS.h2}
        className="mk-dr-rights"
      >
        <p className="mk-p">{DATA_REQUEST_RIGHTS.intro}</p>
        <ul className="mk-ul">
          {DATA_REQUEST_RIGHTS.items.map((it) => (
            <li key={it.x}>
              <Inline x={it.x} sp={it.sp} />
            </li>
          ))}
        </ul>
        <p className="mk-dr-note-title">{DATA_REQUEST_RIGHTS.noteTitle}</p>
        <p className="mk-p">{DATA_REQUEST_RIGHTS.note}</p>
      </Section>

      {/* How to make a request: emails left, checklist right */}
      <section id="how-to-make-a-request" className="mk-hs mk-tone-surface">
        <div className="mk-container mk-hs-stack">
          <div className="mk-hs-stack mk-dr-how-head">
            <CoreRail index={2} label="How to make a request" />
            <h2 className="mk-h2 mk-h2-flush">{DATA_REQUEST_HOW.h2}</h2>
          </div>
          <div className="mk-split mk-split-half">
            <div className="mk-dr-emails">
              <p className="mk-p">{DATA_REQUEST_HOW.emailIntro}</p>
              <p className="mk-dr-email">
                <a href={'mailto:' + PRIVACY_EMAIL}>{PRIVACY_EMAIL}</a>
              </p>
              <p className="mk-p">{DATA_REQUEST_HOW.clientIntro}</p>
              <p className="mk-dr-email">
                <a href={'mailto:' + CLIENT_EMAIL}>{CLIENT_EMAIL}</a>
              </p>
              <p className="mk-dr-forwarded">{DATA_REQUEST_HOW.forwarded}</p>
            </div>
            <div className="mk-dr-include">
              <h3 className="mk-dr-include-h">
                {DATA_REQUEST_HOW.includeLabel}
              </h3>
              <ol>
                {DATA_REQUEST_HOW.include.map((it, i) => (
                  <li key={it}>
                    <span className="mk-dr-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    {it}
                  </li>
                ))}
              </ol>
              <p className="mk-dr-closing">{DATA_REQUEST_HOW.closing}</p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
