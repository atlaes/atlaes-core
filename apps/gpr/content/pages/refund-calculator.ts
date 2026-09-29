/**
 * /refund-calculator copy — verbatim from the Refund Calculator Page
 * Content Handoff (26 Aug 2026): H1 + intro, the privacy sentence under the
 * widget, How to Use, The Rules Behind the Verdict, What Refunds Actually
 * Look Like (M-04 / M-17), the Appendix B FAQ (rendered visibly so the
 * FAQPage node mirrors page content), closing CTA (TM-01 / M-12).
 * Country links use the registry slugs (South Korea is `/southkorea`; the
 * ex-Yugoslav entries resolve through `countryHref`).
 * Schema: WebPage + BreadcrumbList + WebApplication + Service + FAQPage.
 */
import type { Block, FaqItem, RichText, Span } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import { countryHref, findCountry } from '@/content/registries/countries';

export const PATH = '/refund-calculator';

const PROCESSING_TIME = '/german-pension-refund-processing-time';
const GUIDE = '/post/how-to-get-a-german-pension-refund';

export const CALC_META = {
  title: 'German Pension Refund Calculator & Eligibility Check (2026)',
  description:
    'Free calculator with exact yearly rates and ceilings since 1975, plus an instant eligibility check. Estimate your German pension refund in 60 seconds.',
};

export const CALC_HERO = {
  h1: 'German Pension Refund Calculator',
  intro:
    'Two answers in about a minute: whether the standard rules appear to fit your case, and roughly how much of your German pension contributions could come back. The calculator applies the exact statutory rates and ceilings for every year since 1975 — no flat percentages — and the result is a preliminary indication, free, with no sign-up.',
  /** DP-01 two-part privacy sentence, directly under the widget. */
  privacy:
    "The calculation itself runs in your browser — your inputs aren't sent to us just because you calculate. If you submit the form to start your refund, we receive and store the contact and calculation details needed to handle and follow up your request.",
  /** Shown only when the calculator is opened on its own route. */
  fallbackCta: { label: 'Open the calculator', href: '/calculator' },
};

export const CALC_HOW_TO = {
  h2: 'How to Use the Calculator',
  blocks: [
    {
      t: 'ol',
      items: [
        {
          x: "Check your eligibility first. Select your citizenship, the country you live in now, and the first and last month you worked in Germany. If you live in Türkiye or a former Yugoslav country, we'll also ask whether you currently pay into the local state pension — this affects your eligibility.",
          sp: [{ k: 'b', x: 'Check your eligibility first.' }],
        },
        {
          x: 'Estimate your refund. Enter your period of work, your average gross monthly salary (Brutto) and whether you worked in West or East Germany. The calculator applies the exact statutory employee contribution rate and monthly contribution ceiling (Beitragsbemessungsgrenze) for every year from 1975 to today — not a flat percentage — so older working periods are calculated correctly, including Deutsche Mark years.',
          sp: [{ k: 'b', x: 'Estimate your refund.' }],
        },
        {
          x: 'Read your result. The amount shown is your own (employee) contributions — the part that gets refunded. Employer contributions are not refundable. The eligibility verdict is a preliminary indication of whether the standard rules appear to fit your case — not an individual legal decision — and your exact refund is determined by your official insurance record (Versicherungsverlauf): we obtain and review the relevant account information during the managed process where required.',
          sp: [{ k: 'b', x: 'Read your result.' }],
        },
      ],
    },
    {
      t: 'p',
      x: 'Want every rule behind these results? Read the complete 2026 guide to the German pension refund.',
      sp: [
        { k: 'b', x: 'Want every rule behind these results?' },
        {
          k: 'a',
          x: 'complete 2026 guide to the German pension refund',
          href: GUIDE,
        },
      ],
    },
  ] as Block[],
};

/** Contracting states in handoff order: [link text, registry slug]. */
const CONTRACTING_STATES: Array<[string, string]> = [
  ['USA', 'usa'],
  ['India', 'india'],
  ['Canada', 'canada'],
  ['Australia', 'australia'],
  ['Brazil', 'brazil'],
  ['Japan', 'japan'],
  ['South Korea', 'southkorea'],
  ['the Philippines', 'thephilippines'],
  ['Israel', 'israel'],
  ['Türkiye', 'turkey'],
  ['Albania', 'albania'],
  ['Moldova', 'moldova'],
  ['North Macedonia', 'north-macedonia'],
  ['Bosnia and Herzegovina', 'bosnia-herzegovina'],
  ['Kosovo', 'kosovo'],
  ['Montenegro', 'montenegro'],
  ['Serbia', 'serbia'],
  ['Chile', 'chile'],
  ['Morocco', 'morocco'],
  ['Tunisia', 'tunisia'],
  ['Uruguay', 'uruguay'],
];

