import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  Check,
  Info,
  Laptop,
  Mail,
  MessageSquare,
  Phone,
  Target,
  User,
} from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import {
  SectionHeading,
  FAQ_EYEBROW_WIDTH,
} from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';
import { FAQ } from '@/components/marketing/faqItems';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Light-section background (Figma rgb(243,244,244)); the token palette has no
// matching warm-neutral, so it is used as an arbitrary value throughout.
const LIGHT_BG = 'bg-[#f3f4f4]';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Green filled-circle check list used on the light sections (Figma). */
function GreenCheckList({
  items,
  className = '',
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={`space-y-4 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/icons/check-bullet.svg"
            alt=""
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Filled accent-green check badge for the dark Platform-scope lists (Figma). */
function AccentCheck({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent ${className}`}
    >
      <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} />
    </span>
  );
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-base font-semibold text-brand underline underline-offset-4 transition-colors hover:text-brand/70"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/** Card with a large muted number in the top-right corner (Figma "How"). */
function NumberCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400/60 bg-white p-8 shadow-sm">
      <span
        aria-hidden="true"
        className="block text-right text-4xl font-bold text-[#939494]"
      >
        {number}
      </span>
      <h3 className="mt-2 text-xl font-semibold text-brand">{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {children}
      </div>
    </div>
  );
}

/** Principle card: accent-green icon top-left, muted number top-right (Figma). */
function PrincipleCard({
  icon,
  number,
  title,
  children,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-neutral-400/60 bg-white p-8">
      <span
        aria-hidden="true"
        className="absolute right-8 top-6 text-4xl font-bold text-[#939494]"
      >
        {number}
      </span>
      <div className="text-brand" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-gray-600">
        {children}
      </div>
    </div>
  );
}

