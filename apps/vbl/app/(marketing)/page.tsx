import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, ChevronRight, Info } from 'lucide-react';
import { Hero } from '@/components/marketing/Hero';
import { SectionHeading } from '@/components/marketing/SectionHeading';
import { CtaBand } from '@/components/marketing/CtaBand';
import {
  FaqAccordion,
  type FaqAccordionItem,
} from '@/components/marketing/FaqAccordion';
import { FAQ } from '@/components/marketing/faqItems';

const CONTAINER = 'mx-auto max-w-[1200px] px-6';

/**
 * Charcoal ink used for every heading/title on the page's light sections and
 * card h3s (updated Figma design — was brand green). Dark sections keep their
 * white/accent titles. One constant to avoid scattering the magic color.
 */
const INK = 'text-[#231f20]';

/**
 * Brand-green eyebrow pill for light sections. In the updated design the
 * eyebrow pill stays brand green even though the heading beside it is charcoal
 * (INK). Dark sections keep the default `currentColor` pill (white), so this is
 * only passed on light-section SectionHeadings. Mirrors the value used on the
 * how-it-works and pricing pages. The border is the full brand green (#163300)
 * per client feedback 2026-07-21 — the previous /30 tint read as grey.
 */
const EYEBROW_LIGHT = 'border-brand bg-transparent text-brand';

/**
 * Home FAQ (Figma 1178:541). Questions follow the design; answers come from the
 * shared FAQ master copy via faqItems.tsx (FAQ CompanyPension 22062026.pdf).
 * Q1 and Q3 keep the design's own expanded answers; the remaining items reuse
 * the master answers under the home-designed question wording.
 */
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
    ...FAQ.bothRefunds,
    question:
      'I already received a German state pension refund. Can I also get money from my company pension?',
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
  { ...FAQ.howLong, question: 'How long does it usually take?' },
  FAQ.bankAccount,
  FAQ.cashOutAfterLeaving,
  {
    ...FAQ.whoReceives,
    question: 'Will CompanyPension receive my pension money?',
  },
];

