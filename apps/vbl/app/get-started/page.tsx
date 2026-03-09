'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EligibilityProvider, useEligibility } from '@/contexts/EligibilityContext';
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
      const hasExistingDraft = !!localStorage.getItem('vbl_draft_claimId');
      if (isFromAuth || hasExistingDraft) {
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
      <OnboardingProvider>
        <Suspense>
          <GetStartedFlow />
        </Suspense>
      </OnboardingProvider>
    </EligibilityProvider>
  );
}
