'use client';

import React, { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Shield } from 'lucide-react';
import { useOnboarding, SubmitDetailsSubStep, SUBMIT_DETAILS_SUBSTEPS } from '@/contexts/OnboardingContext';

interface OnboardingLayoutProps {
  children: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

const MAIN_STEPS = [
  { id: 1, label: 'Create account' },
  { id: 2, label: 'Start claim' },
  { id: 3, label: 'Submit Details' },
] as const;

// Icon components for sub-steps
const SubStepIcon: React.FC<{ icon: string; isActive: boolean; isCompleted: boolean }> = ({
  icon,
  isActive,
  isCompleted,
}) => {
  const iconColor = isActive ? '#163300' : isCompleted ? '#163300' : '#9CA3AF';
  const bgColor = isActive ? '#9FE870' : isCompleted ? '#9FE870' : 'transparent';

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
      className="w-7 h-7 rounded-md flex items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      {iconMap[icon]}
    </div>
  );
};

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  showBack = true,
  onBack,
}) => {
  const router = useRouter();
  const { currentStep, currentSubStep, canProceedFromSubStep } = useOnboarding();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const isStepCompleted = (stepId: number) => stepId < currentStep;
  const isStepActive = (stepId: number) => stepId === currentStep;

  const isSubStepCompleted = (subStepId: SubmitDetailsSubStep) => {
    const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
    const stepIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === subStepId);
    return stepIndex < currentIndex || canProceedFromSubStep(subStepId);
  };

  const isSubStepActive = (subStepId: SubmitDetailsSubStep) => subStepId === currentSubStep;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dark Green Header */}
        <div
          className="px-8 py-6"
          style={{ backgroundColor: '#163300' }}
        >
          {/* Logo and Title */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#163300]" />
            </div>
            <h1 className="text-white text-xl font-semibold">Supplementary Pension Refund</h1>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/20 mb-6" />

          {/* Step Progress Indicator */}
          <div className="flex items-center justify-center">
            {MAIN_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Circle and Label */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      isStepCompleted(step.id)
                        ? 'bg-[#9FE870] text-[#163300]'
                        : isStepActive(step.id)
                        ? 'bg-[#9FE870] text-[#163300]'
                        : 'border-2 border-white/40 text-white/60'
                    }`}
                  >
                    {isStepCompleted(step.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isStepActive(step.id) || isStepCompleted(step.id)
                        ? 'text-[#9FE870]'
                        : 'text-white/60'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < MAIN_STEPS.length - 1 && (
                  <div
                    className={`w-20 h-0.5 mx-4 ${
                      isStepCompleted(step.id + 1) || isStepActive(step.id + 1)
                        ? 'bg-[#9FE870]'
                        : 'bg-white/30'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Triangle Pointer for Active Step */}
          <div className="flex justify-center mt-3">
            <div
              className="relative"
              style={{
                marginLeft:
                  currentStep === 1 ? '-200px' : currentStep === 2 ? '0' : '200px',
              }}
            >
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid white',
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {/* Back Button */}
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#163300] font-medium mb-6 hover:opacity-70 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Sub-step Tabs (only for Step 3) */}
          {currentStep === 3 && (
            <div className="flex items-center justify-center gap-2 mb-8 border-b border-gray-200 pb-4">
              {SUBMIT_DETAILS_SUBSTEPS.map((subStep) => {
                const isActive = isSubStepActive(subStep.id);
                const isCompleted = isSubStepCompleted(subStep.id);

                return (
                  <div
                    key={subStep.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-gray-100'
                        : ''
                    }`}
                  >
                    <SubStepIcon
                      icon={subStep.icon}
                      isActive={isActive}
                      isCompleted={isCompleted}
                    />
                    <span
                      className={`text-sm font-medium ${
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
                );
              })}
            </div>
          )}

          {/* Step Content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
