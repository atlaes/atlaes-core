import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import { ImportantCallout } from '@/components/marketing/ImportantCallout';
import { ComparisonTable } from '@/components/marketing/ComparisonTable';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Funnel entry CTAs route to the claim flow; cross-page links go to the
// matching product/SEO route. Guide links whose destination page does not yet
// exist fall back to the funnel with a ROUTE_PENDING note.
const START_HREF = '/get-started';
const VBL_REFUND_HREF = '/vbl-refund';
const VS_DRV_HREF = '/company-pension-vs-drv';
const ZVK_HREF = '/zvk-refund';
const CP_CASHOUT_HREF = '/company-pension-cash-out';

// ---------------------------------------------------------------------------
// Local, page-only building blocks (mirrors the vbl-refund template)
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

/** Pill list for the "your document may mention" keyword groups. */
function ChipList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex items-center rounded-full border border-neutral-400 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          {item}
        </li>
      ))}
    </ul>
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

/** Related-page card for the "Where to go next" grid. */
function RelatedCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; href: string };
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <h3 className="text-xl font-semibold text-brand">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
      <div className="mt-8 flex flex-1 items-end">
        <Link
          href={cta.href}
          className="w-full rounded-brand border border-neutral-400 bg-white px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-neutral-50"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1153:62 — "VBL vs DRV CompanyPension"). Sections rendered
// in visual (top-to-bottom) order; copy is verbatim from the design XML.
// Canvas screenshot unavailable (Figma auth wall / 403) — built XML-only.
// ---------------------------------------------------------------------------

