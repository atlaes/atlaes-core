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
  const { goToNextStep, goToPreviousStep, canProceed, currentStep } =
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

  // One step counter only (ST-034): the progress stepper above the card.
  const indicator = stepIndicator || '';

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
