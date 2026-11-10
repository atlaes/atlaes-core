'use client';

/**
 * Eligibility flow state (`/check/3-step`, `/check/2-step`, and the
 * calculator's `/calculator/qualification`). The decision itself is
 * `lib/eligibility-rules.ts` (rule set GPR-ELIG-2026-11-10) and runs in
 * the browser; nothing is stored before account creation, the reminder
 * opt-in or the free-review submit.
 *
 * Steps (check flows): 0 countries · 1 work history · 2 result · 3 account.
 * Calculator flow:     0 countries · 1 result · 2 account (L and M come
 * from the calculator's jobs).
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import apiClient, { magicLinkErrorMessage } from '@/lib/api';
import {
  GPRFormData,
  JobData,
  MONTHS as CALC_MONTHS,
} from '@/hooks/useGPRCalculator';
import {
  captureAttribution,
  getAttribution,
  parseAttributionParams,
  type Attribution,
} from '@/lib/attribution';
import { countryByCode, resolveCountry } from '@/lib/country-search';
import {
  RULE_SET_ID,
  countryBlock,
  decide,
  isComplete,
  toFirstDayIso,
  toMonthString,
  visibleQuestions,
  type EligibilityAnswers,
  type EligibilityDecision,
  type GermanMonthsAnswer,
  type LocalPensionAnswer,
  type YearMonth,
} from '@/lib/eligibility-rules';

export type EligibilityFlowType = 'calculator' | '2-step' | '3-step';

/** Form state; countries are ISO codes, months '1'–'12', years 'YYYY'. */
export interface EligibilityFormData {
  citizenship: string;
  secondCitizenship: string;
  showSecondCitizenship: boolean;
  residence: string;
  lastContributionMonth: string;
  lastContributionYear: string;
  localPension: LocalPensionAnswer | '';
  localPensionEndMonth: string;
  localPensionEndYear: string;
  germanMonths: GermanMonthsAnswer | '';
}

/** Kept for GPRSessionContext; `isEligible` = result is not NOT_NOW. */
export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
}

export type FlowStep = 'countries' | 'work' | 'result' | 'account';

export interface ReviewInput {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  hp: string;
}

interface EligibilityContextType {
  currentStep: number;
  step: FlowStep;
  formData: EligibilityFormData;
  answers: EligibilityAnswers;
  decision: EligibilityDecision | null;
  flowType: EligibilityFlowType;
  /** Ordering hint for the country selects (never preselected). */
  geoCountry: string | null;
  attested: boolean;
  setAttested: (v: boolean) => void;
  showEmailModal: boolean;
  showEmailSentModal: boolean;
  submittedEmail: string;
  isSubmittingEmail: boolean;
  emailError: string | null;

  updateFormData: (data: Partial<EligibilityFormData>) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToAccount: () => void;
  editAnswers: () => void;
  canProceed: () => boolean;
  resetForm: () => void;
  openEmailModal: () => void;
  closeEmailModal: () => void;
  submitEmail: (email: string) => Promise<void>;
  closeEmailSentModal: () => void;
  clearEmailError: () => void;
  submitReminder: (email: string) => Promise<void>;
  submitReview: (input: ReviewInput) => Promise<void>;
}

const EligibilityContext = createContext<EligibilityContextType | null>(null);

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
  secondCitizenship: '',
  showSecondCitizenship: false,
  residence: '',
  lastContributionMonth: '',
  lastContributionYear: '',
  localPension: '',
  localPensionEndMonth: '',
  localPensionEndYear: '',
  germanMonths: '',
};

