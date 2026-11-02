'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClaimQuery } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { ClaimsFrame, claimStepTitle } from '@/components/claims/ClaimsFrame';
import type { ClaimStatus } from '@/lib/claims-api';

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

const STEP_COMPONENTS: Record<
  string,
  React.ComponentType<StepComponentProps>
> = {
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

/** What a customer sees for a claim that is no longer editable. */
const STATUS_NOTICES: Record<
  Exclude<ClaimStatus, 'draft'>,
  { title: string; body: string }
> = {
  ready: {
    title: 'Claim ready for submission',
    body: 'Your claim is complete and queued for submission. You will receive an email once it has been filed.',
  },
  submitted: {
    title: 'Claim submitted',
    body: 'We have received your claim and are reviewing your documents. You will receive updates by email.',
  },
  processing: {
    title: 'Claim in progress',
    body: 'Your claim is being processed with the German pension authorities. You will receive updates by email.',
  },
  completed: {
    title: 'Claim completed',
    body: 'This claim has been completed. Thank you for using Germany Pension Refund.',
  },
  rejected: {
    title: 'Claim needs your attention',
    body: 'This claim could not be processed as submitted. Please check your email for the details, or contact us if you have questions.',
  },
};

export default function ClaimWizardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const claimId = params.id as string;
  const authed = !authLoading && !!user;

  // React Query for claim data — only once the session is known, so an
  // anonymous visitor is sent to sign in instead of seeing a 401 flash.
  const { data: claim, isLoading, error } = useClaimQuery(claimId, authed);

  // Zustand for navigation
  const { currentStep, initializeFromClaim } = useClaimsStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(`/claims/${claimId}`));
    }
  }, [user, authLoading, claimId, router]);

  // Initialize navigation from claim's completed steps
  useEffect(() => {
    if (claim?.completedSteps) {
      initializeFromClaim(claim.completedSteps);
    }
  }, [claim?.completedSteps, initializeFromClaim]);

  if (!authed || isLoading) {
    return (
      <ClaimsFrame title="Your claim">
        <div className="claims-wizard-loading">
          <div className="claims-spinner" />
          <span>Loading claim...</span>
        </div>
      </ClaimsFrame>
    );
  }

  if (error) {
    return (
      <ClaimsFrame title="Your claim">
        <div className="claims-wizard-error">
          <h2>Error Loading Claim</h2>
          <p>
            {error instanceof Error ? error.message : 'Failed to load claim'}
          </p>
          <button
            onClick={() => router.push('/claims')}
            className="claims-btn claims-btn-primary"
          >
            Back to Claims
          </button>
        </div>
      </ClaimsFrame>
    );
  }

  if (!claim) {
    return (
      <ClaimsFrame title="Your claim">
        <div className="claims-wizard-error">
          <h2>Claim Not Found</h2>
          <p>
            The claim you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <button
            onClick={() => router.push('/claims')}
            className="claims-btn claims-btn-primary"
          >
            Back to Claims
          </button>
        </div>
      </ClaimsFrame>
    );
  }

  // Only drafts are editable; everything else gets its own notice.
  if (claim.status !== 'draft') {
    const notice = STATUS_NOTICES[claim.status] ?? STATUS_NOTICES.submitted;
    return (
      <ClaimsFrame title="Your claim">
        <div className="claims-wizard-submitted">
          <div className="claims-wizard-submitted-content">
            <h2>{notice.title}</h2>
            <p>{notice.body}</p>
            <button
              onClick={() => router.push('/claims')}
              className="claims-btn claims-btn-primary"
            >
              Back to Claims
            </button>
          </div>
        </div>
      </ClaimsFrame>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];

  if (!StepComponent) {
    return (
      <ClaimsFrame title="Your claim">
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
      </ClaimsFrame>
    );
  }

  return (
    <ClaimsFrame title={claimStepTitle(currentStep)} progress>
      <main className="claims-wizard-main">
        <StepComponent claimId={claimId} />
      </main>
    </ClaimsFrame>
  );
}
