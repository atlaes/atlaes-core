import { FlowConfig, EligibilityData, StepId } from './index';

export const privateSectorFlow: FlowConfig = {
  steps: [
    'private_entry_path',
    'private_upload',
    'private_pension_provider',
    'private_contribution_details',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'private_upload') {
      return data.privateEntryPath !== 'upload';
    }

    if (
      stepId === 'private_pension_provider' ||
      stepId === 'private_contribution_details'
    ) {
      return data.privateEntryPath === 'upload';
    }

    return false;
  },

  checkEligibility() {
    return null;
  },

  checkReview(stepId: StepId, data: EligibilityData) {
    if (stepId === 'private_upload') {
      if (
        data.privatePensionProvider === 'Other' ||
        data.privateStatePensionRefundReceived !== 'yes' ||
        data.privateStatementValueType === 'not_found'
      ) {
        return {
          title: 'Individual assessment required',
          message:
            'Based on the information you provided, we need to review your bAV cash-out individually before confirming whether it can be started.',
          disclaimerParagraphs: [
            'Some bAV cash-outs depend on the provider, the statement value and whether a German state pension refund has already been approved.',
            'Our team will review the pension document details and contact you with the result.',
          ],
        };
      }
    }

    if (stepId === 'private_contribution_details') {
      if (
        data.privatePensionProvider === 'Other' ||
        data.employerPaidContributions === 'not_sure'
      ) {
        return {
          title: 'Individual assessment required',
          message:
            'Based on the information you provided, we need to review your case individually to determine if a lump-sum settlement is possible.',
          disclaimerParagraphs: [
            'Our team will review your pension scheme details and contact you with the result.',
            'This usually takes 5-10 business days.',
          ],
        };
      }
    }
    return null;
  },
};
