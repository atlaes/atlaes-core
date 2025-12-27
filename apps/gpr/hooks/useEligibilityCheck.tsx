'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { GERMANY } from '@/data/countries';
import apiClient from '@/lib/api';
import { GPRFormData, JobData } from '@/hooks/useGPRCalculator';

// Flow types
export type EligibilityFlowType = 'calculator' | '2-step' | '3-step';

// Types
export interface EligibilityFormData {
  citizenship: string;
  residence: string;
  lastEmploymentMonth: string;
  lastEmploymentYear: string;
  contributionDuration: 'less_than_5_years' | '5_years_or_more' | '';
  dateOfBirth: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
}

interface EligibilityContextType {
  // State
  currentStep: number;
  formData: EligibilityFormData;
  eligibilityResult: EligibilityResult | null;
  flowType: EligibilityFlowType;
  showEmailModal: boolean;
  showEmailSentModal: boolean;
  submittedEmail: string;
  isSubmittingEmail: boolean;
  emailError: string | null;

  // Actions
  setCurrentStep: (step: number) => void;
  updateFormData: (data: Partial<EligibilityFormData>) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  checkEligibility: () => EligibilityResult;
  canProceed: () => boolean;
  resetForm: () => void;
  openEmailModal: () => void;
  closeEmailModal: () => void;
  submitEmail: (email: string) => Promise<void>;
  closeEmailSentModal: () => void;
  clearEmailError: () => void;
}

const EligibilityContext = createContext<EligibilityContextType | null>(null);

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear; year >= 1950; year--) {
    years.push(year.toString());
  }
  return years;
}

const initialFormData: EligibilityFormData = {
  citizenship: '',
  residence: '',
  lastEmploymentMonth: '',
  lastEmploymentYear: '',
  contributionDuration: '',
  dateOfBirth: '',
};

interface EligibilityProviderProps {
  children: ReactNode;
  flowType?: EligibilityFlowType;
  calculatorData?: GPRFormData | null;
}

