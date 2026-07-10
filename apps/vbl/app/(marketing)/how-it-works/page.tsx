import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeEuro,
  Calculator,
  Check,
  ClipboardCheck,
  Clock,
  FileText,
  Info,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { FeatureCard } from '@/components/marketing/FeatureCard';
import { StepCard } from '@/components/marketing/StepCard';
import { CtaBand } from '@/components/marketing/CtaBand';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// Local, page-only building blocks (shared shapes live in components/marketing)
// ---------------------------------------------------------------------------

function ArrowLink({
  href,
  children,
  variant = 'solid',
}: {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'ghost';
}) {
  if (variant === 'ghost') {
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
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-brand bg-accent px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-brand bg-neutral-50 px-4 py-3 text-sm text-gray-600">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function CheckBullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-gray-700">
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

/** Numbered feature card (01–04) for the "Built around your documents" grid. */
function NumberedCard({
  icon,
  number,
  title,
  paragraphs,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  paragraphs: string[];
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <div className="flex items-center justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-brand">
          {icon}
        </div>
        <span
          aria-hidden="true"
          className="text-4xl font-bold text-neutral-400"
        >
          {number}
        </span>
      </div>
      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1183:4564 — "How it works")
// ---------------------------------------------------------------------------

export default function HowItWorksPage() {
  return (
    <>
      {/* ---- HERO (Figma 1183:4617) ---- */}
      <Hero
        eyebrow="The digital process"
        title="How CompanyPension works"
        body="Upload your pension document or answer guided questions. The platform reads key details, adapts the next steps and prepares your cash-out or refund application for your review and digital signature."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        footnote={
          <>
            <p>
              CompanyPension is a digital application platform for bAV cash-outs
              and VBL, ZVK, VddB and VddKO refunds. You complete the process
              through a secure English-language flow. Automated document reading
              and smart questions reduce manual data entry, while human
              oversight is added when clarification, translation or provider
              follow-up is needed.
            </p>
            <p className="mt-3">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </>
        }
      />

      {/* ---- BUILT AROUND YOUR DOCUMENTS (Figma 1183:7417 / 1183:7664) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Built around your documents"
              title="Less typing. Clearer steps. One secure online flow."
              body="Instead of working through German pension forms on your own, start with the documents you already have. The platform extracts key information, asks only the questions relevant to your case and builds the next steps around your pension type."
            />
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <InfoNote>
              Document recognition uses OCR and automated data extraction.
              Extracted information is never submitted without your review.
            </InfoNote>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <NumberedCard
              icon={<FileText className="h-7 w-7" aria-hidden="true" />}
              number="01"
              title="Upload instead of typing everything"
              paragraphs={[
                'Upload a VBL letter, bAV contract, Direktversicherung document, provider statement or other pension document.',
                'Document recognition reads key information such as the provider, insurance number, pension type, dates and recorded values.',
                'You can review and correct every extracted detail.',
              ]}
            />
            <NumberedCard
              icon={<ScanLine className="h-7 w-7" aria-hidden="true" />}
              number="02"
              title="A flow that adapts to your case"
              paragraphs={[
                'The questions and required documents change according to your pension type, provider and answers.',
                'A bAV cash-out follows a different route from a VBL, ZVK, VddB or VddKO refund.',
              ]}
            />
            <NumberedCard
              icon={<ShieldCheck className="h-7 w-7" aria-hidden="true" />}
              number="03"
              title="Automated checks before submission"
              paragraphs={[
                'The platform checks for missing details, inconsistent answers and documents that may still be required.',
                'This reduces avoidable errors before you review and sign your application.',
              ]}
            />
            <NumberedCard
              icon={<MessageCircle className="h-7 w-7" aria-hidden="true" />}
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
        </div>
      </section>

      {/* ---- FIVE-STEP PROCESS (Figma 1183:7674) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="From first check to payout"
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

          <div className="mx-auto mt-10 max-w-4xl">
            <InfoNote>
              Start with a €199 deposit. The deposit is credited toward the
              9.75% success fee, and only the remaining service fee becomes due
              if your cash-out or refund is approved. Different deposit-refund
              rules apply to bAV cash-outs and contribution-refund cases.{' '}
              <Link
                href="/pricing"
                className="font-semibold text-brand underline underline-offset-2"
              >
                See the full pricing details
              </Link>
              .
            </InfoNote>
          </div>

          <div className="mt-10 flex justify-center">
            <ArrowLink href="/get-started">Start your claim</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- CHOOSE HOW TO BEGIN (Figma 1183:9358) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Choose how to begin"
              title="Start your claim or estimate a refund first"
              body="The main claim flow supports every pension type available on CompanyPension. The refund calculator is an optional route for VBL, ZVK, VddB and VddKO cases."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <FeatureCard
              icon={<ClipboardCheck className="h-7 w-7" aria-hidden="true" />}
              title="Start your cash-out or refund"
              body="Upload a pension document or answer a few guided questions. If your case may be possible, create secure access and continue through the full online process."
              bullets={[
                'bAV and provider-based cash-outs',
                'VBL and ZVK refunds',
                'VddB and VddKO refunds',
              ]}
              cta={{ label: 'Start your claim', href: '/get-started' }}
            />
            <FeatureCard
              icon={<Calculator className="h-7 w-7" aria-hidden="true" />}
              title="Estimate your refund first"
              body="Upload a pension document or enter your information manually to receive a first refund estimate. You can create secure access and continue into the full application process afterwards."
              bullets={['VBL', 'ZVK', 'VddB', 'VddKO']}
              cta={{ label: 'Calculate my refund', href: '/calculator' }}
            />
          </div>

          <div className="mx-auto mt-8 max-w-2xl">
            <InfoNote>
              The refund calculator is not available for bAV cash-outs.
            </InfoNote>
          </div>
        </div>
      </section>

      {/* ---- PROCESSING TIME + DIRECT PAYMENT (Figma 1183:9699 / 1184:82) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-brand">
                <Clock className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Processing time
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-brand">
                How long does it usually take?
              </h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>
                  Processing starts after your signed application has been
                  submitted. Straightforward contribution-refund cases may be
                  completed within approximately 4 to 12 weeks. The exact timing
                  is controlled by the relevant pension provider, scheme or
                  institution.
                </p>
                <p>
                  bAV cash-outs can take longer when employer involvement,
                  provider review or health insurance confirmation is required.
                  The platform shows requests and next steps as the case
                  progresses, but CompanyPension cannot control the provider’s
                  final processing time.
                </p>
              </div>
              <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Timing can depend on:
              </p>
              <div className="mt-4">
                <CheckBullets
                  items={[
                    'The pension provider or scheme',
                    'Document and identity review',
                    'Whether additional information is requested',
                    'Whether earlier pension periods need to be checked',
                    'Employer confirmation, where required',
                    'Health insurance confirmation in some bAV cases',
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-accent">
                <BadgeEuro className="h-7 w-7" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Direct payment
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-brand">
                The provider pays approved money directly to you
              </h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>A German bank account is not required in most cases.</p>
                <p>
                  Some refund routes require a SEPA-capable EUR account. If you
                  do not have one, CompanyPension can help you open a suitable
                  EUR account.
                </p>
                <p>
                  bAV cash-outs may also be payable to an international bank
                  account, depending on the provider.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href="/get-started" variant="ghost">
                  Check state pension refund &amp; bAV cash-out
                </ArrowLink>
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <p className="text-sm leading-relaxed text-gray-500">
                  If approved, the money is paid directly to the bank account you
                  provide. CompanyPension does not receive, hold or forward
                  approved pension money.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT THE PLATFORM DOES / DOES NOT DO (Figma 1184:181) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              eyebrow="From first check to payout"
              title="What the platform does — and what it does not do"
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl bg-white p-8 text-brand">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-brand">
                <Check className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-semibold text-brand">
                What CompanyPension does
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                CompanyPension provides a secure digital application platform
                for:
              </p>
              <div className="mt-6">
                <CheckBullets
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

            <div className="flex flex-col rounded-2xl bg-white p-8 text-brand">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-gray-500">
                <X className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-semibold text-brand">
                What CompanyPension does not do
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                CompanyPension is not your pension provider, pension advisor,
                insurance broker, financial advisor, tax advisor or legal
                representative for the claim.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'CompanyPension does not decide whether a refund is approved',
                  'CompanyPension does not decide whether a bAV cash-out is granted',
                  'CompanyPension does not provide pension, legal, tax, insurance or financial advice',
                  'CompanyPension does not apply as the claimant',
                  'CompanyPension does not argue your legal position',
                  'CompanyPension does not receive, hold or forward approved pension money',
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
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-4 text-center text-sm leading-relaxed text-white/70">
            <p>
              You review and sign the application yourself and remain the
              applicant and claimant. The relevant provider, pension scheme or
              institution makes the final decision and pays approved money
              directly to the bank account you provide.
            </p>
            <p>
              You may give ATLAES GmbH limited authorization to receive and
              forward provider correspondence and to receive information about
              the final decision and approved amount. This allows the platform
              to show follow-up requests and calculate the agreed service fee.
              It does not make ATLAES GmbH the applicant or claimant.
            </p>
            <p>
              If separate legal services are needed for a specific case, they
              are provided by the responsible legal partner under a separate
              arrangement.
            </p>
          </div>
        </div>
      </section>

      {/* ---- FAQ teaser (Figma 1185:942 — items are placeholder; link out) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions about the digital process"
            />
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-600">
              Find answers about pricing, timelines, documents and what happens
              after you submit your application. See the full list of questions
              and answers on our FAQ page.
            </p>
            <div className="mt-9">
              <ArrowLink href="/faq">See all FAQs</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1186:1042) ---- */}
      <CtaBand
        title="Ready to start your claim?"
        body="Upload your pension document or answer guided questions to start a bAV cash-out or company pension refund. For VBL, ZVK, VddB and VddKO refunds, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note="The refund calculator is not available for bAV cash-outs."
      />
    </>
  );
}