/** Supported-claim-type card (Figma 1219:7682). Solid or outline CTA. */
function ClaimTypeCard({
  title,
  body,
  cta,
  ctaVariant = 'outline',
  className = '',
}: {
  title: string;
  body: ReactNode;
  cta: { label: string; href: string };
  ctaVariant?: 'solid' | 'outline';
  className?: string;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl bg-[#f8f8f8] p-8 ${className}`}
    >
      <h3 className="text-xl font-semibold text-brand">{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {body}
      </div>
      <div className="mt-8 flex flex-1 items-end">
        <Link
          href={cta.href}
          className={
            ctaVariant === 'solid'
              ? 'inline-flex rounded-brand bg-accent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover'
              : 'inline-flex w-full justify-center rounded-brand border border-neutral-400 bg-transparent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-white'
          }
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ (Figma 1240:72). The design shows nine questions with only the first
// expanded; its answer is transcribed verbatim. Answers for items 2–9 do not
// exist in the design or elsewhere in the repo, so they carry a minimal
// placeholder per copy governance (never invent FAQ copy). FLAGGED as a copy
// gap in the task report.
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

const ABOUT_FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'Is CompanyPension a company or a brand?',
    answer: (
      <p>
        CompanyPension is a brand and digital application platform operated by
        ATLAES GmbH, a company based in Berlin, Germany. ATLAES GmbH is the
        contractual platform provider.
      </p>
    ),
  },
  {
    question: 'Is CompanyPension a pension advisor, broker or law firm?',
    answer: FAQ.advisorOrLawFirm.answer,
  },
  { question: 'Is CompanyPension a claims agent?', answer: FAQ_ANSWER_PENDING },
  {
    question: 'Does CompanyPension use automated document recognition?',
    answer: FAQ.ocrOrAi.answer,
  },
  {
    question: 'Can CompanyPension help me cash out my bAV?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Can CompanyPension help with VBL or ZVK refunds?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Can CompanyPension help with VddB or VddKO refunds?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Who receives the approved money?',
    answer: FAQ.whoReceives.answer,
  },
  { question: 'Who is behind CompanyPension?', answer: FAQ_ANSWER_PENDING },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <>
      {/* ---- HERO (Figma 1216:2513) ---- */}
      <Hero
        eyebrow="About CompanyPension"
        eyebrowWidth={316}
        title="Built to make German"
        highlight="company pension claims easier"
        body={
          <>
            CompanyPension is a digital application platform for people who want
            to apply for a German company pension cash-out or refund online.
          </>
        }
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
        aboveCta={
          <>
            <p>
              Upload your pension document or answer guided questions. The
              platform extracts available details, adapts the next steps and
              prepares the application for your review and digital signature.
            </p>
            <p className="mt-6 font-medium text-white/80">
              The platform supports:
            </p>
            <ul className="mx-auto mt-1 flex w-fit flex-col gap-1 text-white/70">
              {[
                'bAV and provider-based company pension cash-outs',
                'VBL and ZVK refunds',
                'VddB and VddKO refunds',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span aria-hidden="true">&bull;</span>
                  <span className="whitespace-nowrap">{item}</span>
                </li>
              ))}
            </ul>
          </>
        }
        footnote={
          <p>
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        }
      />

      {/* ---- WHY (Figma 1219:5156) ---- */}
      <section className="relative overflow-hidden bg-white text-brand">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.06]"
        >
          <Image
            src="/marketing/shared/berlin-landmark-building-landscape.png"
            alt=""
            fill
            className="object-cover object-left"
          />
        </div>
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              eyebrow="Digital by design"
              title={
                <>
                  German company pensions were not designed{' '}
                  <br className="hidden md:block" />
                  for international users
                </>
              }
              body="CompanyPension is built as a technology platform rather than a traditional claims or advisory service."
            />
          </div>

          <div className="mt-14 grid gap-x-16 gap-y-10 lg:grid-cols-2">
            <div>
              <p className="text-lg font-semibold">You may have:</p>
              <GreenCheckList
                className="mt-6 text-gray-700"
                items={[
                  'A bAV or Direktversicherung from a former employer',
                  'A pension contract from Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider',
                  'VBL or ZVK contributions from public-sector employment',
                  'VddB or VddKO contributions from stage or orchestra work',
                ]}
              />
            </div>
            <div>
              <p className="text-lg font-semibold">
                The documents are often in German and may not clearly explain:
              </p>
              <GreenCheckList
                className="mt-6 text-gray-700"
                items={[
                  'Whether a cash-out or refund may be possible',
                  'Which rules apply',
                  'Which documents are required',
                  'Whether a separate DRV refund matters',
                  'What needs to be signed or submitted next',
                ]}
              />
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6 text-center">
            <p className="max-w-3xl text-base leading-relaxed text-gray-600 sm:text-lg">
              CompanyPension was created to turn these processes into clear
              digital flows built around the documents users already have.
            </p>
            <ArrowLink href="/get-started">
              Start with your pension type or provider
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- HOW THE PLATFORM WORKS (Figma 1219:6533) ---- */}
      <section className={LIGHT_BG}>
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Digital by design"
              title="Upload instead of entering everything manually"
              body="CompanyPension is built as a technology platform rather than a traditional claims or advisory service."
            />
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <NumberCard number="01" title="Automated document recognition">
              <p>
                Upload a pension letter, provider statement, bAV contract or
                other supported document.
              </p>
              <p>
                OCR and automated data extraction identify available details
                such as the provider, pension type, insurance number, dates and
                recorded amounts.
              </p>
              <p>
                You review and correct the extracted information before anything
                is submitted.
              </p>
            </NumberCard>
            <NumberCard number="02" title="Adaptive user flows">
              <p>
                The questions and required documents change according to your
                pension type, provider and answers.
              </p>
              <p>
                A bAV cash-out follows a different route from a VBL, ZVK, VddB
                or VddKO refund.
              </p>
            </NumberCard>
            <NumberCard number="03" title="Automated completeness checks">
              <p>
                The platform checks for missing information, inconsistent
                answers and documents that may still be required before signing.
              </p>
            </NumberCard>
            <NumberCard number="04" title="Human oversight by exception">
              <p>Most standard steps run digitally and automatically.</p>
              <p>
                Human support is added when a document cannot be read reliably
                or when provider correspondence requires clarification,
                translation or follow-up.
              </p>
            </NumberCard>
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            You stay in a secure English-language flow while the technical
            application process runs through the platform.
          </p>
        </div>
      </section>

      {/* ---- SUPPORTED CLAIM TYPES (Figma 1219:7682) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Supported claim types"
              title={
                <>
                  Cash-outs and refunds for <br className="hidden md:block" />
                  German company pensions
                </>
              }
            />
          </div>

          <div className="mt-14 space-y-6">
            <ClaimTypeCard
              title="bAV / Company pension cash-outs"
              body={
                <>
                  <p>
                    For Direktversicherung and other provider-based company
                    pensions from previous employment.
                  </p>
                  <p>
                    The guided flow checks the pension arrangement, contract
                    details and possible basis for a one-time payout or lump-sum
                    settlement.
                  </p>
                </>
              }
              cta={{ label: 'Start your claim', href: '/get-started' }}
              ctaVariant="solid"
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <ClaimTypeCard
                title="VBL and ZVK refunds"
                body={
                  <p>
                    For eligible employee contributions paid into VBLklassik, a
                    ZVK or another public-sector company pension scheme.
                  </p>
                }
                cta={{ label: 'Start VBL/ZVK refund', href: '/get-started' }}
              />
              <ClaimTypeCard
                title="VddB and VddKO refunds"
                body={
                  <p>
                    For eligible contribution-refund cases connected to German
                    stage, theatre, dance or orchestra employment.
                  </p>
                }
                cta={{ label: 'Start VddB/VddKO refund', href: '/get-started' }}
              />
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            Not sure what kind of pension document you have? Upload it or enter
            the provider or scheme manually when starting the guided flow.
          </p>
        </div>
      </section>

      {/* ---- THE COMPANY BEHIND THE PLATFORM (Figma 1222:7923) ---- */}
      <section className={LIGHT_BG}>
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="The company behind the platform"
              // Client feedback 2026-07-23: this pill's text is set in caps.
              // Uppercasing via CSS rather than the string keeps the copy
              // readable in source and searchable against the content docs.
              // `eyebrowClassName` replaces the default border/bg pair, so
              // those are restated here.
              eyebrowClassName="border-current/25 bg-current/5 uppercase"
              title="Operated by ATLAES GmbH in Berlin"
            />
          </div>

          <div className="mt-14 grid items-start gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <p className="text-lg font-semibold">
                CompanyPension is a brand and digital application platform
                operated by ATLAES GmbH.
              </p>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  ATLAES GmbH develops online platforms that make complex German
                  administrative processes easier to start and complete—
                  especially for international professionals, expats and people
                  who have left Germany.
                </p>
                <p>
                  The focus is not general pension planning or personal
                  financial advice.
                </p>
              </div>

              <p className="mt-8 text-base font-semibold text-brand">
                The platform is designed to help users:
              </p>
              <GreenCheckList
                className="mt-4 text-gray-700"
                items={[
                  'Identify the relevant pension process',
                  'Upload and verify pension information',
                  'Complete guided questions',
                  'Review and sign their own application',
                  'Submit the signed application digitally',
                  'View provider requests and next steps securely',
                ]}
              />
            </div>

            {/* Dark-green company info card */}
            <div className="rounded-2xl bg-brand p-8 text-white sm:p-10">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-brand">
                  <Building2 className="h-8 w-8" aria-hidden="true" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-xl font-bold text-accent">ATLAES GmbH</p>
                  <p className="text-base leading-snug text-white/85">
                    Kaskelstraße 46
                    <br />
                    10317 Berlin
                    <br />
                    Germany
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-white/15" />

              <div className="space-y-3 text-base text-white/85">
                <p className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Phone: +49 30 49957826
                </p>
                <p className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Email: info@companypension.de
                </p>
              </div>

              <div className="my-6 border-t border-white/15" />

              <div className="space-y-1 text-sm leading-relaxed text-white/70">
                <p>Register court: Amtsgericht Charlottenburg</p>
                <p>Register number: HRB 242004 B</p>
                <p>Managing directors: Johannes Kühn and Anna Kliem</p>
                <p>VAT ID: DE335357879</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/get-started"
              className="inline-flex rounded-brand bg-accent px-8 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Start with my provider
            </Link>
          </div>
        </div>
      </section>

      {/* ---- PLATFORM SCOPE (Figma 1224:8057) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            {/* 236x40 in Figma (client feedback 2026-07-23). This pill was
                hand-rolled and never picked up the updated pill treatment its
                `SectionHeading` siblings have (40px tall, 16px Sora), so it
                also gains `min-h-10 font-display text-base` here. */}
            <span className="mb-5 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-5 py-1 text-center font-display text-base font-medium text-white sm:w-[236px] sm:whitespace-nowrap">
              Platform scope
            </span>
            <h2 className="max-w-5xl font-display text-3xl font-bold leading-tight tracking-tight text-accent sm:text-[2.5rem] sm:leading-[1.15]">
              A digital application platform—not a pension{' '}
              <br className="hidden md:block" />
              advisor or claims agent
            </h2>
            <p className="mx-auto mt-6 max-w-4xl text-base leading-relaxed text-white/75 sm:text-lg">
              CompanyPension provides the technology used to complete, review,
              sign and submit German company pension applications online. The
              platform uses the information and documents supplied by the user
              to prepare the relevant application. You review and sign the
              application yourself and remain the applicant and claimant
              throughout the process. After you sign, the application is
              technically transmitted to the relevant pension provider, scheme
              or institution through the CompanyPension platform.
            </p>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left: darker inner card (Figma warm charcoal #231f20) */}
            <div className="rounded-2xl bg-[#231f20] p-8">
              <p className="text-lg font-semibold">CompanyPension does not:</p>
              <ul className="mt-4">
                {[
                  'Decide whether a cash-out or refund is approved',
                  'Act as the applicant or claimant',
                  'Assess or argue your legal position',
                  'Provide pension advice',
                  'Provide legal or tax advice',
                  'Provide financial advice',
                  'Provide insurance advice or brokerage',
                  'Receive, hold or forward approved pension money',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 border-b border-white/10 py-3 text-base text-white/85 last:border-b-0"
                  >
                    <AccentCheck />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: no card */}
            <div>
              <p className="text-lg font-semibold">
                You may give CompanyPension limited authorization to:
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  'Receive and forward relevant provider correspondence',
                  'Receive information about the final decision',
                  'Receive information about the approved amount',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <AccentCheck className="mt-0.5" />
                    <span className="text-base leading-relaxed text-white/85">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-white/70">
                <p>
                  This allows the platform to display follow-up requests and
                  calculate the agreed service fee.
                </p>
                <p>
                  The limited authorization does not make CompanyPension the
                  applicant or claimant and does not authorize it to provide
                  legal or pension advice.
                </p>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-brand bg-[#f3fced] p-4 text-sm leading-relaxed text-brand">
                <Info
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <span>
                  If separate legal services are needed for a specific case,
                  they are provided by the responsible legal partner under a
                  separate arrangement.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- COMPLETE THE PROCESS IN ENGLISH (Figma 1226:8082) ---- */}
      <section className={LIGHT_BG}>
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                Designed for international users
              </span>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
                Complete the process in English
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                German pension documents and provider correspondence can be
                difficult to understand, especially after leaving Germany.
                CompanyPension turns the process into a guided English-language
                flow.
              </p>
            </div>

            <div className="text-brand">
              <p className="text-lg font-semibold">
                The platform allows you to:
              </p>
              <GreenCheckList
                className="mt-6 text-gray-700"
                items={[
                  'Upload pension documents or enter the details manually',
                  'Review information extracted from your documents',
                  'Answer questions relevant to your pension type',
                  'See which documents or details are still missing',
                  'Review and sign the application online',
                  'Submit the signed application digitally',
                  'View provider correspondence in your secure account',
                  'Receive human support when clarification or translation is needed',
                ]}
              />
              <p className="mt-8 text-base leading-relaxed text-gray-600">
                The goal is to make the technical application process easier
                without changing who the applicant is: you remain in control of
                your own claim.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PRODUCT PRINCIPLES (Figma 1234:72) ----
          Figma mislabels the last two cards both "04"; corrected to 01–05
          here (unambiguous artifact). FLAGGED in the task report. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Our product principles"
              title="How CompanyPension is built"
            />
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <PrincipleCard
              number="01"
              title="Digital first"
              icon={<Laptop className="h-8 w-8" aria-hidden="true" />}
            >
              <p>
                The process is built around secure document upload, automated
                extraction, guided questions, digital signing and clear next
                steps.
              </p>
            </PrincipleCard>
            <PrincipleCard
              number="02"
              title="Specific to German company pensions"
              icon={<Target className="h-8 w-8" aria-hidden="true" />}
            >
              <p>
                Each flow is designed for a defined pension type, including bAV,
                VBL, ZVK, VddB and VddKO. CompanyPension does not provide
                general retirement planning.
              </p>
            </PrincipleCard>
            <PrincipleCard
              number="03"
              title="User-controlled applications"
              icon={<User className="h-8 w-8" aria-hidden="true" />}
            >
              <p>
                The platform prepares the application from the information you
                provide. You review the details, correct anything necessary and
                sign the application yourself.
              </p>
            </PrincipleCard>
            <PrincipleCard
              number="04"
              title="Transparent money flow"
              icon={<ArrowLeftRight className="h-8 w-8" aria-hidden="true" />}
            >
              <p>
                If approved, the provider or pension institution pays the money
                directly to the bank account you provide. CompanyPension does
                not receive, hold or forward approved pension money.
              </p>
            </PrincipleCard>
            <PrincipleCard
              number="05"
              title="Automation with human oversight"
              icon={<MessageSquare className="h-8 w-8" aria-hidden="true" />}
            >
              <p>
                Most standard steps run digitally and automatically. Human
                support is added when documents or provider correspondence need
                individual attention.
              </p>
            </PrincipleCard>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1240:72) ---- */}
      <section className={`relative overflow-hidden ${LIGHT_BG}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(rgba(22,51,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(22,51,0,0.04) 1px, transparent 1px)',
            backgroundSize: '96px 96px',
          }}
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              eyebrowWidth={FAQ_EYEBROW_WIDTH}
              title="Questions about CompanyPension"
              body="CompanyPension is built as a technology platform rather than a traditional claims or advisory service."
            />
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <FaqAccordion items={ABOUT_FAQ_ITEMS} defaultOpenIndex={0} />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-brand bg-accent px-16 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See all FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1243:162) ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Start with the{' '}
            <span className="text-accent">
              pension <br className="hidden md:block" />
              document you already have
            </span>
          </>
        }
        body="Upload your document or answer guided questions to start a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        backgroundImageSrc="/marketing/home/cta-waves-background.png"
        note={
          <>
            <span className="text-accent">
              The refund calculator is available for VBL, ZVK, VddB and VddKO.
              It is not used for bAV cash-outs.
            </span>
            <br />
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </>
        }
      />
    </>
  );
}
