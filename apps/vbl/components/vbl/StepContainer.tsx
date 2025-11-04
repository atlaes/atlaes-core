'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
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
  const { goToPreviousStep, goToNextStep, canProceed, currentStep } = useVBLCalculator();

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

  return (
    <div className="flex-1 min-h-screen flex flex-col" style={{ background: '#F7F8F6' }}>
      {/* Header */}
      <div className="px-12 py-6 border-b border-gray-200" style={{ background: '#F7F8F6' }}>
        <p className="text-right text-sm" style={{ color: 'var(--vbl-color-gray)' }}>
          <span style={{ color: 'var(--vbl-color-black)' }}>German Pension Refund Calculator</span>
          {' - '}
          <span style={{ color: 'var(--vbl-color-accent)' }}>Easy, Fast & Secure</span>
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="vbl-style-5" style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}>{title}</h1>
            {description && <p className="vbl-style-2 mt-3">{description}</p>}
          </div>

          {/* Form Content */}
          <div className="mb-16">{children}</div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <div>
              {showBackButton && currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                  style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="font-semibold">Back</span>
                </button>
              )}
            </div>

            {showNextButton && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`
                  px-8 py-3 rounded-lg font-semibold transition-all duration-200
                  ${
                    canProceed()
                      ? 'bg-[#50C9A5] text-white hover:bg-[#45b894] shadow-md'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
                style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
              >
                {nextButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