export function EligibilityProvider({
  children,
  flowType = 'calculator',
  calculatorData = null,
}: EligibilityProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EligibilityFormData>(initialFormData);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailSentModal, setShowEmailSentModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const updateFormData = useCallback((data: Partial<EligibilityFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const checkEligibility = useCallback((): EligibilityResult => {
    const reasons: string[] = [];
    let isEligible = true;

    // Check citizenship
    if (formData.citizenship === GERMANY) {
      isEligible = false;
      reasons.push('German citizens are not eligible for pension refund.');
    }

    // Check residence
    if (formData.residence === GERMANY) {
      isEligible = false;
      reasons.push('Current German residents are not eligible for pension refund.');
    }

    // Check contribution duration (only for 2-step and 3-step flows)
    if (flowType !== 'calculator' && formData.contributionDuration === '5_years_or_more') {
      isEligible = false;
      reasons.push('With 60+ months of contributions, your pension is vested and cannot be refunded.');
    }

    if (isEligible) {
      reasons.push('Based on your answers, you may be eligible for a German pension refund.');
    }

    const result: EligibilityResult = { isEligible, reasons };
    setEligibilityResult(result);
    return result;
  }, [formData, flowType]);

  const canProceed = useCallback((): boolean => {
    // Calculator flow: only citizenship step before result
    if (flowType === 'calculator') {
      if (currentStep === 0) {
        return formData.citizenship !== '' && formData.residence !== '';
      }
      return true;
    }

    // 2-step flow: citizenship -> work history -> result
    if (flowType === '2-step') {
      switch (currentStep) {
        case 0: // Citizenship (1/2)
          return formData.citizenship !== '' && formData.residence !== '';
        case 1: // Work history (2/2)
          return (
            formData.lastEmploymentMonth !== '' &&
            formData.lastEmploymentYear !== '' &&
            formData.contributionDuration !== ''
          );
        default:
          return true;
      }
    }

    // 3-step flow: citizenship -> work history -> date of birth -> result
    if (flowType === '3-step') {
      switch (currentStep) {
        case 0: // Citizenship (1/2)
          return formData.citizenship !== '' && formData.residence !== '';
        case 1: // Work history (2/2)
          return (
            formData.lastEmploymentMonth !== '' &&
            formData.lastEmploymentYear !== '' &&
            formData.contributionDuration !== ''
          );
        case 2: // Additional info (date of birth)
          return formData.dateOfBirth !== '';
        default:
          return true;
      }
    }

    return true;
  }, [currentStep, formData, flowType]);

  // Determine which step triggers the eligibility check
  const getResultStepIndex = useCallback(() => {
    switch (flowType) {
      case 'calculator': return 1; // After citizenship
      case '2-step': return 2; // After work history
      case '3-step': return 3; // After date of birth
      default: return 1;
    }
  }, [flowType]);

  const goToNextStep = useCallback(() => {
    if (!canProceed()) return;

    const resultStep = getResultStepIndex();
    // Check eligibility when moving to the result step
    if (currentStep === resultStep - 1) {
      checkEligibility();
    }

    setCurrentStep(prev => prev + 1);
  }, [canProceed, currentStep, getResultStepIndex, checkEligibility]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(0);
    setEligibilityResult(null);
    setShowEmailModal(false);
    setShowEmailSentModal(false);
    setSubmittedEmail('');
  }, []);

  const openEmailModal = useCallback(() => {
    setShowEmailModal(true);
  }, []);

  const closeEmailModal = useCallback(() => {
    setShowEmailModal(false);
  }, []);

  const submitEmail = useCallback(async (email: string) => {
    setIsSubmittingEmail(true);
    setEmailError(null);

    try {
      // Build request payload
      const requestPayload: {
        email: string;
        gprSessionData?: {
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
        };
      } = { email };

      // Include GPR session data if calculator data is available
      if (calculatorData && calculatorData.calculationResult) {
        const result = calculatorData.calculationResult;
        requestPayload.gprSessionData = {
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
          eligibilityData: {
            citizenship: formData.citizenship || undefined,
            residence: formData.residence || undefined,
            lastEmploymentMonth: formData.lastEmploymentMonth || undefined,
            lastEmploymentYear: formData.lastEmploymentYear || undefined,
            contributionDuration: formData.contributionDuration || undefined,
            dateOfBirth: formData.dateOfBirth || undefined,
            eligibilityResult: eligibilityResult || undefined,
          },
        };
      }

      await apiClient.post('/auth/magic-link/request', requestPayload);
      setSubmittedEmail(email);
      setShowEmailModal(false);
      setShowEmailSentModal(true);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send magic link. Please try again.';
      setEmailError(message);
    } finally {
      setIsSubmittingEmail(false);
    }
  }, [calculatorData, formData, eligibilityResult]);

  const clearEmailError = useCallback(() => {
    setEmailError(null);
  }, []);

  const closeEmailSentModal = useCallback(() => {
    setShowEmailSentModal(false);
  }, []);

  const value = useMemo(
    () => ({
      currentStep,
      formData,
      eligibilityResult,
      flowType,
      showEmailModal,
      showEmailSentModal,
      submittedEmail,
      isSubmittingEmail,
      emailError,
      setCurrentStep,
      updateFormData,
      goToNextStep,
      goToPreviousStep,
      checkEligibility,
      canProceed,
      resetForm,
      openEmailModal,
      closeEmailModal,
      submitEmail,
      closeEmailSentModal,
      clearEmailError,
    }),
    [
      currentStep,
      formData,
      eligibilityResult,
      flowType,
      showEmailModal,
      showEmailSentModal,
      submittedEmail,
      isSubmittingEmail,
      emailError,
      updateFormData,
      goToNextStep,
      goToPreviousStep,
      checkEligibility,
      canProceed,
      resetForm,
      openEmailModal,
      closeEmailModal,
      submitEmail,
      closeEmailSentModal,
      clearEmailError,
    ]
  );

  return (
    <EligibilityContext.Provider value={value}>
      {children}
    </EligibilityContext.Provider>
  );
}

export function useEligibilityCheck() {
  const context = useContext(EligibilityContext);
  if (!context) {
    throw new Error('useEligibilityCheck must be used within EligibilityProvider');
  }
  return context;
}