const countrySpans: Span[] = CONTRACTING_STATES.map(([text, slug]) => {
  const entry = findCountry(slug);
  return { k: 'a', x: text, href: entry ? countryHref(entry) : '/' + slug };
});

export interface CalcRuleSection {
  id: string;
  h3: string;
  blocks: Block[];
}

export const CALC_RULES = {
  h2: 'The Rules Behind the Verdict',
  sections: [
    {
      id: 'nationality',
      h3: 'Nationality',
      blocks: [
        {
          t: 'p',
          x: 'Citizens of most countries outside Europe can claim a refund of their pension contributions. Special rules apply for the contracting states — each has its own page: USA, India, Canada, Australia, Brazil, Japan, South Korea, the Philippines, Israel, Türkiye, Albania, Moldova, North Macedonia, Bosnia and Herzegovina, Kosovo, Montenegro, Serbia, Chile, Morocco, Tunisia and Uruguay.',
          sp: countrySpans,
        },
        {
          t: 'p',
          x: 'Citizens of Germany, the EU, the EEA (Norway, Iceland, Liechtenstein), Switzerland and the UK keep the right to contribute to the German pension system even after leaving Germany — which means no refund before retirement age, and a second citizenship from one of these countries has the same effect. Their contributions are not lost: with at least 60 contribution months (counting insurance across the EU), they earn a German pension at retirement age — and if the 60 months are not reached by then, a refund becomes possible at that point.',
        },
      ],
    },
    {
      id: 'where-you-live',
      h3: 'Where You Live',
      blocks: [
        {
          t: 'p',
          x: 'Living in the EU or the UK blocks the refund for everyone, whatever the passport — residents there keep voluntary-insurance rights, and a live right to contribute is exactly what refund law rules out. One country outside Europe joins the list: India blocks the refund for every nationality except Indian citizens, thanks to a one-of-a-kind clause in the Germany–India agreement. Beyond that, residence-specific rules follow citizenship: Israeli citizens claim only from outside Israel, Japanese citizens face their contribution cap only while living in Japan, and citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia claim only from outside those four states (North Macedonia is not on that list).',
        },
      ],
    },
    {
      id: 'duration-of-work',
      h3: 'Duration of Work in Germany',
      blocks: [
        {
          t: 'p',
          x: 'If you paid German pension contributions for 5 years (60 months) or more and are a citizen of one of the following countries, you cannot claim a refund before retirement age: USA, India, Australia, Canada, Brazil, Albania, Moldova, North Macedonia, the Philippines, South Korea and Uruguay.',
        },
        {
          t: 'p',
          x: 'Japanese citizens face the 5-year limit only while living in Japan — outside Japan, no limit applies. Israeli citizens can claim at any contribution count while living outside Israel. Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia have no contribution limit once outside the four states — and neither do citizens of Türkiye, Chile, Morocco or Tunisia, anywhere outside the EU, the UK and India.',
        },
      ],
    },
    {
      id: 'waiting-period',
      h3: 'Time Since Your Last Pension Contribution',
      blocks: [
        {
          t: 'p',
          x: "You can apply for a refund 24 full calendar months after your last mandatory pension contribution in Germany, the EU, the UK, Türkiye or an ex-Yugoslav country. The clock runs from the last month of employment, receipt of unemployment benefits, or parental leave — the date of deregistration is not relevant — and new mandatory insurance in a listed country restarts the count from its end. Eligibility is checked at the date of your application: once validly filed, a claim isn't undone by a later return to Europe.",
        },
      ],
    },
  ] as CalcRuleSection[],
};

export const CALC_REFUNDS = {
  h2: 'What Refunds Actually Look Like',
  blocks: [
    {
      t: 'p',
      x: 'Across our retained completed paid cases — all nationalities — refunds averaged {{M-04.mean}}, with a median of {{M-04.median}} (calculated {{M-04.calculatedOn}}), and retained records include completed refunds from {{M-17.range}}. Where your estimate lands depends on your salary, your years, and the ceilings of the time — which is exactly what the calculator above works out.',
    },
  ] as Block[],
};

