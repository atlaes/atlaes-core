'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  useClaimsStore,
  SIDEBAR_SECTIONS,
  ALL_STEPS,
} from '@/lib/stores/claims-store';

const HELP_HREF = '/contact-us';

/** Short progress labels for the six sidebar sections (Figma F, 1168:368). */
const GROUP_LABELS: Record<string, string> = {
  personal_info: 'Personal info',
  documents: 'Documents',
  payment_details: 'Payment',
  signature: 'Signature',
  id_verification: 'ID check',
  review_submit: 'Review',
};

/**
 * Claim form chrome (Figma "Intake flow & widgets", section F): 72px top
 * bar with the wordmark, the step title in the centre and Help / Save &
 * exit on the right; then the six-group progress and a 640 column.
 * `progress` shows the wizard progress for the current step; the list and
 * intro screens leave it off.
 */
export function ClaimsFrame({
  title,
  progress = false,
  wide = false,
  children,
}: {
  title: string;
  progress?: boolean;
  /** 960 column (claims list) instead of 640. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="claims-frame">
      <header className="claims-topbar">
        <Link href="/" className="claims-logo">
          <span>Germany ››</span>
          <span>Pension Refund</span>
        </Link>
        <p className="claims-topbar-title">{title}</p>
        <nav className="claims-topbar-right" aria-label="Claim">
          <Link href={HELP_HREF} className="claims-help">
            Help
          </Link>
          <Link href="/claims" className="claims-exit">
            Save &amp; exit
          </Link>
        </nav>
      </header>
      <div className="claims-body">
        {progress ? <ClaimsProgress /> : null}
        <div className={wide ? 'claims-col claims-col-wide' : 'claims-col'}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Six sections; a section is on once the current step is in or past it. */
function ClaimsProgress() {
  const { currentStep, goToStep } = useClaimsStore();
  const current = SIDEBAR_SECTIONS.findIndex((s) =>
    s.steps.some((step) => step.name === currentStep)
  );
  return (
    <ol className="claims-progress" aria-label="Progress">
      {SIDEBAR_SECTIONS.map((section, i) => (
        <li
          key={section.id}
          data-on={i <= current ? 'true' : 'false'}
          aria-current={i === current ? 'step' : undefined}
        >
          <button
            type="button"
            onClick={() => goToStep(section.steps[0].name)}
            title={section.title}
          >
            {GROUP_LABELS[section.id] ?? section.title}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** "Your claim · Step 3 of 10 · Current Address" for the top bar. */
export function claimStepTitle(stepName: string): string {
  const index = ALL_STEPS.indexOf(stepName as (typeof ALL_STEPS)[number]);
  const label =
    SIDEBAR_SECTIONS.flatMap((s) => s.steps).find((s) => s.name === stepName)
      ?.label ?? '';
  return index < 0
    ? 'Your claim'
    : `Your claim · Step ${index + 1} of ${ALL_STEPS.length} · ${label}`;
}