// ---------------------------------------------------------------------------
// Local, page-only card shapes (richer than the shared FeatureCard).
// ---------------------------------------------------------------------------

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-brand border border-brand/20 bg-[#f3fced] px-4 py-3 text-sm text-gray-600">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** Single green-circle-check bullet list; `className`/`style` drive layout. */
function BulletList({
  items,
  className = 'space-y-2.5',
  style,
}: {
  items: string[];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <ul className={className} style={style}>
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

function Bullets({ items }: { items: string[] }) {
  return <BulletList items={items} />;
}

/** Column-major 2-column bullet grid (Refund/Cash-out cards). `rows` sets how
 *  many items stack in each column before flowing to the next. */
function BulletGrid({ items, rows }: { items: string[]; rows: number }) {
  return (
    <BulletList
      items={items}
      className="grid grid-flow-col gap-x-10 gap-y-2.5"
      style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
    />
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
    // 541x749 in Figma (client feedback 2026-07-21); `min-h` rather than a hard
    // height so the card can still grow if the copy ever gets longer.
    <div className="flex h-full w-full flex-col rounded-2xl border border-[#d3d3d3] bg-[#f8f8f8] p-8 sm:p-10 lg:min-h-[749px]">
      <div className="mb-6">{icon}</div>
      <h3 className={`text-xl font-semibold ${INK}`}>{title}</h3>
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
    <div className="flex h-full flex-col rounded-2xl border border-[#e4e4e4] bg-white p-8">
      <div className="mb-6">{icon}</div>
      <h3 className={`text-2xl font-semibold ${INK}`}>{title}</h3>
      <p className="mt-4 flex-1 text-base leading-relaxed text-gray-600">
        {body}
      </p>
      {/* CTA pair (Figma 1172:1158): a small accent button with a trailing
          up-right arrow, plus an underlined secondary text link. */}
      <div className="mt-8 flex flex-col items-start gap-4">
        {/* 257x44 in Figma (client feedback 2026-07-21). */}
        <Link
          href={primary.href}
          className="inline-flex h-11 w-full max-w-[257px] items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-semibold text-brand transition-colors hover:bg-accent-hover"
        >
          {primary.label}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href={secondary.href}
          className={`inline-flex items-center gap-1 text-sm font-medium underline transition-colors hover:text-brand ${INK}`}
        >
          {secondary.label}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/** Numbered process step card (How it works). */
function StepCard({
  number,
  iconSrc,
  title,
  body,
  className = '',
}: {
  number: string;
  iconSrc: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    // 560x344 per card in Figma (client feedback 2026-07-21).
    <div
      className={`relative flex flex-col rounded-[10px] border border-[#ececec] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)] md:min-h-[344px] ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute right-8 top-6 text-3xl font-bold text-[#5c5c5c]"
      >
        {number}
      </span>
      {/* Brand-green badge with knocked-out glyph (Figma "Subtract").
          eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className="h-7 w-7 object-contain"
      />
      <h3 className={`mt-6 text-xl font-semibold ${INK}`}>{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

/** Pricing plan card (Transparent pricing, on light background). */
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
      <h3 className={`text-[22px] font-semibold ${INK}`}>{title}</h3>
      {/* Reserve two lines for the subtitle so the divider below sits at the
          same height in both cards — the bAV subtitle wraps to two lines while
          the refunds subtitle is one, which is the misalignment the client
          flagged ("lines are not aligned"). */}
      <p className="mt-4 text-sm leading-relaxed text-gray-600 lg:min-h-[46px]">
        {subtitle}
      </p>
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
          Background is the code-rendered HeroGridBackground: a dark-green base
          with a 96px grid, a diagonal wave animation (top-right →
          bottom-left, ~10s loop), and corner glows, replacing the former
          hero-background-photo.png (kept on disk for reference/rollback).
          The default glow overlays are suppressed here (showDefaultGlows=false)
          since the animated background already carries that lighting. The
          updated design drops the app-mockup windows, so the hero now ends
          right after the footnote. */}
      <Hero
        eyebrow="Worked in Germany and have a company pension?"
        title="Cash out or refund your German"
        highlight="company pension online"
        body="For bAV cash-outs and VBL, ZVK, VddB and VddKO refunds. Check your case, add your documents, sign and submit online, with human support when clarification or follow-up is needed."
        primaryCta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
        animatedGridBackground
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
      />

      {/* ---- GET STARTED (Figma 1171:393) ---- */}
      <section className="bg-white">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="Get started"
              eyebrowClassName={EYEBROW_LIGHT}
              title="Start your claim or estimate your refund first"
              body="Ready to begin? Start the claim flow for a bAV cash-out or company pension refund. For VBL, ZVK, VddB or VddKO, you can also calculate a first refund estimate before continuing."
              // Wide enough to break over two lines as in Figma, not three.
              bodyClassName="max-w-[950px]"
            />
          </div>

          {/* Two 541px columns, centered — the cards were previously stretching
              to half the 1152px container. */}
          <div className="mt-14 grid justify-center gap-8 lg:grid-cols-[repeat(2,minmax(0,541px))]">
            <FunnelCard
              icon={
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/marketing/icons/start-cashout-icon.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12"
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
                  className="h-12 w-12"
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
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className={INK}>
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
                  className="h-11 w-11"
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
                  className="h-11 w-11"
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
                  className="h-11 w-11"
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

      {/* ---- WHAT COMPANYPENSION DOES (Figma 1174:1243) ----
          Background per Figma node 1174:1248 ("image 810"): the laptop photo is
          confined to the LEFT of the band (1485px of the 1920px frame, starting
          at x=-358), green-duotoned via `mix-blend-luminosity` over the brand
          fill, and masked so it has faded out entirely before the copy column.
          It is a visible part of the composition — not the full-bleed wash that
          shipped before, and not the near-invisible 12% ghost. */}
      <section className="relative overflow-hidden bg-brand text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-[-18%] w-[77%] select-none bg-brand [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_45%,rgba(0,0,0,0)_78%)]"
        >
          {/* bg-brand on the wrapper: the mask isolates the blend, so the
              duotone needs its backdrop inside this element. Dimming happens on
              the scrim below rather than via `opacity` here — at low opacity
              this photo's dark mid-tones collapse into the backdrop and the
              image reads as absent. */}
          <Image
            src="/marketing/home/home-asset-13.png"
            alt=""
            fill
            sizes="70vw"
            className="object-cover object-center brightness-[0.58] mix-blend-luminosity"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-brand/50"
        />
        {/* Large CompanyPension logomark watermark, bottom-right (Figma
            1174:1243). This is the site logo's own hexagon mark, extracted
            from `companypension-cashouts-refunds.svg` — the previous
            `estimate-logo-watermark.svg` was a taller, narrower polygon that
            is not the brand mark, and its `preserveAspectRatio="none"` +
            `w-auto` combination squeezed it to 300x400 (a 0.75 ratio against
            the artwork's 0.86), so it read as a distorted stray shape. Figma
            bottom-aligns it against the band edge at ~58% of the band height,
            inset ~30px from the right. eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/shared/companypension-logomark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-[30px] h-[70%] w-auto select-none opacity-[0.15]"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className="flex flex-col items-center text-center">
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              What <span className="text-accent">CompanyPension</span> does
            </h2>
          </div>
          {/* Figma reads column-major: "Smart guided process" over "Digital
              application and signing" on the left, "Human support when needed"
              over "Money paid to your account" on the right. A row-major
              `grid-cols-2` puts signing and support in the wrong cells, which is
              the sequence the client flagged — so the source order is swapped
              to match. */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
            <FeatureRow
              iconSrc="/marketing/icons/feature-guided.svg"
              title="Smart guided process"
              body="Start online and follow clear steps for your bAV cash-out or company pension refund."
            />
            <FeatureRow
              iconSrc="/marketing/icons/feature-support.svg"
              title="Human support when needed"
              body="Human support is available when clarification, translation or follow-up is needed."
            />
            <FeatureRow
              iconSrc="/marketing/icons/feature-signing.svg"
              title="Digital application and signing"
              body="The platform uses the information you provide to complete your application. You review and sign it yourself before it is technically transmitted to the relevant provider or pension scheme."
            />
            <FeatureRow
              iconSrc="/marketing/icons/feature-payout.svg"
              title="Money paid to your account"
              body="If approved, the money is paid directly to the bank account you provide. CompanyPension does not receive, hold or forward approved pension money."
            />
          </div>
        </div>
      </section>

      {/* ---- REFUND OR CASH-OUT (Figma 1174:1350) ----
          Grey section behind white cards (client feedback 2026-07-21); it was
          white-on-white, so the cards had no separation. */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              title={
                <>
                  Refund Or Cash-Out —<br />
                  What Is The Difference?
                </>
              }
              body="German company pensions are not all handled in the same way. Some cases involve a refund of eligible employee contributions. Others involve a possible bAV cash-out."
            />
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-[#ececec] bg-white p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/icons/refund-cashout-icon.svg"
                alt=""
                aria-hidden="true"
                className="mb-6 h-[46px] w-[46px]"
              />
              <h3 className={`text-2xl font-semibold ${INK}`}>Refund</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A refund means claiming back eligible employee contributions
                from a contribution-based pension scheme.
              </p>
              <p className="mt-8 text-base text-gray-600">
                This usually applies to:
              </p>
              <div className="mt-4">
                {/* NOTE: "Cash-out card" / "Cash-out" appear inside this REFUND
                    list per the Figma design (suspected copy error — flagged in
                    the task report). Implemented design-exact. */}
                <BulletGrid
                  rows={3}
                  items={[
                    'VBL',
                    'ZVK',
                    'VddB',
                    'VddKO',
                    'Cash-out card',
                    'Cash-out',
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-[#ececec] bg-white p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/icons/refund-cashout-icon.svg"
                alt=""
                aria-hidden="true"
                className="mb-6 h-[46px] w-[46px]"
              />
              <h3 className={`text-2xl font-semibold ${INK}`}>Cash-out</h3>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                A cash-out means requesting a one-time payout from a bAV from a
                previous job. It may involve a Direktversicherung,
                Pensionskasse, Pensionsfonds or another provider-based company
                pension.
              </p>
              <p className="mt-8 text-base text-gray-600">
                This usually applies to:
              </p>
              <div className="mt-4 space-y-2.5">
                <BulletGrid
                  rows={4}
                  items={[
                    'Allianz',
                    'AXA',
                    'Swiss Life',
                    'ERGO',
                    'R+V',
                    'Nürnberger',
                    'HDI',
                    'BVV',
                  ]}
                />
                <Bullets
                  items={[
                    'other providers Direktversicherung',
                    'other insurance-based bAV contracts',
                  ]}
                />
              </div>
            </div>
          </div>

          {/* 598x63 in Figma (client feedback 2026-07-21). */}
          <div className="mt-12 flex justify-center">
            <Link
              href="/how-it-works"
              className="flex h-[63px] w-full max-w-[598px] items-center justify-center rounded-brand bg-accent px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See what applies to you
            </Link>
          </div>
        </div>
      </section>

      {/* ---- DRV vs COMPANY PENSION (Figma 1174:1539) ---- */}
      <section className="relative overflow-hidden bg-brand text-white">
        {/* Two photos, per Figma (nodes 1174:1540 / 1174:1544): the glass-tower
            cityscape anchored LEFT and the Reichstag anchored RIGHT, each
            green-duotoned and masked so both have faded into solid brand green
            before they reach the centered copy. Shipping a single full-bleed
            image here — of either building — is what the client flagged. */}
        {/* Each wrapper carries its own brand fill: the mask creates a stacking
            context, so `mix-blend-luminosity` has to blend against a backdrop
            INSIDE the wrapper — without it the photo renders in full colour
            (blue sky, coloured flags) instead of the green duotone. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[52%] select-none bg-brand [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_12%,rgba(0,0,0,0)_72%)]"
        >
          <Image
            src="/marketing/home/home-asset-15.png"
            alt=""
            fill
            sizes="50vw"
            className="object-cover object-center brightness-[0.55] mix-blend-luminosity"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-[52%] select-none bg-brand [mask-image:linear-gradient(to_left,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_12%,rgba(0,0,0,0)_72%)]"
        >
          <Image
            src="/marketing/home/reichstag-berlin.png"
            alt=""
            fill
            sizes="50vw"
            className="object-cover object-[62%_78%] brightness-[0.55] mix-blend-luminosity"
          />
        </div>
        {/* Unifying scrim ABOVE both photos. Darkening via per-image `opacity`
            instead pushes each one toward the backdrop at a different rate
            (the bright Reichstag survives, the darker tower disappears), so the
            two are dimmed together here rather than individually. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-brand/50"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          {/* Copy block is 982px wide in Figma; max-w-3xl (768px) forced the
              paragraphs onto extra lines. */}
          <div className="mx-auto flex max-w-[982px] flex-col items-center text-center">
            <SectionHeading
              eyebrow="Company pension vs DRV"
              eyebrowWidth={327}
              title={
                <span className="text-accent">
                  Your DRV Refund Does Not Include
                  <br />
                  Your Company Pension
                </span>
              }
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
            {/* 508x63 in Figma (client feedback 2026-07-21). */}
            <div className="mt-9 w-full">
              <Link
                href="/how-it-works"
                className="mx-auto flex h-[63px] w-full max-w-[508px] items-center justify-center gap-2 rounded-brand bg-accent px-6 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
              >
                Compare company pension and DRV
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS (Figma 1174:1679) ---- */}
      <section className="bg-[#f3f4f4]">
        <div className={`${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              title="How it works"
              body="A guided online process from the first check to signing, submission and provider follow-up."
            />
          </div>

          <div className="mt-14 grid justify-center gap-6 md:grid-cols-[repeat(2,minmax(0,560px))]">
            <StepCard
              number="01"
              iconSrc="/marketing/icons/step-check.svg"
              title="Check what can be started"
              body="Choose your pension type or provider and answer a few questions. The platform checks whether a bAV cash-out or refund may be possible."
            />
            <StepCard
              number="02"
              iconSrc="/marketing/icons/step-secure.svg"
              title="Secure your claim"
              body="Create secure access, review the pricing and pay the €199 deposit to activate the full process. The deposit is credited toward your final service fee."
            />
            <StepCard
              number="03"
              iconSrc="/marketing/icons/step-documents.svg"
              title="Add your documents and details"
              body="Add your ID, bank account and pension information from documents such as a VBL letter, provider statement, bAV contract or Direktversicherung document."
            />
            <StepCard
              number="04"
              iconSrc="/marketing/icons/step-sign.svg"
              title="Review, sign and submit online"
              body="Check your details and sign the application yourself. After you sign, ATLAES GmbH technically transmits it to the relevant provider or pension scheme."
            />
            <StepCard
              number="05"
              iconSrc="/marketing/icons/step-payout.svg"
              title="Provider review and payout"
              body="The provider or pension scheme reviews your request. Correspondence can run through CompanyPension when clarification or follow-up is needed. If approved, the money is paid directly to the bank account you provide."
              className="md:col-span-2 md:mx-auto md:w-[560px]"
            />
          </div>

          {/* 485x63 in Figma (client feedback 2026-07-21). */}
          <div className="mt-12 flex justify-center">
            <Link
              href="/how-it-works"
              className="flex h-[63px] w-full max-w-[485px] items-center justify-center rounded-brand bg-accent px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              See the full process
            </Link>
          </div>
        </div>
      </section>

      {/* ---- ESTIMATE BEFORE YOU BEGIN (Figma 1174:1814) ----
          Wider container than the page default (1174px of content vs 1152px)
          so the card can hit its Figma size exactly. */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1222px] px-6 py-20 sm:py-24">
          {/* 1174x630 card in Figma (client feedback 2026-07-21). */}
          <div className="relative mx-auto grid w-full max-w-[1174px] items-center overflow-hidden rounded-[30px] bg-gradient-to-r from-brand to-[#0b1a00] text-white lg:min-h-[630px] lg:grid-cols-2">
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
                title={
                  <span className="text-accent">
                    Estimate your company pension refund
                  </span>
                }
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
              {/* 334x63 in Figma (client feedback 2026-07-21). */}
              <div className="mt-8">
                <Link
                  href="/calculator"
                  className="flex h-[63px] w-full max-w-[334px] items-center justify-center gap-2 rounded-brand bg-accent px-6 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
                >
                  Start quick check
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- TRANSPARENT PRICING (Figma 1178:87) ---- */}
      <section className={`relative overflow-hidden bg-neutral-50 ${INK}`}>
        {/* Plain img: next/image's dev optimizer renders this large asset
            blank here; the direct PNG paints reliably as a faint grayscale
            watermark. eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/home/pricing-desk-background.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-[0.14] grayscale"
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

          {/* Design order (Figma 1178:87): cards → footnote → button. */}
          <div className="mt-10 flex flex-col items-center gap-6 text-center">
            <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
              If approved, the money is paid directly to the bank account you
              provide. CompanyPension does not receive, hold or forward approved
              pension money.
            </p>
            <Link
              href="/pricing"
              className="rounded-brand bg-accent px-8 py-3.5 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              View pricing details
            </Link>
          </div>
        </div>
      </section>

      {/* ---- FAQ (Figma 1178:541 — real copy from rendered canvas) ---- */}
      <section className="bg-[#112601] text-white">
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

      {/* ---- DRV refund and bAV cash-out — §3(3) (Figma 1179:1874) ---- */}
      <section className="relative overflow-hidden bg-neutral-50">
        {/* Plain img: next/image's dev optimizer renders this large asset
            blank here; the direct PNG paints reliably. eslint-disable-next-line
            @next/next/no-img-element */}
        <img
          src="/marketing/home/drv-altes-museum-background.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-right opacity-[0.28] grayscale"
        />
        {/* Lightened (was opacity-50 behind a mostly-transparent scrim) so the
            body copy stays legible over the facade — client feedback 2026-07-21. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-neutral-50/55 from-25% to-neutral-50 to-72%"
        />
        <div className={`relative ${CONTAINER} py-20 sm:py-24`}>
          <div className={`flex flex-col items-center text-center ${INK}`}>
            <SectionHeading
              eyebrow="DRV refund and bAV cash-out"
              eyebrowClassName={EYEBROW_LIGHT}
              title={
                <>
                  A DRV refund can create the basis for
                  <br />a bAV lump-sum settlement
                </>
              }
              body="For many vested bAV entitlements, a cash-out is not available simply because you left Germany. An approved DRV refund may first be required."
              // Bolder lead, per client feedback ("text should be thicker").
              bodyClassName="max-w-[900px] font-semibold"
            />
          </div>

          {/* The duplicate of the lead paragraph that opened this block was
              removed on client instruction (it was design-exact but read as an
              error). */}
          <div className="mx-auto mt-12 max-w-3xl space-y-5 text-center text-base leading-relaxed text-gray-600">
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

          <p
            className={`mx-auto mt-8 max-w-3xl text-center text-base font-bold ${INK}`}
          >
            Already received your DRV refund?
            <br />
            Your vested bAV may now qualify for a separate lump-sum settlement.
          </p>

          {/* 598x63 in Figma (client feedback 2026-07-21). */}
          <div className="mt-10 flex justify-center">
            <Link
              href="/get-started"
              className="flex h-[63px] w-full max-w-[598px] items-center justify-center rounded-brand bg-accent px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
            >
              Check my bAV cash-out
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CLOSING CTA BAND (Figma 1179:1923) ---- */}
      <CtaBand
        eyebrow="Start online"
        title={
          <>
            Ready to start your
            <br />
            <span className="text-accent">company pension claim?</span>
          </>
        }
        body="Start the guided claim flow for a bAV cash-out or a VBL, ZVK, VddB or VddKO refund. For refund cases, you can also calculate a first estimate before continuing."
        cta={{ label: 'Start your claim', href: '/get-started' }}
        secondaryCta={{ label: 'Calculate my refund', href: '/calculator' }}
        note={
          <>
            The refund calculator is available for VBL, ZVK, VddB and VddKO
            cases.
            <br />
            It is not used for bAV cash-outs.
          </>
        }
        backgroundImageSrc="/marketing/home/cta-waves-background.png"
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
    <div className="flex items-start gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className="h-12 w-12 shrink-0 object-contain"
      />
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{body}</p>
      </div>
    </div>
  );
}
