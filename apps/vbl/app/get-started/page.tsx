'use client';

import { EligibilityProvider, useEligibility } from '@/contexts/EligibilityContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { EligibilityFlow } from '@/components/vbl/get-started/EligibilityFlow';
import { GetStartedOnboardingFlow } from '@/components/vbl/get-started/GetStartedOnboardingFlow';

function GetStartedFlow() {
  const { eligibilityConfirmed } = useEligibility();

  if (eligibilityConfirmed) {
    return <GetStartedOnboardingFlow />;
  }

  return <EligibilityFlow />;
}

export default function GetStartedPage() {
  return (
    <EligibilityProvider>
      <OnboardingProvider>
        <GetStartedFlow />
      </OnboardingProvider>
    </EligibilityProvider>
  );
}
