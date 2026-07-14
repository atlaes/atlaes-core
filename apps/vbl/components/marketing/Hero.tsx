import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeroGridBackground } from './HeroGridBackground';

interface CtaLink {
  label: string;
  href: string;
}

export interface HeroProps {
  eyebrow?: string;
  title: string;
  highlight?: string;
  body: ReactNode;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  /** Optional muted supporting text rendered under the CTAs. */
  footnote?: ReactNode;
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
  title,
  highlight,
  body,
  primaryCta,
  secondaryCta,
  footnote,
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
        {eyebrow ? (
          <span className="mb-6 inline-flex items-center rounded-full border border-accent/40 bg-white/5 px-5 py-2 text-sm font-medium text-white/90">
            {eyebrow}
          </span>
        ) : null}

        <h1 className="max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          {title}
          {highlight ? (
            <>
              {' '}
              <span className="text-accent">{highlight}</span>
            </>
          ) : null}
        </h1>

        {/* `body` is a ReactNode that may itself contain <p> elements (e.g. the
            About hero passes multiple paragraphs), so this wrapper is a <div>,
            not a <p> — a <p> inside a <p> is invalid and triggers a hydration
            error. The text styles apply to the div and cascade to any nested
            paragraphs. */}
        <div className="mt-6 max-w-2xl text-base leading-relaxed text-white sm:text-lg">
          {body}
        </div>

        <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <Link
            href={primaryCta.href}
            className="rounded-brand bg-accent px-8 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
          >
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="rounded-brand border border-white/30 px-8 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>

        {footnote ? (
          <div className="mt-8 max-w-2xl text-sm leading-relaxed text-white/75">
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
