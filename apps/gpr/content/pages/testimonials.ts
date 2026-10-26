/**
 * /testimonials copy — verbatim from the Testimonials Page Content Handoff
 * (26 Aug 2026). Rating, count, direct/aggregated split and the timing
 * evidence come from the token store (M-15, M-16, TM-01, M-12).
 *
 * Award-certificate gate (MT-08 / D-15 / S-17): only title/year pairs whose
 * certificate is retained are published — the handoff confirms 2024 and
 * 2025 for both titles; 2026 is NOT published until both 2026 certificates
 * are in the archive (open point 1).
 *
 * Review wall: the platform renders the review cards from
 * `content/reviews.ts` (ten cards), so the handoff's own rule for a wall
 * that is not set to 50 applies and the number is dropped from the
 * sentence, the meta description and the schema description.
 *
 * Schema: WebPage + BreadcrumbList only — no AggregateRating / Review.
 */
import type { Block, RichText } from '@/content/types';
import { EXTERNAL, FUNNEL_ENTRY } from '@/content/registries/links';
import { t } from '@/content/tokens';

export const PATH = '/testimonials';

const PROCESSING_TIME = '/german-pension-refund-processing-time';

export const TESTIMONIALS_META = {
  title: 'Client Reviews | Germany Pension Refund',
  description:
    'Rated {{M-15.ratingExact}} on ProvenExpert from more than {{M-16.countFloor}} reviews. Read our most recent Google reviews from clients who got their German pension back with us.',
};

export const TESTIMONIALS_HERO = {
  h1: 'Customer Testimonials',
  intro:
    'Discover what our customers have to say about using our award-winning German pension refund service.',
};

/** ProvenExpert seal slot: approved compact sentence, linked to the profile. */
export const TESTIMONIALS_SEAL = {
  sentence: '{{M-15.sentence.exact}}',
  href: EXTERNAL.provenExpertEn,
  linkLabel: 'View the ProvenExpert profile',
};

export interface Award {
  title: string;
  /** Years with a retained certificate. */
  years: string[];
}

export const AWARDS: Award[] = [
  { title: 'Top Service Provider', years: ['2024', '2025'] },
  { title: 'Top Recommendation', years: ['2024', '2025'] },
];

const scoreBold =
  t('M-15.ratingExact') +
  ' on ProvenExpert from ' +
  t('M-16.countExact') +
  ' reviews';

export const TESTIMONIALS_WHAT = {
  h2: 'What Clients Tell Us',
  blocks: [
    {
      t: 'p',
      x: "We appreciate every piece of feedback we receive. Two themes come back again and again in the reviews: the process felt simple from the client's side, and people knew where their case stood — during an active managed claim, clients receive a status update at least every four weeks and earlier when a material request or development occurs.",
    },
    {
      t: 'p',
      x: "We're proud of the score behind that: {{M-15.ratingExact}} on ProvenExpert from {{M-16.countExact}} reviews (checked {{M-15.checkedOn}}) — {{M-16.direct}} submitted directly on ProvenExpert and {{M-16.aggregated}} aggregated there from three other review sources. ProvenExpert states that the overall score is the simple average of the direct and imported ratings it includes.",
      // Bold first so the link span lands on the second "ProvenExpert".
      sp: [
        { k: 'b', x: scoreBold },
        { k: 'a', x: 'ProvenExpert', href: EXTERNAL.provenExpertEn },
      ],
    },
    {
      t: 'p',
      x: "And although we don't do it for the awards: ProvenExpert has named us Top Service Provider and Top Recommendation in 2024 and 2025.",
      sp: [
        { k: 'b', x: 'Top Service Provider' },
        { k: 'b', x: 'Top Recommendation' },
        { k: 'b', x: '2024 and 2025' },
      ],
    },
    {
      t: 'p',
      x: 'Below are our most recent customer reviews on Google, in their own words:',
    },
  ] as Block[],
};

export const TESTIMONIALS_TRUST = {
  h2: 'Put Your Trust in Germany Pension Refund Today',
  text: {
    x: 'The process behind these reviews is easy, fast and secure — and measured: {{TM-01.share}} of our {{TM-01.population}} reached the client escrow account {{TM-01.window}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission — see the full data and methodology. Individual processing times vary. Starting your claim takes less than one minute, and the fee only ever comes out of a successful refund: no refund, no fee.',
    sp: [
      {
        k: 'a',
        x: 'see the full data and methodology',
        href: PROCESSING_TIME,
      },
      { k: 'a', x: 'no refund, no fee', href: '/pricing' },
    ],
  } as RichText,
  cta: { label: 'Make Your Claim Today', href: FUNNEL_ENTRY },
};

/** Appendix B WebPage description (token references resolved at render). */
export const TESTIMONIALS_SCHEMA_DESCRIPTION =
  'Client reviews of the Germany Pension Refund service: rated {{M-15.ratingExact}} on ProvenExpert from {{M-16.countExact}} reviews (checked {{M-15.checkedOn}}), including reviews aggregated from three other sources, with the most recent Google reviews displayed on the page.';

export const TESTIMONIALS_BREADCRUMB_NAME = 'Customer Testimonials';
