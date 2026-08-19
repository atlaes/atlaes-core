'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  areConfirmStopAnswersClear,
  getSubmitDetailsSubsteps,
  isConfirmComplete,
  useOnboarding,
  SUBMIT_DETAILS_SUBSTEPS,
  SubmitDetailsSubStep,
} from '@/contexts/OnboardingContext';
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
import { ConfirmStep } from '@/components/vbl/onboarding/steps/ConfirmStep';
import { SuccessScreen } from '@/components/vbl/onboarding/steps/SuccessScreen';
import { DRVUpsellModal } from '@/components/vbl/onboarding/DRVUpsellModal';
import {
  isCalculatorVariant,
  type OnboardingSource,
  type OnboardingVariant,
} from '@/components/vbl/onboarding/onboarding-variant';
import { saveFlowIdentity } from '@/lib/flow-persistence';
import { clearAllFlowPersistence } from '@/lib/flow-persistence';
import { markStepComplete, stopClaim, submitClaim } from '@/lib/onboarding-api';

interface OnboardingFlowProps {
  headerTitle?: string;
  headerIcon?: ReactNode;
  source?: OnboardingSource;
}

export function OnboardingFlow({
  headerTitle,
  headerIcon,
  source = 'default',
}: OnboardingFlowProps) {
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
    resetOnboarding,
  } = useOnboarding();

  const isCalculatorSource = source === 'calculator';

  // The calculator may surface a private/bAV claim, but its calculator
  // variant must never be applied to that paygate.
  const variant: OnboardingVariant =
    isCalculatorSource && data.pensionType !== 'private'
      ? 'calculator'
      : 'default';

  // Variant-specific UI begins in Tasks 3–7. Keep the guard evaluated here
  // so this flow cannot accidentally treat a private/bAV claim as calculator
  // variant while redirect persistence is added independently below.
  void isCalculatorVariant(variant);

  const submitDetailsSubsteps =
    data.pensionType === 'private'
      ? SUBMIT_DETAILS_SUBSTEPS
      : variant === 'calculator'
        ? getSubmitDetailsSubsteps(data.pensionType).map((subStep) =>
            subStep.id === 'review'
              ? { ...subStep, label: 'Review' }
              : subStep
          )
        : SUBMIT_DETAILS_SUBSTEPS;
  const isSignatureTerminal =
    submitDetailsSubsteps[submitDetailsSubsteps.length - 1]?.id ===
    'signature';

  useEffect(() => {
    if (!isCalculatorSource) return;
    saveFlowIdentity({
      pensionType: data.pensionType,
      pensionProvider: data.membership.pensionProvider,
      origin: 'calculator',
    });
  }, [data.pensionType, data.membership.pensionProvider, isCalculatorSource]);

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
      if (!isCalculatorSource) return data.pensionType === '';
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
    if (!isCalculatorSource) return;
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
          parsed.claimTypes.includes('public') ||
          parsed.claimTypes.includes('stage') ||
          parsed.claimTypes.includes('orchestra');
        const hasPrivate = parsed.claimTypes.includes('private');
        setShowPensionTypeSelection(hasPublicOrStage && hasPrivate);
        if (hasPrivate && !hasPublicOrStage) {
          updateData({ pensionType: 'private' });
        } else if (hasPublicOrStage && !hasPrivate) {
          updateData({ pensionType: 'public' });
        }
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
  }, [isCalculatorSource, sessionToken, updateData, updateMembership]);

  // Success screen and DRV modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDRVModal, setShowDRVModal] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

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

  const advanceSubStep = () => {
    // Client #16: if the user is editing a field they jumped to from the
    // review screen, Continue should return them to review, not walk through
    // every remaining step again.
    if (editingFromReview) {
      setEditingFromReview(false);
      setCurrentSubStep('review');
      return;
    }
    const currentIndex = submitDetailsSubsteps.findIndex(
      (s) => s.id === currentSubStep
    );
    if (currentIndex < submitDetailsSubsteps.length - 1) {
      setCurrentSubStep(submitDetailsSubsteps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setShowPensionTypeSelection(true);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      const currentIndex = submitDetailsSubsteps.findIndex(
        (s) => s.id === currentSubStep
      );
      if (currentIndex > 0) {
        setCurrentSubStep(submitDetailsSubsteps[currentIndex - 1].id);
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

  const handleReviewContinue = async () => {
    if (data.claimId) {
      try {
        await markStepComplete(data.claimId, 'reviewInformation');
      } catch (err) {
        console.error('Failed to mark review complete:', err);
      }
    }
    setCurrentSubStep('confirm');
  };

  const handleConfirmContinue = async () => {
    setFlowError(null);
    if (data.claimId) {
      try {
        await markStepComplete(data.claimId, 'finalConfirmation');
      } catch (err) {
        console.error('Failed to mark confirmation complete:', err);
      }
    }
    setCurrentSubStep('signature');
  };

  const handleFinalizeFromSignature = async () => {
    const canSubmit =
      variant === 'calculator'
        ? areConfirmStopAnswersClear(data.confirm)
        : isConfirmComplete(data.confirm);
    if (!canSubmit) {
      setEditingFromReview(false);
      setFlowError(
        'Please confirm your answers before submitting your refund request.'
      );
      setCurrentSubStep('confirm');
      return;
    }
    const claimId = data.claimId;
    if (!claimId) {
      setFlowError('No claim found. Please restart the onboarding process.');
      return;
    }
    setFlowError(null);
    try {
      await markStepComplete(claimId, 'signDocuments');
      const result = await submitClaim(claimId);
      localStorage.removeItem('vbl_draft_claimId');
      updateSuccessData({
        submissionId: result.claim.id,
        submittedAt:
          (result.claim.submittedAt as string) || new Date().toISOString(),
      });
      setShowSuccess(true);
    } catch (err) {
      console.error('Final submission error:', err);
      setFlowError('We could not submit your refund request. Please try again.');
    }
  };

  const handleConfirmStop = async (reasons: string[]) => {
    const claimId = data.claimId;
    if (!claimId) return;
    try {
      await stopClaim(claimId, reasons);
    } catch (err) {
      console.error('Failed to stop claim:', err);
      setFlowError(
        'We could not record that your application was stopped. Your deposit will still be refunded — please contact support if you have any questions.'
      );
    }
  };

  const handleReturnToStart = () => {
    clearAllFlowPersistence();
    resetOnboarding();
    router.push('/calculator');
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
      <OnboardingLayout
        showBack={false}
        headerTitle={headerTitle}
        headerIcon={headerIcon}
        variant={variant}
        subSteps={submitDetailsSubsteps}
      >
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
        return (
          <CreateAccount
            onNext={handleStep1Next}
            redirectUrl={
              isCalculatorSource
                ? '/get-started?fromAuth=1&origin=calculator'
                : undefined
            }
          />
        );
      case 2:
        return <Payment onNext={handleStep2Next} variant={variant} />;
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
        return <Identity onNext={advanceSubStep} variant={variant} />;
      case 'membership':
        return <Membership onNext={advanceSubStep} />;
      case 'address':
        return <Address onNext={advanceSubStep} />;
      case 'bank-details':
        return <BankDetails onNext={advanceSubStep} />;
      case 'signature':
        return (
          <Signature
            onNext={
              isSignatureTerminal ? handleFinalizeFromSignature : advanceSubStep
            }
          />
        );
      case 'review':
        return (
          <ReviewSubmit
            onSubmitSuccess={handleSubmitSuccess}
            onEditSection={handleEditSection}
            onContinue={isSignatureTerminal ? handleReviewContinue : undefined}
          />
        );
      case 'confirm':
        return (
          <ConfirmStep
            onContinue={handleConfirmContinue}
            onBackToReview={() => setCurrentSubStep('review')}
            onStop={handleConfirmStop}
            onReturnToStart={handleReturnToStart}
            isContinueEnabled={
              variant === 'calculator'
                ? areConfirmStopAnswersClear(data.confirm)
                : undefined
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      showBack={currentStep !== 2}
      onBack={handleBack}
      headerTitle={headerTitle}
      headerIcon={headerIcon}
      variant={variant}
      subSteps={submitDetailsSubsteps}
    >
      {flowError && (
        <div className="mx-auto mb-6 max-w-lg rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {flowError}
        </div>
      )}
      {renderStepContent()}
    </OnboardingLayout>
  );
}

export default OnboardingFlow;
