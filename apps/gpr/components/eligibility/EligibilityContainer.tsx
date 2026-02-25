'use client';

import React from 'react';
import { EligibilityProvider, useEligibilityCheck, EligibilityFlowType } from '@/hooks/useEligibilityCheck';
import { GPRFormData } from '@/hooks/useGPRCalculator';
import ProgressStepper from './ProgressStepper';
import CitizenshipStep from './steps/CitizenshipStep';
import WorkHistoryStep from './steps/WorkHistoryStep';
import AdditionalInfoStep from './steps/AdditionalInfoStep';
import ResultStep from './steps/ResultStep';
import AccountCreationStep from './steps/AccountCreationStep';

interface EligibilityContainerProps {
  flowType?: EligibilityFlowType;
  calculatorData?: GPRFormData | null;
}

function EligibilityContent() {
  const { currentStep, flowType, eligibilityResult } = useEligibilityCheck();

  const renderStep = () => {
    if (flowType === 'calculator') {
      // Calculator flow: 0=citizenship -> 1=result -> 2=account
      switch (currentStep) {
        case 0:
          return <CitizenshipStep />;
        case 1:
          return <ResultStep />;
        case 2:
          return <AccountCreationStep />;
        default:
          return <CitizenshipStep />;
      }
    }

    if (flowType === '2-step') {
      // 2-step flow: 0=citizenship, 1=work history, 2=result, 3=account
      switch (currentStep) {
        case 0:
          return <CitizenshipStep />;
        case 1:
          return <WorkHistoryStep />;
        case 2:
          return <ResultStep />;
        case 3:
          return <AccountCreationStep />;
        default:
          return <CitizenshipStep />;
      }
    }

    if (flowType === '3-step') {
      // 3-step flow: 0=citizenship, 1=work history, 2=additional info, 3=result, 4=account
      switch (currentStep) {
        case 0:
          return <CitizenshipStep />;
        case 1:
          return <WorkHistoryStep />;
        case 2:
          return <AdditionalInfoStep />;
        case 3:
          return <ResultStep />;
        case 4:
          return <AccountCreationStep />;
        default:
          return <CitizenshipStep />;
      }
    }

    return <CitizenshipStep />;
  };

  // Determine the result step index based on flow type
  const getResultStepIndex = () => {
    switch (flowType) {
      case 'calculator': return 1;
      case '2-step': return 2;
      case '3-step': return 3;
      default: return 1;
    }
  };

  const resultStepIndex = getResultStepIndex();

  // Show progress stepper except when showing eligible result (which has auth buttons)
  const showStepper =
    currentStep < resultStepIndex ||
    (currentStep >= resultStepIndex && !eligibilityResult?.isEligible);

  return (
    <div className="eligibility-page">
      {showStepper && <ProgressStepper />}
      <div className="eligibility-content">{renderStep()}</div>
    </div>
  );
}

export default function EligibilityContainer({
  flowType = 'calculator',
  calculatorData = null,
}: EligibilityContainerProps) {
  return (
    <EligibilityProvider flowType={flowType} calculatorData={calculatorData}>
      <EligibilityContent />
    </EligibilityProvider>
  );
}
