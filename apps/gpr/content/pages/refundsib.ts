/**
 * /refundsib copy — verbatim from the GPR Figma frame "Refund SiB (partner
 * page)" (822:2054, live www page 14 Sep 2026); the three collapsed FAQ
 * answers come from that live page. noindex,follow partner landing (Settle
 * in Berlin). Quarterly figures are token references; the frame's stripped
 * "Q" markers are gone.
 */
import type { Block, FaqItem } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';

export const PATH = '/refundsib';

const GUIDE = '/post/how-to-get-a-german-pension-refund';
const PROCESSING_TIME = '/german-pension-refund-processing-time';
const PRICING = '/pricing';

export const SIB_META = {
  title: 'From Settle in Berlin? Check your German pension refund here',
  description:
    'Settle in Berlin readers land on this page for one reason: you worked in Germany, you have left or are about to, and you want to know whether the pension contributions you paid come back. This page answers that in under a minute — and if the answer is yes, we can handle the whole refund for you.',
};

export const SIB_HERO = {
  crumbs: [
    { label: 'Home', href: '/' },
    { label: 'Settle in Berlin readers', href: PATH },
  ],
  badge: 'In partnership with Settle in Berlin',
  eyebrow: 'Partner landing page · Settle in Berlin',
  h1: 'From Settle in Berlin? Check your German pension refund here',
  lead: SIB_META.description,
  noticeLabel: 'Service Notice',
  notice:
    'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
  aboutLabel: 'About Our Partnership',
  about:
    'Who we are, in two sentences: Germany Pension Refund is a private Berlin service that has been handling German pension contribution refunds since 2015, operated by ATLAES GmbH. Our current retained records document more than {{M-14.amount}} recovered for clients since {{M-14.since}}.',
};

export const SIB_STEP1 = {
  label: 'Step 1 widget',
  h2: 'Step 1 — check whether you qualify, in under a minute',
  stepLabel: 'Step 1 of 3 · Eligibility',
  hint: 'More than one citizenship? Every passport counts — select any EU, EEA, Swiss or UK one here; it blocks the refund even unused.',
  aside:
    'The check applies the rules below for you. If you are an EU citizen, expect a "not eligible" — that is the most common result for Berlin expats, and it is worth knowing in under a minute rather than after weeks of paperwork.',
};

export const SIB_RULES = {
  label: 'Rules',
  h2: 'The rules the checker applies',
  intro:
    'Before retirement age, three conditions must hold for most applicants:',
  rules: [
    {
      n: '01',
      h3: 'Citizenship',
      p: 'You are not a citizen of Germany, an EU or EEA country, Switzerland or the UK. Every citizenship you hold counts — one blocking passport blocks, even if you never use it.',
    },
    {
      n: '02',
      h3: 'Residence',
      p: 'You live outside the EU and the UK. Norway, Iceland, Liechtenstein and Switzerland are fine as countries of residence.',
    },
    {
      n: '03',
      h3: 'Waiting period',
      p: 'At least 24 full calendar months have passed since your last mandatory pension insurance in Germany, the EU, the UK, Türkiye, Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia or Serbia. You can apply from the 1st of the 25th month.',
    },
  ],
  note: {
    x: 'One further limit applies only to citizens of the USA, India, Canada, Australia, Brazil, South Korea, the Philippines, Albania, Moldova, North Macedonia and Uruguay — and to Japanese citizens, refugees and stateless persons living in Japan: a refund is possible only with fewer than 60 German contribution months. Special rules exist for some situations (living in India or Israel, citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia, retirement-age cases) — the checker gives a preliminary indication, not an individual legal decision; edge cases get individual review. The complete rules are in our full guide.',
    sp: [{ k: 'a' as const, x: 'our full guide', href: GUIDE }],
  },
};

