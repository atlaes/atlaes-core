'use client';

import React, { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import { SubmitDetailsSubStep, SUBMIT_DETAILS_SUBSTEPS } from '@/contexts/OnboardingContext';

interface GetStartedLayoutProps {
  children: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  activeStep?: 1 | 2 | 3 | 4;
  currentSubStep?: SubmitDetailsSubStep;
}

const MAIN_STEPS = [
  { id: 1, label: 'Eligibility' },
  { id: 2, label: 'Create Account' },
  { id: 3, label: 'Start Claim' },
  { id: 4, label: 'Submit Details' },
] as const;

// Icon components for sub-steps (copied from OnboardingLayout)
const SubStepIcon: React.FC<{ icon: string; isActive: boolean; isCompleted: boolean }> = ({
  icon,
  isActive,
  isCompleted,
}) => {
  const iconColor = isActive ? '#163300' : isCompleted ? '#163300' : '#9CA3AF';
  const bgColor = isActive ? '#9FE870' : isCompleted ? '#9FE870' : '#E5E7EB';

  const iconMap: Record<string, ReactNode> = {
    user: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    card: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    location: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    bank: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    pen: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
    document: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  };

  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      {iconMap[icon]}
    </div>
  );
};

export const GetStartedLayout: React.FC<GetStartedLayoutProps> = ({
  children,
  showBack = false,
  onBack,
  activeStep = 1,
  currentSubStep,
}) => {
  const isStepCompleted = (stepId: number) => stepId < activeStep;
  const isStepActive = (stepId: number) => stepId === activeStep;

  const isSubStepCompleted = (subStepId: SubmitDetailsSubStep) => {
    if (!currentSubStep) return false;
    const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
    const stepIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === subStepId);
    return stepIndex < currentIndex;
  };

  const isSubStepActive = (subStepId: SubmitDetailsSubStep) => subStepId === currentSubStep;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dark Green Header */}
        <div className="px-4 sm:px-8 pt-4 sm:pt-6" style={{ backgroundColor: '#163300' }}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <CompanyPensionLogo />
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/20 mb-6" />

          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center">
            {MAIN_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        isStepCompleted(step.id)
                          ? 'bg-[#9FE870] text-[#163300]'
                          : isStepActive(step.id)
                          ? 'bg-[#9FE870] text-[#163300]'
                          : 'border-2 border-white/70 text-white'
                      }`}
                    >
                      {isStepCompleted(step.id) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:inline ${
                        isStepActive(step.id) || isStepCompleted(step.id)
                          ? 'text-[#9FE870]'
                          : 'text-white'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {/* Triangle Pointer — only under active step */}
                  <div className="mt-3">
                    {isStepActive(step.id) ? (
                      <div
                        className="w-0 h-0"
                        style={{
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderBottom: '8px solid white',
                        }}
                      />
                    ) : (
                      <div className="h-2" />
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < MAIN_STEPS.length - 1 && (
                  <div
                    className={`w-6 sm:w-20 h-0.5 mx-1.5 sm:mx-4 mb-3 ${
                      isStepCompleted(step.id + 1) || isStepActive(step.id + 1)
                        ? 'bg-[#9FE870]'
                        : 'bg-white/50'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Active step label - mobile only */}
          <div className="text-center -mt-1 mb-2 sm:hidden">
            <span className="text-base text-white font-semibold">
              {MAIN_STEPS.find((s) => isStepActive(s.id))?.label}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-8">
          {/* Back Button */}
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#163300] font-medium mb-6 hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Sub-step Tabs (only for Step 4 - Submit Details) */}
          {activeStep === 4 && currentSubStep && (
            <div className="flex items-stretch mb-8 rounded-[5px] overflow-hidden" style={{ border: '0.84px solid #E5E7EB' }}>
              {SUBMIT_DETAILS_SUBSTEPS.map((subStep, index) => {
                const isActive = isSubStepActive(subStep.id);
                const isCompleted = isSubStepCompleted(subStep.id);

                return (
                  <React.Fragment key={subStep.id}>
                    {index > 0 && <div className="w-px bg-gray-200" />}
                    <div
                      className={`flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 flex-1 justify-center transition-colors ${
                        isActive ? 'bg-gray-50' : ''
                      }`}
                    >
                      <SubStepIcon
                        icon={subStep.icon}
                        isActive={isActive}
                        isCompleted={isCompleted}
                      />
                      <span
                        className={`text-sm font-medium whitespace-nowrap hidden sm:inline ${
                          isActive
                            ? 'text-[#163300]'
                            : isCompleted
                            ? 'text-[#163300]'
                            : 'text-gray-400'
                        }`}
                      >
                        {subStep.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
};

export default GetStartedLayout;
