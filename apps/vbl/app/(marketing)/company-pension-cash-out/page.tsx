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

// Funnel entry CTAs route to the claim flow. The bAV cash-out has no refund
// calculator, so this page never links to /calculator (per Task 14 brief).
const START_HREF = '/get-started';
const HOW_HREF = '/how-it-works';
const PRICING_HREF = '/pricing';
const FAQ_HREF = '/faq';
// Sibling product page (built in parallel by another agent).
const COMPARE_HREF = '/company-pension-vs-drv';
// Existing VBL/ZVK refund product page.
const REFUND_HREF = '/vbl-refund';

// ---------------------------------------------------------------------------
// Local, page-only building blocks (same conventions as the vbl-refund page)
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

function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-brand border border-neutral-400 bg-white px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-neutral-50"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/** Numbered process card with a rich (block-level) body. */
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
      <span className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">
        {number}
      </span>
      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
        {children}
      </div>
    </div>
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

/** Small labelled stat tile (the 2026 small-benefit guide values). */
function StatTile({
  label,
  caption,
  value,
}: {
  label: string;
  caption: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-400 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-brand">{value}</p>
      <p className="mt-1 text-sm text-gray-600">{caption}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1254:10129 — "Company Pension Cash-Out CompanyPension")
// bAV / provider-based company pension CASH-OUT. Copy verbatim from the XML.
// Nav + footer come from the (marketing) layout. No calculator CTA exists for
// bAV cash-outs, so none is rendered.
// ---------------------------------------------------------------------------

export default function CompanyPensionCashOutPage() {
  return (
    <>
      {/* ---- HERO (Figma 1254:10186) ----
          Node 1254:10542 ("The key question is usually not…") is hidden="true"
          in the frame and is intentionally omitted. */}
      <Hero
        eyebrow="Company pension cash-out"
        title="Cash out your German company pension online"
        body={
          <>
            Have a bAV or company pension from a previous German employer?
            Upload your pension document or answer guided questions. The
            platform extracts available details, identifies the relevant bAV
            route and prepares your cash-out application for your review and
            digital signature.
          </>
        }
        primaryCta={{ label: 'Start my cash-out', href: START_HREF }}
        secondaryCta={{ label: 'See how it works', href: HOW_HREF }}
        footnote={
          <>
            <p>
              Supports Direktversicherung, Pensionskasse, Pensionsfonds,
              Unterstützungskasse and other provider-based company pensions from
              Allianz, AXA, Swiss Life, ERGO, BVV and other German providers.
            </p>
            <p className="mt-3">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </>
        }
      />

      {/* ---- DOCUMENT TERMS + CROSS-LINKS (Figma 1255:13104) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Your documents may use terms such as:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'betriebliche Altersversorgung',
                    'bAV',
                    'Direktversicherung',
                    'Pensionskasse',
                    'Pensionsfonds',
                    'Unterstützungskasse',
                    'Direktzusage',
                    'Entgeltumwandlung',
                    'employer pension',
                    'company pension',
                  ]}
                />
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <p className="text-lg font-semibold text-brand">
                This page is for bAV and provider-based German company pension
                cash-outs.
              </p>
              <InfoNote>
                VBL, ZVK, VddB, VddKO and German state pension refunds are
                separate processes. A DRV refund through Deutsche
                Rentenversicherung does not automatically include your company
                pension.
              </InfoNote>
              <div className="rounded-2xl border border-neutral-400 bg-white p-6">
                <p className="text-base font-semibold text-brand">
                  Looking for VBL or ZVK?
                </p>
                <div className="mt-3">
                  <SecondaryLink href={REFUND_HREF}>
                    Start a VBL or ZVK refund.
                  </SecondaryLink>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-400 bg-white p-6">
                <p className="text-base font-semibold text-brand">
                  Already received a DRV refund?
                </p>
                <div className="mt-3">
                  <SecondaryLink href={COMPARE_HREF}>
                    Compare company pension and DRV.
                  </SecondaryLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- BUILT AROUND YOUR DOCUMENTS (Figma 1258:113) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Built around your documents"
              title="Upload your pension document instead of decoding it yourself"
              body="Many users do not see the term “bAV” on their documents. They see a provider, contract or product name. CompanyPension is designed to start with the document you already have."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <NumberedCard number="01" title="Automated document recognition">
              <p>
                Upload a pension statement, insurance letter, bAV contract or
                provider document.
              </p>
              <p>
                OCR and automated data extraction can identify available details
                such as:
              </p>
              <p>
                Provider, Contract or insurance number, Pension type, Employer,
                Pension dates, Monthly pension value and Capital value.
              </p>
              <p>
                You review and correct the extracted information before anything
                is submitted.
              </p>
            </NumberedCard>
            <NumberedCard number="02" title="A flow adapted to your bAV">
              <p>
                The questions and required documents change according to the
                provider, contract type and information shown on your pension
                documents.
              </p>
              <p>
                A Direktversicherung may require different details from a
                Pensionskasse, Pensionsfonds or Unterstützungskasse.
              </p>
            </NumberedCard>
            <NumberedCard number="03" title="Automated completeness checks">
              <p>
                The platform checks for missing information, inconsistent
                answers and documents that may still be needed before signing.
              </p>
            </NumberedCard>
            <NumberedCard number="04" title="Human oversight when needed">
              <p>Most standard steps run digitally and automatically.</p>
              <p>
                Human support is added when a document cannot be read reliably
                or when provider correspondence needs clarification or
                translation.
              </p>
              <p>
                You remain in a secure English-language flow while the technical
                application process runs through the platform.
              </p>
            </NumberedCard>
          </div>
        </div>
      </section>

      {/* ---- CAN I CASH OUT AFTER LEAVING GERMANY? (Figma 1260:311) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Can I cash out my bAV after leaving Germany?
              </h2>
              <p className="mt-6 text-lg font-semibold text-brand">Possibly.</p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                People often search for this as “cancel my bAV” or “cancel my
                German company pension.” In practice, the relevant process is
                usually a one-time cash-out or lump-sum settlement rather than a
                refund of contributions.
              </p>
              <p className="mt-8 text-base leading-relaxed text-gray-600">
                Small company pensions can sometimes be settled under the
                small-benefit rules.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                For larger vested entitlements, an approved DRV refund can
                create the basis for requesting a separate lump-sum settlement
                under §3(3) BetrAVG.
              </p>
              <div className="mt-6">
                <InfoNote>
                  The DRV refund does not include or automatically pay out the
                  bAV. A separate company pension request is still required.
                </InfoNote>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <ArrowLink href={START_HREF}>Start my bAV cash-out</ArrowLink>
                <SecondaryLink href={COMPARE_HREF}>
                  Compare company pension and DRV
                </SecondaryLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                Quick answer
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Leaving Germany or leaving your German employer does not
                automatically create a cash-out right, but a one-time payout may
                be possible depending on:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'The type of bAV',
                    'The pension or capital value',
                    'Whether the entitlement is vested',
                    'The employer and provider',
                    'The contract terms',
                    'Whether a permitted lump-sum settlement route applies',
                    'Whether your German state pension contributions have already been refunded',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PROVIDER / CONTRACT RECOGNITION (Figma 1261:461) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Your company pension may appear under a provider or contract
                name
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Many users do not see the word “bAV” first. They see the name of
                an insurance provider, pension institution or contract type.
              </p>
              <p className="mt-8 text-base leading-relaxed text-gray-600">
                You do not need to know the exact legal structure before
                starting.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Upload the document or enter the provider name manually. The
                platform uses the available information to guide you into the
                relevant cash-out flow.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <ArrowLink href={START_HREF}>Start my bAV cash-out</ArrowLink>
                <SecondaryLink href={COMPARE_HREF}>
                  Compare company pension and DRV
                </SecondaryLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                Provider and contract recognition
              </p>
              <p className="mt-3 text-base text-gray-600">
                Your bAV document may mention:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Allianz Direktversicherung',
                    'Allianz Pensionskasse',
                    'Allianz Pensionsfonds',
                    'AXA Direktversicherung',
                    'AXA Unterstützungskasse',
                    'Swiss Life company pension',
                    'Swiss Life Pensionskasse',
                    'Swiss Life Pensionsfonds',
                    'ERGO Betriebs-Rente',
                    'ERGO Pensionskasse',
                    'BVV Versicherungsverein des Bankgewerbes',
                    'BVV Versorgungskasse',
                    'BVV Pensionsfonds',
                    'Another German pension or insurance provider',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHEN CAN A COMPANY PENSION BE CASHED OUT? (Figma 1261) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="When can a company pension be cashed out?"
              body="A one-time payout is generally most relevant in two situations."
            />
          </div>
          <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
            {/* Situation 1 */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                1
              </span>
              <h3 className="mt-5 text-xl font-semibold text-brand">
                The company pension is small
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                A pension around or below these values may be eligible for a
                small-benefit settlement.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                For 2026, the main guide values are:
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <StatTile label="Value 1" caption="per month" value="€59.33" />
                <StatTile
                  label="Value 2"
                  caption="capital value"
                  value="€7,119"
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                This does not create an automatic payout. The employer or
                provider still needs to review the pension arrangement and
                process the request.
              </p>
            </div>
            {/* Situation 2 */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                2
              </span>
              <h3 className="mt-5 text-xl font-semibold text-brand">
                Your DRV contributions were refunded
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                For a larger vested bAV entitlement, an approved German state
                pension refund can create the basis for requesting a lump-sum
                settlement under §3(3) BetrAVG.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                This route may be relevant where the bAV is above the
                small-benefit threshold.
              </p>
              <div className="mt-6">
                <InfoNote>
                  The company pension is not included in the DRV refund. A
                  separate request and proof of the approved DRV refund are
                  still required.
                </InfoNote>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">
              Cash-out routes
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              Small company pensions may qualify under the small-benefit rule.
              Larger vested entitlements may require an approved DRV refund
              before a separate settlement can be requested.
            </p>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>Check my cash-out</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- DRV REFUND DOES NOT INCLUDE THE bAV (Figma 1261:625) ----
          COPY-FLAG (Task 14): the section heading node 1261:631 reads "When can
          I get a VBL refund?" and paragraph node 1261:667 references "your VBL
          periods" / "VBL-only history". Both are VBL-template remnants that do
          not match this DRV-vs-bAV section. Rendered verbatim per the
          verbatim/never-invent rule and flagged in the task report for the
          client to correct in Figma. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                When can I get a VBL refund?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Your DRV refund covers only eligible statutory pension
                contributions paid into Deutsche Rentenversicherung.
              </p>
              <p className="mt-8 text-lg font-semibold text-brand">
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
                    'VBL',
                    'ZVK',
                    'Other company pensions',
                  ]}
                />
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <ArrowLink href={START_HREF}>Start my bAV cash-out</ArrowLink>
                <SecondaryLink href={COMPARE_HREF}>
                  Compare company pension and DRV
                </SecondaryLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-neutral-400 bg-white p-8">
                <p className="text-lg font-semibold text-brand">
                  DRV refund and bAV
                </p>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  However, proof of an approved DRV refund can be important for
                  a vested bAV. It can create the basis for requesting a
                  separate lump-sum settlement under §3(3) BetrAVG.
                </p>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  CompanyPension asks about your DRV refund status during the
                  guided bAV flow and shows whether proof of the refund is
                  relevant to the application route.
                </p>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  Recognised periods with another public-sector company pension
                  scheme, such as a ZVK, may count together with your VBL
                  periods. This can make a refund impossible even if your
                  VBL-only history looks short.
                </p>
                <div className="mt-6">
                  <InfoNote>
                    An approved DRV refund can establish the legal basis for
                    requesting a lump-sum settlement under §3(3) BetrAVG where
                    the statutory requirements are met. In practice, the
                    employer or pension provider still reviews the individual
                    pension arrangement and the applicable legal conditions
                    before processing the request. If you believe you qualify
                    under the law but your request is rejected, CompanyPension
                    may be able to connect you with independent legal partners
                    who can assess and, where appropriate, help enforce your
                    claim.
                  </InfoNote>
                </div>
              </div>
              {/* "Need your DRV refund first?" checklist (Figma 1262:716) */}
              <div className="rounded-2xl border border-neutral-400 bg-white p-8">
                <p className="text-lg font-semibold text-brand">
                  Need your DRV refund first?
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand">
                  Checklist
                </p>
                <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                  <p>
                    For some bAV cash-outs, your German state pension refund
                    status can be the deciding factor.
                  </p>
                  <p>
                    If your DRV refund has not been approved yet, a larger
                    vested bAV may not be ready for a cashout request —
                    especially if the amount is above the usual small-benefit
                    range.
                  </p>
                  <p>
                    If you have not claimed your German state pension refund
                    yet, you can check it through our separate Germany Pension
                    Refund platform.
                  </p>
                  <p>
                    German state pension refunds are handled separately from
                    CompanyPension cash-outs and refunds.
                  </p>
                </div>
                <div className="mt-5">
                  {/* Points to the separate Germany Pension Refund platform;
                      exact URL pending, funnelled to /get-started for now. */}
                  <SecondaryLink href={START_HREF}>
                    Check german state pension refund
                  </SecondaryLink>
                </div>
                <div className="mt-6">
                  <CheckList
                    items={[
                      '9.75% success fee',
                      'No upfront payment',
                      'No minimum fee',
                      'Maximum fee €2,500',
                      'Separate DRV refund process',
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CASH-OUT vs REFUND (Figma 1262:751) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Cash-out or refund"
              title="Is a company pension cash-out the same as a refund?"
              body="No. The terms describe different pension processes."
            />
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Company pension cash-out"
              body="A cash-out means requesting a one-time payout or lump-sum settlement of a bAV entitlement."
              bulletsLabel="This wording applies to:"
              bullets={[
                'bAV',
                'Direktversicherung',
                'Pensionskasse',
                'Pensionsfonds',
                'Unterstützungskasse',
                'Provider-based company pensions',
                'Abfindung',
                'One-time payout',
              ]}
              cta={{ label: 'Start my bAV cash-out', href: START_HREF }}
            />
            <FeatureCard
              icon={<Info className="h-7 w-7" aria-hidden="true" />}
              title="Company pension refund"
              body="A refund means applying to get eligible employee contributions back from a contribution-based pension scheme."
              bulletsLabel="This wording applies to:"
              bullets={['VBL', 'ZVK', 'VddB', 'VddKO', 'Beitragserstattung']}
              cta={{ label: 'Start a pension refund', href: START_HREF }}
              ctaVariant="outline"
            />
          </div>
          <p className="mx-auto mt-10 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            The outcome may sound similar—receiving pension money after leaving
            employment—but the legal basis, documents and application flow are
            different.
          </p>
        </div>
      </section>

      {/* ---- 5-STEP DIGITAL PROCESS (Figma 1262:906) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="The digital process"
              title="Complete your bAV cash-out online in five steps"
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Check whether a cash-out may be possible"
              body="Upload a pension document or answer guided questions. The platform reads the available details and checks which bAV cash-out route may be relevant."
            />
            <StepCard
              number="02"
              title="Secure your claim"
              body="If the case may be possible, create your secure account, review the pricing and pay the €199 deposit to activate the full process. Your deposit is credited toward your final service fee."
            />
            <StepCard
              number="03"
              title="Complete your details"
              body="Upload your ID and any missing pension or employment documents. Add or confirm your personal, pension, employer and bank details."
            />
            <StepCard
              number="04"
              title="Review, sign and submit digitally"
              body="Review the completed application, confirm the details and sign it yourself online. After signing, the application is technically transmitted to the responsible employer, provider or pension institution through the CompanyPension platform. You remain the applicant and claimant."
            />
            <StepCard
              number="05"
              title="Receive your money and pay the remaining fee"
              body="The employer or provider reviews the application and makes the final decision. Where authorised, correspondence and requests for additional information can be displayed through your secure account. If approved, the money is paid directly to the bank account you provide. Your €199 deposit is credited toward the 9.75% success fee, and only the remaining service fee becomes due. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ArrowLink href={START_HREF}>Start my cash-out</ArrowLink>
            <SecondaryLink href={HOW_HREF}>See the full process</SecondaryLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT DOCUMENTS DO I NEED? (Figma 1262:1160) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                Documents
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What documents do I need for a bAV cash-out?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                You can start with the documents you already have. The online
                flow shows what is still needed.
              </p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Upload the clearest current pension document first. Automated
                document recognition can pre-fill available details, and you can
                add or correct information manually.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start with my documents</ArrowLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
                <p className="text-lg font-semibold text-brand">
                  Common documents
                </p>
                <div className="mt-6">
                  <CheckList
                    items={[
                      'Pension statement or provider letter',
                      'bAV contract',
                      'Direktversicherung document',
                      'Pensionskasse or Pensionsfonds letter',
                      'Employer pension agreement',
                      'Passport or ID',
                      'Current address',
                      'Bank details',
                      'Proof that the relevant employment ended',
                      'Current pension or capital value, where available',
                    ]}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
                <p className="text-lg font-semibold text-brand">
                  Additional documents that may be needed
                </p>
                <div className="mt-6">
                  <CheckList
                    items={[
                      'Former-employer information or confirmation',
                      'Health insurance confirmation',
                      'Proof of an approved DRV refund',
                      'Provider-specific forms or statements',
                      'Older payslips showing company pension deductions',
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1262:1665) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Pricing"
              title="Pricing for bAV cash-outs"
            />
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-4xl font-bold text-brand">€199</span>
                  <p className="mt-1 text-sm text-gray-600">
                    deposit credited toward your service fee
                  </p>
                </div>
                <span className="text-2xl font-bold text-gray-400">+</span>
                <div>
                  <span className="text-4xl font-bold text-brand">9.75%</span>
                  <p className="mt-1 text-sm text-gray-600">
                    success fee only if approved
                  </p>
                </div>
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                The €199 deposit activates the full digital cash-out process.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                If approved, the provider pays the money directly to the bank
                account you provide. CompanyPension does not receive, hold or
                forward approved pension money.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                If the cash-out is approved:
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'The success fee is 9.75% of the approved amount',
                    'The minimum total service fee is €199',
                    'The deposit is credited toward the final service fee',
                    'Only the remaining difference becomes due',
                  ]}
                />
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <ArrowLink href={START_HREF}>Start my cash-out</ArrowLink>
                <SecondaryLink href={PRICING_HREF}>
                  See full pricing
                </SecondaryLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-neutral-400 bg-white p-8">
                <p className="text-lg font-semibold text-brand">
                  What the deposit activates
                </p>
                <div className="mt-6">
                  <CheckList
                    items={[
                      'Secure claim account',
                      'Pension-document upload',
                      'OCR and automated data extraction',
                      'Cash-out route check',
                      'Document and case review',
                      'Guided online application',
                      'Digital review and signing',
                      'Technical transmission after signing',
                      'Secure provider correspondence',
                      'Human support when clarification or translation is needed',
                    ]}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-400 bg-white p-8">
                <p className="text-lg font-semibold text-brand">
                  If no cash-out request can be submitted
                </p>
                <p className="mt-3 text-base leading-relaxed text-gray-600">
                  If the cash-out cannot be submitted after the digital case and
                  document review:
                </p>
                <div className="mt-4">
                  <CheckList items={['€79 is retained', '€120 is refunded']} />
                </div>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  The retained €79 covers the secure claim setup, document
                  extraction and case review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- COMPARISON TABLE (Figma 1263:1798) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="Company pension cash-out vs German state pension refund"
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="Company pension cash-out vs German state pension refund"
              columns={[
                'Question',
                'Company pension cash-out',
                'German state pension refund',
              ]}
              rows={[
                {
                  label: 'What is involved?',
                  values: [
                    'A bAV or provider-based company pension from a previous German employer.',
                    'Eligible statutory German pension contributions paid into Deutsche Rentenversicherung.',
                  ],
                },
                {
                  label: 'What may appear on the documents?',
                  values: [
                    'bAV, Direktversicherung, Pensionskasse, Pensionsfonds, Unterstützungskasse, Allianz, AXA, Swiss Life, ERGO, BVV or another pension provider.',
                    'DRV, Deutsche Rentenversicherung, Renteninformation, Versicherungsverlauf or Beitragserstattung.',
                  ],
                },
                {
                  label: 'What is the main question?',
                  values: [
                    'Can the bAV be settled or paid out as a one-time amount?',
                    'Do the nationality, residence, contribution and waiting-period rules allow a DRV refund?',
                  ],
                },
                {
                  label: 'Does the DRV refund include the company pension?',
                  values: [
                    'No. The bAV requires a separate cash-out request.',
                    'No. A DRV refund covers statutory pension contributions only.',
                  ],
                },
                {
                  label: 'Can both processes matter?',
                  values: [
                    'Yes. An approved DRV refund can create the basis for requesting settlement of a vested bAV.',
                    'Yes. The DRV refund may be relevant to a separate bAV cash-out but does not pay it automatically.',
                  ],
                },
                {
                  label: 'Where should I start?',
                  values: [
                    'Start the bAV cash-out flow.',
                    'Use the separate German state pension refund process.',
                  ],
                },
              ]}
            />
          </div>
          <div className="mt-10 flex justify-center">
            <SecondaryLink href={COMPARE_HREF}>
              Compare company pension and DRV
            </SecondaryLink>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1264:2503) ----
          FAQ_ANSWER_PENDING: every FAQ item in this frame is a component
          instance carrying lorem defaults ("How do I pay for the…", "You can pay
          with a c…", "My team wants to can…"). Questions and answers are
          UNVERIFIABLE from the XML and must not be invented — filled in a
          backfill pass once Figma access is restored. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="Company pension cash-out: common questions"
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

      {/* ---- GLOSSARY (Figma 1265:2579) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Key terms"
              title="Company pension cash-out terms explained"
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="bAV"
              body="Short for betriebliche Altersversorgung. This is the German term for an occupational or company pension."
            />
            <GlossaryCard
              term="Company pension cash-out"
              body="A request to settle or pay out a bAV entitlement as a one-time amount."
            />
            <GlossaryCard
              term="Direktversicherung"
              body="A common insurance-based bAV arrangement set up through an employer."
            />
            <GlossaryCard
              term="Pensionskasse"
              body="A pension institution that provides company pension benefits."
            />
            <GlossaryCard
              term="Pensionsfonds"
              body="A company pension arrangement managed through a pension fund."
            />
            <GlossaryCard
              term="Unterstützungskasse"
              body="A support-fund structure used for some German company pensions."
            />
            <GlossaryCard
              term="Provider"
              body="The insurance company, pension institution or organisation responsible for administering the pension."
            />
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory pension system. A DRV refund is separate from a company pension cash-out."
            />
            <GlossaryCard
              term="Abfindung"
              body="The German term commonly used for a lump-sum settlement of a pension entitlement."
            />
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION (Figma 1265:2750) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          A digital application platform—not a pension advisor or claims agent
        </h2>
        <p className="mt-6 text-base leading-relaxed text-gray-600">
          CompanyPension is a digital application platform and brand operated by
          ATLAES GmbH. The platform uses the documents and information you
          provide to prepare the relevant cash-out application.
        </p>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          You review and sign the application yourself and remain the applicant
          and claimant throughout the process.
        </p>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          After signing, the application is technically transmitted to the
          responsible employer, provider or pension institution through the
          CompanyPension platform.
        </p>

        <p className="mt-8 text-base font-semibold text-brand">
          You may give CompanyPension limited authorization to:
        </p>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
          <li>Receive and forward provider correspondence</li>
          <li>Receive information about the final decision</li>
          <li>Receive information about the approved amount</li>
        </ul>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          This allows the platform to display follow-up requests and calculate
          the agreed service fee.
        </p>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          The limited authorization does not make CompanyPension the applicant
          or claimant.
        </p>

        <p className="mt-8 text-base font-semibold text-brand">
          CompanyPension does not:
        </p>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
          <li>Decide whether a cash-out is approved</li>
          <li>Provide pension advice</li>
          <li>Provide legal or tax advice</li>
          <li>Provide financial advice</li>
          <li>Provide insurance advice or brokerage</li>
          <li>Assess or argue your legal position</li>
          <li>Receive, hold or forward approved pension money</li>
        </ul>

        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          The employer, provider or pension institution makes the final
          decision. If separate legal services are needed for a specific case,
          they are provided by the responsible legal partner under a separate
          arrangement.
        </div>
      </ImportantCallout>

      {/* ---- SOURCE BASIS (Figma 1266:3160) ----
          Nodes 1266:3181 / 1266:3191 are intentional pre-publication
          placeholders in the design ("[Add actual review date…]", "[Add
          reviewer name and role…]") and are rendered verbatim; flagged for
          completion before go-live. */}
      <section className="bg-white">
        <div className={`${CONTAINER} pb-20 sm:pb-24`}>
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Source basis
            </p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
              <p>
                This page is based on the general framework for German
                occupational pensions under the BetrAVG and provider-specific
                pension and contract rules.
              </p>
              <p>
                The small-benefit values shown are the standard 2026 guide
                values.
              </p>
              <p>
                An approved DRV refund can create the basis for requesting a
                separate settlement of a vested bAV under §3(3) BetrAVG.
              </p>
              <p>
                This page provides general information and does not replace
                individual legal, pension, tax, insurance or financial advice.
              </p>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Last reviewed
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  [Add actual review date before publication]
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Reviewed by
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  [Add reviewer name and role before publication]
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1266:3200) ---- */}
      <CtaBand
        eyebrow="Start online"
        title="Ready to check your company pension cash-out?"
        body="Upload your bAV document or answer guided questions. The platform identifies the relevant route and shows what information is still needed."
        cta={{ label: 'Start my cash-out', href: START_HREF }}
        secondaryCta={{
          label: 'Compare company pension and DRV',
          href: COMPARE_HREF,
        }}
        note="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
      />
    </>
  );
}
