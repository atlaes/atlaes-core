'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVBLCalculator } from '../../hooks/useVBLCalculator';

interface StepContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  nextButtonText?: string;
  onNext?: () => void;
  showNextButton?: boolean;
}

export const StepContainer: React.FC<StepContainerProps> = ({
  title,
  description,
  children,
  showBackButton = true,
  nextButtonText = 'Next',
  onNext,
  showNextButton = true,
}) => {
  const { goToPreviousStep, goToNextStep, canProceed, currentStep, currentJobIndex } = useVBLCalculator();

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  const showBack = showBackButton && (currentStep > 0 || currentJobIndex > 0);

  return (
    <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
      <div className="w-full max-w-xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-10 pb-6 border-b border-gray-100">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            {title}
          </h1>
          {description && (
            <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              {description}
            </p>
          )}
        </div>

        {/* Form Content */}
        <div className="mb-10">{children}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          <div>
            {showBack && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          {showNextButton && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
              `}
              style={{
                fontFamily: 'var(--vbl-font-montserrat)',
                backgroundColor: canProceed() ? 'var(--vbl-accent-lime)' : '#E5E7EB',
                color: canProceed() ? 'var(--vbl-sidebar-dark)' : '#9CA3AF',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
              }}
            >
              {nextButtonText}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
