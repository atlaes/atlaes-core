import Link from 'next/link';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  ReviewsExplorer,
  type ReviewItem,
} from '@/components/marketing/ReviewsExplorer';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';
import { FAQ } from '@/components/marketing/faqItems';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

/**
 * Charcoal ink for headings/titles on light sections (updated Figma design —
 * was brand green). Dark sections keep their white/accent titles. Mirrors the
 * home, how-it-works, pricing and FAQ pages.
 */
const INK = 'text-[#231f20]';

/**
 * Brand-green eyebrow pill for light sections: the pill stays brand green even
 * though the heading beside it is charcoal (INK).
 */
const EYEBROW_LIGHT = 'border-brand/30 bg-transparent text-brand';

// ---------------------------------------------------------------------------
// Copy source note
// ---------------------------------------------------------------------------
// Section headings, intros and the "what users mention" cards are transcribed
// from the reliable (non-instance) Figma text nodes of frame 1206:19952.
// The testimonial copy below (names, case tags, quotes, ratings, dates, country
// flags) comes from the Figma "Testimonial" nodes (1206:21701 …), which carry
// real overridden text in the export. The rating summary uses the real
// third-party platform badges (Google / Trustpilot / ProvenExpert) exported as
// images. The review-experience FAQ questions are transcribed from the rendered
// FAQ accordion (1216:824); the first answer is expanded in the design and
// transcribed verbatim, the remaining six are collapsed (not readable) and
// point to the FAQ page. FLAGGED as a copy gap in the task report.
// ---------------------------------------------------------------------------

const FLAG = (code: string, label: string) => ({
  src: `/marketing/reviews/flags/${code}.svg`,
  label,
});

// `category` = the case-type pill shown on the card (unchanged copy).
// `categories` = the filter tabs this review answers to (see FILTERS). Mapping
// rules (the static design does not specify them — FLAGGED in the report):
//   • the case-type pill maps to a scheme tab (bAV Cash-Out → "bAV cash-outs";
//     VBL/ZVK Refund → "VBL and ZVK refunds"; VddB/VddKO → "VddB and VddKO
//     refunds").
//   • "Digital process" is assigned when the quote mentions uploading documents
//     or online/guided steps.
//   • "Support" is assigned when the quote mentions the team, answering
//     questions, being guided or kept updated.
const REVIEWS: ReviewItem[] = [
  {
    name: 'David R.',
    initials: 'DR',
    category: 'bAV Cash-Out',
    categories: ['bAV cash-outs'],
    quote:
      'CompanyPension made the VBL refund process incredibly easy. Everything was handled professionally and I received my refund faster than expected. Excellent service from start to finish.',
    meta: 'March 2025',
    rating: 4,
    flag: FLAG('nl', 'Netherlands'),
  },
  {
    name: 'Sarah M.',
    initials: 'SM',
    category: 'bAV Cash-Out',
    categories: ['bAV cash-outs', 'Support'],
    quote:
      'I thought cashing out my German company pension would be complicated, but the process was very clear. The team responded quickly and kept me updated throughout.',
    meta: 'February 2026',
    rating: 5,
    flag: FLAG('gb', 'United Kingdom'),
  },
  {
    name: 'Emma L.',
    initials: 'EL',
    category: 'VBL Refund',
    categories: ['VBL and ZVK refunds', 'Digital process'],
    quote:
      'Very smooth experience. I uploaded my documents, followed the online steps, and got clear updates whenever something was needed. Much easier than dealing with German provider letters myself.',
    meta: 'March 2026',
    rating: 5,
    flag: FLAG('es', 'Spain'),
  },
  {
    name: 'Laura K.',
    initials: 'LK',
    category: 'ZVK Refund',
    categories: ['VBL and ZVK refunds', 'Support'],
    quote:
      'From the first contact to the final payment, everything was perfect. They answered all my questions and made a complex process feel simple. Thank you!',
    meta: 'December 2025',
    rating: 5,
    flag: FLAG('fr', 'France'),
  },
  {
    name: 'Michael B.',
    initials: 'MB',
    category: 'VddB/VddKO Refund',
    categories: ['VddB and VddKO refunds', 'Support'],
    quote:
      'From the first contact to the final payment, everything was perfect. They answered all my questions and made a complex process feel simple. Thank you!',
    meta: 'January 2026',
    rating: 5,
    flag: FLAG('fr', 'France'),
  },
  {
    name: 'James T.',
    initials: 'JT',
    category: 'bAV Cash-Out',
    categories: ['bAV cash-outs', 'Support'],
    quote:
      'Great experience! They helped me claim my public-sector pension refund quickly and guided me through every step. Very professional and trustworthy team.',
    meta: 'November 2025',
    rating: 5,
    flag: FLAG('de', 'Germany'),
  },
];

