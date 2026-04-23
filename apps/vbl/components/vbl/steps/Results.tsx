'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVBLCalculator, JobData, RefundBreakdown, ResultScenario } from '../../../hooks/useVBLCalculator';
import { Loader2, AlertCircle, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import apiClient from '../../../lib/api';

interface CalculationResult {
  isEligible: boolean;
  calculationMethod: string;
  baseRefundAmount: number;
  vatAmount: number;
  totalAmount: number;
  statePension?: number;
  vblKlassik?: number;
  providerBreakdown?: Array<{ provider: string; amount: number }>;
  eligibilityReasons: string[];
  rulesApplied: string[];
  monthsContributed?: number;
  isVested?: boolean;
  calculationDetails?: {
    contributionPeriod: number;
    consecutivePeriod: number;
    ageAtEmploymentEnd: number;
    westGermanyEligible: boolean;
    timeSinceEmploymentEnd: number;
  };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Inclusive calendar-month count (matches the backend fix for clients #4/#6/#7).
const jobMonthCount = (job: JobData): number => {
  const si = MONTH_NAMES.indexOf(job.startMonth);
  const ei = MONTH_NAMES.indexOf(job.endMonth);
  if (si < 0 || ei < 0 || !job.startYear || !job.endYear) return 0;
  const months =
    (parseInt(job.endYear) - parseInt(job.startYear)) * 12 + (ei - si) + 1;
  return Math.max(0, months);
};

// Months since the end of employment — used for 24-month waiting check.
const monthsSinceEmploymentEnd = (job: JobData): number => {
  const ei = MONTH_NAMES.indexOf(job.endMonth);
  if (ei < 0 || !job.endYear) return Infinity;
  const now = new Date();
  return (
    (now.getFullYear() - parseInt(job.endYear)) * 12 +
    (now.getMonth() - ei)
  );
};

const isStageOrOrchestra = (job: JobData): boolean =>
  job.employmentType === 'Stage / Performing Arts' ||
  job.employmentType === 'Orchestra';

// PROVISIONAL — pending client confirmation of the exact decision table.
// Picks one of the 3 Figma private-result variants based on the inputs
// collected across the private-sector sub-steps. Rules applied in order:
//
//   1. Provider === "Others"           → individual_assessment
//      (we can't map the scheme to known rules, so always review manually)
//   2. DRV statutoryPensionRefunded === "yes" → appears_unlikely
//      (user has already been refunded on DRV — small-benefit rule unlikely
//      to apply to the company pension)
//   3. DRV === "no" AND at least one financial field filled → may_be_possible
//      (the user is still in the scheme and we have enough hints to estimate)
//   4. DRV === "not_sure" OR DRV === "no" with no financial fields → individual_assessment
//      (catch-all: we don't have enough info to rule either way)
//
// These rules are QA-material only until the client confirms. See
// docs/client-feedback-status.md for the 6 open questions about this.
type PrivateVariant =
  | 'private_may_be_possible'
  | 'private_individual_assessment'
  | 'private_appears_unlikely';

const hasAnyFinancialField = (job: JobData): boolean =>
  (job.projectedMonthlyPension || '').trim() !== '' ||
  (job.capitalAmount || '').trim() !== '' ||
  (job.contractValue || '').trim() !== '' ||
  (job.estimatedMonthlyContribution || '').trim() !== '';

const resolvePrivateVariant = (privateJobs: JobData[]): PrivateVariant => {
  if (privateJobs.length === 0) return 'private_individual_assessment';

  // If ANY private job has provider=Others, force individual review —
  // we can't evaluate a scheme we haven't mapped.
  if (privateJobs.some((job) => job.companyPension === 'Other (enter manually)')) {
    return 'private_individual_assessment';
  }

  // Most pessimistic variant wins across multiple private jobs.
  const variants = privateJobs.map((job): PrivateVariant => {
    if (job.statutoryPensionRefunded === 'yes') return 'private_appears_unlikely';
    if (job.statutoryPensionRefunded === 'no' && hasAnyFinancialField(job)) {
      return 'private_may_be_possible';
    }
    return 'private_individual_assessment';
  });

  if (variants.includes('private_appears_unlikely')) return 'private_appears_unlikely';
  if (variants.includes('private_individual_assessment')) return 'private_individual_assessment';
  return 'private_may_be_possible';
};

/**
 * Determine result scenario based on job data (client-side logic).
 * Client #17/#18: Stage/Orchestra error screens for <12mo and 24-mo waiting.
 * Figma screens 21/22: split-card layout for mixed public+private jobs.
 */
const determineResultScenario = (jobs: JobData[], apiResult?: CalculationResult): ResultScenario => {
  // Mixed claim types — user has BOTH a public/stage/orchestra job AND a
  // private-sector job. Render the Figma split-card layout that resolves
  // each side independently. This check comes first because most of the
  // other scenarios only apply when the user has a single claim type.
  const hasPublicOrStage = jobs.some(
    (job) =>
      job.employmentType === 'Public sector' ||
      job.employmentType === 'Stage / Performing Arts' ||
      job.employmentType === 'Orchestra'
  );
  const hasPrivate = jobs.some((job) => job.employmentType === 'Private sector');
  if (hasPublicOrStage && hasPrivate) return 'mixed_result';

  // VBLextra alone → not eligible
  const hasVBLextra = jobs.some(
    (job) => job.supplementaryPensions.includes('VBLextra')
  );
  if (hasVBLextra) return 'not_eligible_vesting';

  // Stage/Orchestra gates — mirror Entry B eligibility and waiting rules.
  const stageJobs = jobs.filter(isStageOrOrchestra);
  if (stageJobs.length > 0) {
    // Any stage job with < 12 months → ineligible (Entry B less_than_12 bucket)
    const hasTooShort = stageJobs.some((job) => jobMonthCount(job) < 12);
    if (hasTooShort) return 'stage_too_short';

    // Any stage job whose employment ended less than 24 months ago → waiting
    const hasPendingWait = stageJobs.some(
      (job) => monthsSinceEmploymentEnd(job) < 24
    );
    if (hasPendingWait) return 'stage_waiting';
  }

  // Private-only path: pick one of 3 Figma variants using the provisional
  // decision table in `resolvePrivateVariant`. Rules pending client confirmation.
  const privateJobs = jobs.filter(
    (job) => job.employmentType === 'Private sector'
  );
  if (privateJobs.length > 0) return resolvePrivateVariant(privateJobs);

  // Check API response for vesting status
  if (apiResult?.isVested) return 'vested';

  // Default: eligible for refund
  return 'eligible';
};

// Resolve the public/stage/orchestra side of a mixed result. Mirrors the
// single-claim-type scenario logic but ignores private jobs. Used by the
// split-card renderer to decide which card variant to show on the left.
type PublicSideOutcome =
  | { kind: 'eligible' }
  | { kind: 'not_eligible_vesting' }
  | { kind: 'stage_too_short' }
  | { kind: 'stage_waiting'; eligibleOn: string }
  | { kind: 'vested' };

const resolvePublicSide = (jobs: JobData[]): PublicSideOutcome => {
  const publicAndStageJobs = jobs.filter(
    (job) =>
      job.employmentType === 'Public sector' ||
      job.employmentType === 'Stage / Performing Arts' ||
      job.employmentType === 'Orchestra'
  );
  if (publicAndStageJobs.some((j) => j.supplementaryPensions.includes('VBLextra'))) {
    return { kind: 'not_eligible_vesting' };
  }
  const stageJobs = publicAndStageJobs.filter(isStageOrOrchestra);
  if (stageJobs.some((job) => jobMonthCount(job) < 12)) {
    return { kind: 'stage_too_short' };
  }
  const waitingJob = stageJobs.find(
    (job) => monthsSinceEmploymentEnd(job) < 24
  );
  if (waitingJob) {
    const endIdx = MONTH_NAMES.indexOf(waitingJob.endMonth);
    const endYear = parseInt(waitingJob.endYear);
    const eligible = new Date(endYear, endIdx + 24);
    const eligibleOn = eligible.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
    return { kind: 'stage_waiting', eligibleOn };
  }
  return { kind: 'eligible' };
};

const formatDateForAPI = (month: string, year: string): string => {
  const monthIndex = MONTH_NAMES.indexOf(month) + 1;
  return `${year}-${String(monthIndex).padStart(2, '0')}`;
};

export const Results: React.FC = () => {
  const router = useRouter();
  const { formData, updateFormData, goToPreviousStep, resetForm, setCurrentStep } = useVBLCalculator();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [totalRefund, setTotalRefund] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [scenario, setScenario] = useState<ResultScenario>('eligible');

  useEffect(() => {
    calculateRefund();
  }, []);

  const calculateRefund = async () => {
    setIsLoading(true);
    setError('');

    // Check for client-side scenario determination first (before API call).
    // These scenarios don't need backend calculation — the outcome is purely
    // based on user inputs and there's no refund amount to show.
    const clientScenario = determineResultScenario(formData.jobs);
    const shortCircuitScenarios: ResultScenario[] = [
      'private_review',
      'private_may_be_possible',
      'private_individual_assessment',
      'private_appears_unlikely',
      'not_eligible_vesting',
      'stage_too_short',
      'stage_waiting',
    ];
    if (shortCircuitScenarios.includes(clientScenario)) {
      setScenario(clientScenario);
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        jobs: formData.jobs
          .filter((job) => job.employmentType !== 'Private sector' || job.supplementaryPensions.length > 0)
          .map((job) => ({
            employmentType: job.employmentType,
            supplementaryPensions: job.supplementaryPensions,
            startDate: formatDateForAPI(job.startMonth, job.startYear),
            endDate: formatDateForAPI(job.endMonth, job.endYear),
            averageMonthlyGrossSalary: job.averageMonthlyGrossSalary,
            germanFederalState: job.germanFederalState || null,
            customPensionName: job.customPensionName || null,
          })),
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.currentAge && { currentAge: formData.currentAge }),
        ...(formData.userType && { userType: formData.userType }),
      };

      const response = await apiClient.post('/vbl/calculate-simple', payload);

      if (response.data.success) {
        const apiResult = response.data.calculation;
        setResult(apiResult);

        // Determine final scenario with API result
        const finalScenario = determineResultScenario(formData.jobs, apiResult);
        setScenario(finalScenario);

        // Populate totalRefund for both plain `eligible` and `mixed_result`
        // (the split card shows the public-side amount on its left card).
        if (finalScenario === 'eligible' || finalScenario === 'mixed_result') {
          // Use supplementary (vblKlassik) only — exclude DRV state pension
          // For Stage/Orchestra, vblKlassik is not set so fall back to totalAmount
          const total = apiResult.vblKlassik ?? apiResult.totalAmount ?? 0;
          setTotalRefund(total);

          updateFormData({
            calculationResult: {
              totalRefund: total,
              breakdown: [],
              totalMonths: apiResult.monthsContributed || 0,
            },
          });
        }
      } else {
        setError(response.data.error || 'Calculation failed');
      }
    } catch (err: any) {
      console.error('VBL calculation error:', err);

      if (err.response?.data?.details) {
        setError(`${err.response.data.error}: ${err.response.data.details}`);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to calculate VBL refund. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Which side of the split card the user clicked. Controls what context
  // gets written to sessionStorage for the onboarding flow to consume.
  type StartClaimSide = 'public' | 'private' | 'auto';

  const handleStartClaim = (side: StartClaimSide = 'auto') => {
    // Client #12: carry the calculator's selected pension provider into the
    // onboarding flow so the Membership step can lock it. Uses the first
    // job with a concrete provider — Stage/Orchestra map to VddB/VddKO,
    // Public Sector uses its companyPension selection verbatim.
    // For the split-card path, restrict the candidate jobs to the side the
    // user actually clicked so the onboarding flow doesn't inherit the
    // wrong provider when both claim types exist.
    const candidateJobs =
      side === 'public'
        ? formData.jobs.filter(
            (j) =>
              j.employmentType === 'Public sector' ||
              j.employmentType === 'Stage / Performing Arts' ||
              j.employmentType === 'Orchestra'
          )
        : side === 'private'
          ? formData.jobs.filter((j) => j.employmentType === 'Private sector')
          : formData.jobs;

    const relevantJob = candidateJobs.find(
      (j) =>
        (j.employmentType === 'Public sector' && j.companyPension) ||
        j.employmentType === 'Stage / Performing Arts' ||
        j.employmentType === 'Orchestra' ||
        (j.employmentType === 'Private sector' && j.companyPension)
    );
    let pensionProvider: string | undefined;
    if (relevantJob) {
      if (relevantJob.employmentType === 'Stage / Performing Arts') {
        pensionProvider = 'VddB';
      } else if (relevantJob.employmentType === 'Orchestra') {
        pensionProvider = 'VddKO';
      } else {
        pensionProvider = relevantJob.companyPension || undefined;
      }
    }

    // Client #8: pass the detected claim types for the onboarding pension-type
    // selection screen. When the user explicitly picked a side from the split
    // card, only send that side so onboarding skips the selection screen and
    // scopes the claim correctly.
    const sectors = new Set<string>();
    const sectorSourceJobs = side === 'auto' ? formData.jobs : candidateJobs;
    sectorSourceJobs.forEach((j) => {
      if (j.employmentType === 'Public sector') sectors.add('public');
      else if (
        j.employmentType === 'Stage / Performing Arts' ||
        j.employmentType === 'Orchestra'
      )
        sectors.add('stage');
      else if (j.employmentType === 'Private sector') sectors.add('private');
    });
    const claimTypes = Array.from(sectors);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'calculator-selection',
        JSON.stringify({
          pensionProvider: pensionProvider ?? '',
          claimTypes,
        })
      );
    }
    router.push('/calculator/onboarding');
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  const handleBackToCalculator = () => {
    resetForm();
    setCurrentStep(0);
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  // Render: Loading state
  if (isLoading) {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <Loader2 className="w-16 h-16 animate-spin mb-4 mx-auto" style={{ color: 'var(--vbl-accent-lime)' }} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Calculating Your Refund</h2>
          <p className="text-gray-500">Please wait while we process your information...</p>
        </div>
      </div>
    );
  }

  // Render: Error state
  if (error) {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Calculation Error</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={calculateRefund}
            className="px-6 py-3 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render: Not Eligible — VBLextra (Figma screen 4).
  // Copy matches the client's Figma: single red X, title "Company pension payout
  // not possible", VBLextra-specific body, and dual CTAs (Back to calculator +
  // Return to homepage link).
  if (scenario === 'not_eligible_vesting') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-7 h-7 text-white" />
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Company pension payout not possible
          </h1>

          <p className="text-gray-600 text-sm mb-2" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on your information, your company pension includes <strong>VBLextra.</strong>
          </p>
          <p className="text-gray-600 text-sm mb-2" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            In this case, a <strong>lump sum payout is not possible.</strong>
          </p>
          <p className="text-gray-600 text-sm mb-2" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Your pension remains credited to you as a <strong>future pension entitlement.</strong>
          </p>
          <p className="text-gray-600 text-sm mb-8" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            This means your pension stays in the scheme and may be paid later as a{' '}
            <strong>regular pension benefit</strong> when you reach the applicable retirement age.
          </p>

          <button
            onClick={handleBackToCalculator}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 mb-4"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to calculator
          </button>
          <button
            onClick={handleReturnHome}
            className="text-sm text-gray-700 underline hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  // Render: Stage/Orchestra — contribution period < 12 months (Figma screen 15).
  if (scenario === 'stage_too_short') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Company pension refund not possible
          </h1>
          <p className="text-gray-600 text-sm mb-8" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on the information you provided, a refund is not possible because
            the minimum contribution period of 12 months has not been met.
          </p>
          <button
            onClick={handleBackToCalculator}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 mb-4"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to calculator
          </button>
          <button
            onClick={handleReturnHome}
            className="text-sm text-gray-700 underline hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  // Render: Stage/Orchestra — 24-month waiting period (Client #17/#18)
  if (scenario === 'stage_waiting') {
    // Find the first stage/orchestra job driving the wait and compute when the
    // 24 months elapse so we can show the user when they become eligible.
    const waitingJob = formData.jobs.find(
      (j) =>
        (j.employmentType === 'Stage / Performing Arts' ||
          j.employmentType === 'Orchestra') &&
        monthsSinceEmploymentEnd(j) < 24
    );
    const eligibleDateLabel = (() => {
      if (!waitingJob) return '';
      const endIdx = MONTH_NAMES.indexOf(waitingJob.endMonth);
      const endYear = parseInt(waitingJob.endYear);
      if (endIdx < 0 || isNaN(endYear)) return '';
      const eligible = new Date(endYear, endIdx + 24);
      return eligible.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });
    })();

    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Your supplementary pension payout is not yet available
          </h1>
          <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            For this pension scheme, a <strong>24-month waiting period</strong> must
            pass after your last contribution before a payout can be requested.
          </p>
          {eligibleDateLabel && (
            <p className="text-gray-800 text-sm mb-8 font-medium" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              You will become eligible in <strong>{eligibleDateLabel}</strong>.
            </p>
          )}
          <button
            onClick={handleBackToCalculator}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Render: mixed public+private split card (Figma screens 21/22).
  // Each side resolves independently; the user picks which claim to start
  // first. Public/stage/orchestra side shows the same variants it would in
  // isolation (eligible / vested / too-short / waiting / vbl-extra); the
  // private side currently pins to "Individual Assessment Required" until
  // the 3-variant Phase 5 decision table arrives.
  if (scenario === 'mixed_result') {
    const publicSide = resolvePublicSide(formData.jobs);
    const privateSideVariant = resolvePrivateVariant(
      formData.jobs.filter((j) => j.employmentType === 'Private sector')
    );
    const publicAmount = totalRefund || result?.vblKlassik || 0;
    // Copy + badge colour for the right-hand card, keyed by which of the
    // 3 provisional private variants the inputs resolved to.
    const privateBadge = {
      private_may_be_possible: {
        title: 'Lump-sum settlement may be possible',
        footer:
          'Based on the information provided, a lump-sum settlement (Abfindung) of your company pension may be possible.',
        tone: 'positive' as const,
      },
      private_individual_assessment: {
        title: 'Individual Assessment Required',
        footer:
          'A lump-sum payout depends on the specific scheme and requires individual review.',
        tone: 'neutral' as const,
      },
      private_appears_unlikely: {
        title: 'Lump-sum settlement appears unlikely',
        footer:
          'A lump-sum settlement appears unlikely under the standard small-benefit rules; some cases may still require individual review.',
        tone: 'warning' as const,
      },
    }[privateSideVariant];

    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
            >
              Your Company Pension Result
            </h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Public / Stage / Orchestra card */}
            <div className="rounded-2xl border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="2">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l7-4 7 4v14" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 leading-tight">
                  Public / Stage / Orchestra<br />Refund Claim
                </p>
              </div>

              {publicSide.kind === 'eligible' ? (
                <div
                  className="rounded-xl p-5 flex items-center justify-center gap-3 mb-4"
                  style={{ backgroundColor: 'var(--vbl-accent-lime)', color: 'var(--vbl-sidebar-dark)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--vbl-sidebar-dark)' }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium opacity-90">Total company pension refund</p>
                    <p className="text-2xl font-bold" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
                      &euro;{formatCurrency(publicAmount)}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 mb-4 flex items-start gap-3"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-red-700 leading-tight">
                    Company pension refund not possible
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed mt-auto">
                {publicSide.kind === 'eligible' &&
                  'This result includes only the company pensions that can currently be processed under this claim type. Other company pensions may require a separate claim or individual review.'}
                {publicSide.kind === 'stage_too_short' &&
                  'Based on the information you provided, a refund is not possible because the minimum contribution period of 12 months has not been met.'}
                {publicSide.kind === 'not_eligible_vesting' &&
                  'Your company pension includes VBLextra, so a lump-sum payout is not possible. The pension remains credited as a future entitlement.'}
                {publicSide.kind === 'vested' &&
                  'Your company pension is vested under the applicable scheme rules and remains preserved for retirement.'}
                {publicSide.kind === 'stage_waiting' &&
                  `A 24-month waiting period must pass after your last contribution. You will become eligible in ${publicSide.eligibleOn}.`}
              </p>
            </div>

            {/* Private Sector card */}
            <div className="rounded-2xl border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <rect x="3" y="7" width="18" height="14" rx="2" />
                    <path d="M3 7l9-4 9 4" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900 leading-tight">
                  Private Sector<br />Settlement Claim
                </p>
              </div>

              <div
                className="rounded-xl p-4 mb-4 flex items-center gap-3"
                style={{
                  backgroundColor:
                    privateBadge.tone === 'warning'
                      ? 'rgba(251, 191, 36, 0.15)'
                      : 'var(--vbl-accent-lime)',
                  color: 'var(--vbl-sidebar-dark)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor:
                      privateBadge.tone === 'warning'
                        ? '#D97706'
                        : 'var(--vbl-sidebar-dark)',
                  }}
                >
                  {privateBadge.tone === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <p className="text-sm font-semibold">{privateBadge.title}</p>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mt-auto">
                {privateBadge.footer}
              </p>
            </div>
          </div>

          <p className="text-center font-semibold text-gray-900 mb-4">
            Which claim would you like to start first?
          </p>
          <div className="flex items-center justify-center gap-3">
            {publicSide.kind === 'eligible' && (
              <button
                onClick={() => handleStartClaim('public')}
                className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all duration-200"
                style={{
                  fontFamily: 'var(--vbl-font-montserrat)',
                  backgroundColor: 'var(--vbl-accent-lime)',
                  color: 'var(--vbl-sidebar-dark)',
                }}
              >
                Start Public Refund Claim
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleStartClaim('private')}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              Start Private Sector Review
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-start pt-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Private variant — "A lump-sum settlement may be possible"
  // (Figma screen 11). Green check, "Continue" CTA.
  if (scenario === 'private_may_be_possible') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--vbl-accent-lime)' }}
            >
              <Check className="w-8 h-8" style={{ color: '#163300' }} />
            </div>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            A lump-sum settlement may be possible
          </h1>
          <p className="text-gray-600 text-sm mb-6" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on the information you provided, a lump-sum settlement (Abfindung) of your
            company pension may be possible.
          </p>
          <div className="rounded-xl p-4 mb-8 border border-gray-200 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              Final eligibility depends on confirmation by the pension provider and the applicable scheme rules.
            </p>
          </div>
          <button
            onClick={() => handleStartClaim('private')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Render: Private variant — "Individual assessment required" (Figma
  // screen 12). Clock icon, "Proceed with review" CTA. Also the
  // fallback render for the legacy `private_review` alias.
  if (scenario === 'private_individual_assessment' || scenario === 'private_review') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--vbl-sidebar-dark)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9FE870" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Individual assessment required
          </h1>
          <p className="text-gray-600 text-sm mb-6" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on the information you provided, an individual review is needed to determine
            the available next steps for your company pension claim.
          </p>
          <div className="rounded-xl p-4 mb-8 border border-gray-200 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              This review includes checking the pension provider information, scheme details, and
              whether a lump-sum settlement (Abfindung) may be possible.
            </p>
          </div>
          <button
            onClick={() => handleStartClaim('private')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Proceed with review
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Render: Private variant — "A lump-sum settlement appears unlikely"
  // (Figma screen 13). Warning triangle, "Continue to paid review" CTA.
  if (scenario === 'private_appears_unlikely') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(159, 232, 112, 0.2)' }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--vbl-sidebar-dark)' }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: '#9FE870' }} />
            </div>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            A lump-sum settlement appears unlikely
          </h1>
          <p className="text-gray-600 text-sm mb-6" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on the information you provided, a lump-sum settlement (Abfindung) appears
            unlikely under the standard small-benefit rules.
          </p>
          <div className="rounded-xl p-4 mb-8 border border-gray-200 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              Some cases may still require individual review depending on the pension provider
              and scheme details.
            </p>
          </div>
          <button
            onClick={() => handleStartClaim('private')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Continue to paid review
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Render: Vested — refund not possible (Figma screen 14).
  if (scenario === 'vested') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1
            className="text-2xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Company pension refund not possible
          </h1>
          <p className="text-gray-600 text-sm mb-8" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on the information you provided, your company pension is vested under
            the applicable scheme rules. A refund is not possible and the pension remains
            preserved for retirement.
          </p>
          <button
            onClick={handleBackToCalculator}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 mb-4"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to calculator
          </button>
          <button
            onClick={handleReturnHome}
            className="text-sm text-gray-700 underline hover:text-gray-900 transition-colors"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  // Show transferred balances info only for public sector with 2+ jobs
  // and different company pension providers (e.g., VBL + ZVK)
  const publicSectorJobs = formData.jobs.filter(
    (job) => job.employmentType === 'Public sector'
  );
  const uniqueProviders = new Set(
    publicSectorJobs.map((job) => job.companyPension).filter(Boolean)
  );
  const showTransferredBalancesInfo =
    publicSectorJobs.length >= 2 && uniqueProviders.size >= 2;

  // Render: Eligible — total amount only (Screen 14)
  return (
    <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
      <div className="w-full max-w-xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-8 pb-6 border-b border-gray-100">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Your Company Pension Estimate
          </h1>
          <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on your employment history, here&apos;s your estimated company pension refund.
          </p>
        </div>

        {/* Total Refund Box */}
        <div
          className="rounded-xl p-6 mb-6 flex items-center justify-center gap-3"
          style={{ backgroundColor: 'var(--vbl-accent-lime)', color: 'var(--vbl-sidebar-dark)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--vbl-sidebar-dark)' }}
          >
            <Check className="w-5 h-5 text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium opacity-90">Total company pension refund</p>
            <p className="text-4xl font-bold mt-1" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              &euro;{formatCurrency(totalRefund || result?.vblKlassik || 0)}
            </p>
          </div>
        </div>

        {/* Per-provider breakdown (when multiple providers) */}
        {result?.providerBreakdown && result.providerBreakdown.length > 1 && (
          <div className="rounded-xl p-4 mb-6 border border-gray-200">
            {result.providerBreakdown.map((item) => (
              <div key={item.provider} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700">{item.provider}</span>
                <span className="text-sm font-semibold text-gray-900">
                  &euro;{formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Info box about transfers — only for public sector 2+ jobs with different providers */}
        {showTransferredBalancesInfo && (
          <div
            className="rounded-xl p-4 mb-8 border"
            style={{ backgroundColor: 'rgba(159, 232, 112, 0.1)', borderColor: 'rgba(159, 232, 112, 0.3)' }}
          >
            <p className="text-sm text-gray-700">
              If you changed jobs within the public sector, earlier company pension balances may have been
              transferred to your last pension scheme. Your estimate already includes this.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={() => handleStartClaim()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Start claim
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
