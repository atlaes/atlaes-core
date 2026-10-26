/**
 * Homepage copy — verbatim from the Homepage Build Sheet (8 Sep 2026),
 * in sheet order. Quarterly figures are token references resolved at
 * render (`content/tokens.ts`); the FAQ carries the visible blocks and the
 * schema text separately so the FAQPage answers mirror the sheet's graph.
 */
import type { Block, FaqItem, RichText } from '@/content/types';
import { EXTERNAL, FUNNEL_ENTRY } from '@/content/registries/links';
import { resolveTokens, t } from '@/content/tokens';

const PROCESSING_TIME = '/german-pension-refund-processing-time';
const CALCULATOR = '/refund-calculator';
const GUIDE = '/post/how-to-get-a-german-pension-refund';
const BAV_ARTICLE = '/post/cash-out-german-company-pension-bav';
const BREXIT_ARTICLE = '/post/brexit';
const CONTRIBUTION_RATE_SOURCE =
  'https://www.bundesamtsozialesicherung.de/de/themen/rentenversicherung/beitraege/';

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- page meta -------------------------------------------------------------

export const HOME_META = {
  title: 'German Pension Refund | Fast, Secure & Trusted',
  description: resolveTokens(
    'Fast, fully managed German pension refunds — no upfront service fee. {{M-04.sentence.meta}} You pay 9.75% (max €2,500) only after your refund arrives.'
  ),
  ogDescription: resolveTokens(
    "Worked in Germany and left? Reclaim your pension contributions. Our clients' average refund: {{M-04.meanShort}} — and {{TM-01.share}} of our {{TM-01.population}} reached the client escrow account {{TM-01.window}}. No upfront service fee: 9.75%, capped at €2,500 including VAT."
  ),
};

// --- hero ------------------------------------------------------------------

export const HERO = {
  chips: ['🇩🇪 BERLIN', 'SINCE 2015', 'ENGLISH SUPPORT'],
  display: 'Get Your German Pension Refund',
  subline:
    'Worked in Germany and moved abroad? Find out what you could reclaim — and let us handle the paperwork.',
  bullets: [
    'German paperwork handled for you, with support in English throughout.',
    "German law firm support and secure payout through the firm's escrow account.",
    'No upfront service fee. Pay 9.75% only on success — no minimum, capped at €2,500 including VAT.',
  ],
};

export interface StatTile {
  figure: string;
  caption: RichText;
}

/** A figure never renders without its caption (design rule 2). */
export const STAT_TILES: StatTile[] = [
  {
    figure: '{{M-04.meanShort}}',
    caption: {
      x: 'average client refund, quarterly calculation of {{M-04.calculatedOn}}',
    },
  },
  {
    figure: '{{M-12.pct}} within {{M-12.days}} days',
    caption: {
      x: '{{M-12.count}} of our {{M-12.total}} most recent completed refunds reached the client escrow account within {{M-12.days}} days of complete submission',
    },
  },
  {
    figure: '{{M-15.ratingExact}}',
    caption: {
      x: '{{M-16.countExact}} reviews on ProvenExpert, checked {{M-15.checkedOn}}',
      sp: [{ k: 'a', x: 'ProvenExpert', href: EXTERNAL.provenExpert }],
    },
  },
];

/** Mandatory whenever the timing tile renders. */
export const STAT_MICROCOPY: RichText = {
  x: 'Individual processing times vary — see the full data and methodology.',
  sp: [
    { k: 'a', x: 'see the full data and methodology', href: PROCESSING_TIME },
  ],
};

// --- intro (the page's only H1) --------------------------------------------

