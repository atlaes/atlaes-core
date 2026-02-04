'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClaimQuery } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import ClaimsSidebar from '@/components/claims/ClaimsSidebar';

// Step components
import ClaimType from '@/components/claims/steps/ClaimType';
import PassportUpload from '@/components/claims/steps/PassportUpload';
import CurrentAddress from '@/components/claims/steps/CurrentAddress';
import GermanSocialInsurance from '@/components/claims/steps/GermanSocialInsurance';
import LastAddressInGermany from '@/components/claims/steps/LastAddressInGermany';
import BankDetails from '@/components/claims/steps/BankDetails';
import SignDocuments from '@/components/claims/steps/SignDocuments';
import IdentityVerification from '@/components/claims/steps/IdentityVerification';
import ReviewInformation from '@/components/claims/steps/ReviewInformation';
import FinalConfirmation from '@/components/claims/steps/FinalConfirmation';

// Step components now receive claimId as a prop
interface StepComponentProps {
  claimId: string;
}

const STEP_COMPONENTS: Record<string, React.ComponentType<StepComponentProps>> = {
  claimType: ClaimType,
  passportUpload: PassportUpload,
  currentAddress: CurrentAddress,
  germanSocialInsurance: GermanSocialInsurance,
  lastAddressInGermany: LastAddressInGermany,
  bankDetails: BankDetails,
  signDocuments: SignDocuments,
  identityConfirmationForm: IdentityVerification,
  reviewInformation: ReviewInformation,
  finalConfirmation: FinalConfirmation,
};

export default function ClaimWizardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const claimId = params.id as string;

  // React Query for claim data
  const { data: claim, isLoading, error } = useClaimQuery(claimId);

  // Zustand for navigation
  const { currentStep, initializeFromClaim } = useClaimsStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=/claims/${claimId}`);
    }
  }, [user, authLoading, claimId, router]);

  // Initialize navigation from claim's completed steps
  useEffect(() => {
    if (claim?.completedSteps) {
      initializeFromClaim(claim.completedSteps);
    }
  }, [claim?.completedSteps, initializeFromClaim]);

  if (authLoading || isLoading) {
    return (
      <div className="claims-wizard-loading">
        <div className="claims-spinner" />
        <span>Loading claim...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="claims-wizard-error">
        <h2>Error Loading Claim</h2>
        <p>{error instanceof Error ? error.message : 'Failed to load claim'}</p>
        <button
          onClick={() => router.push('/claims')}
          className="claims-btn claims-btn-primary"
        >
          Back to Claims
        </button>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="claims-wizard-error">
        <h2>Claim Not Found</h2>
        <p>The claim you're looking for doesn't exist or you don't have access to it.</p>
        <button
          onClick={() => router.push('/claims')}
          className="claims-btn claims-btn-primary"
        >
          Back to Claims
        </button>
      </div>
    );
  }

  // Check if claim is already submitted
  if (claim.status !== 'draft') {
    return (
      <div className="claims-wizard-submitted">
        <div className="claims-wizard-submitted-content">
          <h2>Claim Already Submitted</h2>
          <p>
            This claim has been submitted and is currently being processed.
            You'll receive updates via email.
          </p>
          <button
            onClick={() => router.push('/claims')}
            className="claims-btn claims-btn-primary"
          >
            Back to Claims
          </button>
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];

  if (!StepComponent) {
    return (
      <div className="claims-wizard-error">
        <h2>Invalid Step</h2>
        <p>The current step "{currentStep}" is not recognized.</p>
        <button
          onClick={() => router.push('/claims')}
          className="claims-btn claims-btn-primary"
        >
          Back to Claims
        </button>
      </div>
    );
  }

  return (
    <div className="claims-wizard-page">
      <div className="claims-wizard-card">
        <ClaimsSidebar claimId={claimId} />
        <main className="claims-wizard-main">
          <StepComponent claimId={claimId} />
        </main>
      </div>
    </div>
  );
}
