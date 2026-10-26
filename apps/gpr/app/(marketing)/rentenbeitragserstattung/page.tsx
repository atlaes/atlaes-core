import type { Metadata } from 'next';
import { AttributionCapture } from '@/lib/attribution';
import { pageAlternates } from '@/lib/hreflang';
import { articleGraph, type JsonLdGraph } from '@/lib/jsonld';
import {
  ArticleHero,
  ArticleLayout,
} from '@/components/marketing/article/ArticlePage';
import { Blocks } from '@/components/marketing/ui/Blocks';
import { Callout } from '@/components/marketing/ui/Callout';
import { Inline } from '@/components/marketing/ui/Inline';
import { JsonLd } from '@/components/marketing/ui/JsonLd';
import { Pill } from '@/components/marketing/ui/Pill';
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

/** Hero chrome (Figma 928:11791); the page is laid out as an article. */
const HUB_CRUMBS = [
  { label: 'Startseite', href: '/' },
  { label: 'Rentenbeitragserstattung' },
];
const HUB_EYEBROW = 'Ratgeber · Rentenbeitragserstattung';

/**
 * German hub in the article template (Figma 928:11787): article hero,
 * 280px rail with "Auf dieser Seite", 760px column with dividers before
 * the H2s, grey disclaimer callout, embedded widgets, FAQ and sources.
 */
export default function RentenbeitragserstattungPage() {
  const toc = [
    ...HUB_SECTIONS.map((s) => ({ id: s.id, label: s.h2 })),
    { id: 'faq', label: HUB_FAQ_H2 },
  ];
  return (
    <article className="mk-art mk-hub" lang="de">
      <JsonLd graph={hubGraph()} />
      <AttributionCapture />

      <ArticleHero
        lang="de"
        crumbs={HUB_CRUMBS}
        eyebrow={HUB_EYEBROW}
        h1={HUB_H1}
        showReviewer
        reviewLine={HUB_FOOTER.checked}
      />

      <ArticleLayout lang="de" rail="Ratgeber" toc={toc}>
        <Blocks blocks={HUB_HERO} />
        <Callout tone="surface" as="p">
          <p className="mk-p">{HUB_DISCLAIMER}</p>
        </Callout>
        <nav className="mk-art-jump" aria-label={HUB_JUMP_LABEL}>
          {HUB_JUMP_LABEL}:{' '}
          {HUB_JUMP.map((j, i) => (
            <span key={j.href}>
              {i ? ' · ' : null}
              <a href={j.href}>{j.label}</a>
            </span>
          ))}
        </nav>

        {HUB_SECTIONS.map((s) => (
          <HubSection key={s.id} s={s} />
        ))}

        <h2 id="faq" className="mk-art-h2">
          {HUB_FAQ_H2}
        </h2>
        <RichFaq items={HUB_FAQ.map((f) => ({ q: f.q, blocks: f.blocks }))} />

        <p className="mk-p">{HUB_CLOSE.text}</p>
        <div className="mk-cta-row mk-art-cta">
          <Pill href={HUB_CTA.start.href} size="lg">
            {HUB_CTA.start.label}
          </Pill>
          <Pill href={HUB_CTA.check.href} size="lg" variant="secondary">
            {HUB_CTA.check.label}
          </Pill>
        </div>
        <p className="mk-art-src">{HUB_FOOTER.org}</p>
        <p className="mk-art-src">{HUB_FOOTER.sources}</p>
      </ArticleLayout>
    </article>
  );
}

function HubSection({ s }: { s: (typeof HUB_SECTIONS)[number] }) {
  return (
    <>
      <h2 id={s.id} className="mk-art-h2">
        {s.h2}
      </h2>
      <Blocks blocks={s.blocks} />
      {s.id === 'wartefrist' ? (
        <>
          <WaitingPeriodCalculator lang="de" via="wartefrist-rechner" as="h3" />
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
    </>
  );
}