export const SIB_SERVICE = {
  label: 'What we do',
  h2: 'If you qualify — what we do',
  intro:
    'Everything is doable on your own; the official forms are free. If you would rather not run a German administrative procedure from abroad, our managed service takes it over:',
  cards: [
    {
      n: '01',
      p: 'We check your eligibility before anything is filed and prepare the application and payment documents from the information and evidence you provide.',
    },
    {
      n: '02',
      p: 'Our German partner law firm files the claim with the recommended pension office; ordinary German-language correspondence and follow-up are handled within the agreed scope — pension-office letters reach you as scans, explained in plain English.',
    },
    {
      n: '03',
      p: 'Your refund is paid out through the escrow account operated by our German partner law firm; after the agreed fee is deducted, the balance is transferred to the bank account you nominate. No German bank account is required.',
    },
    {
      n: '04',
      p: 'Fully digital in most cases. When DRV Oldenburg-Bremen is the office responsible for your refund, we prepare the power of attorney and payment declaration and ask you to send us the signed originals — a limited exception rather than the rule.',
    },
  ],
  fee: {
    x: 'The fee: Our fee is 9.75% of the refunded amount, capped at €2,500 including VAT, with no upfront payment and no minimum fee. No refund, no fee. Details',
    sp: [
      { k: 'b' as const, x: 'The fee:' },
      { k: 'a' as const, x: 'Details', href: PRICING },
    ],
  },
};

export const SIB_EXPECT = {
  label: 'What to expect',
  h2: 'What to expect',
  cards: [
    {
      h3: 'Amount.',
      x: "Our clients' average refund is {{M-04.meanShort}} (calculated {{M-04.calculatedOn}}). Your own estimate from the checker above is based on each year's official employee contribution rate and ceiling — the exact refund follows your official insurance record.",
    },
    {
      h3: 'Timing.',
      x: '{{TM-01.sentence.hero}} — {{M-12.count}} of {{M-12.total}}, or {{M-12.pct}}, within {{M-12.days}} days (dataset {{S-14.dataset}}). That is measured elapsed time for completed refunds, not a promise for new claims; processing time depends on the responsible pension office. See the full data and methodology.',
      sp: [
        {
          k: 'a' as const,
          x: 'See the full data and methodology',
          href: PROCESSING_TIME,
        },
      ],
    },
    {
      h3: 'Reviews.',
      x: '{{M-15.sentence.exact}}.',
      provenExpert: true,
    },
  ],
};

export const SIB_FAQ = {
  label: 'SiB FAQ',
  h2: 'Questions Settle in Berlin readers ask',
  items: [
    {
      q: "I'm an EU citizen who worked in Berlin — do I get a refund?",
      a: 'Not before retirement age. As a citizen of the EU, EEA, Switzerland or the UK, you keep the right to contribute to the German pension system, so contribution refunds are not available. Your contributions are not lost — they count towards a German pension at retirement age, and if your German record stays under five qualifying years, a refund becomes possible once you reach German retirement age.',
    },
    {
      q: "I'm still in Germany, or I only just left — when can I apply?",
      a: "A refund can be filed 24 full calendar months after your last German pension contribution, from the 1st of the 25th month. You don't have to wait to start: sign up now, we prepare everything so your claim is filed on the first possible date — and about two months before, we confirm with you that nothing has changed.",
    },
    {
      q: 'What does it cost?',
      a: '9.75% of the refunded amount, capped at €2,500 including VAT — no upfront payment, no minimum fee. If the managed claim produces no refund, no core service fee is charged.',
    },
    {
      q: 'Do I need a German bank account?',
      a: 'No. Your refund is paid through the escrow account operated by our German partner law firm and then transferred to the account you nominate. Account-holder checks, international sanctions and banking restrictions can limit where — and in which currency — the money can be sent.',
    },
  ] as FaqItem[],
};

export const SIB_CLOSE = {
  h2: 'Ready?',
  text: 'Run the check above, or start your claim directly — starting takes less than one minute, and you pay only if your refund succeeds.',
  cta: { label: 'Start my claim', href: FUNNEL_ENTRY },
};

export type { Block };
