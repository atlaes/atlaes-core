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

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

// Funnel entry / eligibility-check CTAs route to the claim flow; calculator
// CTAs to /calculator. Cross-page links point at their sibling marketing
// routes (slugs match the Figma source file names).
const START_HREF = '/get-started';
const CALC_HREF = '/calculator';
const VS_DRV_HREF = '/company-pension-vs-drv';
const CASHOUTS_HREF = '/cash-outs-and-refunds';
const PRICING_HREF = '/pricing';
const VBL_HREF = '/vbl-refund';
const ZVK_HREF = '/zvk-refund';
const CASHOUT_HREF = '/company-pension-cash-out';
const FAQ_HREF = '/faq';

// ---------------------------------------------------------------------------
// Local, page-only building blocks
// ---------------------------------------------------------------------------

function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-gray-700">
          <img
            src="/marketing/icons/check-bullet.svg"
            alt=""
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
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
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/** Bordered card with a lead-in label and a checklist. */
function BulletCard({
  label,
  items,
  surface = 'neutral',
}: {
  label: string;
  items: ReactNode[];
  surface?: 'neutral' | 'white';
}) {
  const bg = surface === 'white' ? 'bg-white' : 'bg-neutral-50';
  return (
    <div className={`rounded-2xl border border-neutral-400 ${bg} p-8`}>
      <p className="text-lg font-semibold text-brand">{label}</p>
      <div className="mt-6">
        <CheckList items={items} />
      </div>
    </div>
  );
}

/** "Where to go next" cross-link card. */
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
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-6">
      <h3 className="text-lg font-semibold text-brand">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>
      <div className="mt-6 flex flex-1 items-end">
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 text-base font-semibold text-brand transition-colors hover:text-brand/70"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Figma frame 1080:5379 — "VddB & VddKO Refunds CompanyPension")
// Copy is verbatim from the design XML. This page covers BOTH VddB and VddKO;
// the two institutions are kept distinct wherever the design distinguishes
// them. Canvas pixel verification was unavailable (CloudFront 403); built
// XML-only. Governance/gap notes recorded in .superpowers/sdd/task-12-report.md.
// ---------------------------------------------------------------------------