export const CALC_FAQ_H2 = 'Frequently asked questions';

/** Appendix B FAQ, rendered visibly and mirrored in the FAQPage node. */
export const CALC_FAQ: FaqItem[] = [
  {
    q: 'How can I manually calculate my German pension refund?',
    a: 'The most reliable way is to use your monthly payslips: add up the pension contributions shown on your December payslips for each year, plus the last month you worked in Germany. Alternatively, use your annual wage tax statements (Lohnsteuerbescheinigung) — section 23.a shows your employee contribution share — or multiply the Entgelt amounts in your insurance record (Versicherungsverlauf) by the contribution rate of each year (9.3% since 2018).',
  },
  {
    q: 'Does the calculator guarantee a refund?',
    a: 'No. The calculator estimates how much you have contributed over the years and gives a preliminary eligibility indication — not an individual legal decision or guarantee. Your actual refund is determined by your official insurance record and the applicable legal requirements.',
  },
  {
    q: 'Am I eligible for a German pension refund?',
    a: 'Eligibility depends on your nationality, your current country of residence, how long you contributed in Germany, and the time since your last contribution. In general: German, EU, EEA, Swiss and UK citizens cannot claim before retirement age, and no one can claim while living in the EU or the UK; living in India blocks every nationality except Indian citizens. Citizens of the USA, India, Australia, Canada, Brazil, Albania, Moldova, North Macedonia, the Philippines, South Korea and Uruguay can only claim with fewer than 60 monthly contributions. Japanese citizens face the 60-month limit only while living in Japan; Israeli citizens must live outside Israel; citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia must live outside those four states. For most other nationalities, including Türkiye, Chile, Morocco and Tunisia, no contribution limit applies.',
  },
  {
    q: 'When can I apply for a German pension refund?',
    a: '24 full calendar months after your last mandatory pension contribution in Germany, the EU, the UK, Türkiye or an ex-Yugoslav country — counted from your last month of employment, unemployment benefits, or parental leave, not from the date of deregistration. New mandatory insurance in a listed country restarts the count; eligibility is checked at the date of your application.',
  },
  {
    q: 'Is my calculator data stored?',
    a: 'The calculation itself runs in your browser — inputs are not sent to us just because you calculate. If you submit the form to start your refund, we receive and store the contact and calculation details needed to handle and follow up your request.',
  },
];

export const CALC_CLOSE = {
  h2: 'Claim Your German Pension Refund Today',
  text: {
    x: "The calculator's estimate is step zero; the managed claim is the rest, and it's built to be easy, fast and secure: {{TM-01.share}} of our {{TM-01.population}} reached the client escrow account {{TM-01.window}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission — see the full data and methodology. Individual processing times vary. You pay only on success: 9.75% of the refunded amount, capped at €2,500 including VAT, with nothing upfront — no refund, no fee. Starting your claim takes less than one minute.",
    sp: [
      {
        k: 'a',
        x: 'see the full data and methodology',
        href: PROCESSING_TIME,
      },
      { k: 'a', x: '9.75% of the refunded amount', href: '/pricing' },
    ],
  } as RichText,
  cta: { label: 'Make Your Claim Today', href: FUNNEL_ENTRY },
};

/** Appendix B (v3). */
export const CALC_SCHEMA = {
  webPageName: 'German Pension Refund Calculator',
  webPageDescription:
    'Check your eligibility for a German pension refund and calculate your refund amount based on nationality, residence, and work history. Free, no sign-up required.',
  appName: 'German Pension Refund Calculator',
  appDescription:
    'Free online tool that checks eligibility for a German pension contribution refund (citizenship, country of residence, work period, and local pension contributions where relevant) and estimates the refund amount. Unlike flat-percentage calculators, it applies the exact statutory employee contribution rate and monthly contribution ceiling (Beitragsbemessungsgrenze) for every year from 1975 to today, including Deutsche Mark periods and East/West differences. The result is a preliminary indication, not an individual legal decision.',
  serviceName: 'German Pension Refund Service',
  serviceDescription:
    "Managed handling of German pension refund claims for former residents of Germany: eligibility review, application preparation, correspondence with Deutsche Rentenversicherung within the agreed scope, and payout via the partner law firm's escrow account. No upfront payment and no minimum fee — the service fee is 9.75% of the refund, capped at €2,500 including VAT.",
};
