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

// Funnel entry CTAs route to the claim flow; calculator/estimate CTAs to
// /calculator. Cross-page links route to the sibling marketing routes named
// after their Figma export slugs.
const START_HREF = '/get-started';
const CALC_HREF = '/calculator';
const PRICING_HREF = '/pricing';
const FAQ_HREF = '/faq';
const DRV_HREF = '/company-pension-vs-drv';
const CASHOUTS_HREF = '/cash-outs-and-refunds';
const VBL_HREF = '/vbl-refund';
const VDDB_HREF = '/vddb-vddko-refund';
const CASHOUT_HREF = '/company-pension-cash-out';

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

/** Cross-link card used in the "Related pages" grid. */
function RelatedCard({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-6">
      <h3 className="text-lg font-semibold text-brand">{title}</h3>
      <p className="mt-3 flex-1 text-base leading-relaxed text-gray-600">
        {body}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-brand hover:text-brand/80"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/**
 * Token-colored placeholder panel standing in for a Figma illustration that is
 * not available on disk. Each usage carries an ASSET_PENDING comment naming the
 * source node so the asset can be dropped in later.
 */
function AssetPanel() {
  return (
    <div
      aria-hidden="true"
      className="hidden min-h-[420px] rounded-2xl border border-neutral-400 bg-neutral-50 lg:block"
    />
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1108:95 — "ZVK Refunds CompanyPension 12052026")
// Copy is verbatim from the design XML; casing preserved exactly.
// ---------------------------------------------------------------------------

export default function ZvkRefundPage() {
  return (
    <>
      {/* ---- HERO (Figma 1108:155) ---- */}
      <Hero
        eyebrow="ZVK REFUND"
        title="Claim your ZVK refund online"
        body="For Zusatzversorgungskasse refunds after public-sector, municipal, church, hospital, university or similar employment in Germany. Start online with your ZVK document, follow clear steps, review, sign and submit online where possible."
        primaryCta={{ label: 'Start My ZVK Refund', href: START_HREF }}
        secondaryCta={{ label: 'Estimate a Refund', href: CALC_HREF }}
        footnote={
          <p>
            If approved, the refund is paid directly to the bank account you
            provide. CompanyPension does not receive or hold your pension money.
          </p>
        }
      />

      {/* ---- IMPORTANT CALLOUT (Figma 1108:526) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          A ZVK refund is separate from a DRV refund and separate from bAV
          cash-outs.
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            A German state pension refund through Deutsche Rentenversicherung
            does not automatically refund your ZVK contributions.
          </li>
          <li>
            If you paid into a Zusatzversorgungskasse through a German employer,
            you may need a separate ZVK refund process.
          </li>
        </ul>
        <div className="mt-8 flex flex-col gap-3 text-base font-semibold text-brand sm:flex-row sm:gap-8">
          <Link href={DRV_HREF} className="inline-flex items-center gap-2">
            Already received your DRV refund? Compare Company Pension vs DRV.
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href={CASHOUTS_HREF} className="inline-flex items-center gap-2">
            Not sure what pension you have? See Cash-Outs &amp; Refunds.
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </ImportantCallout>

      {/* ---- CAN I GET A ZVK REFUND? (Figma 1108:542) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                QUICK ANSWER
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Can I get a ZVK refund after leaving Germany?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Possibly. If you worked for a German public-sector, municipal,
                church, healthcare, university or similar employer, you may have
                paid into a ZVK or Zusatzversorgungskasse.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A ZVK refund can be possible if the scheme-specific refund rules
                are met. In many ZVK systems, this usually depends on whether
                you left the supplementary pension scheme without reaching the
                required waiting period for a later pension. Several
                public-sector supplementary pension systems use a 60-month
                waiting-period framework, but the exact rule depends on the
                specific ZVK. For some newer ZVK cases, especially contribution
                periods from 2018 onward, a 36-month framework may be relevant
                instead.
              </p>
              <div className="mt-6">
                <InfoNote>
                  CompanyPension helps you check your ZVK refund online and
                  continue with the right digital process if your case can be
                  started
                </InfoNote>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href={START_HREF}>Start My ZVK Refund</ArrowLink>
                <OutlineLink href={CALC_HREF}>Estimate a Refund</OutlineLink>
              </div>
            </div>
            {/* ASSET_PENDING: 1108:1203 "image 845" — supporting illustration */}
            <AssetPanel />
          </div>
        </div>
      </section>

      {/* ---- WHAT IS ZVK? (Figma 1108:3834) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                WHAT ZVK IS
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What is ZVK?
              </h2>
              <p className="mt-5 text-lg font-semibold text-brand">
                ZVK usually stands for Zusatzversorgungskasse.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A Zusatzversorgungskasse is a supplementary pension scheme
                connected to certain German employers. You may see ZVK if you
                worked in the public sector, municipal sector, church sector,
                healthcare, education or another employer group that used a
                supplementary pension scheme.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Start With My ZVK Document
                </ArrowLink>
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                If your document says ZVK, Zusatzversorgung or
                Zusatzversorgungskasse, you are usually looking at a separate
                refund case — not a bAV cash-out.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                You may see ZVK on:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'ZVK pension letters',
                    'Zusatzversorgungskasse documents',
                    'annual statements',
                    'old payslips',
                    'employer documents',
                    'insurance or membership numbers',
                    'refund or contribution documents',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHO THIS PAGE IS FOR (Figma 1109:5227) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="WHO THIS PAGE IS FOR"
              title="This page is for users with ZVK documents"
              body="This page is for you if you worked in Germany and may have paid into a Zusatzversorgungskasse."
            />
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
            <p className="text-lg font-semibold text-brand">
              It is especially relevant if:
            </p>
            <div className="mt-6">
              <CheckList
                items={[
                  'you worked for a public-sector, municipal, church, healthcare, university or similar employer your documents mention ZVK, Zusatzversorgung, Zusatzversorgungskasse or a regional supplementary pension scheme',
                  'you left Germany and want to know whether your ZVK contributions can be refunded',
                  'you already received your DRV refund and want to check whether your ZVK pension is separate',
                  'you are not sure whether your document is ZVK, VBL, DRV, bAV, VddB or VddKO',
                  'you want a guided English online process instead of dealing with German pension forms yourself',
                ]}
              />
            </div>
            <div className="mt-6">
              <InfoNote>
                A ZVK refund is separate from your German state pension refund.
                You may need both processes.
              </InfoNote>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>Check My ZVK Refund</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT CAN BE REFUNDED? (Figma 1109:5264) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                ZVK REFUND BASICS
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What can be refunded?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A ZVK refund usually concerns eligible employee contributions or
                employee-paid parts of a supplementary pension scheme.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                The exact amount and eligibility depend on the specific ZVK, the
                scheme rules, your contribution periods and whether you already
                have or can still build a later pension entitlement.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start My ZVK Refund</ArrowLink>
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                CompanyPension guides you through the questions needed to check
                the right ZVK refund process.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                In plain English, the result can depend on:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'which Zusatzversorgungskasse you paid into',
                    'how many contribution or insurance months you have',
                    'whether you reached the waiting period for a later ZVK pension',
                    'whether you left the employer and the scheme',
                    'whether earlier contribution periods with another supplementary pension institution are recognised',
                    'whether the refund application is still allowed under the scheme rules',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WAITING PERIOD (Figma 1110:6621) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-base text-gray-600">
                For users, the practical question is simple:
              </p>
              <p className="mt-4 text-2xl font-bold tracking-tight text-brand sm:text-3xl">
                Did you leave the ZVK system before reaching the waiting period
                for a later pension?
              </p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                CompanyPension checks this through the online flow based on your
                ZVK documents, contribution periods and employer information.
              </p>
              <div className="mt-6">
                <InfoNote>
                  You do not need to calculate the waiting period yourself
                  before starting. Start with your ZVK document, and
                  CompanyPension will guide you through the right questions.
                </InfoNote>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <span className="mb-4 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                WAITING PERIOD
              </span>
              <p className="text-lg font-semibold text-brand">
                Does the 60-month rule matter for ZVK refunds?
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Often, yes. Many supplementary pension schemes use a waiting
                period for later pension entitlement. If the waiting period has
                already been fulfilled, a refund may no longer be available
                because the person may instead have a later pension entitlement.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                For many older ZVK cases, this waiting period is 60 months. For
                some newer contracts or contribution periods from 2018 onward, a
                shorter 36-month framework may apply, similar to the updated VBL
                rules. The exact rule depends on the specific
                Zusatzversorgungskasse and your contribution history
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check My ZVK Refund</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- IS ZVK THE SAME AS VBL? (Figma 1110:5961) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                ZVK VS VBL
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Is ZVK the same as VBL?
              </h2>
              <p className="mt-5 text-lg font-semibold text-brand">
                No. ZVK and VBL are not the same institution.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A bAV is a German company pension from an employer. bAV cases
                can involve contract types within bAV, such as
                Direktversicherung, Pensionskasse or Pensionsfonds, or
                provider-based pensions from institutions such as Allianz, AXA,
                Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or others.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                ZVK is a supplementary pension scheme. If a refund is possible,
                the process is usually about eligible contribution
                reimbursement, not a bAV lump-sum cash-out.
              </p>
              <div className="mt-6">
                <InfoNote>
                  Use the refund calculator for ZVK estimates. Use the cash-out
                  check for bAV, including Direktversicherung, Pensionskasse,
                  Pensionsfonds, BVV or other provider-based pensions.
                </InfoNote>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href={START_HREF}>Start My ZVK Refund</ArrowLink>
                <OutlineLink href={CALC_HREF}>Estimate a Refund</OutlineLink>
              </div>
            </div>
            {/* ASSET_PENDING: 1112:6694 "image 850" — supporting illustration */}
            <AssetPanel />
          </div>
        </div>
      </section>

      {/* ---- YOUR DRV REFUND DOES NOT INCLUDE ZVK (Figma 1113:6696) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                DRV VS ZVK
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Your DRV refund does not include ZVK
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A DRV refund only covers your German state pension contributions
                paid into Deutsche Rentenversicherung.
              </p>
              <p className="mt-4 text-lg font-semibold text-brand">
                It does not automatically refund your ZVK contributions.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start My ZVK Refund</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-base leading-relaxed text-gray-600">
                This is a common misunderstanding for expats who worked in
                Germany and paid into more than one pension system. You may
                receive a DRV refund and still have a separate ZVK refund to
                check.
              </p>
              <Link
                href={DRV_HREF}
                className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-brand hover:text-brand/80"
              >
                Compare Company Pension vs DRV
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CAN YOU ESTIMATE YOUR ZVK REFUND? (Figma 1113:7354) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                CALCULATOR
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Can you estimate your ZVK refund?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Yes. The CompanyPension refund calculator can support ZVK refund
                estimates if you have contribution information, employment
                dates, payslips or ZVK documents.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                The calculator gives an estimate only. The final refund amount
                and approval are confirmed by the relevant
                Zusatzversorgungskasse.
              </p>
              <div className="mt-6">
                <InfoNote>
                  If your document shows bAV, Direktversicherung, Pensionskasse,
                  Pensionsfonds, BVV or another provider-based company pension,
                  use the cash-out check instead of the refund calculator.
                </InfoNote>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href={CALC_HREF}>Estimate My ZVK Refund</ArrowLink>
                <OutlineLink href={CALC_HREF}>Estimate a Refund</OutlineLink>
              </div>
            </div>
            {/* ASSET_PENDING: 1114:8129 "image 853" — supporting illustration */}
            <AssetPanel />
          </div>
        </div>
      </section>

      {/* ---- A GUIDED ONLINE PROCESS / STEPS (Figma 1113:8025) ---- */}
      {/* ASSET_PENDING: 1113:8023 "image 851" — section illustration */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="HOW COMPANYPENSION HELPS"
              title="A guided online process for ZVK refunds"
              body="CompanyPension helps you start your ZVK refund process online. You start with your ZVK document, answer simple questions in English, sign online where required and continue without dealing with German pension paperwork yourself."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StepCard
              number="01"
              title="Choose ZVK"
              body="Start with the name shown on your document: ZVK, Zusatzversorgung or Zusatzversorgungskasse."
            />
            <StepCard
              number="02"
              title="Answer guided questions"
              body="The online flow asks for your employer information, contribution periods and ZVK details."
            />
            <StepCard
              number="03"
              title="Add your documents"
              body="Upload the ZVK letters, payslips or employer documents you have."
            />
            <StepCard
              number="04"
              title="Review and sign online"
              body="Check your details and sign online where required."
            />
            <StepCard
              number="05"
              title="ZVK follow-up runs through CompanyPension"
              body="Messages from the pension institution run through CompanyPension, with human oversight when clarification, translation or follow-up is needed"
            />
            <StepCard
              number="06"
              title="Receive approved funds directly"
              body="If approved, the refund is paid directly to the bank account you provide. CompanyPension does not receive or hold your pension money."
            />
          </div>
          <div className="mt-12 flex flex-col items-center gap-4">
            <ArrowLink href={START_HREF}>Start My ZVK Refund</ArrowLink>
            <p className="text-sm text-gray-600">
              CompanyPension does not receive or hold approved pension money.
            </p>
          </div>
        </div>
      </section>

      {/* ---- WHAT DOCUMENTS ARE NEEDED? (Figma 1117:127) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                DOCUMENTS
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What documents are usually needed?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                You can start with whatever documents you have. CompanyPension
                will show what is still missing during the online process.
              </p>
              <div className="mt-6">
                <InfoNote>
                  Do not worry if you do not have every document yet. Start with
                  what you have, and CompanyPension will show you what is still
                  missing.
                </InfoNote>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start With My Document</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                Helpful documents can include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'ZVK letters',
                    'Zusatzversorgungskasse documents',
                    'insurance or membership number',
                    'annual statements',
                    'old payslips showing supplementary pension contributions',
                    'employment contracts or employer confirmations',
                    'documents showing when your employment ended',
                    'bank details',
                    'passport or ID copy',
                    'DRV refund confirmation, if you already received a German state pension refund',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1117:172) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                PRICING
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Pricing for ZVK refunds
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                CompanyPension shows the relevant pricing before you continue
                into the full ZVK refund process.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Pricing for ZVK refund cases follows the refund pricing shown on
                our Pricing page, unless your case requires a different process.
                You will see the applicable pricing before you continue.
              </p>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                The approved refund is paid directly to the bank account you
                provide. CompanyPension does not receive or hold your pension
                money.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ArrowLink href={PRICING_HREF}>See Pricing</ArrowLink>
                <OutlineLink href={START_HREF}>Start My ZVK Refund</OutlineLink>
              </div>
            </div>
            {/* ASSET_PENDING: 1117:831 "image 849" — supporting illustration */}
            <AssetPanel />
          </div>
        </div>
      </section>

      {/* ---- ZVK/VBL/DRV/bAV COMPARISON TABLE (Figma 1118:832) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="ZVK, VBL, DRV and bAV — what is the difference?"
              body="German pension documents can be confusing. This table shows where ZVK fits."
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="ZVK, VBL, DRV and bAV — what is the difference?"
              columns={['Term', 'What it means', 'Best next step']}
              rows={[
                {
                  label: 'ZVK / Zusatzversorgungskasse',
                  values: [
                    'A supplementary pension scheme connected to certain public-sector, municipal, church, healthcare or similar employers.',
                    'Start a ZVK refund check.',
                  ],
                },
                {
                  label: 'VBL',
                  values: [
                    'A major public-sector supplementary pension institution, often connected to universities, research institutes, public hospitals and public employers.',
                    'Start a VBL refund check.',
                  ],
                },
                {
                  label: 'DRV',
                  values: [
                    'Germany’s statutory state pension system. A DRV refund does not include ZVK.',
                    'Use the separate DRV refund process or compare Company Pension vs DRV.',
                  ],
                },
                {
                  label: 'bAV',
                  values: [
                    'German company pension from an employer, ofte handled as a cash-out case.',
                    'Start a bAV cash-out check.',
                  ],
                },
                {
                  label: 'VddB / VddKO',
                  values: [
                    'Performing-arts pension institutions for stage, theatre, opera and orchestra employment.',
                    'Start a VddB or VddKO refund check.',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- RELATED PAGES (Figma 1118:2357) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Related pages"
              title="Not sure which page you need?"
              body="Use these pages if you already know your provider, scheme or question."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RelatedCard
              title="VBL Pension Refund"
              body="For VBL refund cases after public-sector, university, research institute or public hospital employment."
              cta="Open VBL Refund"
              href={VBL_HREF}
            />
            <RelatedCard
              title="Company Pension Refund Calculator"
              body="For VBL, ZVK, VddB and VddKO refund estimates."
              cta="See Cash-Outs & Refunds"
              href={CASHOUTS_HREF}
            />
            <RelatedCard
              title="Company Pension vs DRV"
              body="For users who want to understand why a DRV refund does not include ZVK or other company pensions."
              cta="Compare Company Pension vs DRV"
              href={DRV_HREF}
            />
            <RelatedCard
              title="Cash-Outs & Refunds"
              body="For a full overview of CompanyPension’s German company pension cash-outs and refunds."
              cta="See Cash-Outs & Refunds"
              href={CASHOUTS_HREF}
            />
            <RelatedCard
              title="VddB & VddKO Refunds"
              body="For stage, theatre, opera and orchestra pension refunds."
              cta="Open VddB & VddKO Refunds"
              href={VDDB_HREF}
            />
            <RelatedCard
              title="Company Pension Cash-Out"
              body="For bAV, Direktversicherung, Pensionskasse, Pensionsfonds and provider-based company pension cash-outs."
              cta="Open Company Pension Cash-Out"
              href={CASHOUT_HREF}
            />
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Start with my pension document
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1118:981) ----
          FAQ_ANSWER_PENDING: every FAQ item in this frame is a component
          instance carrying lorem defaults ("How do I pay for the…", "We need to
          add new u…", "My team wants to can…", "You can pay with a c…"). Only
          the section heading and eyebrow are non-instance verbatim copy. The
          questions and answers are UNVERIFIABLE from the XML and must not be
          invented; they are backfilled once final copy is available. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="ZVK refunds: common questions"
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

      {/* ---- GLOSSARY (Figma 1118:1699) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="KEY TERMS"
              title="Glossary"
              body="Short definitions of terms you may see on German supplementary pension documents."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="ZVK"
              body="Usually short for Zusatzversorgungskasse, a supplementary pension scheme connected to certain German employers."
            />
            <GlossaryCard
              term="Zusatzversorgungskasse"
              body="A supplementary pension fund or institution, often connected to public-sector, municipal, church, healthcare or similar employment."
            />
            <GlossaryCard
              term="Zusatzversorgung"
              body="German term for supplementary pension provision. In this context, it usually refers to employer-related supplementary pension coverage outside DRV."
            />
            <GlossaryCard
              term="Beitragserstattung"
              body="Contribution reimbursement. In this context, it can refer to getting eligible employee contributions or employee-paid parts back from a ZVK."
            />
            <GlossaryCard
              term="Wartezeit"
              body="Waiting period. Many supplementary pension schemes use a contribution-month waiting period for later pension entitlement."
            />
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory state pension system. A DRV refund is separate from a ZVK refund."
            />
            <GlossaryCard
              term="VBL"
              body="A major public-sector supplementary pension institution. VBL and ZVK are related in topic but separate institutions."
            />
            <GlossaryCard
              term="bAV"
              body="Short for betriebliche Altersversorgung. This is the German term for company pension. bAV cash-outs are checked through the cash-out flow, not calculated like ZVK refunds."
            />
          </div>
        </div>
      </section>

      {/* ---- SOURCE BASIS (Figma 1118:1816) ----
          COPY-GAP: the "LAST REVIEWED" and "REVIEWED BY" values are editorial
          placeholders authored in the design ("[Add actual review date before
          publication]" / "[Add reviewer name and role before publication]").
          Rendered verbatim per the copy rules; must be filled before go-live. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-3xl">
            <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
              SOURCE BASIS
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
              Source basis
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-600">
              ZVK refunds follow the rules of the relevant
              Zusatzversorgungskasse. Many supplementary pension schemes use a
              waiting-period framework for later pension entitlement, and refund
              availability can depend on whether that waiting period has been
              reached, whether earlier supplementary pension periods are
              recognised and which employee-paid contributions are refundable.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              CompanyPension uses these categories to guide users toward the
              correct online process. This page provides general information
              only and does not provide individual legal, pension, tax,
              insurance or financial advice.
            </p>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-400 bg-white p-6">
                <dt className="text-sm font-semibold uppercase tracking-wide text-brand">
                  LAST REVIEWED
                </dt>
                <dd className="mt-2 text-base text-gray-600">
                  [Add actual review date before publication]
                </dd>
              </div>
              <div className="rounded-2xl border border-neutral-400 bg-white p-6">
                <dt className="text-sm font-semibold uppercase tracking-wide text-brand">
                  REVIEWED BY
                </dt>
                <dd className="mt-2 text-base text-gray-600">
                  [Add reviewer name and role before publication]
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION (Figma 1118:1854) ---- */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Important information
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            CompanyPension provides a digital application platform for German
            company pension refunds and cash-outs. We are not a pension advisor,
            insurance broker, legal representative, tax advisor or financial
            advisor. Users remain the claimant.
          </li>
          <li>
            CompanyPension does not decide approval, does not claim funds as
            legal representative and does not receive or hold approved pension
            money.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If legal services are required for a specific case, they are carried
          out separately by the responsible legal partner.
        </div>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1118:1867) ----
          COPY-GAP: the design also carries a tertiary cross-link "Check what DRV
          did not cover" (1118:1882). CtaBand exposes no slot for a third link
          and the DRV comparison is already linked twice above (hero callout +
          DRV vs ZVK section), so it is intentionally not duplicated here. */}
      <CtaBand
        title="Ready to check your ZVK refund?"
        body="Start online with your ZVK, Zusatzversorgung or Zusatzversorgungskasse document. CompanyPension guides you through the right refund process and shows what information is still needed."
        cta={{ label: 'Start My ZVK Refund', href: START_HREF }}
        secondaryCta={{ label: 'Estimate a Refund', href: CALC_HREF }}
        note="If approved, the refund is paid directly to the bank account you provide. CompanyPension does not receive or hold your pension money."
      />
    </>
  );
}
