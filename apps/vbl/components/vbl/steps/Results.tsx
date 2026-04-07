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

/**
 * Determine result scenario based on job data (client-side logic)
 */
const determineResultScenario = (jobs: JobData[], apiResult?: CalculationResult): ResultScenario => {
  // VBLextra alone → not eligible
  const hasVBLextra = jobs.some(
    (job) => job.supplementaryPensions.includes('VBLextra')
  );
  if (hasVBLextra) return 'not_eligible_vesting';

  // Any private sector job → private review
  const hasPrivateSector = jobs.some(
    (job) => job.employmentType === 'Private sector'
  );
  if (hasPrivateSector) return 'private_review';

  // Check API response for vesting status
  if (apiResult?.isVested) return 'vested';

  // Default: eligible for refund
  return 'eligible';
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDateForAPI = (month: string, year: string): string => {
  const monthIndex = MONTHS.indexOf(month) + 1;
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

    // Check for client-side scenario determination first (before API call)
    const clientScenario = determineResultScenario(formData.jobs);
    if (clientScenario === 'private_review' || clientScenario === 'not_eligible_vesting') {
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

        if (finalScenario === 'eligible') {
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

  const handleStartClaim = () => {
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

  // Render: Not Eligible — VBLextra (Screen 10)
  if (scenario === 'not_eligible_vesting') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto text-center">
          {/* Red X circle */}
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-white" />
          </div>

          <h1
            className="text-2xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Not eligible for a supplementary pension refund
          </h1>

          <p className="text-gray-600 text-sm mb-8" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Based on your information, your supplementary pension is <strong>vested</strong>.
            When contributions to <strong>VBLextra</strong> exist, any VBLklassik contributions are preserved
            as a <strong>future pension entitlement</strong> and cannot be refunded as a lump sum.
            This means your pension remains credited to you and may be paid out later as
            a <strong>regular pension benefit</strong> when you reach the German retirement age.
          </p>

          {/* Go back button */}
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

  // Render: Private Review Required (Screen 15)
  if (scenario === 'private_review') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
            >
              Your Company Pension Result
            </h1>
          </div>

          <p className="text-sm font-semibold text-gray-800 mb-3">Private company pensions</p>

          <div className="rounded-xl p-6 mb-6 border border-gray-200">
            <p className="font-semibold text-gray-900 mb-2">Individual review required for private schemes</p>
            <p className="text-sm text-gray-600">
              A lump-sum payout depends on the specific scheme and requires individual review.
            </p>
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to jobs
            </button>

            <button
              onClick={handleStartClaim}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              style={{
                fontFamily: 'var(--vbl-font-montserrat)',
                backgroundColor: 'var(--vbl-accent-lime)',
                color: 'var(--vbl-sidebar-dark)',
              }}
            >
              Start eligibility check
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Vested (Screen 16)
  if (scenario === 'vested') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
            >
              Company Pension Result
            </h1>
            <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              Based on your employment history, here&apos;s your estimated supplementary pension refund.
            </p>
          </div>

          <div className="rounded-xl p-6 mb-6 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Lump-sum payout not possible</p>
                <p className="text-sm text-gray-600">
                  Based on your contribution period and employment history, your pension has vested
                  and is no longer eligible for a refund. The contributions will be paid out as a
                  pension when you reach retirement age.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center pt-6 gap-4">
            <button
              onClick={handleBackToCalculator}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to calculator
            </button>

            <button
              onClick={handleReturnHome}
              className="text-sm text-gray-600 underline hover:text-gray-800 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              Return to homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show transferred balances info only for public sector with 2+ jobs
  // and different company pension providers (e.g., VBL + ZVK)
  const publicSectorJobs = formData.jobs.filter(
    (job) => job.employmentType === 'Public Sector'
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
            Based on your employment history, here&apos;s your estimated supplementary pension refund.
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
            <p className="text-sm font-medium opacity-90">Total supplementary pension refund:</p>
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
            onClick={handleStartClaim}
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
