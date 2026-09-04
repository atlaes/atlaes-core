import { FlowConfig, EligibilityData, StepId } from './index';

const INELIGIBLE_STATES = [
  'Berlin (East)',
  'Brandenburg',
  'Mecklenburg-Vorpommern',
  'Saxony',
  'Saxony-Anhalt',
  'Thuringia',
];

// Tester feedback 2026-08-04 (Figma 1572-609 / 1573-717 / 455-15644): every
// public-sector rejection is the plain screen — this title, no body copy.
const CANNOT_BE_CLAIMED =
  'This refund cannot currently be claimed with CompanyPension';
// The post-questionnaire rejection (Figma 1858-1192) says "started".
const CANNOT_BE_STARTED =
  'This refund cannot currently be started with CompanyPension';

const PUBLIC_FINAL_QUESTION_FIELDS = [
  'publicWorkedPublicAfter',
  'publicOtherInstitution',
  'publicPriorRefund',
  'publicCivilServant',
] as const;

// Figma 2346-5922: the upload path ends on its own two-question screen
// instead of the manual four-question one.
const PUBLIC_UPLOAD_FINAL_QUESTION_FIELDS = [
  'publicUploadDisabled',
  'publicUploadMandatoryInsurance',
] as const;

function isUploadPath(data: EligibilityData): boolean {
  return data.publicEntryPath === 'upload';
}

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
    return { title: CANNOT_BE_CLAIMED, message: '' };
  }

  if (data.pensionProvider === 'VBL' && data.vblPlan === 'VBLextra') {
    return { title: CANNOT_BE_CLAIMED, message: '' };
  }

  if (data.contributionDuration === '60_plus') {
    return { title: CANNOT_BE_CLAIMED, message: '' };
  }

  if (data.consecutiveContribution === 'yes' && endedInOrAfter2018(data)) {
    return { title: CANNOT_BE_CLAIMED, message: '' };
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
    'public_final_questions',
    // Appended after the manual questionnaire on purpose: the two final
    // steps are mutually exclusive by entry path (see shouldSkipStep), so
    // order is irrelevant, and keeping the earlier indices stable means a
    // sessionStorage snapshot persisted before this step existed still
    // resumes on the right screen.
    'public_upload_final_questions',
  ],

  shouldSkipStep(stepId: StepId, data: EligibilityData): boolean {
    if (stepId === 'public_upload') {
      return !isUploadPath(data);
    }

    // Figma 2346-5922 / 2346-6081: the upload path gets the two-question
    // "[VBL/ZVK] insurance" gate and never sees the manual four-question
    // screen (Figma 2346-3635), which stays exclusive to the manual path.
    if (stepId === 'public_upload_final_questions') {
      return !isUploadPath(data);
    }
    if (stepId === 'public_final_questions') {
      return isUploadPath(data);
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
          return { title: CANNOT_BE_CLAIMED, message: '' };
        }
        return null;

      // Figma 454-10444 / 455-15644: the manual dropdown offers VBL and ZVK,
      // and selecting ZVK ends on the rejection screen whose button returns
      // to the homepage. Upload-path extractions (state-specific ZVK names,
      // e.g. 'ZVK (KVBW)') are unaffected — they never pass through this step.
      case 'pension_provider':
        if (data.pensionProvider === 'ZVK') {
          return {
            title: CANNOT_BE_CLAIMED,
            message: '',
            returnTo: 'homepage' as const,
          };
        }
        return null;

      case 'pension_scheme':
        if (data.vblPlan === 'VBLextra') {
          return { title: CANNOT_BE_CLAIMED, message: '' };
        }
        return null;

      case 'contribution_period':
        if (
          data.consecutiveContribution === 'yes' &&
          endedInOrAfter2018(data)
        ) {
          return { title: CANNOT_BE_CLAIMED, message: '' };
        }
        return null;

      case 'contribution_duration':
        if (data.contributionDuration === '60_plus') {
          return { title: CANNOT_BE_CLAIMED, message: '' };
        }
        return null;

      // Figma 2346-5922 → 2346-6090 ("Any Yes"): the upload-path
      // questionnaire is the final gate for uploaded documents.
      case 'public_upload_final_questions':
        if (
          PUBLIC_UPLOAD_FINAL_QUESTION_FIELDS.some(
            (field) => data[field] === 'yes'
          )
        ) {
          return { title: CANNOT_BE_STARTED, message: '' };
        }
        return null;

      // Figma 1858-711 → 1858-1192 (now 2346-3635 → 2346-5804): any 'yes'
      // on the final questionnaire blocks the refund. Manual path only — the
      // upload path is gated by 'public_upload_final_questions' above.
      case 'public_final_questions':
        if (
          PUBLIC_FINAL_QUESTION_FIELDS.some((field) => data[field] === 'yes')
        ) {
          return { title: CANNOT_BE_STARTED, message: '' };
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
