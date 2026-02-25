'use client';

import React, { ReactNode } from 'react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';

interface StepCardProps {
  children: ReactNode;
  showBackButton?: boolean;
  showNextButton?: boolean;
  nextButtonText?: string;
  backButtonText?: string;
  onNext?: () => void;
  onBack?: () => void;
  stepIndicator?: string;
}

export default function StepCard({
  children,
  showBackButton = true,
  showNextButton = true,
  nextButtonText = 'Next',
  backButtonText = 'Back',
  onNext,
  onBack,
  stepIndicator,
}: StepCardProps) {
  const { goToNextStep, goToPreviousStep, canProceed, currentStep, flowType } =
    useEligibilityCheck();

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToPreviousStep();
    }
  };

  // Calculate step indicator text based on flow type
  const getStepIndicator = () => {
    if (stepIndicator) return stepIndicator;

    if (flowType === 'calculator') {
      // Calculator: only 1 form step before result
      if (currentStep === 0) return 'Step 1 of 2';
      return '';
    }

    if (flowType === '2-step') {
      // 2-step: 2 form steps before result
      if (currentStep <= 1) return `Step ${currentStep + 1} of 2`;
      return '';
    }

    if (flowType === '3-step') {
      // 3-step: 3 form steps before result
      if (currentStep <= 2) return `Step ${currentStep + 1} of 3`;
      return '';
    }

    return '';
  };

  const indicator = getStepIndicator();

  return (
    <div className="eligibility-card">
      <div className="eligibility-card-content">{children}</div>
      {(showBackButton || showNextButton || indicator) && (
        <div className="eligibility-card-footer">
          {indicator && (
            <span className="eligibility-step-indicator">{indicator}</span>
          )}
          <div className="eligibility-card-buttons">
            {showBackButton && currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="eligibility-btn-back"
              >
                {backButtonText}
              </button>
            )}
            {showNextButton && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="eligibility-btn-next"
              >
                {nextButtonText}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
