'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// Constants
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SECTORS = [
  { value: 'private', label: 'Private Sector' },
  { value: 'public', label: 'Public Sector' },
  { value: 'stage', label: 'Stage / Performing Arts' },
  { value: 'orchestra', label: 'Orchestra Musician' },
  { value: 'artist', label: 'Artist / Creative (KSK)' },
  { value: 'freelance', label: 'Freelance (voluntary DRV)' },
];

export const STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin (West)',
  'Berlin (East)',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia'
];

export const PENSION_PROVIDERS: Record<string, string[]> = {
  private: ['BVV', 'Other'],
  public: ['VBLklassik', 'VBLextra', 'ZVK'],
  stage: ['VddB', 'Other'],
  orchestra: ['VddKO', 'Other'],
  artist: ['KSK', 'Other'],
  freelance: ['DRV voluntary', 'Other'],
};

// Generate years from 1970 to current year
export const getYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 1970; year--) {
    years.push(year);
  }
  return years;
};

// Types
export interface JobData {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  monthlySalary: number;
  sector: string;
  state: string;
  supplementaryPension: string;
}

export interface GPRCalculationResult {
  isEligible: boolean;
  statePensionRefund: number;
  supplementaryRefund: number;
  totalRefund: number;
  totalMonthsContributed: number;
  details: {
    drvEligible: boolean;
    drvReason: string;
    supplementaryEligible: boolean;
    supplementaryReason: string;
  };
}

export interface GPRFormData {
  numberOfJobs: number;
  jobs: JobData[];
  calculationResult: GPRCalculationResult | null;
}

interface GPRCalculatorContextType {
  formData: GPRFormData;
  currentStep: number;
  currentJobIndex: number;
  completedSteps: Set<number>;
  updateFormData: (data: Partial<GPRFormData>) => void;
  updateJob: (index: number, data: Partial<JobData>) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToNextJob: () => void;
  goToPreviousJob: () => void;
  canProceed: () => boolean;
  setCalculationResult: (result: GPRCalculationResult) => void;
  resetCalculator: () => void;
}

const createEmptyJob = (): JobData => ({
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  monthlySalary: 0,
  sector: '',
  state: '',
  supplementaryPension: '',
});

const initialFormData: GPRFormData = {
  numberOfJobs: 0,
  jobs: [],
  calculationResult: null,
};

const GPRCalculatorContext = createContext<GPRCalculatorContextType | undefined>(undefined);

export const useGPRCalculator = () => {
  const context = useContext(GPRCalculatorContext);
  if (!context) {
    throw new Error('useGPRCalculator must be used within a GPRCalculatorProvider');
  }
  return context;
};

export const GPRCalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<GPRFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0); // 0: JobCount, 1: JobDetails, 2: Results
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const updateFormData = useCallback((data: Partial<GPRFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...data };

      // If numberOfJobs changed, adjust the jobs array
      if (data.numberOfJobs !== undefined && data.numberOfJobs !== prev.numberOfJobs) {
        const currentJobs = [...prev.jobs];
        const newCount = data.numberOfJobs;

        if (newCount > currentJobs.length) {
          // Add new empty jobs
          while (currentJobs.length < newCount) {
            currentJobs.push(createEmptyJob());
          }
        } else if (newCount < currentJobs.length) {
          // Remove extra jobs
          currentJobs.splice(newCount);
        }

        updated.jobs = currentJobs;
      }

      return updated;
    });
  }, []);

  const updateJob = useCallback((index: number, data: Partial<JobData>) => {
    setFormData(prev => {
      const jobs = [...prev.jobs];
      if (jobs[index]) {
        jobs[index] = { ...jobs[index], ...data };
      }
      return { ...prev, jobs };
    });
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // JobCount
        return formData.numberOfJobs > 0;

      case 1: // JobDetails
        const job = formData.jobs[currentJobIndex];
        if (!job) return false;

        const hasRequiredFields =
          job.startMonth !== '' &&
          job.startYear !== '' &&
          job.endMonth !== '' &&
          job.endYear !== '' &&
          job.monthlySalary > 0 &&
          job.sector !== '';

        // State is required for public sector
        if (job.sector === 'public' && job.state === '') {
          return false;
        }

        // Validate that end date is after start date
        if (hasRequiredFields) {
          const startMonthIndex = MONTHS.indexOf(job.startMonth);
          const endMonthIndex = MONTHS.indexOf(job.endMonth);
          const startYear = parseInt(job.startYear);
          const endYear = parseInt(job.endYear);

          const startValue = startYear * 12 + startMonthIndex;
          const endValue = endYear * 12 + endMonthIndex;

          if (endValue < startValue) {
            return false;
          }
        }

        return hasRequiredFields;

      case 2: // Results
        return true;

      default:
        return false;
    }
  }, [currentStep, currentJobIndex, formData]);

  const goToNextStep = useCallback(() => {
    if (!canProceed()) return;

    setCompletedSteps(prev => new Set([...Array.from(prev), currentStep]));

    if (currentStep === 0) {
      setCurrentStep(1);
      setCurrentJobIndex(0);
    } else if (currentStep === 1) {
      // Check if we're on the last job
      if (currentJobIndex >= formData.numberOfJobs - 1) {
        setCurrentStep(2);
      }
    }
  }, [currentStep, currentJobIndex, formData.numberOfJobs, canProceed]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep === 1 && currentJobIndex === 0) {
      setCurrentStep(0);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setCurrentJobIndex(formData.numberOfJobs - 1);
    }
  }, [currentStep, currentJobIndex, formData.numberOfJobs]);

  const goToNextJob = useCallback(() => {
    if (!canProceed()) return;

    if (currentJobIndex < formData.numberOfJobs - 1) {
      setCurrentJobIndex(prev => prev + 1);
    } else {
      // Last job, go to results
      setCompletedSteps(prev => new Set([...Array.from(prev), 1]));
      setCurrentStep(2);
    }
  }, [currentJobIndex, formData.numberOfJobs, canProceed]);

  const goToPreviousJob = useCallback(() => {
    if (currentJobIndex > 0) {
      setCurrentJobIndex(prev => prev - 1);
    } else {
      // First job, go back to job count
      setCurrentStep(0);
    }
  }, [currentJobIndex]);

  const setCalculationResult = useCallback((result: GPRCalculationResult) => {
    setFormData(prev => ({ ...prev, calculationResult: result }));
    setCompletedSteps(prev => new Set([...Array.from(prev), 2]));
  }, []);

  const resetCalculator = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(0);
    setCurrentJobIndex(0);
    setCompletedSteps(new Set());
  }, []);

  const value: GPRCalculatorContextType = {
    formData,
    currentStep,
    currentJobIndex,
    completedSteps,
    updateFormData,
    updateJob,
    goToNextStep,
    goToPreviousStep,
    goToNextJob,
    goToPreviousJob,
    canProceed,
    setCalculationResult,
    resetCalculator,
  };

  return (
    <GPRCalculatorContext.Provider value={value}>
      {children}
    </GPRCalculatorContext.Provider>
  );
};
