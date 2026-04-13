import { FlowConfig, EligibilityData, StepId } from './index';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const stageFlow: FlowConfig = {
  // Client #5: federal state is asked first so the contribution cap
  // (west/east BBG) can be applied correctly during the later calculation.
  // Unlike public sector, east states are NOT ineligible for stage/orchestra —
  // they just use a different cap.
  steps: [
    'federal_state',
    'stage_pension_details',
    'stage_contribution_duration',
    'employment_end_date',
  ],

  shouldSkipStep(): boolean {
    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    if (stepId === 'stage_contribution_duration') {
      if (data.stageContributionDuration === 'less_than_12') {
        return {
          title: 'Not eligible for a company pension payout',
          message:
            'Based on the information you provided, a payout is not possible because the minimum contribution period of 12 months has not been met.',
          secondaryMessage:
            'Under the applicable scheme rules, contributions below this threshold do not qualify for a payout.',
        };
      }
      if (data.stageContributionDuration === '36_plus') {
        return {
          title: 'Not eligible for a company pension payout',
          message:
            'Based on the information you provided, a payout of your company pension contributions is not possible because the contribution period exceeds the maximum limit for a payout.',
          secondaryMessage:
            'Your pension is vested under the applicable scheme rules and must remain with the pension provider. You may claim a regular pension benefit once you reach the German retirement age.',
        };
      }
    }
    return null;
  },

  checkWaiting(stepId: StepId, data: EligibilityData) {
    if (
      stepId === 'employment_end_date' &&
      data.employmentEndMonth &&
      data.employmentEndYear
    ) {
      const monthIndex = MONTHS.indexOf(data.employmentEndMonth);
      const year = parseInt(data.employmentEndYear);
      const eligibleDate = new Date(year, monthIndex + 24);
      const now = new Date();

      if (eligibleDate > now) {
        const formattedDate = eligibleDate.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        });
        return {
          title: 'Your company pension payout is not yet available',
          message:
            'For this pension scheme, a 24-month waiting period must pass after your last contribution before a payout can be requested.',
          eligibleDate: formattedDate,
        };
      }
    }
    return null;
  },
};
