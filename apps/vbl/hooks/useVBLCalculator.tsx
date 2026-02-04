'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface JobData {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  employmentType: '' | 'Stage/Performing Arts' | 'Private sector' | 'Public Sector' | 'Orchestra';
  supplementaryPension: '' | 'VddB' | 'VddKO' | 'VBLklassik' | 'ZVK';
}

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

interface VBLCalculatorContextType {
  formData: VBLFormData;
  updateFormData: (data: Partial<VBLFormData>) => void;
  updateJob: (index: number, job: Partial<JobData>) => void;
  currentStep: number;
  currentJobIndex: number;
  setCurrentStep: (step: number) => void;
  setCurrentJobIndex: (index: number) => void;
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
  supplementaryPension: '',
});

const INITIAL_FORM_DATA: VBLFormData = {
  numberOfJobs: 0,
  jobs: [],
  userType: 'insured_person',
  dateOfBirth: '',
  currentAge: 0,
};

export const VBLCalculatorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<VBLFormData>(INITIAL_FORM_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
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
    } else if (currentStep === 1) {
      if (currentJobIndex < formData.numberOfJobs - 1) {
        setCurrentJobIndex(currentJobIndex + 1);
      } else {
        markStepComplete(1);
        setCurrentStep(2);
      }
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setCurrentJobIndex(formData.numberOfJobs - 1);
    } else if (currentStep === 1) {
      if (currentJobIndex > 0) {
        setCurrentJobIndex(currentJobIndex - 1);
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

      const hasDateFields =
        job.startMonth !== '' &&
        job.startYear !== '' &&
        job.endMonth !== '' &&
        job.endYear !== '';

      const hasEmploymentType = job.employmentType !== '';

      if (job.employmentType === 'Private sector') {
        return hasDateFields && hasEmploymentType;
      }

      return hasDateFields && hasEmploymentType && job.supplementaryPension !== '';
    }

    return true;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(0);
    setCurrentJobIndex(0);
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
        setCurrentStep,
        setCurrentJobIndex,
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
