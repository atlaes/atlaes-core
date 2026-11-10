'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';

interface Step {
  label: string;
  subLabel?: string;
}

/**
 * The one step counter of the flow (ST-034): check flows show
 * "Check your eligibility (1/2 · 2/2)" → "Create account"; the
 * calculator flow "Basic eligibility" → "Create account".
 */
export default function ProgressStepper() {
  const { step, flowType, decision } = useEligibilityCheck();
  const isCalc = flowType === 'calculator';

  const first: Step = isCalc
    ? { label: 'Basic eligibility' }
    : {
        label: 'Check your eligibility',
        subLabel: step === 'countries' ? '(1/2)' : '(2/2)',
      };
  const displaySteps: Step[] = [first, { label: 'Create account' }];

  const progressIndex =
    step === 'account' ||
    (step === 'result' && decision && decision.result !== 'NOT_NOW')
      ? 1
      : 0;

  // Check if a step is completed
  const isStepCompleted = (index: number) => {
    return index < progressIndex;
  };

  // Check if a step is current
  const isStepCurrent = (index: number) => {
    return index === progressIndex;
  };

  return (
    <div className="eligibility-progress">
      <div className="eligibility-progress-container">
        {displaySteps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="eligibility-progress-step">
              <div
                className={`eligibility-progress-circle ${
                  isStepCompleted(index)
                    ? 'completed'
                    : isStepCurrent(index)
                      ? 'current'
                      : 'pending'
                }`}
              >
                {isStepCompleted(index) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`eligibility-progress-label ${
                  isStepCurrent(index) ? 'current' : ''
                }`}
              >
                {step.label}
                {step.subLabel && (
                  <span className="eligibility-progress-sublabel">
                    {' '}
                    {step.subLabel}
                  </span>
                )}
              </span>
            </div>
            {index < displaySteps.length - 1 && (
              <div
                className={`eligibility-progress-line ${
                  isStepCompleted(index) ? 'completed' : ''
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
