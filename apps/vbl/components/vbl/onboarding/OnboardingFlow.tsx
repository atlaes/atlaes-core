'use client';

import React, { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding, SUBMIT_DETAILS_SUBSTEPS, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import { OnboardingLayout } from '@/components/vbl/onboarding/OnboardingLayout';
import { PensionTypeSelection } from '@/components/vbl/onboarding/steps/PensionTypeSelection';
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

interface OnboardingFlowProps {
  headerTitle?: string;
  headerIcon?: ReactNode;
}

export function OnboardingFlow({ headerTitle, headerIcon }: OnboardingFlowProps) {
  const router = useRouter();
  const { data, currentStep, currentSubStep, setCurrentStep, setCurrentSubStep, updateSuccessData } = useOnboarding();

  // Track if user has completed pension type selection (pre-step)
  const [showPensionTypeSelection, setShowPensionTypeSelection] = useState(
    data.pensionType === ''
  );

  // Success screen and DRV modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDRVModal, setShowDRVModal] = useState(false);

  // Example: determine DRV eligibility (in real app, this would come from backend)
  const drvEligibilityDate = '15 Mar 2027';
  const isDRVEligibleNow = false;

  // Handle pension type selection completion
  const handlePensionTypeNext = () => {
    setShowPensionTypeSelection(false);
  };

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
      setShowPensionTypeSelection(true);
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

  // Handle successful submission
  const handleSubmitSuccess = () => {
    updateSuccessData({
      submittedAt: new Date().toISOString(),
      drvEligibilityDate: drvEligibilityDate,
    });
    setShowSuccess(true);
  };

  // Handle edit section from review
  const handleEditSection = (subStep: SubmitDetailsSubStep) => {
    setCurrentSubStep(subStep);
  };

  // Handle DRV reminder
  const handleRemindDRV = () => {
    updateSuccessData({ drvReminderSet: true });
    setShowDRVModal(false);
  };

  // Handle starting DRV claim
  const handleStartDRVClaim = () => {
    router.push('/calculator/drv');
  };

  // Handle go to dashboard
  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  // If pension type not selected yet, show that screen
  if (showPensionTypeSelection) {
    return (
      <PensionTypeSelection
        onNext={handlePensionTypeNext}
        headerTitle={headerTitle}
        headerIcon={headerIcon}
      />
    );
  }

  // If submission was successful, show success screen
  if (showSuccess) {
    return (
      <OnboardingLayout showBack={false} headerTitle={headerTitle} headerIcon={headerIcon}>
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
      </OnboardingLayout>
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
    <OnboardingLayout showBack={true} onBack={handleBack} headerTitle={headerTitle} headerIcon={headerIcon}>
      {renderStepContent()}
    </OnboardingLayout>
  );
}

export default OnboardingFlow;
