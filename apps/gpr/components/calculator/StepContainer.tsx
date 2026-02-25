'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useGPRCalculator } from '@/hooks/useGPRCalculator';

interface StepContainerProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  showNextButton?: boolean;
  nextButtonText?: string;
  onBack?: () => void;
  onNext?: () => void;
  backText?: string;
}

export default function StepContainer({
  children,
  showBackButton = false,
  showNextButton = true,
  nextButtonText = 'Next',
  onBack,
  onNext,
  backText = 'Back',
}: StepContainerProps) {
  const { canProceed, goToPreviousStep } = useGPRCalculator();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToPreviousStep();
    }
  };

  const isNextDisabled = !canProceed();

  return (
    <div className="gpr-step-container">
      {showBackButton && (
        <button
          type="button"
          onClick={handleBack}
          className="gpr-back-link"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backText}</span>
        </button>
      )}

      <div className="gpr-step-content-area">
        {children}
      </div>

      {showNextButton && (
        <button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled}
          className="gpr-next-button"
        >
          <span>{nextButtonText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
