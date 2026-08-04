'use client';

import React from 'react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { GetStartedLayout } from './GetStartedLayout';
import { EligibilityResult } from './EligibilityResult';
import { EmploymentType } from './steps/EmploymentType';
import { PublicEntryPath } from './steps/PublicEntryPath';
import { PublicUploadDocument } from './steps/PublicUploadDocument';
import { FederalState } from './steps/FederalState';
import { PensionProvider } from './steps/PensionProvider';
import { PensionScheme } from './steps/PensionScheme';
import { ContributionPeriod } from './steps/ContributionPeriod';
import { ContributionDuration } from './steps/ContributionDuration';
import { StagePensionDetails } from './steps/StagePensionDetails';
import { StageContributionDuration } from './steps/StageContributionDuration';
import { StageUploadDocument } from './steps/StageUploadDocument';
import { EmploymentEndDate } from './steps/EmploymentEndDate';
import { PrivateUploadDocument } from './steps/PrivateUploadDocument';
import { PrivateStatePensionRefund } from './steps/PrivateStatePensionRefund';
import { PrivatePensionProvider } from './steps/PrivatePensionProvider';
import { PrivateStatementAmount } from './steps/PrivateStatementAmount';

const STEP_COMPONENTS: Record<string, React.FC> = {
  // Public sector steps
  public_entry_path: PublicEntryPath,
  public_upload: PublicUploadDocument,
  federal_state: FederalState,
  pension_provider: PensionProvider,
  pension_scheme: PensionScheme,
  contribution_period: ContributionPeriod,
  contribution_duration: ContributionDuration,
  // Stage steps
  stage_entry_path: PublicEntryPath,
  stage_upload: StageUploadDocument,
  stage_pension_details: StagePensionDetails,
  stage_contribution_duration: StageContributionDuration,
  stage_post_2001_contribution_duration: StageContributionDuration,
  stage_post_2018_contribution_duration: StageContributionDuration,
  employment_end_date: EmploymentEndDate,
  // Private sector steps
  private_entry_path: PublicEntryPath,
  private_upload: PrivateUploadDocument,
  private_state_pension_refund: PrivateStatePensionRefund,
  private_pension_provider: PrivatePensionProvider,
  private_statement_amount: PrivateStatementAmount,
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
    stepHistory.length > 0 &&
    currentStepId !== 'public_entry_path' &&
    currentStepId !== 'public_upload' &&
    currentStepId !== 'stage_entry_path' &&
    currentStepId !== 'stage_upload' &&
    currentStepId !== 'private_entry_path' &&
    currentStepId !== 'private_upload' &&
    currentStepId !== 'private_state_pension_refund' &&
    currentStepId !== 'private_statement_amount';

  return (
    <GetStartedLayout showBack={showLayoutBack} onBack={goBack}>
      {/* Several step ids share one component (the two stage threshold
          questions both render StageContributionDuration, and they can follow
          each other directly). Keying on the step id forces a remount so each
          question starts from its own answer instead of inheriting the
          previous step's local selection. */}
      <StepComponent key={currentStepId} />
    </GetStartedLayout>
  );
}

export default EligibilityFlow;
