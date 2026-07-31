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
   * Claim-type pill rendered above the title (e.g. "bAV cash-outs",
   * "Contribution refunds").
   */
  badge?: ReactNode;
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
  badge,
  description,
  bullets,
  note,
  cta,
}: PriceCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#ececec] bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      {badge ? (
        <span className="inline-flex w-fit items-center rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-sm font-semibold text-brand">
          {badge}
        </span>
      ) : null}

      <h3 className="mt-5 text-2xl font-bold leading-tight text-[#231f20] sm:text-3xl">
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
        <div className="mt-6 flex items-start gap-2 rounded-brand border border-brand/20 bg-[#f3fced] px-4 py-3 text-sm leading-relaxed text-gray-600">
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
              ? 'w-full rounded-brand border border-[#231f20]/25 bg-white px-6 py-4 text-center text-base font-semibold text-[#231f20] transition-colors hover:bg-neutral-50'
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