export default function VddbVddkoRefundPage() {
  return (
    <>
      {/* ---- HERO (Figma 1080:5436) ---- */}
      <Hero
        eyebrow="VddB & VddKO REFUNDS"
        title="Claim your German stage or orchestra pension refund online"
        body="For VddB and VddKO pension refunds after theatre, stage, opera or orchestra employment in Germany. Start online, follow clear steps, sign digitally and avoid German pension paperwork where possible."
        primaryCta={{ label: 'Start VddB & VddKO Refunds', href: START_HREF }}
        secondaryCta={{ label: 'Check My Company Pension', href: START_HREF }}
        footnote={
          <p>
            If approved, the refund is paid directly into your own account.
            CompanyPension does not receive or hold your pension money.
          </p>
        }
      />

      {/* ---- HERO FOLLOW-ON: DRV-separation callout (Figma 1080:5807) ----
          Node 1080:10699 ("The key question is usually not whether…") is
          hidden="true" in the design and intentionally excluded. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mx-auto max-w-3xl rounded-2xl border border-brand/20 bg-neutral-50 p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-4 py-2 text-sm font-medium text-brand">
              <Info className="h-4 w-4" aria-hidden="true" />
              Important
            </span>
            <ul className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
              <li>
                VddB and VddKO refunds are separate from DRV, VBL, ZVK and bAV
                cash-outs.
              </li>
              <li>
                A German state pension refund through Deutsche
                Rentenversicherung does not automatically refund your VddB or
                VddKO contributions.
              </li>
              <li>
                If you worked in theatre, stage, opera or orchestra employment
                in Germany, you may need a separate VddB or VddKO refund
                process.
              </li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 text-base text-gray-600 sm:flex-row sm:flex-wrap sm:gap-6">
              <span>
                Already received your DRV refund?{' '}
                <Link
                  href={VS_DRV_HREF}
                  className="font-semibold text-brand underline underline-offset-4 hover:text-brand/70"
                >
                  Compare Company Pension vs DRV.
                </Link>
              </span>
              <span>
                Not sure what pension you have?{' '}
                <Link
                  href={CASHOUTS_HREF}
                  className="font-semibold text-brand underline underline-offset-4 hover:text-brand/70"
                >
                  See Cash-Outs &amp; Refunds.
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- QUICK ANSWER (Figma 1080:5821) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="QUICK ANSWER"
                title="Can I get a VddB or VddKO refund after leaving Germany?"
                body="Possibly. If you worked in theatre, stage, opera or orchestra employment in Germany, you may have paid into VddB or VddKO."
              />
              <div className="mt-8 flex flex-wrap gap-4">
                <ArrowLink href={START_HREF}>
                  Start VddB &amp; VddKO Refunds
                </ArrowLink>
                <OutlineLink href={VS_DRV_HREF}>
                  Compare Company Pension vs DRV
                </OutlineLink>
              </div>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                A refund or settlement can be possible if the scheme-specific
                rules are met. In general, these cases depend on your
                contribution months, whether you have left the relevant
                profession in Germany, whether you have been non-contributory
                for the required period and whether you already have or can
                still build a pension entitlement
              </p>
              <p>
                CompanyPension helps you check your VddB or VddKO refund online
                and continue with the right digital process if your case can be
                started.
              </p>
              <p>
                CompanyPension uses your pension document, provider name or
                scheme name to guide you into the right online process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHAT ARE VddB AND VddKO? (Figma 1080:10714) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="WHAT THEY ARE"
                title="What are VddB and VddKO?"
                body="VddB and VddKO are German pension institutions for performing-arts employment."
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  VddB stands for Versorgungsanstalt der deutschen Bühnen. It is
                  connected to stage, theatre, opera and similar employment.
                </p>
                <p>
                  VddKO stands for Versorgungsanstalt der deutschen
                  Kulturorchester. It is connected to musicians and other
                  employees in German cultural orchestras.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start With My Document</ArrowLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <BulletCard
                label="You may see these names on:"
                items={[
                  'VddB or VddKO pension letters',
                  'Bühnenversorgung or Orchesterversorgung documents',
                  'insurance numbers',
                  'membership documents',
                  'old payslips',
                  'employer documents',
                  'annual statements',
                  'refund or contribution documents',
                ]}
              />
              <InfoNote>
                If your document says VddB, Bühnenversorgung, VddKO or
                Orchesterversorgung, you are usually looking at a separate
                performing-arts pension refund case.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- WHO THIS PAGE IS FOR (Figma 1080:10775) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="WHO THIS PAGE IS FOR"
              title="This page is for stage, theatre, opera and orchestra workers"
              body="This page is for you if you worked in Germany and may have paid into VddB or VddKO."
            />
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-400 bg-white p-8">
            <p className="text-lg font-semibold text-brand">
              It is especially relevant if:
            </p>
            <div className="mt-6">
              <CheckList
                items={[
                  'you worked at a German theatre, stage, opera house or cultural orchestra',
                  'your documents mention VddB, VddKO, Bühnenversorgung or Orchesterversorgung',
                  'you left Germany and want to know whether those contributions can be refunded',
                  'you already received your DRV refund and want to check whether your stage or orchestra pension is separate',
                  'you are not sure whether your pension document is VddB, VddKO, VBL, ZVK, DRV or bAV',
                  'you had short-term German theatre, stage, opera or orchestra engagements and want to know whether contributions were paid',
                  'you want a guided English online process instead of dealing with German pension forms yourself',
                ]}
              />
            </div>
            <div className="mt-6">
              <InfoNote>
                VddB and VddKO are separate from your German state pension
                refund. You may need both processes.
              </InfoNote>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Check My VddB or VddKO Refund
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- WHAT CAN BE REFUNDED OR SETTLED? (Figma 1080:10821) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="REFUND OR SETTLEMENT"
                title="What can be refunded or settled?"
                body="VddB and VddKO cases can involve contribution reimbursement, severance payment or settlement depending on the scheme rules and your situation."
              />
              <p className="mt-6 text-base leading-relaxed text-gray-600">
                Older contributions paid before 1 January 2003 are usually
                handled as contribution reimbursement. Newer contributions may
                be handled differently and can depend on whether you have built,
                or can still build, a pension entitlement.
              </p>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start With My Document</ArrowLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <BulletCard
                label="In plain English, the result can depend on:"
                items={[
                  'which institution you paid into',
                  'when you paid contributions',
                  'how many contribution months you have',
                  'whether you permanently left the stage or orchestra profession in Germany',
                  'whether you have already become entitled to a pension',
                  'whether contribution periods can be recognised by another pension institution',
                ]}
              />
              <InfoNote>
                CompanyPension guides you through the questions needed to check
                the right refund or settlement process.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- ELIGIBILITY BASICS (Figma 1080:10931) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="ELIGIBILITY BASICS"
                title="When can a VddB or VddKO refund be possible?"
                body="VddB and VddKO refund cases depend on scheme-specific rules. A refund or settlement may be possible if the required contribution, waiting-period and status rules are met."
              />
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Check My Refund</ArrowLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <BulletCard
                surface="white"
                label="The main questions are usually:"
                items={[
                  'did you pay into VddB or VddKO for enough months?',
                  'have you permanently left the stage, theatre, opera or orchestra profession in Germany?',
                  'have you been without new VddB or VddKO contributions for the required period?',
                  'do you already have, or can you still build, a pension entitlement?',
                  'are your contribution periods recognised by another pension institution?',
                ]}
              />
              <InfoNote>
                For VddB and VddKO, different waiting-period thresholds can
                apply depending on when contributions were paid. The current
                framework refers to 120 contribution months overall, 60
                contribution months counted from 2001, or 36 contribution months
                counted from 2018.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 24-MONTH WAITING (Figma 1080:10970) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="24-MONTH WAITING"
                title="Do you need to wait 24 months?"
                body="In many VddB and VddKO refund cases, the 24-month non-contributory period is important."
              />
              <div className="mt-8">
                <ArrowLink href={START_HREF}>
                  Check My VddB or VddKO Refund
                </ArrowLink>
              </div>
            </div>
            <div className="space-y-6 text-base leading-relaxed text-gray-600">
              <p>
                In practical terms, this usually means: you have not paid new
                contributions for 24 months and have left the relevant stage,
                theatre, opera or orchestra profession in Germany
              </p>
              <InfoNote>
                This 24-month rule is separate from the DRV state pension refund
                process. Even if you already received a DRV refund, your VddB or
                VddKO refund still needs its own check.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- DRV VS VddB / VddKO (Figma 1087:101) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="DRV VS VddB / VddKO"
                title="Your DRV refund does not include VddB or VddKO"
              />
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                A DRV refund only covers your German state pension contributions
                paid into Deutsche Rentenversicherung
              </p>
              <p>
                It does not automatically refund your VddB or VddKO
                contributions.
              </p>
              <p>
                This is a common misunderstanding for expats who worked in
                Germany and paid into more than one pension system. You may
                receive a DRV refund and still have a separate performing-arts
                pension refund to check.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <OutlineLink href={VS_DRV_HREF}>
                  Compare Company Pension vs DRV
                </OutlineLink>
                <ArrowLink href={START_HREF}>
                  Start VddB &amp; VddKO Refunds
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- NOT VBL OR ZVK (Figma 1089:1454) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="NOT VBL OR ZVK"
                title="Are VddB and VddKO the same as VBL or ZVK?"
                body="No. VddB and VddKO are not the same as VBL or ZVK."
              />
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start With My Document</ArrowLink>
              </div>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                VBL and ZVK are public-sector supplementary pension schemes
                often connected to universities, research institutes, hospitals
                and public employers.
              </p>
              <p>
                VddB and VddKO are specialised pension institutions for stage,
                theatre, opera and orchestra employment.
              </p>
              <p>
                If you also contributed to VBL or the other performing-arts
                institution, your contribution periods may be counted together
                in some cases.
              </p>
              <InfoNote>
                For users, the practical point is simple: your document name
                matters. If it says VddB or VddKO, start with the VddB/VddKO
                refund process.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CROSS-BORDER WORK (Figma 1089:2120) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="CROSS-BORDER WORK"
                title="What if you worked in Germany but lived abroad?"
                body="Performing artists, musicians and theatre professionals often work across borders. You may have had short German engagements while living elsewhere, or you may have moved abroad after your German contract ended."
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-600">
                <p>
                  A VddB or VddKO refund can still be relevant if contributions
                  were paid into the German performing-arts pension institution.
                </p>
                <p>
                  The key question is not only where you lived. It is whether
                  your German employment or engagement created VddB or VddKO
                  contributions.
                </p>
              </div>
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start With My Document</ArrowLink>
              </div>
            </div>
            <BulletCard
              surface="white"
              label="Helpful signs include:"
              items={[
                'your payslip shows VddB, VddKO, Bühnenversorgung or Orchesterversorgung',
                'your employer was a German theatre, opera house, stage employer or cultural orchestra',
                'you received a pension document from VddB or VddKO',
                'your employment contract or payroll documents mention the relevant pension institution',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- HOW COMPANYPENSION HELPS — 6 STEPS (Figma 1089:2155) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="HOW COMPANYPENSION HELPS"
              title="A guided online process for VddB and VddKO refunds"
              body="CompanyPension helps you start your VddB or VddKO refund process online. You start with your pension document, answer simple questions in English, sign online where required and continue without dealing with German pension paperwork yourself."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StepCard
              number="01"
              title="Choose VddB or VddKO"
              body="Start with the name shown on your document: VddB, Bühnenversorgung, VddKO or Orchesterversorgung."
            />
            <StepCard
              number="02"
              title="Answer guided questions"
              body="The online flow asks for your work history, contribution information and whether you left the relevant profession in Germany."
            />
            <StepCard
              number="03"
              title="Add your documents"
              body="Upload the pension letters, payslips or employer documents you have."
            />
            <StepCard
              number="04"
              title="Review and sign online"
              body="Check your details and sign online where required."
            />
            <StepCard
              number="05"
              title="Provider follow-up runs through CompanyPension"
              body="Messages from the pension institution run through CompanyPension, with human oversight when clarification, translation or follow-up is needed."
            />
            <StepCard
              number="06"
              title="Receive approved funds directly"
              body="If approved, the refund or settlement is paid directly into your own account. CompanyPension does not receive or hold your pension money."
            />
          </div>
          <div className="mt-10 flex flex-col items-center gap-4">
            <ArrowLink href={START_HREF}>
              Start VddB &amp; VddKO Refunds
            </ArrowLink>
            <p className="text-sm leading-relaxed text-gray-600">
              CompanyPension does not receive or hold approved pension money.
            </p>
          </div>
        </div>
      </section>

      {/* ---- DOCUMENTS (Figma 1089:2250) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                eyebrow="DOCUMENTS"
                title="What documents are usually needed?"
                body="You can start with whatever documents you have. CompanyPension will show what is still missing during the online process."
              />
              <div className="mt-8">
                <ArrowLink href={START_HREF}>Start With My Document</ArrowLink>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <BulletCard
                surface="white"
                label="Helpful documents can include:"
                items={[
                  'VddB or VddKO letters',
                  'Bühnenversorgung or Orchesterversorgung documents',
                  'insurance or membership number',
                  'old payslips showing pension contributions',
                  'employment contracts or employer confirmations',
                  'documents showing when your stage, theatre, opera or orchestra employment ended',
                  'bank details',
                  'passport or ID copy',
                  'DRV refund confirmation, if you already received a German state pension refund',
                ]}
              />
              <InfoNote>
                Do not worry if you do not have every document yet. Start with
                what you have, and CompanyPension will show you what is still
                missing.
              </InfoNote>
            </div>
          </div>
        </div>
      </section>

      {/* ---- PRICING (Figma 1092:2299) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="PRICING"
              title="Pricing for VddB and VddKO refunds"
              body="CompanyPension shows the relevant pricing before you continue into the full VddB or VddKO refund process."
            />
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-neutral-400 bg-neutral-50 p-8 text-center">
            <p className="text-base leading-relaxed text-gray-600">
              Pricing for VddB and VddKO refund cases follows the refund pricing
              shown on our Pricing page, unless your case requires a different
              process. You will see the applicable pricing before you continue.
            </p>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The approved refund or settlement is paid directly into your own
              account. CompanyPension does not receive or hold your pension
              money.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <OutlineLink href={PRICING_HREF}>See Pricing</OutlineLink>
              <ArrowLink href={START_HREF}>
                Start VddB &amp; VddKO Refunds
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---- COMPARISON TABLE (Figma 1098:95 / table 1098:114) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Compare"
              title="VddB, VddKO, DRV, VBL and bAV — what is the difference?"
              body="A DRV refund and a company pension refund or cash-out are separate processes. This table shows the practical difference."
            />
          </div>
          <div className="mt-12">
            <ComparisonTable
              caption="VddB, VddKO, DRV, VBL and bAV — what is the difference?"
              columns={['Term', 'What it means', 'Best next step']}
              rows={[
                {
                  label: 'VddB / Bühnenversorgung',
                  values: [
                    'Pension institution for stage, theatre and opera employment.',
                    'Start a VddB refund check.',
                  ],
                },
                {
                  label: 'VddKO / Orchesterversorgung',
                  values: [
                    'Pension institution for German cultural orchestra employment.',
                    'Start a VddKO refund check.',
                  ],
                },
                {
                  label: 'DRV',
                  values: [
                    'Germany’s statutory state pension system. A DRV refund does not include VddB or VddKO.',
                    'Use the separate DRV refund process or compare Company Pension vs DRV.',
                  ],
                },
                {
                  label: 'VBL / ZVK',
                  values: [
                    'Public-sector supplementary pension schemes, usually handled as separate refund cases.',
                    'Start a VBL or ZVK refund.',
                  ],
                },
                {
                  label: 'bAV',
                  values: [
                    'German company pension from an employer, often handled as a cash-out case.',
                    'Start a bAV cash-out check.',
                  ],
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---- RELATED PAGES (Figma 1118:2230) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Related pages"
              title="Where to go next"
              body="Use these pages if you already know your provider, scheme or question."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RelatedCard
              title="Company Pension vs DRV"
              body="For users who want to understand why a DRV refund does not include VddB, VddKO or other company pensions."
              cta={{
                label: 'Compare Company Pension vs DRV',
                href: VS_DRV_HREF,
              }}
            />
            <RelatedCard
              title="Cash-Outs & Refunds"
              body="For a full overview of CompanyPension’s German company pension cash-outs and refunds."
              cta={{ label: 'See Cash-Outs & Refunds', href: CASHOUTS_HREF }}
            />
            <RelatedCard
              title="Company Pension Refund Calculator"
              body="For VBL, ZVK, VddB and VddKO refund estimates."
              cta={{ label: 'Estimate a Refund', href: CALC_HREF }}
            />
            <RelatedCard
              title="VBL Pension Refund"
              body="For VBL refund cases after public-sector or university employment."
              cta={{ label: 'Open VBL refund', href: VBL_HREF }}
            />
            <RelatedCard
              title="ZVK Refund"
              body="For ZVK or Zusatzversorgungskasse refund cases."
              cta={{ label: 'Open ZVK refund', href: ZVK_HREF }}
            />
            <RelatedCard
              title="Company Pension Cash-Out"
              body="For bAV, Direktversicherung, Pensionskasse, Pensionsfonds and provider-based company pension cash-outs."
              cta={{
                label: 'Open Company Pension Cash-Out',
                href: CASHOUT_HREF,
              }}
            />
          </div>
          <div className="mt-10 flex justify-center">
            <ArrowLink href={START_HREF}>
              Start with my pension document
            </ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1099:1185) ----
          FAQ_ANSWER_PENDING: every FAQ item in this frame is a component
          instance carrying lorem defaults ("How do I pay for the…", "You can
          pay with a c…", "We need to add new u…", "My team wants to can…").
          Only the section heading and eyebrow are non-instance verbatim copy.
          Questions and answers are UNVERIFIABLE from the XML and must not be
          invented — backfilled once Figma access is restored. */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="FAQ"
              title="VddB and VddKO refunds: common questions"
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

      {/* ---- GLOSSARY (Figma 1101:95) ----
          GOVERNANCE FLAG: two source cards carry mismatched term/definition
          pairs (rendered verbatim as grouped in the design, never re-paired):
          - "DRV" carries a definition describing a public-sector/ZVK scheme
            ("often shown as Zusatzversorgungskasse").
          - A duplicate "Beitragserstattung" card carries the DRV definition.
          There is no standalone "ZVK" card despite ZVK being referenced. Flagged
          for client/design correction in task-12-report.md. */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="KEY TERMS"
              title="Glossary"
              body="Short definitions of terms you may see on German performing-arts pension documents."
            />
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlossaryCard
              term="VddB"
              body="Versorgungsanstalt der deutschen Bühnen. A German pension institution for stage, theatre, opera and similar employment."
            />
            <GlossaryCard
              term="Bühnenversorgung"
              body="German term often used for VddB, the stage pension institution."
            />
            <GlossaryCard
              term="VddKO"
              body="Versorgungsanstalt der deutschen Kulturorchester. A German pension institution for cultural orchestra employment."
            />
            <GlossaryCard
              term="Orchesterversorgung"
              body="German term often used for VddKO, the orchestra pension institution."
            />
            <GlossaryCard
              term="Beitragserstattung"
              body="Contribution reimbursement. In this context, it can refer to getting eligible contributions back from VddB or VddKO."
            />
            <GlossaryCard
              term="Abfindung"
              body="A settlement or one-time payout. In VddB and VddKO cases, it may appear together with contribution reimbursement rules."
            />
            <GlossaryCard
              term="DRV"
              body="A company pension scheme connected to public-sector employment, often shown as Zusatzversorgungskasse."
            />
            <GlossaryCard
              term="VddB / VddKO"
              body="Pension institutions for stage, theatre, opera and orchestra employment."
            />
            <GlossaryCard
              term="Beitragserstattung"
              body="Deutsche Rentenversicherung, Germany’s statutory state pension system. A DRV refund is separate from VddB and VddKO."
            />
            <GlossaryCard
              term="VBL / ZVK"
              body="Public-sector supplementary pension schemes. They are separate from VddB and VddKO, although contribution periods may sometimes matter for recognition."
            />
          </div>
        </div>
      </section>

      {/* ---- SOURCE BASIS (Figma 1102:203) ----
          PUBLICATION_PENDING: "LAST REVIEWED" and "REVIEWED BY" carry
          bracketed placeholders in the design; rendered verbatim and flagged
          for the client to complete before publication. */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-16 sm:py-20`}>
          <div className="mx-auto max-w-3xl">
            <span className="mb-5 inline-flex items-center rounded-full border border-brand/25 bg-white px-4 py-2 text-sm font-medium text-brand">
              SOURCE BASIS
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-brand sm:text-3xl">
              Source basis
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-gray-600">
              <p>
                VddB and VddKO refunds follow the rules of their respective
                pension institutions. Official VddB and VddKO materials describe
                contribution reimbursement and severance-payment rules,
                including contribution-month requirements, a 24-month
                non-contributory period in certain cases, application
                requirements and situations where contribution periods may be
                recognised elsewhere.
              </p>
              <p>
                CompanyPension uses these categories to guide users toward the
                correct online process. This page does not provide individual
                legal, pension, tax or financial advice.
              </p>
            </div>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold uppercase tracking-wide text-brand">
                  LAST REVIEWED
                </dt>
                <dd className="mt-2 text-base text-gray-600">
                  [Add actual review date before publication]
                </dd>
              </div>
              <div>
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

      {/* ---- IMPORTANT INFORMATION (Figma 1102:258) ---- */}
      <ImportantCallout>
        <ul className="mt-2 space-y-4 text-base leading-relaxed text-gray-600">
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

      {/* ---- CLOSING CTA BAND (Figma 1102:271) ---- */}
      <CtaBand
        title="Ready to check your VddB or VddKO refund?"
        body="Start online with your VddB, VddKO, Bühnenversorgung or Orchesterversorgung document. CompanyPension guides you through the right refund process and shows what information is still needed."
        cta={{ label: 'Start VddB & VddKO Refunds', href: START_HREF }}
        secondaryCta={{ label: 'Estimate a Refund', href: CALC_HREF }}
      />
    </>
  );
}