export default function VblVsDrvPage() {
  return (
    <>
      {/* ---- HERO (Figma 1153:63) ----
          DESIGN TYPO (node 1153:413): the design reads "pid into VBL" — a
          non-word artifact fixed to "paid into VBL" per the artifact precedent
          (Task 13), corroborated by "paid into VBL" at node 1153:1765 in the
          same frame. Client should correct the Figma source. */}
      <Hero
        eyebrow="VBL vs DRV"
        title="VBL and DRV are not the same pension"
        body="A DRV refund only covers statutory German state pension contributions paid into Deutsche Rentenversicherung. It does not include VBL. If you worked in the German public sector and paid into VBL, your VBL refund needs a separate check."
        primaryCta={{ label: 'Check my VBL refund', href: START_HREF }}
        secondaryCta={{
          label: 'Compare company pension vs DRV',
          href: VS_DRV_HREF,
        }}
        footnote={
          <p>
            If approved, the money is paid directly to the bank account you
            provide. CompanyPension does not receive, hold or forward approved
            pension money.
          </p>
        }
      />

      {/* ---- HERO "IMPORTANT" CALLOUT (Figma 1153:433) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-400 bg-white p-8">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-neutral-50 px-4 py-2 text-sm font-medium text-brand">
              <Info className="h-4 w-4" aria-hidden="true" />
              Important
            </span>
            <CheckList
              items={[
                'A German state pension refund through Deutsche Rentenversicherung does not include VBL.',
                'DRV is the statutory German state pension system.',
                'VBL is a separate public-sector company pension scheme.',
                'If you have both DRV and VBL contributions, they are checked through separate processes.',
                'A completed DRV refund does not automatically trigger, include or replace a VBL refund.',
              ]}
            />
            <div className="mt-8 flex flex-col items-start gap-3">
              <ArrowLink href={START_HREF}>
                Have a VBL document? Start your VBL refund.
              </ArrowLink>
              <ArrowLink href={START_HREF}>
                Not sure if your document is VBL or DRV? Start with your pension
                document
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DOES A DRV REFUND INCLUDE VBL? (Figma 1153:451) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="QUICK ANSWER"
              title="Does a DRV refund include VBL?"
            />
          </div>
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <p className="text-2xl font-bold text-brand sm:text-3xl">
              No. A DRV refund does not include VBL.
            </p>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                DRV refunds only cover statutory German state pension
                contributions paid into Deutsche Rentenversicherung. VBL is a
                separate public-sector company pension scheme and needs its own
                refund check.
              </p>
              <p>
                If you worked for a German public-sector employer, university,
                research institute, hospital or similar employer, you may have
                both DRV and VBL pension records. Receiving a DRV refund does
                not mean your VBL has been refunded.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ArrowLink href={VS_DRV_HREF}>
              Compare Company Pension vs DRV
            </ArrowLink>
            <ArrowLink href={ZVK_HREF}>Start My ZVK Refund</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- VBL VS DRV IN SHORT (Figma 1153:3756) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Fast facts"
                title="VBL vs DRV in short"
              />
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <CheckList
                items={[
                  'DRV is Germany’s statutory state pension system.',
                  'VBL is a public-sector company pension scheme.',
                  'A DRV refund does not include VBL.',
                  'VBL needs a separate refund check',
                  'For VBLklassik, contribution reimbursement generally concerns the employee’s own share under VBL’s rules. Employer-paid amounts are not refunded to the employee.',
                  'A DRV refund and a VBL refund can be separate processes for the same person.',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT IS DRV? (Figma 1153:4424) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What is DRV?
              </h2>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                DRV means Deutsche Rentenversicherung. It is Germany’s statutory
                state pension system.
              </p>
              <p>
                If you worked in Germany as an employee, part of your salary was
                usually paid into the statutory pension system. A DRV refund is
                a separate process that may allow eligible people to reclaim
                their own statutory pension contributions after leaving Germany,
                if the legal conditions are met.
              </p>
              <p>
                A DRV refund does not include VBL, ZVK or other company
                pensions. It is separate from public-sector supplementary
                pensions and bAV cash-out cases.
              </p>
              <div className="pt-2">
                <ArrowLink href={VS_DRV_HREF}>
                  Compare company pension vs DRV
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT IS VBL? (Figma 1153:4438) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                What is VBL?
              </h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  VBL stands for Versorgungsanstalt des Bundes und der Länder.
                  It is a public-sector company pension scheme used by many
                  German public-sector and public-sector related employers.
                </p>
                <p>
                  You may have VBL if you worked for a German public employer,
                  university, research institution, public hospital, cultural
                  institution or another employer participating in VBL.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start my VBL refund</ArrowLink>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                Your document may mention:
              </p>
              <div className="mt-6">
                <ChipList
                  items={[
                    'VBL',
                    'VBLklassik',
                    'VBLextra',
                    'Versorgungsanstalt des Bundes und der Länder',
                    'Zusatzversorgung',
                    'public-sector supplementary pension',
                    'employee contributions',
                    'annual VBL statement',
                    'VBL Versicherungsnummer',
                  ]}
                />
              </div>
              <div className="mt-6">
                <InfoNote>
                  VBL is separate from DRV. A VBL refund must be checked through
                  the VBL-specific process.
                </InfoNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHY PEOPLE CONFUSE VBL AND DRV (Figma 1153:4482) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Why they get confused"
                title="Why people confuse VBL and DRV"
              />
              <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  Many people see several pension deductions on German payslips
                  or receive several pension letters after leaving Germany.
                </p>
                <p>
                  That can make it look like there is one “German pension
                  refund” process for everything.
                </p>
                <p className="font-semibold text-brand">There is not.</p>
                <p>
                  DRV, VBL and other company pension systems are separate. They
                  may all relate to your work in Germany, but they are handled
                  by different institutions and follow different refund rules.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-neutral-50 p-8">
              <p className="text-lg font-semibold text-brand">For example:</p>
              <div className="mt-6">
                <CheckList
                  items={[
                    'Your DRV record belongs to Deutsche Rentenversicherung.',
                    'Your VBL record belongs to VBL.',
                    'Your bAV or provider-based company pension belongs to the provider or pension institution shown on the document.',
                  ]}
                />
              </div>
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                One German job can create more than one pension record. A refund
                from one system does not automatically refund the others.
              </p>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Start with my pension document
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- DRV VS VBL REFUND TABLE (Figma 1153:4508) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Refund difference"
              title="What is the difference between a DRV refund and a VBL refund?"
              body="A DRV refund and a VBL refund are different processes."
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="What is the difference between a DRV refund and a VBL refund?"
              columns={['Topic', 'DRV refund', 'VBL refund']}
              rows={[
                {
                  label: 'System',
                  values: [
                    'Statutory German state pension.',
                    'Public-sector company pension scheme.',
                  ],
                },
                {
                  label: 'Institution',
                  values: [
                    'Deutsche Rentenversicherung.',
                    'Versorgungsanstalt des Bundes und der Länder.',
                  ],
                },
                {
                  label: 'What may be refunded',
                  values: [
                    'Eligible statutory employee pension contributions.',
                    'Eligible VBL employee contributions, depending on VBL rules.',
                  ],
                },
                {
                  label: 'Employer contributions',
                  values: [
                    'Employer contributions are not paid back to the employee through a DRV refund.',
                    'For VBLklassik contribution reimbursement, employer-paid amounts are not refunded to the employee.',
                  ],
                },
                {
                  label: 'Process',
                  values: [
                    'Separate DRV refund process.',
                    'Separate VBL refund process.',
                  ],
                },
                {
                  label: 'Does one include the other?',
                  values: [
                    'No. DRV does not include VBL.',
                    'No. VBL does not include DRV.',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- VBL REFUND AFTER DRV REFUND (Figma 1153:1113) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="After DRV refund"
              title="Can you get a VBL refund after your DRV refund?"
            />
          </div>
          <div className="mx-auto mt-8 max-w-3xl text-center">
            <p className="text-2xl font-bold text-brand sm:text-3xl">
              Possibly. A completed DRV refund does not automatically include or
              block a separate VBL refund check.
            </p>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                The two refunds cover different systems. If you paid into VBL
                through a public-sector employer, your VBL record may still need
                to be checked even after your DRV refund has already been
                completed.
              </p>
              <p>
                Your VBL refund depends on VBL-specific rules, including the
                scheme, contribution periods, timing and whether the refund
                conditions are met.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <ArrowLink href={START_HREF}>Check my VBL refund</ArrowLink>
            <ArrowLink href={VS_DRV_HREF}>
              Compare company pension vs DRV
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHEN CAN VBL CONTRIBUTIONS BE REFUNDED? (Figma 1153:4642) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-brand/5 px-4 py-2 text-sm font-medium text-brand">
                VBL refund basics
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                When can VBL contributions be refunded?
              </h2>
              <p className="mt-5 text-lg font-semibold text-brand">
                A VBL refund can be possible when the VBL-specific refund rules
                are met.
              </p>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                These rules can include contribution periods, timing, age and
                which contributions are refundable. For VBLklassik, contribution
                reimbursement generally concerns the employee’s own share, while
                employer-paid amounts are not refunded to the employee.
              </p>
              <InfoNote>
                A VBL refund is not the same as a DRV refund and is not included
                in a DRV refund.
              </InfoNote>
              <div className="pt-2">
                <ArrowLink href={VBL_REFUND_HREF}>
                  Open VBL refund page
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DOES VBL REFUND EMPLOYER CONTRIBUTIONS? (Figma 1153:1775) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Employee and employer contributions"
                title="Does VBL refund employer contributions?"
              />
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                For VBLklassik, contribution reimbursement generally focuses on
                the employee’s own share under VBL’s rules.
              </p>
              <p className="font-semibold text-brand">
                Employer-paid amounts are not refunded to the employee.
              </p>
              <p>
                This is one reason why the amount you receive may differ from
                the total amount shown in pension records or payroll history
              </p>
              <InfoNote>
                CompanyPension helps you check the right process, but VBL
                confirms the final refundable amount.
              </InfoNote>
              <div className="pt-2">
                <ArrowLink href={START_HREF}>Check my VBL refund</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW TO TELL VBL VS DRV DOCUMENT (Figma 1153:5960) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="DOCUMENTS"
              title="How to tell whether your document is VBL or DRV"
              body="Start with the name on the document."
            />
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-gray-600">
            If you are not sure, start with the document you have.
            CompanyPension guides you through the right online process based on
            the wording on the document.
          </p>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                A DRV document may mention:
              </p>
              <div className="mt-6">
                <ChipList
                  items={[
                    'Deutsche Rentenversicherung',
                    'DRV',
                    'Rentenversicherung',
                    'Versicherungsverlauf',
                    'Renteninformation',
                    'statutory pension',
                    'state pension',
                    'Beitragserstattung',
                  ]}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-400 bg-white p-8">
              <p className="text-lg font-semibold text-brand">
                A VBL document may mention:
              </p>
              <div className="mt-6">
                <ChipList
                  items={[
                    'VBL',
                    'VBLklassik',
                    'VBLextra',
                    'Versorgungsanstalt des Bundes und der Länder',
                    'Zusatzversorgung',
                    'annual VBL statement',
                    'VBL Versicherungsnummer',
                    'employee contributions',
                    'public-sector supplementary pension',
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Start with my pension document
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- OTHER PENSION DOCUMENTS (Figma 1153:3100) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Other pension documents"
                title="What if your document is neither VBL nor DRV?"
              />
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                If your document shows a private-employer company pension — for
                example bAV, a Direktversicherung, Pensionskasse or provider
                name such as Allianz, AXA, Swiss Life, ERGO or BVV — it is
                usually a separate bAV cash-out case
              </p>
              <p>
                If your document shows ZVK, VddB or VddKO, it may belong to a
                separate contribution refund process.
              </p>
              <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row">
                <ArrowLink href={CP_CASHOUT_HREF}>
                  Check my company pension
                </ArrowLink>
                {/* ROUTE_ASSUMED: no dedicated "after leaving Germany" page
                    in this build; routed to the company-pension cash-out page. */}
                <ArrowLink href={CP_CASHOUT_HREF}>
                  Read company pension after leaving Germany
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- BANK ACCOUNT, TIMELINE AND PAYMENT (Figma 1153:2436) ----
          COPY-GOVERNANCE (client item 19): the design describes "a SEPA-capable
          EUR account" and does not use the "free EUR account" wording, so no
          "free"-drop transformation applies to this section. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
                Practical details
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">
                Bank account, timeline and payment
              </h2>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                If a VBL refund is approved, the money is paid directly to the
                bank account you provide. CompanyPension does not receive, hold
                or forward approved pension money.
              </p>
              <p>
                A German bank account is not always required. For many German
                pension cash-outs and refunds, a SEPA-capable EUR account is the
                most straightforward option.
              </p>
              <p>
                VBL and DRV follow separate timelines because they are handled
                by separate institutions. Completing one process does not
                automatically complete the other.
              </p>
              {/* ROUTE_PENDING: dedicated SEPA/timeline guide pages do not yet
                  exist in this build; links fall back to the funnel. */}
              <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row">
                <ArrowLink href={START_HREF}>
                  Read the SEPA bank account guide.
                </ArrowLink>
                <ArrowLink href={START_HREF}>
                  Read the timeline guide.
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- STARTING WITH YOUR VBL DOCUMENT (Figma 1153:5300) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="Starting online"
                title="What happens when you start with your VBL document?"
              />
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                CompanyPension uses the document wording to route your case.
              </p>
              <p>
                If your document shows VBL, VBLklassik or Versorgungsanstalt des
                Bundes und der Länder, you are routed into the VBL refund check.
              </p>
              <p>
                If your document shows DRV or Deutsche Rentenversicherung, you
                are routed toward information about the separate DRV refund
                process.
              </p>
              <p>
                If your document shows another company pension, the flow helps
                identify the relevant cash-out or refund process.
              </p>
              <div className="pt-2">
                <ArrowLink href={START_HREF}>
                  Start with my pension document
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT FITS YOUR DOCUMENT TABLE (Figma 1153:4575) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="VBL vs DRV — what fits your document?"
              body="Use this table to understand which process may apply"
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="VBL vs DRV — what fits your document?"
              columns={[
                'Document wording',
                'What it usually means',
                'Best next step',
              ]}
              rows={[
                {
                  label: 'VBL or VBLklassik',
                  values: [
                    'Public-sector company pension through VBL.',
                    'Start a VBL refund check.',
                  ],
                },
                {
                  label: 'VBLextra',
                  values: [
                    'A VBL product name that should be checked separately from VBLklassik.',
                    'Start with the VBL document and check the correct process.',
                  ],
                },
                {
                  label: 'Zusatzversorgung',
                  values: [
                    'Public-sector supplementary pension. It may be VBL or another ZVK.',
                    'Start with the document name.',
                  ],
                },
                {
                  label: 'DRV or Deutsche Rentenversicherung',
                  values: [
                    'Germany’s statutory state pension system.',
                    'Use the separate DRV refund process or compare company pension vs DRV.',
                  ],
                },
                {
                  label: 'Renteninformation or Versicherungsverlauf',
                  values: [
                    'Usually a statutory pension record from Deutsche Rentenversicherung.',
                    'Check DRV separately from company pensions.',
                  ],
                },
                {
                  label:
                    'bAV, a Direktversicherung, Pensionskasse or provider name',
                  values: [
                    'Usually a private-employer company pension / bAV case, not VBL or DRV.',
                    'Start a bAV cash-out check.',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- WHERE TO GO NEXT (Figma 1153:6046) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Related pages"
              title="Where to go next"
              body="Choose the page that matches your document or question."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RelatedCard
              title="VBL Pension Refund"
              body="For users with VBL or VBLklassik documents from public-sector employment."
              cta={{ label: 'Open VBL refund', href: VBL_REFUND_HREF }}
            />
            <RelatedCard
              title="Company Pension vs DRV"
              body="For users who want the broader explanation of why DRV refunds do not include company pensions."
              cta={{
                label: 'Compare company pension vs DRV',
                href: VS_DRV_HREF,
              }}
            />
            {/* ROUTE_ASSUMED: no dedicated "after leaving Germany" page yet. */}
            <RelatedCard
              title="Company Pension After Leaving Germany"
              body="For users who want the broader overview of what can happen to a German company pension after leaving Germany."
              cta={{ label: 'Open guide', href: CP_CASHOUT_HREF }}
            />
            {/* ROUTE_PENDING: dedicated documents guide page not in this build. */}
            <RelatedCard
              title="Documents guide"
              body="For users who want to know which document shows which pension type."
              cta={{ label: 'Open documents guide', href: START_HREF }}
            />
            <RelatedCard
              title="ZVK Refund"
              body="For users whose public-sector supplementary pension document says ZVK or Zusatzversorgungskasse."
              cta={{ label: 'Open ZVK refund', href: ZVK_HREF }}
            />
            {/* ROUTE_PENDING: dedicated SEPA bank account guide page not in this build. */}
            <RelatedCard
              title="SEPA bank account guide"
              body="For users who no longer have a German bank account or want to understand payment details."
              cta={{ label: 'Open bank account guide', href: START_HREF }}
            />
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Start with my pension document
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1153:6104) ----
          FAQ_ANSWER_PENDING: every FAQ item in this frame is a component
          instance carrying lorem defaults ("How do I pay for the…", "You can
          pay with a c…", "We need to add new u…") and the section heading is a
          stale instance ("Direktversicherung cash-out: common questions") from
          another page. Only the "FAQ" eyebrow is reliable. Questions and
          answers are UNVERIFIABLE from the XML and must not be invented — a
          backfill pass fills them once Figma access is restored. */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading eyebrow="FAQ" title="Common questions" />
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

      {/* ---- GLOSSARY (Figma 1153:6805) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="KEY TERMS"
              title="Glossary"
              body="Short definitions of VBL and DRV terms."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="DRV"
              body="Deutsche Rentenversicherung, Germany’s statutory state pension system. A DRV refund is separate from VBL."
            />
            <GlossaryCard
              term="VBL"
              body="Versorgungsanstalt des Bundes und der Länder. A public-sector company pension scheme used by many German public-sector and related employers."
            />
            <GlossaryCard
              term="VBLklassik"
              body="The main VBL occupational pension scheme for many public-sector employees. Contribution reimbursement follows VBL-specific rules."
            />
            <GlossaryCard
              term="VBLextra"
              body="A separate VBL product name that may appear on some VBL documents. It should be checked separately from VBLklassik."
            />
            <GlossaryCard
              term="Zusatzversorgung"
              body="German term for supplementary pension provision, often used in public-sector pension documents."
            />
            <GlossaryCard
              term="ZVK"
              body="Zusatzversorgungskasse. A public-sector supplementary pension fund. ZVK is related in topic to VBL but may be a different scheme."
            />
            <GlossaryCard
              term="Employee contributions"
              body="Contributions paid from the employee side. VBL contribution reimbursement generally focuses on eligible employee contributions."
            />
            <GlossaryCard
              term="Employer contributions"
              body="Contributions paid by the employer. In VBLklassik contribution reimbursement, employer-paid amounts are not refunded to the employee."
            />
          </div>
        </div>
      </section>

      {/* ---- IMPORTANT INFORMATION (Figma 1153:6904) ----
          REVIEW_META_PENDING: the design's "Source basis" block carries editorial
          placeholders ("[Add actual review date before publication]", "[Add
          reviewer name and role before publication]") which are omitted here
          until real review metadata is supplied. */}
      <ImportantCallout>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Important information
        </h2>
        <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
          <li>
            DRV and VBL are separate pension systems. A DRV refund covers
            statutory German state pension contributions paid into Deutsche
            Rentenversicherung. VBL is a separate public-sector company pension
            scheme and is not included in a DRV refund.
          </li>
          <li>
            VBL refunds follow VBL-specific rules. For VBLklassik, contribution
            reimbursement generally focuses on the employee’s own share, while
            employer-paid amounts are not refunded to the employee.
          </li>
          <li>
            CompanyPension uses document names, scheme names and guided
            questions to route users toward the correct online process. This
            page provides general information only and does not provide
            individual legal, pension, tax, insurance or financial advice.
          </li>
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
            approved, does not claim funds as a legal representative and does
            not receive, hold or forward approved pension money.
          </li>
        </ul>
        <div className="mt-8 rounded-2xl bg-white p-6 text-base leading-relaxed text-gray-600">
          If legal services are required for a specific case, they are carried
          out separately by the responsible legal partner.
        </div>
      </ImportantCallout>

      {/* ---- CLOSING CTA BAND (Figma 1153:6976) ---- */}
      <CtaBand
        eyebrow="Check what DRV did not cover"
        title="Have a VBL document and a DRV refund?"
        body="Start online with your VBL document, VBLklassik statement or pension letter. CompanyPension guides you through the separate VBL refund check and shows what information is still needed."
        cta={{ label: 'Check my VBL refund', href: START_HREF }}
        secondaryCta={{
          label: 'Compare company pension vs DRV',
          href: VS_DRV_HREF,
        }}
        note="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money"
      />
    </>
  );
}
