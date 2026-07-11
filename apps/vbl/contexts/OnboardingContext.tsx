'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  loadOnboardingState,
  saveOnboardingState,
  clearOnboardingState,
  toPersistedOnboardingData,
} from '@/lib/flow-persistence';

// Types for onboarding data
export interface OnboardingIdentity {
  documentFile?: File | null;
  documentPreview?: string;
  firstName: string;
  // Task 6: optional, never required — the middle-name field is never
  // subject to the missing-field red-highlight treatment.
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | '';
  passportNumber: string;
  nationality: string;
  placeOfBirth: string;
  passportIssueDate: string;
  passportExpiryDate: string;
}

// Stage / orchestra (VddB / VddKO) membership requires an additional
// sub-form with employment, leaving, and current-occupation details.
// These fields only apply when pensionProvider === 'VddB' || 'VddKO'.
export interface OnboardingStageDetails {
  stageName: string;
  rolePosition: string;
  employmentEndDate: string;
  permanentlyStopped: 'yes' | 'no' | '';
  reasonForLeaving: string;
  reasonForLeavingOther: string;
  currentOccupation: string;
  unableToWorkHealth: 'yes' | 'no' | '';
}

export interface OnboardingMembership {
  // Client #12: this field accepts any calculator provider label (including
  // state-specific ZVKs like "Bayerische ZVK" or "ZVK Darmstadt"), so the
  // value selected in the calculator can be carried over and locked here
  // without mapping through a narrow enum.
  pensionProvider: string;
  membershipNumber: string;
  stageDetails: OnboardingStageDetails;
}

export interface OnboardingAddress {
  streetAndNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

// Task 15: Health Insurance substep — bAV/private pension type only (see
// design-index.md: the Eligibility folder's shared VBL/ZVK/VddB/VddKO
// review accordion has no Health insurance section, so this only applies
// to the Private-Flow / bAV cash-out journey).
export type HealthInsuranceType = 'statutory' | 'private' | 'not_sure' | '';

export interface OnboardingHealthInsurance {
  documentFile?: File | null;
  documentPreview?: string;
  documentFileName?: string;
  // Backend document ID (mirrors data.documentId for identity), tracked
  // per-substep here since a bAV claimant uploads two separate documents
  // (passport + health insurance) with distinct claim_documents roles.
  documentId?: string;
  type: HealthInsuranceType;
  providerName: string;
  providerAddress: string;
  insuredSinceMonth: string;
  insuredSinceYear: string;
  placeOfBirth: string;
  countryOfBirth: string;
  insuranceNumber: string;
}

export type BankAccountOption =
  | 'own_iban'
  | 'open_free_account'
  | 'trusted_third_party';

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
  legalConfirmed: boolean;
}