export const INTRO = {
  h1: 'German Pension Refund',
  tagline:
    'Fast, fully managed German pension refunds — with no upfront service fee.',
  blocks: [
    {
      t: 'p',
      x: "We're based in Berlin and have been helping non-EU citizens worldwide reclaim their German pension contributions from the Deutsche Rentenversicherung (Germany's official state pension authority) since 2015.",
    },
    {
      t: 'p',
      x: "We handle the paperwork, coordinate your claim with our German partner law firm and keep you informed in English. You get professional support from your first questions through to your payout. Your service fee is deducted only after your refund reaches the law firm's escrow account. No refund, no service fee.",
      sp: [{ k: 'b', x: 'No refund, no service fee.' }],
    },
    {
      t: 'p',
      x: "Our clients' average refund in the latest quarterly calculation ({{M-04.calculatedOn}}) was {{M-04.meanShort}}, and our retained records include completed refunds from {{M-17.range}}. {{TM-01.sentence.hero}} — see the full data and methodology.",
      sp: [
        {
          k: 'a',
          x: 'see the full data and methodology',
          href: PROCESSING_TIME,
        },
      ],
    },
  ] as Block[],
};

// --- who is eligible -------------------------------------------------------

export const ELIGIBILITY = {
  h2: 'Who is eligible for a refund?',
  blocks: [
    {
      t: 'p',
      x: 'Worked in Germany and now live abroad? You may be able to reclaim your employee pension contributions. Start with three main eligibility checks:',
    },
    {
      t: 'ul',
      items: [
        {
          x: '#1: You are not a citizen of Germany, the EU/EEA, Switzerland or the UK',
          sp: [{ k: 'b', x: '#1:' }],
        },
        {
          x: '#2: You currently live outside the EU and the UK',
          sp: [{ k: 'b', x: '#2:' }],
        },
        {
          x: '#3: At least 24 months have passed since your last mandatory pension contribution in Germany, the EU, the UK, Türkiye or an ex-Yugoslav country',
          sp: [{ k: 'b', x: '#3:' }],
        },
      ],
    },
    {
      t: 'p',
      x: 'Citizens of some agreement countries — like the USA, India, Canada or Australia — must also have fewer than 60 contribution months. Additional nationality and residence rules can apply. Our eligibility checker guides you through the relevant questions and gives you an initial indication.',
      sp: [{ k: 'a', x: 'eligibility checker', href: CALCULATOR }],
    },
    {
      t: 'p',
      x: 'Find out whether you could claim, then estimate your refund. For more detail, see our FAQ and complete 2026 guide.',
      sp: [
        { k: 'a', x: 'FAQ', href: '/faqs' },
        { k: 'a', x: 'complete 2026 guide', href: GUIDE },
      ],
    },
  ] as Block[],
};

// --- we handle the bureaucracy ---------------------------------------------

export const MANAGED = {
  h2: 'We handle the bureaucracy — you get your refund.',
  blocks: [
    {
      t: 'p',
      x: 'Most clients complete their part online. We check your eligibility, prepare the application and identify the responsible pension office. Our German partner law firm reviews and submits your claim, while we coordinate the paperwork and follow-up and explain the important details in English.',
    },
    {
      t: 'p',
      x: 'You hear from us at least every four weeks after submission — even if it is just to confirm that your claim is still in progress — and sooner whenever there is an important development or the office needs something from you. If a letter reaches you directly, simply forward it to us.',
    },
    {
      t: 'p',
      x: 'Across our {{TM-01.population}}, the median time from complete submission to the client escrow account was {{M-19.medianDays}} days. Individual processing times vary.',
      sp: [
        {
          k: 'a',
          x: 'our 300 most recent completed refunds',
          href: PROCESSING_TIME,
        },
      ],
    },
    {
      t: 'p',
      x: 'We prepare or guide you through the documents your claim needs, including:',
    },
  ] as Block[],
  documents: [
    'Certificate of life',
    'Payment declaration',
    'Payment authorization',
    'Deregistration and residency documents',
    'Additional documents requested by the pension office',
  ],
  after: [
    {
      t: 'p',
      x: 'Need help deregistering? We can take care of it as an optional add-on for €50 including VAT.',
    },
    {
      t: 'p',
      x: "No German bank account? No problem — one isn't required. After the agreed fee is deducted in escrow, the remaining balance is transferred to the bank account you nominate. Account-holder checks, international sanctions and banking restrictions can affect some destinations and currencies.",
    },
  ] as Block[],
};

// --- company pension -------------------------------------------------------

