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
  EligibilityData,
  IneligibilityInfo,
  WaitingInfo,
  ReviewInfo,
  StepId,
  FlowConfig,
} from '@/components/vbl/get-started/flows';
import { publicSectorFlow } from '@/components/vbl/get-started/flows/public-sector';
import { stageFlow } from '@/components/vbl/get-started/flows/stage';
import { privateSectorFlow } from '@/components/vbl/get-started/flows/private-sector';
import {
  loadEligibilityState,
  saveEligibilityState,
  clearAllFlowPersistence,
} from '@/lib/flow-persistence';

const initialData: EligibilityData = {
  employmentType: '',
  federalState: '',
  pensionProvider: '',
  vblPlan: '',
  consecutiveContribution: '',
  contributionDuration: '',
  publicEntryPath: '',
  stageEntryPath: '',
  stageContributionDuration: '',
  stagePost2001ContributionDuration: '',
  stagePost2018ContributionDuration: '',
  employmentEndMonth: '',
  employmentEndYear: '',
  privateEntryPath: '',
  privatePensionProvider: '',
  privatePensionProviderOther: '',
  contributionStartMonth: '',
  contributionStartYear: '',
  contributionEndMonth: '',
  contributionEndYear: '',
  averageMonthlyContribution: '',
  privateStatePensionRefundReceived: '',
  privateStatementValueType: '',
  privateStatementAmount: '',
};

function getFlowConfig(employmentType: string): FlowConfig | null {
  switch (employmentType) {
    case 'public_sector':
      return publicSectorFlow;
    case 'stage_performing_arts':
      return stageFlow;
    case 'private_sector':
      return privateSectorFlow;
    default:
      return null;
  }
}

type EligibilityResult =
  | 'eligible'
  | 'not_eligible'
  | 'waiting'
  | 'review'
  | null;

interface EligibilityContextType {
  data: EligibilityData;
  updateData: (updates: Partial<EligibilityData>) => void;
  currentStepIndex: number;
  stepHistory: number[];
  result: EligibilityResult;
  ineligibilityInfo: IneligibilityInfo | null;
  waitingInfo: WaitingInfo | null;
  reviewInfo: ReviewInfo | null;
  currentStepId: StepId | 'employment_type' | null;
  eligibilityConfirmed: boolean;
  goNext: (updates?: Partial<EligibilityData>) => void;
  goBack: () => void;
  reset: () => void;
  confirmEligibility: () => void;
}

const EligibilityContext = createContext<EligibilityContextType | null>(null);

