'use client';

import React from 'react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { GetStartedLayout } from './GetStartedLayout';
import { EligibilityResult } from './EligibilityResult';
import { EmploymentType } from './steps/EmploymentType';
import { PublicEntryPath } from './steps/PublicEntryPath';
import { FederalState } from './steps/FederalState';
import { PensionProvider } from './steps/PensionProvider';
import { PensionScheme } from './steps/PensionScheme';
import { ContributionPeriod } from './steps/ContributionPeriod';
import { ContributionDuration } from './steps/ContributionDuration';
import { EUContinuation } from './steps/EUContinuation';
import { StagePensionDetails } from './steps/StagePensionDetails';
import { StageContributionDuration } from './steps/StageContributionDuration';
import { EmploymentEndDate } from './steps/EmploymentEndDate';
import { PrivatePensionProvider } from './steps/PrivatePensionProvider';
import { PrivateContributionDetails } from './steps/PrivateContributionDetails';

const STEP_COMPONENTS: Record<string, React.FC> = {
  // Public sector steps
  public_entry_path: PublicEntryPath,
  federal_state: FederalState,
  pension_provider: PensionProvider,
  pension_scheme: PensionScheme,
  eu_continuation: EUContinuation,
  contribution_period: ContributionPeriod,
  contribution_duration: ContributionDuration,
  // Stage steps
  stage_pension_details: StagePensionDetails,
  stage_contribution_duration: StageContributionDuration,
  employment_end_date: EmploymentEndDate,
  // Private sector steps
  private_pension_provider: PrivatePensionProvider,
  private_contribution_details: PrivateContributionDetails,
};

export function EligibilityFlow() {
  const { currentStepId, result, goBack, stepHistory } = useEligibility();

  // Result screen (no back button)
  if (result) {
    return (
      <GetStartedLayout showBack={false}>
        <EligibilityResult />
      </GetStartedLayout>
    );
  }

  // Employment type selection (no back button)
  if (currentStepId === 'employment_type') {
    return (
      <GetStartedLayout showBack={false}>
        <EmploymentType />
      </GetStartedLayout>
    );
  }

  // Flow step (with back button)
  const StepComponent = currentStepId ? STEP_COMPONENTS[currentStepId] : null;
  if (!StepComponent) return null;

  const showLayoutBack =
    stepHistory.length > 0 && currentStepId !== 'public_entry_path';

  return (
    <GetStartedLayout showBack={showLayoutBack} onBack={goBack}>
      <StepComponent />
    </GetStartedLayout>
  );
}

export default EligibilityFlow;
