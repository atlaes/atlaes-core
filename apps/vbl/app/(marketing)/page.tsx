import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Info } from 'lucide-react';
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
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-gray-700">
          {/* Figma green-circle check (node 1172:1034) — brand circle +
              accent tick baked into the SVG. eslint-disable-next-line
              @next/next/no-img-element */}
          <img
            src="/marketing/icons/check-bullet.svg"
            alt=""
            aria-hidden="true"
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span className="text-base">{item}</span>
        </li>
      ))}
    </ul>
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
    <div className="flex h-full flex-col rounded-[20px] border-2 border-gray-300 bg-neutral-50 p-8 sm:p-10">
      <div className="mb-6">{icon}</div>
      <h3 className="text-2xl font-semibold text-brand">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
      <p className="mt-8 text-base text-gray-600">{bulletsLabel}</p>
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
      <div className="mb-6">{icon}</div>
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
    <div className="flex h-full flex-col rounded-[20px] border border-neutral-300 bg-white p-10 text-left sm:p-12">
      <h3 className="text-3xl font-bold text-brand">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{subtitle}</p>
      <hr className="my-8 border-t border-brand" />
      <div className="[&>ul]:space-y-5">
        <Bullets items={bullets} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <>
      {/* ---- HERO (Figma 1181:1997) ----
          Background swapped to the dedicated "HERO- Background" node
          (Figma 1425:68): a photographic capture with a baked-in bright
          yellow-green glow in the TOP-RIGHT corner and a softer glow in
          the BOTTOM-LEFT corner, replacing the grid-PNG + CSS glow combo
          used by every other marketing page. The default glow overlays
          are suppressed here (showDefaultGlows=false) since the photo
          already carries that lighting; other pages keep the shared
          Hero's default background untouched. */}
      <Hero
        eyebrow="Worked in Germany and have a company pension?"
        title="Cash out or refund your German"
        highlight="company pension online"
        body="For bAV cash-outs and VBL, ZVK, VddB and VddKO refunds. Check your case, add your documents, sign and submit online, with human support when clarification or follow-up is needed."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
        backgroundImageSrc="/marketing/home/hero-background-photo.png"
        showDefaultGlows={false}
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
      >
        {/* ---- HERO APP MOCKUPS (Figma 1181:2451 + 1181:2365) ----
            Two app-UI windows anchored to the bottom of the dark hero, per
            the design. The exported PNGs are pre-clipped at the hero's
            bottom edge (flat bottoms), so the windows are bottom-aligned;
            the taller "refund submitted" window extends higher and starts
            ~53px above the sign-in window. Design frame (1920px): left
            window x=390 w=562, right window x=972 w=559, ~20px gap, the
            ~1141px block sits centered. Rendered as Hero's `children` (same
            section, same overflow-hidden/background box) rather than a
            second section stitched on with a matching bg-brand color and a
            negative margin — that seam is what previously made the
            mockups read as a separate band; now the hero's dark background
            and glow genuinely extend behind them, and the section's own
            bottom edge (right after the mockups) is what visually "clips"
            them, with nothing overlapping the white section below. */}
        <div className="relative -mt-8 sm:-mt-14">
          {/* Softer light bloom in the bottom-left, continuing the hero
              photo's bottom-left glow behind the tablet mockups so they
              read as one integrated hero. Agrees with the new hero
              background's corners (bright top-right, soft bottom-left; no
              top-left glow anywhere). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 bottom-0 h-[560px] w-[920px] rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(159,232,112,0.16) 0%, transparent 70%)',
            }}
          />
          <div className={`relative ${CONTAINER} pt-0`}>
            {/* lg+: side-by-side, TOP-anchored inside a fixed-height box that
                is shorter than the tablet images, so the hero section's
                `overflow-hidden` slices their bottoms — the windows read as
                continuing below the fold (per Figma) instead of resting as
                whole tablets on the green. The right ("refund submitted")
                window starts flush at the top; the left ("secure claim")
                window starts ~52px lower, matching the design's stagger. */}
            <div className="relative mx-auto hidden h-[300px] w-full max-w-[1141px] lg:block xl:h-[330px]">
              {/* Each window is wrapped in a rounded, overflow-clipped box so
                  the tablet corners read as cleanly rounded (no hard/dark
                  edge), with a soft downward-only shadow (negative spread so
                  it never rims the top/sides as a black line). */}
              <div className="absolute left-0 top-[52px] w-[49.25%] overflow-hidden rounded-t-[20px] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.55)]">
                <Image
                  src="/marketing/home/hero-mockup-secure-claim.png"
                  alt="CompanyPension app — create your secure claim sign-in screen"
                  width={562}
                  height={317}
                  priority
                  className="block h-auto w-full"
                />
              </div>
              <div className="absolute right-0 top-0 w-[48.99%] overflow-hidden rounded-t-[20px] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.55)]">
                <Image
                  src="/marketing/home/hero-mockup-refund-submitted.png"
                  alt="CompanyPension app — refund request submitted confirmation screen"
                  width={559}
                  height={370}
                  priority
                  className="block h-auto w-full"
                />
              </div>
            </div>

            {/* < lg: stacked single column, no horizontal overflow */}
            <div className="mx-auto flex max-w-[562px] flex-col gap-6 lg:hidden">
              <div className="overflow-hidden rounded-2xl shadow-[0_24px_44px_-20px_rgba(0,0,0,0.5)]">
                <Image
                  src="/marketing/home/hero-mockup-secure-claim.png"
                  alt="CompanyPension app — create your secure claim sign-in screen"
                  width={562}
                  height={317}
                  className="block h-auto w-full"
                />
              </div>
              <div className="overflow-hidden rounded-2xl shadow-[0_24px_44px_-20px_rgba(0,0,0,0.5)]">
                <Image
                  src="/marketing/home/hero-mockup-refund-submitted.png"
                  alt="CompanyPension app — refund request submitted confirmation screen"
                  width={559}
                  height={370}
                  className="block h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </Hero>

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
              icon={
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/marketing/icons/start-cashout-icon.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[72px] w-[72px]"
                />
              }
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
              icon={
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/marketing/icons/estimate-refund-icon.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[72px] w-[72px]"
                />
              }
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
              icon={
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/marketing/icons/pension-bav.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[60px] w-[60px]"
                />
              }
              title="bAV / Company pension cash-out"
              body="Have a bAV or company pension from a previous job in Germany? Check whether a cash-out may be possible, including contracts from Allianz, AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV and other providers."
              primary={{ label: 'Start bAV cash-out', href: '/get-started' }}
              secondary={{
                label: 'Learn about bAV cash-outs',
                href: '/how-it-works',
              }}
            />
            <PensionCard
              icon={
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/marketing/icons/pension-vbl.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[60px] w-[60px]"
                />
              }
              title="VBL & ZVK refunds"
              body="Paid into VBLklassik, a ZVK or another public-sector company pension while working in Germany? Start your refund online and apply to get eligible employee contributions back."
              primary={{ label: 'Start VBL/ZVK refund', href: '/get-started' }}
              secondary={{
                label: 'Read VBL refund guide',
                href: '/how-it-works',
              }}
            />
            <PensionCard
              icon={
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/marketing/icons/pension-vddb.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-[60px] w-[60px]"
                />
              }
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
          className="pointer-events-none absolute inset-0 select-none object-cover object-left opacity-40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/40 via-brand/85 to-brand"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              What CompanyPension does
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
            <FeatureRow
              iconSrc="/marketing/icons/feature-guided.svg"
              title="Smart guided process"
              body="Start online and follow clear steps for your bAV cash-out or company pension refund."
            />
            <FeatureRow
              iconSrc="/marketing/icons/feature-signing.svg"
              title="Digital application and signing"
              body="The platform uses the information you provide to complete your application. You review and sign it yourself before it is technically transmitted to the relevant provider or pension scheme."
            />
            <FeatureRow
              iconSrc="/marketing/icons/feature-support.svg"
              title="Human support when needed"
              body="Human support is available when clarification, translation or follow-up is needed."
            />
            <FeatureRow
              iconSrc="/marketing/icons/feature-payout.svg"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/icons/refund-cashout-icon.svg"
                alt=""
                aria-hidden="true"
                className="mb-6 h-[63px] w-[63px]"
              />
              <h3 className="text-2xl font-semibold text-brand">Refund</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A refund means claiming back eligible employee contributions
                from a contribution-based pension scheme.
              </p>
              <p className="mt-8 text-base text-gray-600">
                This usually applies to:
              </p>
              <div className="mt-4">
                <Bullets items={['VBL', 'ZVK', 'VddB', 'VddKO']} />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-neutral-400 bg-white p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/icons/refund-cashout-icon.svg"
                alt=""
                aria-hidden="true"
                className="mb-6 h-[63px] w-[63px]"
              />
              <h3 className="text-2xl font-semibold text-brand">Cash-out</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A cash-out means requesting a one-time payout from a bAV from a
                previous job. It may involve a Direktversicherung,
                Pensionskasse, Pensionsfonds or another provider-based company
                pension.
              </p>
              <p className="mt-8 text-base text-gray-600">
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
          <div className="relative grid items-center overflow-hidden rounded-[30px] bg-gradient-to-r from-brand to-[#0b1a00] text-white lg:grid-cols-2">
            <div className="relative flex min-h-[360px] items-end justify-center lg:min-h-[540px]">
              {/* Faint CompanyPension logomark watermark behind the figure
                  (Figma 1174:1818, ~6% opacity). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/home/estimate-logo-watermark.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[92%] w-auto -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.06]"
              />
              {/* Plain img (not next/image): the figure is a transparent
                  cutout that must size to its own aspect ratio and bottom-
                  align on the card; next/image's responsive sizing collapses
                  it here. eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/home/estimate-man-laptop.png"
                alt="Person holding a laptop, checking a company pension refund"
                className="relative z-10 max-h-[360px] w-auto self-end object-contain lg:max-h-[520px]"
              />
            </div>
            <div className="p-8 sm:p-10 lg:py-14">
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
          src="/marketing/home/pricing-desk-background.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover opacity-[0.18] mix-blend-luminosity"
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
  iconSrc,
  title,
  body,
}: {
  iconSrc: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className="h-[70px] w-[70px] shrink-0 object-contain"
      />
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
      </div>
    </div>
  );
}
