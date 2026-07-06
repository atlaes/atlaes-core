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

function hasRequiredPostContributionCheck(data: EligibilityData): boolean {
  if (data.stageContributionDuration !== '36_to_119') return true;

  if (data.pensionProvider === 'VddB') {
    return Boolean(data.stagePost2001ContributionDuration);
  }

  if (data.pensionProvider === 'VddKO') {
    return Boolean(data.stagePost2018ContributionDuration);
  }

  return false;
}

function hasConfirmedUploadCheckData(data: EligibilityData): boolean {
  return Boolean(
    data.stageEntryPath === 'upload' &&
      data.pensionProvider &&
      data.contributionStartMonth &&
      data.contributionStartYear &&
      data.contributionEndMonth &&
      data.contributionEndYear &&
      data.employmentEndMonth &&
      data.employmentEndYear &&
      data.stageContributionDuration &&
      hasRequiredPostContributionCheck(data)
  );
}

function getStageIneligibility(data: EligibilityData) {
  if (data.stageContributionDuration === 'less_than_12') {
    return {
      title: 'This refund cannot currently be claimed with CompanyPension',
      message:
        'Based on the contribution period you selected, this refund cannot currently continue through CompanyPension.',
    };
  }

  if (data.stageContributionDuration === '120_plus') {
    return {
      title: 'This refund cannot currently be claimed with CompanyPension',
      message:
        'Based on the contribution period you selected, this refund cannot currently continue through CompanyPension.',
    };
  }

  if (
    data.pensionProvider === 'VddB' &&
    data.stagePost2001ContributionDuration === '60_plus'
  ) {
    return {
      title: 'This refund cannot currently be claimed with CompanyPension',
      message:
        'Based on the contribution period after 1 January 2001, this refund cannot currently continue through CompanyPension.',
    };
  }

  if (
    data.pensionProvider === 'VddKO' &&
    data.stagePost2018ContributionDuration === '36_plus'
  ) {
    return {
      title: 'This refund cannot currently be claimed with CompanyPension',
      message:
        'Based on the contribution period after 1 January 2018, this refund cannot currently continue through CompanyPension.',
    };
  }

  return null;
}

function getStageWaiting(data: EligibilityData) {
  if (!data.employmentEndMonth || !data.employmentEndYear) return null;

  const monthIndex = MONTHS.indexOf(data.employmentEndMonth);
  const year = Number(data.employmentEndYear);
  if (monthIndex < 0 || !Number.isFinite(year)) return null;

  const eligibleDate = new Date(year, monthIndex + 24);
  if (eligibleDate <= new Date()) return null;

  const formattedDate = eligibleDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  return {
    title: 'Your refund cannot be started yet',
    message: 'You can return on or after',
    eligibleDate: formattedDate,
  };
}

export const stageFlow: FlowConfig = {
  steps: [
    'stage_entry_path',
    'stage_upload',
    'stage_pension_details',
    'stage_contribution_duration',
    'stage_post_2001_contribution_duration',
    'stage_post_2018_contribution_duration',
    'employment_end_date',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'stage_upload') {
      return data.stageEntryPath !== 'upload';
    }

    if (
      [
        'stage_pension_details',
        'stage_contribution_duration',
        'stage_post_2001_contribution_duration',
        'stage_post_2018_contribution_duration',
        'employment_end_date',
      ].includes(stepId) &&
      hasConfirmedUploadCheckData(data)
    ) {
      return true;
    }

    if (stepId === 'stage_post_2001_contribution_duration') {
      return (
        data.pensionProvider !== 'VddB' ||
        data.stageContributionDuration !== '36_to_119'
      );
    }

    if (stepId === 'stage_post_2018_contribution_duration') {
      return (
        data.pensionProvider !== 'VddKO' ||
        data.stageContributionDuration !== '36_to_119'
      );
    }

    if (stepId === 'employment_end_date') {
      if (data.stageContributionDuration === '12_to_35') return false;

      if (
        data.pensionProvider === 'VddB' &&
        data.stageContributionDuration === '36_to_119'
      ) {
        return data.stagePost2001ContributionDuration !== 'less_than_60';
      }

      if (
        data.pensionProvider === 'VddKO' &&
        data.stageContributionDuration === '36_to_119'
      ) {
        return data.stagePost2018ContributionDuration !== 'less_than_36';
      }

      return true;
    }

    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    if (stepId === 'stage_upload' && hasConfirmedUploadCheckData(data)) {
      return getStageIneligibility(data);
    }

    if (stepId === 'stage_contribution_duration') {
      return getStageIneligibility(data);
    }

    if (
      stepId === 'stage_post_2001_contribution_duration' ||
      stepId === 'stage_post_2018_contribution_duration'
    ) {
      return getStageIneligibility(data);
    }

    return null;
  },

  checkWaiting(stepId: StepId, data: EligibilityData) {
    if (stepId === 'stage_upload' && hasConfirmedUploadCheckData(data)) {
      return getStageWaiting(data);
    }

    if (stepId === 'employment_end_date') {
      return getStageWaiting(data);
    }

    return null;
  },
};
