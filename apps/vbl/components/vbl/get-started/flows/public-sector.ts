import { FlowConfig, EligibilityData, StepId } from './index';

const INELIGIBLE_STATES = [
  'Berlin (East)',
  'Brandenburg',
  'Mecklenburg-Vorpommern',
  'Saxony',
  'Saxony-Anhalt',
  'Thuringia',
];

export const publicSectorFlow: FlowConfig = {
  steps: [
    'federal_state',
    'pension_provider',
    'pension_scheme',
    'eu_continuation',
    'employment_end_date',
    'contribution_duration',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    // VBL plan toggle only for VBL provider
    if (stepId === 'pension_scheme' && data.pensionProvider !== 'VBL') {
      return true;
    }
    // EU continuation only for VBL/ZVK
    if (
      stepId === 'eu_continuation' &&
      data.pensionProvider !== 'VBL' &&
      data.pensionProvider !== 'ZVK'
    ) {
      return true;
    }
    // Contribution duration only if user continues in EU public sector
    if (stepId === 'contribution_duration' && data.euContinuation !== 'yes') {
      return true;
    }
    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    switch (stepId) {
      case 'federal_state':
        if (INELIGIBLE_STATES.includes(data.federalState)) {
          return {
            title: 'Not eligible for a supplementary pension refund',
            message:
              'Public-sector pension schemes in certain federal states operate under different regulations and do not allow a refund.',
          };
        }
        return null;

      case 'pension_scheme':
        if (data.vblPlan === 'VBLextra') {
          return {
            title: 'Not eligible for a supplementary pension refund',
            message:
              'Based on your information, your supplementary pension is vested. Because you have contributions to VBLextra, any earlier VBLklassik contributions are preserved as a future pension entitlement and cannot be paid out as a lump sum.',
            secondaryMessage:
              'Your pension remains credited to you and may be paid later as a regular pension benefit when you reach the German retirement age.',
          };
        }
        return null;

      case 'contribution_duration':
        if (data.contributionDuration === '60_plus') {
          return {
            title: 'Not eligible for a supplementary pension refund',
            message:
              'Based on the information you provided, a payout of your supplementary pension contributions is not possible.',
            secondaryMessage:
              'Your pension is vested under the applicable scheme rules and must remain with the pension provider. You may claim a regular pension benefit once you reach the German retirement age.',
          };
        }
        return null;

      default:
        return null;
    }
  },
};
