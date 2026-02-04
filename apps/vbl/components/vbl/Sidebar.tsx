'use client';

import React from 'react';
import { Check, MessageCircle } from 'lucide-react';
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
    description: 'Enter the start/end months and salary for each job',
  },
  {
    id: 2,
    title: 'Your results',
    description: 'See your estimated refund',
  },
];

export const Sidebar: React.FC = () => {
  const { currentStep, currentJobIndex, formData, completedSteps, setCurrentStep, setCurrentJobIndex } = useVBLCalculator();

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
      }
    }
  };

  const getJobProgressLabel = (): string => {
    if (currentStep === 1 && formData.numberOfJobs > 0) {
      return `(${currentJobIndex + 1}/${formData.numberOfJobs})`;
    }
    return '';
  };

  return (
    <div
      className="w-72 px-4 py-6 flex flex-col flex-shrink-0 rounded-2xl shadow-lg"
      style={{
        background: 'var(--vbl-sidebar-dark)',
      }}
    >
      {/* Logo/Branding */}
      <div className="flex items-center gap-3 mb-10 px-2">
        {/* Placeholder logo */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          style={{ backgroundColor: 'var(--vbl-accent-lime)' }}
        >
          <span role="img" aria-label="shield">🛡️</span>
        </div>
        <div>
          <h1 className="text-white font-semibold text-lg leading-tight">Supplementary</h1>
          <h2 className="text-white/90 text-sm">Pension Refund</h2>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 space-y-2">
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
                w-full px-4 py-3 flex items-center gap-3
                transition-all duration-200 rounded-xl text-left
                ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--vbl-accent-lime)',
                    }
                  : {}
              }
            >
              {/* Step number/check circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  font-semibold text-base transition-all duration-200
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
              <div className="flex-1 pt-1">
                <div
                  className={`font-semibold text-sm ${
                    isActive ? 'text-[#163300]' : isComplete ? 'text-white' : 'text-white/60'
                  }`}
                >
                  {step.title}
                  {step.id === 1 && isActive && (
                    <span className="ml-1 font-normal">{getJobProgressLabel()}</span>
                  )}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
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
      <div className="mt-auto pt-6 border-t border-white/10 px-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-white font-medium text-sm">Need help?</p>
            <p className="text-white/60 text-xs">Our assistant is here for you.</p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--vbl-accent-lime)' }}
          >
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--vbl-sidebar-dark)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
