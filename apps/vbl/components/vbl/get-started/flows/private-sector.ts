import { FlowConfig, EligibilityData, StepId } from './index';

export const privateSectorFlow: FlowConfig = {
  steps: ['private_pension_provider', 'private_contribution_details'],

  shouldSkipStep(): boolean {
    return false;
  },

  checkEligibility() {
    return null;
  },

  checkReview(stepId: StepId, data: EligibilityData) {
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