export const COMPANY_PENSION = {
  h2: 'Also had a company pension in Germany?',
  blocks: [
    {
      t: 'p',
      x: 'You may be able to recover more than just your Deutsche Rentenversicherung contributions.',
    },
    {
      t: 'p',
      x: 'If you also paid into a company pension such as VBL, ZVK, VddB, VddKO, BVV, or a private-sector provider like Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, or HDI, that pension may also qualify for a refund or a bAV lump-sum payout once your German state pension refund is complete.',
      sp: [{ k: 'a', x: 'bAV lump-sum payout', href: BAV_ARTICLE }],
    },
    {
      t: 'p',
      x: 'This is especially important after a successful German state pension refund. In many private-sector cases, a completed DRV refund can also make a vested company pension payable as a one-off lump sum.',
    },
    {
      t: 'p',
      x: 'These are separate claims, but they often matter together.',
    },
  ] as Block[],
};

// --- law-firm support ------------------------------------------------------

export const LAW_FIRM = {
  h2: 'Law-firm support included. No upfront service fee. Fully digital in most cases.',
  blocks: [
    {
      t: 'p',
      x: 'Your application is reviewed and submitted by our German partner law firm. We take care of the preparation, coordinate the claim and keep you informed in English — so you can get on with life while your refund is being processed.',
    },
    {
      t: 'p',
      x: "Our 9.75% success-based service fee includes the law firm's support for your refund application and the escrow payout. There is no minimum fee, and your service fee is capped at €2,500 including VAT, however large your refund.",
      sp: [
        { k: 'a', x: '9.75% success-based service fee', href: '/pricing' },
        { k: 'b', x: '€2,500 including VAT' },
      ],
    },
    {
      t: 'p',
      x: 'You pay only after your refund reaches escrow. If your claim produces no refund, there is no service fee.',
      sp: [
        {
          k: 'b',
          x: 'You pay only after your refund reaches escrow. If your claim produces no refund, there is no service fee.',
        },
      ],
    },
  ] as Block[],
  cta: {
    text: 'Your refund could be worth thousands. Find out if you can claim.',
    label: 'Check Your Eligibility',
    href: FUNNEL_ENTRY,
  },
};

// --- video -----------------------------------------------------------------

export const VIDEO = {
  h2: 'How Our German Pension Refund Service Works',
  blocks: [
    {
      t: 'p',
      x: 'Watch this short video to see how straightforward your German pension refund can be. You provide your details and documents; we check your eligibility, prepare the application and coordinate the claim. Our German partner law firm reviews and submits it and handles receipt of your refund in escrow.',
    },
    {
      t: 'p',
      x: 'Most clients complete their part online, with support in English throughout. We take care of the German paperwork and follow-up, and you pay the service fee only after your refund has arrived in escrow.',
    },
  ] as Block[],
  primary: { label: 'Check Your Eligibility', href: FUNNEL_ENTRY },
  secondary: {
    label: 'Read why expats love working with us.',
    href: '/testimonials',
  },
};

// --- do I qualify (carried over structurally intact) -----------------------

