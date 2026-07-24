import { Hero } from '@/components/marketing/Hero';
import { CtaBand } from '@/components/marketing/CtaBand';
import { FaqExplorer } from '@/components/marketing/FaqExplorer';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// FAQ page (Figma frame 1199:11597 — "FAQ"). The hero + closing CTA band are
// server-rendered; the search / category-tab / accordion explorer is the
// `FaqExplorer` client component, which sources its questions and answers from
// the shared `FAQ_CATEGORIES` grouping in components/marketing/faqItems.tsx.
// ---------------------------------------------------------------------------

export default function FaqPage() {
  return (
    <>
      {/* ---- HERO (Figma 1199:11653) ---- */}
      <Hero
        eyebrow="FAQ"
        title="German company pension questions,"
        highlight="answered"
        // Figma runs "questions, answered" together on the second line rather
        // than dropping "answered" onto a third line of its own.
        highlightInline
        body="Answers about bAV cash-outs and VBL, ZVK, VddB and VddKO refunds—including eligibility, DRV differences, pricing, documents and the digital application process."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        footnote={
          <>
            <p className="text-accent">
              The refund calculator is available for VBL, ZVK, VddB and VddKO.
              It is not used for bAV cash-outs.
            </p>
            <p className="mt-2 text-white/70">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </>
        }
      />

      {/* ---- SEARCH + CATEGORIES + QUESTIONS (Figma 1202:14495) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <FaqExplorer />
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
