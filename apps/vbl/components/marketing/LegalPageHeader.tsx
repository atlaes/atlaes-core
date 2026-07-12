import type { ReactNode } from 'react';
import Image from 'next/image';

export interface LegalPageHeaderProps {
  eyebrow?: string;
  title: string;
  /** Optional accent-colored second title line (matches the Hero pattern). */
  highlight?: string;
  body?: ReactNode;
}

/**
 * Compact dark hero for legal and utility pages (imprint, privacy policy,
 * terms, …). Mirrors the Hero component's section chrome — brand background,
 * grid-pattern image and the pt-36/sm:pt-44 top padding that clears the
 * floating MarketingNav pill — but drops the CTA row, which legal pages
 * don't carry.
 */
export function LegalPageHeader({
  eyebrow,
  title,
  highlight,
  body,
}: LegalPageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-brand text-white">
      <Image
        src="/marketing/home/hero-background.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none absolute inset-0 select-none object-cover object-top"
      />

      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-center px-6 pb-16 pt-36 text-center sm:pb-20 sm:pt-44">
        {eyebrow ? (
          <span className="mb-6 inline-flex items-center rounded-full border border-accent/40 bg-white/5 px-5 py-2 text-sm font-medium text-white/90">
            {eyebrow}
          </span>
        ) : null}

        <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          {title}
          {highlight ? (
            <span className="block text-accent">{highlight}</span>
          ) : null}
        </h1>

        {body ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {body}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default LegalPageHeader;
