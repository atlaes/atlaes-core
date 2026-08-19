'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useOnboarding,
  getSubmitDetailsSubsteps,
  isConfirmComplete,
  SubmitDetailsSubStep,
} from '@/contexts/OnboardingContext';
import { useEligibility } from '@/contexts/EligibilityContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClaim,
  updateClaim,
  attachDocument,
  markStepComplete,
  verifyPaymentSession,
  submitClaim,
  stopClaim,
} from '@/lib/onboarding-api';
import {
  clearAllFlowPersistence,
  loadFlowIdentity,
  saveFlowIdentity,
} from '@/lib/flow-persistence';
import { GetStartedLayout } from './GetStartedLayout';
import { CreateAccount } from '@/components/vbl/onboarding/steps/CreateAccount';
import { Payment } from '@/components/vbl/onboarding/steps/Payment';
import { Identity } from '@/components/vbl/onboarding/steps/Identity';
import { Membership } from '@/components/vbl/onboarding/steps/Membership';
import { Address } from '@/components/vbl/onboarding/steps/Address';
import { HealthInsurance } from '@/components/vbl/onboarding/steps/HealthInsurance';
import { BankDetails } from '@/components/vbl/onboarding/steps/BankDetails';
import { Signature } from '@/components/vbl/onboarding/steps/Signature';
import { ReviewSubmit } from '@/components/vbl/onboarding/steps/ReviewSubmit';
import { ConfirmStep } from '@/components/vbl/onboarding/steps/ConfirmStep';
import { SuccessScreen } from '@/components/vbl/onboarding/steps/SuccessScreen';
import { DRVUpsellModal } from '@/components/vbl/onboarding/DRVUpsellModal';
import {
  isCalculatorVariant,
  type OnboardingVariant,
} from '@/components/vbl/onboarding/onboarding-variant';

