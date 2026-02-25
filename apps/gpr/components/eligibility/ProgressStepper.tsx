'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';

interface Step {
  label: string;
  subLabel?: string;
}

export default function ProgressStepper() {
  const { currentStep, flowType } = useEligibilityCheck();

  // Calculator flow: "Basic eligibility" -> "Create account"
  const stepsCalculator: Step[] = [
    { label: 'Basic eligibility' },
    { label: 'Create account' },
  ];

  // 2-step flow: "Check your eligibility (x/2)" -> "Create account"
  const steps2Step: Step[] = [
    { label: 'Check your eligibility', subLabel: '(1/2)' },
    { label: 'Create account' },
  ];

  // 3-step flow: "Check your eligibility (x/2)" -> "Additional info" -> "Create account"
  const steps3Step: Step[] = [
    { label: 'Check your eligibility', subLabel: '(1/2)' },
    { label: 'Additional info' },
    { label: 'Create account' },
  ];

  const getSteps = () => {
    switch (flowType) {
      case 'calculator': return stepsCalculator;
      case '2-step': return steps2Step;
      case '3-step': return steps3Step;
      default: return stepsCalculator;
    }
  };

  const steps = getSteps();

  // Map current step to progress step index based on flow type
  const getProgressStepIndex = () => {
    if (flowType === 'calculator') {
      // 0 = citizenship -> Basic eligibility
      // 1+ = result/account -> Create account
      return currentStep === 0 ? 0 : 1;
    }

    if (flowType === '2-step') {
      // 0,1 = eligibility check steps -> "Check your eligibility"
      // 2+ = result/account -> "Create account"
      return currentStep <= 1 ? 0 : 1;
    }

    if (flowType === '3-step') {
      // 0,1 = eligibility check -> "Check your eligibility"
      // 2 = additional info -> "Additional info"
      // 3+ = result/account -> "Create account"
      if (currentStep <= 1) return 0;
      if (currentStep === 2) return 1;
      return 2;
    }

    return 0;
  };

  const progressIndex = getProgressStepIndex();

  // Update step label with sub-step indicator for 2-step and 3-step flows
  const getUpdatedSteps = () => {
    if (flowType === '2-step' && currentStep <= 1) {
      return steps.map((step, i) => {
        if (i === 0) {
          return { ...step, subLabel: `(${currentStep + 1}/2)` };
        }
        return step;
      });
    }
    if (flowType === '3-step' && currentStep <= 1) {
      return steps.map((step, i) => {
        if (i === 0) {
          return { ...step, subLabel: `(${currentStep + 1}/2)` };
        }
        return step;
      });
    }
    return steps;
  };

  const displaySteps = getUpdatedSteps();

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
