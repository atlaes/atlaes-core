/**
 * /pricing copy — verbatim from the Pricing Page Content Handoff
 * (26 Aug 2026): H1 + intro + CTA, the three pricing cards, five FAQs,
 * "What the Fee Actually Buys", "We Are Here for You". The timing evidence
 * is the TM-01/M-12 set from the token store. Schema: WebPage +
 * BreadcrumbList + Service + FAQPage (Appendix B).
 */
import type { Block, FaqItem, RichText } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';

export const PATH = '/pricing';

const CALCULATOR = '/refund-calculator';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const GUIDE = '/post/how-to-get-a-german-pension-refund';

export const PRICING_META = {
  title: 'German Pension Refund Pricing: 9.75% Fee, €2,500 Cap',
  description:
    "One success fee: 9.75% of your refund, capped at €2,500 including VAT. No minimum, nothing upfront — no refund, no fee. See exactly what's included.",
};

export const PRICING_HERO = {
  h1: 'German Pension Refund Pricing',
  tagline: 'Low fee. No minimum. Never more than €2,500.',
  intro:
    'Our success fee is 9.75% of your refund — and the €2,500 cap, VAT included, applies automatically when your refund is large.',
  cta: { label: 'Claim Your Refund Today', href: FUNNEL_ENTRY },
};

export interface PricingCard {
  id: string;
  title: string;
  /** Price / status line shown above the title ("FREE", "€50 add-on …"). */
  badge: string;
  featured?: boolean;
  blocks: Block[];
  button: { label: string; href: string };
}

export const PRICING_PLANS = {
  h2: 'Our Pricing Plans',
  intro:
    'Transparency is one of our core values — the pricing is simple enough to fit on three cards.',
  cards: [
    {
      id: 'eligibility-check',
      title: 'Eligibility Check',
      badge: 'FREE',
      blocks: [
        {
          t: 'p',
          x: 'Find out whether a German pension refund appears to fit your case — a preliminary indication, free, no sign-up. For citizens of countries outside the EU, the EEA, Switzerland and the UK.',
        },
      ],
      button: { label: 'FREE CHECK', href: CALCULATOR },
    },
    {
      id: 'german-pension-refund',
      title: 'German Pension Refund',
      badge: 'Core service',
      featured: true,
      blocks: [
        {
          t: 'ul',
          items: [
            {
              x: 'Service fee: 9.75% of your refund — no minimum, nothing upfront',
              sp: [{ k: 'b', x: '9.75% of your refund' }],
            },
            {
              x: 'Capped at €2,500 including VAT — you never pay more, even for the largest refunds',
              sp: [{ k: 'b', x: 'Capped at €2,500 including VAT' }],
            },
            {
              x: 'No refund, no fee — the fee is deducted only after your refund reaches escrow',
              sp: [{ k: 'b', x: 'No refund, no fee' }],
            },
            {
              x: "Refund received in our German partner law firm's escrow account, then forwarded to the account you nominate",
              sp: [{ k: 'b', x: "German partner law firm's escrow account" }],
            },
            {
              x: 'No German bank account required',
              sp: [{ k: 'b', x: 'No German bank account required' }],
            },
            {
              x: 'Plain-English explanations of ordinary German correspondence and the refund decision included (not certified translations)',
            },
          ],
        },
      ],
      button: { label: 'CLAIM NOW', href: FUNNEL_ENTRY },
    },
    {
      id: 'german-deregistration',
      title: 'German Deregistration (Abmeldung)',
      badge: '€50 add-on, including VAT',
      blocks: [
        {
          t: 'p',
          x: 'Optional add-on to a managed claim: we assist with your German deregistration. The add-on fee is payable together with the core service fee after the refund reaches escrow — nothing upfront here either.',
        },
        {
          t: 'p',
          x: 'Requirements: proof of identity (identity card, passport or passport replacement). An adult family member can deregister the entire family.',
        },
      ],
      button: { label: 'START HERE', href: FUNNEL_ENTRY },
    },
  ] as PricingCard[],
  after:
    'You may also apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
};

export interface PricingFaq {
  q: string;
  blocks: Block[];
  /** FAQPage answer (Appendix B). */
  schema: string;
}

export const PRICING_FAQ_H2 = 'Frequently Asked Questions';

