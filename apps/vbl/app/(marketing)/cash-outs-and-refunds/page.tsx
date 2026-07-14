import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { StepCard } from '@/components/marketing/StepCard';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ImportantCallout } from '@/components/marketing/ImportantCallout';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';
import { GlossaryCard } from '@/components/marketing/GlossaryCard';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { FAQ } from '@/components/marketing/faqItems';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Funnel entry CTAs route to the claim flow; calculator CTAs to /calculator.
const START_HREF = '/get-started';
const CALC_HREF = '/calculator';

// Product / SEO routes this overview hub links to. Some are landing in the same
// wave (created by sibling page agents); hrefs are wired regardless.
const COMPANY_CASH_OUT = '/company-pension-cash-out';
const VBL_REFUND = '/vbl-refund';
const ZVK_REFUND = '/zvk-refund';
const VDDB_REFUND = '/vddb-vddko-refund';
const COMPANY_VS_DRV = '/company-pension-vs-drv';
const VBL_VS_DRV = '/vbl-vs-drv';
const HOW_HREF = '/how-it-works';
const FAQ_HREF = '/faq';
const PRICING_HREF = '/pricing';
// route-pending: dedicated "guide" sub-pages (documents / bank / processing
// time) are not part of this wave — guide links fall back to /how-it-works.
const GUIDE_HREF = HOW_HREF;

// ---------------------------------------------------------------------------
// Local, page-only building blocks
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