export const QUALIFY = {
  h2: 'Do I Qualify for a German Pension Refund?',
  intro: [
    { t: 'p', x: 'You may qualify for a German pension refund if:' },
    {
      t: 'ul',
      items: [
        { x: 'You are a non-EU citizen.' },
        { x: 'You no longer live in the EU or the UK.' },
        {
          x: 'At least 24 months have passed since your last period of mandatory pension insurance ended—whether in Germany, another EU country, the UK, Türkiye, or a successor state of former Yugoslavia.',
          sp: [{ k: 'a', x: 'Türkiye', href: '/turkey' }],
        },
      ],
    },
    {
      t: 'p',
      x: 'The successor states are Bosnia and Herzegovina, Kosovo, Croatia, North Macedonia, Montenegro, Serbia and Slovenia. For this rule, Iceland, Liechtenstein, Norway and Switzerland are not considered EU countries.',
    },
    {
      t: 'p',
      x: 'Additional rules apply to certain nationalities and countries of residence. The following restrictions generally apply to claims made before reaching German retirement age.',
    },
  ] as Block[],
  sixtyMonth: [
    { t: 'h3', x: 'Countries with a 60-Month Limit' },
    {
      t: 'p',
      x: 'Citizens of the USA, India, Australia, Canada, Brazil, Albania, Moldova, North Macedonia, The Philippines, South Korea, and Uruguay can generally only claim a refund if they have fewer than 60 months of German pension contributions.',
      sp: [
        { k: 'a', x: 'USA', href: '/usa' },
        { k: 'a', x: 'India', href: '/india' },
        { k: 'a', x: 'Australia', href: '/australia' },
        { k: 'a', x: 'Canada', href: '/canada' },
        { k: 'a', x: 'Brazil', href: '/brazil' },
        { k: 'a', x: 'Albania', href: '/albania' },
        { k: 'a', x: 'Moldova', href: '/moldova' },
        { k: 'a', x: 'North Macedonia', href: '/north-macedonia' },
        { k: 'a', x: 'The Philippines', href: '/thephilippines' },
        { k: 'a', x: 'South Korea', href: '/southkorea' },
        { k: 'a', x: 'Uruguay', href: '/uruguay' },
      ],
    },
    {
      t: 'p',
      x: 'Even a partial contribution month counts as one full month when determining whether this limit has been reached.',
    },
    { t: 'h3', x: 'Japanese Citizens' },
    {
      t: 'p',
      x: 'Japanese citizens currently living in Japan can generally only claim a refund if they have fewer than 60 months of German pension contributions.',
    },
    {
      t: 'p',
      x: 'If they live in another eligible country outside the EU and the UK, this 60-month restriction generally does not apply.',
    },
  ] as Block[],
  ctaStrip: [
    { label: 'Free Eligibility Check', href: CALCULATOR },
    {
      label: 'Answer a few questions to see if you could qualify',
      href: CALCULATOR,
    },
    { label: 'Estimate your refund', href: CALCULATOR },
  ],
  rest: [
    { t: 'h3', x: 'Citizens of Former Yugoslav States' },
    {
      t: 'p',
      x: 'Citizens of certain former Yugoslav states can generally only claim a refund before retirement age if they live outside the EU, the UK and the former Yugoslav region.',
    },
    { t: 'h3', x: 'Israeli Citizens' },
    {
      t: 'p',
      x: 'Israeli citizens can generally only claim a refund before retirement age if they currently live outside Israel and meet the other eligibility requirements.',
    },
    { t: 'h3', x: 'Other Nationalities' },
    {
      t: 'p',
      x: 'If your nationality is not listed above, the special 60-month restriction and other citizenship-related limitations described here normally do not apply. However, you must still meet the general eligibility requirements.',
    },
    {
      t: 'p',
      x: 'Not sure whether you qualify? Start with our free eligibility check. If you proceed with us, we prepare the documents and coordinate your claim with our German partner law firm. No upfront service fee — you pay only after your refund reaches escrow.',
    },
    {
      t: 'p',
      x: 'Full details: who can claim a German pension refund — the complete 2026 guide',
      sp: [
        {
          k: 'a',
          x: 'who can claim a German pension refund — the complete 2026 guide',
          href: GUIDE,
        },
      ],
    },
  ] as Block[],
};

// --- how much --------------------------------------------------------------

export const HOW_MUCH = {
  h2: 'How Much Can I Reclaim From My German Pension?',
  blocks: [
    {
      t: 'p',
      x: 'While you were employed in Germany, {{STAT-2026.employeeRate}} * was deducted from your gross salary up to the income threshold and transferred to the German Pension Insurance.',
    },
    {
      t: 'p',
      x: 'If you are a non-European citizen, you can claim your pension insurance contributions back after moving out of Germany, provided you are entitled to do so.',
    },
    {
      t: 'p',
      x: 'Use our free refund calculator to estimate your possible refund.',
      sp: [{ k: 'a', x: 'free refund calculator', href: CALCULATOR }],
    },
    {
      t: 'p',
      x: 'In our latest quarterly calculation ({{M-04.calculatedOn}}), the average pension refund was {{M-04.meanShort}} — and you do not need a German bank account to receive your funds.',
    },
    {
      t: 'p',
      x: '* Current rate since 2018, different in previous years',
      sp: [
        {
          k: 'a',
          x: '* Current rate since 2018, different in previous years',
          href: CONTRIBUTION_RATE_SOURCE,
        },
      ],
    },
  ] as Block[],
};

