'use client';

import React from 'react';
import { Check, Info, Wallet, FileText } from 'lucide-react';
import { useVBLCalculator } from '../../hooks/useVBLCalculator';

interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    id: 0,
    title: 'General Info',
    icon: <Info className="w-5 h-5" />,
  },
  {
    id: 1,
    title: 'Income',
    icon: <Wallet className="w-5 h-5" />,
  },
  {
    id: 2,
    title: 'Estimate',
    icon: <FileText className="w-5 h-5" />,
  },
];

export const Sidebar: React.FC = () => {
  const { currentStep, currentSubStep, completedSteps, setCurrentStep, setCurrentSubStep } = useVBLCalculator();

  const isStepComplete = (stepId: number): boolean => {
    // Check if all sub-steps of this step are completed
    if (stepId === 0) {
      return completedSteps.has('0-3');
    }
    if (stepId === 1) {
      return completedSteps.has('1-1');
    }
    return completedSteps.has('2-0');
  };

  const isStepActive = (stepId: number): boolean => {
    return currentStep === stepId;
  };

  const getSubStepLabel = (): string => {
    if (currentStep === 0) {
      return `${currentSubStep + 1}/3`;
    }
    if (currentStep === 1) {
      return `${currentSubStep + 1}/2`;
    }
    return '';
  };

  return (
    <div className="w-72 bg-white min-h-screen p-6 border-r border-gray-200">
      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--vbl-color-primary)' }}>
          Germany <span style={{ color: 'var(--vbl-color-accent)' }}>&gt;&gt;</span>
        </h1>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--vbl-color-primary)' }}>
          Pension Refund
        </h2>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isActive = isStepActive(step.id);
          const isComplete = isStepComplete(step.id);

          return (
            <button
              key={step.id}
              onClick={() => {
                // Allow navigation to completed steps or current step
                if (isComplete || isActive || step.id < currentStep) {
                  setCurrentStep(step.id);
                  setCurrentSubStep(0);
                }
              }}
              disabled={!isComplete && !isActive && step.id > currentStep}
              className={`
                w-full px-4 py-3 flex items-center justify-between
                transition-all duration-200 border-none
                ${
                  isActive
                    ? 'text-gray-800'
                    : isComplete
                    ? 'bg-white text-gray-700 hover:bg-gray-50 rounded-lg'
                    : 'bg-white text-gray-400 cursor-not-allowed rounded-lg'
                }
              `}
              style={
                isActive
                  ? {
                      background: '#50C9A5',
                      opacity: 0.3,
                      borderRadius: '15px',
                    }
                  : {}
              }
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${
                    isActive
                      ? 'bg-white/20'
                      : isComplete
                      ? 'bg-[#50C9A5] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }
                `}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">{step.title}</div>
                  {isActive && currentStep < 2 && (
                    <div className="text-xs opacity-90">{getSubStepLabel()}</div>
                  )}
                </div>
              </div>
              {isComplete && !isActive && <Check className="w-5 h-5 text-[#50C9A5]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
