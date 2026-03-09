'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding, SUBMIT_DETAILS_SUBSTEPS, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import { useEligibility } from '@/contexts/EligibilityContext';
import { GetStartedLayout } from './GetStartedLayout';
import { CreateAccount } from '@/components/vbl/onboarding/steps/CreateAccount';
import { Payment } from '@/components/vbl/onboarding/steps/Payment';
import { Identity } from '@/components/vbl/onboarding/steps/Identity';
import { Membership } from '@/components/vbl/onboarding/steps/Membership';
import { Address } from '@/components/vbl/onboarding/steps/Address';
import { BankDetails } from '@/components/vbl/onboarding/steps/BankDetails';
import { Signature } from '@/components/vbl/onboarding/steps/Signature';
import { ReviewSubmit } from '@/components/vbl/onboarding/steps/ReviewSubmit';
import { SuccessScreen } from '@/components/vbl/onboarding/steps/SuccessScreen';
import { DRVUpsellModal } from '@/components/vbl/onboarding/DRVUpsellModal';

export function GetStartedOnboardingFlow() {
  const router = useRouter();
  const { data: eligibilityData } = useEligibility();
  const {
    data,
    updateData,
    currentStep,
    currentSubStep,
    setCurrentStep,
    setCurrentSubStep,
    updateSuccessData,
  } = useOnboarding();

  // Set pension type from eligibility data on mount
  useEffect(() => {
    if (data.pensionType === '') {
      const pensionType =
        eligibilityData.employmentType === 'private_sector'
          ? 'private'
          : 'public';
      updateData({ pensionType });
    }
  }, [data.pensionType, eligibilityData.employmentType, updateData]);

  // Success screen and DRV modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDRVModal, setShowDRVModal] = useState(false);

  const drvEligibilityDate = '15 Mar 2027';
  const isDRVEligibleNow = false;

  // Map onboarding step (1-3) to get-started step (2-4)
  const activeStep = (currentStep + 1) as 2 | 3 | 4;

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
      // Don't go back past Create Account — eligibility is already confirmed
      return;
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
      if (currentIndex > 0) {
        setCurrentSubStep(SUBMIT_DETAILS_SUBSTEPS[currentIndex - 1].id);
      } else {
        setCurrentStep(2);
      }
    }
  };

  const handleSubmitSuccess = () => {
    updateSuccessData({
      submittedAt: new Date().toISOString(),
      drvEligibilityDate: drvEligibilityDate,
    });
    setShowSuccess(true);
  };

  const handleEditSection = (subStep: SubmitDetailsSubStep) => {
    setCurrentSubStep(subStep);
  };

  const handleRemindDRV = () => {
    updateSuccessData({ drvReminderSet: true });
    setShowDRVModal(false);
  };

  const handleStartDRVClaim = () => {
    router.push('/calculator/drv');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  // Success screen
  if (showSuccess) {
    return (
      <GetStartedLayout showBack={false} activeStep={4} currentSubStep={currentSubStep}>
        <SuccessScreen
          onGoToDashboard={handleGoToDashboard}
          onStartDRVClaim={handleStartDRVClaim}
          onRemindDRV={handleRemindDRV}
          drvEligibilityDate={drvEligibilityDate}
          isDRVEligibleNow={isDRVEligibleNow}
        />
        <DRVUpsellModal
          isOpen={showDRVModal}
          onClose={() => setShowDRVModal(false)}
          onRemindLater={handleRemindDRV}
          onStartClaim={handleStartDRVClaim}
          eligibilityDate={drvEligibilityDate}
          isEligibleNow={isDRVEligibleNow}
        />
      </GetStartedLayout>
    );
  }

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
        return (
          <ReviewSubmit
            onSubmitSuccess={handleSubmitSuccess}
            onEditSection={handleEditSection}
          />
        );
      default:
        return null;
    }
  };

  return (
    <GetStartedLayout
      showBack={currentStep > 1}
      onBack={handleBack}
      activeStep={activeStep}
      currentSubStep={currentStep === 3 ? currentSubStep : undefined}
    >
      {renderStepContent()}
    </GetStartedLayout>
  );
}

export default GetStartedOnboardingFlow;
