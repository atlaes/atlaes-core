'use client';

// Task 13 (client item 22): refreshing the browser used to drop the user
// back at "What do you want to start?" because EligibilityContext and
// OnboardingContext are pure in-memory React state. This module is the
// single place that talks to sessionStorage for both contexts — it persists
// SUBSTEP-level position (not internal per-step phases, e.g. Identity's
// upload/confirm split or BankDetails' account-type branch; those reset to
// their first screen on refresh, which is an accepted simplification) plus
// the pre-claim form data needed to rebuild that position.
//
// Precedence on restore (documented here, applied by the contexts):
//   backend claim resume (loadFromClaim, driven by vbl_draft_claimId) WINS
//   over sessionStorage for every field it covers. sessionStorage exists to
//   cover (a) position + data BEFORE a claim exists (pre-payment), and
//   (b) position within step 3 substeps that the claim's `completedSteps`
//   map doesn't fully disambiguate (e.g. mid-review edits). The onboarding
//   restore effect in GetStartedOnboardingFlow applies sessionStorage first
//   (synchronously, on mount) and then loadFromClaim overwrites the fields
//   it owns once the draft claim fetch resolves.
//
// Never persisted: File objects, object URLs / data URL previews
// (identity.documentFile/documentPreview, signature.signatureFile/
// signatureData/signaturePreview), and any auth tokens. The signature
// sub-step always requires re-signing after a refresh — that is existing,
// intended behavior and this module does not try to change it.

import type {
  EligibilityData,
  StepId,
} from '@/components/vbl/get-started/flows';
import type {
  HealthInsuranceType,
  OnboardingAddress,
  OnboardingBankDetails,
  OnboardingData,
  OnboardingMembership,
  SubmitDetailsSubStep,
} from '@/contexts/OnboardingContext';

const ELIGIBILITY_KEY = 'vbl_eligibility_v1';
const ONBOARDING_KEY = 'vbl_onboarding_v1';
const VERSION = 1;

function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && !!window.sessionStorage;
}

function safeRead<T>(key: string): T | null {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return null;
    return parsed as T;
  } catch {
    // Corrupt or old-shape blob — treat as absent so the caller falls back
    // to a fresh start.
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / disabled / private mode — persistence is best-effort,
    // never block the flow on it.
  }
}

