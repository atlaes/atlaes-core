export type EmploymentType =
  | 'public_sector'
  | 'stage_performing_arts'
  | 'private_sector'
  | '';

export type PensionProviderType = string;

export type PrivatePensionProviderType =
  | 'Allianz'
  | 'Axa'
  | 'BVV'
  | 'Swiss_Life'
  | 'ERGO'
  | 'R_V'
  | 'Nuernberger'
  | 'HDI'
  | 'Other'
  | '';

export type VBLPlan = 'VBLklassik' | 'VBLextra' | '';

export type ContributionDurationType =
  | 'less_than_36'
  | '36_to_59'
  | '60_plus'
  | '';

export type StageContributionDurationType =
  | 'less_than_12'
  | '12_to_35'
  | '36_to_119'
  | '120_plus'
  | '';

export type StagePost2001ContributionDurationType =
  | 'less_than_60'
  | '60_plus'
  | '';

export type StagePost2018ContributionDurationType =
  | 'less_than_36'
  | '36_plus'
  | '';

export type EntryPathType = 'upload' | 'manual' | '';
export type PublicEntryPathType = EntryPathType;
export type StageEntryPathType = EntryPathType;
export type PrivateEntryPathType = EntryPathType;
export type PrivateStatePensionRefundReceivedType = 'yes' | 'no' | '';
export type PrivateStatementValueType =
  | 'monthly_pension'
  | 'capital_amount'
  | 'not_found'
  | '';

export interface EligibilityData {
  employmentType: EmploymentType;
  federalState: string;
  pensionProvider: PensionProviderType;
  vblPlan: VBLPlan;
  consecutiveContribution: 'yes' | 'no' | '';
  contributionDuration: ContributionDurationType;
  publicEntryPath: PublicEntryPathType;
  // Final public-sector questionnaire (Figma 1858-711) — any 'yes' blocks
  publicWorkedPublicAfter: 'yes' | 'no' | '';
  publicOtherInstitution: 'yes' | 'no' | '';
  publicPriorRefund: 'yes' | 'no' | '';
  publicCivilServant: 'yes' | 'no' | '';
  // Stage-specific
  stageEntryPath: StageEntryPathType;
  stageContributionDuration: StageContributionDurationType;
  stagePost2001ContributionDuration: StagePost2001ContributionDurationType;
  stagePost2018ContributionDuration: StagePost2018ContributionDurationType;
  employmentEndMonth: string;
  employmentEndYear: string;
  // Shared contribution period fields (public sector, stage & upload flows)
  contributionStartMonth: string;
  contributionStartYear: string;
  contributionEndMonth: string;
  contributionEndYear: string;
  averageMonthlyContribution: string;
  // Private sector-specific
  privateEntryPath: PrivateEntryPathType;
  privatePensionProvider: PrivatePensionProviderType;
  privatePensionProviderOther: string;
  privateStatePensionRefundReceived: PrivateStatePensionRefundReceivedType;
  privateStatementValueType: PrivateStatementValueType;
  privateStatementAmount: string;
}

export type StepId =
  | 'public_entry_path'
  | 'public_upload'
  | 'stage_entry_path'
  | 'stage_upload'
  | 'federal_state'
  | 'pension_provider'
  | 'pension_scheme'
  | 'contribution_period'
  | 'contribution_duration'
  | 'public_final_questions'
  | 'stage_pension_details'
  | 'stage_contribution_duration'
  | 'stage_post_2001_contribution_duration'
  | 'stage_post_2018_contribution_duration'
  | 'employment_end_date'
  | 'private_entry_path'
  | 'private_upload'
  | 'private_state_pension_refund'
  | 'private_pension_provider'
  | 'private_statement_amount';

export interface IneligibilityInfo {
  title: string;
  message: string;
  secondaryMessage?: string;
  // Figma 455-15644: some rejection screens (e.g. ZVK selected) send the
  // user to the homepage instead of restarting the eligibility flow.
  returnTo?: 'start' | 'homepage';
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
  checkWaiting?: (stepId: StepId, data: EligibilityData) => WaitingInfo | null;
  checkReview?: (stepId: StepId, data: EligibilityData) => ReviewInfo | null;
}
