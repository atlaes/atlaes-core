'use client';

import React, { ReactNode, useState, useEffect } from 'react';
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
  const {
    data,
    updateData,
    updateMembership,
    currentStep,
    currentSubStep,
    setCurrentStep,
    setCurrentSubStep,
    editingFromReview,
    setEditingFromReview,
    updateSuccessData,
  } = useOnboarding();

  // Track if user has completed pension type selection (pre-step).
  // Client #8: only show it when the calculator detected multiple claim
  // types (e.g., the user has both public and private sector jobs that
  // create separate claims). A single-type user has nothing to choose.
  const [detectedClaimTypes, setDetectedClaimTypes] = useState<string[]>([]);
  const [showPensionTypeSelection, setShowPensionTypeSelection] = useState(
    () => {
      if (typeof window !== 'undefined') {
        const calc = sessionStorage.getItem('calculator-selection');
        if (calc) {
          try {
            const parsed = JSON.parse(calc) as { claimTypes?: string[] };
            const types = parsed.claimTypes ?? [];
            // Only show when user has mixed sectors creating separate claims:
            // a public/stage pension claim AND a private pension claim.
            const hasPublicOrStage =
              types.includes('public') || types.includes('stage');
            const hasPrivate = types.includes('private');
            return hasPublicOrStage && hasPrivate;
          } catch {
            // fall through to eligibility check
          }
        }
        const eligibilityResult = sessionStorage.getItem('eligibility-result');
        if (eligibilityResult) return false;
      }
      return data.pensionType === '';
    }
  );

  // Process eligibility result from /get-started flow
  useEffect(() => {
    const stored = sessionStorage.getItem('eligibility-result');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.eligible) {
          updateData({ pensionType: 'public' });
        }
      } catch {
        // Ignore parsing errors
      }
      sessionStorage.removeItem('eligibility-result');
    }
  }, [updateData]);

  // Client #12: carry the pension provider chosen in the calculator into
  // the onboarding Membership step so the user cannot re-pick a different
  // provider during claim filing. Also captures detected claim types for
  // the dynamic pension-type selection screen (client #8).
  useEffect(() => {
    const stored = sessionStorage.getItem('calculator-selection');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        pensionProvider?: string;
        claimTypes?: string[];
      };
      if (parsed.pensionProvider) {
        updateMembership({ pensionProvider: parsed.pensionProvider });
      }
      if (parsed.claimTypes) {
        setDetectedClaimTypes(parsed.claimTypes);
      }
    } catch {
      // Ignore parsing errors
    }
    sessionStorage.removeItem('calculator-selection');
  }, [updateMembership]);

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
    // Client #16: if the user is editing a field they jumped to from the
    // review screen, Continue should return them to review, not walk through
    // every remaining step again.
    if (editingFromReview) {
      setEditingFromReview(false);
      setCurrentSubStep('review');
      return;
    }
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

  // Handle edit section from review. Flags the flow as "editing from review"
  // so the next Continue routes back to review instead of advancing linearly.
  const handleEditSection = (subStep: SubmitDetailsSubStep) => {
    setEditingFromReview(true);
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

  // If pension type not selected yet, show that screen.
  // Client #8: pass detected claim types so the card labels can render
  // dynamically ("Public Sector Pension" vs "Stage Pension" vs both).
  if (showPensionTypeSelection) {
    return (
      <PensionTypeSelection
        onNext={handlePensionTypeNext}
        headerTitle={headerTitle}
        headerIcon={headerIcon}
        claimTypes={detectedClaimTypes}
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
