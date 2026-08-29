import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { HeroGridBackground } from './HeroGridBackground';

interface CtaLink {
  label: string;
  href: string;
}

export interface HeroProps {
  eyebrow?: string;
  /**
   * Exact hero pill width in px, from the Figma design (client feedback gives
   * these per page, e.g. Pricing = 164x40, About = 316x40). Mirrors
   * `SectionHeading`'s prop of the same name — height is always 40px
   * (`min-h-10` below), so only the width varies, and heroes that don't pass
   * it stay auto-width.
   */
  eyebrowWidth?: number;
  title: string;
  highlight?: string;
  /**
   * Renders `highlight` on the same line as the title instead of on its own.
   * Figma sets this per page: the home hero breaks before "company pension
   * online", while the how-it-works hero keeps "How CompanyPension works" on
   * one line. Opt-in, so heroes that don't pass it keep the block treatment.
   */
  highlightInline?: boolean;
  body: ReactNode;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  /**
   * How to render the secondary CTA. `'button'` (default) is the outlined
   * button shown beside the primary; `'link'` renders it as an underlined
   * white text link with a trailing chevron, stacked below the primary
   * button (updated pricing hero). Opt-in so other heroes are unaffected.
   */
  secondaryCtaVariant?: 'button' | 'link';
  /**
   * Extra classes for the body wrapper, mirroring `SectionHeading`'s prop of
   * the same name. Figma weights the hero lead per page — the how-it-works
   * hero sets it semibold while the home hero stays regular — so this is
   * opt-in and pages that don't pass it are unaffected.
   */
  bodyClassName?: string;
  /** Optional muted supporting text rendered under the CTAs. */
  footnote?: ReactNode;
  /** Optional content rendered between the body and the CTAs (e.g. the About
   * hero's second paragraph + supported-claims list, which sit above the
   * buttons in Figma). */
  aboveCta?: ReactNode;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  /** Optional override for the hero's background image (defaults to the
   * grid-pattern PNG used by every other marketing page). */
  backgroundImageSrc?: string;
  /** When the override background already bakes in its own glow lighting,
   * pass `false` to suppress the default CSS radial-glow overlays below. */
  showDefaultGlows?: boolean;
  /** Render the code-based animated grid background (grid + wave + its own
   * corner glows) instead of the background image. Used by the Home page;
   * carries its own lighting, so pair with `showDefaultGlows={false}`. */
  animatedGridBackground?: boolean;
  /** Optional extra content rendered inside this same section, below the
   * centered copy column (e.g. Home's app mockups) — kept in the same
   * `overflow-hidden`/background box as the rest of the hero so there is
   * no seam between the hero and this trailing content. */
  children?: ReactNode;
}

/**
 * Centered marketing hero on the dark brand background with a subtle grid
 * pattern. The title can carry an accent-colored `highlight` fragment appended
 * after the main title text (matches the Figma "company pension online" run).
 */
