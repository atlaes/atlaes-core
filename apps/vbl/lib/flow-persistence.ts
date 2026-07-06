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
  OnboardingAddress,
  OnboardingBankDetails,
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

export function saveEligibilityState(
  state: Omit<PersistedEligibilityState, 'version'>
): void {
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

export interface PersistedOnboardingData {
  pensionType: 'public' | 'private' | '';
  email: string;
  authMethod: 'email' | 'google' | 'apple' | '';
  paymentCompleted: boolean;
  paymentReference?: string;
  identity: PersistedOnboardingIdentity;
  membership: OnboardingMembership; // includes stageDetails — client-only, no backend column
  address: OnboardingAddress;
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPersistedOnboardingData(data: any): PersistedOnboardingData {
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

export function saveOnboardingState(
  state: Omit<PersistedOnboardingState, 'version'>
): void {
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
