'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  EligibilityProvider,
  useEligibility,
} from '@/contexts/EligibilityContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { EligibilityFlow } from '@/components/vbl/get-started/EligibilityFlow';
import { GetStartedOnboardingFlow } from '@/components/vbl/get-started/GetStartedOnboardingFlow';

function GetStartedFlow() {
  const { eligibilityConfirmed, confirmEligibility } = useEligibility();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Skip eligibility for authenticated users arriving via magic link or resuming a draft
  useEffect(() => {
    if (user && !eligibilityConfirmed) {
      const isFromAuth = searchParams?.get('fromAuth') === '1';
      const isPaymentReturn = searchParams?.get('payment') === 'success';
      const hasExistingDraft = !!localStorage.getItem('vbl_draft_claimId');
      if (isFromAuth || isPaymentReturn || hasExistingDraft) {
        confirmEligibility();
      }
    }
  }, [user, eligibilityConfirmed, searchParams, confirmEligibility]);

  if (eligibilityConfirmed) {
    return <GetStartedOnboardingFlow />;
  }

  return <EligibilityFlow />;
}

export default function GetStartedPage() {
  return (
    <EligibilityProvider>
      {/* Final review fix (IMPORTANT 4): persistenceEnabled defaults to
          false — only /get-started opts in to the sessionStorage-backed
          restore/write-through, so the legacy /calculator/onboarding and
          /calculator-entry-a pages (which also mount OnboardingProvider)
          never read or write vbl_onboarding_v1. */}
      <OnboardingProvider persistenceEnabled>
        <Suspense>
          <GetStartedFlow />
        </Suspense>
      </OnboardingProvider>
    </EligibilityProvider>
  );
}