// --- about -----------------------------------------------------------------

export const ABOUT = {
  h2: 'About Germany Pension Refund',
  blocks: [
    {
      t: 'p',
      x: 'Germany Pension Refund is a service of Berlin-based ATLAES GmbH. Since 2015, we have supported non-EU citizens through the administrative process of claiming eligible contributions from the German Pension Insurance.',
    },
    {
      t: 'p',
      x: 'We bring experience with German pension refunds to the paperwork, pension-office correspondence and questions that come with claiming from abroad. We prepare your documents and coordinate the process; our German partner law firm reviews and submits your application. You have a team to turn to and clear explanations in English along the way.',
    },
    {
      t: 'p',
      x: 'Learn More About Us.',
      sp: [{ k: 'a', x: 'Learn More About Us.', href: '/about-us' }],
    },
    {
      t: 'p',
      x: 'We are experts on this topic. Your case managers — Julia, Christian and Johannes — specialize in social security agreements Germany has signed. Our experience goes back to the year 2015.',
    },
    {
      t: 'p',
      x: 'Read more.',
      sp: [{ k: 'a', x: 'Read more.', href: '/about-us' }],
    },
    {
      t: 'p',
      x: 'We provide free evaluation of your case - do not hesitate to contact us regarding your refund, eligibility, residence, waiting period, or anything else that comes up as you read.',
      sp: [
        { k: 'a', x: 'free evaluation', href: CALCULATOR },
        { k: 'a', x: 'contact us', href: FUNNEL_ENTRY },
      ],
    },
    {
      t: 'p',
      x: 'Read below how our most recent customers experienced working with us.',
    },
    {
      t: 'p',
      x: 'Or visit our Testimonials.',
      sp: [{ k: 'a', x: 'Testimonials', href: '/testimonials' }],
    },
  ] as Block[],
};

// --- reviews ---------------------------------------------------------------

const ratingParts = t('M-15.ratingExact').split('/');

export const REVIEWS_SECTION = {
  header: {
    x:
      ratingParts[0] +
      ' out of ' +
      ratingParts[1] +
      ' on ProvenExpert, based on {{M-16.countExact}} reviews, including {{M-16.aggregated}} reviews aggregated from three other sources (checked {{M-15.checkedOn}}). Read them directly on Google and ProvenExpert.',
    sp: [
      { k: 'a', x: 'Google', href: EXTERNAL.googleKg },
      { k: 'a', x: 'ProvenExpert.', href: EXTERNAL.provenExpert },
    ],
  } as RichText,
  footer: {
    x: 'Want to read more reviews? Visit our Testimonials Page →',
    sp: [{ k: 'a', x: 'Visit our Testimonials Page →', href: '/testimonials' }],
  } as RichText,
};

// --- FAQ (visible blocks + schema text) ------------------------------------

export interface HomeFaq {
  q: string;
  blocks: Block[];
  /** Answer text for the FAQPage schema — links and formatting stripped. */
  schema: string;
}

export const FAQ_H2 = 'Frequently Asked Questions';

