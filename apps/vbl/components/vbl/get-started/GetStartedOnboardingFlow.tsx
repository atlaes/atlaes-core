'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding, SUBMIT_DETAILS_SUBSTEPS, SubmitDetailsSubStep } from '@/contexts/OnboardingContext';
import { useEligibility } from '@/contexts/EligibilityContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClaim,
  updateClaim,
  attachDocument,
  attachSignatureToClaim,
  markStepComplete,
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
  const { user } = useAuth();
  const { data: eligibilityData } = useEligibility();
  const {
    data,
    updateData,
    currentStep,
    currentSubStep,
    setCurrentStep,
    setCurrentSubStep,
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

  const advanceSubStep = () => {
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
          await markStepComplete(claimId, 'passportUpload');
          break;
        }
        case 'membership':
          await updateClaim(claimId, {
            svNummer: data.membership.membershipNumber || undefined,
          });
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
