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

  // Skip eligibility for authenticated users arriving via magic link redirect
  useEffect(() => {
    if (user && !eligibilityConfirmed && searchParams?.get('fromAuth') === '1') {
      confirmEligibility();
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
