import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

interface CardCta {
  label: string;
  href: string;
}

export interface FeatureCardProps {
  icon: ReactNode;
  title: ReactNode;
  body: ReactNode;
  bullets?: string[];
  /** Optional lead-in label rendered above the bullet list (e.g. "Available for:"). */
  bulletsLabel?: string;
  /** Optional muted info note rendered below the bullets, inside the card. */
  note?: ReactNode;
  cta?: CardCta;
  /** CTA style; defaults to the solid accent button. */
  ctaVariant?: 'solid' | 'outline';
}

/**
 * White content card used for the funnel routes, pension-type chooser and the
 * "what CompanyPension does" grid. Icon sits in an accent circle; optional
 * checkmark bullets and a trailing link CTA render when provided.
 */
export function FeatureCard({
  icon,
  title,
  body,
  bullets,
  bulletsLabel,
  note,
  cta,
  ctaVariant = 'solid',
}: FeatureCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-brand">
        {icon}
      </div>

      <h3 className="text-xl font-semibold text-brand">{title}</h3>

      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>

      {bulletsLabel ? (
        <p className="mt-6 text-base text-gray-600">{bulletsLabel}</p>
      ) : null}

      {bullets && bullets.length > 0 ? (
        <ul className={`${bulletsLabel ? 'mt-3' : 'mt-6'} space-y-3`}>
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-gray-700">
              <Check
                className="mt-0.5 h-5 w-5 shrink-0 text-brand"
                aria-hidden="true"
              />
              <span className="text-base">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {note ? (
        <div className="mt-6 rounded-brand bg-neutral-50 px-4 py-3 text-sm text-gray-600">
          {note}
        </div>
      ) : null}

      {cta ? (
        <div className="mt-8 flex flex-1 items-end">
          <Link
            href={cta.href}
            className={
              ctaVariant === 'outline'
                ? 'w-full rounded-brand border border-neutral-400 bg-white px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-neutral-50'
                : 'w-full rounded-brand bg-accent px-6 py-3 text-center text-base font-semibold text-brand transition-colors hover:bg-accent-hover'
            }
          >
            {cta.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default FeatureCard;
