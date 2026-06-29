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
  { id: 1, label: 'Check' },
  { id: 2, label: 'Secure Claim' },
  { id: 3, label: 'Complete Details' },
  { id: 4, label: 'Sign & Submit' },
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
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-10">
      <div className="w-full max-w-[1260px] overflow-hidden rounded-[20px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
        {/* Dark Green Header */}
        <div
          className="px-4 pt-6 sm:px-8 sm:pt-7"
          style={{ backgroundColor: '#163300' }}
        >
          {/* Logo */}
          <div className="mb-5 flex items-center justify-center">
            <CompanyPensionLogo className="h-auto w-[260px] max-w-full" />
          </div>

          {/* Divider */}
          <div className="mx-auto mb-3 h-px w-full max-w-[890px] bg-white/20" />

          {/* Step Progress Indicator */}
          <div className="mx-auto flex max-w-[960px] items-center justify-center">
            {MAIN_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-[18px] font-semibold ${
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
                      className={`hidden whitespace-nowrap text-[16px] font-semibold sm:inline ${
                        isStepActive(step.id) || isStepCompleted(step.id)
                          ? 'text-[#9FE870]'
                          : 'text-white'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {/* Triangle Pointer — only under active step */}
                  <div className="mt-2">
                    {isStepActive(step.id) ? (
                      <div
                        className="w-0 h-0"
                        style={{
                          borderLeft: '9px solid transparent',
                          borderRight: '9px solid transparent',
                          borderBottom: '14px solid white',
                        }}
                      />
                    ) : (
                      <div className="h-[14px]" />
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < MAIN_STEPS.length - 1 && (
                  <div
                    className={`mx-2 mb-5 h-0.5 w-6 sm:mx-5 sm:w-24 ${
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
          <div className="-mt-1 mb-2 text-center sm:hidden">
            <span className="text-base text-white font-semibold">
              {MAIN_STEPS.find((s) => isStepActive(s.id))?.label}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[690px] px-7 py-8 sm:px-8">
          {/* Back Button */}
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="mb-10 flex items-center gap-2 text-[16px] font-semibold text-[#50536D] transition-opacity hover:opacity-70"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Sub-step Tabs for Complete Details / Sign and Submit */}
          {activeStep >= 3 && currentSubStep && (
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