function toYearMonth(month: string, year: string): YearMonth | null {
  const m = Number(month);
  const y = Number(year);
  if (!m || !y || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

/** A month after the current one cannot be a past contribution month. */
export function isFutureMonth(ym: YearMonth | null, now = new Date()) {
  if (!ym) return false;
  return ym.year * 12 + ym.month > now.getFullYear() * 12 + now.getMonth() + 1;
}

/** Latest job end month + total months from the calculator. */
function calculatorFacts(calc: GPRFormData | null): {
  last: YearMonth | null;
  months: number | null;
} {
  if (!calc) return { last: null, months: null };
  let best: YearMonth | null = null;
  (calc.jobs || []).forEach((j: JobData) => {
    const m = CALC_MONTHS.indexOf(j.endMonth) + 1;
    const y = Number(j.endYear);
    if (!m || !y) return;
    if (!best || y * 12 + m > best.year * 12 + best.month) {
      best = { year: y, month: m };
    }
  });
  const months = calc.calculationResult
    ? calc.calculationResult.totalMonthsContributed
    : null;
  return { last: best, months };
}

/** URL prefill value (ISO code or a country name/alias) → ISO code. */
function prefillCode(v: string | null): string | null {
  if (!v) return null;
  const byCode = countryByCode(v.toUpperCase());
  if (byCode) return byCode.code;
  const byName = resolveCountry(v);
  return byName ? byName.code : null;
}

function attributionFields(a: Attribution | null) {
  if (!a) return {};
  return {
    referrer: a.referrer,
    landingPage: a.landingPage,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    utmTerm: a.utmTerm,
    utmContent: a.utmContent,
    gclid: a.gclid,
    fbclid: a.fbclid,
    via: a.via,
  };
}

interface EligibilityProviderProps {
  children: ReactNode;
  flowType?: EligibilityFlowType;
  calculatorData?: GPRFormData | null;
  geoCountry?: string | null;
}

export function EligibilityProvider({
  children,
  flowType = 'calculator',
  calculatorData = null,
  geoCountry = null,
}: EligibilityProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] =
    useState<EligibilityFormData>(initialFormData);
  const [decision, setDecision] = useState<EligibilityDecision | null>(null);
  const [attested, setAttested] = useState(false);
  const [attestedAt, setAttestedAt] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailSentModal, setShowEmailSentModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const isCalc = flowType === 'calculator';
  const steps: FlowStep[] = isCalc
    ? ['countries', 'result', 'account']
    : ['countries', 'work', 'result', 'account'];
  const step = steps[Math.min(currentStep, steps.length - 1)];
  const resultIndex = steps.indexOf('result');

  const updateFormData = useCallback((data: Partial<EligibilityFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const setAttestedStamp = useCallback((v: boolean) => {
    setAttested(v);
    setAttestedAt(v ? new Date().toISOString() : null);
  }, []);

  // Prefill from the marketing hero card (?citizenship=…&residence=…):
  // step-1 answers are never re-asked. Codes and names are both accepted.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // First-touch attribution for visitors who land on the funnel directly.
    captureAttribution();
    const params = new URLSearchParams(window.location.search);
    const citizenship = prefillCode(params.get('citizenship'));
    const residence = prefillCode(params.get('residence'));
    if (!citizenship && !residence) return;
    const patch: Partial<EligibilityFormData> = {};
    if (citizenship) patch.citizenship = citizenship;
    if (residence) patch.residence = residence;
    setFormData((prev) => ({ ...prev, ...patch }));
    if (citizenship && residence && !isCalc) {
      const block = countryBlock({ citizenship, residence });
      if (block) {
        setDecision(decide({ citizenship, residence }));
        setCurrentStep(resultIndex);
      } else {
        setCurrentStep(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calc = useMemo(() => calculatorFacts(calculatorData), [calculatorData]);

  const answers: EligibilityAnswers = useMemo(() => {
    const a: EligibilityAnswers = {
      citizenship: formData.citizenship,
      secondCitizenship:
        formData.showSecondCitizenship && formData.secondCitizenship
          ? formData.secondCitizenship
          : null,
      residence: formData.residence,
      lastContribution: isCalc
        ? calc.last
        : toYearMonth(
            formData.lastContributionMonth,
            formData.lastContributionYear
          ),
      localPension: formData.localPension || null,
      localPensionEnd: toYearMonth(
        formData.localPensionEndMonth,
        formData.localPensionEndYear
      ),
      germanMonths: isCalc
        ? calc.months === null
          ? null
          : calc.months >= 60
            ? '60plus'
            : 'lt60'
        : formData.germanMonths || null,
    };
    // Answers to questions that are not shown do not count.
    const v = visibleQuestions(a);
    if (!v.localPension) a.localPension = null;
    if (!v.localPensionEnd) a.localPensionEnd = null;
    if (!v.germanMonths && !isCalc) a.germanMonths = null;
    return a;
  }, [formData, isCalc, calc]);

  const canProceed = useCallback((): boolean => {
    if (step === 'countries') {
      if (!formData.citizenship || !formData.residence) return false;
      if (!isCalc) return true;
      // Calculator flow: the local-pension question sits on this step.
      return isComplete(answers);
    }
    if (step === 'work') {
      if (isFutureMonth(answers.lastContribution ?? null)) return false;
      if (isFutureMonth(answers.localPensionEnd ?? null)) return false;
      return isComplete(answers);
    }
    return true;
  }, [step, formData, isCalc, answers]);

  const goToNextStep = useCallback(() => {
    if (!canProceed()) return;
    if (step === 'countries') {
      // A blocked case goes straight to the result; nothing else is asked.
      if (countryBlock(answers) || isCalc) {
        setDecision(decide(answers));
        setCurrentStep(resultIndex);
        return;
      }
    }
    if (step === 'work') {
      setDecision(decide(answers));
      setCurrentStep(resultIndex);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [canProceed, step, answers, isCalc, resultIndex, steps.length]);

  const goToPreviousStep = useCallback(() => {
    if (step === 'result') {
      setCurrentStep(countryBlock(answers) || isCalc ? 0 : 1);
      return;
    }
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }, [step, answers, isCalc, currentStep]);

  const goToAccount = useCallback(() => {
    setCurrentStep(steps.indexOf('account'));
  }, [steps]);

  const editAnswers = useCallback(() => {
    setDecision(null);
    setCurrentStep(0);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(0);
    setDecision(null);
    setAttestedStamp(false);
    setShowEmailModal(false);
    setShowEmailSentModal(false);
    setSubmittedEmail('');
  }, [setAttestedStamp]);

  /** The answer set stored with a lead / sign-up (brief § 6). */
  const record = useCallback(() => {
    const d = decision;
    const a = answers;
    return {
      ruleSet: RULE_SET_ID,
      result: d ? d.result : null,
      blockReason: d ? d.blockReason : null,
      answers: {
        citizenship: a.citizenship,
        secondCitizenship: a.secondCitizenship || null,
        residence: a.residence,
        lastContributionMonth: a.lastContribution
          ? toMonthString(a.lastContribution)
          : null,
        localPension: a.localPension || null,
        localPensionEndMonth: a.localPensionEnd
          ? toMonthString(a.localPensionEnd)
          : null,
        effectiveLastMonth:
          d && d.effectiveLast ? toMonthString(d.effectiveLast) : null,
        germanMonths: a.germanMonths || null,
      },
      fileFrom:
        d && d.fileFrom && d.result !== 'NOT_NOW'
          ? toFirstDayIso(d.fileFrom)
          : null,
      // Stored first touch; this page's own params fill the gaps.
      ...attributionFields({
        ...parseAttributionParams(window.location.search),
        ...(getAttribution() || { capturedAt: '' }),
      } as Attribution),
      submittedAt: new Date().toISOString(),
    };
  }, [decision, answers]);

  const openEmailModal = useCallback(() => setShowEmailModal(true), []);
  const closeEmailModal = useCallback(() => setShowEmailModal(false), []);

  const submitEmail = useCallback(
    async (email: string) => {
      setIsSubmittingEmail(true);
      setEmailError(null);
      try {
        const legacyResult: EligibilityResult = {
          isEligible: !!decision && decision.result !== 'NOT_NOW',
          reasons: decision ? [decision.result] : [],
        };
        const payload: Record<string, unknown> = {
          email,
          callbackUrl: window.location.origin,
          eligibilityCheck: {
            ...record(),
            attestedAt: attestedAt || new Date().toISOString(),
          },
        };
        if (calculatorData && calculatorData.calculationResult) {
          const result = calculatorData.calculationResult;
          payload.gprSessionData = {
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
              secondCitizenship: answers.secondCitizenship || undefined,
              residence: formData.residence || undefined,
              ruleSet: RULE_SET_ID,
              result: decision ? decision.result : undefined,
              blockReason: decision?.blockReason || undefined,
              eligibilityResult: legacyResult,
            },
          };
        }
        await apiClient.post('/auth/magic-link/request', payload);
        setSubmittedEmail(email);
        setShowEmailModal(false);
        setShowEmailSentModal(true);
      } catch (error: any) {
        setEmailError(magicLinkErrorMessage(error));
      } finally {
        setIsSubmittingEmail(false);
      }
    },
    [calculatorData, formData, answers, decision, record, attestedAt]
  );

  const submitReminder = useCallback(
    async (email: string) => {
      await apiClient.post('/eligibility-leads', {
        kind: 'reminder',
        email,
        reminderOptIn: true,
        ...record(),
      });
    },
    [record]
  );

  const submitReview = useCallback(
    async (input: ReviewInput) => {
      await apiClient.post('/eligibility-leads', {
        kind: 'review',
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        message: input.message || undefined,
        hp: input.hp || undefined,
        ...record(),
      });
    },
    [record]
  );

  const clearEmailError = useCallback(() => setEmailError(null), []);
  const closeEmailSentModal = useCallback(
    () => setShowEmailSentModal(false),
    []
  );

  const value = useMemo(
    () => ({
      currentStep,
      step,
      formData,
      answers,
      decision,
      flowType,
      geoCountry,
      attested,
      setAttested: setAttestedStamp,
      showEmailModal,
      showEmailSentModal,
      submittedEmail,
      isSubmittingEmail,
      emailError,
      updateFormData,
      goToNextStep,
      goToPreviousStep,
      goToAccount,
      editAnswers,
      canProceed,
      resetForm,
      openEmailModal,
      closeEmailModal,
      submitEmail,
      closeEmailSentModal,
      clearEmailError,
      submitReminder,
      submitReview,
    }),
    [
      currentStep,
      step,
      formData,
      answers,
      decision,
      flowType,
      geoCountry,
      attested,
      setAttestedStamp,
      showEmailModal,
      showEmailSentModal,
      submittedEmail,
      isSubmittingEmail,
      emailError,
      updateFormData,
      goToNextStep,
      goToPreviousStep,
      goToAccount,
      editAnswers,
      canProceed,
      resetForm,
      openEmailModal,
      closeEmailModal,
      submitEmail,
      closeEmailSentModal,
      clearEmailError,
      submitReminder,
      submitReview,
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
    throw new Error(
      'useEligibilityCheck must be used within EligibilityProvider'
    );
  }
  return context;
}
