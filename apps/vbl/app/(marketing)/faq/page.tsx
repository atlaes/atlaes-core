import { Search } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// FAQ list — "General questions" category (Figma 1204:17077). Questions follow
// the design; answers are sourced from the client's FAQ master copy in Google
// Drive ("FAQ CompanyPension 22062026.pdf", DEV - CompanyPension - FE content),
// "General questions" section. The five other categories in the master
// (bAV cash-outs, VBL/ZVK, VddB/VddKO, digital process, pricing) are not yet
// wired to the static category filter — tracked as the full interactive FAQ
// follow-up. Bank-account answer drops "free" from the EUR-account wording per
// client-feedback governance (docs/client-feedback-status.md item 19).
// ---------------------------------------------------------------------------

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
    question: 'What is the difference between a refund and a bAV cash-out?',
    answer: (
      <>
        <p>
          A refund means applying to get eligible employee contributions back
          from a contribution-based pension scheme.
        </p>
        <p className="mt-2">
          A bAV cash-out means requesting a one-time payout or lump-sum
          settlement of a company pension entitlement that would otherwise
          remain in place.
        </p>
        <p className="mt-2">In general:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>VBL, ZVK, VddB and VddKO are handled as refund cases</li>
          <li>
            Direktversicherung and other provider-based bAV cases are checked
            for a possible cash-out or lump-sum settlement
          </li>
        </ul>
        <p className="mt-2">
          The German term Abfindung means a lump-sum settlement. It is not the
          same as a contribution refund.
        </p>
      </>
    ),
  },
  {
    question:
      'What is the difference between a company pension and the German state pension?',
    answer: (
      <>
        <p>
          A company pension and the German state pension are separate systems.
        </p>
        <p className="mt-2">
          The German state pension is managed by Deutsche Rentenversicherung. A
          DRV refund concerns eligible statutory pension contributions.
        </p>
        <p className="mt-2">A company pension may involve:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A bAV or Direktversicherung</li>
          <li>VBL</li>
          <li>ZVK</li>
          <li>VddB</li>
          <li>VddKO</li>
          <li>Another employer or provider-based pension arrangement</li>
        </ul>
        <p className="mt-2">
          A DRV refund does not automatically include or pay out any of these
          company pensions.
        </p>
      </>
    ),
  },
  {
    question:
      'Can I receive both a German state pension refund and money from my company pension?',
    answer: (
      <>
        <p>Possibly.</p>
        <p className="mt-2">
          If you paid into both systems, you may need two separate processes:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            A German state pension refund through Deutsche Rentenversicherung
          </li>
          <li>A separate company pension refund or bAV cash-out</li>
        </ol>
        <p className="mt-2">
          For some vested bAV entitlements, an approved DRV refund can create the
          legal basis for requesting a separate lump-sum settlement.
        </p>
        <p className="mt-2">
          The company pension is not paid out automatically when the DRV refund
          is approved. A separate request must still be made.
        </p>
      </>
    ),
  },
  {
    question: 'Do I need to live outside Germany or the EU?',
    answer: (
      <>
        <p>Not for every company pension case.</p>
        <p className="mt-2">
          VBL, ZVK, VddB, VddKO and bAV rules are not based solely on whether you
          live in Germany, elsewhere in the EU or outside Europe.
        </p>
        <p className="mt-2">
          Eligibility depends mainly on the pension scheme, contribution history,
          vesting status, contract and applicable cash-out or refund rules.
        </p>
        <p className="mt-2">
          This differs from a German state pension refund, where nationality,
          residence and the ability to make voluntary contributions can be
          important.
        </p>
      </>
    ),
  },
  {
    question: 'Do I need to wait 24 months?',
    answer: (
      <>
        <p>
          There is no single 24-month waiting period for every company pension
          cash-out or refund.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>VBL: no general 24-month waiting period</li>
          <li>ZVK: no general 24-month waiting period</li>
          <li>
            VddB: a 24-month period after the last relevant contribution
            generally applies
          </li>
          <li>
            VddKO: a 24-month period after the last relevant contribution
            generally applies
          </li>
          <li>
            bAV cash-outs: timing depends on the cash-out route, contract and
            required confirmations
          </li>
        </ul>
        <p className="mt-2">
          The 24-month waiting period commonly associated with a German state
          pension refund does not automatically apply to all company pension
          cases.
        </p>
      </>
    ),
  },
  {
    question: 'How much money can I get?',
    answer: (
      <>
        <p>The amount depends on the pension type.</p>
        <p className="mt-2">
          For VBL, ZVK, VddB and VddKO refunds, the amount is generally based on
          eligible employee contributions recorded by the pension institution.
        </p>
        <p className="mt-2">For a bAV cash-out, the amount may depend on:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The current pension or contract value</li>
          <li>The type of pension arrangement</li>
          <li>The provider&rsquo;s calculation</li>
          <li>Employer involvement</li>
          <li>The applicable lump-sum settlement route</li>
        </ul>
        <p className="mt-2">
          A bAV cash-out amount is not necessarily equal to the total
          contributions originally paid.
        </p>
      </>
    ),
  },
  {
    question: 'How long does the process usually take?',
    answer: (
      <>
        <p>
          The provider or pension institution controls the final processing
          time.
        </p>
        <p className="mt-2">
          Many straightforward contribution-refund cases may be completed within
          approximately 4 to 12 weeks after submission.
        </p>
        <p className="mt-2">Timing can depend on:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Document and identity review</li>
          <li>Earlier contribution periods</li>
          <li>Requests for additional information</li>
          <li>Employer confirmation</li>
          <li>Provider review</li>
          <li>Health insurance confirmation in some bAV cases</li>
        </ul>
        <p className="mt-2">
          bAV cash-outs can take longer than straightforward contribution-refund
          cases.
        </p>
      </>
    ),
  },
  {
    question: 'Do I need a German bank account?',
    answer: (
      <>
        <p>No German bank account is required in most cases.</p>
        <p className="mt-2">
          Some refund routes require a SEPA-capable EUR account. If you do not
          have one, CompanyPension can help you open a suitable EUR account.
        </p>
        <p className="mt-2">
          A bAV provider may also be able to pay an approved amount to an
          international bank account, depending on its payment requirements.
        </p>
      </>
    ),
  },
  {
    question: 'Who receives the approved money?',
    answer: (
      <>
        <p>
          The relevant pension provider, scheme or institution pays the approved
          money directly to the bank account you provide.
        </p>
        <p className="mt-2">
          CompanyPension does not receive, hold or forward approved pension
          money.
        </p>
      </>
    ),
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
