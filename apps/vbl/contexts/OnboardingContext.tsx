'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for onboarding data
export interface OnboardingIdentity {
  documentFile?: File | null;
  documentPreview?: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
}

export interface OnboardingMembership {
  pensionProvider: 'VBL' | 'ZVK' | 'KVBW' | 'VddB' | 'VddKO' | '';
  membershipNumber: string;
}

export interface OnboardingAddress {
  streetAndNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

export type BankAccountOption = 'own_iban' | 'open_free_account' | 'trusted_third_party' | 'add_later';

export interface OnboardingBankDetails {
  iban: string;
  accountOption: BankAccountOption;
}

export interface OnboardingSignature {
  signatureData?: string; // Base64 data URL for drawn signature
  signatureFile?: File | null; // Uploaded image file
  signaturePreview?: string;
  signatureType: 'draw' | 'upload' | '';
}

export interface OnboardingData {
  // Step 1 - Account
  email: string;
  authMethod: 'email' | 'google' | 'apple' | '';

  // Step 2 - Payment
  paymentCompleted: boolean;
  paymentReference?: string;

  // Step 3 - Submit Details
  identity: OnboardingIdentity;
  membership: OnboardingMembership;
  address: OnboardingAddress;
  bankDetails: OnboardingBankDetails;
  signature: OnboardingSignature;
}

// Sub-steps for Step 3
export type SubmitDetailsSubStep =
  | 'identity'
  | 'membership'
  | 'address'
  | 'bank-details'
  | 'signature'
  | 'review';

export const SUBMIT_DETAILS_SUBSTEPS: { id: SubmitDetailsSubStep; label: string; icon: string }[] = [
  { id: 'identity', label: 'Identity', icon: 'user' },
  { id: 'membership', label: 'Membership', icon: 'card' },
  { id: 'address', label: 'Address', icon: 'location' },
  { id: 'bank-details', label: 'Bank Details', icon: 'bank' },
  { id: 'signature', label: 'Signature', icon: 'pen' },
  { id: 'review', label: 'Review & Submit', icon: 'document' },
];

interface OnboardingContextType {
  // Current step state
  currentStep: 1 | 2 | 3;
  currentSubStep: SubmitDetailsSubStep;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setCurrentSubStep: (subStep: SubmitDetailsSubStep) => void;

  // Form data
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  updateIdentity: (updates: Partial<OnboardingIdentity>) => void;
  updateMembership: (updates: Partial<OnboardingMembership>) => void;
  updateAddress: (updates: Partial<OnboardingAddress>) => void;
  updateBankDetails: (updates: Partial<OnboardingBankDetails>) => void;
  updateSignature: (updates: Partial<OnboardingSignature>) => void;

  // Navigation helpers
  canProceedFromStep: (step: 1 | 2 | 3) => boolean;
  canProceedFromSubStep: (subStep: SubmitDetailsSubStep) => boolean;
  getCompletedSubSteps: () => SubmitDetailsSubStep[];

  // Reset
  resetOnboarding: () => void;
}

const initialData: OnboardingData = {
  email: '',
  authMethod: '',
  paymentCompleted: false,
  identity: {
    fullName: '',
    dateOfBirth: '',
    gender: '',
  },
  membership: {
    pensionProvider: '',
    membershipNumber: '',
  },
  address: {
    streetAndNumber: '',
    postalCode: '',
    city: '',
    country: '',
  },
  bankDetails: {
    iban: '',
    accountOption: 'own_iban',
  },
  signature: {
    signatureType: '',
  },
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [currentSubStep, setCurrentSubStep] = useState<SubmitDetailsSubStep>('identity');
  const [data, setData] = useState<OnboardingData>(initialData);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateIdentity = useCallback((updates: Partial<OnboardingIdentity>) => {
    setData((prev) => ({
      ...prev,
      identity: { ...prev.identity, ...updates },
    }));
  }, []);

  const updateMembership = useCallback((updates: Partial<OnboardingMembership>) => {
    setData((prev) => ({
      ...prev,
      membership: { ...prev.membership, ...updates },
    }));
  }, []);

  const updateAddress = useCallback((updates: Partial<OnboardingAddress>) => {
    setData((prev) => ({
      ...prev,
      address: { ...prev.address, ...updates },
    }));
  }, []);

  const updateBankDetails = useCallback((updates: Partial<OnboardingBankDetails>) => {
    setData((prev) => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, ...updates },
    }));
  }, []);

  const updateSignature = useCallback((updates: Partial<OnboardingSignature>) => {
    setData((prev) => ({
      ...prev,
      signature: { ...prev.signature, ...updates },
    }));
  }, []);

  const canProceedFromStep = useCallback((step: 1 | 2 | 3): boolean => {
    switch (step) {
      case 1:
        return data.email !== '' && data.authMethod !== '';
      case 2:
        return data.paymentCompleted;
      case 3:
        // All sub-steps must be complete
        return (
          data.identity.fullName !== '' &&
          data.identity.dateOfBirth !== '' &&
          data.membership.pensionProvider !== '' &&
          data.address.streetAndNumber !== '' &&
          data.address.city !== '' &&
          data.address.country !== '' &&
          (data.bankDetails.iban !== '' || data.bankDetails.accountOption !== 'own_iban') &&
          (data.signature.signatureData !== undefined || data.signature.signatureFile !== null)
        );
      default:
        return false;
    }
  }, [data]);

  const canProceedFromSubStep = useCallback((subStep: SubmitDetailsSubStep): boolean => {
    switch (subStep) {
      case 'identity':
        return (
          data.identity.fullName !== '' &&
          data.identity.dateOfBirth !== '' &&
          data.identity.gender !== ''
        );
      case 'membership':
        return data.membership.pensionProvider !== '';
      case 'address':
        return (
          data.address.streetAndNumber !== '' &&
          data.address.postalCode !== '' &&
          data.address.city !== '' &&
          data.address.country !== ''
        );
      case 'bank-details':
        return (
          data.bankDetails.iban !== '' ||
          data.bankDetails.accountOption === 'open_free_account' ||
          data.bankDetails.accountOption === 'trusted_third_party' ||
          data.bankDetails.accountOption === 'add_later'
        );
      case 'signature':
        return (
          data.signature.signatureData !== undefined ||
          data.signature.signatureFile !== null
        );
      case 'review':
        return true; // Review page is always valid
      default:
        return false;
    }
  }, [data]);

  const getCompletedSubSteps = useCallback((): SubmitDetailsSubStep[] => {
    const completed: SubmitDetailsSubStep[] = [];
    SUBMIT_DETAILS_SUBSTEPS.forEach(({ id }) => {
      if (canProceedFromSubStep(id)) {
        completed.push(id);
      }
    });
    return completed;
  }, [canProceedFromSubStep]);

  const resetOnboarding = useCallback(() => {
    setCurrentStep(1);
    setCurrentSubStep('identity');
    setData(initialData);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        currentSubStep,
        setCurrentStep,
        setCurrentSubStep,
        data,
        updateData,
        updateIdentity,
        updateMembership,
        updateAddress,
        updateBankDetails,
        updateSignature,
        canProceedFromStep,
        canProceedFromSubStep,
        getCompletedSubSteps,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
