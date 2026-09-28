import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { Callout } from '@/components/marketing/ui/Callout';
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
import { Crumbs } from '../other-countries/RulesPage';

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
    <article className="mk-data-request">
      <AttributionCapture />

      <header className="mk-hero">
        <div className="mk-hero-inner">
          <div className="mk-hero-copy">
            <Crumbs items={DATA_REQUEST_HERO.crumbs} />
            <p className="mk-kicker">
              ›› {DATA_REQUEST_HERO.eyebrow.toUpperCase()} ·{' '}
              {DATA_REQUEST_HERO.updated.toUpperCase()}
            </p>
            <h1 className="mk-h1">{DATA_REQUEST_HERO.h1}</h1>
            <p className="mk-p">{DATA_REQUEST_HERO.lead}</p>
          </div>
          <div className="mk-hero-aside" aria-hidden="true" />
        </div>
      </header>

      <Section
        id="your-rights"
        index={1}
        label="Your rights"
        title={DATA_REQUEST_RIGHTS.h2}
      >
        <p className="mk-p">{DATA_REQUEST_RIGHTS.intro}</p>
        <ul className="mk-ul">
          {DATA_REQUEST_RIGHTS.items.map((it) => (
            <li key={it.x}>
              <Inline x={it.x} sp={it.sp} />
            </li>
          ))}
        </ul>
        <Callout tone="surface" as="p" title={DATA_REQUEST_RIGHTS.noteTitle}>
          <p className="mk-p">{DATA_REQUEST_RIGHTS.note}</p>
        </Callout>
      </Section>

      <Section
        id="how-to-make-a-request"
        index={2}
        label="How to make a request"
        title={DATA_REQUEST_HOW.h2}
        tone="surface"
      >
        <p className="mk-p">{DATA_REQUEST_HOW.emailIntro}</p>
        <p className="mk-p">
          <a href={'mailto:' + PRIVACY_EMAIL} className="mk-link">
            {PRIVACY_EMAIL}
          </a>
        </p>
        <p className="mk-p">{DATA_REQUEST_HOW.clientIntro}</p>
        <p className="mk-p">
          <a href={'mailto:' + CLIENT_EMAIL} className="mk-link">
            {CLIENT_EMAIL}
          </a>
        </p>
        <p className="mk-p">{DATA_REQUEST_HOW.forwarded}</p>
        <p className="mk-p">{DATA_REQUEST_HOW.includeLabel}</p>
        <ol className="mk-ol">
          {DATA_REQUEST_HOW.include.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ol>
        <p className="mk-p">{DATA_REQUEST_HOW.closing}</p>
      </Section>
    </article>
  );
}
