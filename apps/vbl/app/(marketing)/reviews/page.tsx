import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ReviewCard } from '@/components/marketing/ReviewCard';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// Copy source note
// ---------------------------------------------------------------------------
// Section headings, intros and the "what users mention" cards are transcribed
// from the reliable (non-instance) Figma text nodes of frame 1206:19952.
// The testimonial copy below (names, case tags, quotes, ratings, dates) comes
// from the Figma "Testimonial" text nodes, which carry real overridden text
// (NOT lorem) in the export. The FAQ accordion items in the design are
// un-overridden component defaults (generic SaaS placeholders such as "How do
// I pay for the…" / "We need to add new u…"), so no review-specific FAQ copy
// exists to transcribe — the FAQ section links to the full FAQ page rather than
// inventing questions. FLAGGED as a copy gap in the task report.
// ---------------------------------------------------------------------------

interface Review {
  name: string;
  initials: string;
  category: string;
  quote: string;
  meta: string;
  rating: number;
}

const REVIEWS: Review[] = [
  {
    name: 'David R.',
    initials: 'DR',
    category: 'bAV Cash-Out',
    quote:
      'CompanyPension made the VBL refund process incredibly easy. Everything was handled professionally and I received my refund faster than expected. Excellent service from start to finish.',
    meta: 'March 2025',
    rating: 5,
  },
  {
    name: 'Sarah M.',
    initials: 'SM',
    category: 'bAV Cash-Out',
    quote:
      'I thought cashing out my German company pension would be complicated, but the process was very clear. The team responded quickly and kept me updated throughout.',
    meta: 'February 2026',
    rating: 5,
  },
  {
    name: 'Emma L.',
    initials: 'EL',
    category: 'VBL Refund',
    quote:
      'Very smooth experience. I uploaded my documents, followed the online steps, and got clear updates whenever something was needed. Much easier than dealing with German provider letters myself.',
    meta: 'March 2026',
    rating: 5,
  },
  {
    name: 'Laura K.',
    initials: 'LK',
    category: 'ZVK Refund',
    quote:
      'From the first contact to the final payment, everything was perfect. They answered all my questions and made a complex process feel simple. Thank you!',
    meta: 'December 2025',
    rating: 5,
  },
  {
    name: 'Michael B.',
    initials: 'MB',
    category: 'VddB/VddKO Refund',
    quote:
      'From the first contact to the final payment, everything was perfect. They answered all my questions and made a complex process feel simple. Thank you!',
    meta: 'January 2026',
    rating: 5,
  },
  {
    name: 'James T.',
    initials: 'JT',
    category: 'bAV Cash-Out',
    quote:
      'Great experience! They helped me claim my public-sector pension refund quickly and guided me through every step. Very professional and trustworthy team.',
    meta: 'November 2025',
    rating: 5,
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
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <span aria-hidden="true" className="text-4xl font-bold text-accent">
        {number}
      </span>
      <h3 className="mt-6 text-lg font-semibold text-brand">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/** Third-party rating summary tile (Google / Trustpilot / aggregate). */
function RatingStat({
  platform,
  score,
  detail,
}: {
  platform: string;
  score: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/15 bg-white/5 p-6 text-left">
      <span className="text-sm font-semibold uppercase tracking-wide text-accent">
        {platform}
      </span>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-bold text-white">{score}</span>
        <div className="flex items-center gap-0.5" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-accent text-accent" />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{detail}</p>
    </div>
  );
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-base font-semibold text-accent transition-colors hover:text-accent-hover"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
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
        title="What users say about CompanyPension"
        body="Read how users experience the digital application process — from uploading pension documents and completing the guided flow to signing online and receiving an approved cash-out or refund."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        footnote={
          <>
            <p>
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
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              eyebrow="Independent feedback"
              title="Reviews from CompanyPension users"
              body="Read third-party reviews from users who used CompanyPension for bAV cash-outs, VBL and ZVK refunds, VddB and VddKO refunds, and other German company pension cases."
            />
            <p className="mt-4 max-w-2xl text-base text-white/70">
              Real experiences with the CompanyPension digital application
              platform.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <RatingStat
              platform="Google Rating"
              score="4.9"
              detail="4.9 / 5 — from 525 reviews"
            />
            <RatingStat
              platform="Trustpilot"
              score="4.8"
              detail="4.8 out of 5 based on 245 reviews"
            />
            <RatingStat
              platform="Customer reviews"
              score="Excellent"
              detail="325 customer reviews — 100% recommended"
            />
          </div>

          <p className="mt-10 text-center text-base text-white/70">
            Trusted by users across company pension refund and cash-out cases.
          </p>
        </div>
      </section>

      {/* ---- WHAT USERS TEND TO HIGHLIGHT (Figma 1206:21497) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="What users mention"
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
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="Latest CompanyPension reviews"
              body="Read recent feedback from users of the CompanyPension platform."
            />
          </div>

          {/* Category filters (visual, matching the Figma tab row). */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {FILTERS.map((filter, index) => (
              <span
                key={filter}
                className={
                  index === 0
                    ? 'rounded-full bg-brand px-5 py-2 text-sm font-medium text-white'
                    : 'rounded-full border border-neutral-400 bg-white px-5 py-2 text-sm font-medium text-gray-600'
                }
              >
                {filter}
              </span>
            ))}
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((review) => (
              <ReviewCard
                key={review.name + review.meta}
                name={review.name}
                initials={review.initials}
                category={review.category}
                quote={review.quote}
                meta={review.meta}
                rating={review.rating}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---- THE DIGITAL PROCESS (Figma 1214:116) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              eyebrow="The digital process"
              title="Built for online pension applications"
            />
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-relaxed text-white/80">
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

          <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            <ArrowLink href="/how-it-works">See how it works</ArrowLink>
            <ArrowLink href="/pricing">View pricing</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1216:824) ----
          The design's FAQ accordion items are un-overridden component defaults
          (generic placeholders), so no review-specific questions exist to
          transcribe. Rather than invent copy, this band links to the full FAQ
          page. FLAGGED as a copy gap in the task report. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions about the review experience"
              body="Have a question about how CompanyPension works or how reviews are collected? The full FAQ covers eligibility, documents, signing, payout and support."
            />
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
        title="Ready to start your company pension claim?"
        body="Upload your pension document or answer guided questions to start a bAV cash-out or company pension refund. For VBL, ZVK, VddB and VddKO refunds, you can also calculate a first estimate before continuing."
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
