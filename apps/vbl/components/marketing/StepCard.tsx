import type { ReactNode } from 'react';
import Image from 'next/image';

export interface StepCardProps {
  /** Step label shown in the dark badge, e.g. "Step 1". */
  number: string;
  title: string;
  body: ReactNode;
  /** Optional supporting image rendered above the step body. */
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
}

/**
 * Numbered process step card used on the How-it-works page and reused on the
 * product pages. A "Step N" pill sits at the top, followed by the title and
 * body. The card stretches to fill its grid track so rows stay aligned.
 */
export function StepCard({ number, title, body, image }: StepCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-400 bg-white p-8">
      {image ? (
        <div className="mb-6 overflow-hidden rounded-brand">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <span className="inline-flex w-fit items-center rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white">
        {number}
      </span>

      <h3 className="mt-6 text-xl font-semibold text-brand">{title}</h3>

      <p className="mt-4 text-base leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

export default StepCard;
