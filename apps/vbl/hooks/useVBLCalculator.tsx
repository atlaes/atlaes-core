'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface JobData {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  employmentType: '' | 'Stage / Performing Arts' | 'Private sector' | 'Public sector' | 'Orchestra';
  averageMonthlyGrossSalary: string;
  germanFederalState: string;
  companyPension: string;
  supplementaryPensions: string[];
  customPensionName: string;
  // Figma: private-sector jobs ask whether the user's German statutory
  // pension contributions (DRV) have already been refunded. "no" branches
  // into the optional financial-details sub-step below, which can change the
  // final result scenario. "not_sure" is kept for legacy sessions only.
  statutoryPensionRefunded: '' | 'yes' | 'no' | 'not_sure';
  privateStatementChoice: '' | 'projected' | 'capital' | 'none';
  // Optional financial details shown on the second private-sector sub-step
  // when the user answered "no" on the DRV question.
  projectedMonthlyPension: string;
  capitalAmount: string;
  contractValue: string;
  estimatedMonthlyContribution: string;
}

export type ResultScenario =
  | 'eligible'
  // Figma screens 11/12/13: three private-sector result variants. The
  // decision table that picks between them is PROVISIONAL pending client
  // confirmation — see `determineResultScenario` in Results.tsx for the
  // current assignment rules. `private_review` is kept as an alias that
  // routes to the "individual assessment required" variant.
  | 'private_may_be_possible' // Figma screen 11 — green check
  | 'private_individual_assessment' // Figma screen 12 — clock (catch-all)
  | 'private_appears_unlikely' // Figma screen 13 — warning
  | 'private_review' // legacy alias for `private_individual_assessment`
  | 'not_eligible_vesting'
  | 'vested'
  // Client #17/#18: Stage/Orchestra specific error screens
  | 'stage_too_short' // contribution period < 12 months
  | 'stage_waiting' // within 24-month waiting period after employment end
  // Figma screens 21/22: split-card layout shown when the user has BOTH
  // public/stage/orchestra jobs AND private-sector jobs. Each side is
  // resolved independently and displayed side-by-side.
  | 'mixed_result';

export interface QualificationData {
  contributionDuration: 'less_than_5' | '5_or_more' | '';
  lastContribution: 'less_than_2_years' | 'more_than_2_years' | '';
  nationality: string;
  currentResidence: string;
}

export interface RefundBreakdown {
  provider: string;
  amount: number;
}

export interface CalculationResult {
  totalRefund: number;
  breakdown: RefundBreakdown[];
  totalMonths: number;
}

export interface VBLFormData {
  numberOfJobs: number;
  jobs: JobData[];
  userType: string;
  dateOfBirth: string;
  currentAge: number;
  qualification?: QualificationData;
  calculationResult?: CalculationResult;
}

// Within the Job Details step, private-sector jobs have two sub-screens:
// - 'main': the shared job form (dates, sector, salary, provider, DRV Q)
// - 'optional': the statement detail screen shown when the DRV answer is "no".
//   All other sectors only ever see 'main'.
export type JobSubStep = 'main' | 'optional';

interface VBLCalculatorContextType {
  formData: VBLFormData;
  updateFormData: (data: Partial<VBLFormData>) => void;
  updateJob: (index: number, job: Partial<JobData>) => void;
  currentStep: number;
  currentJobIndex: number;
  currentJobSubStep: JobSubStep;
  setCurrentStep: (step: number) => void;
  setCurrentJobIndex: (index: number) => void;
  setCurrentJobSubStep: (subStep: JobSubStep) => void;
  completedSteps: Set<number>;
  markStepComplete: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: () => boolean;
  resetForm: () => void;
}

const VBLCalculatorContext = createContext<VBLCalculatorContextType | undefined>(undefined);

const createEmptyJob = (): JobData => ({
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  employmentType: '',
  averageMonthlyGrossSalary: '',
  germanFederalState: '',
  companyPension: '',
  supplementaryPensions: [],
  customPensionName: '',
  statutoryPensionRefunded: '',
  privateStatementChoice: '',
  projectedMonthlyPension: '',
  capitalAmount: '',
  contractValue: '',
  estimatedMonthlyContribution: '',
});

const INITIAL_FORM_DATA: VBLFormData = {
  numberOfJobs: 0,
  jobs: [],
  userType: 'insured_person',
  dateOfBirth: '',
  currentAge: 0,
};

// A private-sector job has a second sub-step when the user answered "no" to
// the DRV question. Legacy "not_sure" sessions still route through it so they
// can be completed instead of getting stuck.
const jobHasOptionalSubStep = (job: JobData | undefined): boolean => {
  if (!job || job.employmentType !== 'Private sector') return false;
  return (
    job.statutoryPensionRefunded === 'no' ||
    job.statutoryPensionRefunded === 'not_sure'
  );
};

