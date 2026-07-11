import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Calculator,
  Check,
  ClipboardCheck,
  Info,
  Minus,
  Plus,
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
}: {
  href: string;
  children: ReactNode;
}) {
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

function InfoNote({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'blue';
}) {
  const tones = {
    neutral: 'bg-neutral-50',
    green: 'bg-accent/10',
    blue: 'bg-blue-50',
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
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <span aria-hidden="true" className="text-3xl font-semibold text-brand">
        {number}
      </span>
      <h3 className="mt-5 text-lg font-semibold text-brand">{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
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

/** Static FAQ item matching the Figma accordion markup (Task 7 adds behavior). */
function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer?: ReactNode;
}) {
  const open = Boolean(answer);
  return (
    <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h3
          className={`text-lg font-semibold ${
            open
              ? 'text-brand underline decoration-brand/40 underline-offset-4'
              : 'text-gray-900'
          }`}
        >
          {question}
        </h3>
        {open ? (
          <Minus
            className="mt-1 h-5 w-5 shrink-0 text-brand"
            aria-hidden="true"
          />
        ) : (
          <Plus
            className="mt-1 h-5 w-5 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        )}
      </div>
      {answer ? (
        <div className="mt-4 text-base leading-relaxed text-gray-600">
          {answer}
        </div>
      ) : null}
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
              CompanyPension is a digital application platform for bAV
              cash-outs and VBL, ZVK, VddB and VddKO refunds. You complete the
              process through a secure English-language flow. Automated
              document reading and smart questions reduce manual data entry,
              while human oversight is added when clarification, translation or
              provider follow-up is needed.
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
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Built around your documents"
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
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </InfoNote>
          </div>

          <div className="mt-10 flex justify-center">
            <ArrowLink href="/get-started">Start your claim</ArrowLink>
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
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Choose how to begin"
              title="Start your claim or estimate a refund first"
              body="The main claim flow supports every pension type available on CompanyPension. The refund calculator is an optional route for VBL, ZVK, VddB and VddKO cases."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <FeatureCard
              icon={null}
              iconImageSrc="/marketing/icons/start-cashout-icon.svg"
              title="Start your cash-out or refund"
              body="Upload a pension document or answer a few guided questions. If your case may be possible, create secure access and continue through the full online process."
              bulletsLabel="Available for:"
              bullets={[
                'bAV and provider-based cash-outs',
                'VBL and ZVK refunds',
                'VddB and VddKO refunds',
              ]}
              cta={{ label: 'Start your claim', href: '/get-started' }}
            />
            <FeatureCard
              icon={null}
              iconImageSrc="/marketing/icons/estimate-refund-icon.svg"
              title="Estimate your refund first"
              body="Upload a pension document or enter your information manually to receive a first refund estimate. You can create secure access and continue into the full application process afterwards."
              bulletsLabel="Available for:"
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
          <div className="text-brand">
            <SectionHeading
              eyebrow="Direct payment"
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
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="From first check to payout"
              title="What the platform does — and what it does not do"
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl bg-accent/10 p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-accent">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-semibold text-gray-900">
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
                <h3 className="text-xl font-semibold text-gray-900">
                  What <span className="text-red-600">CompanyPension</span>{' '}
                  does not do
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

      {/* ---- FAQ (Figma 1185:255 — static markup; accordion arrives in Task 7) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions about the digital process"
            />
          </div>

          <div className="mx-auto mt-12 max-w-4xl space-y-4">
            <FaqItem
              question="Do I need to use the calculator first?"
              answer={
                <>
                  <p>
                    No. You can start your claim directly if you already know
                    your pension type or provider.
                  </p>
                  <p className="mt-2">
                    The quick check is helpful if you want a refund estimate
                    first or want to see whether your bAV cash-out can be
                    started.
                  </p>
                </>
              }
            />
            <FaqItem question="Is the process fully online?" />
            <FaqItem question="Can I upload documents instead of entering everything manually?" />
            <FaqItem question="Does CompanyPension use OCR or AI?" />
            <FaqItem question="Do I have to manage German pension letters myself?" />
            <FaqItem question="Do you provide translations?" />
            <FaqItem question="Who signs and submits the application?" />
            <FaqItem question="Who receives the money?" />
            <FaqItem question="Do I need a German bank account?" />
            <FaqItem question="How long does it usually take?" />
            <FaqItem question="What happens if my cash-out or refund is not possible?" />
            <FaqItem question="Does CompanyPension decide whether my claim is approved?" />
            <FaqItem question="Is CompanyPension a pension advisor or law firm?" />
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
              provide. CompanyPension does not receive, hold or forward
              approved pension money.
            </span>
          </>
        }
      />
    </>
  );
}
