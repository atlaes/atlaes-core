import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { StepCard } from '@/components/marketing/StepCard';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ImportantCallout } from '@/components/marketing/ImportantCallout';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Direktversicherung is a private-sector bAV cash-out: the refund calculator is
// NOT available for these cases, so every funnel CTA routes to /get-started.
// Only the informational cross-links point at existing sibling pages.
const START_HREF = '/get-started';
const PRICING_HREF = '/pricing';
const FAQ_HREF = '/faq';

// ---------------------------------------------------------------------------
// Local, page-only building blocks (mirrors the vbl-refund product template)
// ---------------------------------------------------------------------------

function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-gray-700">
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

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
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

/** Small pill used as an inline section eyebrow on the light sections. */
function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium uppercase tracking-wide text-brand">
      {children}
    </span>
  );
}

/** Definition card for the glossary grid. */
function GlossaryCard({ term, body }: { term: string; body: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-6">
      <h3 className="text-lg font-semibold text-brand">{term}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1118:7990 — "Direktversicherung Cash-Out CompanyPension")
// Copy verbatim from the design XML; sections in Figma y-order. bAV cash-out
// page: no refund calculator, funnel CTAs → /get-started.
// ---------------------------------------------------------------------------

export default function DirektversicherungCashOutPage() {
  return (
    <>
      {/* ---- HERO (Figma 1118:8050) ---- */}
      <Hero
        eyebrow="Direktversicherung cash-out"
        title="Cash out your Direktversicherung online"
        body="Have a Direktversicherung from a previous German employer? A Direktversicherung is a bAV setup — a German company pension arranged through your employer. Start online with your policy, provider letter or pension statement and check whether a one-time cash-out can be started."
        primaryCta={{
          label: 'Start my Direktversicherung cash-out',
          href: START_HREF,
        }}
        secondaryCta={{ label: 'Check my bAV cash-out', href: START_HREF }}
        footnote={
          <p>
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        }
      />

      {/* ---- HERO IMPORTANT NOTE (Figma 1118:8416) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-12 sm:py-16`}>
          <div className="mx-auto max-w-3xl rounded-2xl border border-brand/20 bg-neutral-50 p-8">
            <span className="inline-flex items-center gap-2 text-lg font-semibold text-brand">
              <Info className="h-5 w-5" aria-hidden="true" />
              Important
            </span>
            <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
              <p>
                A Direktversicherung is a common bAV setup — an insurance-based
                German company pension from an employer.
              </p>
              <p>
                It is not included in your DRV refund. A German state pension
                refund through Deutsche Rentenversicherung does not
                automatically cash out your Direktversicherung.
              </p>
              <p>Your Direktversicherung needs its own cash-out check.</p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={START_HREF}
                className="inline-flex items-center gap-2 text-base font-medium text-brand hover:underline"
              >
                Not sure if you have bAV? See Company Pension Cash-Out.
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={START_HREF}
                className="inline-flex items-center gap-2 text-base font-medium text-brand hover:underline"
              >
                Already received your DRV refund? Compare company pension vs DRV.
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CAN I CASH OUT AFTER LEAVING GERMANY? (Figma 1118:8437) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>Quick answer</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Can I cash out my Direktversicherung after leaving Germany?
              </h2>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Start my Direktversicherung cash-out
                </ArrowLink>
              </div>
              <div className="mt-4">
                <Link
                  href={START_HREF}
                  className="inline-flex items-center gap-2 text-base font-medium text-brand hover:underline"
                >
                  Learn about bAV cash-outs
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                Possibly. A Direktversicherung cash-out can be possible if your
                contract, provider, pension value, employer involvement and case
                details support a one-time cash-out.
              </p>
              <p>
                Small bAV amounts can sometimes be cashed out directly. For
                larger vested Direktversicherung entitlements, an approved German
                state pension refund can create the basis for requesting a
                lump-sum settlement under §3(3) BetrAVG.
              </p>
              <p>
                CompanyPension helps you check your Direktversicherung online and
                continue with the right cash-out process if your case can be
                started.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FAST FACTS (Figma 1126:744) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <Pill>Fast facts</Pill>
            <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">
              Direktversicherung cash-out in short
            </h2>
            <div className="mt-6">
              <CheckList
                items={[
                  'A Direktversicherung is a common bAV setup.',
                  'It is usually an insurance-based company pension arranged through a German employer.',
                  'A DRV refund does not include your Direktversicherung',
                  'Small Direktversicherung amounts can sometimes be cashed out directly.',
                  'For larger vested entitlements, an approved DRV refund can create the basis for requesting a lump-sum settlement under §3(3) BetrAVG.',
                  'If approved, the money is paid directly to the bank account you provide.',
                  'CompanyPension does not receive, hold or forward approved pension money.',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT IS A DIREKTVERSICHERUNG? (Figma 1119:62) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>What it is</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What is a Direktversicherung?
              </h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  A Direktversicherung is a common German company pension
                  contract.
                </p>
                <p>
                  In most cases, it is an insurance-based bAV arranged through
                  your employer. The contract may have been set up while you
                  worked in Germany and may still exist after you leave your job
                  or move abroad.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Start with my Direktversicherung document
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                You may see the word Direktversicherung on:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'company pension contracts',
                    'provider letters',
                    'annual pension statements',
                    'old payroll documents',
                    'employer pension documents',
                    'insurance correspondence',
                    'salary-conversion documents',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                A Direktversicherung may be managed by a provider such as Allianz,
                AXA, Swiss Life, ERGO, BVV or another German pension or insurance
                provider.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <InfoNote>
              If your document says Direktversicherung, you are usually dealing
              with a bAV cash-out case — not a VBL-style refund.
            </InfoNote>
          </div>
        </div>
      </section>

      {/* ---- CANCEL VS CASH OUT (Figma 1119:107) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>Cancel vs cash-out</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Cancel vs cash out: what you actually want
              </h2>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Start with my Direktversicherung document
                </ArrowLink>
              </div>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                Many expats search for “cancel Direktversicherung” or “cancel bAV
                Germany.”
              </p>
              <p>
                In practice, the goal is usually not a normal cancellation like
                cancelling a phone contract. The relevant question is whether your
                Direktversicherung can be paid out as a one-time amount.
              </p>
              <p>
                This is often called a cash-out or, in German pension language, an
                Abfindung.
              </p>
              <p className="font-semibold text-brand">
                For users, the practical question is simple:
              </p>
              <p className="font-semibold text-brand">
                Can I get the money from my Direktversicherung now instead of
                waiting until retirement?
              </p>
              <p>
                Whether this can be started depends on your contract, provider,
                pension value, employer involvement and whether a cash-out basis
                applies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHEN CAN A DIREKTVERSICHERUNG BE CASHED OUT? (Figma 1120:787) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="When cash-out can work"
              title="When can a Direktversicherung be cashed out?"
              body="A Direktversicherung cash-out is usually most realistic in two situations."
            />
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Situation 1 */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-brand">
                1
              </span>
              <h3 className="mt-6 text-xl font-semibold text-brand">
                The pension amount is small
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                Small bAV amounts can sometimes be cashed out directly.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                For 2026, the main guide values are:
              </p>
              {/* GUIDE VALUES verbatim from Figma nodes 1120:812 / 1120:817 */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-brand bg-neutral-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Value 1
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand">€59.33</p>
                  <p className="text-sm text-gray-600">per month</p>
                </div>
                <div className="rounded-brand bg-neutral-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Value 2
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand">€7,119</p>
                  <p className="text-sm text-gray-600">capital value</p>
                </div>
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                If your Direktversicherung is around or below these values, a
                cash-out is often more straightforward. The provider still needs
                to process the request and confirm the relevant pension value.
              </p>
            </div>
            {/* Situation 2 */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-brand">
                2
              </span>
              <h3 className="mt-6 text-xl font-semibold text-brand">
                An approved DRV refund creates the cash-out basis
              </h3>
              <div className="mt-3 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  For larger vested Direktversicherung entitlements, your German
                  state pension refund can matter.
                </p>
                <p>
                  An approved DRV refund can create the basis for requesting a
                  lump-sum settlement of a vested bAV entitlement under §3(3)
                  BetrAVG.
                </p>
                <p>
                  This can be relevant if your Direktversicherung is above the
                  usual small-benefit range and the contract and case details
                  fit.
                </p>
                <p>
                  This does not mean your Direktversicherung is automatically
                  included in the DRV refund. It is still a separate process.
                </p>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <InfoNote>
              Small Direktversicherung amounts can sometimes be cashed out
              directly. For larger vested entitlements, an approved DRV refund can
              create the basis for a separate Direktversicherung cash-out request.
            </InfoNote>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>Check my cash-out</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHY CASH-OUT AMOUNT MAY DIFFER (Figma 1120:842) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>Cash-out amount</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Why your cash-out amount may differ from your statement value
              </h2>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Check my Direktversicherung cash-out
                </ArrowLink>
              </div>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                The value shown on a Direktversicherung statement is not always
                the same as the amount that can be paid out.
              </p>
              <p>
                A statement may show a projected pension, contract value,
                surrender value, account value or estimated capital value. For a
                cash-out, the provider confirms the actual amount for your case
                during the process.
              </p>
              <p>
                That amount may be lower than expected because the provider may
                apply contract calculations, settlement rules, surrender-value
                calculations, acquisition costs, administration costs or other
                deductions depending on the contract.
              </p>
              <p>
                CompanyPension helps you identify the relevant provider value and
                continue with the cash-out process, but the final cash-out amount
                is confirmed by the provider.
              </p>
              <InfoNote>
                Your Direktversicherung statement is useful — but the final
                cash-out amount comes from the provider.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WILL A CASH-OUT BE TAXED? (Figma 1120:1549) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>Taxes</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Will a Direktversicherung cash-out be taxed?
              </h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Tax treatment can depend on your contract, when it was signed,
                  how it was funded and your personal situation.
                </p>
                <p>
                  Older Direktversicherung contracts and newer contracts may be
                  treated differently. Your age at cash-out, holding period,
                  salary-conversion setup and current tax residence can also
                  matter.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start my cash-out</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                Factors that may affect tax treatment include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'when the Direktversicherung was signed',
                    'your age at cash-out',
                    'how long the contract has existed',
                    'whether the contract was funded through salary conversion',
                    'your current country of tax residence',
                    'how the provider reports the cash-out',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  CompanyPension does not provide tax advice. If tax treatment is
                  relevant for your case, you may need to check this with a tax
                  advisor or the responsible tax office.
                </InfoNote>
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                Tax treatment does not decide whether your cash-out can be
                requested — it affects how much you may keep afterward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- ALREADY RECEIVED YOUR DRV REFUND? (Figma 1120:1589) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>DRV connection</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Already received your German state pension refund?
              </h2>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                Your DRV refund does not automatically include your
                Direktversicherung.
              </p>
              <p>
                A DRV refund only covers your statutory German state pension
                contributions paid into Deutsche Rentenversicherung. Your
                Direktversicherung is part of your company pension and must be
                handled separately.
              </p>
              <p>
                For larger vested Direktversicherung entitlements, an approved DRV
                refund can create the basis for requesting a lump-sum settlement
                under §3(3) BetrAVG.
              </p>
              <p>
                CompanyPension helps you check whether your completed DRV refund
                is relevant for your Direktversicherung cash-out.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <ArrowLink href={START_HREF}>
              Start my Direktversicherung cash-out
            </ArrowLink>
            <Link
              href={START_HREF}
              className="inline-flex items-center gap-2 rounded-brand border border-neutral-400 bg-white px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-neutral-50"
            >
              Compare company pension vs DRV
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- WHICH PROVIDERS? (Figma 1120:2258) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>Provider examples</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Which providers can Direktversicherung cases involve?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Your Direktversicherung may appear under the name of an insurance
                provider, pension institution or employer pension contract.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start with my provider</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                Common provider and institution names include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Allianz',
                    'AXA',
                    'Swiss Life',
                    'ERGO',
                    'BVV',
                    'other German pension or insurance providers',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                Other provider names may also appear on Direktversicherung
                documents, depending on your employer and contract history
              </p>
              <div className="mt-6">
                <InfoNote>
                  The provider name helps identify the right next step, but it
                  does not change the main category: a Direktversicherung is a bAV
                  cash-out case.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DOES YOUR EMPLOYER NEED TO BE INVOLVED? (Figma 1120:2300) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>Employer involvement</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Does your former employer need to be involved?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Sometimes. A Direktversicherung was usually arranged through your
                employer, so provider documents may still refer to the employer,
                policyholder, salary conversion or employment history.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start my cash-out</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Depending on the contract and provider, the cash-out process may
                require information about:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'your former German employer',
                    'when your employment ended',
                    'whether the contract is vested',
                    'who is listed as policyholder',
                    'whether salary conversion was used',
                    'whether employer confirmation is needed',
                    'your current address and bank details',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                You do not need to know all of this before starting. CompanyPension
                guides you through the online flow and shows what information is
                needed for your case.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT MAKES CASH-OUT EASIER? (Figma 1120:2340) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>What makes cash-out easier</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What makes a Direktversicherung cash-out more straightforward?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A cash-out is usually easier to process when your documents
                clearly show that the case fits one of the accepted cash-out
                situations.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Check my Direktversicherung cash-out
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                A Direktversicherung cash-out may be more straightforward if:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'the projected monthly pension is small',
                    'the capital value is below the relevant guide threshold',
                    'your provider documents mention a possible one-time payout, settlement or cash-out option',
                    'your German state pension refund has already been approved, where this matters for your case',
                    'your former employer and provider information is clear',
                    'you have a current policy statement or pension value',
                  ]}
                />
              </div>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  An approved German state pension refund can be especially
                  important if your Direktversicherung is above the usual
                  small-benefit range. In that situation, the DRV refund can
                  create the basis for requesting a one-time settlement of a
                  vested bAV entitlement.
                </p>
                <p>
                  If your German state pension refund has already been approved,
                  that may support a separate Direktversicherung cash-out check in
                  some higher-value cases, depending on the contract and other
                  case details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHEN IS CASH-OUT LESS LIKELY? (Figma 1120:2376) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Pill>When cash-out may be harder</Pill>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                When is a Direktversicherung cash-out usually less likely?
              </h2>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start a cash-out check</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                A Direktversicherung cash-out may be harder to process if:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'the expected monthly pension is clearly above the usual small-benefit range',
                    'the capital value is well above the usual cash-out guide value',
                    'your German state pension refund has not been approved yet, where this matters for the cashout basis',
                    'the provider documents do not support a one-time payout, settlement or cash-out request',
                    'important contract or employment information is missing',
                    'the pension is already in payment or close to retirement handling',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  That does not always mean a cash-out is impossible. It means the
                  case needs to be checked carefully and may not result in a
                  one-time cash-out.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW THE PROCESS WORKS (Figma 1120:2410) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Process"
              title="How the Direktversicherung cash-out process works"
              body="CompanyPension gives you a smart online flow for your Direktversicherung cash-out. You start with your provider or pension document, answer guided questions, review, sign and submit online."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Check if your cash-out can be started"
              body="Choose Direktversicherung or your provider name and answer a few quick questions so CompanyPension can check whether your cash-out can be started through the platform."
            />
            <StepCard
              number="02"
              title="Create your case and pay the deposit"
              body="Create your case and pay the €199 deposit to activate the full process. Your deposit is credited toward the final fee if the cash-out is approved."
            />
            <StepCard
              number="03"
              title="Add your documents and details"
              body="Add your ID, bank details and pension documents such as your Direktversicherung policy, provider statement, employer pension letter or old payslip."
            />
            <StepCard
              number="04"
              title="Review, sign and submit online"
              body="Check your details, sign online and submit your Direktversicherung cash-out request inside the guided flow."
            />
            <StepCard
              number="05"
              title="Provider follow-up runs through CompanyPension"
              body="For Direktversicherung cash-outs, provider messages run through CompanyPension, with human oversight when clarification, translation or follow-up is needed."
            />
            <StepCard
              number="06"
              title="Receive approved funds directly"
              body="If the cash-out is approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
          <div className="mt-12 flex justify-center">
            <ArrowLink href={START_HREF}>
              Start my Direktversicherung cash-out
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT DOCUMENTS ARE NEEDED? (Figma 1122:2570) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Documents"
              title="What documents are usually needed?"
              body="You can start with the documents you already have. CompanyPension will show what is still missing during the online process."
            />
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                For a Direktversicherung cash-out, the process usually needs
                information that shows:
              </p>
              <div className="mt-6">
                {/* Figma node 1122:2599 and 1122:2602 both read
                    "Whether your employment has ended" — probable design
                    duplication; kept once here (see report). */}
                <CheckList
                  items={[
                    'Who you are',
                    'Which employer the pension came from',
                    'Which provider or policy is involved',
                    'Whether your employment has ended',
                    'The current pension value, monthly pension value or capital value',
                    'Your current address and bank details',
                    'Whether your German state pension refund has already been approved, if relevant',
                  ]}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Typical documents may include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Direktversicherung policy',
                    'Provider statements or annual letters',
                    'Employer pension documents',
                    'Old payslips showing bAV or salary conversion',
                    'Provider correspondence about the pension value or possible cash-out',
                    'Passport or ID copy',
                    'Proof of an approved German state pension refund, if this applies to your case',
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <InfoNote>
              Do not worry if you do not have every document yet. Start with what
              you have, and CompanyPension will show you what is still missing.
            </InfoNote>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>Start with my documents</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1124:374) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Pricing"
              title="Pricing for Direktversicherung cash-outs"
              body="Direktversicherung cash-outs start with a €199 deposit and a 9.75% success fee if approved."
            />
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-400 bg-white p-8">
            <div className="flex flex-wrap items-end justify-center gap-6 text-brand">
              <div className="text-center">
                <span className="text-4xl font-bold">€199</span>
                <span className="mt-1 block text-sm text-gray-600">deposit</span>
              </div>
              <span className="pb-6 text-3xl font-bold text-gray-400">+</span>
              <div className="text-center">
                <span className="text-4xl font-bold">9.75%</span>
                <span className="mt-1 block text-sm text-gray-600">
                  success fee if approved
                </span>
              </div>
            </div>
            <p className="mt-4 text-center text-base text-gray-600">
              For Direktversicherung and other bAV or company pension cash-outs.
            </p>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-lg font-semibold text-brand">Pricing</p>
                <div className="mt-4">
                  <CheckList
                    items={[
                      '€199 upfront deposit',
                      '9.75% success fee if approved',
                      'Minimum total fee: €199',
                      'Deposit credited toward the final fee',
                    ]}
                  />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-brand">This includes:</p>
                <div className="mt-4">
                  <CheckList
                    items={[
                      'Digital claim setup',
                      'Cash-out check',
                      'Document and case review',
                      'Guided online flow',
                      'Online signing and submission',
                      'Provider follow-up where needed',
                      'Human oversight when clarification, translation or follow-up is needed',
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-neutral-50 p-6">
              <p className="text-base font-semibold text-brand">
                If the cash-out cannot be submitted after review:
              </p>
              <div className="mt-4">
                <CheckList items={['€79 retained', '€120 refunded']} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                The €79 covers the digital claim setup, document check and case
                review.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <ArrowLink href={START_HREF}>Start my cash-out</ArrowLink>
              <Link
                href={PRICING_HREF}
                className="inline-flex items-center gap-2 rounded-brand border border-neutral-400 bg-white px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-neutral-50"
              >
                See full pricing
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-6 text-center text-sm leading-relaxed text-gray-600">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive or hold your pension money.
            </p>
          </div>
        </div>
      </section>

      {/* ---- COMPARISON: DIREKTVERSICHERUNG / bAV / VBL / DRV (Figma 1124:669) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="Direktversicherung, bAV, VBL and DRV — what is the difference?"
              body="German pension documents can be confusing. This comparison helps you understand where your Direktversicherung fits."
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="Direktversicherung, bAV, VBL and DRV — what is the difference?"
              columns={['Term', 'What it means', 'Best next step']}
              rows={[
                {
                  label: 'Direktversicherung',
                  values: [
                    'A common bAV setup, usually arranged through a German employer and managed by an insurance provider.',
                    'Start a Direktversicherung cash-out check.',
                  ],
                },
                {
                  label: 'bAV',
                  values: [
                    'The German term for company pension. Direktversicherung is one setup within bAV.',
                    'Start a bAV cash-out check',
                  ],
                },
                {
                  label: 'VBL or ZVK',
                  values: [
                    'Public-sector company pension schemes, usually handled as contribution refund cases.',
                    'Start a VBL or ZVK refund',
                  ],
                },
                {
                  label: 'DRV',
                  values: [
                    'Germany’s statutory state pension system. A DRV refund does not include your Direktversicherung',
                    'Use the separate DRV refund process or compare company pension vs DRV.',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1124:729) ----
          FAQ_ANSWER_PENDING: every FAQ item in this frame is a component
          instance carrying lorem defaults ("How do I pay for the…", "Can I
          cancel my Esse…", "We need to add new u…", "My team wants to can…").
          Only the section heading and eyebrow are non-instance verbatim copy.
          Questions and answers are UNVERIFIABLE from the XML and must not be
          invented — a backfill pass fills them once Figma access is restored. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="Direktversicherung cash-out: common questions"
            />
          </div>
          <div className="mx-auto mt-12 max-w-3xl">
            <InfoNote>
              FAQ content for this page is pending. The questions and answers in
              the source design are placeholder component instances and will be
              added once the final copy is available.
            </InfoNote>
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href={FAQ_HREF}
              className="rounded-brand bg-accent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See All FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- GLOSSARY (Figma 1124:1438) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Key terms"
              title="Glossary"
              body="Short definitions of terms you may see on Direktversicherung or company pension documents."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <GlossaryCard
              term="Direktversicherung"
              body="A common bAV setup, usually arranged through an employer and managed by an insurance provider."
            />
            <GlossaryCard
              term="bAV"
              body="Short for betriebliche Altersversorgung. This is the German term for company pension or occupational pension."
            />
            <GlossaryCard
              term="Abfindung"
              body="A German term often used for a one-time settlement or lump-sum payout of a pension entitlement."
            />
            <GlossaryCard
              term="Surrender value"
              body="A value that may appear on insurance-based pension documents when a contract is settled before retirement. It can differ from the account value, projected value or pension value shown on a statement."
            />
            <GlossaryCard
              term="Entgeltumwandlung"
              body="Salary conversion. A common way German employees funded bAV or Direktversicherung contracts by converting part of their gross salary into company pension contributions."
            />
            <GlossaryCard
              term="Provider"
              body="The insurance company or pension institution that manages your Direktversicherung, such as Allianz, AXA, Swiss Life, ERGO, BVV or another provider."
            />
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory state pension system. A DRV refund is separate from your Direktversicherung."
            />
            <GlossaryCard
              term="VBL / ZVK"
              body="Public-sector company pension schemes. These are not Direktversicherung cases and are usually handled as contribution refunds, not bAV cash-outs."
            />
          </div>
        </div>
      </section>

      {/* ---- SOURCE BASIS (Figma 1124:1528) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-4xl">
            <Pill>Source basis</Pill>
            <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">
              Source basis
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                Direktversicherung cash-outs follow the rules for German company
                pensions under the BetrAVG framework and the provider-specific
                contract terms. Small entitlements can sometimes be settled as a
                one-time amount. For vested bAV entitlements, an approved DRV
                refund can create the basis for requesting a lump-sum settlement
                under §3(3) BetrAVG.
              </p>
              <p>
                A DRV refund covers statutory German state pension contributions
                only and does not include bAV, Direktversicherung, VBL, ZVK, VddB
                or VddKO.
              </p>
              <p>
                CompanyPension uses these categories to guide users toward the
                correct online process. This page provides general information
                only and does not provide individual legal, pension, tax,
                insurance or financial advice.
              </p>
            </div>
            {/* CONTENT_PENDING: Figma nodes 1124:1558 / 1124:1568 carry
                pre-publication placeholders — render verbatim until the content
                team supplies the real review date, reviewer name and role. */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-400 bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Last reviewed
                </p>
                <p className="mt-2 text-base text-gray-600">
                  [Add actual review date before publication]
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-400 bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Reviewed by
                </p>
                <p className="mt-2 text-base text-gray-600">
                  [Add reviewer name and role before publication]
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION (Figma 1124:1571) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Important information
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            CompanyPension provides a digital application platform for German
            company pension cashouts and refunds.
          </li>
          <li>
            CompanyPension is not a bank, payment provider, pension advisor,
            insurance broker, legal representative, tax advisor or financial
            advisor. Users remain the claimant.
          </li>
          <li>
            CompanyPension does not decide whether a cash-out or refund is
            approved, does not claim funds as a legal representative and does not
            receive, hold or forward approved pension money.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If legal services are required for a specific case, they are carried out
          separately by the responsible legal partner.
        </div>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1124:1602) ---- */}
      <CtaBand
        eyebrow="Start online"
        title="Ready to check your Direktversicherung cash-out?"
        body="Start online with your Direktversicherung policy, provider letter or pension statement. CompanyPension guides you through the right cash-out process and shows what information is still needed."
        cta={{
          label: 'Start my Direktversicherung cash-out',
          href: START_HREF,
        }}
        secondaryCta={{
          label: 'Compare company pension vs DRV',
          href: START_HREF,
        }}
        note="If approved, the refund is paid directly to the bank account you provide. CompanyPension does not receive or hold your pension money."
      />
    </>
  );
}
