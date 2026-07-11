import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BadgeEuro,
  Calculator,
  Check,
  ClipboardCheck,
  Drama,
  Info,
  Landmark,
  Laptop,
  MessageCircle,
  Undo2,
  Wallet,
  Waypoints,
} from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

/**
 * Home FAQ (Figma 1178:541, transcribed from the rendered canvas — the XML
 * export only carries un-overridden component defaults). Q1's answer is shown
 * expanded in the design. Q3's answer is the verbatim transcription of the
 * identical question on the how-it-works frame (its item 1, expanded there).
 * The design shows the remaining items collapsed, so their answers are not
 * readable from the anonymous Figma view; until the client supplies them,
 * those items point to the FAQ page. FLAGGED as a copy gap in the task report.
 */
const FAQ_ANSWER_PENDING = (
  <p>
    You can find the answer on our{' '}
    <Link href="/faq" className="font-semibold text-brand underline">
      FAQ page
    </Link>
    .
  </p>
);

const HOME_FAQ_ITEMS: FaqAccordionItem[] = [
  {
    question: 'Can I get money back from my German company pension?',
    answer: (
      <>
        <p>
          It may be possible, depending on the type of pension and the
          applicable rules.
        </p>
        <p className="mt-2">
          VBL, ZVK, VddB and VddKO cases are usually handled as contribution
          refunds. bAV cases from Allianz, AXA, Swiss Life, ERGO, R+V,
          Nürnberger, HDI, BVV and other providers need a separate cash-out
          check.
        </p>
      </>
    ),
  },
  {
    question:
      'I already received a German state pension refund. Can I also get money from my company pension?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Do I need to use the calculator first?',
    answer: (
      <>
        <p>
          No. You can start your claim directly if you already know your pension
          type or provider.
        </p>
        <p className="mt-2">
          The quick check is helpful if you want a refund estimate first or want
          to see whether your bAV cash-out can be started.
        </p>
      </>
    ),
  },
  {
    question: 'How long does it usually take?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Do I need a German bank account?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Can I cash out a bAV after leaving Germany?',
    answer: FAQ_ANSWER_PENDING,
  },
  {
    question: 'Will CompanyPension receive my pension money?',
    answer: FAQ_ANSWER_PENDING,
  },
];

// ---------------------------------------------------------------------------
// Local, page-only card shapes (richer than the shared FeatureCard).
// ---------------------------------------------------------------------------

function ArrowLink({
  href,
  children,
  variant = 'solid',
}: {
  href: string;
  children: ReactNode;
  variant?: 'solid' | 'ghost';
}) {
  if (variant === 'ghost') {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-base font-semibold text-brand transition-colors hover:text-brand/70"
      >
        {children}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }
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

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-brand bg-neutral-50 px-4 py-3 text-sm text-gray-600">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-gray-700">
          <Check
            className="mt-0.5 h-5 w-5 shrink-0 text-brand"
            aria-hidden="true"
          />
          <span className="text-base">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-brand">
      {children}
    </div>
  );
}

