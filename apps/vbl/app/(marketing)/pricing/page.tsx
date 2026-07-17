import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calculator, Check, Info } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { PriceCard } from '@/components/marketing/PriceCard';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// ---------------------------------------------------------------------------
// Pricing FAQ (Figma 1199:9304 — six questions from the rendered canvas).
// Answers are sourced from the client's FAQ master copy in Google Drive
// ("FAQ CompanyPension 22062026.pdf", DEV - CompanyPension - FE content),
// mapped to the Figma question wording. Q1 keeps the design's expanded answer.
// ---------------------------------------------------------------------------

const PRICING_FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'Why do I pay a deposit first?',
    answer: (
      <>
        <p>The €199 deposit activates the secure application process.</p>
        <p className="mt-2">
          After payment, you can upload documents, use automated document
          extraction, complete the guided flow, review your application, sign
          online and submit through the CompanyPension platform.
        </p>
      </>
    ),
  },
  {
    question: 'Is the €199 deposit an extra fee?',
    answer: (
      <>
        <p>No. The deposit is part of the final service fee.</p>
        <p className="mt-2">
          If the approved amount results in only the €199 minimum total fee, the
          deposit covers the entire service fee and nothing further is due.
        </p>
      </>
    ),
  },
  {
    question: 'Is the €199 deposit always refundable?',
    answer: (
      <>
        <p>No. The rule depends on the type of case.</p>
        <p className="mt-2">
          For VBL, ZVK, VddB and VddKO refunds, the deposit is refunded in full
          if the pension institution rejects a completed and submitted refund
          request.
        </p>
        <p className="mt-2">
          For bAV cash-outs, if the cash-out cannot be submitted after the
          digital case and document review, €79 is retained and €120 is
          refunded.
        </p>
        <p className="mt-2">
          The deposit is not automatically refundable when a user abandons the
          process, does not provide required information or leaves the
          application incomplete.
        </p>
      </>
    ),
  },
  {
    question: 'When do I pay more than the deposit?',
    answer: (
      <>
        <p>Only after the cash-out or refund has been approved.</p>
        <p className="mt-2">
          The final fee is calculated from the approved amount. The €199 deposit
          is deducted, and only the remaining difference becomes due.
        </p>
      </>
    ),
  },
  {
    question: 'Who receives the approved amount?',
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
  {
    question: 'Are there hidden fees?',
    answer: (
      <>
        <p>
          CompanyPension shows the deposit, success fee, minimum total fee and
          applicable deposit rules before payment.
        </p>
        <p className="mt-2">
          Separate bank charges, foreign-exchange costs or third-party account
          fees may apply and are outside CompanyPension&rsquo;s control.
        </p>
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Local, page-only building blocks (shared shapes live in components/marketing)
// ---------------------------------------------------------------------------

function CheckBullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-gray-700">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** "After approval" explainer card (heading + supporting paragraph). */
function ApprovalCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <h3 className="text-xl font-semibold text-brand">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/** Worked fee example: an approved amount, a breakdown table and a note. */
function ExampleCard({
  approvedAmount,
  rows,
  note,
}: {
  approvedAmount: string;
  rows: { label: string; value: string }[];
  note: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-brand">
          <Calculator className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm text-gray-500">Approved amount:</p>
          <p className="text-3xl font-bold text-brand">{approvedAmount}</p>
        </div>
      </div>

      <dl className="mt-6 space-y-3 border-t border-neutral-400 pt-6">
        {rows.map((row) => {
          const highlight = row.label === 'Remaining fee after approval';
          return (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-4 ${
                highlight ? 'border-t border-neutral-400 pt-3' : ''
              }`}
            >
              <dt
                className={`text-base ${
                  highlight ? 'font-semibold text-brand' : 'text-gray-600'
                }`}
              >
                {row.label}
              </dt>
              <dd
                className={`shrink-0 text-base font-semibold ${
                  highlight ? 'text-brand' : 'text-gray-900'
                }`}
              >
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-6 flex flex-1 items-end">
        <div className="flex items-start gap-2 rounded-brand border border-accent/50 bg-accent/10 px-4 py-3 text-sm leading-relaxed text-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/icons/check-bullet.svg"
            alt=""
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>{note}</span>
        </div>
      </div>
    </div>
  );
}

function InfoNote({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green';
}) {
  const tones = {
    neutral: 'bg-neutral-50',
    green: 'bg-accent/10',
  } as const;
  return (
    <div
      className={`flex items-start gap-2 rounded-brand ${tones[tone]} px-4 py-3 text-sm leading-relaxed text-gray-600`}
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1187:3965 — "Pricing")
// Section order follows the design's vertical order: pricing cards →
// example calculations → your deposit → after approval → approved money →
// FAQ → CTA.
// ---------------------------------------------------------------------------

export default function PricingPage() {
  return (
    <>
      {/* ---- HERO (Figma 1187:4339) ---- */}
      <Hero
        eyebrow="Pricing"
        title="Simple pricing for cash-outs and refunds"
        body="Start with a €199 deposit. Our success fee is 9.75% of the approved cash-out or refund amount, with a minimum total service fee of €199. Your deposit is always credited toward the final service fee."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{
          label: 'How the deposit works',
          href: '#your-deposit',
        }}
        footnote={
          <p>
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        }
      />

      {/* ---- PRICING BY CLAIM TYPE (Figma 1188:6060) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="Pricing by claim type"
              body="Both routes start with a €199 deposit and use the same 9.75% success fee if approved. The deposit rules differ if the case cannot proceed."
            />
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-2">
            <PriceCard
              badge="bAV cash-outs"
              title="Company pension cash-outs"
              bullets={[
                '€199 deposit to activate the full process',
                '9.75% success fee if the cash-out is approved',
                'Minimum total service fee: €199',
                'The deposit is credited toward the final service fee',
                'Deposit rule',
              ]}
              note={
                <>
                  <p className="font-semibold text-brand">Deposit rule</p>
                  <p className="mt-1">
                    If a cash-out cannot be submitted after the digital case and
                    document review, €79 is retained and €120 is refunded.
                  </p>
                </>
              }
              cta={{ label: 'Start bAV cash-out', href: '/get-started' }}
            />
            <PriceCard
              badge="Contribution refunds"
              title="VBL, ZVK, VddB and VddKO refunds"
              bullets={[
                '€199 deposit to activate the full process',
                '9.75% success fee if the refund is approved',
                'Minimum total service fee: €199',
                'The deposit is credited toward the final service fee',
                'Deposit rule',
              ]}
              note={
                <>
                  <p className="font-semibold text-brand">Deposit rule</p>
                  <p className="mt-1">
                    If the pension institution rejects your completed and
                    submitted refund request, the €199 deposit is refunded in
                    full.
                  </p>
                </>
              }
              cta={{
                label: 'Start my refund',
                href: '/get-started',
                variant: 'outline',
              }}
            />
          </div>
        </div>
      </section>

      {/* ---- EXAMPLE FEE CALCULATIONS (Figma 1190:6861) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="Example fee calculations"
              body="See how the €199 deposit is credited toward the final service fee if your cash-out or refund is approved."
            />
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
              The final service fee is 9.75% of the approved amount, subject to
              a minimum total fee of €199.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            <ExampleCard
              approvedAmount="€2,000"
              rows={[
                { label: '9.75% success fee', value: '€195' },
                { label: 'Minimum total fee', value: '€199' },
                { label: 'Deposit already paid', value: '€199' },
                { label: 'Remaining fee after approval', value: '€0' },
              ]}
              note="The deposit covers the minimum total fee."
            />
            <ExampleCard
              approvedAmount="€5,000"
              rows={[
                { label: '9.75% success fee', value: '€487.50' },
                { label: 'Deposit already paid', value: '€199' },
                { label: 'Remaining fee after approval', value: '€288.50' },
              ]}
              note="The approved money is paid directly to your bank account. Only the remaining service fee becomes due."
            />
            <ExampleCard
              approvedAmount="€12,000"
              rows={[
                { label: '9.75% success fee', value: '€1,170' },
                { label: 'Deposit already paid', value: '€199' },
                { label: 'Remaining fee after approval', value: '€971' },
              ]}
              note="Your deposit is fully credited toward the final service fee."
            />
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-gray-500">
            These examples are for illustration only. Your final fee depends on
            the approved amount and the pricing rules shown before payment.
          </p>
        </div>
      </section>

      {/* ---- YOUR DEPOSIT (Figma 1190:6994) ---- */}
      <section id="your-deposit" className="scroll-mt-24 bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Your deposit"
                title="What your €199 deposit activates"
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  The deposit activates the secure digital application
                  process&mdash;not just an initial check.
                </p>
                <p>
                  Once your claim is activated, the CompanyPension platform
                  provides the tools needed to complete, review, sign and submit
                  your cash-out or refund application online.
                </p>
              </div>
              <div className="mt-8">
                <InfoNote tone="green">
                  The deposit is not an additional fee. If your cash-out or
                  refund is approved, it is credited toward your final service
                  fee.
                </InfoNote>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-base font-semibold text-brand">
                Included in the process:
              </p>
              <div className="mt-6">
                <CheckBullets
                  items={[
                    'Secure claim setup',
                    'Pension-document upload',
                    'OCR and automated extraction of document details',
                    'Questions adapted to your pension type and answers',
                    'Automated checks for missing or inconsistent information',
                    'Preparation of the application from the information you provide',
                    'Online review and digital signing',
                    'Technical transmission after you sign',
                    'Secure display of provider correspondence and next steps',
                    'Human support when clarification, translation or follow-up is needed',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- AFTER APPROVAL (Figma 1190:7836) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="After approval"
              title="When is the remaining service fee due?"
              body="Only after your cash-out or refund is approved."
            />
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-2">
            <ApprovalCard
              title="Company pension cash-out"
              body="If your bAV cash-out is approved, the 9.75% success fee is calculated from the approved cash-out amount. Your €199 deposit is deducted, and only the remaining service fee becomes due."
            />
            <ApprovalCard
              title="VBL, ZVK, VddB and VddKO refund"
              body="If your refund is approved, the 9.75% success fee is calculated from the approved refund amount. Your €199 deposit is deducted, and only the remaining service fee becomes due."
            />
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <InfoNote tone="green">
              If the deposit already covers the minimum total service fee, there
              is no remaining fee after approval.
            </InfoNote>
          </div>
        </div>
      </section>

      {/* ---- APPROVED MONEY PAID DIRECTLY (Figma 1199:8629) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                title="Approved money is paid directly to you"
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  The relevant provider, pension scheme or institution pays the
                  approved money directly to the bank account you provide.
                </p>
                <p>
                  CompanyPension does not deduct its fee from the pension money
                  and does not receive, hold or forward approved pension money.
                </p>
                <p>
                  A German bank account is not required in most cases. Some
                  providers or refund routes may require a suitable SEPA-capable
                  EUR account. If needed, CompanyPension can help you open a EUR
                  account.
                </p>
              </div>
            </div>

            <div className="aspect-[563/527] overflow-hidden rounded-2xl border border-neutral-200">
              <Image
                src="/marketing/pricing/pricing-asset-03.png"
                alt="A person holding a phone showing a 'Money Received' confirmation"
                width={1122}
                height={1402}
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1199:9304 — questions from rendered canvas) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading title="Frequently asked questions" />
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion items={PRICING_FAQ_ITEMS} defaultOpenIndex={0} />
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-brand bg-accent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Show more questions
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1199:9434) ---- */}
      {/* Renders on the shared near-black #231f20 wave background (CtaBand
          default) — this is what separates it from the green footer below. */}
      <CtaBand
        title="Ready to start your cash-out or refund?"
        body="Start the guided claim flow for a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note={
          <>
            <span className="block">
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