export const FAQ: HomeFaq[] = [
  {
    q: 'Who can get a refund?',
    blocks: [
      {
        t: 'p',
        x: 'You must meet all three conditions: (1) you do not hold German, EU/EEA, Swiss or UK citizenship; (2) you live outside the EU and the UK — living in Norway, Iceland, Liechtenstein or Switzerland is fine; (3) at least 24 full calendar months have passed since your last mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia — new mandatory insurance in any of these countries restarts the 24 months. Our waiting-period calculator finds the exact date your waiting period ends, and our country pages cover citizenship-specific details.',
      },
    ],
    schema:
      'You must meet all three conditions: (1) you do not hold German, EU/EEA, Swiss or UK citizenship; (2) you live outside the EU and the UK — living in Norway, Iceland, Liechtenstein or Switzerland is fine; (3) at least 24 full calendar months have passed since your last mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia — new mandatory insurance in any of these countries restarts the 24 months.',
  },
  {
    q: 'How much is the service fee?',
    blocks: [
      {
        t: 'p',
        x: "Our service fee is 9.75% of your refund, capped at €2,500 including VAT, with no minimum fee and no upfront service payment. It covers application preparation, our German partner law firm's review and submission, routine correspondence and follow-up, English explanations and escrow processing. The fee is deducted only after your refund reaches escrow. If your claim produces no refund, there is no service fee.",
        sp: [
          { k: 'b', x: '9.75% of your refund, capped at €2,500 including VAT' },
        ],
      },
      {
        t: 'p',
        x: 'Optional deregistration assistance costs €50 including VAT. Client-to-us postage, local certification or notary fees and exceptional courier costs are separate unless we agree otherwise. Certified translations and separate legal representation for an objection, appeal or court proceeding require their own scope and cost agreement.',
      },
    ],
    schema:
      "Our service fee is 9.75% of your refund, capped at €2,500 including VAT, with no minimum fee and no upfront service payment. It covers application preparation, our German partner law firm's review and submission, routine correspondence and follow-up, English explanations and escrow processing. The fee is deducted only after your refund reaches escrow. If your claim produces no refund, there is no service fee. Optional deregistration assistance costs €50 including VAT. Client-to-us postage, local certification or notary fees and exceptional courier costs are separate unless we agree otherwise. Certified translations and separate legal representation for an objection, appeal or court proceeding require their own scope and cost agreement.",
  },
  {
    q: 'Can I apply for my pension refund myself, for free?',
    blocks: [
      {
        t: 'p',
        x: 'Yes. Applying directly to Deutsche Rentenversicherung is free. Our service brings application preparation, German law firm review and submission, German correspondence, follow-up and escrow payout together for you. You get support in English throughout, with the service fee due only after your refund reaches escrow.',
      },
      {
        t: 'p',
        x: 'If you prefer to manage the application yourself, our guide explains the process.',
        sp: [{ k: 'a', x: 'our guide', href: GUIDE }],
      },
    ],
    schema:
      'Yes. Applying directly to Deutsche Rentenversicherung is free. Our service brings application preparation, German law firm review and submission, German correspondence, follow-up and escrow payout together for you. You get support in English throughout, with the service fee due only after your refund reaches escrow. If you prefer to manage the application yourself, our guide explains the process.',
  },
  {
    q: 'I already applied — myself or through another agent. Can you take over?',
    blocks: [
      {
        t: 'p',
        x: 'Yes. We can take over a running claim, find out where your application stands and coordinate the next steps towards a decision.',
      },
      {
        t: 'p',
        x: 'If you are switching from another provider, your new power of attorney names our German partner law firm and includes a clause revoking your previous authorization when you sign. Any existing service contract has its own cancellation terms, which you should check separately. More on switching in our FAQ →',
        sp: [{ k: 'a', x: 'More on switching in our FAQ →', href: '/faqs' }],
      },
    ],
    schema:
      'Yes. We can take over a running claim, find out where your application stands and coordinate the next steps towards a decision. If you are switching from another provider, your new power of attorney names our German partner law firm and includes a clause revoking your previous authorization when you sign. Any existing service contract has its own cancellation terms, which you should check separately.',
  },
  {
    q: 'Will my refund arrive faster with your service?',
    blocks: [
      {
        t: 'p',
        x: 'Our process is designed to avoid preventable delays. We check your eligibility and documents, identify the responsible pension office and coordinate the application with our German partner law firm, which reviews and submits it. We then manage the follow-up and keep you informed.',
      },
      {
        t: 'p',
        x: 'In our latest processing-time review, {{M-12.count}} of our {{M-12.total}} most recent completed refunds ({{M-12.pct}}) reached the client escrow account within {{M-12.days}} days of complete submission. Individual processing times vary; the pension office determines the decision date. See the full data and methodology →',
        sp: [
          {
            k: 'b',
            x: resolveTokens(
              '{{M-12.count}} of our {{M-12.total}} most recent completed refunds ({{M-12.pct}}) reached the client escrow account within {{M-12.days}} days of complete submission'
            ),
          },
          {
            k: 'a',
            x: 'See the full data and methodology →',
            href: PROCESSING_TIME,
          },
        ],
      },
    ],
    schema:
      'Our process is designed to avoid preventable delays. We check your eligibility and documents, identify the responsible pension office and coordinate the application with our German partner law firm, which reviews and submits it. We then manage the follow-up and keep you informed. In our latest processing-time review, {{M-12.count}} of our {{M-12.total}} most recent completed refunds ({{M-12.pct}}) reached the client escrow account within {{M-12.days}} days of complete submission. Individual processing times vary; the pension office determines the decision date.',
  },
  {
    q: 'Is the refund taxable?',
    blocks: [
      {
        t: 'p',
        x: "In Germany, no — the refund is paid out without German tax deduction; German law exempts pension contribution refunds. Treatment in your country of residence can differ, and we don't provide tax advice — check with a local adviser if in doubt.",
      },
    ],
    schema:
      "In Germany, no — the refund is paid out without German tax deduction; German law exempts pension contribution refunds. Treatment in your country of residence can differ, and we don't provide tax advice — check with a local adviser if in doubt.",
  },
  {
    q: 'What documents do I need?',
    blocks: [
      {
        t: 'p',
        x: 'To get started, upload a copy of your passport, a payslip from your time in Germany and your deregistration confirmation (Abmeldebestätigung). Your account guides you through the questions and documents.',
      },
      {
        t: 'p',
        x: 'Missing your German pension number? We help recover it. Not deregistered yet? We offer deregistration assistance for €50 including VAT. If your claim needs additional documents or signed originals by post, we explain exactly what to provide.',
      },
    ],
    schema:
      'To get started, upload a copy of your passport, a payslip from your time in Germany and your deregistration confirmation (Abmeldebestätigung). Your account guides you through the questions and documents. Missing your German pension number? We help recover it. Not deregistered yet? We offer deregistration assistance for €50 including VAT. If your claim needs additional documents or signed originals by post, we explain exactly what to provide.',
  },
  {
    q: 'How is the refund paid?',
    blocks: [
      {
        t: 'p',
        x: 'Into the escrow account operated by our German partner law firm. After the agreed fee is deducted, the remaining balance is transferred to the bank account you nominate. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent.',
      },
    ],
    schema:
      'Into the escrow account operated by our German partner law firm. After the agreed fee is deducted, the remaining balance is transferred to the bank account you nominate. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent.',
  },
  {
    q: 'What is the average German refund amount?',
    blocks: [
      {
        t: 'p',
        x: 'In our latest quarterly calculation, dated {{M-04.calculatedOn}}, the average refund was {{M-04.mean}}, with a median of {{M-04.median}}. Our retained records include completed refunds from {{M-17.range}}; the largest recorded refund in the 2026 calculation was {{M-17.max2026}}. You do not need a German bank account to receive your funds — but the exact amount depends entirely on how much was deducted from your salary during your time working in Germany.',
      },
      {
        t: 'p',
        x: 'The refund is calculated by the German pension office (Deutsche Rentenversicherung) and is based on:',
      },
      {
        t: 'ul',
        items: [
          { x: 'Your gross income for each year worked in Germany' },
          { x: 'The official pension contribution rate for each year' },
          {
            x: 'The annual contribution cap ("Beitragsbemessungsgrenze") applied during your contribution periods',
          },
        ],
      },
      {
        t: 'p',
        x: "👉 Example: If you worked in 2025 and earned above the monthly cap of {{STAT-2026.ceiling2025}}, your annual pension contribution would be €8,983.80. That year alone would be fully refundable if you're eligible.",
      },
      {
        t: 'p',
        x: 'The pension office calculates your refund from your official contribution record. Eligible employee contributions are refunded in full, and the refund covers all eligible contribution periods together; you cannot select individual periods for a partial refund.',
      },
      {
        t: 'p',
        x: "You'll receive a full official refund statement from the German pension authority before any money is transferred or any fees apply.",
      },
    ],
    schema:
      "In our latest quarterly calculation, dated {{M-04.calculatedOn}}, the average refund was {{M-04.mean}}, with a median of {{M-04.median}}. Our retained records include completed refunds from {{M-17.range}}; the largest recorded refund in the 2026 calculation was {{M-17.max2026}}. You do not need a German bank account to receive your funds — but the exact amount depends entirely on how much was deducted from your salary during your time working in Germany. The pension office calculates your refund from your official contribution record. Eligible employee contributions are refunded in full, and the refund covers all eligible contribution periods together; you cannot select individual periods for a partial refund. You'll receive a full official refund statement from the German pension authority before any money is transferred or any fees apply.",
  },
];