/** Funnel route card (Get started section). */
function FunnelCard({
  icon,
  title,
  body,
  bulletsLabel,
  bullets,
  cta,
  note,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  bulletsLabel: string;
  bullets: string[];
  cta: { label: string; href: string };
  note?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <IconCircle>{icon}</IconCircle>
      <h3 className="text-2xl font-semibold text-brand">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
      <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {bulletsLabel}
      </p>
      <div className="mt-4">
        <Bullets items={bullets} />
      </div>
      {note ? (
        <div className="mt-6">
          <InfoNote>{note}</InfoNote>
        </div>
      ) : null}
      <div className="mt-8 flex flex-1 items-end">
        <Link
          href={cta.href}
          className="w-full rounded-brand bg-accent px-6 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

/** Pension-type chooser card (dual links). */
function PensionCard({
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-accent">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold text-brand">{title}</h3>
      <p className="mt-4 flex-1 text-base leading-relaxed text-gray-600">
        {body}
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <ArrowLink href={primary.href}>{primary.label}</ArrowLink>
        <ArrowLink href={secondary.href} variant="ghost">
          {secondary.label}
        </ArrowLink>
      </div>
    </div>
  );
}

/** Numbered process step card (How it works). */
function StepCard({
  number,
  title,
  body,
  className = '',
}: {
  number: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-neutral-400 bg-white p-8 ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute right-6 top-6 text-4xl font-bold text-accent"
      >
        {number}
      </span>
      <h3 className="mt-10 text-xl font-semibold text-brand">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/** Pricing plan card (Transparent pricing, on dark background). */
function PricingCard({
  title,
  subtitle,
  bullets,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8 text-left shadow-sm">
      <h3 className="text-2xl font-semibold text-brand">{title}</h3>
      <p className="mt-4 text-base text-gray-600">{subtitle}</p>
      <hr className="my-6 border-neutral-400" />
      <Bullets items={bullets} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ---- HERO (Figma 1181:1997) ---- */}
      <Hero
        eyebrow="Worked in Germany and have a company pension?"
        title="Cash out or refund your German"
        highlight="company pension online"
        body="For bAV cash-outs and VBL, ZVK, VddB and VddKO refunds. Check your case, add your documents, sign and submit online, with human support when clarification or follow-up is needed."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
        footnote={
          <>
            <p>
              Supports bAV documents from Allianz, AXA, Swiss Life, ERGO, R+V,
              Nürnberger, HDI, BVV and other German pension or insurance
              providers.
            </p>
            <p className="mt-1">
              Also supports VBL, ZVK, VddB and VddKO refund cases.
            </p>
          </>
        }
      />

      {/* ---- HERO APP MOCKUPS (Figma 1181:2451 + 1181:2365) ----
          Two app-UI windows anchored to the bottom of the dark hero, per the
          design. The exported PNGs are pre-clipped at the hero's bottom edge
          (flat bottoms), so the windows are bottom-aligned; the taller "refund
          submitted" window extends higher and starts ~53px above the sign-in
          window. Design frame (1920px): left window x=390 w=562, right window
          x=972 w=559, ~20px gap, the ~1141px block sits centered. Composed here
          (not via the Hero image prop, which is a single centered image) so the
          shared Hero stays unchanged for other pages. */}
      <section className="relative -mt-8 overflow-hidden bg-brand sm:-mt-14">
        {/* Softer light bloom in the bottom-right, continuing the hero's
            diagonal glow behind the tablet mockups so they read as one
            integrated hero rather than a separate band. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 bottom-0 h-[560px] w-[920px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(159,232,112,0.16) 0%, transparent 70%)',
          }}
        />
        <div className={`relative ${CONTAINER} pt-0`}>
          {/* lg+: side-by-side, bottom-aligned, at design proportions */}
          <div className="relative mx-auto hidden aspect-[1141/370] w-full max-w-[1141px] lg:block">
            <Image
              src="/marketing/home/hero-mockup-secure-claim.png"
              alt="CompanyPension app — create your secure claim sign-in screen"
              width={562}
              height={317}
              priority
              className="absolute bottom-0 left-0 h-auto w-[49.25%] drop-shadow-2xl"
            />
            <Image
              src="/marketing/home/hero-mockup-refund-submitted.png"
              alt="CompanyPension app — refund request submitted confirmation screen"
              width={559}
              height={370}
              priority
              className="absolute bottom-0 right-0 h-auto w-[48.99%] drop-shadow-2xl"
            />
          </div>

          {/* < lg: stacked single column, no horizontal overflow */}
          <div className="mx-auto flex max-w-[562px] flex-col gap-6 lg:hidden">
            <Image
              src="/marketing/home/hero-mockup-secure-claim.png"
              alt="CompanyPension app — create your secure claim sign-in screen"
              width={562}
              height={317}
              className="h-auto w-full drop-shadow-2xl"
            />
            <Image
              src="/marketing/home/hero-mockup-refund-submitted.png"
              alt="CompanyPension app — refund request submitted confirmation screen"
              width={559}
              height={370}
              className="h-auto w-full drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ---- GET STARTED (Figma 1171:393) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="Get started"
              title="Start your claim or estimate your refund first"
              body="Ready to begin? Start the claim flow for a bAV cash-out or company pension refund. For VBL, ZVK, VddB or VddKO, you can also calculate a first refund estimate before continuing."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <FunnelCard
              icon={<ClipboardCheck className="h-8 w-8" aria-hidden="true" />}
              title="Start your cash-out or refund"
              body="Answer a few guided questions or upload your pension document. If your case may be possible, create secure access and continue with the full online process."
              bulletsLabel="Use this route for:"
              bullets={[
                'bAV and provider-based company pension cash-outs',
                'VBL and ZVK refunds',
              ]}
              cta={{ label: 'Start your claim', href: '/get-started' }}
            />
            <FunnelCard
              icon={<Calculator className="h-8 w-8" aria-hidden="true" />}
              title="Estimate your refund first"
              body="Upload a pension document or enter your information manually to get a first refund estimate. You can continue into the full online process afterwards."
              bulletsLabel="Available for:"
              bullets={['VBL', 'ZVK', 'VddB', 'VddKO']}
              note="The refund calculator is not available for bAV cash-outs."
              cta={{ label: 'Calculate my refund', href: '/calculator' }}
            />
          </div>
        </div>
      </section>

      {/* ---- CHOOSE YOUR PENSION (Figma 1172:1158) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="text-brand">
              <SectionHeading
                align="left"
                title="Choose your German company pension"
                body="Start with the pension scheme, provider or contract type you recognize from your documents."
              />
            </div>
            <PensionCard
              icon={<Wallet className="h-8 w-8" aria-hidden="true" />}
              title="bAV / Company pension cash-out"
              body="Have a bAV or company pension from a previous job in Germany? Check whether a cash-out may be possible, including contracts from Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV and other providers."
              primary={{ label: 'Start bAV cash-out', href: '/get-started' }}
              secondary={{
                label: 'Learn about bAV cash-outs',
                href: '/how-it-works',
              }}
            />
            <PensionCard
              icon={<Landmark className="h-8 w-8" aria-hidden="true" />}
              title="VBL & ZVK refunds"
              body="Paid into VBLklassik, a ZVK or another public-sector company pension while working in Germany? Start your refund online and apply to get eligible employee contributions back."
              primary={{ label: 'Start VBL/ZVK refund', href: '/get-started' }}
              secondary={{
                label: 'Read VBL refund guide',
                href: '/how-it-works',
              }}
            />
            <PensionCard
              icon={<Drama className="h-8 w-8" aria-hidden="true" />}
              title="VddB & VddKO refunds"
              body="Worked in theatre, opera, musicals, dance or orchestra employment and paid into VddB or VddKO? Start your refund online through a guided digital flow."
              primary={{
                label: 'Start VddB/VddKO refund',
                href: '/get-started',
              }}
              secondary={{
                label: 'Learn about VddB/VddKO refunds',
                href: '/how-it-works',
              }}
            />
          </div>
        </div>
      </section>

      {/* ---- WHAT COMPANYPENSION DOES (Figma 1174:1243) ---- */}
      <section className="relative overflow-hidden bg-brand text-white">
        <Image
          src="/marketing/home/home-asset-13.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover object-left opacity-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/70 via-brand/90 to-brand"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              What CompanyPension does
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
            <FeatureRow
              icon={<Waypoints className="h-8 w-8" aria-hidden="true" />}
              title="Smart guided process"
              body="Start online and follow clear steps for your bAV cash-out or company pension refund."
            />
            <FeatureRow
              icon={<Laptop className="h-8 w-8" aria-hidden="true" />}
              title="Digital application and signing"
              body="The platform uses the information you provide to complete your application. You review and sign it yourself before it is technically transmitted to the relevant provider or pension scheme."
            />
            <FeatureRow
              icon={<MessageCircle className="h-8 w-8" aria-hidden="true" />}
              title="Human support when needed"
              body="Human support is available when clarification, translation or follow-up is needed."
            />
            <FeatureRow
              icon={<BadgeEuro className="h-8 w-8" aria-hidden="true" />}
              title="Money paid to your account"
              body="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
        </div>
      </section>

      {/* ---- REFUND OR CASH-OUT (Figma 1174:1350) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              title="Refund or cash-out — what is the difference?"
              body="German company pensions are not all handled in the same way. Some cases involve a refund of eligible employee contributions. Others involve a possible bAV cash-out."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <IconCircle>
                <Undo2 className="h-8 w-8" aria-hidden="true" />
              </IconCircle>
              <h3 className="text-2xl font-semibold text-brand">Refund</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A refund means claiming back eligible employee contributions
                from a contribution-based pension scheme.
              </p>
              <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
                This usually applies to:
              </p>
              <div className="mt-4">
                <Bullets items={['VBL', 'ZVK', 'VddB', 'VddKO']} />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              <IconCircle>
                <BadgeEuro className="h-8 w-8" aria-hidden="true" />
              </IconCircle>
              <h3 className="text-2xl font-semibold text-brand">Cash-out</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A cash-out means requesting a one-time payout from a bAV from a
                previous job. It may involve a Direktversicherung,
                Pensionskasse, Pensionsfonds or another provider-based company
                pension.
              </p>
              <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
                This usually applies to:
              </p>
              <div className="mt-4">
                <Bullets
                  items={[
                    'Allianz',
                    'AXA',
                    'Swiss Life',
                    'ERGO',
                    'R+V',
                    'Nürnberger',
                    'HDI',
                    'BVV',
                    'other providers Direktversicherung',
                    'other insurance-based bAV contracts',
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <ArrowLink href="/how-it-works">See what applies to you</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- DRV vs COMPANY PENSION (Figma 1174:1539) ---- */}
      <section className="relative overflow-hidden bg-brand text-white">
        <Image
          src="/marketing/home/home-asset-15.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover opacity-[0.18]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-brand/80"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <SectionHeading
              eyebrow="Company pension vs DRV"
              title="Your DRV refund does not include your company pension"
            />
            <div className="mt-8 space-y-5 text-base leading-relaxed text-white/80">
              <p>
                Your German state pension and your company pension are two
                separate systems.
              </p>
              <p>
                A DRV refund only covers eligible statutory pension
                contributions paid into Deutsche Rentenversicherung. It does not
                automatically include a bAV, Direktversicherung, VBL, ZVK, VddB
                or VddKO pension.
              </p>
              <p>
                If you paid into both systems, your company pension needs a
                separate cash-out or refund process.
              </p>
            </div>
            <div className="mt-9">
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-brand bg-accent px-6 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
              >
                Compare company pension and DRV
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS (Figma 1174:1679) ---- */}
      <section className="bg-neutral-50">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="text-brand">
            <SectionHeading
              align="left"
              title="How it works"
              body="A guided online process from the first check to signing, submission and provider follow-up."
            />
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <StepCard
              number="01"
              title="Check what can be started"
              body="Choose your pension type or provider and answer a few questions. The platform checks whether a bAV cash-out or refund may be possible."
            />
            <StepCard
              number="02"
              title="Secure your claim"
              body="Create secure access, review the pricing and pay the €199 deposit to activate the full process. The deposit is credited toward your final service fee."
            />
            <StepCard
              number="03"
              title="Add your documents and details"
              body="Add your ID, bank account and pension information from documents such as a VBL letter, provider statement, bAV contract or Direktversicherung document."
            />
            <StepCard
              number="04"
              title="Review, sign and submit online"
              body="Check your details and sign the application yourself. After you sign, ATLAES GmbH technically transmits it to the relevant provider or pension scheme."
            />
            <StepCard
              number="05"
              title="Provider review and payout"
              body="The provider or pension scheme reviews your request. Correspondence can run through CompanyPension when clarification or follow-up is needed. If approved, the money is paid directly to the bank account you provide."
              className="md:col-span-2 md:mx-auto md:w-[calc(50%-12px)]"
            />
          </div>

          <div className="mt-12 flex justify-center">
            <ArrowLink href="/how-it-works">See the full process</ArrowLink>
          </div>
        </div>
      </section>

      {/* ---- ESTIMATE BEFORE YOU BEGIN (Figma 1174:1814) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="relative grid items-stretch overflow-hidden rounded-2xl bg-brand text-white lg:grid-cols-2">
            <div className="relative min-h-[320px] lg:min-h-[440px]">
              <Image
                src="/marketing/shared/guided-process-smiling-man-laptop.png"
                alt="Person holding a laptop, checking a company pension refund"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="p-8 sm:p-10">
              <SectionHeading
                align="left"
                eyebrow="Want an estimate before you begin?"
                title="Estimate your company pension refund"
              />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-white/80">
                <p>
                  For VBL, ZVK, VddB or VddKO, upload a pension document or
                  enter your information manually to get a first refund
                  estimate.
                </p>
                <p>
                  You can continue into the full online process afterwards if
                  the result looks relevant.
                </p>
              </div>
              <div className="mt-6">
                <InfoNote>
                  Refund estimates are not available for bAV cash-outs.
                </InfoNote>
              </div>
              <div className="mt-8">
                <ArrowLink href="/calculator">Start quick check</ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- TRANSPARENT PRICING (Figma 1178:87) ---- */}
      <section className="relative overflow-hidden bg-neutral-50 text-brand">
        <Image
          src="/marketing/shared/advisors-reviewing-documents-desk.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover opacity-[0.08]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-neutral-50/60"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading
              title="Transparent pricing"
              body="Start with a €199 deposit. Our success fee is 9.75% of the approved cash-out or refund amount, with a minimum total service fee of €199. Your deposit is credited toward the final fee."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <PricingCard
              title="bAV cash-outs"
              subtitle="For bAV cash-outs from Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV and other providers:"
              bullets={[
                'Start with a €199 deposit',
                '9.75% success fee if the cash-out is approved',
                'Minimum total service fee: €199',
                'Your deposit is credited toward the final fee',
                'If the cash-out cannot be submitted after review, €79 is retained and €120 is refunded',
              ]}
            />
            <PricingCard
              title="VBL, ZVK, VddB and VddKO refunds"
              subtitle="For eligible contribution-refund cases:"
              bullets={[
                'Start with a €199 deposit',
                '9.75% success fee if the refund is approved',
                'Minimum total service fee: €199',
                'Your deposit is credited toward the final fee',
                'If the pension institution rejects your completed and submitted refund request, the €199 deposit is refunded in full',
              ]}
            />
          </div>

          <div className="mt-10 flex flex-col items-center gap-6 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-brand bg-accent px-6 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              View pricing details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1178:541 — real copy from rendered canvas) ---- */}
      <section className="bg-brand text-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <SectionHeading title="Frequently asked questions" />
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <FaqAccordion items={HOME_FAQ_ITEMS} defaultOpenIndex={0} />
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              href="/faq"
              className="rounded-brand bg-accent px-16 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Go to FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* ---- DRV refund and bAV cash-out (Figma 1179:1874) ---- */}
      <section className="relative overflow-hidden bg-neutral-50">
        <Image
          src="/marketing/shared/berlin-landmark-building-landscape.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover object-right opacity-[0.12]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-neutral-50/40 via-neutral-50/85 to-neutral-50"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center text-brand">
            <SectionHeading
              eyebrow="DRV refund and bAV cash-out"
              title="A DRV refund can create the basis for a bAV lump-sum settlement"
              body="For many vested bAV entitlements, a cash-out is not available simply because you left Germany. An approved DRV refund may first be required."
            />
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-5 text-base leading-relaxed text-gray-600">
            <p>
              Already received your DRV refund? Your vested bAV may now qualify
              for a separate lump-sum settlement.
            </p>
            <p>
              However, once your contributions to Deutsche Rentenversicherung
              have been refunded, §3(3) BetrAVG can provide the basis for
              requesting a lump-sum settlement of a vested bAV entitlement.
            </p>
            <p>
              The DRV refund does not automatically pay out your company
              pension. After the DRV refund has been approved, a separate
              request must still be made to the employer, insurance company or
              pension provider responsible for the bAV.
            </p>
            <p>
              CompanyPension checks whether your DRV refund status may be
              relevant to your bAV case and guides you through the separate
              online request.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-brand bg-accent px-6 py-4 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Check my bAV cash-out
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-brand border border-brand/30 px-6 py-4 text-base font-semibold text-brand transition-colors hover:bg-brand/5"
            >
              Check state pension refund &amp; bAV cash-out
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1179:1923) ---- */}
      <CtaBand
        title="Ready to start your company pension claim?"
        body="Start the guided claim flow for a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note="The refund calculator is available for VBL, ZVK, VddB and VddKO cases. It is not used for bAV cash-outs."
      />
    </>
  );
}

/** Small icon + title + body row used in the "What CompanyPension does" grid. */
function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
      </div>
    </div>
  );
}
