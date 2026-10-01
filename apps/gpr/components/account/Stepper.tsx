import type { AccountStep } from '@/lib/account-api';

/**
 * Four-step progress (Figma "Stepper"): a 4px bar per step — navy when
 * done or current, #c6c6c6 ahead — with a Semi Bold 13 label and a muted
 * 12px detail line underneath.
 */
export function Stepper({ steps }: { steps: AccountStep[] }) {
  return (
    <ol className="acc-stepper" aria-label="Application progress">
      {steps.map((step) => {
        const done = step.state === 'done';
        const current = step.state === 'current';
        return (
          <li
            key={step.key}
            className={
              'acc-step' +
              (done ? ' acc-step-done' : current ? ' acc-step-current' : '')
            }
            aria-current={current ? 'step' : undefined}
          >
            <span className="acc-step-bar" aria-hidden="true" />
            <p className="acc-step-label">
              {done ? <span aria-hidden="true">✓</span> : null}
              {step.label}
            </p>
            <p className="acc-step-detail">{step.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}