export const PRICING_FAQ: PricingFaq[] = [
  {
    q: 'Do I have to pay anything upfront?',
    blocks: [
      {
        t: 'p',
        x: 'No. There is no upfront fee for the core managed refund service — the fee is success-based, so you only pay after your refund has been received. No hidden charges or prepayments.',
      },
    ],
    schema:
      'No. There is no upfront fee for the core managed refund service — the fee is success-based, so you only pay after your refund has been received. No hidden charges or prepayments.',
  },
  {
    q: 'How much is the service fee?',
    blocks: [
      {
        t: 'p',
        x: 'Our service fee is 9.75% of your refunded amount, and it is capped: you will never pay more than €2,500, even if your refund is very large. If your refund is €30,000, your fee is €2,500, not €2,925. The fee includes VAT and covers the agreed managed administrative-claim scope, including legal support provided by the external partner law firm within that scope. Separate representation in an objection, appeal or court proceeding is not included automatically.',
      },
    ],
    schema:
      'The service fee is 9.75% of the refunded amount, capped at €2,500 including VAT — you never pay more, even for very large refunds. Example: for a €30,000 refund the fee is €2,500, not €2,925. The fee covers the agreed managed administrative-claim scope, including legal support provided by the external partner law firm within that scope; separate representation in an objection, appeal or court proceeding is not included automatically.',
  },
  {
    q: 'How do I pay the service fee?',
    blocks: [
      {
        t: 'p',
        x: "You don't make any manual payment. After the refund reaches the escrow account, the agreed service fee is deducted and the remaining balance is transferred to the bank account you nominate.",
      },
    ],
    schema:
      'No manual payment is needed. After the refund reaches the escrow account operated by the German partner law firm, the agreed service fee is deducted and the remaining balance is transferred to the bank account you nominate.',
  },
  {
    q: 'Is the refund sent directly to me?',
    blocks: [
      {
        t: 'p',
        x: 'No — it takes one deliberate step in between. The pension office pays the refund into the escrow account operated by our German partner law firm; the agreed service fee is deducted there, and the remaining balance is then transferred to the bank account you nominate. That in-between step is why you never pay anything upfront or make a manual payment. A German bank account is not required. Transfers outside Germany can carry transfer or currency-conversion costs, and account-holder checks, international sanctions and banking restrictions can limit where and in which currency the money can be sent.',
      },
    ],
    schema:
      'No — it takes one deliberate step in between. The pension office pays the refund into the escrow account operated by the German partner law firm; the agreed service fee is deducted there, and the remaining balance is then transferred to the bank account you nominate. That step is why there is no upfront or manual payment. A German bank account is not required. Transfers outside Germany can carry transfer or currency-conversion costs, and account-holder checks, international sanctions and banking restrictions can limit where and in which currency the money can be sent.',
  },
  {
    q: "What happens if I don't qualify or my claim is rejected?",
    blocks: [
      {
        t: 'p',
        x: "Then there is no service fee — that's our no refund, no fee principle. (Separately agreed third-party costs, such as a local notary, are the only exception; the core law-firm and escrow costs are included.)",
      },
    ],
    schema:
      'If the managed claim produces no refund, no core service fee is charged — no refund, no fee. Separately agreed third-party costs, such as a local notary, are the only exception; the core law-firm and escrow costs are included.',
  },
];

export const PRICING_FAQ_SCHEMA: FaqItem[] = PRICING_FAQ.map((f) => ({
  q: f.q,
  a: f.schema,
}));

export const PRICING_FAQ_FOOTER: RichText = {
  x: 'More answers on our dedicated FAQ page.',
  sp: [{ k: 'a', x: 'FAQ page', href: '/faqs' }],
};

export const PRICING_FEE_BUYS = {
  h2: 'What the Fee Actually Buys',
  blocks: [
    {
      t: 'p',
      x: 'Peace of mind, mostly. From the day your claim starts, someone whose job this is takes care of it from A to Z: we check eligibility before filing a managed claim, prepare the application and payment documents, identify the recommended first pension office and route the claim accordingly — the unglamorous groundwork behind a process designed to avoid preventable delays.',
    },
    {
      t: 'p',
      x: "Then the part you'd otherwise dread: the pension office writes in German, and we answer in German. Ordinary correspondence and follow-up are handled within the agreed scope, known response and objection deadlines are monitored, and we explain the letters and the refund decision to you in plain English — so a Bescheid in the mail is a status update, not a homework assignment. Should a letter still reach you directly, you simply forward it and we take it from there.",
    },
    {
      t: 'p',
      x: 'And you\'re never left wondering. During an active claim you receive a status update at least every four weeks — and earlier when a material request or development occurs. Silence from the pension office doesn\'t mean silence from us: you always know your claim is being looked after, even in the weeks where the honest update is "no news yet."',
    },
    {
      t: 'p',
      x: 'You could do every step of this yourself — applying directly to the pension office costs nothing. The fee buys the version where trained eyes do it: {{TM-01.share}} of our {{TM-01.population}} reached the client escrow account {{TM-01.window}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission — see the full data and methodology. Individual processing times vary, because the responsible pension office controls processing — but preparation, routing and follow-up are exactly the parts that keep a claim from stalling.',
      sp: [
        {
          k: 'a',
          x: 'see the full data and methodology',
          href: PROCESSING_TIME,
        },
      ],
    },
    {
      t: 'p',
      x: 'From your side it stays simple: answer a few questions to check if you are eligible, sign your agreement — and you pay only if your refund succeeds.',
      sp: [{ k: 'a', x: 'check if you are eligible', href: FUNNEL_ENTRY }],
    },
  ] as Block[],
};

export const PRICING_HERE_FOR_YOU = {
  h2: 'We Are Here for You',
  blocks: [
    {
      t: 'p',
      x: 'Questions about your eligibility, residency, the waiting period or the refund process? Contact us — we are happy to hear from you and will reply shortly. Starting your claim takes less than one minute.',
      sp: [
        { k: 'a', x: 'eligibility', href: GUIDE },
        { k: 'a', x: 'Contact us', href: '/contact-us' },
      ],
    },
  ] as Block[],
};

/** Appendix B descriptions. */
export const PRICING_SCHEMA = {
  webPageDescription:
    'Pricing for the managed German pension refund service: a success fee of 9.75% of the refund, capped at €2,500 including VAT, with no minimum and no upfront payment. Free eligibility check; optional German deregistration add-on for €50 including VAT.',
  serviceName: 'German Pension Refund Service',
  serviceDescription:
    "Managed handling of German pension refund claims: eligibility review, application preparation, correspondence within the agreed scope, and payout via the partner law firm's escrow account. Success fee of 9.75% of the refund, capped at €2,500 including VAT — no minimum and no upfront fee; if the managed claim produces no refund, no core service fee is charged. Optional German deregistration add-on: €50 including VAT.",
};
