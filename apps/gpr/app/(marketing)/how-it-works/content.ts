/**
 * /how-it-works copy — verbatim from the How It Works Page Content Handoff
 * v1.4 (8 Sep 2026): H1 + intro + kicker + CTA, three numbered steps, the
 * unnumbered "Receive your refund" stage, fee, takeover, eight FAQs, closing
 * CTA + ID-02. The timing set is the TM-01/M-12 composite from the token
 * store. No HowTo markup (BreadcrumbList + WebPage + FAQPage only).
 */
import type { Block, FaqItem } from '@/content/types';
import { FUNNEL_ENTRY } from '@/content/registries/links';

export const PATH = '/how-it-works';

const PROCESSING_TIME = '/german-pension-refund-processing-time';
const CALCULATOR = '/refund-calculator';
const GUIDE = '/post/how-to-get-a-german-pension-refund';

export const HIW_META = {
  title: 'Claim Your German Pension Refund | How It Works',
  description:
    'Check your eligibility for free, apply online and let us handle the German paperwork. No upfront service fee. Pay only when your refund is received.',
};

export const HIW_HERO = {
  h1: 'How It Works: Your German Pension Refund, Made Simple',
  intro:
    'Check your eligibility, complete your details online, and leave the paperwork to us. We coordinate your claim with our German partner law firm and keep you informed through to your payout.',
  kicker:
    'German law firm support · Updates in English · No upfront service fee',
  cta: { label: 'Check your eligibility — free →', href: FUNNEL_ENTRY },
  ctaMicro: 'No name, email or phone number needed.',
};

export interface HiwSection {
  id: string;
  label: string;
  /** Step number for the numbered steps; the final stage is unnumbered. */
  n?: number;
  h2: string;
  blocks: Block[];
  documents?: string[];
  after?: Block[];
  cta?: { label: string; href: string };
}

