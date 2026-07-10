import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Building2,
  Check,
  Languages,
  Landmark,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { FeatureCard } from '@/components/marketing/FeatureCard';
import { CtaBand } from '@/components/marketing/CtaBand';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function CheckList({
  items,
  className = '',
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check
            className="mt-0.5 h-5 w-5 shrink-0 text-brand"
            aria-hidden="true"
          />
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-base font-semibold text-brand transition-colors hover:text-brand/70"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/** Numbered principle / process card with a step number badge. */
function NumberedCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <span aria-hidden="true" className="text-4xl font-bold text-accent">
        {number}
      </span>
      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <>
      {/* ---- HERO (Figma 1216:2513) ---- */}
      <Hero
        eyebrow="About CompanyPension"
        title="Built to make German company pension claims easier"
        body={
          <>
            <p>
              CompanyPension is a digital application platform for people who
              want to apply for a German company pension cash-out or refund
              online.
            </p>
            <p className="mt-4">
              Upload your pension document or answer guided questions. The
              platform extracts available details, adapts the next steps and
              prepares the application for your review and digital signature.
            </p>
          </>
        }
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
        footnote={
          <>
            <p className="mb-4 font-medium text-white/80">
              The platform supports:
            </p>
            <ul className="mx-auto flex max-w-xl flex-col gap-2 text-left">
              {[
                'bAV and provider-based company pension cash-outs',
                'VBL and ZVK refunds',
                'VddB and VddKO refunds',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </>
        }
      />

      {/* ---- WHY (Figma 1219:5156) ---- */}
      <section className="relative overflow-hidden bg-brand text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
        >
          <Image
            src="/marketing/shared/aurora-gradient-teal-green-wide.png"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-brand/70" aria-hidden="true" />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              eyebrow="Digital by design"
              title="German company pensions were not designed for international users"
              body="CompanyPension is built as a technology platform rather than a traditional claims or advisory service."
            />
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="text-lg font-semibold">You may have:</p>
              <CheckList
                className="mt-6 text-white/85"
                items={[
                  'A bAV or Direktversicherung from a former employer',
                  'A pension contract from Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider',
                  'VBL or ZVK contributions from public-sector employment',
                  'VddB or VddKO contributions from stage or orchestra work',
                ]}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="text-lg font-semibold">
                The documents are often in German and may not clearly explain:
              </p>
              <CheckList
                className="mt-6 text-white/85"
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
            <p className="max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
              CompanyPension was created to turn these processes into clear
              digital flows built around the documents users already have.
            </p>
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-brand bg-accent px-6 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Start with your pension type or provider
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- HOW THE PLATFORM WORKS (Figma 1219:6533) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Digital by design"
              title="Upload instead of entering everything manually"
              body="CompanyPension is built as a technology platform rather than a traditional claims or advisory service."
            />
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            <NumberedCard number="01" title="Automated document recognition">
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
            </NumberedCard>
            <NumberedCard number="02" title="Adaptive user flows">
              <p>
                The questions and required documents change according to your
                pension type, provider and answers.
              </p>
              <p>
                A bAV cash-out follows a different route from a VBL, ZVK, VddB
                or VddKO refund.
              </p>
            </NumberedCard>
            <NumberedCard number="03" title="Automated completeness checks">
              <p>
                The platform checks for missing information, inconsistent
                answers and documents that may still be required before signing.
              </p>
            </NumberedCard>
            <NumberedCard number="04" title="Human oversight by exception">
              <p>Most standard steps run digitally and automatically.</p>
              <p>
                Human support is added when a document cannot be read reliably
                or when provider correspondence requires clarification,
                translation or follow-up.
              </p>
            </NumberedCard>
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            You stay in a secure English-language flow while the technical
            application process runs through the platform.
          </p>
        </div>
      </section>

      {/* ---- SUPPORTED CLAIM TYPES (Figma 1219:7682) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Supported claim types"
              title="Cash-outs and refunds for German company pensions"
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            <FeatureCard
              icon={<Wallet className="h-7 w-7" aria-hidden="true" />}
              title="bAV / Company pension cash-outs"
              body={
                <>
                  <span className="block">
                    For Direktversicherung and other provider-based company
                    pensions from previous employment.
                  </span>
                  <span className="mt-3 block">
                    The guided flow checks the pension arrangement, contract
                    details and possible basis for a one-time payout or lump-sum
                    settlement.
                  </span>
                </>
              }
              cta={{ label: 'Start your claim', href: '/get-started' }}
            />
            <FeatureCard
              icon={<Landmark className="h-7 w-7" aria-hidden="true" />}
              title="VBL and ZVK refunds"
              body="For eligible employee contributions paid into VBLklassik, a ZVK or another public-sector company pension scheme."
              cta={{ label: 'Start VBL/ZVK refund', href: '/get-started' }}
            />
            <FeatureCard
              icon={<Sparkles className="h-7 w-7" aria-hidden="true" />}
              title="VddB and VddKO refunds"
              body="For eligible contribution-refund cases connected to German stage, theatre, dance or orchestra employment."
              cta={{ label: 'Start VddB/VddKO refund', href: '/get-started' }}
            />
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            Not sure what kind of pension document you have? Upload it or enter
            the provider or scheme manually when starting the guided flow.
          </p>
        </div>
      </section>

      {/* ---- THE COMPANY BEHIND THE PLATFORM (Figma 1222:7923) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl">
              <Image
                src="/marketing/shared/berlin-landmark-building-portrait.png"
                alt="Berlin landmark building, home of ATLAES GmbH"
                width={2000}
                height={1265}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="The company behind the platform"
                title="Operated by ATLAES GmbH in Berlin"
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  CompanyPension is a brand and digital application platform
                  operated by ATLAES GmbH.
                </p>
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
              <CheckList
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

              <div className="mt-8">
                <ArrowLink href="/get-started">
                  Start with my provider
                </ArrowLink>
              </div>
            </div>
          </div>

          {/* Company legal details */}
          <div className="mt-12 grid gap-6 rounded-2xl border border-neutral-400 bg-neutral-50 p-8 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-semibold text-brand">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                ATLAES GmbH
              </p>
              <p className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Kaskelstraße 46, 10317 Berlin, Germany
              </p>
            </div>
            <div className="space-y-1">
              <p>Register court: Amtsgericht Charlottenburg</p>
              <p>Register number: HRB 242004 B</p>
              <p>Managing directors: Johannes Kühn and Anna Kliem</p>
              <p>VAT ID: DE335357879</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                +49 30 49957826
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                info@companypension.de
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PLATFORM SCOPE (Figma 1224:8057) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Platform scope"
              title="A digital application platform—not a pension advisor or claims agent"
            />
          </div>

          <p className="mx-auto mt-8 max-w-4xl text-center text-base leading-relaxed text-gray-600">
            CompanyPension provides the technology used to complete, review,
            sign and submit German company pension applications online. The
            platform uses the information and documents supplied by the user to
            prepare the relevant application. You review and sign the
            application yourself and remain the applicant and claimant
            throughout the process. After you sign, the application is
            technically transmitted to the relevant pension provider, scheme or
            institution through the CompanyPension platform.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                CompanyPension does not:
              </p>
              <ul className="mt-6 space-y-3">
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
                    className="flex items-start gap-3 text-gray-700"
                  >
                    <X
                      className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                    <span className="text-base leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                You may give CompanyPension limited authorization to:
              </p>
              <CheckList
                className="mt-6 text-gray-700"
                items={[
                  'Receive and forward relevant provider correspondence',
                  'Receive information about the final decision',
                  'Receive information about the approved amount',
                ]}
              />
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">
                <p>
                  This allows the platform to display follow-up requests and
                  calculate the agreed service fee.
                </p>
                <p>
                  The limited authorization does not make CompanyPension the
                  applicant or claimant and does not authorize it to provide
                  legal or pension advice.
                </p>
                <p>
                  If separate legal services are needed for a specific case,
                  they are provided by the responsible legal partner under a
                  separate arrangement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT THE PLATFORM ALLOWS / ENGLISH (Figma 1226:8082) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <p className="text-2xl font-semibold">
                The platform allows you to:
              </p>
              <CheckList
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

            <div className="flex flex-col justify-center rounded-2xl bg-brand p-10 text-white">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-accent">
                <Languages className="h-7 w-7" aria-hidden="true" />
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-accent/40 bg-white/5 px-4 py-2 text-sm font-medium text-white/90">
                Designed for international users
              </span>
              <h3 className="mt-5 text-3xl font-bold leading-tight tracking-tight">
                Complete the process in English
              </h3>
              <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-lg">
                German pension documents and provider correspondence can be
                difficult to understand, especially after leaving Germany.
                CompanyPension turns the process into a guided English-language
                flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PRODUCT PRINCIPLES (Figma 1234:72) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Our product principles"
              title="How CompanyPension is built"
            />
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <NumberedCard number="01" title="Digital first">
              <p>
                The process is built around secure document upload, automated
                extraction, guided questions, digital signing and clear next
                steps.
              </p>
            </NumberedCard>
            <NumberedCard
              number="02"
              title="Specific to German company pensions"
            >
              <p>
                Each flow is designed for a defined pension type, including bAV,
                VBL, ZVK, VddB and VddKO. CompanyPension does not provide
                general retirement planning.
              </p>
            </NumberedCard>
            <NumberedCard number="03" title="User-controlled applications">
              <p>
                The platform prepares the application from the information you
                provide. You review the details, correct anything necessary and
                sign the application yourself.
              </p>
            </NumberedCard>
            <NumberedCard number="04" title="Transparent money flow">
              <p>
                If approved, the provider or pension institution pays the money
                directly to the bank account you provide. CompanyPension does
                not receive, hold or forward approved pension money.
              </p>
            </NumberedCard>
            <NumberedCard number="05" title="Automation with human oversight">
              <p>
                Most standard steps run digitally and automatically. Human
                support is added when documents or provider correspondence need
                individual attention.
              </p>
            </NumberedCard>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1240:72) ----
          The About FAQ cards are un-overridden component-instance defaults in
          the XML export (lorem: "How do I pay for the…", "My team wants to
          can…"), and the Figma canvas is unreachable from a headless browser
          (CloudFront 403), so the real question/answer copy cannot be
          transcribed. Per copy governance we do not invent FAQ copy; the
          section renders its header and routes to the dedicated FAQ page.
          FLAGGED as a copy gap in the task report. */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center gap-8 text-center">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions about CompanyPension"
              body="Find answers about how the platform works, what it does and does not do, and how your company pension cash-out or refund is handled."
            />
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-brand bg-accent px-16 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See all FAQs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1243:163) ---- */}
      <CtaBand
        eyebrow="Start online"
        title="Start with the pension document you already have"
        body="Upload your document or answer guided questions to start a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note={
          <>
            The refund calculator is available for VBL, ZVK, VddB and VddKO. It
            is not used for bAV cash-outs.
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
