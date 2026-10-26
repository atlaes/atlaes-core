'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { apiErrorMessage } from '@/lib/account-api';
import type { PayoutView } from './usePayout';

const HELP_HREF = '/contact-us';

export const RELEASE_STEPS = ['Bank details', 'Payout route', 'Sign'] as const;

/**
 * Task chrome for the payout screens (Figma B 08–13): 72px top bar with
 * the wordmark, the task title in the centre, Help / Save & exit on the
 * right; body column 640 with the optional release progress (3 steps).
 */
export function PayoutFrame({
  title,
  step,
  children,
}: {
  title: string;
  /** 1–3 for the release steps; omitted on the review screens. */
  step?: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <div className="pay">
      <header className="pay-topbar">
        <Link href="/account" className="pay-logo">
          <span>Germany ››</span>
          <span>Pension Refund</span>
        </Link>
        <p className="pay-topbar-title">{title}</p>
        <nav className="pay-topbar-right" aria-label="Task">
          <Link href={HELP_HREF} className="pay-help">
            Help
          </Link>
          <Link href="/account" className="pay-exit">
            Save &amp; exit
          </Link>
        </nav>
      </header>
      <div className="pay-body">
        {step ? (
          <ol className="pay-progress" aria-label="Progress">
            {RELEASE_STEPS.map((label, i) => (
              <li
                key={label}
                data-on={i < step ? 'true' : 'false'}
                aria-current={i + 1 === step ? 'step' : undefined}
              >
                {label}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="pay-col">{children}</div>
      </div>
    </div>
  );
}

export function releaseTitle(step: 1 | 2 | 3): string {
  return `Release your refund · Step ${step} of 3 · ${RELEASE_STEPS[step - 1]}`;
}

export const REVIEW_TITLE = 'Task · Review your refund decision';

export function Question({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="pay-question">
      <h1 className="pay-h1">{title}</h1>
      {lead ? <p className="pay-lead">{lead}</p> : null}
    </div>
  );
}

export function Footer({
  backHref,
  onBack,
  cta,
  onCta,
  disabled,
  type = 'button',
}: {
  backHref?: string;
  onBack?: () => void;
  cta: string;
  onCta?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <div className="pay-footer">
      {backHref ? (
        <Link href={backHref} className="pay-back">
          ← Back
        </Link>
      ) : onBack ? (
        <button type="button" onClick={onBack} className="pay-back">
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        type={type}
        className="pay-cta"
        onClick={onCta}
        disabled={disabled}
      >
        <span>{cta}</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/** Loading / no case / error states inside the task chrome. */
export function PayoutStateView({
  view,
  title,
}: {
  view: Exclude<PayoutView, { state: 'ready' }>;
  title: string;
}) {
  return (
    <PayoutFrame title={title}>
      {view.state === 'loading' ? (
        <div className="acc-loading" role="status">
          <Loader2 className="acc-spin" aria-hidden />
          <span>Loading…</span>
        </div>
      ) : view.state === 'empty' ? (
        <NothingOpen />
      ) : (
        <>
          <Question title="We could not load this task" />
          <p className="pay-error" role="alert">
            {apiErrorMessage(view.error, 'Something went wrong on our side.')}
          </p>
          <Footer backHref="/account" cta="Try again" onCta={view.retry} />
        </>
      )}
    </PayoutFrame>
  );
}

export function NothingOpen() {
  return (
    <>
      <Question
        title="Nothing to do here right now"
        lead="Your account overview shows anything that still needs your attention."
      />
      <div className="pay-footer">
        <span />
        <Link href="/account" className="pay-cta">
          <span>Back to your account</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}
