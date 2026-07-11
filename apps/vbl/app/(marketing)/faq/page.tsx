import Link from 'next/link';
import { Search } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// FAQ list (Figma 1204:17077, "General questions" category state). All ten
// questions and the first (expanded) answer are transcribed verbatim from the
// rendered canvas — the XML export only carries un-overridden component
// defaults. The design shows items 2–10 collapsed, so their answers are not
// readable from the anonymous Figma view; cross-checked against the Home,
// how-it-works and pricing transcriptions — no matching answered question
// exists. Until the client supplies the copy, those items carry a minimal
// placeholder. FLAGGED as a copy gap in the task report; NOT design copy.
// ---------------------------------------------------------------------------

const FAQ_ANSWER_PENDING = (
  <p>
    The full answer to this question will be published here soon. You can also{' '}
    <Link href="/get-started" className="font-semibold text-brand underline">
      start your claim
    </Link>{' '}
    to check your specific case.
  </p>
);

const GENERAL_FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'What is a company pension refund?',
    answer: (
      <>
        <p>
          A company pension refund means applying to get eligible employee
          contributions back from a contribution-based company pension scheme.
        </p>
        <p className="mt-2">
          This commonly applies to VBL, ZVK, VddB and VddKO cases.
        </p>
        <p className="mt-2">
          Usually, only eligible contributions paid by you as the employee are
          refundable. Employer-paid amounts are generally not refunded to you.
        </p>
        <p className="mt-2">
          A company pension refund is separate from a German state pension
          refund through Deutsche Rentenversicherung.
        </p>
      </>
    ),
  },
  {
    question: 'What is the difference between a refund and a bAV cashout?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question:
      'What is the difference between a company pension and the German state pension?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question:
      'Can I receive both a German state pension refund and money from my company pension?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Do I need to live outside Germany or the EU?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Do I need to wait 24 months?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'How much money can I get?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'How long does the process usually take?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    // Client-feedback governance (docs/client-feedback-status.md item 19: drop
    // only "free" from EUR-account wording) checked here. The answer to this
    // question is UNAUTHORED in the design (canvas shows it collapsed), so there
    // is no EUR-account wording on this page to adjust — item 19 does not apply
    // until the client supplies this answer's copy. Flagged in the task report.
    question: 'Do I need a German bank account?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Who receives the approved money?',
    answer: FAQ_ANSWER_PENDING,
  },
];

/**
 * Category cards (Figma 1203:17027). The design shows a six-card filter UI
 * with exactly one designed content state: "General questions" selected (dark
 * card) with the ten-question list below. The other five category states have
 * no designed question lists anywhere in the file, so the cards render the
 * canvas default state statically. FLAGGED: making the filter functional
 * needs the remaining category content from the client/designer.
 */
const FAQ_CATEGORIES = [
  'General questions',
  'bAV cash-outs',
  'VBL and ZVK refunds',
  'VddB and VddKO refunds',
  'Digital process and documents',
  'Pricing and payment',
];

/** Popular-search chips (Figma 1202:16953), verbatim canvas order. */
const POPULAR_SEARCHES = [
  'bAV',
  'Direktversicherung',
  'Allianz',
  'AXA',
  'Swiss Life',
  'ERGO',
  'R+V',
  'BVV',
  'VBL',
  'VBLklassik',
  'VBLextra',
  'ZVK',
  'VddB',
  'VddKO',
  'DRV',
  'Abfindung',
  'Deposit',
  'Bank account',
];

// ---------------------------------------------------------------------------
// Page (Figma frame 1199:11597 — "FAQ")
// ---------------------------------------------------------------------------

export default function FaqPage() {
  return (
    <>
      {/* ---- HERO (Figma 1199:11653) ---- */}
      <Hero
        eyebrow="FAQ"
        title="German company pension questions,"
        highlight="answered"
        body="Answers about bAV cash-outs and VBL, ZVK, VddB and VddKO refunds—including eligibility, DRV differences, pricing, documents and the digital application process."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        footnote={
          <>
            <p>
              The refund calculator is available for VBL, ZVK, VddB and VddKO.
              It is not used for bAV cash-outs.
            </p>
            <p className="mt-1">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </>
        }
      />

      {/* ---- SEARCH + CATEGORIES + QUESTIONS (Figma 1202:14495) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          {/* Search field (Figma 1202:16875). Static presentation for now —
              the page is a server component and search needs client behavior
              plus a search index; flagged in the task report. */}
          <div className="mx-auto flex max-w-3xl items-center gap-4 rounded-2xl bg-white px-6 py-5 shadow-sm">
            <Search className="h-6 w-6 shrink-0 text-gray-400" aria-hidden />
            <span className="text-lg text-gray-400">
              Search company pension questions
            </span>
          </div>

          {/* Popular searches (Figma 1202:16953) */}
          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-start justify-center gap-x-3 gap-y-3">
            <span className="py-1 text-base font-semibold text-gray-900">
              Popular searches:
            </span>
            {POPULAR_SEARCHES.map((term) => (
              <span
                key={term}
                className="rounded-lg bg-accent/10 px-7 py-1 text-base text-gray-700"
              >
                {term}
              </span>
            ))}
          </div>

          {/* Category cards (Figma 1203:17027) — canvas default state:
              "General questions" selected; the list below is that category. */}
          <div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FAQ_CATEGORIES.map((category, index) => (
              <div
                key={category}
                className={`rounded-xl px-6 py-6 text-lg font-semibold ${
                  index === 0
                    ? 'bg-brand text-white'
                    : 'border border-neutral-400 bg-white text-gray-900'
                }`}
              >
                {category}
              </div>
            ))}
          </div>

          {/* Question list (Figma 1204:17077) */}
          <div className="mx-auto mt-10 max-w-5xl">
            <FaqAccordion items={GENERAL_FAQ_ITEMS} defaultOpenIndex={0} />
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1204:17088) ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Ready to check your{' '}
            <span className="text-accent">company pension?</span>
          </>
        }
        body="Start the guided claim flow for a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note={
          <>
            <span className="block text-accent">
              The refund calculator is available for VBL, ZVK, VddB and VddKO.
              It is not used for bAV cash-outs.
            </span>
            <span className="mt-2 block">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </span>
          </>
        }
      />
    </>
  );
}
