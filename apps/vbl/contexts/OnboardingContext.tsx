'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for onboarding data
export interface OnboardingIdentity {
  documentFile?: File | null;
  documentPreview?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  passportNumber: string;
  nationality: string;
  placeOfBirth: string;
  passportIssueDate: string;
  passportExpiryDate: string;
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
  accountHolder: string;
  iban: string;
  accountOption: BankAccountOption;
  // For "Open free EUR account" option
  phoneNumber: string;
  phoneConsent: boolean;
  // For "Trusted third-party" option
  thirdPartyConfirmed: boolean;
}

export interface OnboardingSignature {
  signatureData?: string; // Base64 data URL for drawn signature
  signatureFile?: File | null; // Uploaded image file
  signaturePreview?: string;
  signatureType: 'draw' | 'upload' | '';
}

export interface OnboardingSuccessData {
  submissionId?: string;
  submittedAt?: string;
  drvEligibilityDate?: string;
  drvReminderSet?: boolean;
  additionalPensions?: ('BVV' | 'DRV')[];
}

export interface OnboardingData {
  // Pre-step - Pension Type Selection
  pensionType: 'public' | 'private' | '';

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

  // Backend resource IDs (tracked throughout the flow)
  userId?: string;
  claimId?: string;
  documentId?: string;
  signatureId?: string;

  // Post-submission data
  successData: OnboardingSuccessData;
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
  updateSuccessData: (updates: Partial<OnboardingSuccessData>) => void;

  // Resume from backend claim
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loadFromClaim: (claim: Record<string, any>) => void;

  // Navigation helpers
  canProceedFromStep: (step: 1 | 2 | 3) => boolean;
  canProceedFromSubStep: (subStep: SubmitDetailsSubStep) => boolean;
  getCompletedSubSteps: () => SubmitDetailsSubStep[];

  // Reset
  resetOnboarding: () => void;
}

const initialData: OnboardingData = {
  pensionType: '',
  email: '',
  authMethod: '',
  paymentCompleted: false,
  identity: {
    fullName: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    passportNumber: '',
    nationality: '',
    placeOfBirth: '',
    passportIssueDate: '',
    passportExpiryDate: '',
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
    accountHolder: '',
    iban: '',
    accountOption: 'own_iban',
    phoneNumber: '',
    phoneConsent: false,
    thirdPartyConfirmed: false,
  },
  signature: {
    signatureType: '',
  },
  successData: {},
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

  const updateSuccessData = useCallback((updates: Partial<OnboardingSuccessData>) => {
    setData((prev) => ({
      ...prev,
      successData: { ...prev.successData, ...updates },
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
        // Own IBAN: just need IBAN
        if (data.bankDetails.accountOption === 'own_iban') {
          return data.bankDetails.iban !== '';
        }
        // Open free EUR account: need phone number and consent
        if (data.bankDetails.accountOption === 'open_free_account') {
          return data.bankDetails.phoneNumber !== '' && data.bankDetails.phoneConsent;
        }
        // Trusted third-party: need account holder, IBAN, and confirmation
        if (data.bankDetails.accountOption === 'trusted_third_party') {
          return (
            data.bankDetails.accountHolder !== '' &&
            data.bankDetails.iban !== '' &&
            data.bankDetails.thirdPartyConfirmed
          );
        }
        // Add later: always valid
        if (data.bankDetails.accountOption === 'add_later') {
          return true;
        }
        return false;
      case 'signature':
        return (
          !!data.signature.signatureData ||
          !!data.signature.signatureFile
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadFromClaim = useCallback((claim: Record<string, any>) => {
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const fullName = [str(claim.firstName), str(claim.lastName)].filter(Boolean).join(' ');
    const isPaid = claim.paymentStatus === 'paid';

    setData((prev) => ({
      ...prev,
      claimId: str(claim.id),
      paymentCompleted: isPaid,
      identity: {
        ...prev.identity,
        fullName,
        firstName: str(claim.firstName),
        lastName: str(claim.lastName),
        dateOfBirth: str(claim.dateOfBirth),
        gender: (str(claim.gender) as OnboardingIdentity['gender']) || '',
        passportNumber: str(claim.passportNumber),
        nationality: str(claim.nationality),
        placeOfBirth: str(claim.placeOfBirth),
        passportIssueDate: str(claim.passportIssueDate),
        passportExpiryDate: str(claim.passportExpiryDate),
      },
      membership: {
        ...prev.membership,
        membershipNumber: str(claim.svNummer),
      },
      address: {
        streetAndNumber: str(claim.currentAddressLine1),
        postalCode: str(claim.currentPostalCode),
        city: str(claim.currentCity),
        country: str(claim.currentCountry),
      },
      bankDetails: {
        ...prev.bankDetails,
        iban: str(claim.iban),
        accountHolder: str(claim.accountHolderName),
      },
    }));

    // If payment is not completed, stay on payment step
    if (!isPaid) {
      setCurrentStep(2);
      return;
    }

    // Determine which substep to resume at based on completedSteps
    const steps = (claim.completedSteps as Record<string, boolean>) || {};
    setCurrentStep(3);
    if (steps.signDocuments) {
      setCurrentSubStep('review');
    } else if (steps.bankDetails) {
      setCurrentSubStep('signature');
    } else if (steps.currentAddress) {
      setCurrentSubStep('bank-details');
    } else if (steps.germanSocialInsurance) {
      setCurrentSubStep('address');
    } else if (steps.passportUpload) {
      setCurrentSubStep('membership');
    } else {
      setCurrentSubStep('identity');
    }
  }, []);

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
        updateSuccessData,
        loadFromClaim,
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