export function GetStartedOnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: eligibilityData, reset: resetEligibility } = useEligibility();
  const {
    data,
    updateData,
    currentStep,
    currentSubStep,
    setCurrentStep,
    setCurrentSubStep,
    editingFromReview,
    setEditingFromReview,
    updateSuccessData,
    loadFromClaim,
    resetOnboarding,
  } = useOnboarding();

  // Keep the source decision stable for the life of this mounted flow. A
  // calculator return can restore public eligibility asynchronously, but a
  // direct flow must never become calculator-origin later in the session.
  const [calculatorOrigin] = useState(
    () => loadFlowIdentity()?.origin === 'calculator'
  );
  const variant: OnboardingVariant =
    calculatorOrigin && data.pensionType !== 'private' ? 'calculator' : 'default';

  // Receiving components gain typed variant props in Tasks 3–7. Evaluate the
  // local guard now so private/bAV claims remain on the default variant.
  void isCalculatorVariant(variant);

  // Task 15: Health Insurance only appears for bAV/private pension type
  // claimants — see getSubmitDetailsSubsteps in OnboardingContext.tsx.
  const submitDetailsSubsteps = getSubmitDetailsSubsteps(data.pensionType);

  // Auto-advance past CreateAccount when user is already authenticated
  // (e.g. arriving via magic link redirect back to /get-started)
  useEffect(() => {
    if (user && currentStep === 1) {
      updateData({ email: user.email, authMethod: 'email', userId: user.id });
      setCurrentStep(2);
    }
  }, [user, currentStep, updateData, setCurrentStep]);

  // Set pension type and provider from eligibility data on mount.
  //
  // CRITICAL 2 fix: the magic-link email opens in a NEW TAB, so when the
  // user lands back on /get-started?fromAuth=1, sessionStorage-backed
  // EligibilityContext is empty (fromAuth force-confirms eligibility without
  // ever walking the flow — see app/get-started/page.tsx) and
  // eligibilityData.employmentType is ''. Previously that always defaulted
  // pensionType to 'public', paygating bAV/private claimants incorrectly and
  // skipping the Health Insurance substep entirely. Now, when eligibility
  // has nothing (employmentType === ''), we first check the
  // vbl_flow_identity_v1 localStorage blob (written below, at the same
  // moment eligibility is confirmed with real data) — localStorage survives
  // across tabs, unlike sessionStorage. Only default to 'public' when that
  // key is genuinely absent too (a fresh visitor who has never confirmed
  // eligibility with a real employment type).
  useEffect(() => {
    if (data.pensionType !== '') return;

    if (eligibilityData.employmentType === '') {
      const savedIdentity = loadFlowIdentity();
      if (savedIdentity?.pensionType) {
        // Same magic-link tab boundary as above: the C1 eligibility carry-over
        // never runs on this resume path, so restore pensionProvider from the
        // same localStorage blob here too — but only when nothing else
        // (in-memory state or a loaded claim) has already set it.
        if (savedIdentity.pensionProvider && !data.membership.pensionProvider) {
          updateData({
            pensionType: savedIdentity.pensionType,
            membership: {
              ...data.membership,
              pensionProvider: savedIdentity.pensionProvider,
            },
          });
          return;
        }
        updateData({ pensionType: savedIdentity.pensionType });
        return;
      }
      updateData({ pensionType: 'public' });
      return;
    }

    const pensionType =
      eligibilityData.employmentType === 'private_sector'
        ? 'private'
        : 'public';
    updateData({ pensionType });
  }, [
    data.pensionType,
    data.membership,
    eligibilityData.employmentType,
    updateData,
  ]);

  // Carry over pension provider from eligibility to membership.
  //
  // CRITICAL 1 fix: the private/bAV flow stores its selected provider in
  // eligibilityData.privatePensionProvider (privatePensionProviderOther for
  // the free-text "Other" case), never in eligibilityData.pensionProvider
  // (that field is only ever set by the public/stage flows). Previously this
  // effect only ever read pensionProvider, so bAV claimants always reached
  // Membership.tsx's locked read-only provider box empty — with no dropdown
  // fallback by design — and a permanently disabled Continue. Now the
  // private path is mapped explicitly.
  useEffect(() => {
    if (data.membership.pensionProvider !== '') return;

    let mappedProvider = '';
    if (eligibilityData.privatePensionProvider) {
      mappedProvider =
        eligibilityData.privatePensionProvider === 'Other'
          ? eligibilityData.privatePensionProviderOther ||
            eligibilityData.privatePensionProvider
          : eligibilityData.privatePensionProvider;
    } else if (eligibilityData.pensionProvider) {
      const provider = eligibilityData.pensionProvider;
      mappedProvider =
        provider === 'VBL' && eligibilityData.vblPlan
          ? eligibilityData.vblPlan
          : provider;
    }

    if (!mappedProvider) return;

    updateData({
      membership: {
        ...data.membership,
        pensionProvider: mappedProvider,
      },
    });

    // CRITICAL 2: persist pensionType + provider to localStorage the moment
    // we have a real, non-empty provider to carry over — this is the same
    // point in the flow where eligibility has genuinely been confirmed with
    // data (as opposed to the fromAuth force-confirm path, which never runs
    // this effect to a non-empty mappedProvider). Written here rather than
    // only in the pensionType effect above so both values land together.
    const resolvedPensionType =
      data.pensionType ||
      (eligibilityData.privatePensionProvider ? 'private' : 'public');
    saveFlowIdentity({
      pensionType: resolvedPensionType,
      pensionProvider: mappedProvider,
      origin: loadFlowIdentity()?.origin ?? 'get-started',
    });
  }, [
    eligibilityData.pensionProvider,
    eligibilityData.vblPlan,
    eligibilityData.privatePensionProvider,
    eligibilityData.privatePensionProviderOther,
    data.membership,
    data.pensionType,
    updateData,
  ]);

  // Restore provider/type details after the Stripe redirect reloads the page.
  useEffect(() => {
    if (data.membership.pensionProvider) return;
    if (typeof window === 'undefined') return;

    const raw = sessionStorage.getItem('vbl_onboarding_payment_seed');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        pensionType?: typeof data.pensionType;
        membership?: typeof data.membership;
      };
      if (!parsed.membership?.pensionProvider) return;
      updateData({
        pensionType: parsed.pensionType || data.pensionType,
        membership: {
          ...data.membership,
          ...parsed.membership,
        },
      });
    } catch {
      sessionStorage.removeItem('vbl_onboarding_payment_seed');
    }
  }, [data.membership, data.pensionType, updateData]);

  // Resume draft claim on mount
  useEffect(() => {
    const resumeDraft = async () => {
      if (!user || data.claimId) return;

      const storedClaimId = localStorage.getItem('vbl_draft_claimId');
      if (!storedClaimId) return;

      try {
        const result = await getClaim(storedClaimId);
        if (result.success && result.claim.status === 'draft') {
          loadFromClaim(result.claim);
        } else {
          localStorage.removeItem('vbl_draft_claimId');
        }
      } catch {
        localStorage.removeItem('vbl_draft_claimId');
      }
    };
    resumeDraft();
  }, [user, data.claimId, loadFromClaim]);

  // Handle payment return from Stripe
  useEffect(() => {
    const handlePaymentReturn = async () => {
      const payment = searchParams?.get('payment');
      const sessionId = searchParams?.get('session_id');
      if (payment !== 'success' || !sessionId || !user) return;

      try {
        const result = await verifyPaymentSession(sessionId);
        if (result.success && result.paymentStatus === 'paid') {
          updateData({
            paymentCompleted: true,
            claimId: result.claimId,
          });
          localStorage.setItem('vbl_draft_claimId', result.claimId);
          setCurrentStep(3);
          setCurrentSubStep('identity');
        }
      } catch (err) {
        console.error('Payment verification failed:', err);
      }

      // Clean URL params
      window.history.replaceState({}, '', '/get-started');
    };
    handlePaymentReturn();
  }, [searchParams, user, updateData, setCurrentStep, setCurrentSubStep]);

  // Success screen and DRV modal state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDRVModal, setShowDRVModal] = useState(false);
  // Top-of-content error banner for the terminal Signature-step submission and
  // the Confirm-step stop call (both happen outside a substep component that
  // owns its own error UI).
  const [flowError, setFlowError] = useState<string | null>(null);

  // In the public/stage Confirm flow, Signature is the terminal substep and
  // performs the final submission. In the bAV/private flow it is not (Review
  // remains terminal). Derived from the resolved substep list so it stays
  // correct if the ordering ever changes again.
  const lastSubstepId =
    submitDetailsSubsteps[submitDetailsSubsteps.length - 1]?.id;
  const isSignatureTerminal = lastSubstepId === 'signature';

  // Item 13/18a: lets the active sub-step intercept the global Back button
  // for an internal phase transition (e.g. Identity's confirm phase
  // returning to its own upload phase, or BankDetails' own/trusted/SummitFX
  // branches returning to the account-type selection phase) instead of
  // leaving the sub-step entirely. A sub-step registers a handler while it
  // wants to own Back, and clears it when it no longer does (see
  // Identity.tsx and BankDetails.tsx). Only one sub-step is ever mounted at
  // a time, so there's no risk of two overrides being active together.
  const backOverrideRef = useRef<(() => void) | null>(null);
  const setBackOverride = useCallback((handler: (() => void) | null) => {
    backOverrideRef.current = handler;
  }, []);

  // Item 18b: BankDetails registers a reset handler while it's showing one of
  // its internal branches (own/trusted/SummitFX), so re-clicking the already-
  // active "Bank Details" tab can return it to the account-type selection
  // phase. Mirrors the backOverrideRef pattern above.
  const bankDetailsResetRef = useRef<(() => void) | null>(null);
  const setBankDetailsReset = useCallback((handler: (() => void) | null) => {
    bankDetailsResetRef.current = handler;
  }, []);

  const handleSubStepTabClick = (subStep: SubmitDetailsSubStep) => {
    if (
      subStep === 'bank-details' &&
      currentSubStep === 'bank-details' &&
      bankDetailsResetRef.current
    ) {
      bankDetailsResetRef.current();
    }
  };

  const drvEligibilityDate = '15 Mar 2027';
  const isDRVEligibleNow = false;

  const activeStep = (() => {
    if (currentStep === 1 || currentStep === 2) return 2;
    if (
      currentSubStep === 'signature' ||
      currentSubStep === 'review' ||
      currentSubStep === 'confirm'
    )
      return 4;
    return 3;
  })() as 2 | 3 | 4;

  // Navigation handlers
  const handleStep1Next = () => {
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
    setCurrentSubStep('identity');
  };

  const advanceSubStep = () => {
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

  const saveAndAdvance = async () => {
    const claimId = data.claimId;
    if (!claimId) {
      advanceSubStep();
      return;
    }

    try {
      switch (currentSubStep) {
        case 'identity': {
          // Task 6: the `claims` table has no middleName column (see
          // packages/functions/src/drizzle/schema/claims.ts) and we are not
          // adding a migration for this task. Known limitation: the middle
          // name is persisted concatenated into firstName as
          // "First Middle" (trimmed when middle is empty), so it survives
          // submission and downstream PDF generation, but the DB can no
          // longer tell first and middle apart once saved. This mirrors,
          // without regressing, the meaning of the firstName/lastName
          // columns that packages/functions/src/services/claim-pdf already
          // reads — those columns still mean "the person's name", just
          // sometimes containing an embedded middle name now. See
          // loadFromClaim in OnboardingContext.tsx for the corresponding
          // (lossy) reverse mapping on resume.
          const firstName = [
            data.identity.firstName.trim(),
            data.identity.middleName.trim(),
          ]
            .filter(Boolean)
            .join(' ');
          const lastName = data.identity.lastName.trim();
          await updateClaim(claimId, {
            claimType: 'own_refund',
            firstName,
            lastName,
            dateOfBirth: data.identity.dateOfBirth || undefined,
            gender: data.identity.gender || undefined,
            passportNumber: data.identity.passportNumber || undefined,
            nationality: data.identity.nationality || undefined,
            placeOfBirth: data.identity.placeOfBirth || undefined,
            passportIssueDate: data.identity.passportIssueDate || undefined,
            passportExpiryDate: data.identity.passportExpiryDate || undefined,
          });
          if (data.documentId) {
            await attachDocument(claimId, data.documentId, 'passport');
          }
          await markStepComplete(claimId, 'claimType');
          await markStepComplete(claimId, 'passportUpload');
          break;
        }
        case 'membership':
          await updateClaim(claimId, {
            svNummer: data.membership.membershipNumber || undefined,
          });
          await markStepComplete(claimId, 'germanSocialInsurance');
          break;
        case 'address':
          await updateClaim(claimId, {
            currentAddressLine1: data.address.streetAndNumber,
            currentPostalCode: data.address.postalCode,
            currentCity: data.address.city,
            currentCountry: data.address.country,
          });
          await markStepComplete(claimId, 'currentAddress');
          break;
        case 'health-insurance': {
          const hi = data.healthInsurance;
          await updateClaim(claimId, {
            healthInsuranceType: hi.type || undefined,
            healthInsuranceProviderName: hi.providerName || undefined,
            healthInsuranceProviderAddress: hi.providerAddress || undefined,
            healthInsuranceInsuredSinceMonth: hi.insuredSinceMonth || undefined,
            healthInsuranceInsuredSinceYear: hi.insuredSinceYear || undefined,
            healthInsurancePlaceOfBirth: hi.placeOfBirth || undefined,
            healthInsuranceCountryOfBirth: hi.countryOfBirth || undefined,
            healthInsuranceNumber: hi.insuranceNumber || undefined,
          });
          if (hi.documentId) {
            await attachDocument(claimId, hi.documentId, 'health_insurance');
          }
          await markStepComplete(claimId, 'healthInsurance');
          break;
        }
        case 'bank-details':
          await updateClaim(claimId, {
            iban: data.bankDetails.iban || undefined,
            accountHolderName: data.bankDetails.accountHolder || undefined,
          });
          await markStepComplete(claimId, 'bankDetails');
          break;
        case 'signature':
          // Item 21 cleanup (not the root cause — see lib/api.ts for that):
          // Signature.tsx::handleContinue already calls
          // attachSignatureToClaim itself (added in "Fix: attach signature to
          // claim before submission") and only invokes onNext() (this
          // function) after that attach resolves. This call used to
          // re-attach the same signature a second time — in practice it was
          // a silent no-op (onNext() runs before the parent re-renders with
          // the freshly-set data.signatureId, so this closure always saw it
          // as undefined and skipped), but it's dead, misleading code and a
          // latent double-submit risk if the render timing ever changes.
          // Removed; just mark the step complete.
          await markStepComplete(claimId, 'signDocuments');
          break;
      }
    } catch (err) {
      console.error('Failed to save step data:', err);
      // Non-blocking — still advance. Data is in context for retry at submit.
    }

    advanceSubStep();
  };

  const handleBack = () => {
    if (backOverrideRef.current) {
      backOverrideRef.current();
      return;
    }
    if (currentStep === 1) {
      // Go back to eligibility flow
      resetEligibility();
      return;
    } else if (currentStep === 2) {
      // Skip back to eligibility if user is already authenticated (step 1 auto-advances)
      if (user) {
        resetEligibility();
      } else {
        setCurrentStep(1);
      }
    } else if (currentStep === 3) {
      const currentIndex = submitDetailsSubsteps.findIndex(
        (s) => s.id === currentSubStep
      );
      if (currentIndex > 0) {
        setCurrentSubStep(submitDetailsSubsteps[currentIndex - 1].id);
      } else {
        // Don't go back to Payment if already paid — go to eligibility instead
        if (data.paymentCompleted) {
          resetEligibility();
        } else {
          setCurrentStep(2);
        }
      }
    }
  };

  const handleSubmitSuccess = () => {
    updateSuccessData({
      submittedAt: new Date().toISOString(),
      drvEligibilityDate: drvEligibilityDate,
    });
    // Claim is submitted — nothing left to resume. Clear both persisted
    // blobs so a refresh on the success screen (or a later visit) doesn't
    // try to resurrect a completed run.
    clearAllFlowPersistence();
    setShowSuccess(true);
  };

  const handleEditSection = (subStep: SubmitDetailsSubStep) => {
    setEditingFromReview(true);
    setCurrentSubStep(subStep);
  };

  // Review → Confirm (public/stage flow only). Review is no longer terminal
  // here; mark it complete for resume and move on.
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

  // Confirm → Signature. Records the final confirmation for resume. Clears
  // any stale "confirm your declarations first" banner from the
  // handleFinalizeFromSignature guard below.
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

  // Terminal Signature step (public/stage flow): the signature has already
  // been uploaded + attached by Signature.tsx before it calls this, so here we
  // just mark the step complete and submit the claim. Signature.tsx is
  // unchanged — it always calls its onNext; we simply pass this instead of
  // saveAndAdvance when Signature is the last substep.
  const handleFinalizeFromSignature = async () => {
    // Defense in depth: never submit unless the Confirm step's gate has
    // actually been satisfied (all four answers No + all eight boxes checked).
    // Any path that lands on the terminal Signature step without completing
    // Confirm (resume, stale persisted position, future navigation changes)
    // is routed to the Confirm step instead of submitting.
    if (!isConfirmComplete(data.confirm)) {
      setEditingFromReview(false);
      setFlowError(
        'Please confirm your declarations before submitting your refund request.'
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
      handleSubmitSuccess();
    } catch (err) {
      console.error('Final submission error:', err);
      setFlowError(
        'We could not submit your refund request. Please try again.'
      );
    }
  };

  // Confirm-step stop path: best-effort backend call. The stop screen is shown
  // by ConfirmStep regardless of this outcome; we only surface a toast-style
  // banner on failure (per existing error-handling idioms).
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

  // "Return to start" from the Confirm stop screen — fully reset the flow.
  const handleReturnToStart = () => {
    clearAllFlowPersistence();
    resetOnboarding();
    resetEligibility();
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
      <GetStartedLayout
        showBack={false}
        activeStep={4}
        currentSubStep={currentSubStep}
      >
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
        return <Payment onNext={handleStep2Next} variant={variant} />;
      case 3:
        return renderSubStep();
      default:
        return null;
    }
  };

  const renderSubStep = () => {
    switch (currentSubStep) {
      case 'identity':
        return (
          <Identity onNext={saveAndAdvance} setBackOverride={setBackOverride} />
        );
      case 'membership':
        return (
          <Membership
            onNext={saveAndAdvance}
            setBackOverride={setBackOverride}
          />
        );
      case 'address':
        return <Address onNext={saveAndAdvance} />;
      case 'health-insurance':
        return (
          <HealthInsurance
            onNext={saveAndAdvance}
            setBackOverride={setBackOverride}
          />
        );
      case 'bank-details':
        return (
          <BankDetails
            onNext={saveAndAdvance}
            setBackOverride={setBackOverride}
            setPhaseReset={setBankDetailsReset}
          />
        );
      case 'signature':
        return (
          <Signature
            onNext={
              isSignatureTerminal ? handleFinalizeFromSignature : saveAndAdvance
            }
          />
        );
      case 'review':
        return (
          <ReviewSubmit
            onSubmitSuccess={handleSubmitSuccess}
            onEditSection={handleEditSection}
            // Public/stage flow: Review advances to Confirm instead of
            // submitting (Signature is now terminal). bAV/private flow keeps
            // Review terminal, so no onContinue is passed.
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <GetStartedLayout
      // Item 11: the paygate (step 2) has no local Back button, and the
      // global back control is hidden while it's active — every other
      // step keeps it.
      showBack={currentStep !== 2}
      onBack={handleBack}
      activeStep={activeStep}
      currentSubStep={currentStep === 3 ? currentSubStep : undefined}
      onSubStepClick={handleSubStepTabClick}
      subSteps={submitDetailsSubsteps}
    >
      {flowError && (
        <div className="mx-auto mb-6 max-w-lg rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {flowError}
        </div>
      )}
      {renderStepContent()}
    </GetStartedLayout>
  );
}

export default GetStartedOnboardingFlow;
