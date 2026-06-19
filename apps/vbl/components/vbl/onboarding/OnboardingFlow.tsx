'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboarding, SUBMIT_DETAILS_SUBSTEPS, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import { getPendingCalculatorSession } from '@/lib/vbl-pending-calculator-sessions-api';
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
  const searchParams = useSearchParams();
  const sessionToken = searchParams?.get('session') ?? null;
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
  // Figma VBL-30/31/32: the card subtitles show the actual providers
  // carried over from the calculator (e.g. private: BVV/Allianz/Swiss Life).
  const [detectedPrivateProvider, setDetectedPrivateProvider] = useState('');
  const [detectedPublicStageProvider, setDetectedPublicStageProvider] = useState('');
  const [showPensionTypeSelection, setShowPensionTypeSelection] = useState(
    () => {
      if (typeof window === 'undefined') return data.pensionType === '';
      // If a session token is in the URL, defer the decision to the
      // hydration effect (it'll setShowPensionTypeSelection based on
      // detected claim types).
      const params = new URLSearchParams(window.location.search);
      if (params.get('session')) return false;
      // Legacy fallback path: same logic as before.
      const calc = sessionStorage.getItem('calculator-selection');
      if (calc) {
        try {
          const parsed = JSON.parse(calc) as { claimTypes?: string[] };
          const types = parsed.claimTypes ?? [];
          const hasPublicOrStage =
            types.includes('public') || types.includes('stage');
          const hasPrivate = types.includes('private');
          return hasPublicOrStage && hasPrivate;
        } catch {
          // fall through
        }
      }
      const eligibilityResult = sessionStorage.getItem('eligibility-result');
      if (eligibilityResult) return false;
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

  // Hydrate from server-side pending_calculator_sessions when a token is
  // present in the URL. Falls back to sessionStorage `calculator-selection`
  // if no token (soft-fail path from Results.tsx where the POST failed).
  useEffect(() => {
    let cancelled = false;

    const applySelection = (parsed: {
      pensionProvider?: string;
      claimTypes?: string[];
      privateProvider?: string;
      publicStageProvider?: string;
    }) => {
      if (cancelled) return;
      if (parsed.pensionProvider) {
        updateMembership({ pensionProvider: parsed.pensionProvider });
      }
      if (parsed.claimTypes) {
        setDetectedClaimTypes(parsed.claimTypes);
        const hasPublicOrStage =
          parsed.claimTypes.includes('public') || parsed.claimTypes.includes('stage');
        const hasPrivate = parsed.claimTypes.includes('private');
        setShowPensionTypeSelection(hasPublicOrStage && hasPrivate);
      }
      if (parsed.privateProvider) {
        setDetectedPrivateProvider(parsed.privateProvider);
      }
      if (parsed.publicStageProvider) {
        setDetectedPublicStageProvider(parsed.publicStageProvider);
      }
    };

    const hydrate = async () => {
      if (sessionToken) {
        const session = await getPendingCalculatorSession(sessionToken);
        if (session && !cancelled) {
          applySelection({
            pensionProvider: session.pensionProvider ?? undefined,
            claimTypes: session.claimTypes ?? [],
            privateProvider: session.privateProvider ?? undefined,
            publicStageProvider: session.publicStageProvider ?? undefined,
          });
          // Cache the token in sessionStorage so CreateAccount can link the
          // email to it on submit without re-parsing the URL.
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('vbl-pending-calculator-session-token', sessionToken);
          }
          return;
        }
      }

      // Fallback: legacy sessionStorage payload (still written by Results.tsx)
      const stored =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('calculator-selection')
          : null;
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as {
          pensionProvider?: string;
          claimTypes?: string[];
          privateProvider?: string;
          publicStageProvider?: string;
        };
        applySelection(parsed);
      } catch {
        // Ignore parsing errors
      }
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('calculator-selection');
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [sessionToken, updateMembership]);

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

  // Figma VBL-23/24: mixed-claim continuation. When the user had both a
  // supplementary and a private-sector claim, SuccessScreen offers a button
  // to start the still-pending second claim. We infer the pending side by
  // subtracting the just-submitted `pensionType` from `detectedClaimTypes`.
  const pendingOtherClaim = (() => {
    const hasPrivate = detectedClaimTypes.includes('private');
    const hasPublicOrStage =
      detectedClaimTypes.includes('public') ||
      detectedClaimTypes.includes('stage') ||
      detectedClaimTypes.includes('orchestra');
    if (data.pensionType === 'public' && hasPrivate) {
      return {
        label: 'Private-sector pension',
        provider: detectedPrivateProvider || 'BVV',
      };
    }
    if (data.pensionType === 'private' && hasPublicOrStage) {
      return {
        label: 'Public-sector pension',
        provider: detectedPublicStageProvider || 'VBLklassik',
      };
    }
    return null;
  })();

  const handleStartOtherClaim = () => {
    // Flip the pensionType and re-enter the onboarding flow from step 1.
    // Most users will still be authenticated so they'll skip CreateAccount.
    updateData({ pensionType: data.pensionType === 'public' ? 'private' : 'public' });
    setShowSuccess(false);
    setCurrentStep(2);
    setCurrentSubStep('identity');
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
        privateProvider={detectedPrivateProvider}
        publicStageProvider={detectedPublicStageProvider}
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
          otherClaimLabel={pendingOtherClaim?.label}
          otherClaimProvider={pendingOtherClaim?.provider}
          onStartOtherClaim={pendingOtherClaim ? handleStartOtherClaim : undefined}
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
