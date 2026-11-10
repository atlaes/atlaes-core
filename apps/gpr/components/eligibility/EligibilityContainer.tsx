'use client';

import React from 'react';
import {
  EligibilityProvider,
  useEligibilityCheck,
  EligibilityFlowType,
} from '@/hooks/useEligibilityCheck';
import { GPRFormData } from '@/hooks/useGPRCalculator';
import ProgressStepper from './ProgressStepper';
import CitizenshipStep from './steps/CitizenshipStep';
import WorkHistoryStep from './steps/WorkHistoryStep';
import ResultStep from './steps/ResultStep';
import AccountCreationStep from './steps/AccountCreationStep';

interface EligibilityContainerProps {
  flowType?: EligibilityFlowType;
  calculatorData?: GPRFormData | null;
  /** Server-side GeoIP country (ordering hint only, never stored). */
  geoCountry?: string | null;
}

/** Disclaimer + legal links on every step. */
function LegalFooter() {
  return (
    <footer className="elig-legal">
      <p>
        This check gives a preliminary indication based on your answers. It is
        not legal advice; we review every case individually before anything is
        filed.
      </p>
      <p>
        <a href="/privacy-policy">Privacy policy</a>
        <span aria-hidden="true"> · </span>
        <a href="/legalnoticedisclaimer">Legal notice</a>
      </p>
    </footer>
  );
}

function EligibilityContent() {
  const { step } = useEligibilityCheck();
  return (
    <div className="eligibility-page">
      <ProgressStepper />
      <div className="eligibility-content">
        {step === 'countries' ? <CitizenshipStep /> : null}
        {step === 'work' ? <WorkHistoryStep /> : null}
        {step === 'result' ? <ResultStep /> : null}
        {step === 'account' ? <AccountCreationStep /> : null}
        <LegalFooter />
      </div>
    </div>
  );
}

export default function EligibilityContainer({
  flowType = 'calculator',
  calculatorData = null,
  geoCountry = null,
}: EligibilityContainerProps) {
  return (
    <EligibilityProvider
      flowType={flowType}
      calculatorData={calculatorData}
      geoCountry={geoCountry}
    >
      <EligibilityContent />
    </EligibilityProvider>
  );
}
