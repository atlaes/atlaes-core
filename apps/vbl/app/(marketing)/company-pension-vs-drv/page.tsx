import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { FeatureCard } from '@/components/marketing/FeatureCard';
import { StepCard } from '@/components/marketing/StepCard';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ImportantCallout } from '@/components/marketing/ImportantCallout';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Funnel entry CTAs ("Check my ...", "Start with my ...") route to the claim
// flow. The frame shows no calculator-specific CTA on this page, so every
// action CTA is a funnel CTA. "See all cash-outs & refunds" routes to the
// cash-outs-and-refunds landing (shipping in this wave).
const START_HREF = '/get-started';
const CASHOUTS_HREF = '/cash-outs-and-refunds';

// ---------------------------------------------------------------------------
// Local, page-only building blocks (mirrors vbl-refund/page.tsx)
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
// Page (Figma frame 1366:5987 — "Company Pension vs DRV Refund")
// Copy transcribed verbatim from the design XML. Instance-only FAQ text is a
// lorem placeholder and is intentionally not shipped (FAQ_ANSWER_PENDING).
// ---------------------------------------------------------------------------

export default function CompanyPensionVsDrvPage() {
  return (
    <>
      {/* ---- HERO (Figma 1366:9690) ---- */}
      <Hero
        eyebrow="DRV vs company pension"
        title="Your DRV refund does not include your company pension"
        body="A German state pension refund covers eligible contributions paid into Deutsche Rentenversicherung. Your bAV, VBL, ZVK, VddB or VddKO pension remains separate and may need its own cash-out or refund process."
        primaryCta={{ label: 'Check my company pension', href: START_HREF }}
        secondaryCta={{
          label: 'See all cash-outs & refunds',
          href: CASHOUTS_HREF,
        }}
        footnote={
          <p>
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        }
      />

      {/* ---- MADE FOR PEOPLE / GUIDED ONLINE PROCESS (Figma 1366:9711) ---- */}
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
            {/* ASSET_PENDING: hero-adjacent illustration (Group 1321315138) —
                no asset on disk; token panel placeholder. */}
            <div
              aria-hidden="true"
              className="hidden min-h-[420px] rounded-2xl bg-neutral-50 lg:block"
            />
          </div>
        </div>
      </section>

      {/* ---- QUICK ANSWER (Figma 1368:9762) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Does your DRV refund include your company pension?
              </h2>
              <p className="mt-5 text-lg font-semibold text-brand">No.</p>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                A DRV refund covers eligible German state pension contributions
                paid into Deutsche Rentenversicherung.
              </p>
              <p className="mt-8 text-base leading-relaxed text-gray-600">
                If you had a company pension in Germany, it may still need its
                own cash-out or refund application—even if your DRV refund has
                already been approved and paid.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <span className="inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                Quick answer
              </span>
              <p className="mt-6 text-lg font-semibold text-brand">
                It does not include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'A bAV',
                    'Direktversicherung',
                    'Pensionskasse',
                    'Pensionsfonds',
                    'Unterstützungskasse',
                    'BVV or another provider-based company pension',
                    'VBL',
                    'ZVK',
                    'VddB',
                    'VddKO',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHY YOU MAY BE HERE (Figma 1368:9827) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Why you may be here"
              title="Already received a DRV refund but still have another pension document?"
            />
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <p className="text-lg font-semibold text-brand">
              Your company pension may still be separate if:
            </p>
            <div className="mt-6">
              <CheckList
                items={[
                  'You received your DRV refund and now want to check whether any other pension money remains.',
                  'A former German employer arranged a company pension for you.',
                  'Your document says bAV, Direktversicherung, Pensionskasse, Pensionsfonds, Unterstützungskasse or Entgeltumwandlung.',
                  'Your pension document shows Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider.',
                  'You paid into VBL or a ZVK while working for a university, public hospital, research institute, municipality or another public-sector employer.',
                  'You worked in theatre, stage, opera, dance or orchestra employment and paid into VddB or VddKO.',
                  'You are unsure whether a document belongs to DRV or a separate company pension.',
                ]}
              />
            </div>
            <div className="mt-6">
              <InfoNote>
                Receiving your DRV refund does not automatically refund, cancel
                or cash out a company pension.
              </InfoNote>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- TWO SEPARATE PENSION SYSTEMS (Figma 1371:9885) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Two separate pension systems"
                title="DRV is your German state pension. Your company pension comes from your employment."
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Deutsche Rentenversicherung—often shortened to DRV—administers
                  Germany’s statutory pension system.
                </p>
                <p>
                  If you apply for a DRV refund, you are requesting the refund of
                  eligible statutory pension contributions recorded by Deutsche
                  Rentenversicherung.
                </p>
                <p className="text-lg font-semibold text-brand">
                  A company pension is different.
                </p>
                <p>
                  It is normally connected to an employer, industry or
                  occupational pension scheme.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-neutral-400 bg-white p-8">
                <p className="text-lg font-semibold text-brand">
                  Your documents may show:
                </p>
                <div className="mt-6">
                  <CheckList
                    items={[
                      'bAV or betriebliche Altersversorgung',
                      'Direktversicherung',
                      'Pensionskasse',
                      'Pensionsfonds',
                      'Unterstützungskasse',
                      'Entgeltumwandlung',
                      'VBL or ZVK',
                      'VddB or VddKO',
                      'The name of an insurance company or pension provider',
                    ]}
                  />
                </div>
                <p className="mt-6 text-base leading-relaxed text-gray-600">
                  The two systems use different rules, documents and
                  applications.
                </p>
              </div>
              <InfoNote>
                Your DRV refund does not start, include or replace a separate
                company pension cash-out or refund.
              </InfoNote>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT DOES A DRV REFUND COVER? (Figma 1372:9947) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                German state pension
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What does a DRV refund cover?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A DRV refund concerns eligible contributions recorded in
                Germany’s statutory pension system.
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  The refund must be applied for separately. It is not
                  automatically paid simply because the eligibility requirements
                  may be met.
                </p>
              </div>
              <div className="mt-6">
                <InfoNote>
                  These rules belong to the statutory pension refund. They do not
                  automatically determine what happens to a company pension.
                </InfoNote>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my VBL refund</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                You may recognise the process from wording such as:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Deutsche Rentenversicherung',
                    'DRV',
                    'German state pension refund',
                    'Beitragserstattung',
                    'Versicherungsverlauf',
                    'Rentenversicherungsnummer',
                    'Antrag auf Beitragserstattung',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                DRV applies its own eligibility, residence, nationality,
                contribution and waiting-period rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHICH PENSION MONEY IS NOT INCLUDED? (Figma 1372:10022) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                Still separate
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Which pension money is not included in your DRV refund?
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Many people assume that receiving their “German pension refund”
                  finishes everything connected to their employment in Germany.
                </p>
                <p>
                  That is not necessarily true. Your company pension may still be
                  held by a former employer, insurer, pension institution or
                  supplementary pension scheme.
                </p>
              </div>
              <div className="mt-6">
                <InfoNote>
                  Already received your DRV refund? You may still have a bAV
                  cash-out, VBL or ZVK refund, or VddB or VddKO refund to check.
                </InfoNote>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                A DRV refund does not:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Cash out a bAV',
                    'Cancel a Direktversicherung',
                    'Pay out a Pensionskasse or Pensionsfonds entitlement',
                    'Check a pension held by Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider',
                    'Refund VBL or ZVK contributions',
                    'Start a company pension application on your behalf',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FIND THE RIGHT NEXT STEP (Figma 1373:10087) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Find the right next step"
              title="What does your company pension document say?"
              body="Start with the wording on your letter, statement, contract or old payslip."
            />
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="bAV or German company pension"
              body="You may have a bAV if a German employer arranged a pension for you. Whether it can be paid out early depends on the pension arrangement, current value, vesting status, former employer, provider and available settlement route."
              cta={{
                label: 'Check whether my bAV can be cashed out',
                href: START_HREF,
              }}
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Direktversicherung, Pensionskasse or Pensionsfonds"
              body="These are common ways a bAV may be arranged. They are separate from DRV and normally require their own company pension cash-out check."
              cta={{ label: 'Check my company pension cash-out', href: START_HREF }}
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI or BVV"
              body="Your pension may appear under the name of an insurer or pension institution rather than the term “bAV.” Start with the provider name and the pension document you have."
              cta={{ label: 'Start with my provider document', href: START_HREF }}
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="VBL or ZVK"
              body="You may have paid into VBL or a ZVK if you worked for a university, public hospital, research institute, municipality or another public-sector employer. Eligible employee contributions may require a separate refund application."
              cta={{ label: 'Check my VBL or ZVK refund', href: START_HREF }}
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="VddB or VddKO"
              body="You may have paid into VddB or VddKO through theatre, stage, opera, dance or orchestra employment. These pensions follow their own refund process."
              cta={{ label: 'Check my VddB or VddKO refund', href: START_HREF }}
            />
          </div>
        </div>
      </section>

      {/* ---- DRV REFUND AND bAV (Figma 1375:180) ----
          COPY-GOVERNANCE (client item 3): the "small-benefit threshold" is
          referenced verbatim from the design. The 2026 numeric threshold is
          still pending from the client (docs/client-feedback-status.md) but no
          number is stated in this frame, so nothing is invented here. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="DRV refund and bAV"
              title="Your DRV refund can matter when checking a larger vested bAV"
              body="Your DRV refund and bAV are separate, but there can be an important connection between them."
            />
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-4 text-base leading-relaxed text-gray-600">
            <p>
              Small company pensions can sometimes be settled under the
              small-benefit rules. For a larger vested bAV, an approved refund of
              your statutory pension contributions can establish the basis for
              requesting a lump-sum settlement under §3(3) BetrAVG.
            </p>
            <InfoNote>
              <div className="space-y-2">
                <p>
                  Germany Pension Refund is a separate service operated by ATLAES
                  GmbH.
                </p>
                <p>
                  An approved DRV refund can establish the legal basis for
                  requesting a lump-sum settlement under §3(3) BetrAVG where the
                  statutory requirements are met.
                </p>
                <p>
                  The employer or pension provider still reviews the individual
                  pension arrangement and the applicable conditions before
                  processing the request.
                </p>
                <p>A DRV refund does not automatically pay out the bAV.</p>
              </div>
            </InfoNote>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Already received your DRV refund?
              </h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Upload your DRV refund decision together with your bAV or
                provider document. Proof of the approved refund may be relevant
                when requesting a separate lump-sum settlement of your vested
                company pension.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                The DRV payment did not include the bAV. The company pension
                still needs its own application.
              </p>
              <div className="mt-6">
                <ArrowLink href={START_HREF}>
                  Check whether my bAV can be cashed out
                </ArrowLink>
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Have not claimed your DRV refund yet?
              </h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                If your vested bAV is above the small-benefit threshold, you may
                need an approved DRV refund before requesting this type of
                lump-sum settlement.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Your eligibility for the DRV refund depends on separate rules,
                including your nationality, current residence, contribution
                history and applicable waiting period.
              </p>
              <div className="mt-6">
                <ArrowLink href={START_HREF}>
                  Check my DRV refund eligibility
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- VBL / ZVK ARE SEPARATE (Figma 1381:298) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                Public-sector pensions
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Your VBL or ZVK refund is separate from your DRV refund
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                If you worked for a German public-sector employer, you may have
                paid into both:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Deutsche Rentenversicherung, and',
                    'VBL or a Zusatzversorgungskasse',
                  ]}
                />
              </div>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Receiving your DRV refund does not refund your VBL or ZVK
                  contributions.
                </p>
                <p>
                  A separate VBL or ZVK refund may be possible if the relevant
                  pension rights have not become vested and the scheme’s other
                  requirements are met.
                </p>
              </div>
              <div className="mt-6">
                <InfoNote>
                  For VBL, a contribution refund generally concerns eligible
                  contributions you paid yourself. Employer-paid amounts are not
                  refunded to you.
                </InfoNote>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <ArrowLink href={START_HREF}>Check my VBL refund</ArrowLink>
                <ArrowLink href={START_HREF}>Check my ZVK refund</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">Example</p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                You worked for a German university and paid into both DRV and
                VBL. Later, Deutsche Rentenversicherung approved and paid your
                DRV refund.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Your VBL pension was not included in that payment. You must still
                check whether your VBL contributions qualify for a separate
                refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- VddB / VddKO ARE SEPARATE (Figma 1381:424) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-3xl text-center text-brand">
            <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
              Stage and orchestra pensions
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your VddB or VddKO contributions are also separate
            </h2>
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-base leading-relaxed text-gray-600">
            <p>
              If you worked in theatre, stage, opera, dance or orchestra
              employment, you may have paid into VddB or VddKO in addition to
              DRV.
            </p>
            <p>A DRV refund does not include those contributions.</p>
            <p>
              If you have a VddB or VddKO letter, contribution record or
              membership number, check whether a separate refund may be possible.
            </p>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Check my VddB or VddKO refund
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- MORE THAN ONE PENSION (Figma 1381:453) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                More than one pension
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                You may qualify for more than one separate process
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                The answer is not always “DRV or company pension.” You may need
                both.
              </p>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Each pension institution reviews only the pension money it
                  administers.
                </p>
                <p>One application does not automatically complete the others.</p>
              </div>
              <div className="mt-6">
                <InfoNote>
                  Your DRV refund deals with your statutory pension
                  contributions. Your employer-related pension money remains
                  separate until the responsible provider or scheme processes it.
                </InfoNote>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                You may need both:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'A DRV refund and a separate bAV cash-out',
                    'A DRV refund and a separate VBL refund',
                    'A DRV refund and a separate ZVK refund',
                    'A DRV refund and a separate VddB or VddKO refund',
                    'More than one company pension from different employers',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- COMPARISON TABLE (Figma 1381:505 / table 1381:518) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="DRV refund vs company pension cash-out or refund"
              body="The table shows the practical difference between the two processes."
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="DRV refund vs company pension cash-out or refund"
              columns={[
                'Topic',
                'DRV refund',
                'Company pension refund / cash-out',
              ]}
              rows={[
                {
                  label: 'Pension system',
                  values: [
                    'Germany’s statutory state pension',
                    'A pension connected to an employer, industry or occupational scheme',
                  ],
                },
                {
                  label: 'Responsible institution',
                  values: [
                    'Deutsche Rentenversicherung',
                    'Employer, insurance provider, pension institution, VBL, ZVK, VddB or VddKO',
                  ],
                },
                {
                  label: 'What it may cover',
                  values: [
                    'Eligible statutory pension contributions',
                    'A bAV cash-out or eligible company pension contributions',
                  ],
                },
                {
                  label: 'Common document wording',
                  values: [
                    'DRV, Rentenversicherung, Versicherungsverlauf, Beitragserstattung',
                    'bAV, Direktversicherung, Pensionskasse, VBL, ZVK, VddB or VddKO',
                  ],
                },
                {
                  label: 'Is an application required?',
                  values: ['Yes', 'Yes'],
                },
                {
                  label: 'Does the DRV refund include the company pension?',
                  values: ['No', 'The company pension requires its own process'],
                },
                {
                  label: 'Can both apply?',
                  values: ['Yes', 'Yes'],
                },
                {
                  label: 'Important connection',
                  values: [
                    'The DRV refund remains a separate statutory pension process',
                    'An approved DRV refund can be relevant to a lump-sum settlement request for a vested bAV',
                  ],
                },
                {
                  label: 'Who decides?',
                  values: [
                    'Deutsche Rentenversicherung',
                    'The relevant employer, provider, pension scheme or institution',
                  ],
                },
                {
                  label: 'Who pays the money?',
                  values: [
                    'Deutsche Rentenversicherung',
                    'The relevant employer, provider, pension scheme or institution',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- YOUR NEXT STEP (Figma 1385:92) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                Your next step
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Start with the pension document you still have
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                You do not need to understand every German pension term before
                starting.
              </p>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                If you are still unsure, upload the document or enter the provider
                name. The platform will guide you toward the relevant process.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Check the wording on your document:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'bAV, Direktversicherung, Pensionskasse or Pensionsfonds: start a company pension cash-out check.',
                    'Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI or BVV: start with your provider document.',
                    'VBL or ZVK: check whether your public-sector contributions may be refundable.',
                    'VddB or VddKO: check your stage or orchestra pension refund.',
                    'DRV or Deutsche Rentenversicherung: use the separate German state pension refund process.',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DIGITAL PROCESS STEPS (Figma 1388:68) ----
          Section heading "Start your VBL refund online" is transcribed verbatim
          from the design (node 1390:159); it reads VBL-specific but the body
          clarifies the platform covers all company pension routes. Design shows
          the last two steps mislabelled 03/04; renumbered 05/06 here for a
          correct sequence. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="The digital process"
              title="Start your VBL refund online"
              body="CompanyPension is built for bAV cash-outs and VBL, ZVK, VddB and VddKO refunds. Start with the document, provider or scheme name you have."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Upload your document or answer guided questions"
              body="Start with your pension document, provider name or the wording you recognise. The platform identifies the most relevant cash-out or refund route."
            />
            <StepCard
              number="02"
              title="Check whether your pension may qualify"
              body="Your answers and available document information are checked against the basic requirements for that pension."
            />
            <StepCard
              number="03"
              title="Secure your claim"
              body="If your cash-out or refund may be possible, create secure access, review the pricing and pay the €199 deposit. The deposit is credited toward the final service fee."
            />
            <StepCard
              number="04"
              title="Complete your information"
              body="Add or confirm your identity, employment, pension and bank details. Upload any documents still required."
            />
            <StepCard
              number="05"
              title="Review, sign and submit online"
              body="Review the completed application, correct anything necessary and sign it yourself online. After signing, the application is technically transmitted to the relevant employer, provider or pension institution through the CompanyPension platform. You remain the applicant and claimant."
            />
            <StepCard
              number="06"
              title="Receive approved money directly"
              body="The responsible employer, provider or pension institution makes the final decision. If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
          <div className="mt-12 flex justify-center">
            <ArrowLink href={START_HREF}>Check my company pension</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT TO LOOK FOR / DOCUMENTS (Figma 1390:226) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                What to look for
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Which documents can help identify your pension?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Start with whatever you still have.
              </p>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                You do not need every document before starting.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Begin with the clearest pension letter, statement or provider name
                you have. The platform shows what information is still missing.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Start with my pension document
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Helpful documents may include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'DRV refund decision',
                    'DRV contribution record or Versicherungsverlauf',
                    'bAV contract or company pension letter',
                    'Direktversicherung policy',
                    'Pensionskasse or Pensionsfonds document',
                    'Provider statement from Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider',
                    'VBL letter or VBL insurance number',
                    'ZVK or Zusatzversorgungskasse document',
                    'VddB or VddKO letter',
                    'Old payslip showing company pension deductions',
                    'Former-employer pension information',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- EXPLORE THE RIGHT PENSION (Figma 1391:294) ----
          Navigational cards to sibling marketing routes in this wave. The
          BVV cash-out has no dedicated page yet, so it falls back to the
          cash-outs-and-refunds landing. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Already know what you have?"
              title="Explore the right pension"
            />
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<ArrowRight className="h-7 w-7" aria-hidden="true" />}
              title="Cash-Outs & Refunds"
              body="See all company pension cash-out and refund routes supported by CompanyPension."
              cta={{
                label: 'See all cash-outs & refunds',
                href: CASHOUTS_HREF,
              }}
              ctaVariant="outline"
            />
            <FeatureCard
              icon={<ArrowRight className="h-7 w-7" aria-hidden="true" />}
              title="Company Pension Cash-Out"
              body="Check a bAV, Direktversicherung, Pensionskasse, Pensionsfonds or provider-based company pension."
              cta={{
                label: 'Open company pension cash-out',
                href: '/company-pension-cash-out',
              }}
              ctaVariant="outline"
            />
            <FeatureCard
              icon={<ArrowRight className="h-7 w-7" aria-hidden="true" />}
              title="VBL Pension Refund"
              body="Check whether eligible employee contributions paid into VBL may be refundable."
              cta={{ label: 'Open VBL refund', href: '/vbl-refund' }}
              ctaVariant="outline"
            />
            <FeatureCard
              icon={<ArrowRight className="h-7 w-7" aria-hidden="true" />}
              title="ZVK Refund"
              body="Check a pension held by a Zusatzversorgungskasse."
              cta={{ label: 'Open ZVK refund', href: '/zvk-refund' }}
              ctaVariant="outline"
            />
            <FeatureCard
              icon={<ArrowRight className="h-7 w-7" aria-hidden="true" />}
              title="VddB & VddKO Refunds"
              body="Check pension contributions from German stage, theatre, opera, dance or orchestra employment."
              cta={{
                label: 'Open VddB & VddKO refunds',
                href: '/vddb-vddko-refund',
              }}
              ctaVariant="outline"
            />
            <FeatureCard
              icon={<ArrowRight className="h-7 w-7" aria-hidden="true" />}
              title="BVV Cash-Out"
              body="Check a company pension connected to German banking or financial-sector employment."
              cta={{ label: 'Open BVV cash-out', href: CASHOUTS_HREF }}
              ctaVariant="outline"
            />
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1392:70) ----
          FAQ_ANSWER_PENDING: every FAQ item in this frame is a component
          instance carrying lorem defaults ("How do I pay for the…", "We need to
          add new u…", "My team wants to can…"). Questions and answers are
          UNVERIFIABLE from the XML and must not be invented — a backfill pass
          fills them once final copy is available. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions about company pensions and DRV refunds"
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
              href="/faq"
              className="rounded-brand bg-accent px-8 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See All FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ---- KEY TERMS (Figma 1392:783) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Key terms"
              title="Pension wording you may see on German documents"
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory pension system."
            />
            <GlossaryCard
              term="Company pension"
              body="A pension connected to an employer, profession, industry or supplementary pension scheme."
            />
            <GlossaryCard
              term="VBL and ZVK"
              body="Supplementary pension schemes for many German public-sector employees."
            />
            <GlossaryCard
              term="Beitragserstattung"
              body="The German term for a contribution refund. The term can appear in both DRV and company pension documents, but the applications remain separate."
            />
            <GlossaryCard
              term="VddB and VddKO"
              body="Pension institutions connected to German stage, theatre, opera, dance and orchestra employment."
            />
            <GlossaryCard
              term="Abfindung"
              body="A one-time or lump-sum settlement of a pension entitlement."
            />
            <GlossaryCard
              term="Direktversicherung"
              body="A common insurance-based way of arranging a bAV through an employer."
            />
            <GlossaryCard
              term="DRV refund"
              body="A refund of eligible statutory pension contributions recorded by Deutsche Rentenversicherung."
            />
            <GlossaryCard
              term="bAV"
              body="Short for betriebliche Altersversorgung. The German term for an occupational or company pension."
            />
            <GlossaryCard
              term="Pensionskasse and Pensionsfonds"
              body="Other ways a German employer may arrange a bAV."
            />
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION 1 (Figma 1392:885) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Separate pension systems and separate decisions
        </h2>
        <p className="mt-6 text-base leading-relaxed text-gray-600">
          CompanyPension is a digital application platform and brand operated by
          ATLAES GmbH. The platform supports bAV cash-outs and VBL, ZVK, VddB and
          VddKO refunds.
        </p>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          A DRV refund concerns eligible statutory pension contributions paid
          into Deutsche Rentenversicherung. It does not include company pensions.
        </p>
        <p className="mt-6 text-base font-semibold leading-relaxed text-brand">
          If you continue with CompanyPension:
        </p>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            The platform prepares the relevant application from the information
            you provide.
          </li>
          <li>You review and sign the application yourself.</li>
          <li>You remain the applicant and claimant.</li>
          <li>
            The signed application is technically transmitted through the
            CompanyPension platform.
          </li>
          <li>
            The responsible employer, provider, pension scheme or institution
            makes the final decision. You may give ATLAES GmbH limited
            authorization to receive and forward relevant correspondence and
            information about the decision and approved amount.
          </li>
        </ul>
        <p className="mt-6 text-base leading-relaxed text-gray-600">
          This allows the platform to display next steps and calculate the agreed
          service fee. It does not make ATLAES GmbH the applicant or claimant.
        </p>
        <p className="mt-6 text-base font-semibold leading-relaxed text-brand">
          CompanyPension does not:
        </p>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>Decide whether a cash-out or refund is approved</li>
          <li>Provide pension advice</li>
          <li>Provide legal or tax advice</li>
          <li>Provide financial advice</li>
          <li>Provide insurance advice or brokerage</li>
          <li>Argue your legal position</li>
          <li>Receive, hold or forward approved pension money</li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If separate legal services are required, they are provided by the
          responsible legal partner under a separate arrangement.
        </div>
      </ImportantCallout>

      {/* ---- IMPORTANT INFORMATION 2 / SOURCE BASIS (Figma 1392:1064) ----
          The design carries "[Add actual review date]" / "[Add reviewer name
          and role]" bracketed placeholders; these are authoring instructions,
          not shippable copy, and are intentionally omitted. */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Source basis
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            DRV contribution refunds apply to eligible statutory pension
            contributions under the rules of Deutsche Rentenversicherung.
          </li>
          <li>
            bAV cash-outs follow the German occupational pension framework and
            the relevant pension or contract terms.
          </li>
          <li>
            An approved DRV refund can establish the legal basis for requesting
            settlement of a vested bAV under §3(3) BetrAVG where the statutory
            requirements are met.
          </li>
          <li>
            VBL, ZVK, VddB and VddKO follow their own pension-scheme or
            institution-specific refund rules.
          </li>
          <li>
            For VBL contribution refunds, eligible employee-paid contributions
            may be refunded, while employer-paid amounts are not paid to the
            employee.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          This page provides general information and does not replace individual
          legal, pension, tax, insurance or financial advice.
        </div>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1392:1125) ---- */}
      <CtaBand
        eyebrow="Check what DRV did not cover"
        title={
          <>
            Check what <span className="text-accent">DRV did not cover</span>
          </>
        }
        body="Already received your DRV refund? Your company pension may still be waiting. Start with your bAV document, provider statement, VBL or ZVK letter, or VddB or VddKO document. The platform identifies the relevant cash-out or refund route and shows what information is still needed."
        cta={{ label: 'Check my company pension', href: START_HREF }}
        secondaryCta={{
          label: 'See all cash-outs & refunds',
          href: CASHOUTS_HREF,
        }}
        note="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
      />
    </>
  );
}
