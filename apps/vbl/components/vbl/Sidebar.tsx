'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useVBLCalculator } from '../../hooks/useVBLCalculator';

interface StepConfig {
  id: number;
  title: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    id: 0,
    title: 'Number of jobs',
    description: 'Count each employment period in Germany',
  },
  {
    id: 1,
    title: 'Job details',
    description: 'Enter employment dates, salary, and sector for each job.',
  },
  {
    id: 2,
    title: 'Refund estimate',
    description: 'See your estimated refund',
  },
];

export const Sidebar: React.FC = () => {
  const { currentStep, currentJobIndex, formData, completedSteps, setCurrentStep, setCurrentJobIndex, setCurrentJobSubStep } = useVBLCalculator();

  const isStepComplete = (stepId: number): boolean => {
    return completedSteps.has(stepId);
  };

  const isStepActive = (stepId: number): boolean => {
    return currentStep === stepId;
  };

  const canNavigateToStep = (stepId: number): boolean => {
    return isStepComplete(stepId) || isStepActive(stepId) || stepId < currentStep;
  };

  const handleStepClick = (stepId: number) => {
    if (canNavigateToStep(stepId)) {
      setCurrentStep(stepId);
      if (stepId === 1) {
        setCurrentJobIndex(0);
        // Always land on the main job form when jumping via the sidebar —
        // the optional private sub-step is only reached linearly via Next.
        setCurrentJobSubStep('main');
      }
    }
  };

  const getJobProgressLabel = (stepId: number): string => {
    if (stepId === 1 && formData.numberOfJobs > 0) {
      if (currentStep === 1) {
        return `(${currentJobIndex + 1}/${formData.numberOfJobs})`;
      }
      // Show completed count when step is done
      if (isStepComplete(1)) {
        return `(${formData.numberOfJobs}/${formData.numberOfJobs})`;
      }
    }
    return '';
  };

  return (
    <div
      className="w-[334px] px-4 py-6 flex flex-col flex-shrink-0 rounded-[20px] shadow-lg overflow-hidden"
      style={{
        background: 'var(--vbl-sidebar-dark)',
      }}
    >
      {/* Logo/Branding */}
      <div className="mb-10 px-2 flex justify-center">
        <img
          src="/logo-horizontal.png"
          alt="Company Pension"
          className="w-[173px]"
        />
      </div>

      {/* Gradient divider */}
      <div className="absolute w-[350px] top-[140px] h-[2px] left-0 right-0 bg-white/100" />

      {/* Steps */}
      <div className="flex-1 space-y-2 px-2 ">
        {STEPS.map((step) => {
          const isActive = isStepActive(step.id);
          const isComplete = isStepComplete(step.id);
          const canNavigate = canNavigateToStep(step.id);

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              disabled={!canNavigate}
              className={`
                w-full px-4 py-4 flex items-center gap-3
                transition-all duration-200 rounded-xl text-left relative
                ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
            >
              {/* Active step background */}
              {isActive && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-2 -right-6 h-full rounded-l-xl"
                  style={{ backgroundColor: 'var(--vbl-accent-lime)' }}
                />
              )}

              {/* Step number/check circle */}
              <div
                className={`
                  relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                  font-semibold text-lg transition-all duration-200
                `}
                style={
                  isComplete
                    ? {
                        backgroundColor: 'var(--vbl-accent-lime)',
                        color: 'var(--vbl-sidebar-dark)',
                      }
                    : isActive
                    ? {
                        backgroundColor: 'var(--vbl-sidebar-dark)',
                        color: '#FFFFFF',
                      }
                    : {
                        backgroundColor: 'transparent',
                        border: '2px solid rgba(255, 255, 255, 0.4)',
                        color: 'rgba(255, 255, 255, 0.6)',
                      }
                }
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id + 1
                )}
              </div>

              {/* Step text */}
              <div className="relative z-10 flex-1 pt-1">
                <div
                  className={`font-semibold text-base ${
                    isActive ? 'text-[#163300]' : isComplete ? 'text-white' : 'text-white/60'
                  }`}
                >
                  {step.title}
                  {step.id === 1 && (
                    <span className="ml-1 font-normal">{getJobProgressLabel(step.id)}</span>
                  )}
                </div>
                <div
                  className={`text-sm mt-0.5 ${
                    isActive ? 'text-[#163300]/80' : isComplete ? 'text-white/80' : 'text-white/40'
                  }`}
                >
                  {step.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Need help section */}
      <div className="mt-auto pt-6 px-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-white font-bold text-base">Need help?</p>
            <p className="text-white/60 text-sm">Our assistant is here for you.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/100 flex items-center justify-center flex-shrink-0">
            <img src="/chat-bubble.png" alt="Chat" className="w-7 h-7" />
          </div>
        </div>
      </div>
    </div>
  );
};
