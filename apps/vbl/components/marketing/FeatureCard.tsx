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
  cta?: CardCta;
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
  cta,
}: FeatureCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-brand">
        {icon}
      </div>

      <h3 className="text-xl font-semibold text-brand">{title}</h3>

      <p className="mt-3 text-base leading-relaxed text-gray-600">{body}</p>

      {bullets && bullets.length > 0 ? (
        <ul className="mt-6 space-y-3">
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

      {cta ? (
        <Link
          href={cta.href}
          className="mt-8 inline-flex items-center gap-2 self-start rounded-brand bg-accent px-6 py-3 text-base font-semibold text-brand transition-colors hover:bg-accent-hover"
        >
          {cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default FeatureCard;