const HIGHLIGHTS: { number: string; title: string; body: string }[] = [
  {
    number: '01',
    title: 'Clear English-language guidance',
    body: 'A guided online flow that makes German pension steps easier to understand.',
  },
  {
    number: '02',
    title: 'Upload instead of typing everything',
    body: 'Users can upload pension documents so key information can be extracted and pre-filled for review.',
  },
  {
    number: '03',
    title: 'Simple digital signing',
    body: 'Applications can be reviewed and signed online without printing and mailing German forms.',
  },
  {
    number: '04',
    title: 'Clear next steps',
    body: 'The platform shows what information, document or action is still needed as the application progresses.',
  },
  {
    number: '05',
    title: 'Human support when needed',
    body: 'Support is available when a document, provider letter or follow-up request needs clarification or translation.',
  },
  {
    number: '06',
    title: 'Approved money paid directly',
    body: 'If approved, the provider or pension institution pays the money directly to the bank account the user provides.',
  },
];

const FILTERS = [
  'All',
  'bAV cash-outs',
  'VBL and ZVK refunds',
  'VddB and VddKO refunds',
  'Digital process',
  'Support',
];

// ---------------------------------------------------------------------------
// Review-experience FAQ (Figma 1216:824). Seven questions are transcribed from
// the rendered accordion. Q1 is expanded in the design and transcribed
// verbatim; the other six are collapsed, so their answers are not readable and
// link to the FAQ page until the client supplies copy. FLAGGED in the report.
// ---------------------------------------------------------------------------

