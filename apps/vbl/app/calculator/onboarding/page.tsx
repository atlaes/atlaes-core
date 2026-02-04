'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingProvider, useOnboarding, SUBMIT_DETAILS_SUBSTEPS, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from '@/components/vbl/onboarding/OnboardingLayout';
import { CreateAccount } from '@/components/vbl/onboarding/steps/CreateAccount';
import { Payment } from '@/components/vbl/onboarding/steps/Payment';
import { Identity } from '@/components/vbl/onboarding/steps/Identity';
import { Membership } from '@/components/vbl/onboarding/steps/Membership';
import { Address } from '@/components/vbl/onboarding/steps/Address';
import { BankDetails } from '@/components/vbl/onboarding/steps/BankDetails';
import { Signature } from '@/components/vbl/onboarding/steps/Signature';
import { ReviewSubmit } from '@/components/vbl/onboarding/steps/ReviewSubmit';

function OnboardingContent() {
  const router = useRouter();
  const { currentStep, currentSubStep, setCurrentStep, setCurrentSubStep } = useOnboarding();

  // Navigation handlers
  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
    setCurrentSubStep('identity');
  };

  const handleSubStepNext = () => {
    const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
    if (currentIndex < SUBMIT_DETAILS_SUBSTEPS.length - 1) {
      setCurrentSubStep(SUBMIT_DETAILS_SUBSTEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // Go back to calculator results
      router.push('/calculator');
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
      if (currentIndex > 0) {
        setCurrentSubStep(SUBMIT_DETAILS_SUBSTEPS[currentIndex - 1].id);
      } else {
        // Go back to payment
        setCurrentStep(2);
      }
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <CreateAccount onNext={handleStep1Next} />;
      case 2:
        return <Payment onNext={handleStep2Next} />;
      case 3:
        return renderSubStep();
      default:
        return null;
    }
  };

  // Render Step 3 sub-step content
  const renderSubStep = () => {
    switch (currentSubStep) {
      case 'identity':
        return <Identity onNext={handleSubStepNext} />;
      case 'membership':
        return <Membership onNext={handleSubStepNext} />;
      case 'address':
        return <Address onNext={handleSubStepNext} />;
      case 'bank-details':
        return <BankDetails onNext={handleSubStepNext} />;
      case 'signature':
        return <Signature onNext={handleSubStepNext} />;
      case 'review':
        return <ReviewSubmit />;
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout showBack={currentStep !== 1 || currentSubStep !== 'identity'} onBack={handleBack}>
      {renderStepContent()}
    </OnboardingLayout>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}