export function Hero({
  eyebrow,
  eyebrowWidth,
  title,
  highlight,
  highlightInline = false,
  body,
  primaryCta,
  secondaryCta,
  secondaryCtaVariant = 'button',
  bodyClassName = '',
  footnote,
  aboveCta,
  image,
  backgroundImageSrc = '/marketing/home/hero-background.png',
  showDefaultGlows = false,
  animatedGridBackground = false,
  children,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand text-white">
      {/* Hero background: either the code-rendered animated grid
          (HeroGridBackground — grid + diagonal wave + its own corner glows,
          used by Home via `animatedGridBackground`) or the faded 96px
          block-grid PNG exported from Figma (node 1181:1998) layered over
          the brand fill. Image callers may override the file via
          `backgroundImageSrc` and enable the default CSS radial-glow
          overlays below with `showDefaultGlows`. */}
      {animatedGridBackground ? (
        <HeroGridBackground />
      ) : (
        <Image
          src={backgroundImageSrc}
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 select-none object-cover object-top"
        />
      )}
      {/* Hero radial light: bright yellow-green source in the TOP-LEFT
          corner, fading diagonally toward the dark bottom-right (Figma).
          A softer bloom sits in the bottom-right (added on the mockup
          section below so it reads continuously). Clipped by the section's
          overflow-hidden, so these never widen the page. */}
      {showDefaultGlows ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-48 -top-64 h-[860px] w-[1080px] rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(183,216,87,0.40) 0%, rgba(159,232,112,0.16) 40%, transparent 72%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-56 -right-48 h-[720px] w-[960px] rounded-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(159,232,112,0.16) 0%, rgba(159,232,112,0.06) 40%, transparent 72%)',
            }}
          />
        </>
      ) : null}

      {/* pt-36/sm:pt-44 clears the absolutely-positioned MarketingNav pill
          (pt-8/pt-10 + 68px pill ≈ 100/108px) with room to spare, now that
          the nav has no bg strip of its own and floats directly over this
          section's background. */}
      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-20 pt-36 text-center sm:pb-28 sm:pt-44">
        {/* Same 40px / 16px `font-display` pill as SectionHeading and CtaBand —
            the hero eyebrow was the one that never got the updated design's
            pill treatment. The fill is accent-tinted because `bg-white/5` over
            the dark brand green renders as effectively no fill at all, while
            Figma shows a clearly lighter pill on both the home and
            how-it-works heroes (sampled ≈#305818 over the #103000 hero bg). */}
        {/* The Figma pill width is applied from `sm` up only (via the CSS
            variable below), and the pill may wrap on narrow phones — a fixed
            width plus `nowrap` would overflow the viewport for longer
            eyebrows. Same approach as `SectionHeading`. */}
        {eyebrow ? (
          <span
            className="mb-6 inline-flex min-h-10 max-w-full items-center justify-center rounded-full border border-accent/40 bg-accent/20 px-5 py-1 text-center font-display text-base font-medium text-white sm:w-[var(--pill-w)] sm:whitespace-nowrap"
            style={
              eyebrowWidth
                ? ({ '--pill-w': `${eyebrowWidth}px` } as CSSProperties)
                : undefined
            }
          >
            {eyebrow}
          </span>
        ) : null}

        <h1 className="max-w-5xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          {title}
          {highlight ? (
            highlightInline ? (
              <>
                {' '}
                <span className="text-accent">{highlight}</span>
              </>
            ) : (
              <>
                {' '}
                <span className="block text-accent">{highlight}</span>
              </>
            )
          ) : null}
        </h1>

        {/* `body` is a ReactNode that may itself contain <p> elements (e.g. the
            About hero passes multiple paragraphs), so this wrapper is a <div>,
            not a <p> — a <p> inside a <p> is invalid and triggers a hydration
            error. The text styles apply to the div and cascade to any nested
            paragraphs. */}
        <div
          className={`mt-6 max-w-2xl text-base leading-relaxed text-white sm:text-lg ${bodyClassName}`}
        >
          {body}
        </div>

        {aboveCta ? (
          <div className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {aboveCta}
          </div>
        ) : null}

        {/* Hero CTAs are a fixed 345x63 in the Figma design (client feedback
            2026-07-21) — they stretch to the column width below sm. */}
        <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <Link
            href={primaryCta.href}
            className="flex h-[63px] items-center justify-center rounded-brand bg-accent px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover sm:w-[345px]"
          >
            {primaryCta.label}
          </Link>
          {secondaryCta && secondaryCtaVariant === 'button' ? (
            <Link
              href={secondaryCta.href}
              className="flex h-[63px] items-center justify-center rounded-brand border border-white/30 px-8 text-center text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-[345px]"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>

        {secondaryCta && secondaryCtaVariant === 'link' ? (
          <div className="mt-6">
            <Link
              href={secondaryCta.href}
              className="inline-flex items-center gap-1 text-base font-semibold text-white underline underline-offset-4 transition-colors hover:text-white/80"
            >
              {secondaryCta.label}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        {footnote ? (
          // Wide enough for each footnote sentence to sit on a single line at
          // desktop, as in Figma (client feedback: "make the first and second
          // line, one line only").
          <div className="mt-8 max-w-[1000px] text-sm leading-relaxed text-white/75">
            {footnote}
          </div>
        ) : null}

        {image ? (
          <div className="mt-14 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="h-auto w-full"
              priority
            />
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export default Hero;
