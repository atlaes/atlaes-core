import { FlowConfig, EligibilityData, StepId } from './index';

const INELIGIBLE_STATES = [
  'Berlin (East)',
  'Brandenburg',
  'Mecklenburg-Vorpommern',
  'Saxony',
  'Saxony-Anhalt',
  'Thuringia',
];

function endedInOrAfter2018(data: EligibilityData): boolean {
  const endYear = Number(data.employmentEndYear);
  return Number.isFinite(endYear) && endYear >= 2018;
}

// True only when the employment end year is known AND before 2018. A missing
// or unparseable end year returns false (not the same as !endedInOrAfter2018,
// which would be true for NaN) so we keep asking the consecutive question
// until the end date pins the period to pre-2018.
function endedBefore2018(data: EligibilityData): boolean {
  const endYear = Number(data.employmentEndYear);
  return Number.isFinite(endYear) && endYear < 2018;
}

function hasConfirmedUploadCheckData(data: EligibilityData): boolean {
  return Boolean(
    data.publicEntryPath === 'upload' &&
    data.federalState &&
    data.pensionProvider &&
    data.employmentEndMonth &&
    data.employmentEndYear &&
    data.contributionStartMonth &&
    data.contributionStartYear &&
    data.contributionEndMonth &&
    data.contributionEndYear &&
    data.consecutiveContribution &&
    data.contributionDuration &&
    (data.pensionProvider !== 'VBL' || data.vblPlan)
  );
}

function checkPublicEligibility(data: EligibilityData) {
  if (INELIGIBLE_STATES.includes(data.federalState)) {
    return {
      title: 'Not eligible for a supplementary pension refund',
      message:
        'Public-sector pension schemes in certain federal states operate under different regulations and do not allow a refund.',
    };
  }

  if (data.pensionProvider === 'VBL' && data.vblPlan === 'VBLextra') {
    return {
      title: 'Not eligible for a supplementary pension refund',
      message:
        'Based on your information, your supplementary pension is vested. Because you have contributions to VBLextra, any earlier VBLklassik contributions are preserved as a future pension entitlement and cannot be paid out as a lump sum.',
      secondaryMessage:
        'Your pension remains credited to you and may be paid later as a regular pension benefit when you reach the German retirement age.',
    };
  }

  if (data.contributionDuration === '60_plus') {
    return {
      title: 'Not eligible for a supplementary pension refund',
      message:
        'Based on the information you provided, a payout of your supplementary pension contributions is not possible.',
      secondaryMessage:
        'Your pension is vested under the applicable scheme rules and must remain with the pension provider. You may claim a regular pension benefit once you reach the German retirement age.',
    };
  }

  if (data.consecutiveContribution === 'yes' && endedInOrAfter2018(data)) {
    return {
      title: 'Not eligible for a supplementary pension refund',
      message:
        'Based on your information, your supplementary pension is vested under the rules that apply from 2018 onward and cannot be paid out as a lump sum.',
      secondaryMessage:
        'Periods that ended before 2018 may still be reviewed because earlier contributions can be counted differently.',
    };
  }

  return null;
}

export const publicSectorFlow: FlowConfig = {
  steps: [
    'public_entry_path',
    'public_upload',
    'federal_state',
    'pension_provider',
    'pension_scheme',
    'employment_end_date',
    'contribution_period',
    'contribution_duration',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'public_upload') {
      return data.publicEntryPath !== 'upload';
    }

    if (
      [
        'federal_state',
        'pension_provider',
        'pension_scheme',
        'employment_end_date',
        'contribution_period',
        'contribution_duration',
      ].includes(stepId) &&
      hasConfirmedUploadCheckData(data)
    ) {
      return true;
    }

    // VBL plan toggle only for VBL provider
    if (stepId === 'pension_scheme' && data.pensionProvider !== 'VBL') {
      return true;
    }

    // Figma: if employment ended before 2018, jump straight to the total
    // contribution period screen and skip the consecutive-contribution
    // question. Its answer only matters from 2018 onward (see
    // checkEligibility('contribution_period'), which vests only on
    // 'yes' + endedInOrAfter2018), so it is dead weight for pre-2018 periods.
    if (stepId === 'contribution_period' && endedBefore2018(data)) {
      return true;
    }
    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    switch (stepId) {
      case 'public_upload':
        if (hasConfirmedUploadCheckData(data)) {
          return checkPublicEligibility(data);
        }
        return null;

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

  // Item 9: VBL/ZVK (public-sector) has no 24-month waiting rule — users
  // can never land on result === 'waiting' here. Do not add a
  // checkWaiting() back without re-confirming with the client; the
  // stage flow's own waiting calculation (flows/stage.ts) is unrelated
  // and must stay untouched.
};
