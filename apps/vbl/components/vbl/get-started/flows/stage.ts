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

// Month indexes (year * 12 + zero-based month) for the two stage cut-off
// dates, matching ManualVBLCalculator's stage branching.
const JANUARY_2001 = 2001 * 12;
const JANUARY_2018 = 2018 * 12;

function getEmploymentEndIndex(data: EligibilityData): number | null {
  const monthIndex = MONTHS.indexOf(data.employmentEndMonth);
  const year = Number(data.employmentEndYear);
  if (monthIndex < 0 || !data.employmentEndYear || !Number.isFinite(year)) {
    return null;
  }
  return year * 12 + monthIndex;
}

// Both stage providers (VddB and VddKO) follow the same decision tree; which
// extra question is asked depends only on the total contribution bucket and on
// when the employment ended.
function needsPost2018Question(data: EligibilityData): boolean {
  if (data.stageContributionDuration !== '36_to_119') return false;
  const end = getEmploymentEndIndex(data);
  return end !== null && end >= JANUARY_2018;
}

function needsPost2001Question(data: EligibilityData): boolean {
  if (data.stageContributionDuration !== '36_to_119') return false;
  const end = getEmploymentEndIndex(data);
  if (end === null || end < JANUARY_2001) return false;
  // Employment that ended between 2001 and 2017 goes straight to the
  // since-2001 question; 2018 onwards only reaches it after the since-2018
  // question came back under 36 months.
  if (end < JANUARY_2018) return true;
  return data.stagePost2018ContributionDuration === 'less_than_36';
}

function needsEmploymentEndDate(data: EligibilityData): boolean {
  return (
    data.stageContributionDuration === '12_to_35' ||
    data.stageContributionDuration === '36_to_119'
  );
}

function hasRequiredPostContributionCheck(data: EligibilityData): boolean {
  if (needsPost2018Question(data) && !data.stagePost2018ContributionDuration) {
    return false;
  }
  if (needsPost2001Question(data) && !data.stagePost2001ContributionDuration) {
    return false;
  }
  return true;
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

  // Both threshold answers can survive a later bucket or end-date change, so
  // they only count while their question is still part of the flow.
  if (
    needsPost2018Question(data) &&
    data.stagePost2018ContributionDuration === '36_plus'
  ) {
    return {
      title: 'This refund cannot currently be claimed with CompanyPension',
      message:
        'Based on the contribution period after 1 January 2018, this refund cannot currently continue through CompanyPension.',
    };
  }

  if (
    needsPost2001Question(data) &&
    data.stagePost2001ContributionDuration === '60_plus'
  ) {
    return {
      title: 'This refund cannot currently be claimed with CompanyPension',
      message:
        'Based on the contribution period after 1 January 2001, this refund cannot currently continue through CompanyPension.',
    };
  }

  return null;
}

// Stage refunds can only be started 24 months after the employment ended.
function getStageWaiting(data: EligibilityData) {
  const end = getEmploymentEndIndex(data);
  if (end === null) return null;

  const eligibleIndex = end + 24;
  const eligibleDate = new Date(
    Math.floor(eligibleIndex / 12),
    eligibleIndex % 12
  );
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
    'employment_end_date',
    'stage_post_2018_contribution_duration',
    'stage_post_2001_contribution_duration',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'stage_upload') {
      return data.stageEntryPath !== 'upload';
    }

    if (
      [
        'stage_pension_details',
        'stage_contribution_duration',
        'employment_end_date',
        'stage_post_2018_contribution_duration',
        'stage_post_2001_contribution_duration',
      ].includes(stepId) &&
      hasConfirmedUploadCheckData(data)
    ) {
      return true;
    }

    // Under 12 and 120+ months are already ineligible, so no end date is
    // needed for those buckets.
    if (stepId === 'employment_end_date') {
      return !needsEmploymentEndDate(data);
    }

    if (stepId === 'stage_post_2018_contribution_duration') {
      return !needsPost2018Question(data);
    }

    if (stepId === 'stage_post_2001_contribution_duration') {
      return !needsPost2001Question(data);
    }

    return false;
  },

  checkEligibility(stepId: StepId, data: EligibilityData) {
    if (stepId === 'stage_upload' && hasConfirmedUploadCheckData(data)) {
      return getStageIneligibility(data);
    }

    if (
      stepId === 'stage_contribution_duration' ||
      stepId === 'stage_post_2018_contribution_duration' ||
      stepId === 'stage_post_2001_contribution_duration'
    ) {
      return getStageIneligibility(data);
    }

    return null;
  },

  checkWaiting(stepId: StepId, data: EligibilityData) {
    if (stepId === 'stage_upload' && hasConfirmedUploadCheckData(data)) {
      return getStageWaiting(data);
    }

    // The waiting check is the last gate before "eligible", so it only runs
    // once no further threshold question is due.
    if (stepId === 'employment_end_date') {
      if (needsPost2018Question(data) || needsPost2001Question(data)) {
        return null;
      }
      return getStageWaiting(data);
    }

    if (stepId === 'stage_post_2001_contribution_duration') {
      return getStageWaiting(data);
    }

    return null;
  },
};