export const FAQ_FOOTER: RichText = {
  x: 'Want to learn more? Visit our FAQ Section →',
  sp: [{ k: 'a', x: 'Visit our FAQ Section →', href: '/faqs' }],
};

/** The nine questions for the FAQPage node (schema text, tokens resolve in the builder). */
export const FAQ_SCHEMA: FaqItem[] = FAQ.map((f) => ({
  q: f.q,
  a: f.schema,
}));

// --- latest articles -------------------------------------------------------

export interface ArticleCard {
  title: string;
  href: string;
  description: string;
  /** Original publish date (ISO) when the sheet gives one. */
  datePublished?: string;
  dateModified?: string;
}

export const ARTICLES_H2 = 'Latest Articles on German Pension Refunds';

export const ARTICLES: ArticleCard[] = [
  {
    title: 'How to Claim a German Pension Refund: Complete 2026 Guide',
    href: GUIDE,
    description:
      'Worked in Germany and left? You may be able to claim your pension contributions back. This 2026 guide covers every rule that decides your case: eligibility by citizenship, the 60-month limit, the 24-month waiting period, how much you get back, forms, where to send your application, deadlines, objections and survivor claims — each with official sources. Check your eligibility, estimate your refund and choose how to proceed: apply yourself or use our managed service.',
    datePublished: '2025-07-15',
  },
  {
    title:
      'Can You Cash Out Your German Company Pension (bAV) After Leaving Germany?',
    href: BAV_ARTICLE,
    description:
      'Your German state pension refund and your company pension (bAV) are two separate claims — and the second is routinely forgotten. Once your DRV contributions have been refunded, § 3 (3) BetrAVG gives you the legal right to demand a lump-sum settlement of your vested company pension, whatever its size. This guide covers which schemes qualify, the 2026 small-entitlement thresholds, how the payout is calculated, tax when you live abroad, and the exact steps from refund to payout.',
  },
  {
    title:
      'German Pension Refund After Brexit: Rules for UK Nationals and UK Residents',
    href: BREXIT_ARTICLE,
    description:
      'Can you get a German pension refund after Brexit? This guide explains the rules for UK nationals and non-UK nationals living in the UK, including why one German contribution month can already block a refund before retirement age.',
  },
];

export const ARTICLES_FOOTER: RichText = {
  x: 'View all blog posts →',
  sp: [{ k: 'a', x: 'View all blog posts →', href: '/blog' }],
};

// --- structured data -------------------------------------------------------

export const HOME_SCHEMA = {
  serviceName: 'German Pension Refund Service',
  serviceDescription:
    'Fast, fully managed, success-based handling of German state pension contribution refunds for non-EU/non-UK citizens who have left Germany. No upfront payment and no minimum fee — the service fee is 9.75% of the refund, capped at €2,500 including VAT, and covers the agreed managed administrative scope, including partner law-firm support within that scope. ' +
    cap(t('TM-01.share')) +
    " of Germany Pension Refund's {{TM-01.population}} reached the client escrow account {{TM-01.window}}.",
};
