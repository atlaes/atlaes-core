import { FlowConfig, EligibilityData, StepId } from './index';

const INELIGIBLE_STATES = [
  'Berlin (East)',
  'Brandenburg',
  'Mecklenburg-Vorpommern',
  'Saxony',
  'Saxony-Anhalt',
  'Thuringia',
];

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

function endedInOrAfter2018(data: EligibilityData): boolean {
  const endYear = Number(data.employmentEndYear);
  return Number.isFinite(endYear) && endYear >= 2018;
}

export const publicSectorFlow: FlowConfig = {
  steps: [
    'public_entry_path',
    'federal_state',
    'pension_provider',
    'pension_scheme',
    'employment_end_date',
    'contribution_period',
    'contribution_duration',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    // VBL plan toggle only for VBL provider
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

      case 'contribution_period':
        if (
          data.consecutiveContribution === 'yes' &&
          endedInOrAfter2018(data)
        ) {
          return {
            title: 'Not eligible for a supplementary pension refund',
            message:
              'Based on your information, your supplementary pension is vested under the rules that apply from 2018 onward and cannot be paid out as a lump sum.',
            secondaryMessage:
              'Periods that ended before 2018 may still be reviewed because earlier contributions can be counted differently.',
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

  checkWaiting(stepId: StepId, data: EligibilityData) {
    if (
      stepId === 'employment_end_date' &&
      data.employmentEndMonth &&
      data.employmentEndYear
    ) {
      const monthIndex = MONTHS.indexOf(data.employmentEndMonth);
      const year = Number(data.employmentEndYear);
      if (monthIndex < 0 || !Number.isFinite(year)) return null;

      const eligibleDate = new Date(year, monthIndex + 24);
      if (eligibleDate > new Date()) {
        const formattedDate = eligibleDate.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        });
        return {
          title: 'Your refund is not yet available',
          message:
            'A 24-month waiting period must pass after your public-sector employment ends before this refund can be requested.',
          eligibleDate: formattedDate,
        };
      }
    }
    return null;
  },
};