/** Short "wording on your document" terms rendered as pill chips. */
function TermChips({ terms }: { terms: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {terms.map((term) => (
        <li
          key={term}
          className="rounded-full border border-neutral-400 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          {term}
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

function OutlineLink({
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

/** Numbered route card for the "Main claim types" chooser. */
function RouteCard({
  number,
  title,
  intro,
  bullets,
  note,
  children,
}: {
  number: string;
  title: string;
  intro: string;
  bullets?: string[];
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-brand">
        {number}
      </span>
      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{intro}</p>
      {bullets ? (
        <div className="mt-4">
          <TermChips terms={bullets} />
        </div>
      ) : null}
      <p className="mt-4 text-sm leading-relaxed text-gray-600">{note}</p>
      <div className="mt-8 flex flex-1 flex-col justify-end gap-3">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1270:72 — "Cash-Outs & Refunds Page CompanyPension")
// OVERVIEW hub. Copy transcribed verbatim from the design XML (canvas capture
// returned no render; XML-only build). Nav/footer are owned by the marketing
// layout and are not repeated here.
// ---------------------------------------------------------------------------

export default function CashOutsAndRefundsPage() {
  return (
    <>
      {/* ---- HERO (Figma 1270:129) ----
          Hero body is the VISIBLE node 1270:478. The alternate sentence "The
          key question is usually not whether…" (1270:485) is hidden="true" in
          the XML (discarded copy, also appears hidden on other frames) and is
          excluded per the hidden-node binding rule. */}
      <Hero
        eyebrow="Cash-outs & refunds"
        title="Cash out or refund your German company pension online"
        body="Upload your pension document or answer guided questions. The platform identifies whether your case belongs to a bAV cash-out, VBL or ZVK refund, or VddB or VddKO refund and adapts the next steps accordingly."
        primaryCta={{ label: 'Start your claim', href: START_HREF }}
        secondaryCta={{ label: 'Calculate my refund', href: CALC_HREF }}
        footnote={
          <div className="space-y-2">
            <p>
              The refund calculator is available for VBL, ZVK, VddB and VddKO.
              It is not used for bAV cash-outs.
            </p>
            <p>
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </div>
        }
      />

      {/* ---- INTRO / PLATFORM (Figma 1271:5355, 1271:5363) ----
          1270:478 belongs to the hero (it renders once in the design) and was
          moved there; this section keeps its own visible nodes only. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <p className="text-base leading-relaxed text-gray-600">
              CompanyPension is a secure digital application platform for German
              company pension cash-outs and refunds. Start with the provider
              name, scheme name or document you already have. The platform
              extracts available information, guides you through the relevant
              process and prepares the application for your review and digital
              signature.
            </p>
            <p className="text-sm leading-relaxed text-gray-500">
              Supports bAV and company pension documents from Allianz, AXA,
              Swiss Life, ERGO, R+V, Nürnberger, Siemens, HDI, BVV and other
              German pension and insurance providers.
            </p>
          </div>
        </div>
      </section>

      {/* ---- QUICK ANSWER (Figma 1273:6671) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading title="Which company pension cash-out or refund do you need?" />
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-400 bg-white p-8">
            <p className="text-lg font-semibold text-brand">Quick answer</p>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Start with the wording on your pension document.
            </p>
            <div className="mt-6">
              <CheckList
                items={[
                  'If it shows bAV, betriebliche Altersversorgung, Direktversicherung, Pensionskasse, Pensionsfonds, Unterstützungskasse or the name of an insurance or pension provider, you usually need a company pension cash-out check.',
                  'If it shows VBL, VBLklassik, ZVK or Zusatzversorgungskasse, you may need a public-sector contribution refund check.',
                  'If it shows VddB, VddKO, Bühnenversorgung or Orchesterversorgung, you may need a stage or orchestra pension refund check.',
                  'If it shows DRV or Deutsche Rentenversicherung, it belongs to the German statutory pension system. A DRV refund is separate and does not include your company pension.',
                ]}
              />
            </div>
            <p className="mt-6 text-base leading-relaxed text-gray-600">
              CompanyPension uses your document, provider name and answers to
              route you into the relevant online process.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ArrowLink href={START_HREF}>Start your claim</ArrowLink>
              <OutlineLink href={HOW_HREF}>
                Learn how the process works
              </OutlineLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---- MAIN CLAIM TYPES / ROUTE CHOOSER (Figma 1273:6715) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Main claim types"
              title="Choose the route that matches your pension document"
              body="You do not need to understand the legal structure of your pension before starting. Choose the closest match or upload your document and let the platform identify the route."
            />
          </div>
          <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-3">
            <RouteCard
              number="1"
              title="bAV and company pension cash-outs"
              intro="For employer-based pensions such as:"
              bullets={[
                'Direktversicherung',
                'Pensionskasse',
                'Pensionsfonds',
                'Unterstützungskasse',
                'Direktzusage',
                'Entgeltumwandlung',
                'Provider-based company pensions',
              ]}
              note="These cases are checked for a possible one-time payout or lump-sum settlement."
            >
              <ArrowLink href={COMPANY_CASH_OUT}>
                Open company pension cash-out
              </ArrowLink>
            </RouteCard>

            {/* DESIGN NOTE: card 2 is titled "VBL and ZVK refunds" but its two
                button instances read "Start my bAV cash-out" and "Compare
                company pension and DRV" (Figma 1275:6925 / 1275:6927) — a copy
                mismatch in the design. Verbatim labels kept; hrefs wired by
                label. The VBL and ZVK routes themselves are linked from the
                public-sector section below ("Check my VBL refund" / "Check my
                ZVK refund"). */}
            <RouteCard
              number="2"
              title="VBL and ZVK refunds"
              intro="For public-sector supplementary pensions connected to universities, public hospitals, research institutions, municipalities and other public employers."
              note="These are generally contribution-refund cases rather than bAV cash-outs."
            >
              <ArrowLink href={COMPANY_CASH_OUT}>
                Start my bAV cash-out
              </ArrowLink>
              <OutlineLink href={COMPANY_VS_DRV}>
                Compare company pension and DRV
              </OutlineLink>
            </RouteCard>

            <RouteCard
              number="3"
              title="VddB and VddKO refunds"
              intro="For pension contributions connected to German stage, theatre, opera, dance or orchestra employment."
              note="These refund routes have their own contribution-period and waiting-period rules."
            >
              <ArrowLink href={VDDB_REFUND}>
                Open VddB and VddKO refunds
              </ArrowLink>
            </RouteCard>
          </div>

          {/* ---- MAIN CLAIM TYPES TABLE (Figma 1287:821) ---- */}
          <div className="mt-14">
            <ComparisonTable
              caption="Main claim types by document wording"
              columns={[
                'Wording on your document',
                'What it usually means',
                'Best next step',
              ]}
              rows={[
                {
                  label:
                    'bAV, betriebliche Altersversorgung, Entgeltumwandlung',
                  values: [
                    'A German employer or company pension',
                    'Start a bAV cash-out check',
                  ],
                },
                {
                  label:
                    'Direktversicherung, Pensionskasse, Pensionsfonds, Unterstützungskasse',
                  values: [
                    'Different ways a bAV may be arranged',
                    'Start a bAV cash-out check',
                  ],
                },
                {
                  label:
                    'Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI,BVV',
                  values: [
                    'A provider or pension institution that may administer a bAV',
                    'Start with the provider document',
                  ],
                },
                {
                  label: 'VBL, VBLklassik, ZVK, Zusatzversorgungskasse',
                  values: [
                    'Public-sector company pension schemes',
                    'Start a VBL or ZVK refund check',
                  ],
                },
                {
                  label: 'VddB, VddKO, Bühnenversorgung, Orchesterversorgung',
                  values: [
                    'Stage, theatre, opera or orchestra pension institutions',
                    'Start a VddB or VddKO refund check',
                  ],
                },
                {
                  label: 'DRV, Deutsche Rentenversicherung',
                  values: [
                    'Germany’s statutory state pension system',
                    'Use the separate DRV refund process',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- bAV CASH-OUTS (Figma 1279:238) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="bAV cash-outs"
                title="Cash out your bAV or German company pension"
                body="A bAV is a German company pension arranged through an employer. You may not see the word “bAV” clearly on your pension documents. Instead, the document may show a contract type, pension institution or insurance provider."
              />
              <div className="mt-8">
                <ArrowLink href={COMPANY_CASH_OUT}>
                  Check my bAV cash-out
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                Common bAV wording
              </p>
              <p className="mt-3 text-base text-gray-600">
                Your document may mention:
              </p>
              <div className="mt-5">
                <TermChips
                  terms={[
                    'betriebliche Altersversorgung',
                    'bAV',
                    'Entgeltumwandlung',
                    'Direktversicherung',
                    'Pensionskasse',
                    'Pensionsfonds',
                    'Unterstützungskasse',
                    'Direktzusage',
                    'employer pension',
                    'company pension',
                    'Abfindung',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                Direktversicherung, Pensionskasse, Pensionsfonds,
                Unterstützungskasse and Direktzusage are different ways a bAV
                may be arranged. They are not separate from bAV.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-12 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Can the pension be paid out early?
              </h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Possibly. Leaving your employer or leaving Germany does not
                automatically create a right to cash out the pension.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                A one-time payout may be possible depending on:
              </p>
              <div className="mt-5">
                <CheckList
                  items={[
                    'The type of bAV',
                    'Whether the entitlement is vested',
                    'The monthly pension or capital value',
                    'The employer and pension provider',
                    'The contract terms',
                    'Whether a permitted lump-sum settlement route applies',
                    'Whether your statutory German pension contributions have already been refunded',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  Small company pensions can sometimes be settled under the
                  small-benefit rules.
                </InfoNote>
              </div>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                For a larger vested bAV entitlement, an approved DRV refund can
                create the basis for requesting a separate lump-sum settlement
                under §3(3) BetrAVG.
              </p>
              <p>
                The DRV refund does not include or automatically pay out the
                bAV. A separate company pension request is still required.
              </p>
              <p>
                People often search for this as “cancel my bAV” or “cancel my
                German company pension.” In practice, the relevant process is
                usually a company pension cash-out or lump-sum settlement rather
                than a refund of contributions.
              </p>
              <InfoNote>
                Not sure whether your document shows a Direktversicherung,
                Pensionskasse or another bAV arrangement? Upload the document or
                enter the wording manually when starting your claim.
              </InfoNote>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <ArrowLink href={COMPANY_CASH_OUT}>
                  Check my bAV cash-out
                </ArrowLink>
                <OutlineLink href={COMPANY_CASH_OUT}>
                  Open the complete company pension cash-out guide
                </OutlineLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PROVIDER-BASED COMPANY PENSIONS (Figma 1289:758) ----
          ASSET_PENDING / route-pending: provider-specific cash-out pages
          (Allianz, AXA, …) do not exist in this wave. Each "Open … bAV
          cash-out" link resolves to the general company-pension cash-out
          route. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Provider-based company pensions"
              title="Start with the provider name on your pension document"
              body="Many users do not recognise their pension as a bAV. They recognise only the provider name shown on a statement, policy or employer document."
            />
            <div className="mx-auto mt-6 max-w-3xl space-y-3 text-base leading-relaxed text-gray-600">
              <p>
                A pension administered by an insurance company or pension
                institution may still be a bAV connected to a previous German
                employer.
              </p>
              <p>
                The provider name helps identify the relevant document and
                cash-out route. It does not by itself determine whether a
                cash-out is possible.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Allianz bAV cash-out',
                body: 'For company pension documents administered by Allianz, including supported Direktversicherung, Pensionskasse and Pensionsfonds documents.',
                cta: 'Open Allianz bAV cash-out',
              },
              {
                title: 'AXA bAV cash-out',
                body: 'For company pension documents administered by AXA or connected pension entities.',
                cta: 'Open AXA bAV cash-out',
              },
              {
                title: 'Swiss Life bAV cash-out',
                body: 'For company pension documents administered by Swiss Life or connected pension institutions.',
                cta: 'Open Swiss Life bAV cash-out',
              },
              {
                title: 'ERGO bAV cash-out',
                body: 'For company pension documents administered by ERGO or older connected provider entities.',
                cta: 'Open ERGO bAV cash-out',
              },
              {
                title: 'R+V bAV cash-out',
                body: 'For company pension documents administered by R+V or supported connected pension arrangements.',
                cta: 'Open R+V bAV cash-out',
              },
              {
                title: 'Nürnberger bAV cash-out',
                body: 'For German employer-pension documents administered by Nürnberger.',
                cta: 'Open Nürnberger bAV cash-out',
              },
              {
                title: 'HDI bAV cash-out',
                body: 'For German company pension documents administered by HDI or connected pension providers.',
                cta: 'Open HDI bAV cash-out',
              },
              {
                title: 'BVV cash-out',
                body: 'For company pension documents connected to German banking or financial-sector employment.',
                cta: 'Open BVV cash-out',
              },
            ].map((provider) => (
              <div
                key={provider.title}
                className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-brand">
                  {provider.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-gray-600">
                  {provider.body}
                </p>
                <div className="mt-6 flex flex-1 items-end">
                  <Link
                    href={COMPANY_CASH_OUT}
                    className="inline-flex items-center gap-2 text-base font-semibold text-brand hover:underline"
                  >
                    {provider.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8 text-center">
            <p className="text-lg font-semibold text-brand">
              Your provider is not listed?
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Upload the pension document or enter the provider name manually.
              The platform uses the available information to identify the
              relevant bAV route.
            </p>
            <div className="mt-6 flex justify-center">
              <ArrowLink href={START_HREF}>
                Start with my provider document
              </ArrowLink>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-gray-500">
              Whether a cash-out may be possible still depends on the pension
              arrangement, current value, vesting status, employer involvement
              and available settlement route.
            </p>
          </div>
        </div>
      </section>

      {/* ---- CASH-OUT VS REFUND (Figma 1312:250) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Cash-out or refund"
              title="What is the difference between a cash-out and a refund?"
              body="People often use “refund” to mean getting pension money back. The correct process depends on the pension type."
            />
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
              The outcome may sound similar—receiving pension money after
              leaving employment—but the legal basis, documents and application
              flow are different.
            </p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Company pension cash-out
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                A cash-out means requesting a one-time payout or lump-sum
                settlement of a bAV entitlement.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                This usually applies to:
              </p>
              <div className="mt-4">
                <TermChips
                  terms={[
                    'bAV',
                    'Direktversicherung',
                    'Pensionskasse',
                    'Pensionsfonds',
                    'Unterstützungskasse',
                    'BVV and other provider-based company pensions',
                    'Abfindung',
                    'One-time payout',
                  ]}
                />
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={START_HREF}>Start a cash-out check</ArrowLink>
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Company pension refund
              </h3>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                A refund means applying to get eligible employee contributions
                back from a contribution-based pension scheme.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                This usually applies to:
              </p>
              <div className="mt-4">
                <TermChips
                  terms={['VBL', 'ZVK', 'VddB', 'VddKO', 'Beitragserstattung']}
                />
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={START_HREF}>Start a refund check</ArrowLink>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-gray-500">
            People also search for this as “cancel my bAV” or “cancel my German
            company pension.” In practice, the relevant process is usually a
            cash-out or lump-sum settlement rather than a refund of
            contributions.
          </p>
        </div>
      </section>

      {/* ---- bAV AFTER LEAVING GERMANY (Figma 1312:335) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="bAV cash-outs"
                title="Can you cash out your bAV after leaving Germany?"
                body="Possibly."
              />
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A bAV is a German company pension connected to an employer.
                Leaving the employer or leaving Germany does not automatically
                create a right to cash it out.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href={COMPANY_CASH_OUT}>
                  Check my bAV cash-out
                </ArrowLink>
                <OutlineLink href={COMPANY_CASH_OUT}>
                  Read the full company pension cash-out guide
                </OutlineLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-base font-semibold text-brand">
                A one-time payout may nevertheless be possible depending on:
              </p>
              <div className="mt-5">
                <CheckList
                  items={[
                    'The type of pension arrangement',
                    'Whether the entitlement is vested',
                    'The monthly pension or capital value',
                    'The employer and provider',
                    'The contract terms',
                    'Whether a permitted settlement route applies',
                    'Whether your German state pension contributions have already been refunded',
                  ]}
                />
              </div>
              <div className="mt-6 space-y-3 text-sm leading-relaxed text-gray-600">
                <p>
                  Small company pensions can sometimes be settled under the
                  small-benefit rules.
                </p>
                <p>
                  For a larger vested bAV entitlement, an approved DRV refund
                  can create the basis for requesting a separate lump-sum
                  settlement under §3(3) BetrAVG.
                </p>
                <p>
                  The company pension is not included in the DRV refund. A
                  separate bAV request is still required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PUBLIC-SECTOR VBL / ZVK (Figma 1316:442) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Public-sector pensions"
              title="Can you get VBL or ZVK contributions back?"
              body="Possibly. VBL and ZVK are supplementary pension schemes for many German public-sector employees. A refund may be possible where the relevant pension rights have not become vested and the scheme-specific refund rules are met."
            />
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">VBL</h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>
                  Eligible employee contributions paid into VBLklassik in VBL
                  West / Abrechnungsverband West may be refundable.
                </p>
                <p>
                  Contributions paid into VBL East / Abrechnungsverband Ost are
                  generally not refundable. VBLextra contributions are also not
                  refundable.
                </p>
                <p>
                  Earlier VBL or recognised ZVK periods may affect whether the
                  waiting period has been fulfilled.
                </p>
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={VBL_REFUND}>Check my VBL refund</ArrowLink>
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">ZVK</h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>ZVK rules depend on the relevant Zusatzversorgungskasse.</p>
                <p>
                  The scheme reviews contribution periods, statutory vesting,
                  earlier public-sector pension periods and its own refund
                  rules.
                </p>
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={ZVK_REFUND}>Check my ZVK refund</ArrowLink>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            VBL and ZVK refunds generally concern eligible employee
            contributions. Employer-paid amounts are not refunded to the
            employee.
          </p>
        </div>
      </section>

      {/* ---- VddB / VddKO (Figma 1318:559) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Stage and orchestra pensions"
                title="Can you get a VddB or VddKO refund?"
                body="A refund may be possible if you paid into one of the German stage or orchestra pension institutions and later left the relevant employment."
              />
              <div className="mt-8">
                <ArrowLink href={VDDB_REFUND}>
                  Check my VddB or VddKO refund
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-base font-semibold text-brand">
                The standard online check considers whether:
              </p>
              <div className="mt-5">
                <CheckList
                  items={[
                    'You completed at least 12 contribution months',
                    'You completed no more than 35 contribution months',
                    'The applicable waiting period after the last contribution has passed',
                    'The recorded employment and contribution periods meet the institution’s rules',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  These are separate from a DRV refund and require their own
                  application.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DRV IS SEPARATE (Figma 1318:743 / 1320:929) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="DRV and company pensions"
              title="A DRV refund is separate—but it can affect a bAV cash-out"
              body="A German state pension refund covers statutory pension contributions paid into Deutsche Rentenversicherung."
            />
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <p className="text-base font-semibold text-brand">
              Your documents may use terms such as:
            </p>
            <div className="mt-5">
              <TermChips
                terms={[
                  'bAV',
                  'Direktversicherung',
                  'Pensionskasse',
                  'Pensionsfonds',
                  'Unterstützungskasse',
                  'BVV',
                  'VBL',
                  'ZVK',
                  'VddB',
                  'VddKO',
                ]}
              />
            </div>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Already received your DRV refund?
              </h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>
                  Your company pension still requires a separate cash-out or
                  refund process.
                </p>
                <p>
                  For a larger vested bAV, proof of the approved DRV refund can
                  create the basis for requesting a lump-sum settlement under
                  §3(3) BetrAVG.
                </p>
                <p>
                  Upload the DRV refund decision together with the bAV document
                  when starting the cash-out flow.
                </p>
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <ArrowLink href={COMPANY_CASH_OUT}>
                  Start my bAV cash-out
                </ArrowLink>
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                Have not claimed your DRV refund yet?
              </h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>
                  If your bAV is vested and above the small-benefit threshold,
                  an approved DRV refund may be required before a separate
                  lump-sum settlement can be requested.
                </p>
                <p>
                  DRV refund eligibility follows different rules, including
                  nationality, current residence, contribution history and the
                  applicable waiting period.
                </p>
              </div>
              {/* route-pending: "Check my DRV refund eligibility" (Figma
                  1320:1008) targets Germany Pension Refund, a separate ATLAES
                  service with no route in this build — rendered as a note, not
                  a link, to avoid a dead CTA. */}
              <div className="mt-6">
                <InfoNote>
                  <p className="font-semibold text-brand">
                    Check my DRV refund eligibility
                  </p>
                  <p className="mt-1">
                    Germany Pension Refund is a separate service operated by
                    ATLAES GmbH.
                  </p>
                  <p className="mt-1">
                    A DRV refund does not automatically cash out a company
                    pension. The employer or pension provider still reviews the
                    individual pension arrangement and makes the final decision.
                  </p>
                </InfoNote>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <OutlineLink href={COMPANY_VS_DRV}>
                  Compare company pension and DRV
                </OutlineLink>
                <OutlineLink href={VBL_VS_DRV}>Compare VBL and DRV</OutlineLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DIGITAL BY DESIGN (Figma 1318:659) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Digital by design"
              title="Upload your pension document instead of decoding it yourself"
              body="CompanyPension is built around the documents users already have."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Automated document recognition"
              body={
                <div className="space-y-4">
                  <p>
                    Upload a provider statement, bAV contract, VBL letter, ZVK
                    document or other supported pension document.
                  </p>
                  <p>
                    OCR and automated data extraction can identify information
                    such as:
                  </p>
                  <CheckList
                    items={[
                      'Provider or scheme',
                      'Pension type',
                      'Insurance or contract number',
                      'Employer',
                      'Relevant dates',
                      'Recorded values',
                    ]}
                  />
                  <p>You review and correct every extracted detail.</p>
                </div>
              }
            />
            <StepCard
              number="02"
              title="Questions adapted to your pension"
              body="The platform changes the questions and document requirements according to the identified pension type and your answers."
            />
            <StepCard
              number="03"
              title="Automated completeness checks"
              body="The platform checks for missing information, inconsistent answers and documents that may still be required before signing."
            />
            <StepCard
              number="04"
              title="Human oversight when needed"
              body={
                <div className="space-y-3">
                  <p>Most standard steps run digitally and automatically.</p>
                  <p>
                    Human support is added when a document cannot be read
                    reliably or provider correspondence needs clarification or
                    translation.
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ---- THE DIGITAL PROCESS — 5 STEPS (Figma 1320:1028) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="The digital process"
              title="Complete your cash-out or refund online in five steps"
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Check which process applies"
              body="Upload a pension document or answer guided questions. The platform identifies whether your case belongs to a bAV cash-out, VBL or ZVK refund, or VddB or VddKO refund."
            />
            <StepCard
              number="02"
              title="Secure your claim"
              body="If your case may be possible, create your secure account, review the pricing and pay the €199 deposit to activate the full process. Your deposit is credited toward your final service fee."
            />
            <StepCard
              number="03"
              title="Complete your details"
              body="Upload your ID and any additional pension, employment or bank documents. Add or confirm the information shown in your secure account."
            />
            <StepCard
              number="04"
              title="Review, sign and submit digitally"
              body="Review the completed application, correct anything necessary and sign it yourself online. After signing, the application is technically transmitted to the relevant employer, provider, pension scheme or institution through the CompanyPension platform. You remain the applicant and claimant."
            />
            <StepCard
              number="05"
              title="Receive approved money and pay the remaining fee"
              body="The provider, scheme or institution reviews the application and makes the final decision. Where authorised, correspondence and requests for additional information can be displayed through your secure account. If approved, the money is paid directly to the bank account you provide. Your €199 deposit is credited toward the 9.75% success fee, and only the remaining service fee becomes due. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
          <div className="mt-12 flex flex-col justify-center gap-3 sm:flex-row">
            <ArrowLink href={START_HREF}>Start your claim</ArrowLink>
            <OutlineLink href={HOW_HREF}>
              See how CompanyPension works
            </OutlineLink>
          </div>
        </div>
      </section>

      {/* ---- BEFORE YOU START (Figma 1320:1117) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Before you start"
              title="Documents, bank accounts and processing time"
            />
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {/* 01 — documents */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <span className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">
                01
              </span>
              <h3 className="mt-6 text-xl font-semibold text-brand">
                What documents do you need?
              </h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                You can usually start with one pension document.
              </p>
              <p className="mt-6 text-base font-semibold text-brand">
                Useful documents include:
              </p>
              <div className="mt-4">
                <CheckList
                  items={[
                    'bAV contract or provider statement',
                    'Direktversicherung document',
                    'Pensionskasse or Pensionsfonds letter',
                    'VBL or ZVK statement',
                    'VddB or VddKO document',
                    'Employer pension agreement',
                    'Old payslip showing pension deductions',
                    'DRV refund decision, where relevant',
                    'Passport or ID',
                    'Bank details',
                  ]}
                />
              </div>
              <p className="mt-6 text-sm leading-relaxed text-gray-600">
                You do not need every document before starting. The platform
                shows what is still missing.
              </p>
              <div className="mt-6 flex flex-1 items-end">
                <OutlineLink href={GUIDE_HREF}>
                  Open the documents guide
                </OutlineLink>
              </div>
            </div>

            {/* 02 — bank account */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <span className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">
                02
              </span>
              <h3 className="mt-6 text-xl font-semibold text-brand">
                Do you need a German bank account?
              </h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>A German bank account is not required in most cases.</p>
                {/* COPY-GOVERNANCE (client item 19): design reads "a suitable
                    free EUR account"; the word "free" is dropped per the
                    established EUR-account transformation (commit 1236ccf). */}
                <p>
                  Some refund routes require a SEPA-capable EUR account. If
                  needed, CompanyPension can help you open a suitable EUR
                  account.
                </p>
                <p>
                  A bAV cash-out may also be payable to an international
                  account, depending on the provider.
                </p>
              </div>
              <div className="mt-6 flex flex-1 items-end">
                <OutlineLink href={GUIDE_HREF}>
                  Read the bank-account guide
                </OutlineLink>
              </div>
            </div>

            {/* 03 — processing time */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <span className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">
                03
              </span>
              <h3 className="mt-6 text-xl font-semibold text-brand">
                How long does it take?
              </h3>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
                <p>
                  Processing starts after the signed application has been
                  submitted.
                </p>
                <p>
                  Many straightforward contribution-refund cases may be
                  completed within approximately 4 to 12 weeks.
                </p>
                <p>
                  bAV cash-outs can take longer when employer involvement,
                  provider review or health insurance confirmation is required.
                </p>
                <p>
                  The provider or pension institution controls the final
                  processing time.
                </p>
              </div>
              <div className="mt-6 flex flex-1 items-end">
                <OutlineLink href={GUIDE_HREF}>
                  Read the processing-time guide
                </OutlineLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHICH PROCESS FITS YOUR DOCUMENT (Figma 1322:146) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="Which process fits your document?"
              body="Use the wording on your pension document to find the most likely cash-out or refund route."
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="Which process fits your document"
              columns={[
                'Document wording',
                'What it usually means',
                'Best next step',
              ]}
              rows={[
                {
                  label: 'bAV betriebliche Altersversorgung Entgeltumwandlung',
                  values: [
                    'A German employer/company pension.',
                    'Start a bAV cash-out check.',
                  ],
                },
                {
                  label:
                    'Direktversicherung Pensionskasse Pensionsfonds Unterstützungskasse',
                  values: [
                    'bAV setups or contract types.',
                    'Start a bAV cash-out check.',
                  ],
                },
                {
                  label:
                    'Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another provider',
                  values: [
                    'A provider or pension institution that may hold a bAV or company pension.',
                    'Start with the provider document.',
                  ],
                },
                {
                  label: 'VBL, VBLklassik, ZVK, Zusatzversorgungskasse',
                  values: [
                    'Public-sector company pension schemes, usually handled as contribution refund cases.',
                    'Start a VBL or ZVK refund check.',
                  ],
                },
                {
                  label: 'VddB, VddKO, Bühnenversorgung, Orchesterversorgung',
                  values: [
                    'Stage, theatre, opera or orchestra pension institutions, usually handled as refund cases.',
                    'Compare company pension vs DRV.',
                  ],
                },
                {
                  label: 'DRV, Deutsche Rentenversicherung',
                  values: [
                    'Germany’s statutory state pension system. A DRV refund does not include company pensions.',
                    'Compare company pension vs DRV.',
                  ],
                },
              ]}
            />
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            Not sure which route applies? Upload your pension document or enter
            the provider or scheme name. The platform uses the available
            information to guide you into the relevant process.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ArrowLink href={START_HREF}>Start your claim</ArrowLink>
            <OutlineLink href={HOW_HREF}>
              Learn how the process works
            </OutlineLink>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1322:790) — answers from the shared FAQ master copy via faqItems.tsx (FAQ CompanyPension 22062026.pdf) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="German company pension cash-outs and refunds: common questions"
            />
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion
              items={[
                FAQ.whatIsRefund,
                FAQ.refundVsCashout,
                FAQ.cashOutAfterLeaving,
                FAQ.howMuch,
                FAQ.howLong,
                FAQ.howMuchCost,
              ]}
              defaultOpenIndex={0}
            />
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

      {/* ---- GLOSSARY / KEY TERMS (Figma 1323:125) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Key terms"
              title="Company pension cash-out and refund terms explained"
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="bAV"
              body="Short for betriebliche Altersversorgung. The German term for an occupational or company pension."
            />
            <GlossaryCard
              term="Refund"
              body="A reimbursement of eligible employee contributions from a contribution-based pension scheme."
            />
            <GlossaryCard
              term="VBL and ZVK"
              body="Public-sector supplementary pension schemes. Eligible cases are normally handled as contribution refunds."
            />
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory pension system. A DRV refund is separate from company pensions."
            />
            <GlossaryCard
              term="VddB and VddKO"
              body="Pension institutions for German stage, theatre, opera, dance and orchestra employment."
            />
            <GlossaryCard
              term="Abfindung"
              body="The German term commonly used for a lump-sum settlement of a pension entitlement."
            />
            <GlossaryCard
              term="Pensionskasse and Pensionsfonds"
              body="Other ways in which a German employer may arrange a bAV."
            />
            <GlossaryCard
              term="Cash-out"
              body="A request to settle or pay out a bAV entitlement as a one-time amount."
            />
            <GlossaryCard
              term="Direktversicherung"
              body="A common insurance-based bAV arrangement created through an employer."
            />
            <GlossaryCard
              term="Unterstützungskasse"
              body="A support-fund structure used for some German company pensions."
            />
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1331:6033) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Pricing"
              title="Simple pricing for cash-outs and refunds"
              body="Every supported process starts with a €199 deposit."
            />
          </div>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <p className="text-lg font-semibold text-brand">If approved:</p>
            <div className="mt-5">
              <CheckList
                items={[
                  'The success fee is 9.75% of the approved amount',
                  'The minimum total service fee is €199',
                  'The €199 deposit is credited toward the final service fee',
                  'Only the remaining difference becomes due',
                ]}
              />
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* bAV cash-out pricing */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                bAV and company pension cash-outs
              </h3>
              <div className="mt-5 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-brand">
                  €199 deposit
                </span>
                <span className="text-sm text-gray-600">
                  (credited toward the final fee)
                </span>
              </div>
              <p className="mt-2 text-base font-semibold text-brand">
                + 9.75% success fee if approved
              </p>
              <div className="mt-6 rounded-2xl bg-neutral-50 p-6">
                <p className="text-base font-semibold text-brand">
                  Deposit rule:
                </p>
                <p className="mt-2 text-base leading-relaxed text-gray-600">
                  If the cash-out cannot be submitted after the digital case and
                  document review:
                </p>
                <div className="mt-4">
                  <CheckList items={['€79 is retained', '€120 is refunded']} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  The retained amount covers the secure claim setup, document
                  extraction and case review.
                </p>
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <Link
                  href={COMPANY_CASH_OUT}
                  className="block w-full rounded-brand bg-accent px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
                >
                  Start my bAV cash-out
                </Link>
              </div>
            </div>

            {/* refund pricing */}
            <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <h3 className="text-xl font-semibold text-brand">
                VBL, ZVK, VddB and VddKO refunds
              </h3>
              <div className="mt-5 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-brand">
                  €199 deposit
                </span>
              </div>
              <p className="mt-2 text-base font-semibold text-brand">
                + 9.75% success fee if approved
              </p>
              <div className="mt-6 rounded-2xl bg-neutral-50 p-6">
                <p className="text-base font-semibold text-brand">
                  Deposit rule:
                </p>
                <p className="mt-2 text-base leading-relaxed text-gray-600">
                  If the pension institution rejects a completed and submitted
                  refund request, the €199 deposit is refunded in full.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  This is different from abandoning the process or leaving the
                  application incomplete.
                </p>
              </div>
              <div className="mt-8 flex flex-1 items-end">
                <Link
                  href={START_HREF}
                  className="block w-full rounded-brand bg-accent px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
                >
                  Start my refund
                </Link>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-gray-500">
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
          <div className="mt-8 flex justify-center">
            <OutlineLink href={PRICING_HREF}>View full pricing</OutlineLink>
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION (Figma 1322:871) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          A digital application platform—not a pension advisor or claims agent
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            CompanyPension is a brand and digital application platform operated
            by ATLAES GmbH.
          </li>
          <li>
            The platform prepares the relevant application from the documents
            and information you provide.
          </li>
          <li>
            You review and sign the application yourself and remain the
            applicant and claimant throughout the process.
          </li>
          <li>
            After signing, the application is technically transmitted to the
            relevant employer, provider, pension scheme or institution through
            the CompanyPension platform.
          </li>
        </ul>

        <p className="mt-8 text-base font-semibold text-brand">
          You may give ATLAES GmbH limited authorization to:
        </p>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
          <li>Receive and forward relevant provider correspondence</li>
          <li>Receive information about the final decision</li>
          <li>Receive information about the approved amount</li>
        </ul>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          This allows the platform to display follow-up requests and calculate
          the agreed service fee.
        </p>
        <p className="mt-2 text-base leading-relaxed text-gray-600">
          The authorization does not make ATLAES GmbH the applicant or claimant.
        </p>

        <p className="mt-8 text-base font-semibold text-brand">
          CompanyPension does not:
        </p>
        <ul className="mt-4 space-y-3 text-base leading-relaxed text-gray-600">
          <li>Decide whether a cash-out or refund is approved</li>
          <li>Provide pension advice</li>
          <li>Provide legal or tax advice</li>
          <li>Provide financial advice</li>
          <li>Provide insurance advice or brokerage</li>
          <li>Assess or argue your legal position</li>
          <li>Receive, hold or forward approved pension money</li>
        </ul>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          The employer, provider, pension scheme or institution makes the final
          decision.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If separate legal services are needed for an individual case, they are
          provided by the responsible legal partner under a separate
          arrangement.
        </div>

        {/* ---- SOURCE BASIS (Figma 1325:496) ---- */}
        <div className="mt-10 border-t border-brand/15 pt-8">
          <h3 className="text-xl font-semibold text-brand">Source basis</h3>
          <ul className="mt-5 space-y-3 text-base leading-relaxed text-gray-600">
            <li>
              German company pension cash-outs and refunds must be separated
              according to the pension type.
            </li>
            <li>
              bAV and provider-based company pensions are generally checked as
              cash-out or lump-sum settlement cases.
            </li>
            <li>
              VBL, ZVK, VddB and VddKO are generally handled as
              contribution-refund cases under their own scheme rules.
            </li>
            <li>
              A DRV refund applies only to statutory pension contributions and
              does not include company pensions.
            </li>
            <li>
              An approved DRV refund can create the basis for requesting
              settlement of a vested bAV under §3(3) BetrAVG.
            </li>
            <li>
              This page provides general information and does not replace
              individual legal, pension, tax, insurance or financial advice.
            </li>
          </ul>
          {/* PUBLICATION_PENDING: review metadata are placeholders in the design
              (Figma 1325:507 / 1325:517) — kept verbatim until the client
              supplies the review date and reviewer. */}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Last reviewed
              </dt>
              <dd className="mt-1 text-base text-gray-600">
                [Add actual review date]
              </dd>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reviewed by
              </dt>
              <dd className="mt-1 text-base text-gray-600">
                [Add reviewer name and role]
              </dd>
            </div>
          </dl>
        </div>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1328:93) ---- */}
      <CtaBand
        eyebrow="Start online"
        title="Ready to check your German company pension?"
        body="Upload your bAV document, provider statement, VBL or ZVK letter, or VddB or VddKO document. The platform identifies the relevant cash-out or refund route and shows what information is still needed."
        cta={{ label: 'Start your claim', href: START_HREF }}
        secondaryCta={{ label: 'Calculate my refund', href: CALC_HREF }}
        note="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
      />
    </>
  );
}
