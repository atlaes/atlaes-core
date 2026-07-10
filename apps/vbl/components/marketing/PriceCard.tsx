import type { ReactNode } from 'react';
import Link from 'next/link';
import { Check, Info } from 'lucide-react';

interface PriceCardCta {
  label: string;
  href: string;
  /** Button style; defaults to the solid accent button. */
  variant?: 'solid' | 'outline';
}

export interface PriceCardProps {
  /** Large headline for the plan (e.g. "Company pension cash-outs"). */
  title: ReactNode;
  /**
   * Prominent claim-type tag rendered as a pill above the title
   * (e.g. "bAV cash-outs"). Optional — this design has no monetary price line.
   */
  price?: ReactNode;
  /** Optional supporting text under the title. */
  description?: ReactNode;
  /** Feature list, rendered with accent check bullets. */
  bullets: string[];
  /** Optional highlighted note (e.g. the "Deposit rule" callout). */
  note?: ReactNode;
  cta: PriceCardCta;
}

/**
 * Pricing plan card used on the Pricing page's "Pricing by claim type" grid:
 * a claim-type pill, a headline, accent check bullets, an optional highlighted
 * note and a trailing call-to-action button. Shared so product pages can reuse
 * the same pricing presentation.
 */
export function PriceCard({
  title,
  price,
  description,
  bullets,
  note,
  cta,
}: PriceCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      {price ? (
        <span className="inline-flex w-fit items-center rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-brand">
          {price}
        </span>
      ) : null}

      <h3 className="mt-5 text-2xl font-bold leading-tight text-brand sm:text-3xl">
        {title}
      </h3>

      {description ? (
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          {description}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3 text-gray-700">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-base leading-relaxed">{bullet}</span>
          </li>
        ))}
      </ul>

      {note ? (
        <div className="mt-6 flex items-start gap-2 rounded-brand bg-accent/10 px-4 py-3 text-sm leading-relaxed text-gray-600">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-brand"
            aria-hidden="true"
          />
          <div>{note}</div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-1 items-end">
        <Link
          href={cta.href}
          className={
            cta.variant === 'outline'
              ? 'w-full rounded-brand border border-neutral-400 bg-white px-6 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-neutral-50'
              : 'w-full rounded-brand bg-accent px-6 py-4 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover'
          }
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

export default PriceCard;
