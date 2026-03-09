import { FlowConfig, EligibilityData, StepId } from './index';

const INELIGIBLE_STATES = [
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
    'contribution_period',
    'contribution_duration',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'pension_scheme' && data.pensionProvider !== 'VBL') {
      return true;
    }
    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    switch (stepId) {
      case 'federal_state':
        if (INELIGIBLE_STATES.includes(data.federalState)) {
          return {
            title: 'Not eligible for a company pension refund',
            message:
              'Public-sector pension schemes in certain federal states operate under different regulations and do not allow a refund.',
          };
        }
        return null;

      case 'pension_scheme':
        if (data.vblPlan === 'VBLextra') {
          return {
            title: 'Not eligible for a company pension payout',
            message:
              'Based on your information, your company pension is vested. Because you have contributions to VBLextra, any earlier VBLklassik contributions are preserved as a future pension entitlement and cannot be paid out as a lump sum.',
            secondaryMessage:
              'Your pension remains credited to you and may be paid later as a regular pension benefit when you reach the German retirement age.',
          };
        }
        return null;

      case 'contribution_period':
        if (data.consecutiveContribution === 'yes') {
          return {
            title: 'Not eligible for a company pension payout',
            message:
              'Based on the information you provided, a payout of your company pension contributions is not possible.',
            secondaryMessage:
              'Your pension is vested under the applicable scheme rules and must remain with the pension provider. This means you may claim a regular pension benefit once you reach the German retirement age.',
          };
        }
        return null;

      case 'contribution_duration':
        if (data.contributionDuration === '60_plus') {
          return {
            title: 'Not eligible for a company pension payout',
            message:
              'Based on the information you provided, a payout of your company pension contributions is not possible.',
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