// Confirm step (public VBL/ZVK + stage VddB/VddKO claims only — NOT bAV/
// private). Inserted between Review and Signature. The four Section-1 answers
// all default to 'no'; changing any to 'yes' stops the refund application.
// The eight Section-2/3 declarations + authorizations must all be checked to
// continue. See ConfirmStep.tsx and isConfirmComplete below.
export interface OnboardingConfirm {
  // Section 1 — Your answers (all default 'no'; any 'yes' stops the flow)
  publicSectorAfterEnd: 'yes' | 'no';
  otherInstitutionInsurance: 'yes' | 'no';
  previousRefund: 'yes' | 'no';
  laterCivilServant: 'yes' | 'no';
  // Section 2 — Important declarations (all required)
  declarationAccurate: boolean;
  declarationRequestRefund: boolean;
  declarationRightsEnd: boolean;
  declarationNoRepayment: boolean;
  declarationNoWithdrawal: boolean;
  // Section 3 — CompanyPension authorization (all required)
  authorizeComplete: boolean;
  authorizeSignature: boolean;
  authorizeCorrespondence: boolean;
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
  healthInsurance: OnboardingHealthInsurance;
  bankDetails: OnboardingBankDetails;
  signature: OnboardingSignature;
  confirm: OnboardingConfirm;

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
  | 'health-insurance'
  | 'bank-details'
  | 'signature'
  | 'review'
  | 'confirm';

// Base (unfiltered) list of sub-steps. Kept for backward compatibility with
// the legacy calculator onboarding flow (components/vbl/onboarding/
// OnboardingFlow.tsx + OnboardingLayout.tsx), which does not have a Health
// Insurance step. The get-started flow (GetStartedOnboardingFlow.tsx +
// GetStartedLayout.tsx) uses getSubmitDetailsSubsteps(pensionType) below,
// which conditionally inserts 'health-insurance' after 'address'.
export const SUBMIT_DETAILS_SUBSTEPS: {
  id: SubmitDetailsSubStep;
  label: string;
  icon: string;
}[] = [
  { id: 'identity', label: 'Identity', icon: 'user' },
  { id: 'membership', label: 'Pension Details', icon: 'card' },
  { id: 'address', label: 'Address', icon: 'location' },
  { id: 'bank-details', label: 'Bank Details', icon: 'bank' },
  { id: 'signature', label: 'Signature', icon: 'pen' },
  { id: 'review', label: 'Review & Submit', icon: 'document' },
];

const HEALTH_INSURANCE_SUBSTEP: {
  id: SubmitDetailsSubStep;
  label: string;
  icon: string;
} = { id: 'health-insurance', label: 'Health Insurance', icon: 'health' };

// Confirm substep — public (VBL/ZVK) and stage (VddB/VddKO) claims only.
// Inserted between Review and Signature so the sub-stepper reads
// Identity → Pension Details → Address → Bank Details → Review → Confirm →
// Signature. Deliberately NOT added to the base SUBMIT_DETAILS_SUBSTEPS list
// (that list is still consumed unchanged by the legacy calculator onboarding
// flow, which has no Confirm screen).
const CONFIRM_SUBSTEP: {
  id: SubmitDetailsSubStep;
  label: string;
  icon: string;
} = { id: 'confirm', label: 'Confirm', icon: 'confirm' };

function findSubstep(id: SubmitDetailsSubStep) {
  const found = SUBMIT_DETAILS_SUBSTEPS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Unknown submit-details substep: ${id}`);
  }
  return found;
}

// Task 15: Health Insurance is gated to the bAV/private pension type only.
// Confirm (this task) is gated to the public/stage pension types only. The
// two features are mutually exclusive by pension type, so getSubmitDetailsSubsteps
// branches once on `private`:
//   - private/bAV: insert Health Insurance after Address, keep the legacy
//     Signature → Review tail (Review is the terminal submit step). No Confirm.
//   - public + stage: no Health Insurance; reorder the tail to
//     Review → Confirm → Signature, with Signature as the terminal submit step.
export function getSubmitDetailsSubsteps(
  pensionType: OnboardingData['pensionType']
): typeof SUBMIT_DETAILS_SUBSTEPS {
  if (pensionType === 'private') {
    const addressIndex = SUBMIT_DETAILS_SUBSTEPS.findIndex(
      (s) => s.id === 'address'
    );
    return [
      ...SUBMIT_DETAILS_SUBSTEPS.slice(0, addressIndex + 1),
      HEALTH_INSURANCE_SUBSTEP,
      ...SUBMIT_DETAILS_SUBSTEPS.slice(addressIndex + 1),
    ];
  }

  return [
    findSubstep('identity'),
    findSubstep('membership'),
    findSubstep('address'),
    findSubstep('bank-details'),
    // Review comes before Confirm/Signature here (unlike the base list's
    // Signature → Review order). The 'Review & Submit' tab label is kept
    // as-is (the onboarding e2e spec asserts it verbatim) even though the
    // terminal submit now happens on the Signature step in this flow.
    findSubstep('review'),
    CONFIRM_SUBSTEP,
    findSubstep('signature'),
  ];
}

interface OnboardingContextType {
  // Current step state
  currentStep: 1 | 2 | 3;
  currentSubStep: SubmitDetailsSubStep;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setCurrentSubStep: (subStep: SubmitDetailsSubStep) => void;

  // Client #16: track "editing from review" mode so that when the user
  // jumps out of the review screen to edit a field, the next Continue
  // returns them directly to review instead of re-walking the wizard.
  editingFromReview: boolean;
  setEditingFromReview: (v: boolean) => void;

  // Form data
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  updateIdentity: (updates: Partial<OnboardingIdentity>) => void;
  updateMembership: (updates: Partial<OnboardingMembership>) => void;
  updateStageDetails: (updates: Partial<OnboardingStageDetails>) => void;
  updateAddress: (updates: Partial<OnboardingAddress>) => void;
  updateHealthInsurance: (updates: Partial<OnboardingHealthInsurance>) => void;
  updateBankDetails: (updates: Partial<OnboardingBankDetails>) => void;
  updateSignature: (updates: Partial<OnboardingSignature>) => void;
  updateConfirm: (updates: Partial<OnboardingConfirm>) => void;
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
    firstName: '',
    middleName: '',
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
    stageDetails: {
      stageName: '',
      rolePosition: '',
      employmentEndDate: '',
      permanentlyStopped: '',
      reasonForLeaving: '',
      reasonForLeavingOther: '',
      currentOccupation: '',
      unableToWorkHealth: '',
    },
  },
  address: {
    streetAndNumber: '',
    postalCode: '',
    city: '',
    country: '',
  },
  healthInsurance: {
    type: '',
    providerName: '',
    providerAddress: '',
    insuredSinceMonth: '',
    insuredSinceYear: '',
    placeOfBirth: '',
    countryOfBirth: '',
    insuranceNumber: '',
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
    legalConfirmed: false,
  },
  confirm: {
    publicSectorAfterEnd: 'no',
    otherInstitutionInsurance: 'no',
    previousRefund: 'no',
    laterCivilServant: 'no',
    declarationAccurate: false,
    declarationRequestRefund: false,
    declarationRightsEnd: false,
    declarationNoRepayment: false,
    declarationNoWithdrawal: false,
    authorizeComplete: false,
    authorizeSignature: false,
    authorizeCorrespondence: false,
  },
  successData: {},
};

// The four Section-1 answers that, if 'yes', stop the refund application.
export const CONFIRM_STOP_ANSWER_KEYS = [
  'publicSectorAfterEnd',
  'otherInstitutionInsurance',
  'previousRefund',
  'laterCivilServant',
] as const;

// Confirm step is complete (Continue to signature enabled) only when all four
// Section-1 answers are 'no' AND all eight declaration/authorization
// checkboxes are checked. Shared by canProceedFromSubStep and ConfirmStep.
export function isConfirmComplete(confirm: OnboardingConfirm): boolean {
  const allAnswersNo = CONFIRM_STOP_ANSWER_KEYS.every(
    (key) => confirm[key] === 'no'
  );
  const allChecked =
    confirm.declarationAccurate &&
    confirm.declarationRequestRefund &&
    confirm.declarationRightsEnd &&
    confirm.declarationNoRepayment &&
    confirm.declarationNoWithdrawal &&
    confirm.authorizeComplete &&
    confirm.authorizeSignature &&
    confirm.authorizeCorrespondence;
  return allAnswersNo && allChecked;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

function isAtLeast18(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayThisYear = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      birthDate.getUTCMonth(),
      birthDate.getUTCDate()
    )
  );
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  if (todayUtc < birthdayThisYear) {
    age -= 1;
  }

  return age >= 18;
}

// Task 15 / ReviewSubmit incomplete-state rule: complete once a type is
// chosen AND either a document was uploaded or a provider name was entered
// (manually or via OCR). Used by both canProceedFromStep (step 3 overall
// gate) and canProceedFromSubStep so the review screen and the substep gate
// agree. Only ever consulted for private/bAV claimants — see
// getSubmitDetailsSubsteps.
function isHealthInsuranceComplete(
  healthInsurance: OnboardingHealthInsurance
): boolean {
  return (
    healthInsurance.type !== '' &&
    (!!healthInsurance.documentFile ||
      !!healthInsurance.documentId ||
      healthInsurance.providerName.trim() !== '')
  );
}

export function OnboardingProvider({
  children,
  // Final review fix (IMPORTANT 4): OnboardingProvider is also mounted by
  // the legacy /calculator/onboarding and /calculator-entry-a pages (see
  // components/vbl/onboarding/OnboardingFlow.tsx consumers), which have no
  // notion of the get-started flow's sessionStorage-backed persistence and
  // were unconditionally restoring from / write-through-persisting to the
  // shared vbl_onboarding_v1 key — cross-contaminating state between the
  // legacy calculator flow and the get-started flow whenever both were used
  // in the same browser. Persistence now defaults OFF; only
  // app/get-started/page.tsx opts in. When disabled, restore, write-through,
  // and the empty-state clear are all fully inert — this provider behaves
  // exactly as it did before Task 13's sessionStorage persistence existed.
  persistenceEnabled = false,
}: {
  children: ReactNode;
  persistenceEnabled?: boolean;
}) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [currentSubStep, setCurrentSubStep] =
    useState<SubmitDetailsSubStep>('identity');
  const [data, setData] = useState<OnboardingData>(initialData);
  const [editingFromReview, setEditingFromReview] = useState(false);

  // Restore position + pre-claim data from sessionStorage on mount.
  //
  // Precedence (see lib/flow-persistence.ts for the full rationale): the
  // backend claim resume path (loadFromClaim, triggered from
  // GetStartedOnboardingFlow's "resume draft" effect once `user` and
  // `vbl_draft_claimId` are available) always wins over this sessionStorage
  // restore for the fields it covers, because it runs in a *later* effect
  // (it depends on `user`, which is only set once auth resolves — after
  // this mount-time restore has already applied) and its setData calls are
  // shallow-merged on top of whatever this restore already applied. This
  // restore's job is solely to cover the gap loadFromClaim can't: position
  // and data *before* a claim exists (pre-payment) and anything
  // loadFromClaim doesn't own (e.g. membership.stageDetails, which has no
  // backend column at all).
  //
  // `hasRestored` is state (not a ref) so the write-through effect below —
  // declared after this one — only ever observes "restored" on a render
  // where `data`/`currentStep`/`currentSubStep` already reflect the
  // restored values (see the equivalent comment in EligibilityContext for
  // why a ref would race this). When persistence is disabled, we still flip
  // `hasRestored` to true (there's nothing to wait for) but never touch
  // sessionStorage.
  const [hasRestored, setHasRestored] = useState(false);
  useEffect(() => {
    if (!persistenceEnabled) {
      setHasRestored(true);
      return;
    }

    const persisted = loadOnboardingState();
    if (!persisted) {
      setHasRestored(true);
      return;
    }

    setCurrentStep(persisted.currentStep);
    setCurrentSubStep(persisted.currentSubStep);
    setData((prev) => ({
      ...prev,
      ...persisted.data,
      identity: { ...prev.identity, ...persisted.data.identity },
      membership: persisted.data.membership,
      address: persisted.data.address,
      healthInsurance: {
        ...prev.healthInsurance,
        ...persisted.data.healthInsurance,
      },
      bankDetails: persisted.data.bankDetails,
      signature: { ...prev.signature, ...persisted.data.signature },
      // `confirm` was added after the first persisted-blob shape shipped;
      // guard against older blobs that predate it.
      confirm: persisted.data.confirm
        ? { ...prev.confirm, ...persisted.data.confirm }
        : prev.confirm,
    }));
    setHasRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write-through persistence: any data/position change re-saves the whole
  // (stripped) snapshot. Skipped until restore above has settled so we
  // don't clobber a pending restore with pre-restore initial state. Also
  // fully skipped when persistence is disabled (legacy calculator flows —
  // see the persistenceEnabled prop doc above).
  //
  // Also skipped once `data.successData` has anything set. handleSubmitSuccess
  // (GetStartedOnboardingFlow.tsx) calls updateSuccessData(...) — which sets
  // `data.successData` — immediately before clearAllFlowPersistence(). Both
  // are state changes on `data`/its dependents, so without this guard this
  // effect fires again right after the clear (same render batch/next tick)
  // and re-persists the just-cleared, now-submitted blob: a refresh on the
  // success screen would then resurrect a claim that has already been
  // submitted. `successData` is only ever populated at/after submission, so
  // "has successData" is a deterministic, no-latch signal that persistence
  // is done for this run — no extra ref/flag lifecycle needed.
  useEffect(() => {
    if (!persistenceEnabled) return;
    if (!hasRestored) return;
    if (Object.keys(data.successData).length > 0) return;
    saveOnboardingState({
      currentStep,
      currentSubStep,
      data: toPersistedOnboardingData(data),
    });
  }, [persistenceEnabled, hasRestored, currentStep, currentSubStep, data]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateIdentity = useCallback((updates: Partial<OnboardingIdentity>) => {
    setData((prev) => ({
      ...prev,
      identity: { ...prev.identity, ...updates },
    }));
  }, []);

  const updateMembership = useCallback(
    (updates: Partial<OnboardingMembership>) => {
      setData((prev) => ({
        ...prev,
        membership: { ...prev.membership, ...updates },
      }));
    },
    []
  );

  const updateStageDetails = useCallback(
    (updates: Partial<OnboardingStageDetails>) => {
      setData((prev) => ({
        ...prev,
        membership: {
          ...prev.membership,
          stageDetails: { ...prev.membership.stageDetails, ...updates },
        },
      }));
    },
    []
  );

  const updateAddress = useCallback((updates: Partial<OnboardingAddress>) => {
    setData((prev) => ({
      ...prev,
      address: { ...prev.address, ...updates },
    }));
  }, []);

  const updateHealthInsurance = useCallback(
    (updates: Partial<OnboardingHealthInsurance>) => {
      setData((prev) => ({
        ...prev,
        healthInsurance: { ...prev.healthInsurance, ...updates },
      }));
    },
    []
  );

  const updateBankDetails = useCallback(
    (updates: Partial<OnboardingBankDetails>) => {
      setData((prev) => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, ...updates },
      }));
    },
    []
  );

  const updateSignature = useCallback(
    (updates: Partial<OnboardingSignature>) => {
      setData((prev) => ({
        ...prev,
        signature: { ...prev.signature, ...updates },
      }));
    },
    []
  );

  const updateConfirm = useCallback((updates: Partial<OnboardingConfirm>) => {
    setData((prev) => ({
      ...prev,
      confirm: { ...prev.confirm, ...updates },
    }));
  }, []);

  const updateSuccessData = useCallback(
    (updates: Partial<OnboardingSuccessData>) => {
      setData((prev) => ({
        ...prev,
        successData: { ...prev.successData, ...updates },
      }));
    },
    []
  );

  const canProceedFromStep = useCallback(
    (step: 1 | 2 | 3): boolean => {
      switch (step) {
        case 1:
          return data.email !== '' && data.authMethod !== '';
        case 2:
          return data.paymentCompleted;
        case 3:
          // All sub-steps must be complete
          const isStage =
            data.membership.pensionProvider === 'VddB' ||
            data.membership.pensionProvider === 'VddKO';
          const stageDetailsOk = (() => {
            const s = data.membership.stageDetails;
            const reasonOk =
              s.reasonForLeaving !== '' &&
              (s.reasonForLeaving !== 'other' ||
                s.reasonForLeavingOther.trim() !== '');
            return (
              s.stageName.trim() !== '' &&
              s.rolePosition.trim() !== '' &&
              s.employmentEndDate !== '' &&
              s.permanentlyStopped !== '' &&
              reasonOk &&
              s.currentOccupation.trim() !== '' &&
              s.unableToWorkHealth !== ''
            );
          })();
          const pensionDetailsOk =
            data.membership.pensionProvider !== '' &&
            (isStage
              ? stageDetailsOk
              : data.membership.membershipNumber.trim() !== '');
          // Health Insurance only gates step 3 completion for bAV/private
          // claimants — see getSubmitDetailsSubsteps.
          const healthInsuranceOk =
            data.pensionType !== 'private' ||
            isHealthInsuranceComplete(data.healthInsurance);
          return (
            data.identity.firstName.trim() !== '' &&
            data.identity.lastName.trim() !== '' &&
            data.identity.dateOfBirth !== '' &&
            isAtLeast18(data.identity.dateOfBirth) &&
            data.identity.gender !== '' &&
            data.identity.nationality.trim() !== '' &&
            data.identity.placeOfBirth.trim() !== '' &&
            pensionDetailsOk &&
            data.address.streetAndNumber !== '' &&
            data.address.city !== '' &&
            data.address.country !== '' &&
            healthInsuranceOk &&
            (data.bankDetails.iban !== '' ||
              data.bankDetails.accountOption !== 'own_iban') &&
            (!!data.signature.signatureData ||
              !!data.signature.signatureFile) &&
            data.signature.legalConfirmed
          );
        default:
          return false;
      }
    },
    [data]
  );

  const canProceedFromSubStep = useCallback(
    (subStep: SubmitDetailsSubStep): boolean => {
      switch (subStep) {
        case 'identity':
          return (
            data.identity.firstName.trim() !== '' &&
            data.identity.lastName.trim() !== '' &&
            data.identity.dateOfBirth !== '' &&
            isAtLeast18(data.identity.dateOfBirth) &&
            data.identity.gender !== '' &&
            data.identity.nationality.trim() !== '' &&
            data.identity.placeOfBirth.trim() !== ''
          );
        case 'membership': {
          if (data.membership.pensionProvider === '') return false;
          // Stage / orchestra providers (VddB, VddKO) require the extended
          // sub-form in addition to the membership number.
          const isStage =
            data.membership.pensionProvider === 'VddB' ||
            data.membership.pensionProvider === 'VddKO';
          if (!isStage) return data.membership.membershipNumber.trim() !== '';
          const s = data.membership.stageDetails;
          const reasonOk =
            s.reasonForLeaving !== '' &&
            (s.reasonForLeaving !== 'other' ||
              s.reasonForLeavingOther.trim() !== '');
          return (
            s.stageName.trim() !== '' &&
            s.rolePosition.trim() !== '' &&
            s.employmentEndDate !== '' &&
            s.permanentlyStopped !== '' &&
            reasonOk &&
            s.currentOccupation.trim() !== '' &&
            s.unableToWorkHealth !== ''
          );
        }
        case 'address':
          return (
            data.address.streetAndNumber !== '' &&
            data.address.postalCode !== '' &&
            data.address.city !== '' &&
            data.address.country !== ''
          );
        case 'health-insurance':
          return isHealthInsuranceComplete(data.healthInsurance);
        case 'bank-details':
          // Own IBAN: just need IBAN
          if (data.bankDetails.accountOption === 'own_iban') {
            return data.bankDetails.iban !== '';
          }
          // Open free EUR account: need phone number and consent
          if (data.bankDetails.accountOption === 'open_free_account') {
            return (
              data.bankDetails.phoneNumber !== '' &&
              data.bankDetails.phoneConsent
            );
          }
          // Trusted third-party: need account holder, IBAN, and confirmation
          if (data.bankDetails.accountOption === 'trusted_third_party') {
            return (
              data.bankDetails.accountHolder !== '' &&
              data.bankDetails.iban !== '' &&
              data.bankDetails.thirdPartyConfirmed
            );
          }
          return false;
        case 'signature':
          return (
            (!!data.signature.signatureData ||
              !!data.signature.signatureFile) &&
            data.signature.legalConfirmed
          );
        case 'review':
          return true; // Review page is always valid
        case 'confirm':
          return isConfirmComplete(data.confirm);
        default:
          return false;
      }
    },
    [data]
  );

  const getCompletedSubSteps = useCallback((): SubmitDetailsSubStep[] => {
    const completed: SubmitDetailsSubStep[] = [];
    // Iterate the flow-appropriate list (not the base SUBMIT_DETAILS_SUBSTEPS,
    // which omits 'confirm' and 'health-insurance') so Confirm can be reported
    // as completed once its gate (all answers No + all boxes checked) is met.
    getSubmitDetailsSubsteps(data.pensionType).forEach(({ id }) => {
      if (canProceedFromSubStep(id)) {
        completed.push(id);
      }
    });
    return completed;
  }, [canProceedFromSubStep, data.pensionType]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadFromClaim = useCallback((claim: Record<string, any>) => {
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    // Merge rule: the claim (backend) wins for any field where it actually
    // has a non-empty value; otherwise we KEEP whatever is already in
    // memory. That in-memory value may itself have just come from the
    // sessionStorage restore (see flow-persistence.ts precedence notes),
    // which runs synchronously on mount, before this effect (gated on
    // `user`) has a chance to fire. Without this fallback, `str(claim.field)
    // || ''` unconditionally overwrote every field with '' whenever the
    // backend simply hadn't seen that field yet, blanking out progress the
    // user had already entered pre-claim.
    const claimOrPrev = (claimVal: unknown, prevVal: string) =>
      str(claimVal) || prevVal;
    const isPaid = claim.paymentStatus === 'paid';

    setData((prev) => ({
      ...prev,
      claimId: str(claim.id) || prev.claimId,
      paymentCompleted: isPaid,
      identity: {
        ...prev.identity,
        // Task 6 known limitation: there is no middleName column on the
        // claims table, so any middle name is persisted concatenated into
        // firstName on save (see saveAndAdvance in
        // GetStartedOnboardingFlow.tsx). On load we cannot reliably tell
        // where "first" ends and "middle" began inside that stored string,
        // so — per design — we do NOT re-run whitespace-splitting here (that
        // would reintroduce the exact bug this task fixes). Instead the
        // entire stored firstName goes back into the First name field and
        // middleName is left blank; the user can manually re-split it if
        // needed.
        firstName: claimOrPrev(claim.firstName, prev.identity.firstName),
        middleName: '',
        lastName: claimOrPrev(claim.lastName, prev.identity.lastName),
        dateOfBirth: claimOrPrev(claim.dateOfBirth, prev.identity.dateOfBirth),
        gender:
          (str(claim.gender) as OnboardingIdentity['gender']) ||
          prev.identity.gender,
        passportNumber: claimOrPrev(
          claim.passportNumber,
          prev.identity.passportNumber
        ),
        nationality: claimOrPrev(claim.nationality, prev.identity.nationality),
        placeOfBirth: claimOrPrev(
          claim.placeOfBirth,
          prev.identity.placeOfBirth
        ),
        passportIssueDate: claimOrPrev(
          claim.passportIssueDate,
          prev.identity.passportIssueDate
        ),
        passportExpiryDate: claimOrPrev(
          claim.passportExpiryDate,
          prev.identity.passportExpiryDate
        ),
      },
      membership: {
        ...prev.membership,
        membershipNumber: claimOrPrev(
          claim.svNummer,
          prev.membership.membershipNumber
        ),
      },
      address: {
        ...prev.address,
        streetAndNumber: claimOrPrev(
          claim.currentAddressLine1,
          prev.address.streetAndNumber
        ),
        postalCode: claimOrPrev(
          claim.currentPostalCode,
          prev.address.postalCode
        ),
        city: claimOrPrev(claim.currentCity, prev.address.city),
        country: claimOrPrev(claim.currentCountry, prev.address.country),
      },
      healthInsurance: {
        ...prev.healthInsurance,
        type:
          (str(
            claim.healthInsuranceType
          ) as OnboardingHealthInsurance['type']) || prev.healthInsurance.type,
        providerName: claimOrPrev(
          claim.healthInsuranceProviderName,
          prev.healthInsurance.providerName
        ),
        providerAddress: claimOrPrev(
          claim.healthInsuranceProviderAddress,
          prev.healthInsurance.providerAddress
        ),
        insuredSinceMonth: claimOrPrev(
          claim.healthInsuranceInsuredSinceMonth,
          prev.healthInsurance.insuredSinceMonth
        ),
        insuredSinceYear: claimOrPrev(
          claim.healthInsuranceInsuredSinceYear,
          prev.healthInsurance.insuredSinceYear
        ),
        placeOfBirth: claimOrPrev(
          claim.healthInsurancePlaceOfBirth,
          prev.healthInsurance.placeOfBirth
        ),
        countryOfBirth: claimOrPrev(
          claim.healthInsuranceCountryOfBirth,
          prev.healthInsurance.countryOfBirth
        ),
        insuranceNumber: claimOrPrev(
          claim.healthInsuranceNumber,
          prev.healthInsurance.insuranceNumber
        ),
        // documentId isn't a claim column (documents are tracked via the
        // claim_documents junction table, same as identity's passport) so
        // there's nothing to restore from `claim` here; keep whatever is
        // already in memory/session.
        documentId: prev.healthInsurance.documentId,
      },
      bankDetails: {
        ...prev.bankDetails,
        iban: claimOrPrev(claim.iban, prev.bankDetails.iban),
        accountHolder: claimOrPrev(
          claim.accountHolderName,
          prev.bankDetails.accountHolder
        ),
      },
    }));

    // If payment is not completed, stay on payment step
    if (!isPaid) {
      setCurrentStep(2);
      return;
    }

    // Determine which substep to resume at based on completedSteps.
    // Task 15: for bAV/private claimants, a 'healthInsurance' completed step
    // sits between 'currentAddress' and 'bankDetails' (see
    // getSubmitDetailsSubsteps / SUBMIT_DETAILS_SUBSTEPS order). pensionType
    // isn't a claim column — it's read from local state (already restored by
    // the sessionStorage effect or the eligibility carry-over effect, both of
    // which run before/independently of this claim resume).
    const steps = (claim.completedSteps as Record<string, boolean>) || {};
    setCurrentStep(3);
    setData((prev) => {
      const isPrivate = prev.pensionType === 'private';
      if (isPrivate) {
        // bAV/private: Address → Health Insurance → Bank → Signature → Review
        // (Review is the terminal submit step; no Confirm substep).
        if (steps.signDocuments) {
          setCurrentSubStep('review');
        } else if (steps.bankDetails) {
          setCurrentSubStep('signature');
        } else if (steps.healthInsurance) {
          setCurrentSubStep('bank-details');
        } else if (steps.currentAddress) {
          setCurrentSubStep('health-insurance');
        } else if (steps.germanSocialInsurance) {
          setCurrentSubStep('address');
        } else if (steps.passportUpload) {
          setCurrentSubStep('membership');
        } else {
          setCurrentSubStep('identity');
        }
      } else {
        // public/stage: Bank → Review → Confirm → Signature (Signature is the
        // terminal submit step). 'reviewInformation' is marked on leaving
        // Review, 'finalConfirmation' on leaving Confirm, 'signDocuments' on
        // signing — so they resume the user just past the furthest step
        // reached.
        if (steps.signDocuments) {
          setCurrentSubStep('signature');
        } else if (steps.finalConfirmation) {
          setCurrentSubStep('signature');
        } else if (steps.reviewInformation) {
          setCurrentSubStep('confirm');
        } else if (steps.bankDetails) {
          setCurrentSubStep('review');
        } else if (steps.currentAddress) {
          setCurrentSubStep('bank-details');
        } else if (steps.germanSocialInsurance) {
          setCurrentSubStep('address');
        } else if (steps.passportUpload) {
          setCurrentSubStep('membership');
        } else {
          setCurrentSubStep('identity');
        }
      }
      return prev;
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    setCurrentStep(1);
    setCurrentSubStep('identity');
    setData(initialData);
    setEditingFromReview(false);
    // Explicit restart — drop any persisted position/data so a later
    // refresh doesn't resurrect the abandoned run. Inert when persistence is
    // disabled (legacy calculator flows never wrote this key — see the
    // persistenceEnabled prop doc above).
    if (persistenceEnabled) {
      clearOnboardingState();
    }
  }, [persistenceEnabled]);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        currentSubStep,
        setCurrentStep,
        setCurrentSubStep,
        editingFromReview,
        setEditingFromReview,
        data,
        updateData,
        updateIdentity,
        updateMembership,
        updateStageDetails,
        updateAddress,
        updateHealthInsurance,
        updateBankDetails,
        updateSignature,
        updateConfirm,
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
