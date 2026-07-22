import type { ReactNode } from 'react';
import Link from 'next/link';

interface CtaLink {
  label: string;
  href: string;
}

export interface CtaBandProps {
  /** Optional pill rendered above the title (FAQ band's "Start online"). */
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  cta: CtaLink;
  /** Optional second CTA (the Home page closing band offers two actions). */
  secondaryCta?: CtaLink;
  /** Optional muted note rendered under the CTAs. */
  note?: ReactNode;
  /**
   * Decorative full-bleed background for the closing band. In Figma the
   * closing CTA is a shared component that always sits on this near-black
   * (#231f20) wave background (e.g. Pricing node 1199:9435 "Image"), which is
   * what separates it from the green footer below. It therefore defaults to
   * the shared waves asset; pass a different path to override, or `null` to
   * fall back to the flat brand background.
   */
  backgroundImageSrc?: string | null;
}

/**
 * Full-width closing call-to-action band on the dark brand background.
 */
export function CtaBand({
  eyebrow,
  title,
  body,
  cta,
  secondaryCta,
  note,
  backgroundImageSrc = '/marketing/home/cta-waves-background.png',
}: CtaBandProps) {
  return (
    <section
      className={`relative overflow-hidden text-white ${
        backgroundImageSrc ? 'bg-[#231f20]' : 'bg-brand'
      }`}
    >
      {backgroundImageSrc ? (
        // Plain img (not next/image): the dev optimizer renders these large
        // decorative backgrounds blank; the direct asset paints reliably.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImageSrc}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-70 mix-blend-multiply"
        />
      ) : null}
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 py-20 text-center sm:py-24">
        {eyebrow ? (
          // 219x40 pill in Figma (client feedback 2026-07-21).
          <span className="mb-6 inline-flex h-10 w-[219px] items-center justify-center rounded-full border border-accent/40 bg-white/5 font-display text-base font-medium text-accent">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-[2.5rem] sm:leading-[1.15]">
          {title}
        </h2>

        {body ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {body}
          </p>
        ) : null}

        <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          {/* Both closing-band CTAs are 345x63 in Figma. */}
          <Link
            href={cta.href}
            className="flex h-[63px] items-center justify-center rounded-brand bg-accent px-8 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover sm:w-[345px]"
          >
            {cta.label}
          </Link>
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="flex h-[63px] items-center justify-center rounded-brand border border-white/30 px-8 text-center text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-[345px]"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>

        {note ? (
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/60">
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default CtaBand;