export const VBLCalculatorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<VBLFormData>(INITIAL_FORM_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [currentJobSubStep, setCurrentJobSubStep] = useState<JobSubStep>('main');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const updateFormData = (data: Partial<VBLFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...data };

      if (data.numberOfJobs !== undefined) {
        const jobCount = data.numberOfJobs;
        const currentJobs = prev.jobs;

        if (jobCount > currentJobs.length) {
          const newJobs = Array(jobCount - currentJobs.length)
            .fill(null)
            .map(() => createEmptyJob());
          updated.jobs = [...currentJobs, ...newJobs];
        } else if (jobCount < currentJobs.length) {
          updated.jobs = currentJobs.slice(0, jobCount);
        }
      }

      return updated;
    });
  };

  const updateJob = (index: number, job: Partial<JobData>) => {
    setFormData((prev) => {
      const updatedJobs = [...prev.jobs];
      updatedJobs[index] = { ...updatedJobs[index], ...job };
      return { ...prev, jobs: updatedJobs };
    });
  };

  const markStepComplete = (step: number) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.add(step);
      return newSet;
    });
  };

  const goToNextStep = () => {
    if (currentStep === 0) {
      markStepComplete(0);
      setCurrentStep(1);
      setCurrentJobIndex(0);
      setCurrentJobSubStep('main');
      return;
    }
    if (currentStep === 1) {
      const job = formData.jobs[currentJobIndex];
      // Private + "no" → jump to the optional statement-details sub-step
      // before advancing jobs. Every other case skips straight ahead.
      if (currentJobSubStep === 'main' && jobHasOptionalSubStep(job)) {
        setCurrentJobSubStep('optional');
        return;
      }
      if (currentJobIndex < formData.numberOfJobs - 1) {
        setCurrentJobIndex(currentJobIndex + 1);
        setCurrentJobSubStep('main');
      } else {
        markStepComplete(1);
        setCurrentStep(2);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      // Return into the last job — its optional sub-step if applicable,
      // else its main form.
      const lastIndex = formData.numberOfJobs - 1;
      const lastJob = formData.jobs[lastIndex];
      setCurrentStep(1);
      setCurrentJobIndex(lastIndex);
      setCurrentJobSubStep(jobHasOptionalSubStep(lastJob) ? 'optional' : 'main');
      return;
    }
    if (currentStep === 1) {
      if (currentJobSubStep === 'optional') {
        setCurrentJobSubStep('main');
        return;
      }
      if (currentJobIndex > 0) {
        const prevIndex = currentJobIndex - 1;
        const prevJob = formData.jobs[prevIndex];
        setCurrentJobIndex(prevIndex);
        // Walk backwards into the previous job's last visible sub-step.
        setCurrentJobSubStep(jobHasOptionalSubStep(prevJob) ? 'optional' : 'main');
      } else {
        setCurrentStep(0);
      }
    }
  };

  const canProceed = (): boolean => {
    if (currentStep === 0) {
      return formData.numberOfJobs > 0;
    }

    if (currentStep === 1) {
      const job = formData.jobs[currentJobIndex];
      if (!job) return false;

      // Optional sub-step: all 4 financial fields are optional, so the user
      // may always continue. The main form's validation still had to pass
      // for the user to have reached this sub-step in the first place.
      if (currentJobSubStep === 'optional') return true;

      const hasDateFields =
        job.startMonth !== '' &&
        job.startYear !== '' &&
        job.endMonth !== '' &&
        job.endYear !== '';

      const hasEmploymentType = job.employmentType !== '';
      const hasSalary = job.averageMonthlyGrossSalary !== '';

      if (!hasDateFields || !hasEmploymentType || !hasSalary) {
        return false;
      }

      // End date must not be earlier than start date
      if (hasDateFields) {
        const startIdx = MONTHS.indexOf(job.startMonth);
        const endIdx = MONTHS.indexOf(job.endMonth);
        const startVal = parseInt(job.startYear) * 12 + startIdx;
        const endVal = parseInt(job.endYear) * 12 + endIdx;
        if (endVal < startVal) return false;
      }

      // Public Sector: requires state + company pension; if VBL, needs plan
      if (job.employmentType === 'Public sector') {
        if (job.germanFederalState === '') return false;
        if (job.companyPension === '') return false;
        if (job.companyPension === 'VBL') {
          return job.supplementaryPensions.length > 0;
        }
        return true;
      }

      // Private sector: requires company pension + DRV-refunded answer;
      // if Others, needs custom name too.
      if (job.employmentType === 'Private sector') {
        if (job.companyPension === '') return false;
        if (job.statutoryPensionRefunded === '') return false;
        if (job.companyPension === 'Other (enter manually)') {
          return job.customPensionName.trim() !== '';
        }
        return true;
      }

      // Stage/Orchestra: auto-set, always valid
      return job.supplementaryPensions.length > 0;
    }

    return true;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(0);
    setCurrentJobIndex(0);
    setCurrentJobSubStep('main');
    setCompletedSteps(new Set());
  };

  return (
    <VBLCalculatorContext.Provider
      value={{
        formData,
        updateFormData,
        updateJob,
        currentStep,
        currentJobIndex,
        currentJobSubStep,
        setCurrentStep,
        setCurrentJobIndex,
        setCurrentJobSubStep,
        completedSteps,
        markStepComplete,
        goToNextStep,
        goToPreviousStep,
        canProceed,
        resetForm,
      }}
    >
      {children}
    </VBLCalculatorContext.Provider>
  );
};

export const useVBLCalculator = () => {
  const context = useContext(VBLCalculatorContext);
  if (!context) {
    throw new Error('useVBLCalculator must be used within VBLCalculatorProvider');
  }
  return context;
};
