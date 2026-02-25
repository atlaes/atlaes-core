import { create } from 'zustand';
import { ClaimStepName } from '../claims-api';

// Sidebar section structure matching the design
export interface SidebarSection {
  id: string;
  title: string;
  icon: string;
  steps: {
    name: ClaimStepName;
    label: string;
    optional?: boolean;
  }[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'personal_info',
    title: 'Personal Information',
    icon: 'user',
    steps: [
      { name: 'claimType', label: 'Claim Type' },
      { name: 'passportUpload', label: 'Passport Upload' },
      { name: 'currentAddress', label: 'Current Address' },
      { name: 'germanSocialInsurance', label: 'German Social Insurance Number', optional: true },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: 'file',
    steps: [
      { name: 'lastAddressInGermany', label: 'Last address in Germany' },
    ],
  },
  {
    id: 'payment_details',
    title: 'Payment Details',
    icon: 'credit-card',
    steps: [
      { name: 'bankDetails', label: 'Bank Details' },
    ],
  },
  {
    id: 'signature',
    title: 'Signature',
    icon: 'pen',
    steps: [
      { name: 'signDocuments', label: 'Sign Documents' },
    ],
  },
  {
    id: 'id_verification',
    title: 'ID Verification',
    icon: 'shield',
    steps: [
      { name: 'identityConfirmationForm', label: 'Identity confirmation form' },
    ],
  },
  {
    id: 'review_submit',
    title: 'Review & Submit',
    icon: 'send',
    steps: [
      { name: 'reviewInformation', label: 'Review Information' },
      { name: 'finalConfirmation', label: 'Final Confirmation' },
    ],
  },
];

// Get all step names in order
export const ALL_STEPS: ClaimStepName[] = SIDEBAR_SECTIONS.flatMap(
  section => section.steps.map(step => step.name)
);

// Step index mapping
export const STEP_INDEX: Record<ClaimStepName, number> = ALL_STEPS.reduce(
  (acc, step, index) => ({ ...acc, [step]: index }),
  {} as Record<ClaimStepName, number>
);

interface ClaimsStore {
  // Navigation state
  currentStep: ClaimStepName;
  currentSubStep: number;

  // Navigation actions
  goToStep: (step: ClaimStepName) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setSubStep: (subStep: number) => void;
  reset: () => void;

  // Initialize from first incomplete step
  initializeFromClaim: (completedSteps: Record<ClaimStepName, boolean>) => void;
}

export const useClaimsStore = create<ClaimsStore>((set, get) => ({
  currentStep: 'claimType',
  currentSubStep: 0,

  goToStep: (step) => set({ currentStep: step, currentSubStep: 0 }),

  goToNextStep: () => {
    const idx = STEP_INDEX[get().currentStep];
    if (idx < ALL_STEPS.length - 1) {
      set({ currentStep: ALL_STEPS[idx + 1], currentSubStep: 0 });
    }
  },

  goToPreviousStep: () => {
    const idx = STEP_INDEX[get().currentStep];
    if (idx > 0) {
      set({ currentStep: ALL_STEPS[idx - 1], currentSubStep: 0 });
    }
  },

  setSubStep: (subStep) => set({ currentSubStep: subStep }),

  reset: () => set({ currentStep: 'claimType', currentSubStep: 0 }),

  initializeFromClaim: (completedSteps) => {
    const firstIncomplete = ALL_STEPS.find(step => !completedSteps[step]);
    if (firstIncomplete) {
      set({ currentStep: firstIncomplete, currentSubStep: 0 });
    }
  },
}));
