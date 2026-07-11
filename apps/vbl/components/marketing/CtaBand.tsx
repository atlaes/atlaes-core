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
}: CtaBandProps) {
  return (
    <section className="bg-brand text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 py-20 text-center sm:py-24">
        {eyebrow ? (
          <span className="mb-6 inline-flex items-center rounded-full border border-accent/40 bg-white/5 px-5 py-2 text-sm font-medium text-accent">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h2>

        {body ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {body}
          </p>
        ) : null}

        <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <Link
            href={cta.href}
            className="rounded-brand bg-accent px-8 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
          >
            {cta.label}
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
