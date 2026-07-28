import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, Check, Info, User, X } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import {
  SectionHeading,
  FAQ_EYEBROW_WIDTH,
} from '@/components/marketing/SectionHeading';
import { StepCard } from '@/components/marketing/StepCard';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ImportantCallout } from '@/components/marketing/ImportantCallout';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { FAQ } from '@/components/marketing/faqItems';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

/**
 * Placeholder for FAQ entries the design lists but the master copy does not
 * answer. Copy governance: never invent FAQ answers — surface the question and
 * route the user, then replace once the client supplies the text.
 */
const FAQ_ANSWER_PENDING = (
  <p>
    The full answer to this question will be published here soon. You can also{' '}
    <Link href="/faq" className="font-semibold text-brand underline">
      see all FAQs
    </Link>{' '}
    in the meantime.
  </p>
);

// ---------------------------------------------------------------------------
// CTA routing
// ---------------------------------------------------------------------------
// The refund calculator lives at /calculator (renders <ManualVBLCalculator>),
// which internally offers BOTH an upload-assisted path (EntryMethod 'upload' +
// 'upload-review' screen, OCR via extractPensionDocument) and a manual path
// (EntryMethod 'manual'). There is no separate upload-only route, so every
// calculator CTA — "Upload my pension document" and "Enter details manually"
// alike — deep-links to /calculator; the flow's own entry-method screen lets
// the user pick. /calculator-entry-a is the paid onboarding flow, not the
// calculator, so it is intentionally NOT used here.
const CALC_HREF = '/calculator';
// Funnel-start CTAs enter the paid refund flow (matches the vbl-refund page).
const START_HREF = '/get-started';
const PRICING_HREF = '/pricing';
const PROCESS_HREF = '/how-it-works';
// ROUTE_PENDING: the bAV cash-out product is a sibling flow that is not part of
// this marketing build; these cross-links point at the expected slug and must
// be reconciled once that page ships.
const BAV_HREF = '/company-pension-cash-out';

// ---------------------------------------------------------------------------
// Local, page-only building blocks
// ---------------------------------------------------------------------------

function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-gray-700">
          {/* Filled brand-green disc with a white tick, matching Figma
              1339:3086 and the shared `check-bullet.svg` used on the about and
              pricing pages. This list previously rendered a bare lucide tick
              with no disc, which is the checklist-icon mismatch the client
              flagged on 2026-07-23. */}
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand"
          >
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CrossList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-gray-700">
          <X
            className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Neutral dotted list for "your document may show" style enumerations. */
