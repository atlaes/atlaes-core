import { Check } from 'lucide-react';
import type { AccountStep } from '@/lib/account-api';

/** Four-step progress: Preparing · Submitted · Decision · Payout. */
export function Stepper({ steps }: { steps: AccountStep[] }) {
  return (
    <ol
      className="grid grid-cols-4 gap-2 sm:gap-4"
      aria-label="Application progress"
    >
      {steps.map((step, i) => {
        const done = step.state === 'done';
        const current = step.state === 'current';
        const circle = done
          ? 'bg-brand-navy text-white border-brand-navy'
          : current
            ? 'bg-white text-brand-navy border-brand-navy ring-4 ring-brand-tint'
            : 'bg-white text-brand-muted border-brand-stroke';
        const bar = done ? 'bg-brand-navy' : 'bg-brand-stroke/70';
        return (
          <li
            key={step.key}
            className="min-w-0"
            aria-current={current ? 'step' : undefined}
          >
            <div className="flex items-center">
              <span
                className={
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ' +
                  circle
                }
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  i + 1
                )}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={'ml-2 h-0.5 flex-1 rounded ' + bar}
                  aria-hidden
                />
              ) : null}
            </div>
            <p
              className={
                'mt-2 truncate text-xs font-bold sm:text-sm ' +
                (current || done ? 'text-brand-ink' : 'text-brand-muted')
              }
            >
              {step.label}
            </p>
            <p className="hidden truncate text-xs text-brand-muted sm:block">
              {step.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
