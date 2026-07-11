import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand text-white">
      {/* Grid pattern + radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(159,232,112,0.25) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 py-20 text-center sm:py-28">
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

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
          {body}
        </p>

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
          <div className="mt-8 max-w-2xl text-sm leading-relaxed text-white/60">
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
    </section>
  );
}

export default Hero;
