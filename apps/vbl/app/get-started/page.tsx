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
import { getClaim } from '@/lib/onboarding-api';

function GetStartedFlow() {
  const { eligibilityConfirmed, confirmEligibility } = useEligibility();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Skip eligibility for authenticated users arriving via magic link or resuming a draft
  useEffect(() => {
    if (!user || eligibilityConfirmed) return;

    const isFromAuth = searchParams?.get('fromAuth') === '1';
    const isPaymentReturn = searchParams?.get('payment') === 'success';
    if (isFromAuth || isPaymentReturn) {
      confirmEligibility();
      return;
    }

    // A stored draft id is only a hint: it may belong to a previous account
    // on this browser or to a claim that no longer exists. Only skip the
    // eligibility questions once the backend confirms it is this user's
    // draft; drop the key when the claim is gone or not theirs.
    const storedClaimId = localStorage.getItem('vbl_draft_claimId');
    if (!storedClaimId) return;

    let cancelled = false;
    getClaim(storedClaimId)
      .then((result) => {
        if (cancelled) return;
        if (result.success && result.claim.status === 'draft') {
          confirmEligibility();
        } else {
          localStorage.removeItem('vbl_draft_claimId');
        }
      })
      .catch((err: { response?: { status?: number } }) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 403 || status === 404) {
          localStorage.removeItem('vbl_draft_claimId');
        }
      });

    return () => {
      cancelled = true;
    };
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