export const HIW_SECTIONS: HiwSection[] = [
  {
    id: 'check-your-eligibility',
    label: 'Step 1',
    n: 1,
    h2: 'Check your eligibility',
    blocks: [
      {
        t: 'p',
        x: 'Start with your citizenship and the country you live in. Our free checker guides you through the questions, gives you an initial eligibility result and, if you qualify, helps you estimate your refund — all before you create an account.',
      },
      {
        t: 'p',
        x: 'Still in your 24-month waiting period? You can get started now. We can prepare your application with you so it is ready to submit as soon as you become eligible.',
      },
    ],
  },
  {
    id: 'complete-your-details',
    label: 'Step 2',
    n: 2,
    h2: 'Complete your details and upload your documents',
    blocks: [
      {
        t: 'p',
        x: 'Create your account and sign your power of attorney digitally to authorize our German partner law firm to act on your behalf. Then follow the guided questions and upload three documents to get started:',
      },
    ],
    documents: [
      'A copy of your passport',
      'A payslip from your time in Germany',
      'Your deregistration confirmation (Abmeldebestätigung)',
    ],
    after: [
      {
        t: 'p',
        x: 'Your account keeps your details, documents and signatures together in one place. If you need help along the way, we are here to guide you.',
      },
      {
        t: 'p',
        x: 'Not deregistered yet? We can take care of it for €50 including VAT as an optional add-on. Missing your German pension number? We help recover it.',
        sp: [{ k: 'b', x: '€50 including VAT' }],
      },
    ],
  },
  {
    id: 'sit-back-and-relax',
    label: 'Step 3',
    n: 3,
    h2: 'Sit back and relax',
    blocks: [
      {
        t: 'p',
        x: 'We prepare your application and identify the pension office responsible for your claim. Our German partner law firm reviews the application and submits it to Deutsche Rentenversicherung.',
      },
      {
        t: 'p',
        x: 'From there, we handle routine correspondence and coordinate follow-up, with the important details explained in English. You do not need to speak German or work through the forms yourself. If a letter reaches you directly, simply forward it to us.',
      },
      {
        t: 'p',
        x: 'You hear from us at least every four weeks after submission — even if it is just to confirm that your claim is still in progress — and sooner whenever there is an important development or the office needs something from you.',
        sp: [
          {
            k: 'b',
            x: 'You hear from us at least every four weeks after submission',
          },
        ],
      },
    ],
  },
  {
    id: 'receive-your-refund',
    label: 'Your refund',
    h2: 'Receive your refund',
    blocks: [
      {
        t: 'p',
        x: 'Once your claim is approved, you receive the full official refund statement with the key details explained in English — before any service fee is deducted or your payout is transferred.',
      },
      {
        t: 'p',
        x: 'Your refund is paid into the escrow account operated by our German partner law firm. The agreed fee is deducted there, and the balance is transferred to the bank account you nominate. You do not need a German bank account.',
        sp: [{ k: 'b', x: 'You do not need a German bank account.' }],
      },
      {
        t: 'p',
        x: 'Your payout is usually sent within a few working days of the refund reaching escrow. Need it urgently? Let us know so we can prioritize it.',
      },
    ],
  },
  {
    id: 'no-refund-no-service-fee',
    label: 'Fee',
    h2: 'No refund, no service fee',
    blocks: [
      {
        t: 'p',
        x: '9.75% of your refund, capped at €2,500 including VAT. No minimum fee. No upfront service fee.',
        sp: [
          {
            k: 'b',
            x: '9.75% of your refund, capped at €2,500 including VAT. No minimum fee. No upfront service fee.',
          },
        ],
      },
      {
        t: 'p',
        x: "That covers application preparation, our partner law firm's review and submission, routine correspondence and follow-up, English explanations and escrow processing.",
      },
      {
        t: 'p',
        x: 'You pay from the refund received in escrow. If your claim produces no refund, there is no service fee. And however large your refund, your service fee never exceeds €2,500.',
      },
      {
        t: 'p',
        x: 'See pricing and full service details →',
        sp: [
          {
            k: 'a',
            x: 'See pricing and full service details →',
            href: '/pricing',
          },
        ],
      },
    ],
  },
  {
    id: 'already-started-a-claim',
    label: 'Switching',
    h2: 'Already started a claim? We can take it from here.',
    blocks: [
      {
        t: 'p',
        x: 'Whether you applied yourself or through another provider, we can take over your running claim. We establish where your application stands, identify what is needed and coordinate the next steps towards a decision.',
      },
      {
        t: 'p',
        x: 'Find out how to switch →',
        sp: [{ k: 'a', x: 'Find out how to switch →', href: '/faqs' }],
      },
    ],
  },
];

export interface HiwFaq {
  q: string;
  blocks: Block[];
  /** FAQPage answer — links and the CTA link line stripped. */
  schema: string;
}

export const HIW_FAQ_H2 = 'Frequently asked questions';

