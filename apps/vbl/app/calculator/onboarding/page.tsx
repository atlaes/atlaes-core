'use client';

import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { OnboardingFlow } from '@/components/vbl/onboarding/OnboardingFlow';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