function TermList({ items }: { items: string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-base leading-relaxed text-gray-700"
        >
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoNote({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green';
}) {
  const tones = { neutral: 'bg-neutral-50', green: 'bg-accent/10' } as const;
  return (
    <div
      className={`flex items-start gap-2 rounded-brand ${tones[tone]} px-4 py-3 text-sm text-gray-600`}
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function ArrowLink({
  href,
  children,
  variant = 'solid',
  fullWidth = false,
  // The updated design renders this page's section CTAs as plain buttons with
  // no trailing arrow (verified against Figma 1346:213 and 1353:419), so the
  // arrow is opt-in rather than the default despite the component's name.
  showArrow = false,
}: {
  href: string;
  children: ReactNode;
  /** Stretches the button to its container and centres the label — Figma
   *  1346:213 renders the calculator-scope CTAs as block buttons. */
  fullWidth?: boolean;
  /** The updated design drops the trailing arrow on section CTAs. */
  showArrow?: boolean;
  /**
   * `link` renders plain underlined text rather than a button — Figma
   * 1358:1204 shows "See how the full process works" as a text link beside the
   * solid CTA, not as a second button (client feedback 2026-07-23).
   */
  variant?: 'solid' | 'outline' | 'outlineDark' | 'link';
}) {
  const styles =
    variant === 'solid'
      ? // `border-transparent` keeps the solid button the same height as the
        // outline one, so a solid and an outline CTA sitting in adjacent cards
        // line up exactly rather than 2px apart (client feedback 2026-07-23).
        'rounded-brand border border-transparent px-6 py-3 bg-accent text-brand hover:bg-accent-hover'
      : variant === 'outline'
        ? 'rounded-brand px-6 py-3 border border-brand/25 text-brand hover:bg-brand/5'
        : variant === 'outlineDark'
          ? 'rounded-brand px-6 py-3 border border-white/60 text-white hover:bg-white/10'
          : 'text-brand underline underline-offset-4 hover:text-brand/70';
  return (
    <Link
      href={href}
      className={`${
        fullWidth ? 'flex w-full justify-center' : 'inline-flex'
      } items-center gap-2 text-base font-semibold transition-colors ${styles}`}
    >
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}

/** Numbered option card used by the "start your estimate" chooser. */
function OptionCard({
  step,
  title,
  body,
  children,
}: {
  step: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-brand">
        {step}
      </span>
      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1338:72 — "Company Pension Refund Calculator")
// Marketing page ABOUT the refund calculator. Copy verbatim from the design
// XML. Server component; the marketing layout supplies nav + footer.
// ---------------------------------------------------------------------------

export default function RefundCalculatorPage() {
  return (
    <>
      {/* ---- HERO (Figma 1338:3012) ---- */}
      <Hero
        eyebrow="Refund calculator"
        eyebrowWidth={259}
        title="Estimate your VBL, ZVK, VddB or VddKO refund"
        body="Upload a pension document or enter what you know to receive a first estimate. You can review the result before deciding whether to continue with your refund application online."
        primaryCta={{
          label: 'Upload my pension document',
          href: CALC_HREF,
        }}
        secondaryCta={{ label: 'Enter details manually', href: CALC_HREF }}
        footnote={
          <div className="space-y-3">
            <p>
              Have a bAV, Direktversicherung, Pensionskasse, Pensionsfonds or
              provider-based company pension? Use the bAV cash-out check
              instead.
            </p>
            <p>
              Your result is an estimate based on the information available. The
              pension scheme or institution confirms the final amount and
              decides whether your refund is approved.
            </p>
            {/* Accent green (#9FE870 = `text-accent`) per client feedback
                2026-07-23; the two paragraphs above stay muted white. */}
            <p className="text-accent">
              Using the calculator does not create a contract or obligation. You
              continue only if you choose to.
            </p>
          </div>
        }
      />

      {/* ---- MADE FOR PEOPLE / GUIDED ONLINE PROCESS (Figma 1338:3029) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="Made for people who no longer want to deal with German paperwork"
              body="Company pension cases are often confusing after you leave Germany."
            />
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
              Your provider may write in German. Your former employer may no
              longer be involved. Your documents may mention bAV, VBL, ZVK, VddB
              or VddKO without clearly explaining what you can do next.
            </p>
          </div>

          <div className="mt-14 grid items-start gap-10 lg:grid-cols-2">
            <div>
              <p className="text-lg font-semibold text-brand">
                CompanyPension turns this into a guided online process:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'You enter your pension details online',
                    'You upload your provider documents or add the details manually',
                    'The platform builds the right cash-out or refund flow based on your answers',
                    'You review your details and sign online',
                    'You submit your request digitally inside the platform',
                    'Human support is available when translation, clarification or follow-up is needed',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                The goal is simple: help you handle your German company pension
                cash-out or refund without getting lost in German paperwork
              </p>
            </div>
            {/* Figma 1338:3056 "image 827" — supporting illustration (same
                source as vbl-refund 1244:3769; deduped to marketing/shared) */}
            <div
              aria-hidden="true"
              className="hidden min-h-[420px] items-center justify-center rounded-2xl bg-neutral-50 lg:flex"
            >
              <Image
                src="/marketing/shared/guided-process-smiling-man-laptop.png"
                alt=""
                width={521}
                height={597}
                className="h-full max-h-[420px] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- START YOUR ESTIMATE / CHOOSER (Figma 1339:3086) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Start your estimate"
              eyebrowWidth={272}
              title="Upload a document or enter the details yourself"
              body="Choose whichever option is easier for you."
            />
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
              Uploading a document can reduce the amount you need to enter
              manually. You can also start without uploading anything.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <OptionCard
              step="1"
              title="Upload-assisted estimate"
              body="Upload a VBL, ZVK, VddB or VddKO letter, statement or pension document."
            >
              <p className="mt-6 text-base font-semibold text-brand">
                Where possible, the platform reads available information such
                as:
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'Pension scheme or institution',
                    'Insurance or membership number',
                    'Employment or contribution periods',
                    'Employee contributions',
                    'Salary or pension values shown on the document',
                  ]}
                />
              </div>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                You can review and correct every extracted detail before it is
                used.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                Best if you have
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'A pension letter',
                    'An annual statement',
                    'A contribution record',
                    'An insurance or membership number',
                    'An old provider document',
                  ]}
                />
              </div>
              <p className="mt-6 min-h-[3.75rem] text-sm leading-relaxed text-gray-500">
                Uploaded documents are processed securely for your estimate and
                next-step routing. See the Privacy Policy for details about
                processing, retention and deletion.
              </p>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={CALC_HREF}>Upload my document</ArrowLink>
              </div>
            </OptionCard>

            <OptionCard
              step="2"
              title="Manual estimate"
              body="Enter the information yourself if you do not want to upload a document yet."
            >
              <p className="mt-6 text-base font-semibold text-brand">
                The calculator may ask for:
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'Your pension scheme',
                    'Your German employer',
                    'Your employment dates',
                    'Your contribution period',
                    'Your employee contribution amount',
                    'Your salary, where relevant',
                    'Your federal state or pension institution',
                  ]}
                />
              </div>
              <p className="mt-6 text-base font-semibold text-brand">
                Best if you know
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'When you started and stopped working',
                    'Which employer you worked for',
                    'Which pension scheme appears on your documents',
                    'Your salary or contribution amounts',
                    'Some, but not all, of your pension details',
                  ]}
                />
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={CALC_HREF} variant="outline">
                  Enter details manually
                </ArrowLink>
              </div>
            </OptionCard>
          </div>

          <div className="mt-8 rounded-2xl border border-neutral-400 bg-white p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-brand">
              3
            </span>
            <h3 className="mt-6 text-xl font-semibold text-brand">
              Not sure what pension you have?
            </h3>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Start with the document title, provider name or scheme name shown
              on your letter.
            </p>
            <div className="mt-6 grid gap-10 lg:grid-cols-2">
              <div>
                <p className="text-base font-semibold text-brand">
                  The platform helps identify whether you have:
                </p>
                <div className="mt-4">
                  <CheckList
                    items={[
                      'VBL',
                      'ZVK',
                      'VddB',
                      'VddKO',
                      'A bAV or Direktversicherung',
                      'A DRV state pension document',
                    ]}
                  />
                </div>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  If this refund calculator is not the right route, you will be
                  guided toward the relevant alternative.
                </p>
              </div>
              <div>
                <p className="text-base font-semibold text-brand">Best if:</p>
                <div className="mt-4">
                  <CheckList
                    items={[
                      'You have a German pension document but do not understand it',
                      'You recognise only the provider name',
                      'You are unsure whether you need a refund or cash-out',
                      'You do not know which pension scheme you paid into',
                    ]}
                  />
                </div>
              </div>
            </div>
            {/* Centred button with the reassurance line beneath it, both
                inside this card — client feedback 2026-07-23. The line used to
                sit outside the card entirely, under the whole section. */}
            <div className="mt-8 flex justify-center">
              <ArrowLink href={CALC_HREF} variant="outline">
                Identify my pension document
              </ArrowLink>
            </div>
            <p className="mt-6 text-center text-base leading-relaxed text-gray-600">
              You can see your estimate before starting the paid refund process.
            </p>
          </div>
        </div>
      </section>

      {/* ---- CALCULATOR SCOPE (Figma 1346:213) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Calculator scope"
              title="Which refund do you want to estimate?"
              body="The calculator is designed for pensions where a first estimate can be based on employment periods, salary information, contribution records or pension documents."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <h3 className="text-xl font-semibold text-brand">
                Estimate a VBL or ZVK refund
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                You may have paid into VBL or a ZVK if you worked for a German
                public-sector employer, such as:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'A university',
                    'A public hospital',
                    'A research institute',
                    'A municipality',
                    'A public authority',
                    'Another public-sector organisation',
                  ]}
                />
              </div>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                The calculator can use the information available to estimate
                eligible employee contributions.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                Helpful information
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'VBL or ZVK documents',
                    'Employment start and end dates',
                    'Contribution periods',
                    'Employee contribution amounts',
                    'Salary or payslip information',
                    'Annual pension statements',
                  ]}
                />
              </div>
              {/* Figma 1346:213: left block = solid accent, right block =
                  outline; both are full-width and carry no arrow. Ours had two
                  solid inline buttons, which is the button colour/alignment
                  mismatch the client flagged on 2026-07-23. */}
              <div className="mt-8 flex flex-1 flex-col justify-end">
                <ArrowLink href={CALC_HREF} fullWidth>
                  Estimate my VBL or ZVK refund
                </ArrowLink>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-gray-500">
                Uploaded documents are processed securely for your estimate and
                next-step routing. See the Privacy Policy for details about
                processing, retention and deletion.
              </p>
            </div>

            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <h3 className="text-xl font-semibold text-brand">
                Estimate a VddB or VddKO refund
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                You may have paid into VddB or VddKO if you worked in German:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Theatre',
                    'Stage production',
                    'Opera',
                    'Dance',
                    'Orchestra employment',
                  ]}
                />
              </div>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                The calculator can use your employment and contribution
                information to provide a first estimate.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                Helpful information
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'VddB or VddKO letters',
                    'Employment dates',
                    'Stage or orchestra employer details',
                    'Contribution periods',
                    'Employee contribution information',
                    'Pension statements',
                  ]}
                />
              </div>
              <div className="mt-8 flex flex-1 flex-col justify-end">
                <ArrowLink href={CALC_HREF} variant="outline" fullWidth>
                  Estimate my VddB or VddKO refund
                </ArrowLink>
              </div>
              <p className="mt-6 min-h-[3.75rem] text-sm leading-relaxed text-gray-500">
                VddB or VddKO confirms your recorded periods, eligibility and
                final refund amount.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CHOOSE THE CORRECT ROUTE (Figma 1353:419) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Choose the correct route"
              title="Is this refund calculator right for your pension?"
              body="Check the wording on your pension document."
            />
          </div>

          <div className="mt-12">
            <ComparisonTable
              caption="Is this refund calculator right for your pension?"
              columns={[
                'Your document says',
                'Use the calculator?',
                'Best next step',
              ]}
              rows={[
                {
                  label: 'VBL, VBLklassik, ZVK, Zusatzversorgungskasse',
                  values: ['Yes', 'Estimate your VBL or ZVK refund'],
                },
                {
                  label: 'VddB, VddKO, Bühnenversorgung, Orchesterversorgung',
                  values: ['Yes', 'Estimate your VddB or VddKO refund'],
                },
                {
                  label:
                    'bAV, betriebliche Altersversorgung, Entgeltumwandlung',
                  values: ['No', 'Check whether your bAV can be cashed out'],
                },
                {
                  label:
                    'Direktversicherung, Pensionskasse, Pensionsfonds, Unterstützungskasse',
                  values: ['No', 'Start the company pension cash-out check'],
                },
                {
                  label:
                    'Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider',
                  values: ['Usually not', 'Start with your provider document'],
                },
                {
                  label: 'DRV, Deutsche Rentenversicherung',
                  values: [
                    'No',
                    'Use the separate German state pension refund process',
                  ],
                },
              ]}
            />
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            Still unsure? Upload the document you have. The platform can help
            identify the wording and show you the most relevant next step.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ArrowLink href={CALC_HREF}>Calculate my refund</ArrowLink>
            <ArrowLink href={BAV_HREF} variant="outline">
              Check my bAV cash-out
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- bAV WARNING (Figma 1354:521) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-3xl text-center text-brand">
            <span className="mb-5 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border border-brand/25 bg-brand/5 px-5 py-1 text-center font-display text-base font-medium text-brand sm:whitespace-nowrap">
              bAV cash-outs
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Have a bAV or Direktversicherung? Use the cash-out check instead.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-600">
              A bAV is a German company pension arranged through an employer.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Your document may show:
              </p>
              <div className="mt-6">
                <TermList
                  items={[
                    'bAV',
                    'betriebliche Altersversorgung',
                    'Entgeltumwandlung',
                    'Direktversicherung',
                    'Pensionskasse',
                    'Pensionsfonds',
                    'Unterstützungskasse',
                    'Allianz',
                    'AXA',
                    'Swiss Life',
                    'ERGO',
                    'R+V',
                    'Nürnberger',
                    'HDI',
                    'BVV',
                    'Another pension or insurance provider',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                A bAV cannot usually be estimated by adding up refundable
                employee contributions.
              </p>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                The important question is whether the pension can be paid out as
                a one-time amount or lumpsum settlement.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                That can depend on:
              </p>
              <div className="mt-6">
                <TermList
                  items={[
                    'The type of pension',
                    'Whether your entitlement is vested',
                    'The monthly pension or capital value',
                    'Your former employer',
                    'The pension provider',
                    'The contract terms',
                    'Whether a permitted cash-out route applies',
                    'Whether your German state pension contributions have already been refunded',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                Small company pensions can sometimes be settled under the
                small-benefit rules.
              </p>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                For a larger vested bAV, an approved DRV refund can create the
                basis for requesting a separate lump-sum settlement under §3(3)
                BetrAVG.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <InfoNote>
              Do not use the refund calculator for a bAV, Direktversicherung,
              Pensionskasse, Pensionsfonds or provider-based company pension.
            </InfoNote>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4">
            <ArrowLink href={BAV_HREF}>Check my bAV cash-out</ArrowLink>
            <Link
              href={BAV_HREF}
              className="inline-flex items-center gap-2 text-base font-semibold text-brand hover:underline"
            >
              Learn about company pension cash-outs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- THE CALCULATOR PROCESS (Figma 1356:834) ----
          Brand-green band, not the light-grey wash this shipped with. Figma
          renders the whole section dark with white step cards and a
          white-outlined CTA; that mismatch is why the client marked this
          section "design not followed" on 2026-07-23. */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <span className="mb-5 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border border-white/30 bg-white/5 px-5 py-1 text-center font-display text-base font-medium text-white sm:whitespace-nowrap">
              The calculator process
            </span>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-accent sm:text-4xl">
              Get a first estimate in five simple steps
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Tell us which pension you have"
              body="Choose VBL, ZVK, VddB or VddKO. Do not worry if you are unsure. You can start with the wording on your document."
            />
            <StepCard
              number="02"
              title="Upload a document or enter what you know"
              body="Upload a pension letter for an assisted estimate or enter your information manually."
            />
            <StepCard
              number="03"
              title="Check the information"
              body="Review the pension scheme, employment dates, contribution periods and amounts used for the estimate. Add or correct anything that is missing."
            />
            <StepCard
              number="04"
              title="See your estimated refund"
              body="The calculator gives you a first indication based on the information provided. The result is not a guaranteed payout or final calculation."
            />
            <StepCard
              number="05"
              title="Decide whether to continue"
              body="Review the estimate and decide whether you want to start your refund application online. You are not required to continue."
            />
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ArrowLink href={CALC_HREF}>Calculate my refund</ArrowLink>
            {/* On the dark band the outline CTA needs white borders/text — the
                brand-green outline is invisible here. */}
            <ArrowLink href={START_HREF} variant="outlineDark">
              Start my refund directly
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- UNDERSTANDING THE RESULT (Figma 1358:1010) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Understanding the result"
              title="A useful first indication—not a guaranteed payout"
              body="Your estimate can help you decide whether pursuing the refund appears worthwhile. The pension scheme or institution still checks its own records and makes the final decision."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Your estimate can help you:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Understand the possible size of a VBL refund',
                    'Estimate a possible ZVK refund',
                    'Estimate a possible VddB or VddKO refund',
                    'Use information from an uploaded document',
                    'Calculate with information entered manually',
                    'Identify whether you need a refund or bAV cash-out',
                    'Choose the relevant next step',
                  ]}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Your estimate cannot:
              </p>
              <div className="mt-6">
                <CrossList
                  items={[
                    'Approve your refund',
                    'Guarantee the final amount',
                    'Replace the pension institution’s records',
                    'Include contribution periods that were not entered or found',
                    'Calculate a bAV cash-out',
                    'Calculate a DRV state pension refund',
                    'Provide legal, pension, tax, insurance or financial advice',
                  ]}
                />
              </div>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            The relevant pension scheme or institution confirms your
            contribution record, eligibility and final refund amount.
          </p>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={CALC_HREF}>Calculate my refund</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- YOUR NEXT STEP / CONTINUE ONLINE (Figma 1358:1204) ----
          White, not the light-grey wash: the client asked for the grey to be
          removed from this section on 2026-07-23. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <span className="mb-5 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border border-brand/25 bg-white px-5 py-1 text-center font-display text-base font-medium text-brand sm:whitespace-nowrap">
              Your next step
            </span>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-brand sm:text-4xl">
              Like the estimate? Continue with your refund online.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
              You can stop after viewing the result or continue into the secure
              CompanyPension refund process.
            </p>
            <p className="mt-3 text-base font-semibold text-brand">
              If you continue:
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="Step 1"
              title="Secure your claim"
              body="Create secure access, review the pricing and pay the €199 deposit. The deposit is credited toward your final service fee."
            />
            <StepCard
              number="Step 2"
              title="Complete your information"
              body="Upload your ID and any pension or employment documents still needed."
            />
            <StepCard
              number="Step 3"
              title="Review and sign your application"
              body="Check the completed information and sign the application yourself online. You remain the applicant and claimant."
            />
            <StepCard
              number="Step 4"
              title="Submit digitally"
              body="After you sign, the application is technically transmitted to the relevant pension scheme or institution through the CompanyPension platform."
            />
            <StepCard
              number="Step 5"
              title="Submit digitally"
              body="After you sign, the application is technically transmitted to the relevant pension scheme or institution through the CompanyPension platform. The pension scheme or institution makes the final decision."
            />
            <StepCard
              number="Step 6"
              title="Receive approved money directly"
              body="If approved, the refund is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ArrowLink href={START_HREF}>Start my refund</ArrowLink>
            <ArrowLink href={PROCESS_HREF} variant="link">
              See how the full process works
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1358:1540) ---- */}
      {/* COPY-GOVERNANCE (client item 19): item 19 concerns the "free EUR
          account" label elsewhere in the funnel; this page has no EUR-account
          copy, so the transformation does not apply. "The calculator is free to
          use" below is verbatim design copy about the calculator's cost and is
          unaffected. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <span className="mb-5 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border border-brand/25 bg-neutral-50 px-5 py-1 text-center font-display text-base font-medium text-brand sm:whitespace-nowrap">
              Continue only when you are ready
            </span>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-brand sm:text-4xl">
              What does the full refund process cost?
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
              The calculator is free to use and does not create a payment
              obligation. You only pay if you decide to continue into the full
              refund process.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-bold text-brand">
                €199 deposit to start the process
              </span>
              <span className="text-base text-gray-600">
                (credited toward the final fee)
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold text-brand">
              9.75% success fee if approved
            </p>
            <p className="mt-8 text-base font-semibold text-brand">
              Pricing details
            </p>
            <div className="mt-4">
              <CheckList
                items={[
                  'The minimum total service fee is €199.',
                  'The €199 deposit is credited toward the final service fee.',
                  'Only the remaining difference becomes due after approval.',
                  'If the pension institution rejects a completed and submitted refund request, the €199 deposit is refunded in full.',
                  'This does not apply if the application is abandoned or left incomplete.',
                  'If approved, the pension institution pays the refund directly to the bank account you provide. CompanyPension does not deduct its fee from the refund and does not receive, hold or forward approved pension money.',
                ]}
              />
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <ArrowLink href={START_HREF}>Start my refund</ArrowLink>
              <ArrowLink href={PRICING_HREF} variant="outline">
                View full pricing
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1361:78) — answers from the shared FAQ master copy via
           faqItems.tsx (FAQ CompanyPension 22062026.pdf).
           All 16 questions the design lists are now present (the page shipped
           only 5; client feedback 2026-07-23). Questions are transcribed from
           the Figma accordion. Figma leaves 15 of the 16 collapsed, so their
           answers are not readable there — each question below is wired to the
           master answer that covers it, and the six with no master match carry
           the standard pending placeholder rather than invented copy.
           COPY GAP — FLAGGED: those six need client-supplied answers. */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              eyebrowWidth={FAQ_EYEBROW_WIDTH}
              title="Questions about estimating your refund"
            />
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion
              items={[
                {
                  ...FAQ.calculatorFirst,
                  question: 'Can I calculate my German company pension refund?',
                },
                {
                  ...FAQ.howMuch,
                  question: 'How much VBL refund could I receive?',
                },
                {
                  ...FAQ.zvkRefund,
                  question: 'Can I calculate my ZVK refund?',
                },
                {
                  ...FAQ.vddbRefund,
                  question: 'Can I estimate a VddB or VddKO refund?',
                },
                {
                  ...FAQ.refundVsCashout,
                  question: 'Can I calculate my bAV cash-out?',
                },
                {
                  question:
                    'Why can I estimate a VBL refund but not a bAV cash-out?',
                  answer: FAQ_ANSWER_PENDING,
                },
                {
                  ...FAQ.uploadInsteadManual,
                  question: 'Can I upload a pension letter?',
                },
                {
                  question: 'Can I enter the information myself?',
                  answer: FAQ_ANSWER_PENDING,
                },
                {
                  ...FAQ.documentsNeeded,
                  question: 'What if my pension document is incomplete?',
                },
                {
                  question: 'Is my estimated refund guaranteed?',
                  answer: FAQ_ANSWER_PENDING,
                },
                {
                  ...FAQ.bothRefunds,
                  question: 'Does the calculator include my DRV refund?',
                },
                {
                  question: 'Do I have to continue after seeing the estimate?',
                  answer: FAQ_ANSWER_PENDING,
                },
                {
                  question: 'What should I do after getting the estimate?',
                  answer: FAQ_ANSWER_PENDING,
                },
                {
                  question:
                    'Can I use the calculator if I do not know what pension I have?',
                  answer: FAQ_ANSWER_PENDING,
                },
                {
                  ...FAQ.whoReceives,
                  question: 'Who receives the approved refund?',
                },
                {
                  ...FAQ.advisorOrLawFirm,
                  question: 'Is CompanyPension a pension advisor?',
                },
              ]}
              defaultOpenIndex={0}
            />
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/faq"
              className="rounded-brand bg-accent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See all FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- PLATFORM SCOPE (Figma 1364:3163) ----
          PUBLICATION_PENDING: the "Source basis" review-metadata row (nodes
          1364:3235, 1364:3245) ships the design's bracketed placeholder values
          verbatim per wave-wide precedent (Tasks 13/14). Replace "[Add actual
          review date]" and "[Add reviewer name and role]" with real values
          before publication. */}
      {/* Grey band with the content in a white card — Figma 1364:3163 (client
          feedback 2026-07-23: "background color should be #F3F4F4"). The card
          is part of that design, not decoration: the grey reads as the section
          and the white as the panel sitting on it. */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="rounded-2xl bg-white p-8 sm:p-12">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Platform scope"
                title="A refund estimate and digital application platform"
              />
            </div>
            <div className="mt-8 max-w-4xl space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                The calculator provides a preliminary estimate using the
                documents and information you provide.
              </p>
              <p>
                It does not approve your refund and does not replace the records
                or assessment of VBL, your ZVK, VddB or VddKO.
              </p>
              <p className="font-semibold text-brand">
                If you continue into the full refund process:
              </p>
              <ul className="space-y-3">
                {[
                  'The platform prepares the application from the information you provide.',
                  'You review and sign the application yourself.',
                  'You remain the applicant and claimant.',
                  'The signed application is technically transmitted through the CompanyPension platform.',
                  'The pension scheme or institution makes the final decision.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>
                CompanyPension does not provide pension, legal, tax, insurance
                or financial advice.
              </p>
              <p>
                CompanyPension does not receive, hold or forward approved
                pension money.
              </p>
            </div>

            <h3 className="mt-12 text-2xl font-bold tracking-tight text-brand">
              Limited authorization
            </h3>
            <div className="mt-5 max-w-4xl space-y-4 text-base leading-relaxed text-gray-600">
              <p>You may give ATLAES GmbH limited authorization to:</p>
              <ul className="space-y-3">
                {[
                  'Receive and forward relevant correspondence',
                  'Receive information about the final decision',
                  'Receive information about the approved amount',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>
                This allows the platform to display follow-up requests and
                calculate the agreed service fee.
              </p>
              <p>
                The authorization does not make ATLAES GmbH the applicant or
                claimant.
              </p>
            </div>

            {/* Source-basis review-metadata row (Figma 1364:3225–3246). */}
            <div className="mt-12 flex max-w-4xl flex-col gap-8 border-t border-neutral-400 pt-10 sm:flex-row sm:gap-16">
              <div className="flex items-center gap-4">
                {/* Figma 1364:3163 renders these review-metadata icons small and
                  inline (~20px), not in the 56px tinted tiles we had — that
                  size difference is what the client flagged on 2026-07-23. */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/20 text-brand">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold uppercase tracking-wide text-brand">
                    LAST REVIEWED
                  </span>
                  <span className="mt-1 block text-base text-gray-600">
                    [Add actual review date]
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/20 text-brand">
                  <User className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold uppercase tracking-wide text-brand">
                    REVIEWED BY
                  </span>
                  <span className="mt-1 block text-base text-gray-600">
                    [Add reviewer name and role]
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION (Figma footer disclaimer 1365:3282) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          A digital application platform, not pension advice
        </h2>
        <p className="mt-6 text-base leading-relaxed text-gray-600">
          Company Pension provides a digital application platform for German
          company pension cash-outs and refunds. Company Pension does not
          provide legal, tax, pension, insurance or financial advice and does
          not act as a legal representative, pension advisor, insurance broker
          or financial advisor. Information on this website is general guidance
          only and does not replace professional advice. Users remain the
          claimant. Approval and payment decisions are made by the relevant
          pension provider, pension scheme or institution. If legal services are
          required for a specific case, they are carried out separately by the
          responsible legal partner. Approved funds are paid directly to the
          bank account provided by the user.
        </p>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1365:3252) ---- */}
      <CtaBand
        eyebrow="Start with an estimate"
        title="How much could your company pension refund be?"
        body="Upload a VBL, ZVK, VddB or VddKO document or enter the information you know. You can review the estimate before deciding whether to continue."
        cta={{ label: 'Upload my pension document', href: CALC_HREF }}
        secondaryCta={{ label: 'Enter details manually', href: CALC_HREF }}
        note="Using the calculator does not create a contract or obligation. Your result is a preliminary estimate, not a guaranteed payout or final approval."
      />
    </>
  );
}
