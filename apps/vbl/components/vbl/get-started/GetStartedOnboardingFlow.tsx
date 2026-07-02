'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnboarding, SUBMIT_DETAILS_SUBSTEPS, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import { useEligibility } from '@/contexts/EligibilityContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClaim,
  updateClaim,
  attachDocument,
  attachSignatureToClaim,
  markStepComplete,
  verifyPaymentSession,
} from '@/lib/onboarding-api';
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
  } = useOnboarding();

  // Auto-advance past CreateAccount when user is already authenticated
  // (e.g. arriving via magic link redirect back to /get-started)
  useEffect(() => {
    if (user && currentStep === 1) {
      updateData({ email: user.email, authMethod: 'email', userId: user.id });
      setCurrentStep(2);
    }
  }, [user, currentStep, updateData, setCurrentStep]);

  // Set pension type and provider from eligibility data on mount
  useEffect(() => {
    if (data.pensionType === '') {
      const pensionType =
        eligibilityData.employmentType === 'private_sector'
          ? 'private'
          : 'public';
      updateData({ pensionType });
    }
  }, [data.pensionType, eligibilityData.employmentType, updateData]);

  // Carry over pension provider from eligibility to membership
  useEffect(() => {
    if (eligibilityData.pensionProvider && data.membership.pensionProvider === '') {
      const provider = eligibilityData.pensionProvider;
      // Map eligibility provider to membership provider value
      let mappedProvider = provider;
      if (provider === 'VBL' && eligibilityData.vblPlan) {
        mappedProvider = eligibilityData.vblPlan;
      }
      updateData({
        membership: {
          ...data.membership,
          pensionProvider: mappedProvider as any,
        },
      });
    }
  }, [eligibilityData.pensionProvider, eligibilityData.vblPlan, data.membership, updateData]);

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

  const drvEligibilityDate = '15 Mar 2027';
  const isDRVEligibleNow = false;

  const activeStep = (() => {
    if (currentStep === 1 || currentStep === 2) return 2;
    if (currentSubStep === 'signature' || currentSubStep === 'review') return 4;
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

    const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
    if (currentIndex < SUBMIT_DETAILS_SUBSTEPS.length - 1) {
      setCurrentSubStep(SUBMIT_DETAILS_SUBSTEPS[currentIndex + 1].id);
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
          const firstName =
            data.identity.firstName ||
            data.identity.fullName.trim().split(/\s+/)[0] ||
            '';
          const lastName =
            data.identity.lastName ||
            data.identity.fullName.trim().split(/\s+/).slice(1).join(' ') ||
            '';
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
        case 'bank-details':
          await updateClaim(claimId, {
            iban: data.bankDetails.iban || undefined,
            accountHolderName: data.bankDetails.accountHolder || undefined,
          });
          await markStepComplete(claimId, 'bankDetails');
          break;
        case 'signature':
          if (data.signatureId) {
            await attachSignatureToClaim(claimId, data.signatureId);
          }
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
      const currentIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex((s) => s.id === currentSubStep);
      if (currentIndex > 0) {
        setCurrentSubStep(SUBMIT_DETAILS_SUBSTEPS[currentIndex - 1].id);
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
    setShowSuccess(true);
  };

  const handleEditSection = (subStep: SubmitDetailsSubStep) => {
    setEditingFromReview(true);
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
        return <Identity onNext={saveAndAdvance} />;
      case 'membership':
        return <Membership onNext={saveAndAdvance} />;
      case 'address':
        return <Address onNext={saveAndAdvance} />;
      case 'bank-details':
        return <BankDetails onNext={saveAndAdvance} />;
      case 'signature':
        return <Signature onNext={saveAndAdvance} />;
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
      showBack={true}
      onBack={handleBack}
      activeStep={activeStep}
      currentSubStep={currentStep === 3 ? currentSubStep : undefined}
    >
      {renderStepContent()}
    </GetStartedLayout>
  );
}

export default GetStartedOnboardingFlow;