function safeClear(key: string): void {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------
// Eligibility persistence
// ------------------------------------------------------------------

export type PersistedEligibilityResult =
  | 'eligible'
  | 'not_eligible'
  | 'waiting'
  | 'review'
  | null;

export interface PersistedEligibilityState {
  version: number;
  data: EligibilityData;
  currentStepIndex: number;
  stepHistory: number[];
  result: PersistedEligibilityResult;
  currentStepId: StepId | 'employment_type' | null;
  eligibilityConfirmed: boolean;
}

// True when the state is indistinguishable from the pristine initial state
// (no employment type chosen yet and no steps taken). Checked before every
// write so that resetting the flow (reset()/resetOnboarding() clear the key,
// then the write-through effect immediately re-fires on the reset state)
// doesn't put a freshly-versioned-but-empty blob right back under the key —
// the key stays genuinely absent after a reset, matching a real fresh start.
function isEmptyEligibilityState(
  state: Omit<PersistedEligibilityState, 'version'>
): boolean {
  return (
    state.data.employmentType === '' &&
    state.currentStepIndex === -1 &&
    state.stepHistory.length === 0 &&
    state.result === null
  );
}

export function saveEligibilityState(
  state: Omit<PersistedEligibilityState, 'version'>
): void {
  if (isEmptyEligibilityState(state)) {
    clearEligibilityState();
    return;
  }
  safeWrite(ELIGIBILITY_KEY, { version: VERSION, ...state });
}

export function loadEligibilityState(): PersistedEligibilityState | null {
  return safeRead<PersistedEligibilityState>(ELIGIBILITY_KEY);
}

export function clearEligibilityState(): void {
  safeClear(ELIGIBILITY_KEY);
}

// ------------------------------------------------------------------
// Onboarding persistence
// ------------------------------------------------------------------

// Serializable subset of OnboardingIdentity — deliberately excludes
// documentFile (File) and documentPreview (object URL / data URL).
export interface PersistedOnboardingIdentity {
  firstName: string;
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

// Serializable subset of OnboardingSignature — deliberately excludes
// signatureFile (File), signatureData and signaturePreview (data URLs).
// The signature substep always re-collects the actual signature on refresh.
export interface PersistedOnboardingSignature {
  signatureType: 'draw' | 'upload' | '';
  legalConfirmed: boolean;
}

// Serializable subset of OnboardingHealthInsurance — deliberately excludes
// documentFile (File) and documentPreview (object URL), same rule as
// identity's document fields above. documentId (backend-issued) is kept —
// it's just a string, same treatment as the top-level documentId/claimId.
export interface PersistedOnboardingHealthInsurance {
  documentFileName?: string;
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

export interface PersistedOnboardingData {
  pensionType: 'public' | 'private' | '';
  email: string;
  authMethod: 'email' | 'google' | 'apple' | '';
  paymentCompleted: boolean;
  paymentReference?: string;
  identity: PersistedOnboardingIdentity;
  membership: OnboardingMembership; // includes stageDetails — client-only, no backend column
  address: OnboardingAddress;
  healthInsurance: PersistedOnboardingHealthInsurance;
  bankDetails: OnboardingBankDetails;
  signature: PersistedOnboardingSignature;
  userId?: string;
  claimId?: string;
  documentId?: string;
  signatureId?: string;
}

export interface PersistedOnboardingState {
  version: number;
  currentStep: 1 | 2 | 3;
  currentSubStep: SubmitDetailsSubStep;
  data: PersistedOnboardingData;
}

// Strips non-serializable / sensitive fields (File objects, previews, data
// URLs) from the live OnboardingData shape before writing to sessionStorage.
// Typed as OnboardingData (not `any`) so that adding a new File-like field to
// OnboardingData without also whitelisting it here is caught at compile time
// rather than silently passing through (or silently omitted unnoticed).
export function toPersistedOnboardingData(
  data: OnboardingData
): PersistedOnboardingData {
  return {
    pensionType: data.pensionType,
    email: data.email,
    authMethod: data.authMethod,
    paymentCompleted: data.paymentCompleted,
    paymentReference: data.paymentReference,
    identity: {
      firstName: data.identity.firstName,
      middleName: data.identity.middleName,
      lastName: data.identity.lastName,
      dateOfBirth: data.identity.dateOfBirth,
      gender: data.identity.gender,
      passportNumber: data.identity.passportNumber,
      nationality: data.identity.nationality,
      placeOfBirth: data.identity.placeOfBirth,
      passportIssueDate: data.identity.passportIssueDate,
      passportExpiryDate: data.identity.passportExpiryDate,
    },
    membership: data.membership,
    address: data.address,
    healthInsurance: {
      documentFileName: data.healthInsurance.documentFileName,
      documentId: data.healthInsurance.documentId,
      type: data.healthInsurance.type,
      providerName: data.healthInsurance.providerName,
      providerAddress: data.healthInsurance.providerAddress,
      insuredSinceMonth: data.healthInsurance.insuredSinceMonth,
      insuredSinceYear: data.healthInsurance.insuredSinceYear,
      placeOfBirth: data.healthInsurance.placeOfBirth,
      countryOfBirth: data.healthInsurance.countryOfBirth,
      insuranceNumber: data.healthInsurance.insuranceNumber,
    },
    bankDetails: data.bankDetails,
    signature: {
      signatureType: data.signature.signatureType,
      legalConfirmed: data.signature.legalConfirmed,
    },
    userId: data.userId,
    claimId: data.claimId,
    documentId: data.documentId,
    signatureId: data.signatureId,
  };
}

// True when the state is indistinguishable from the pristine initial state
// (still on step 1 / the first substep, and none of the meaningful form
// sections have anything in them yet). Same rationale as
// isEmptyEligibilityState above — prevents resetOnboarding() from having its
// just-cleared key immediately resurrected with an empty-but-versioned blob
// by the write-through effect's next run.
function isEmptyOnboardingState(
  state: Omit<PersistedOnboardingState, 'version'>
): boolean {
  const { data } = state;
  return (
    state.currentStep === 1 &&
    state.currentSubStep === 'identity' &&
    data.pensionType === '' &&
    data.email === '' &&
    !data.paymentCompleted &&
    data.identity.firstName === '' &&
    data.identity.lastName === '' &&
    data.membership.pensionProvider === '' &&
    data.address.streetAndNumber === '' &&
    data.bankDetails.iban === '' &&
    data.signature.signatureType === ''
  );
}

export function saveOnboardingState(
  state: Omit<PersistedOnboardingState, 'version'>
): void {
  if (isEmptyOnboardingState(state)) {
    clearOnboardingState();
    return;
  }
  safeWrite(ONBOARDING_KEY, { version: VERSION, ...state });
}

export function loadOnboardingState(): PersistedOnboardingState | null {
  return safeRead<PersistedOnboardingState>(ONBOARDING_KEY);
}

export function clearOnboardingState(): void {
  safeClear(ONBOARDING_KEY);
}

// Clears both keys — used on successful final submission and on explicit
// flow restart (e.g. "Return to start" from the eligibility result screen).
export function clearAllFlowPersistence(): void {
  clearEligibilityState();
  clearOnboardingState();
}
