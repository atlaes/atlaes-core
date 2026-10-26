import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import {
  absoluteUrl,
  breadcrumbNode,
  graph,
  organizationStub,
  ORGANIZATION_ID,
  PERSON_ID,
  WEBSITE_ID,
} from '@/lib/jsonld';
import { REVIEWER } from '@/content/site';
import { SITE_URL } from '@/content/registries/links';
import { resolveTokens } from '@/content/tokens';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
import { Inline } from '@/components/marketing/ui/Inline';
import { SmartLink } from '@/components/marketing/ui/SmartLink';
import {
  ABOUT_CLOSE,
  ABOUT_COMPANY,
  ABOUT_COMPLEX,
  ABOUT_EDUCATION,
  ABOUT_HOW_WE_WORK,
  ABOUT_INTRO,
  ABOUT_META,
  ABOUT_SCHEMA,
  ABOUT_TRACK_RECORD,
  ABOUT_WHAT_WE_DO,
  PATH,
} from '@/content/pages/about-us';
import type { Block, RichText } from '@/content/types';
import {
  CoreCta,
  CoreDeco,
  CoreHero,
  CoreRail,
  CoreSplit,
  CoreStats,
} from '../_core/CoreHero';
import '../_core/core.css';
import './about-us.css';

const description = resolveTokens(ABOUT_META.description);

export const metadata: Metadata = {
  title: ABOUT_META.title,
  description,
  alternates: pageAlternates({ path: PATH }),
  openGraph: {
    title: ABOUT_META.title,
    description,
    url: PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: ABOUT_META.title,
    description,
  },
};

/**
 * Appendix B: AboutPage + Person ×2 + BreadcrumbList; the Organization is
 * the stub (foundingDate stays on the homepage markup only, ID-03).
 */
function aboutGraph() {
  const url = absoluteUrl(PATH);
  return graph([
    {
      '@type': 'AboutPage',
      '@id': url + '#webpage',
      url,
      name: ABOUT_META.title,
      description: ABOUT_SCHEMA.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORGANIZATION_ID },
      breadcrumb: { '@id': url + '#breadcrumbs' },
      mainEntity: organizationStub(),
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: REVIEWER.name,
      jobTitle: ABOUT_SCHEMA.johannes.jobTitle,
      worksFor: { '@id': ORGANIZATION_ID },
      sameAs: ABOUT_SCHEMA.johannes.sameAs,
    },
    {
      '@type': 'Person',
      '@id': SITE_URL + ABOUT_SCHEMA.anna.idSuffix,
      name: ABOUT_SCHEMA.anna.name,
      jobTitle: ABOUT_SCHEMA.anna.jobTitle,
      worksFor: { '@id': ORGANIZATION_ID },
      sameAs: ABOUT_SCHEMA.anna.sameAs,
    },
    breadcrumbNode(url + '#breadcrumbs', [
      { name: 'Home', path: '/' },
      { name: 'About Us', path: PATH },
    ]),
  ]);
}

/** "Clients rate the service **over 4.9/5 on ProvenExpert …**" with the link inside the bold run. */
function RatingLine() {
  const r = ABOUT_TRACK_RECORD.rating;
  return (
    <p className="mk-p">
      {r.lead}
      <strong>
        {resolveTokens(r.boldBefore)}
        <SmartLink href={r.linkHref} className="mk-link">
          {r.linkText}
        </SmartLink>
        {resolveTokens(r.boldAfter)}
      </strong>
      {resolveTokens(r.tail)}
      <SmartLink
        href={r.tailLinkHref}
        className="mk-link"
        darkClassName="mk-dark"
      >
        {r.tailLinkText}
      </SmartLink>
      {r.end}
    </p>
  );
}

function listOf(blocks: Block[]): RichText[] {
  const ul = blocks.find((b) => b.t === 'ul');
  return ul && ul.t === 'ul' ? ul.items : [];
}