export function EligibilityProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EligibilityData>(initialData);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const [result, setResult] = useState<EligibilityResult>(null);
  const [ineligibilityInfo, setIneligibilityInfo] =
    useState<IneligibilityInfo | null>(null);
  const [waitingInfo, setWaitingInfo] = useState<WaitingInfo | null>(null);
  const [reviewInfo, setReviewInfo] = useState<ReviewInfo | null>(null);
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);

  // Restore from sessionStorage on mount (client-only — Next.js SSR guard).
  // This runs once; there is no backend equivalent for pre-eligibility-
  // confirmation state, so sessionStorage is the sole source of truth here.
  //
  // `hasRestored` is real React state (not a ref) precisely so that flipping
  // it to `true` schedules a re-render: the write-through effect below reads
  // it from its own render's closure, so it only ever sees `true` once the
  // setState calls from restoration below have already been flushed into
  // `data`/`currentStepIndex`/etc. A ref would flip synchronously within
  // this same effect and let the write-through effect (which runs right
  // after, in the same commit) observe "restored" while `data` still held
  // its pre-restore initial value — clobbering the just-read blob.
  const [hasRestored, setHasRestored] = useState(false);
  useEffect(() => {
    const persisted = loadEligibilityState();
    if (!persisted) {
      setHasRestored(true);
      return;
    }

    setData(persisted.data);
    setCurrentStepIndex(persisted.currentStepIndex);
    setStepHistory(persisted.stepHistory);
    setResult(persisted.result);
    setEligibilityConfirmed(persisted.eligibilityConfirmed);
    // ineligibilityInfo/waitingInfo/reviewInfo are re-derivable copy blobs
    // rather than form data; if the user landed on a result screen we accept
    // re-deriving these lazily is unnecessary — but since checkEligibility/
    // checkWaiting/checkReview require the full flow context and data to
    // recompute, and result already tells the UI which branch to render,
    // we recompute them from the flow config using the restored data.
    const restoredFlow = getFlowConfig(persisted.data.employmentType);
    if (restoredFlow && persisted.currentStepIndex >= 0) {
      const stepId = restoredFlow.steps[persisted.currentStepIndex];
      if (persisted.result === 'not_eligible') {
        setIneligibilityInfo(
          restoredFlow.checkEligibility(stepId, persisted.data)
        );
      } else if (persisted.result === 'review' && restoredFlow.checkReview) {
        setReviewInfo(restoredFlow.checkReview(stepId, persisted.data));
      } else if (persisted.result === 'waiting' && restoredFlow.checkWaiting) {
        setWaitingInfo(restoredFlow.checkWaiting(stepId, persisted.data));
      }
    }
    setHasRestored(true);
  }, []);

  const flow = getFlowConfig(data.employmentType);

  const currentStepId: StepId | 'employment_type' | null = (() => {
    if (currentStepIndex === -1) return 'employment_type';
    if (!flow) return null;
    return flow.steps[currentStepIndex] ?? null;
  })();

  // Write-through persistence: any state change re-saves the whole snapshot.
  // Skipped until the initial restore effect has run so we don't clobber a
  // pending restore with the pre-restore initial state. Debounce is
  // unnecessary here — this blob is small and writes are cheap.
  useEffect(() => {
    if (!hasRestored) return;
    saveEligibilityState({
      data,
      currentStepIndex,
      stepHistory,
      result,
      currentStepId,
      eligibilityConfirmed,
    });
  }, [
    hasRestored,
    data,
    currentStepIndex,
    stepHistory,
    result,
    currentStepId,
    eligibilityConfirmed,
  ]);

  const updateData = useCallback((updates: Partial<EligibilityData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(
    (updates?: Partial<EligibilityData>) => {
      const updatedData = updates ? { ...data, ...updates } : data;
      if (updates) setData(updatedData);

      const currentFlow = getFlowConfig(updatedData.employmentType);
      if (!currentFlow) return;

      // Check eligibility at current step (skip for employment_type)
      if (currentStepIndex >= 0) {
        const stepId = currentFlow.steps[currentStepIndex];
        const ineligible = currentFlow.checkEligibility(stepId, updatedData);
        if (ineligible) {
          setResult('not_eligible');
          setIneligibilityInfo(ineligible);
          return;
        }

        // Check review (individual assessment)
        if (currentFlow.checkReview) {
          const review = currentFlow.checkReview(stepId, updatedData);
          if (review) {
            setResult('review');
            setReviewInfo(review);
            return;
          }
        }

        // Check waiting period
        if (currentFlow.checkWaiting) {
          const waiting = currentFlow.checkWaiting(stepId, updatedData);
          if (waiting) {
            setResult('waiting');
            setWaitingInfo(waiting);
            return;
          }
        }
      }

      // Find next non-skipped step
      let nextIndex = currentStepIndex + 1;
      while (nextIndex < currentFlow.steps.length) {
        if (
          !currentFlow.shouldSkipStep(currentFlow.steps[nextIndex], updatedData)
        ) {
          break;
        }
        nextIndex++;
      }

      if (nextIndex >= currentFlow.steps.length) {
        setResult('eligible');
        return;
      }

      setStepHistory((prev) => [...prev, currentStepIndex]);
      setCurrentStepIndex(nextIndex);
    },
    [data, currentStepIndex]
  );

  const goBack = useCallback(() => {
    setStepHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const prevIndex = newHistory.pop()!;
      setCurrentStepIndex(prevIndex);
      return newHistory;
    });
  }, []);

  const confirmEligibility = useCallback(() => {
    setEligibilityConfirmed(true);
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setCurrentStepIndex(-1);
    setStepHistory([]);
    setResult(null);
    setIneligibilityInfo(null);
    setWaitingInfo(null);
    setReviewInfo(null);
    setEligibilityConfirmed(false);
    // reset() is the "Return to start" / "Go back" action from
    // EligibilityResult — the canonical explicit-restart entry point for
    // the whole get-started flow, so it also clears any persisted
    // onboarding position/data alongside eligibility's own blob.
    clearAllFlowPersistence();
  }, []);

  return (
    <EligibilityContext.Provider
      value={{
        data,
        updateData,
        currentStepIndex,
        stepHistory,
        result,
        ineligibilityInfo,
        waitingInfo,
        reviewInfo,
        currentStepId,
        eligibilityConfirmed,
        goNext,
        goBack,
        reset,
        confirmEligibility,
      }}
    >
      {children}
    </EligibilityContext.Provider>
  );
}

export function useEligibility() {
  const context = useContext(EligibilityContext);
  if (!context) {
    throw new Error(
      'useEligibility must be used within an EligibilityProvider'
    );
  }
  return context;
}
