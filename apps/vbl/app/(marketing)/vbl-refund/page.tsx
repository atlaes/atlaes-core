import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Info, X } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import {
  SectionHeading,
  FAQ_EYEBROW_WIDTH,
} from '@/components/marketing/SectionHeading';
import { FeatureCard } from '@/components/marketing/FeatureCard';
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

// ---------------------------------------------------------------------------
// Local, page-only building blocks
// ---------------------------------------------------------------------------

function CheckList({
  items,
  variant = 'light',
}: {
  items: ReactNode[];
  variant?: 'light' | 'dark';
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={index}
          className={`flex items-start gap-3 ${
            variant === 'dark' ? 'text-white/85' : 'text-gray-700'
          }`}
        >
          {variant === 'dark' ? (
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent"
            >
              <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/marketing/icons/check-bullet.svg"
              alt=""
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />
          )}
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ExclusionList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-gray-700">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#b42318]"
          >
            <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </span>
          <span className="text-base leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-brand bg-neutral-50 px-4 py-3 text-sm text-gray-600">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function ArrowLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-brand bg-accent px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1244:3166 — "VBL Refund CompanyPension")
// Template for all product/SEO pages. Copy verbatim from the design XML.
// ---------------------------------------------------------------------------

export default function VblRefundPage() {
  return (
    <>
      {/* ---- HERO (Figma 1244:3725) ---- */}
      <Hero
        eyebrow="VBL pension refund"
        title="Get your VBL contributions back online"
        body="Worked in Germany’s public sector and paid into VBLklassik? Start your VBL refund online with guided steps, digital signing and paper-free submission — whether you still live in Germany or have already left."
        primaryCta={{ label: 'Start my VBL refund', href: START_HREF }}
        secondaryCta={{ label: 'Calculate my refund', href: CALC_HREF }}
        footnote={
          <p>
            If approved, your VBL refund is paid directly to the bank account
            you provide. CompanyPension does not receive or hold your pension
            money.
          </p>
        }
      />

      {/* ---- CAN I GET A VBL REFUND? (Figma 1244:3245) ---- */}
      <section className="relative overflow-hidden bg-[#f3f4f4]">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] sm:block">
          <Image
            src="/marketing/vbl-refund/laptop-vbl-document-checklist.png"
            alt=""
            fill
            sizes="58vw"
            data-testid="vbl-can-refund-background"
            className="object-cover object-left opacity-[0.15]"
          />
        </div>
        <div className={`${CONTAINER} relative py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                Can I get a VBL refund?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A VBL refund, also called VBL-Erstattung or Beitragserstattung,
                means getting back your own employee contributions paid into
                VBLklassik.
              </p>
              <p className="mt-8 text-lg font-semibold text-brand">
                A VBL refund may be possible if all of these conditions apply:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'You paid into VBLklassik',
                    'Your refundable contributions were paid into VBL West / Abrechnungsverband West',
                    'You have left German public-sector employment',
                    'You apply before turning 69',
                    'Your contribution history stays below the relevant vesting limits',
                  ]}
                />
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-neutral-400 bg-white p-8">
                <p className="text-lg font-semibold text-brand">
                  The main VBL limits are:
                </p>
                <div className="mt-6">
                  <CheckList
                    items={[
                      'Under the rules applicable since 2018, your pension rights may already be vested if you worked for the same employer for at least 36 uninterrupted months and were at least 21 when you left. In that case, your VBLklassik employee contributions are generally no longer refundable.',
                      'If your recognised VBL, ZVK or other public-sector company pension periods reach the 60-month waiting period, a refund is generally no longer possible.',
                    ]}
                  />
                </div>
                <p className="mt-6 text-base leading-relaxed text-gray-600">
                  Earlier recognised public-sector pension periods can be
                  counted together. This means a refund can become impossible
                  even if one individual job period looks short on its own.
                </p>
              </div>
              <InfoNote>
                A VBL refund is separate from a German state pension refund
                through Deutsche Rentenversicherung. Unlike a DRV refund, a VBL
                refund does not require a 24-month waiting period and does not
                require you to live outside Germany, the EU or the UK.
              </InfoNote>
            </div>
          </div>
          <div className="mt-12 flex justify-center">
            {/* Exact design casing per Figma node 1244:3298 ("Start My VBL
                Refund"); other CTA instances on this page use design's
                sentence-case wording and are unaffected. */}
            <ArrowLink
              href={START_HREF}
              className="h-[63px] w-full justify-center sm:w-[564px]"
            >
              Start My VBL Refund
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- BUILT FOR VBLKLASSIK + COMMON WORDING (Figma 1312:203) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                Built for VBLklassik refunds
              </h2>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                For people who paid into VBLklassik while working in Germany’s
                public sector and want to get their own employee contributions
                back online.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Common wording on VBL documents:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'VBL',
                    'VBLklassik',
                    'VBL-Erstattung',
                    'Beitragserstattung',
                    'VBL West',
                    'Abrechnungsverband West',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHO THIS IS FOR (Figma 1244:5592) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Who this is for"
              title="Worked in Germany’s public sector and paid into VBL?"
              body="This page is for people who worked in Germany’s public sector and paid into VBLklassik through a university, research institute, hospital, public employer or publicly funded organisation."
            />
          </div>
          <div className="mt-12 grid items-stretch gap-10 lg:grid-cols-2">
            <div className="flex flex-col justify-center">
              <p className="text-lg font-semibold text-brand">
                You may be in the right place if
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'The contributions you want refunded were paid into VBLklassik in VBL West / Abrechnungsverband West.',
                    'You left German public-sector employment',
                    'Your VBL periods are still below the refund limits',
                    'You do not have VBLextra contributions',
                    'You want to get your own VBL employee contributions back',
                    'You want to complete the process through a guided online flow, with digital signing and support when clarification or follow-up is needed.',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  Contributions paid into VBL East (Abrechnungsverband Ost) are
                  generally not refundable. VBLextra contributions are also not
                  refundable. If your record includes both VBLextra and
                  VBLklassik, the VBLklassik periods must be checked separately.
                </InfoNote>
              </div>
            </div>
            <div className="relative min-h-[420px] overflow-hidden rounded-2xl sm:min-h-[520px] lg:min-h-[633px]">
              <Image
                src="/marketing/vbl-refund/laptop-vbl-document-checklist.png"
                alt="Woman reviewing her VBL refund documents online"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink
              href={START_HREF}
              className="h-[63px] w-full justify-center sm:w-[564px]"
            >
              Check my VBL refund
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT IS A VBL PENSION REFUND? (Figma 1245:5659) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-medium text-white">
                VBL refund explained
              </span>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-accent sm:text-[2.5rem] sm:leading-[1.15]">
                What is a VBL pension refund?
              </h2>
              <p className="mt-5 text-lg font-semibold text-white">
                A VBL refund is the reimbursement of your own employee-paid
                VBLklassik contributions.
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-white/75">
                <p>
                  VBL is the company pension scheme used by many German
                  public-sector employers. You may have paid into it while
                  working for a university, research institute, public hospital,
                  local authority or another public employer.
                </p>
                <p>
                  If you worked in Germany’s public sector for a limited time
                  and left before your VBLklassik pension rights became vested,
                  you may be able to claim your own employee contributions back.
                </p>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-brand bg-black/20 p-4 text-sm leading-relaxed text-white/75">
                <Info
                  className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <span>
                  A VBL refund does not include employer-paid amounts. It also
                  does not happen automatically when you apply for or receive a
                  German state pension refund from Deutsche Rentenversicherung.
                </span>
              </div>
            </div>
            <div className="hidden justify-center lg:flex">
              <Image
                src="/marketing/shared/guided-process-smiling-man-laptop.png"
                alt=""
                width={521}
                height={597}
                className="h-auto w-full max-w-[460px] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- VBLKLASSIK OR VBLEXTRA? (Figma 1245:5688) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="VBLklassik or VBLextra?"
              body="VBLklassik may be refundable. VBLextra is not."
            />
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="VBLklassik"
              body="Eligible employee-paid contributions in VBL West may be refundable if you have left public-sector employment and your pension rights have not become vested."
            />
            <FeatureCard
              icon={<Info className="h-7 w-7" aria-hidden="true" />}
              title="VBLextra"
              body="A voluntary additional VBL plan with a vested entitlement from the first contribution. No contribution refund is possible."
            />
            <FeatureCard
              icon={<Info className="h-7 w-7" aria-hidden="true" />}
              title="Not sure which one you had?"
              body="Upload your VBL letter or pension document when using the refund calculator or starting your refund claim. The document can help identify whether you had VBLklassik, VBLextra, or both."
            />
          </div>
        </div>
      </section>

      {/* ---- WHEN CAN I GET A VBL REFUND? (Figma 1245:5737) ---- */}
      <section className="relative overflow-hidden bg-[#f9fef5]">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] sm:block">
          <Image
            src="/marketing/vbl-refund/vbl-refund-eligibility-calendar.png"
            alt=""
            fill
            sizes="58vw"
            data-testid="vbl-eligibility-background"
            className="object-cover object-left opacity-[0.15]"
          />
        </div>
        <div className={`${CONTAINER} relative py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                When can I get a VBL refund?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A VBL refund may be possible only if all relevant refund
                conditions are met.
              </p>
              <p className="mt-8 text-lg font-semibold text-brand">
                A VBL refund may be possible if:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'You paid into VBLklassik',
                    'You left German public-sector employment',
                    'Your refundable contributions were paid into VBL West / Abrechnungsverband West',
                    'Your VBL pension rights are not vested',
                    'You apply before turning 69',
                  ]}
                />
              </div>
              <div className="mt-8">
                <ArrowLink
                  href={START_HREF}
                  className="h-[63px] w-full justify-center sm:w-[564px] lg:w-full xl:w-[564px]"
                >
                  Check my VBL refund
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                VBL refund rules
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  The standard VBLklassik waiting period is 60 calendar months.
                  Months from different public-sector employments can be counted
                  together.
                </p>
                <p>
                  A separate statutory vesting rule can apply before 60 months
                  are reached. For employment periods subject to the rules in
                  force since 2018, your entitlement may already be vested if
                  you worked for the same employer for at least 36 uninterrupted
                  months and were at least 21 when you left. In that case, your
                  VBLklassik employee contributions are generally no longer
                  refundable.
                </p>
                <p>
                  Recognised VBL, ZVK or other public-sector company pension
                  periods may also count toward the 60-month waiting period.
                </p>
              </div>
              <div className="mt-6">
                <InfoNote>
                  Recognised periods with another public-sector company pension
                  scheme, such as a ZVK, may count together with your VBL
                  periods. This can make a refund impossible even if your
                  VBL-only history looks short.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHEN IS A VBL REFUND NOT POSSIBLE? (Figma 1245:5813) ---- */}
      <section className="relative overflow-hidden bg-[#fbf4f2]">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] sm:block">
          <Image
            src="/marketing/vbl-refund/vbl-refund-ineligible-review.png"
            alt=""
            fill
            sizes="58vw"
            data-testid="vbl-ineligible-background"
            className="object-cover object-left opacity-[0.34]"
          />
        </div>
        <div className={`${CONTAINER} relative py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                When is a VBL refund not possible?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A VBL refund is generally not possible if any of the following
                exclusion rules applies.
              </p>
              <div className="mt-8">
                <ArrowLink
                  href={START_HREF}
                  className="h-[63px] w-full justify-center sm:w-[564px] lg:w-full xl:w-[564px]"
                >
                  Check my VBL refund
                </ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                You generally cannot get a VBL refund if:
              </p>
              <div className="mt-6">
                <ExclusionList
                  items={[
                    'You are still working in German public-sector employment',
                    'Your record includes VBLextra contributions',
                    'Your VBL pension rights are vested',
                    'You worked for the same employer for at least three uninterrupted years from 1 January 2018 and were at least 21 when you left',
                    'Your recognised VBL, ZVK or other public-sector company pension periods have reached the 60-month waiting period',
                    'The contributions you want refunded were paid into VBL East / Abrechnungsverband Ost',
                    'You are already 69 or older',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  If one of these exclusion rules applies, a VBLklassik
                  contribution refund is generally not available. The final
                  decision is made by VBL after reviewing your insurance record.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DO ZVK PERIODS COUNT? (Figma 1245:5877) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                Do ZVK or other public-sector pension periods count?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Yes. Your refund eligibility is not always based only on your
                VBL periods.
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Earlier compulsory-insurance periods with another
                  public-sector company pension scheme, such as a ZVK, may be
                  recognised and counted toward the 60-month VBLklassik waiting
                  period.
                </p>
                <p>
                  This means that even a short VBL history can become
                  non-refundable when recognised periods from another
                  public-sector pension scheme are added.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Contribution periods
              </p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Example: You paid into VBL for 30 months and previously
                completed 30 recognised months with another public-sector
                company pension scheme. Together, those periods can fulfil the
                60-month waiting period and make your VBLklassik employee
                contributions non-refundable.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my VBL refund</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- VBL WEST VS EAST (Figma 1247:5902) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                What is the difference between VBL West and VBL East?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                VBL refund rules differ between VBL West and VBL East.
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Eligible VBLklassik employee contributions in VBL West, also
                  called Abrechnungsverband West, may be refundable if the other
                  refund conditions are met.
                </p>
                <p>
                  In VBL East, employee contributions paid into the
                  capital-funded system for periods after 31 December 2003 are
                  not refundable. The pension rights created by those
                  contributions are vested from the first contribution.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check my cash-out</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                VBL West or VBL East?
              </p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                Check your VBL letter or insurance record for wording such as
                VBL West, Abrechnungsverband West, Tarifgebiet Ost or
                capital-funded contributions. If you are not sure, upload your
                document when using the refund calculator or starting your
                refund so the relevant contribution system can be identified.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW MUCH CAN YOU GET BACK? (Figma 1247:5963) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                How much can I get back from VBL?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                A VBL refund generally covers eligible employee-paid VBLklassik
                contributions, not employer-paid amounts.
              </p>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  The amount depends on the contributions recorded for your
                  refundable VBLklassik West periods. Current VBLklassik West
                  employee contributions total 1.81% of the salary subject to
                  VBL contributions: a 1.41% employee share plus an additional
                  employee contribution of 0.40%.
                </p>
                <p>
                  Different contribution rates may apply to earlier periods.
                  Your actual refund is therefore based on the employee-paid
                  contributions recorded by VBL for each eligible period.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">Refund amount</p>
              <p className="mt-5 text-base text-gray-600">
                Your refund amount depends mainly on:
              </p>
              <div className="mt-5">
                <CheckList
                  items={[
                    'How long you paid into refundable VBLklassik',
                    'Your salary during those periods',
                    'The contribution rates that applied at the time',
                    'Whether the contributions were paid into VBL West / Abrechnungsverband West',
                    'Whether all VBL refund conditions are met',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                The calculator can provide a first estimate using your
                employment dates, salary information and pension documents. The
                final refundable amount is confirmed by VBL after reviewing your
                insurance record.
              </p>
              <div className="mt-8">
                <ArrowLink href={CALC_HREF}>Calculate my refund</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- VBL VS DRV COMPARISON (Figma 1248:6008 / table 1248:6025) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="VBL vs DRV"
              title="Your DRV refund does not include your VBL refund"
              body="VBL refunds and German state pension refunds are separate."
            />
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-base leading-relaxed text-gray-600">
            <p>
              A DRV refund only concerns eligible statutory German state pension
              contributions paid into Deutsche Rentenversicherung. It does not
              include VBL, ZVK or other company pension entitlements.
            </p>
            <p>
              If you worked in Germany’s public sector and paid into VBLklassik,
              you need a separate VBL refund process to get eligible employee
              contributions back.
            </p>
          </div>

          <div className="mt-12">
            <ComparisonTable
              caption="Your DRV refund does not include your VBL refund"
              columns={['Question', 'VBL refund', 'DRV state pension refund']}
              rows={[
                {
                  label: 'What money is involved?',
                  values: [
                    'Eligible VBLklassik employee contributions',
                    'Eligible statutory German state pension contributions',
                  ],
                },
                {
                  label: 'Which system?',
                  values: [
                    'Public-sector company pension',
                    'Deutsche Rentenversicherung',
                  ],
                },
                {
                  label: 'Main refund logic',
                  values: [
                    'VBLklassik West, no vested pension entitlement, left public-sector employment, under 69',
                    'Nationality, residence, contribution history, ability to make voluntary contributions and usually a 24-month waiting period',
                  ],
                },
                {
                  label: '24-month waiting period?',
                  values: ['No', 'Usually yes; separate exceptions can apply'],
                },
                {
                  label: 'Does residence matter?',
                  values: [
                    'No residence restriction for the VBL refund itself',
                    'Yes. Eligibility depends on residence, nationality and whether voluntary insurance remains possible',
                  ],
                },
                {
                  label: 'Automatically included in the other refund?',
                  values: ['No', 'No'],
                },
              ]}
            />
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            You may qualify for a VBL refund even if you are not yet eligible
            for a DRV refund. You may also qualify for both, but they are
            separate processes with different rules.
          </p>
          <div className="mt-10 flex justify-center">
            {/* Exact design casing per Figma node 1248:6080 ("Start My VBL
                Refund"). */}
            <ArrowLink href={START_HREF}>Start My VBL Refund</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- RETURNING TO PUBLIC SERVICE (Figma 1248:6130) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Returning to public service"
                title="A VBL refund is for people who have left public-sector employment"
                body="You can generally request a VBL contribution refund only after leaving German public-sector employment and compulsory VBL insurance."
              />
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                If your VBL contributions are refunded, all pension rights
                connected to the refunded periods expire. If you later return to
                German public-sector employment, those refunded periods are not
                automatically restored or counted toward your future VBL
                pension.
              </p>
              <InfoNote>
                If you are still working in German public-sector employment, a
                VBL refund cannot be started. If you expect to return to
                public-sector employment, consider the loss of the refunded
                pension periods carefully before requesting a refund.
              </InfoNote>
              <div className="pt-2">
                <ArrowLink href={START_HREF}>Check my VBL refund</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 8-STEP PROCESS (Figma 1248:6171) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-white">
            <SectionHeading
              eyebrow="How it works"
              title="Start your VBL refund online"
              body="Complete the process through a guided online flow, from the first refund check to digital signing and submission."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Upload your VBL document or answer guided questions"
              body="Start with a VBL letter, insurance number, payslip or employment document. Or continue manually by answering a few questions about your VBL scheme, public-sector employment and contribution periods."
            />
            <StepCard
              number="02"
              title="Check whether a VBL refund may be possible"
              body="CompanyPension uses your answers and uploaded documents to check whether your case matches the basic VBL refund rules."
            />
            <StepCard
              number="03"
              title="Secure your VBL refund claim"
              body="Create secure access, review the pricing and pay the €199 deposit to activate the full refund process. The deposit is credited toward your final service fee if your refund is approved."
            />
            <StepCard
              number="04"
              title="Complete your details"
              body="Add the remaining information needed for your VBL refund request, including your identity, address, employment and pension details, and bank account."
            />
            <StepCard
              number="05"
              title="Review, sign and submit online"
              body="Check your details, sign online and submit your VBL refund request through the guided digital flow."
            />
            <StepCard
              number="06"
              title="VBL review and follow-up"
              body="VBL reviews your refund request. VBL messages run through CompanyPension, with human oversight when clarification, translation or follow-up is needed."
            />
            <StepCard
              number="07"
              title="Receive your approved refund directly"
              body="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
            <StepCard
              number="08"
              title="Receive your refund directly"
              body="If approved, your VBL refund is paid directly to the bank account you provide. CompanyPension does not receive or hold your pension money."
            />
          </div>
        </div>
      </section>

      {/* ---- WHAT DOCUMENTS DO I NEED? (Figma 1248:6295) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                Documents
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-brand sm:text-[2.5rem] sm:leading-[1.15]">
                What documents do I need for a VBL refund?
              </h2>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                You can start even if you do not have every document. The online
                flow shows you what is still needed.
              </p>
              <p className="mt-5 text-base leading-relaxed text-gray-600">
                These documents help us check which VBL plan you had, how long
                you paid into it and whether a refund may be possible. They also
                provide the details VBL needs to pay your refund if it is
                approved.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">
                Useful documents include:
              </p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Your VBL letter or VBL insurance number',
                    'Proof that you worked in Germany’s public sector',
                    'Payslips showing VBL contributions',
                    'Your employment contract or a document showing when your job ended',
                    'Passport or ID copy',
                    'Your current address',
                    'Bank account details',
                    'Previous letters or emails from VBL',
                    'Documents from a ZVK or another public-sector pension scheme, if you had one',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- BANK ACCOUNT (Figma 1249:6338) ---- */}
      {/* COPY-GOVERNANCE (client item 19): design reads "open a free EUR
          account"; the word "free" is dropped per the established transformation
          (commit 1236ccf), keeping the article. */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex items-center rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-medium text-white">
              Bank account
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
              Do I need a German bank account for a VBL refund?
            </h2>
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-base leading-relaxed text-white/75">
            <p className="text-lg font-semibold text-white">
              No. You do not need a German bank account.
            </p>
            <p>
              For a VBL refund, a SEPA-capable EUR account is usually the
              easiest option. If you do not have one, CompanyPension can help
              you open a EUR account to receive your refund.
            </p>
            <p className="text-accent">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1249:6352) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              eyebrow="Pricing"
              title="Transparent pricing for your VBL refund"
              body="Start your VBL refund with a €199 deposit. If your refund is approved, our success fee is 9.75% of the approved refund amount, with a minimum total fee of €199."
            />
          </div>
          <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-black/20 p-8">
            <p className="text-2xl font-bold text-white">VBL refund</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-accent">€199</span>
              <span className="text-2xl font-bold text-white">deposit</span>
            </div>
            <p className="mt-1 text-base text-white/70">
              to activate the full process
            </p>
            <p className="mt-6 text-base leading-relaxed text-white/75">
              The €199 deposit is credited toward your final service fee if your
              refund is approved.
            </p>
            <div className="mt-6">
              <CheckList
                variant="dark"
                items={[
                  '9.75% success fee if your VBL refund is approved',
                  'Minimum total service fee: €199',
                  'If VBL rejects your submitted refund request, the €199 deposit is refunded in full',
                ]}
              />
            </div>
            <div className="mt-6 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/70">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </div>
            <div className="mt-8">
              <Link
                href={START_HREF}
                className="block rounded-brand bg-accent px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
              >
                Start my VBL refund
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- REFUND PAID DIRECTLY (Figma 1249:6576) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto max-w-3xl text-center text-brand">
            <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
              Refund Payment
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
              Your VBL refund is paid directly to you
            </h2>
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-base leading-relaxed text-gray-600">
            <p>
              If your VBL refund is approved, VBL pays the money directly to the
              bank account you provide.
            </p>
            <p>
              CompanyPension does not receive, hold or forward approved pension
              money. You remain the claimant throughout the process.
            </p>
            <p>
              CompanyPension provides the guided online flow and support when
              clarification or follow-up is needed. VBL decides whether your
              refund is approved and makes the payment.
            </p>
          </div>
        </div>
      </section>

      {/* ---- WHY COMPANYPENSION (Figma 1249:6596) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Why CompanyPension"
              title="A simpler way to apply for your VBL refund online"
              body="VBL refunds can be confusing, especially if you have left Germany, do not speak German or are not sure which rules apply to you. CompanyPension guides you through the process online."
            />
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Built for VBLklassik refunds"
              body="Start with your VBL details and see the next steps for your refund."
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Clear refund check"
              body="The online flow checks your VBL plan, West or East periods, contribution history and public-sector employment."
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Guided online process"
              body="Add your details step by step. You do not need to complete German forms on your own."
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Digital signing and submission"
              body="Review your details, sign online and submit your VBL refund request through the guided flow."
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Human support when needed"
              body="If something is unclear, support is available for questions, translations and follow-up."
            />
            <FeatureCard
              icon={<Check className="h-7 w-7" aria-hidden="true" />}
              title="Refund paid directly to you"
              body="If approved, VBL pays the money directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
        </div>
      </section>

      {/* ---- GLOSSARY (Figma 1249:6648) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Glossary"
              title="VBL refund terms explained"
              body="Short explanations of terms you may see on German company pension documents."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="VBL"
              body="Versorgungsanstalt des Bundes und der Länder. VBL manages company pensions for many German public-sector employers."
            />
            <GlossaryCard
              term="VBLklassik"
              body="The standard VBL plan for many public-sector employees. Eligible employee contributions paid into VBL West may be refundable if all refund conditions are met."
            />
            <GlossaryCard
              term="VBLextra"
              body="A voluntary additional VBL plan. The pension entitlement is vested from the first contribution, so VBLextra contributions cannot be refunded."
            />
            <GlossaryCard
              term="VBL-Erstattung"
              body="German term for a VBL contribution refund."
            />
            <GlossaryCard
              term="Beitragserstattung"
              body="German term for a refund of pension contributions."
            />
            <GlossaryCard
              term="VBL West / Abrechnungsverband West"
              body="The VBL contribution system in which eligible employee-paid VBLklassik contributions may be refundable if all refund conditions are met."
            />
            <GlossaryCard
              term="VBL East / Abrechnungsverband Ost"
              body="The VBL contribution system used for relevant East contribution periods. Employee contributions paid into the capital-funded VBL East system are generally not refundable."
            />
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory state pension system. A DRV refund is separate from a VBL refund."
            />
            <GlossaryCard
              term="ZVK"
              body="A public-sector company pension scheme. Recognised ZVK periods may count toward the 60-month VBLklassik waiting period."
            />
            <GlossaryCard
              term="SEPA account"
              body="A bank account that can receive euro payments through the SEPA payment system."
            />
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1249:6757) — answers from the shared FAQ master copy via faqItems.tsx (FAQ CompanyPension 22062026.pdf) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              eyebrowWidth={FAQ_EYEBROW_WIDTH}
              title="VBL refunds: common questions"
            />
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion
              items={[
                FAQ.whatIsVbl,
                FAQ.vblklassikVsExtra,
                FAQ.canGetVblRefund,
                FAQ.vblRefundInGermany,
                FAQ.vblRefundPrivateSector,
                FAQ.vblEast,
                FAQ.earlierPeriods,
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

      {/* ---- IMPORTANT INFORMATION 1 (Figma 1251:7540) ---- */}
      <ImportantCallout tone="gray">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          You apply through the platform in your own name
        </h2>
        <p className="mt-6 text-base font-semibold leading-relaxed text-brand">
          CompanyPension is a digital application platform operated by ATLAES
          GmbH.
        </p>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            The platform guides you through the refund process in English. It
            uses the information you provide to complete your application and
            shows you what documents are needed.
          </li>
          <li>
            You review and sign the application yourself. You remain the
            applicant and claimant throughout the process.
          </li>
          <li>
            After you sign, ATLAES GmbH technically transmits the application to
            VBL or the relevant pension provider. ATLAES GmbH does not apply as
            the claimant and does not make the refund decision.
          </li>
          <li>
            ATLAES GmbH does not provide pension, insurance, tax, financial or
            legal advice. It does not assess or argue your legal position and
            does not act as your legal representative for the refund claim.
          </li>
          <li>
            You give ATLAES GmbH a limited authorization to receive and forward
            correspondence from the pension provider and to receive information
            about the final decision and approved amount. This allows the
            platform to show you follow-up requests and calculate the agreed
            service fee.
          </li>
          <li>
            If approved, the pension provider pays the money directly to the
            bank account you provide. ATLAES GmbH does not receive, hold or
            forward approved pension money.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If separate legal services are needed for a specific case, they are
          provided by the responsible legal partner under a separate
          arrangement.
        </div>
      </ImportantCallout>

      {/* ---- IMPORTANT INFORMATION 2 (Figma 1251:7619) ---- */}
      <ImportantCallout tone="white">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          A digital application platform, not pension advice
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            CompanyPension is a digital application platform and brand operated
            by ATLAES GmbH.
          </li>
          <li>
            ATLAES GmbH provides the online platform for German company pension
            refunds and cash-outs.
          </li>
          <li>
            Neither CompanyPension nor ATLAES GmbH provides pension, tax,
            financial or insurance advice. ATLAES GmbH is not an insurance
            broker or your legal representative. You remain the claimant
            throughout the process.
          </li>
          <li>
            ATLAES GmbH does not decide whether your refund or cash-out is
            approved. It does not claim pension money as your legal
            representative and does not receive, hold or forward approved
            pension money.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If legal services are needed for a specific case, they are provided
          separately by the responsible legal partner.
        </div>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1251:7660) ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Start my <span className="text-accent">VBL refund</span>
          </>
        }
        cta={{ label: 'Start my VBL refund', href: START_HREF }}
        secondaryCta={{ label: 'Calculate my refund', href: CALC_HREF }}
        note="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
      />
    </>
  );
}