function n2(i: number) {
  return i < 9 ? '0' + (i + 1) : String(i + 1);
}

/** Figures from the token store; captions are parts of the approved sentences. */
const TRACK_STATS = [
  {
    figure: resolveTokens('{{M-14.amount}}+'),
    caption: resolveTokens('recovered for clients since {{M-14.since}}'),
  },
  {
    figure: resolveTokens('{{M-15.rating}}+'),
    caption: resolveTokens(
      'on ProvenExpert from more than {{M-16.countFloor}} reviews'
    ),
  },
];

export default function AboutRoute() {
  const c = ABOUT_COMPANY;
  const whatItems = listOf(ABOUT_WHAT_WE_DO.blocks);
  const howItems = listOf(ABOUT_HOW_WE_WORK.blocks);
  const howAfter = ABOUT_HOW_WE_WORK.blocks.filter(
    (b, i) => b.t !== 'ul' && i > 0
  );
  const [introLead, ...introRest] = ABOUT_INTRO.blocks;
  const [complexLead, ...complexRest] = ABOUT_COMPLEX.blocks;
  const edu = ABOUT_EDUCATION.blocks;
  return (
    <article className="mk-about mk-core">
      <JsonLd graph={aboutGraph()} />
      <AttributionCapture />

      {/* Hero (662:4820): white, copy + photo card, stat strip */}
      <CoreHero
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About Us' }]}
        eyebrow="About us · Germany Pension Refund"
        eyebrowAbove
        size={60}
        layout="half"
        title={ABOUT_INTRO.h1}
        aside={
          <figure className="mk-about-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/core/about-office.png"
              alt=""
              width={680}
              height={510}
              loading="eager"
            />
            <figcaption>{ABOUT_INTRO.imageCaption}</figcaption>
          </figure>
        }
        after={<CoreStats tiles={TRACK_STATS} />}
      >
        <div className="mk-about-lead">
          <Blocks blocks={[introLead]} />
        </div>
        <Blocks blocks={introRest} />
      </CoreHero>

      {/* What we do (668:4929): split, accent-bar service rows */}
      <CoreSplit
        id="what-we-do"
        index={1}
        label="What we do"
        title={ABOUT_WHAT_WE_DO.h2}
        side={<Blocks blocks={ABOUT_WHAT_WE_DO.blocks.slice(0, 1)} />}
      >
        <ol className="mk-about-services">
          {whatItems.map((it, i) => (
            <li key={i}>
              <span className="mk-about-service-n" aria-hidden="true">
                {n2(i)}
              </span>
              <p className="mk-p">
                <Inline x={it.x} sp={it.sp} />
              </p>
            </li>
          ))}
        </ol>
      </CoreSplit>

      {/* Why complex (668:4997): dark, half split, deco */}
      <section
        id="why-this-topic-is-complex"
        className="mk-hs mk-tone-dark mk-core-has-deco"
      >
        <CoreDeco className="mk-core-deco-split" />
        <div className="mk-container mk-split mk-split-half">
          <div className="mk-hs-stack">
            <CoreRail index={2} label="Why complex" />
            <h2 className="mk-h2 mk-h2-flush">{ABOUT_COMPLEX.h2}</h2>
          </div>
          <div>
            <div className="mk-about-complex-lead">
              <Blocks blocks={[complexLead]} />
            </div>
            <Blocks blocks={complexRest} />
          </div>
        </div>
      </section>

      {/* Track record (671:5063): stat cards left, copy right */}
      <section id="our-track-record" className="mk-hs mk-tone-surface">
        <div className="mk-container mk-hs-stack">
          <CoreRail index={3} label="Track record" />
          <div className="mk-split mk-split-480">
            <ul className="mk-about-track-cards">
              {TRACK_STATS.map((t) => (
                <li key={t.figure}>
                  <span className="mk-about-track-figure">{t.figure}</span>
                  <span className="mk-about-track-caption">{t.caption}</span>
                </li>
              ))}
            </ul>
            <div>
              <h2 className="mk-h2">{ABOUT_TRACK_RECORD.h2}</h2>
              <Blocks blocks={[ABOUT_TRACK_RECORD.recovered]} />
              <RatingLine />
            </div>
          </div>
        </div>
      </section>

      {/* Company information (678:5144): company card + copy */}
      <section
        id="company-information"
        className="mk-hs mk-tone-plain mk-about-company"
      >
        <div className="mk-container mk-hs-stack">
          <CoreRail index={4} label="Company info" />
          <h2 className="mk-h2 mk-h2-flush">{c.h2}</h2>
          <div className="mk-split mk-split-half">
            <div className="mk-about-company-card">
              <p className="mk-about-company-lead">{c.lead}</p>
              <p className="mk-about-company-name">
                <span className="mk-about-dot" aria-hidden="true" />
                {c.address[0]}
              </p>
              <p className="mk-about-company-row">
                {c.address.slice(1).map((line, i, all) => (
                  <span key={line}>
                    {line}
                    {i < all.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
              <p className="mk-about-company-row">{c.register}</p>
              <p className="mk-about-company-row">{c.directors}</p>
              <p className="mk-about-company-row">
                {c.contact.phoneLabel}
                <a
                  className="mk-link"
                  href={'tel:' + c.contact.phone.replace(/\s+/g, '')}
                >
                  {c.contact.phone}
                </a>
                {' · '}
                {c.contact.emailLabel}
                <a className="mk-link" href={'mailto:' + c.contact.email}>
                  {c.contact.email}
                </a>
              </p>
            </div>
            <div className="mk-about-company-copy">
              <Blocks blocks={c.blocks.slice(0, 1)} />
              <div className="mk-about-disclaimer">
                <Blocks blocks={c.blocks.slice(1)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How we work (688:5239): navy, step cards */}
      <CoreSplit
        id="how-we-work"
        index={5}
        label="How we work"
        title={ABOUT_HOW_WE_WORK.h2}
        tone="navy"
        deco
        side={<Blocks blocks={ABOUT_HOW_WE_WORK.blocks.slice(0, 1)} />}
      >
        <ol className="mk-about-steps">
          {howItems.map((it, i) => (
            <li key={i}>
              <span className="mk-about-step-pill" aria-hidden="true">
                {n2(i)}
              </span>
              <p className="mk-p">
                <Inline x={it.x} sp={it.sp} />
              </p>
            </li>
          ))}
        </ol>
        <div className="mk-about-steps-after">
          <Blocks blocks={howAfter} />
        </div>
      </CoreSplit>

      {/* Educational approach (693:5291): navy panel + white panel */}
      <section id="educational-approach" className="mk-hs mk-tone-plain">
        <div className="mk-container">
          <div className="mk-about-edu">
            <div className="mk-about-edu-left mk-tone-navy">
              <CoreRail index={6} label="Educational" />
              <h2 className="mk-h2">{ABOUT_EDUCATION.h2}</h2>
              <Blocks blocks={edu.slice(0, 1)} />
            </div>
            <div className="mk-about-edu-right">
              <Blocks blocks={edu.slice(1, edu.length - 1)} />
            </div>
          </div>
          <div className="mk-about-edu-note">
            <Blocks blocks={edu.slice(edu.length - 1)} />
          </div>
        </div>
      </section>

      {/* Closing CTA (693:5315) */}
      <CoreCta
        id="explore-your-german-pension-refund-today"
        title={ABOUT_CLOSE.h2}
        cta={
          <Pill href={ABOUT_CLOSE.cta.href} size="lg">
            {ABOUT_CLOSE.cta.label}
          </Pill>
        }
      >
        <Blocks blocks={ABOUT_CLOSE.blocks} />
      </CoreCta>
    </article>
  );
}
