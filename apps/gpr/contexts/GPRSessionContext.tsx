'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { GPRFormData, GPRCalculationResult, JobData } from '@/hooks/useGPRCalculator';
import { EligibilityFormData, EligibilityResult } from '@/hooks/useEligibilityCheck';
import apiClient from '@/lib/api';

// Session data structure matching the backend API
export interface GPRSessionData {
  calculatorData: {
    numberOfJobs: number;
    jobs: JobData[];
    calculationResult: {
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
    };
  };
  eligibilityData?: {
    citizenship?: string;
    residence?: string;
    lastEmploymentMonth?: string;
    lastEmploymentYear?: string;
    contributionDuration?: string;
    dateOfBirth?: string;
    eligibilityResult?: EligibilityResult;
  };
}

interface GPRSessionContextType {
  // Stored data
  calculatorData: GPRFormData | null;
  eligibilityData: EligibilityFormData | null;

  // Actions
  setCalculatorData: (data: GPRFormData) => void;
  setEligibilityData: (data: EligibilityFormData) => void;

  // Session management
  getSessionData: () => GPRSessionData | null;
  hasValidSession: () => boolean;
  clearSession: () => void;
}

const GPRSessionContext = createContext<GPRSessionContextType | null>(null);

interface GPRSessionProviderProps {
  children: ReactNode;
  initialCalculatorData?: GPRFormData | null;
}

export function GPRSessionProvider({
  children,
  initialCalculatorData = null,
}: GPRSessionProviderProps) {
  const [calculatorData, setCalculatorDataState] = useState<GPRFormData | null>(
    initialCalculatorData
  );
  const [eligibilityData, setEligibilityDataState] = useState<EligibilityFormData | null>(null);

  const setCalculatorData = useCallback((data: GPRFormData) => {
    setCalculatorDataState(data);
  }, []);

  const setEligibilityData = useCallback((data: EligibilityFormData) => {
    setEligibilityDataState(data);
  }, []);

  const hasValidSession = useCallback((): boolean => {
    return (
      calculatorData !== null &&
      calculatorData.calculationResult !== null &&
      calculatorData.jobs.length > 0
    );
  }, [calculatorData]);

  const getSessionData = useCallback((): GPRSessionData | null => {
    if (!calculatorData || !calculatorData.calculationResult) {
      return null;
    }

    const result = calculatorData.calculationResult;

    return {
      calculatorData: {
        numberOfJobs: calculatorData.numberOfJobs,
        jobs: calculatorData.jobs,
        calculationResult: {
          statePensionRefund: result.statePensionRefund,
          supplementaryRefund: result.supplementaryRefund,
          totalRefund: result.totalRefund,
          totalMonthsContributed: result.totalMonthsContributed,
          details: result.details,
        },
      },
      eligibilityData: eligibilityData
        ? {
            citizenship: eligibilityData.citizenship || undefined,
            residence: eligibilityData.residence || undefined,
            lastEmploymentMonth: eligibilityData.lastEmploymentMonth || undefined,
            lastEmploymentYear: eligibilityData.lastEmploymentYear || undefined,
            contributionDuration: eligibilityData.contributionDuration || undefined,
            dateOfBirth: eligibilityData.dateOfBirth || undefined,
          }
        : undefined,
    };
  }, [calculatorData, eligibilityData]);

  const clearSession = useCallback(() => {
    setCalculatorDataState(null);
    setEligibilityDataState(null);
  }, []);

  const value = useMemo(
    () => ({
      calculatorData,
      eligibilityData,
      setCalculatorData,
      setEligibilityData,
      getSessionData,
      hasValidSession,
      clearSession,
    }),
    [
      calculatorData,
      eligibilityData,
      setCalculatorData,
      setEligibilityData,
      getSessionData,
      hasValidSession,
      clearSession,
    ]
  );

  return (
    <GPRSessionContext.Provider value={value}>
      {children}
    </GPRSessionContext.Provider>
  );
}

export function useGPRSession() {
  const context = useContext(GPRSessionContext);
  if (!context) {
    throw new Error('useGPRSession must be used within GPRSessionProvider');
  }
  return context;
}

// Optional hook that returns null instead of throwing if not in provider
export function useOptionalGPRSession() {
  return useContext(GPRSessionContext);
}
