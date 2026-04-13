export type EmploymentType =
  | 'public_sector'
  | 'stage_performing_arts'
  | 'private_sector'
  | '';

export type PensionProviderType = 'VBL' | 'ZVK' | 'VddB' | 'VddKO' | '';

export type PrivatePensionProviderType =
  | 'Allianz'
  | 'Axa'
  | 'BVV'
  | 'Swiss_Life'
  | 'Other'
  | '';

export type EmployerPaidType = 'yes' | 'not_sure' | '';

export type VBLPlan = 'VBLklassik' | 'VBLextra' | '';

export type ContributionDurationType =
  | 'less_than_36'
  | '36_to_59'
  | '60_plus'
  | '';

export type StageContributionDurationType =
  | 'less_than_12'
  | '12_to_35'
  | '36_plus'
  | '';

export interface EligibilityData {
  employmentType: EmploymentType;
  federalState: string;
  pensionProvider: PensionProviderType;
  vblPlan: VBLPlan;
  euContinuation: 'yes' | 'no' | '';
  consecutiveContribution: 'yes' | 'no' | '';
  contributionDuration: ContributionDurationType;
  // Stage-specific
  stageContributionDuration: StageContributionDurationType;
  employmentEndMonth: string;
  employmentEndYear: string;
  // Private sector-specific
  privatePensionProvider: PrivatePensionProviderType;
  privatePensionProviderOther: string;
  contributionStartMonth: string;
  contributionStartYear: string;
  contributionEndMonth: string;
  contributionEndYear: string;
  averageMonthlyContribution: string;
  employerPaidContributions: EmployerPaidType;
}

export type StepId =
  | 'federal_state'
  | 'pension_provider'
  | 'pension_scheme'
  | 'eu_continuation'
  | 'contribution_period'
  | 'contribution_duration'
  | 'stage_pension_details'
  | 'stage_contribution_duration'
  | 'employment_end_date'
  | 'private_pension_provider'
  | 'private_contribution_details';

export interface IneligibilityInfo {
  title: string;
  message: string;
  secondaryMessage?: string;
}

export interface WaitingInfo {
  title: string;
  message: string;
  eligibleDate: string;
}

export interface ReviewInfo {
  title: string;
  message: string;
  disclaimerParagraphs: string[];
}

export interface FlowConfig {
  steps: StepId[];
  shouldSkipStep: (stepId: StepId, data: EligibilityData) => boolean;
  checkEligibility: (
    stepId: StepId,
    data: EligibilityData
  ) => IneligibilityInfo | null;
  checkWaiting?: (
    stepId: StepId,
    data: EligibilityData
  ) => WaitingInfo | null;
  checkReview?: (
    stepId: StepId,
    data: EligibilityData
  ) => ReviewInfo | null;
}
