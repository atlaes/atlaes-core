import { FlowConfig, EligibilityData, StepId } from './index';

export const privateSectorFlow: FlowConfig = {
  steps: [
    'private_entry_path',
    'private_upload',
    'private_state_pension_refund',
    'private_pension_provider',
    'private_statement_amount',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'private_upload') {
      return data.privateEntryPath !== 'upload';
    }

    if (
      stepId === 'private_state_pension_refund' ||
      stepId === 'private_pension_provider' ||
      stepId === 'private_statement_amount'
    ) {
      return data.privateEntryPath === 'upload';
    }

    return false;
  },

  checkEligibility() {
    return null;
  },
};
