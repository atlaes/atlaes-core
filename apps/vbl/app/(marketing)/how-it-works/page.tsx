import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ChevronRight, Info, X } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';
import { FAQ } from '@/components/marketing/faqItems';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

/**
 * Charcoal ink used for every heading/title on the page's light sections and
 * card h3s (updated Figma design — was brand green). Dark sections keep their
 * white/accent titles. Mirrors the Home page's INK constant so the two pages
 * share the same design-system value.
 */
const INK = 'text-[#231f20]';

/**
 * Brand-green eyebrow pill for light sections. In the updated design the
 * eyebrow pill stays brand green even though the heading beside it is charcoal
 * (INK). Dark sections keep the default `currentColor` pill (white). Mirrors
 * the value used on the home and pricing pages.
 */
const EYEBROW_LIGHT = 'border-brand/30 bg-transparent text-brand';

// ---------------------------------------------------------------------------
// Local, page-only building blocks (shared shapes live in components/marketing)
// ---------------------------------------------------------------------------

/**
 * Muted info note (updated Figma design). Green is the light `#f3fced` tint
 * used everywhere on this page (matching the Home page's InfoNote); blue is the
 * light-blue authorization callout in the "does / does not do" section.
 */
function InfoNote({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: 'green' | 'blue';
}) {
  const tones = {
    green: 'border border-brand/20 bg-[#f3fced]',
    blue: 'border border-blue-200 bg-blue-50',
  } as const;
  return (
    <div
      className={`flex items-start gap-2 rounded-brand ${tones[tone]} px-4 py-3 text-sm text-gray-600`}
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** Numbered feature card (01–04) for the "Built around your documents" grid. */
function NumberedCard({
  number,
  title,
  paragraphs,
}: {
  number: string;
  title: string;
  paragraphs: string[];
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#ececec] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <span aria-hidden="true" className={`text-3xl font-semibold ${INK}`}>
        {number}
      </span>
      <h3 className={`mt-5 text-lg font-semibold ${INK}`}>{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/**
 * Numbered process step card (five-step section). Page-local restyle of the
 * shared StepCard: white card, thin `#ececec` border, subtle shadow, a dark
 * "Step N" pill, charcoal title. Kept local so the shared StepCard (used by the
 * not-yet-refreshed product pages) is not half-flipped to the new design.
 */
function StepCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#ececec] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      <span className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">
        {number}
      </span>
      <h3 className={`mt-6 text-xl font-semibold ${INK}`}>{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/**
 * Route-chooser card (choose-how-to-begin). Page-local restyle of the shared
 * FeatureCard: white card, subtle shadow, 48px circular brand icon badge,
 * charcoal title, check bullets and a solid/outline CTA.
 */
function ChooseCard({
  iconSrc,
  title,
  body,
  bullets,
  note,
  cta,
  ctaVariant = 'solid',
}: {
  iconSrc: string;
  title: string;
  body: string;
  bullets: string[];
  note?: string;
  cta: { label: string; href: string };
  ctaVariant?: 'solid' | 'outline';
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#ececec] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      {/* Self-badged Figma icon (dark circle + accent glyph baked in).
          eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconSrc} alt="" aria-hidden="true" className="mb-6 h-12 w-12" />
      <h3 className={`text-xl font-semibold ${INK}`}>{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
      <p className="mt-6 text-base text-gray-600">Available for:</p>
      <ul className="mt-3 space-y-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3 text-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/icons/check-bullet.svg"
              alt=""
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className="text-base">{bullet}</span>
          </li>
        ))}
      </ul>
      {note ? (
        <div className="mt-6">
          <InfoNote>{note}</InfoNote>
        </div>
      ) : null}
      <div className="mt-8 flex flex-1 items-end">
        <Link
          href={cta.href}
          className={
            ctaVariant === 'outline'
              ? `w-full rounded-brand border border-[#231f20]/25 bg-white px-6 py-3 text-center text-base font-semibold ${INK} transition-colors hover:bg-neutral-50`
              : 'w-full rounded-brand bg-accent px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover'
          }
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

/** Arrow bullet list backed by the exported Figma glyphs (does / does-not). */
function ArrowBullets({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-gray-700">
          <Image
            src={marker}
            alt=""
            aria-hidden="true"
            width={512}
            height={512}
            className="mt-1.5 h-3.5 w-3.5 shrink-0"
          />
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Home/how-it-works FAQ (Figma 1185:255). Questions follow the design; answers
// come from the shared FAQ master copy via faqItems.tsx (mostly the "Digital
// process and documents" category). Two items are composed from adjacent master
// copy because the master has no exact match — flagged for client review:
// "Do you provide translations?" and the combined "Who signs and submits".
const HOWITWORKS_FAQ_ITEMS: FaqAccordionItem[] = [
  FAQ.calculatorFirst,
  { ...FAQ.howItWorks, question: 'Is the process fully online?' },
  {
    ...FAQ.uploadInsteadManual,
    question: 'Can I upload documents instead of entering everything manually?',
  },
  FAQ.ocrOrAi,
  {
    ...FAQ.manageCorrespondence,
    question: 'Do I have to manage German pension letters myself?',
  },
  {
    // Composed: the master has no standalone translations answer, only the
    // recurring "clarification, translation or follow-up" support line.
    question: 'Do you provide translations?',
    answer: (
      <>
        <p>Most of the process runs in an English-language online flow.</p>
        <p className="mt-2">
          Human support is added when a document or a provider request needs
          clarification, translation or follow-up, so you do not have to work
          through German pension letters on your own.
        </p>
      </>
    ),
  },
  {
    // Combines the master's "Who reviews and signs" + "Who submits" answers.
    question: 'Who signs and submits the application?',
    answer: (
      <>
        {FAQ.whoSignsReviews.answer}
        {FAQ.whoSubmits.answer}
      </>
    ),
  },
  { ...FAQ.whoReceives, question: 'Who receives the money?' },
  FAQ.bankAccount,
  { ...FAQ.howLong, question: 'How long does it usually take?' },
  {
    ...FAQ.cannotProceed,
    question: 'What happens if my cash-out or refund is not possible?',
  },
  {
    ...FAQ.whoSubmits,
    question: 'Does CompanyPension decide whether my claim is approved?',
  },
  {
    ...FAQ.advisorOrLawFirm,
    question: 'Is CompanyPension a pension advisor or law firm?',
  },
];

// ---------------------------------------------------------------------------
// Page (Figma frame 1183:4564 — "How it works")
// ---------------------------------------------------------------------------

export default function HowItWorksPage() {
  return (
    <>
      {/* ---- HERO (Figma 1183:4617) ---- */}
      <Hero
        eyebrow="The digital process"
        title="How CompanyPension"
        highlight="works"
        showDefaultGlows={false}
        body={
          <>
            Upload your pension document or answer guided questions. The
            platform reads key details, adapts the next steps and prepares your
            cash-out or refund application for your review and digital
            signature.
            <span className="mt-5 block text-base text-white/70">
              CompanyPension is a digital application platform for bAV cash-outs
              and VBL, ZVK, VddB and VddKO refunds. You complete the process
              through a secure English-language flow. Automated document reading
              and smart questions reduce manual data entry, while human
              oversight is added when clarification, translation or provider
              follow-up is needed.
            </span>
          </>
        }
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        footnote={
          <p>
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        }
      />

      {/* ---- BUILT AROUND YOUR DOCUMENTS (Figma 1183:7417 / 1183:7664) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="Built around your documents"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Less typing. Clearer steps. One secure online flow."
              body="Instead of working through German pension forms on your own, start with the documents you already have. The platform extracts key information, asks only the questions relevant to your case and builds the next steps around your pension type."
            />
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <NumberedCard
              number="01"
              title="Upload instead of typing everything"
              paragraphs={[
                'Upload a VBL letter, bAV contract, Direktversicherung document, provider statement or other pension document.',
                'Document recognition reads key information such as the provider, insurance number, pension type, dates and recorded values.',
                'You can review and correct every extracted detail.',
              ]}
            />
            <NumberedCard
              number="02"
              title="A flow that adapts to your case"
              paragraphs={[
                'The questions and required documents change according to your pension type, provider and answers.',
                'A bAV cash-out follows a different route from a VBL, ZVK, VddB or VddKO refund.',
              ]}
            />
            <NumberedCard
              number="03"
              title="Automated checks before submission"
              paragraphs={[
                'The platform checks for missing details, inconsistent answers and documents that may still be required.',
                'This reduces avoidable errors before you review and sign your application.',
              ]}
            />
            <NumberedCard
              number="04"
              title="Human oversight when needed"
              paragraphs={[
                'Most standard steps run digitally and automatically.',
                'Human support is added when a document cannot be read reliably or when a provider request needs clarification, translation or follow-up.',
              ]}
            />
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            You stay in the English online flow. The platform handles the
            technical application process in the background.
          </p>

          <div className="mx-auto mt-6 max-w-3xl">
            <InfoNote tone="green">
              Document recognition uses OCR and automated data extraction.
              Extracted information is never submitted without your review.
            </InfoNote>
          </div>
        </div>
      </section>

      {/* ---- FIVE-STEP PROCESS (Figma 1183:7674) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="From first check to payout"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Complete your company pension claim online in five steps"
              body="Upload your documents or answer guided questions, complete the secure online flow and sign your application digitally."
            />
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="Step 1"
              title="Upload instead of typing everything"
              body="Upload a pension document or answer a few guided questions. The platform reads the available details and checks whether your bAV cash-out or company pension refund may be possible."
            />
            <StepCard
              number="Step 2"
              title="Secure your claim"
              body="If your case may be possible, create your secure account, review the pricing and pay the €199 deposit to activate the full process. Your deposit is credited toward your final service fee."
            />
            <StepCard
              number="Step 3"
              title="Complete your details"
              body="Upload your ID and any other documents still needed. Add or confirm your personal, pension and bank details. Information extracted from your documents can be pre-filled for you to review and correct."
            />
            <StepCard
              number="Step 4"
              title="Review, sign and submit digitally"
              body="Review the completed application, confirm that the information is correct and sign it yourself online. After you sign, the application is technically transmitted to the relevant pension provider, scheme or institution through the CompanyPension platform. You remain the applicant and claimant."
            />
            <div className="md:col-span-2">
              <StepCard
                number="Step 5"
                title="Receive your money and pay the remaining service fee"
                body="The provider or pension institution reviews your application and makes the final decision. Where authorised, correspondence and requests for additional information can be displayed through your secure CompanyPension account. If approved, the money is paid directly to the bank account you provide. Your €199 deposit is credited toward the 9.75% success fee, and only the remaining service fee becomes due. CompanyPension does not receive, hold or forward approved pension money."
              />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <InfoNote tone="green">
              <p>
                Start with a €199 deposit. The deposit is credited toward the
                9.75% success fee, and only the remaining service fee becomes
                due if your cash-out or refund is approved. Different
                deposit-refund rules apply to bAV cash-outs and
                contribution-refund cases. See the full pricing details.
              </p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand underline underline-offset-2 transition-colors hover:text-brand/70"
              >
                View pricing details
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </InfoNote>
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/get-started"
              className="rounded-brand bg-accent px-16 py-3.5 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Start your claim
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CHOOSE HOW TO BEGIN (Figma 1183:8689, photo bg "image 818") ---- */}
      <section className="relative overflow-hidden bg-neutral-50">
        <Image
          src="/marketing/shared/advisors-reviewing-documents-desk.png"
          alt=""
          aria-hidden="true"
          width={500}
          height={269}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 grayscale"
        />
        <div className={`${CONTAINER} relative py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="Choose how to begin"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Start your claim or estimate a refund first"
              body="The main claim flow supports every pension type available on CompanyPension. The refund calculator is an optional route for VBL, ZVK, VddB and VddKO cases."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <ChooseCard
              iconSrc="/marketing/icons/start-cashout-icon.svg"
              title="Start your cash-out or refund"
              body="Upload a pension document or answer a few guided questions. If your case may be possible, create secure access and continue through the full online process."
              bullets={[
                'bAV and provider-based cash-outs',
                'VBL and ZVK refunds',
                'VddB and VddKO refunds',
              ]}
              cta={{ label: 'Start your claim', href: '/get-started' }}
            />
            <ChooseCard
              iconSrc="/marketing/icons/estimate-refund-icon.svg"
              title="Estimate your refund first"
              body="Upload a pension document or enter your information manually to receive a first refund estimate. You can create secure access and continue into the full application process afterwards."
              bullets={['VBL', 'ZVK', 'VddB', 'VddKO']}
              note="The refund calculator is not available for bAV cash-outs."
              cta={{ label: 'Calculate my refund', href: '/calculator' }}
              ctaVariant="outline"
            />
          </div>
        </div>
      </section>

      {/* ---- PROCESSING TIME (Figma 1183:9646, dark band) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Processing time"
                title={
                  <span className="text-accent">
                    How long does it usually take?
                  </span>
                }
              />
              <p className="mt-6 text-base leading-relaxed text-white/80">
                Processing starts after your signed application has been
                submitted. Straightforward contribution-refund cases may be
                completed within approximately 4 to 12 weeks. The exact timing
                is controlled by the relevant pension provider, scheme or
                institution.
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                Timing can depend on:
              </p>
              <ul className="mt-5 space-y-3">
                {[
                  'The pension provider or scheme',
                  'Document and identity review',
                  'Whether additional information is requested',
                  'Whether earlier pension periods need to be checked',
                  'Employer confirmation, where required',
                  'Health insurance confirmation in some bAV cases',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-brand">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-base leading-relaxed text-white/90">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <InfoNote>
                  bAV cash-outs can take longer when employer involvement,
                  provider review or health insurance confirmation is required.
                  The platform shows requests and next steps as the case
                  progresses, but CompanyPension cannot control the
                  provider&rsquo;s final processing time.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DIRECT PAYMENT (Figma 1184:75, centered on photo bg) ---- */}
      <section className="relative overflow-hidden bg-neutral-50">
        <Image
          src="/marketing/shared/berlin-landmark-building-landscape.png"
          alt=""
          aria-hidden="true"
          width={500}
          height={319}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10 grayscale"
        />
        <div
          className={`${CONTAINER} relative flex flex-col items-center py-20 text-center sm:py-24`}
        >
          <div className={INK}>
            <SectionHeading
              eyebrow="Direct payment"
              eyebrowClassName={EYEBROW_LIGHT}
              title="The provider pays approved money directly to you"
            />
          </div>
          <div className="mt-8 max-w-3xl space-y-4 text-base leading-relaxed text-gray-600">
            <p>A German bank account is not required in most cases.</p>
            <p>
              Some refund routes require a SEPA-capable EUR account. If you do
              not have one, CompanyPension can help you open a suitable EUR
              account.
            </p>
            <p>
              bAV cash-outs may also be payable to an international bank
              account, depending on the provider.
            </p>
          </div>
          <p className="mt-8 max-w-xl text-sm font-semibold leading-relaxed text-gray-700">
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        </div>
      </section>

      {/* ---- WHAT THE PLATFORM DOES / DOES NOT DO (Figma 1184:118) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="From first check to payout"
              eyebrowClassName={EYEBROW_LIGHT}
              title="What the platform does — and what it does not do"
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl bg-[#f3fced] p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-accent">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className={`text-xl font-semibold ${INK}`}>
                  What <span className="text-brand">CompanyPension</span> does
                </h3>
              </div>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                CompanyPension provides a secure digital application platform
                for:
              </p>
              <div className="mt-5">
                <ArrowBullets
                  marker="/marketing/how-it-works/how-it-works-asset-10.png"
                  items={[
                    'Guided bAV cash-out and company pension refund flows',
                    'Secure document upload',
                    'OCR and automated extraction of pension details',
                    'Case-specific questions and document requirements',
                    'Automated checks for missing or inconsistent information',
                    'Preparation of the application from the information you provide',
                    'Digital review and signing',
                    'Technical transmission after you sign',
                    'Secure display of provider correspondence and next steps',
                    'Human oversight when clarification, translation or follow-up is needed',
                    'Assistance opening a suitable EUR account where required',
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl bg-red-50 p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                  <X className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className={`text-xl font-semibold ${INK}`}>
                  What <span className="text-red-600">CompanyPension</span> does
                  not do
                </h3>
              </div>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                CompanyPension is not your pension provider, pension advisor,
                insurance broker, financial advisor, tax advisor or legal
                representative for the claim.
              </p>
              <div className="mt-5">
                <ArrowBullets
                  marker="/marketing/how-it-works/how-it-works-asset-09.png"
                  items={[
                    'CompanyPension does not decide whether a refund is approved',
                    'CompanyPension does not decide whether a bAV cash-out is granted',
                    'CompanyPension does not provide pension, legal, tax, insurance or financial advice',
                    'CompanyPension does not apply as the claimant',
                    'CompanyPension does not argue your legal position',
                    'CompanyPension does not receive, hold or forward approved pension money',
                  ]}
                />
              </div>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            You review and sign the application yourself and remain the
            applicant and claimant. The relevant provider, pension scheme or
            institution makes the final decision and pays approved money
            directly to the bank account you provide.
          </p>

          <div className="mx-auto mt-6 max-w-4xl space-y-4">
            <InfoNote tone="blue">
              You may give ATLAES GmbH limited authorization to receive and
              forward provider correspondence and to receive information about
              the final decision and approved amount. This allows the platform
              to show follow-up requests and calculate the agreed service fee.
              It does not make ATLAES GmbH the applicant or claimant.
            </InfoNote>
            <InfoNote tone="green">
              If separate legal services are needed for a specific case, they
              are provided by the responsible legal partner under a separate
              arrangement.
            </InfoNote>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1185:255) — answers from the shared FAQ master copy
          via faqItems.tsx (FAQ CompanyPension 22062026.pdf) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="FAQ"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Questions about the digital process"
            />
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion items={HOWITWORKS_FAQ_ITEMS} defaultOpenIndex={0} />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/faq"
              className="rounded-brand bg-accent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See All FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1186:1036) ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Ready to <span className="text-accent">start your claim?</span>
          </>
        }
        body="Upload your pension document or answer guided questions to start a bAV cash-out or company pension refund. For VBL, ZVK, VddB and VddKO refunds, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note={
          <>
            <span className="block text-accent">
              The refund calculator is not available for bAV cash-outs.
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
