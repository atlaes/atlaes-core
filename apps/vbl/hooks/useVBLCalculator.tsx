'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface JobData {
  location: string;
  employmentType: string;
  supplementaryPension: string;
  startDate: string;
  endDate: string;
  monthlyIncome: number;
}

export interface VBLFormData {
  numberOfJobs: number;
  jobs: JobData[];
  userType: string;
  dateOfBirth: string;
  currentAge: number;
}

interface VBLCalculatorContextType {
  formData: VBLFormData;
  updateFormData: (data: Partial<VBLFormData>) => void;
  updateJob: (index: number, job: Partial<JobData>) => void;
  currentStep: number;
  currentSubStep: number;
  setCurrentStep: (step: number) => void;
  setCurrentSubStep: (subStep: number) => void;
  completedSteps: Set<string>;
  markStepComplete: (stepKey: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canProceed: () => boolean;
  resetForm: () => void;
}

const VBLCalculatorContext = createContext<VBLCalculatorContextType | undefined>(undefined);

const INITIAL_FORM_DATA: VBLFormData = {
  numberOfJobs: 0,
  jobs: [],
  userType: 'insured_person',
  dateOfBirth: '',
  currentAge: 0,
};

export const VBLCalculatorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<VBLFormData>(INITIAL_FORM_DATA);
  const [currentStep, setCurrentStep] = useState(0); // 0: General Info, 1: Income, 2: Estimate
  const [currentSubStep, setCurrentSubStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const updateFormData = (data: Partial<VBLFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...data };

      // If numberOfJobs changes, update jobs array
      if (data.numberOfJobs !== undefined) {
        const jobCount = data.numberOfJobs;
        const currentJobs = prev.jobs;

        if (jobCount > currentJobs.length) {
          // Add new jobs
          const newJobs = Array(jobCount - currentJobs.length).fill(null).map(() => ({
            location: '',
            employmentType: '',
            supplementaryPension: '',
            startDate: '',
            endDate: '',
            monthlyIncome: 0,
          }));
          updated.jobs = [...currentJobs, ...newJobs];
        } else if (jobCount < currentJobs.length) {
          // Remove excess jobs
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

  const markStepComplete = (stepKey: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepKey]));
  };

  const goToNextStep = () => {
    const stepsInSection = getStepsForCurrentSection();

    if (currentSubStep < stepsInSection - 1) {
      setCurrentSubStep(currentSubStep + 1);
    } else if (currentStep < 2) {
      markStepComplete(`${currentStep}-${currentSubStep}`);
      setCurrentStep(currentStep + 1);
      setCurrentSubStep(0);
    } else {
      // Final step - calculate
      markStepComplete(`${currentStep}-${currentSubStep}`);
    }
  };

  const goToPreviousStep = () => {
    if (currentSubStep > 0) {
      setCurrentSubStep(currentSubStep - 1);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      const prevStepsInSection = getStepsForSection(currentStep - 1);
      setCurrentSubStep(prevStepsInSection - 1);
    }
  };

  const getStepsForSection = (section: number): number => {
    if (section === 0) return 4; // General Info: Jobs, Location, Type, Pension
    if (section === 1) return 2; // Income: Period, Monthly Income
    return 1; // Estimate: Results
  };

  const getStepsForCurrentSection = (): number => {
    return getStepsForSection(currentStep);
  };

  const canProceed = (): boolean => {
    // Validate current sub-step
    if (currentStep === 0 && currentSubStep === 0) {
      return formData.numberOfJobs > 0;
    }
    if (currentStep === 0 && currentSubStep === 1) {
      return formData.jobs.every(job => job.location !== '');
    }
    if (currentStep === 0 && currentSubStep === 2) {
      return formData.jobs.every(job => job.employmentType !== '');
    }
    if (currentStep === 0 && currentSubStep === 3) {
      return formData.jobs.every(job => job.supplementaryPension !== '');
    }
    if (currentStep === 1 && currentSubStep === 0) {
      return formData.jobs.every(job => job.startDate !== '' && job.endDate !== '');
    }
    if (currentStep === 1 && currentSubStep === 1) {
      return formData.jobs.every(job => job.monthlyIncome > 0);
    }
    return true;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(0);
    setCurrentSubStep(0);
    setCompletedSteps(new Set());
  };

  return (
    <VBLCalculatorContext.Provider
      value={{
        formData,
        updateFormData,
        updateJob,
        currentStep,
        currentSubStep,
        setCurrentStep,
        setCurrentSubStep,
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