export const HIW_FAQ: HiwFaq[] = [
  {
    q: 'How much could I get back?',
    blocks: [
      {
        t: 'p',
        x: 'Your refund depends on your contribution history. Our free calculator helps you estimate the amount based on your work in Germany, so you can see what your claim could be worth before getting started. Deutsche Rentenversicherung confirms the final amount in its refund decision.',
      },
      {
        t: 'p',
        x: 'Estimate your refund →',
        sp: [{ k: 'a', x: 'Estimate your refund →', href: CALCULATOR }],
      },
    ],
    schema:
      'Your refund depends on your contribution history. Our free calculator helps you estimate the amount based on your work in Germany, so you can see what your claim could be worth before getting started. Deutsche Rentenversicherung confirms the final amount in its refund decision.',
  },
  {
    q: 'How long does processing take?',
    blocks: [
      {
        t: 'p',
        x: '{{TM-01.sentence.hero}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission. Careful preparation, submission to the responsible office and coordinated follow-up help avoid preventable delays. Individual processing times vary, and decision and payment dates cannot be guaranteed. See our full processing results and methodology →',
        sp: [
          {
            k: 'a',
            x: 'See our full processing results and methodology →',
            href: PROCESSING_TIME,
          },
        ],
      },
    ],
    schema:
      '{{TM-01.sentence.hero}} — {{M-12.count}} of {{M-12.total}} ({{M-12.pct}}) within {{M-12.days}} days of complete submission. Careful preparation, submission to the responsible office and coordinated follow-up help avoid preventable delays. Individual processing times vary, and decision and payment dates cannot be guaranteed.',
  },
  {
    q: 'Can I complete everything online?',
    blocks: [
      {
        t: 'p',
        x: 'Most clients complete their part entirely online, including uploading documents and signing digitally. Some pension offices require original documents by post for particular claims. If yours needs originals or additional documents, we explain exactly what to provide and where to send it.',
      },
    ],
    schema:
      'Most clients complete their part entirely online, including uploading documents and signing digitally. Some pension offices require original documents by post for particular claims. If yours needs originals or additional documents, we explain exactly what to provide and where to send it.',
  },
  {
    q: 'Why does my refund go through an escrow account?',
    blocks: [
      {
        t: 'p',
        x: 'Your refund is received in an escrow account operated by our German partner law firm. The firm deducts the agreed service fee and arranges the transfer of your remaining balance. This brings receipt of the refund, payment for the service and your onward payout together in one managed process.',
      },
    ],
    schema:
      'Your refund is received in an escrow account operated by our German partner law firm. The firm deducts the agreed service fee and arranges the transfer of your remaining balance. This brings receipt of the refund, payment for the service and your onward payout together in one managed process.',
  },
  {
    q: 'Can you pay into my account abroad?',
    blocks: [
      {
        t: 'p',
        x: 'Yes — you do not need a German bank account. Payment to your nominated account is subject to account-holder checks and applicable banking and sanctions restrictions, which can affect the destinations and currencies available.',
      },
    ],
    schema:
      'Yes — you do not need a German bank account. Payment to your nominated account is subject to account-holder checks and applicable banking and sanctions restrictions, which can affect the destinations and currencies available.',
  },
  {
    q: 'Are there any additional costs?',
    blocks: [
      {
        t: 'p',
        x: 'Optional deregistration assistance costs €50 including VAT. Depending on your case, you may also need to pay for postage, local certification or notarisation, or exceptional courier services; these costs are yours unless we agree otherwise. We explain any such requirements upfront. Certified translations and separate objection, appeal or court representation are outside the standard service.',
      },
    ],
    schema:
      'Optional deregistration assistance costs €50 including VAT. Depending on your case, you may also need to pay for postage, local certification or notarisation, or exceptional courier services; these costs are yours unless we agree otherwise. We explain any such requirements upfront. Certified translations and separate objection, appeal or court representation are outside the standard service.',
  },
  {
    q: 'How do I switch from another provider?',
    blocks: [
      {
        t: 'p',
        x: 'Your new power of attorney revokes the previous one when you sign, allowing our German partner law firm to take over representation. Any service contract with your previous provider has its own cancellation terms, which you should check separately.',
      },
    ],
    schema:
      'Your new power of attorney revokes the previous one when you sign, allowing our German partner law firm to take over representation. Any service contract with your previous provider has its own cancellation terms, which you should check separately.',
  },
  {
    q: 'Can I apply myself?',
    blocks: [
      {
        t: 'p',
        x: 'Yes. Applying directly to Deutsche Rentenversicherung is free. Our service gives you professional application handling, German law firm support, ongoing follow-up, English explanations and a managed payout — with the service fee due only on success. If you prefer to handle the application yourself, our complete guide explains the process.',
        sp: [
          {
            k: 'a',
            x: 'our complete guide explains the process',
            href: GUIDE,
          },
        ],
      },
    ],
    schema:
      'Yes. Applying directly to Deutsche Rentenversicherung is free. Our service gives you professional application handling, German law firm support, ongoing follow-up, English explanations and a managed payout — with the service fee due only on success. If you prefer to handle the application yourself, our complete guide explains the process.',
  },
];

export const HIW_FAQ_SCHEMA: FaqItem[] = HIW_FAQ.map((f) => ({
  q: f.q,
  a: f.schema,
}));

export const HIW_CLOSE = {
  h2: 'Find out what you could get back',
  text: 'Your first step is free. Check your eligibility and estimate your refund before creating an account.',
  cta: { label: 'Check your eligibility — free →', href: FUNNEL_ENTRY },
};