// Review-experience FAQ (Figma 1216:824). Q1 keeps the design's own expanded
// answer; the process questions reuse the shared FAQ master copy via
// faqItems.tsx (FAQ CompanyPension 22062026.pdf). The last item is composed
// (reviews-specific, no master answer) — flagged for client review.
const REVIEW_FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'Are these reviews independent?',
    answer: (
      <>
        <p>
          The reviews displayed on this page come from the third-party review
          platforms identified next to each review.
        </p>
        <p className="mt-2">
          Where the review platform marks a review as verified, that status is
          shown. CompanyPension does not change the reviewer&rsquo;s original
          rating or meaning.
        </p>
      </>
    ),
  },
  {
    ...FAQ.howItWorks,
    question: 'Is the CompanyPension process fully online?',
  },
  {
    ...FAQ.uploadInsteadManual,
    question:
      'Can I upload pension documents instead of entering everything manually?',
  },
  {
    ...FAQ.manageCorrespondence,
    question: 'Do I have to manage German pension correspondence myself?',
  },
  {
    ...FAQ.whoSubmits,
    question: 'Does CompanyPension decide whether my application is approved?',
  },
  FAQ.whoReceives,
  {
    // Composed: reviews-specific question with no match in the master copy.
    question: 'Do reviews guarantee that my case will be approved?',
    answer: (
      <>
        <p>
          No. Reviews describe other people&rsquo;s experiences and do not
          guarantee any outcome.
        </p>
        <p className="mt-2">
          Every cash-out or refund is decided by the relevant pension provider,
          scheme or institution based on your individual record. CompanyPension
          does not decide whether a case is approved.
        </p>
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Local, page-only building blocks
// ---------------------------------------------------------------------------

function NumberedCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col items-center rounded-2xl border border-[#ececec] bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <span aria-hidden="true" className="text-4xl font-bold text-brand">
        {number}
      </span>
      <h3 className={`mt-6 text-lg font-semibold ${INK}`}>{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/** Third-party rating badge — the real platform logo exported from Figma. */
function RatingBadge({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`h-auto w-full object-contain ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1206:19952 — "Reviews")
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  return (
    <>
      {/* ---- HERO (Figma 1206:20003) ---- */}
      <Hero
        eyebrow="Reviews"
        title="What users say about"
        highlight="CompanyPension"
        body="Read how users experience the digital application process—from uploading pension documents and completing the guided flow to signing online and receiving an approved cash-out or refund."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        footnote={
          <>
            <p className="font-medium text-white/90">
              The refund calculator is available for VBL, ZVK, VddB and VddKO.
              It is not used for bAV cash-outs.
            </p>
            <p className="mt-2">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </>
        }
      />

      {/* ---- INDEPENDENT FEEDBACK / RATING SUMMARY (Figma 1206:20357) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="Independent feedback"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Reviews from CompanyPension users"
              body="Read third-party reviews from users who used CompanyPension for bAV cash-outs, VBL and ZVK refunds, VddB and VddKO refunds, and other German company pension cases."
            />
            <p className="mt-5 max-w-2xl text-base font-medium text-brand">
              Real experiences with the CompanyPension digital application
              platform.
            </p>
          </div>

          {/* Real third-party rating badges (Google / Trustpilot / ProvenExpert). */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-12 gap-y-10 sm:gap-x-16">
            <RatingBadge
              src="/marketing/reviews/rating-google.png"
              alt="Google Rating: 4.9 out of 5 from 525 reviews"
              className="max-w-[210px]"
            />
            <RatingBadge
              src="/marketing/reviews/rating-trustpilot.png"
              alt="Trustpilot: 4.8 out of 5 based on 245 reviews"
              className="max-w-[230px]"
            />
            <RatingBadge
              src="/marketing/reviews/rating-provenexpert.png"
              alt="ProvenExpert: Excellent, 100% recommended from 325 customer reviews"
              className="max-w-[230px]"
            />
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-sm leading-relaxed text-gray-500">
            Read verified third-party reviews from users who used CompanyPension
            for bAV cash-outs, VBL refunds, ZVK refunds, VddB/VddKO refunds and
            other German company pension cases.
          </p>

          <div className="mt-12 flex flex-col items-center gap-6">
            <p className="text-base text-gray-600">
              Trusted by users across company pension refund and cash-out cases
            </p>
            {/* Reviewer avatar row (exported from Figma). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/reviews/rating-avatars.png"
              alt="Reviewer profile photos"
              className="h-auto w-full max-w-[520px]"
            />
          </div>
        </div>
      </section>

      {/* ---- WHAT USERS TEND TO HIGHLIGHT (Figma 1206:21497) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="What users mention"
              eyebrowClassName={EYEBROW_LIGHT}
              title="What users tend to highlight"
              body="Published reviews often mention the following parts of the experience."
            />
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <NumberedCard
                key={item.number}
                number={item.number}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---- LATEST REVIEWS (Figma 1206:21698) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              title="Latest CompanyPension reviews"
              body="Read recent feedback from users of the CompanyPension platform."
            />
          </div>

          {/* Functional category filters + review grid (client component). */}
          <ReviewsExplorer reviews={REVIEWS} filters={FILTERS} />
        </div>
      </section>

      {/* ---- THE DIGITAL PROCESS / BUILT FOR ONLINE (Figma 1214:116) ---- */}
      <section className="relative overflow-hidden bg-brand text-white">
        {/* Organic leaf texture behind the content (plain <img>: next/image fill
            renders large background PNGs blank in the dev optimizer). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/reviews/builtfor-leaf.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <span className="mb-5 inline-flex items-center rounded-full border border-white/60 px-6 py-2 text-sm font-semibold tracking-wide">
              The digital process
            </span>
            <h2 className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-accent sm:text-[2.5rem] sm:leading-[1.15]">
              Built for online pension applications
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-center text-base leading-relaxed text-white/80">
            <p>
              CompanyPension is a digital application platform for German
              company pension cash-outs and refunds.
            </p>
            <p>
              Upload a pension document or answer guided questions. The platform
              extracts available details, adapts the flow to your pension type
              and prepares the application from the information you provide.
            </p>
            <p>
              You review and sign the application yourself. After signing, it is
              technically transmitted to the relevant provider, pension scheme
              or institution through the CompanyPension platform.
            </p>
            <p>
              Most standard steps run digitally and automatically. Human support
              is added when clarification, translation or follow-up is needed.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-[10px] bg-accent px-8 py-4 text-base font-semibold text-brand shadow-sm transition-colors hover:bg-accent-hover"
            >
              See how it works
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-[10px] border-2 border-white px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1216:824) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="FAQ"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Questions about the review experience"
            />
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion items={REVIEW_FAQ_ITEMS} defaultOpenIndex={0} />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/faq"
              className="rounded-brand bg-accent px-8 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See all FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1216:881) ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Ready to start your <br className="hidden md:block" />
            <span className="text-accent">company pension claim?</span>
          </>
        }
        body="Upload your pension document or answer guided questions to start a bAV cash-out or company pension refund. For VBL, ZVK, VddB and VddKO refunds, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        backgroundImageSrc="/marketing/home/cta-waves-background.png"
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
