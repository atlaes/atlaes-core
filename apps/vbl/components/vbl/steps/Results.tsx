'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVBLCalculator, JobData, RefundBreakdown, ResultScenario } from '../../../hooks/useVBLCalculator';
import { Loader2, AlertCircle, Check, ChevronLeft, ChevronRight, X, FileText } from 'lucide-react';
import apiClient from '../../../lib/api';

interface CalculationResult {
  isEligible: boolean;
  calculationMethod: string;
  baseRefundAmount: number;
  vatAmount: number;
  totalAmount: number;
  statePension?: number;
  vblKlassik?: number;
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
  // Check for private sector with "Others" pension - requires individual review
  const hasPrivateOthers = jobs.some(
    (job) =>
      job.employmentType === 'Private sector' &&
      job.supplementaryPensions.includes('Others')
  );
  if (hasPrivateOthers) return 'private_review';

  // Check for VBLextra + VBLklassik combination - not eligible due to vesting rule
  const hasVBLextraAndKlassik = jobs.some(
    (job) =>
      job.supplementaryPensions.includes('VBLextra') &&
      job.supplementaryPensions.includes('VBLklassik')
  );
  if (hasVBLextraAndKlassik) return 'not_eligible_vesting';

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
  const { formData, updateFormData, goToPreviousStep } = useVBLCalculator();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [breakdown, setBreakdown] = useState<RefundBreakdown[]>([]);
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
          const calculatedBreakdown = calculateProviderBreakdown(
            formData.jobs,
            apiResult
          );
          setBreakdown(calculatedBreakdown);

          const total = calculatedBreakdown.reduce((sum, item) => sum + item.amount, 0);
          setTotalRefund(total);

          updateFormData({
            calculationResult: {
              totalRefund: total,
              breakdown: calculatedBreakdown,
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

  const calculateProviderBreakdown = (
    jobs: JobData[],
    calcResult: CalculationResult
  ): RefundBreakdown[] => {
    const providerAmounts: Record<string, number> = {};

    const eligibleJobs = jobs.filter(
      (job) => job.employmentType !== 'Private sector' || job.supplementaryPensions.length > 0
    );

    eligibleJobs.forEach((job) => {
      job.supplementaryPensions.forEach((pension) => {
        if (pension && pension !== 'Others') {
          if (!providerAmounts[pension]) {
            providerAmounts[pension] = 0;
          }
        }
      });
    });

    const totalAmount = calcResult.vblKlassik || calcResult.totalAmount || 0;
    const providerCount = Object.keys(providerAmounts).length;

    if (providerCount > 0) {
      const amountPerProvider = Math.round(totalAmount / providerCount);
      Object.keys(providerAmounts).forEach((provider) => {
        providerAmounts[provider] = amountPerProvider;
      });
    }

    return Object.entries(providerAmounts).map(([provider, amount]) => ({
      provider,
      amount,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCheckEligibility = () => {
    router.push('/calculator/onboarding');
  };

  const handleBack = () => {
    goToPreviousStep();
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

  // Render: Private Review Required scenario
  if (scenario === 'private_review') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
            >
              Individual Review Required
            </h1>
            <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              Your pension provider requires an individual assessment.
            </p>
          </div>

          <div className="rounded-xl p-6 mb-6 bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-2">What happens next?</p>
                <p className="text-sm text-blue-800">
                  Because you have a private pension provider, we need to review your specific situation individually.
                  Our team will assess your eligibility for a potential &quot;Abfindung&quot; (lump-sum payment).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Go back
            </button>

            <button
              onClick={handleCheckEligibility}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
              style={{
                fontFamily: 'var(--vbl-font-montserrat)',
                backgroundColor: 'var(--vbl-accent-lime)',
                color: 'var(--vbl-sidebar-dark)',
              }}
            >
              Check Abfindung eligibility
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Not Eligible (VBLextra + VBLklassik vesting rule)
  if (scenario === 'not_eligible_vesting') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
            >
              Refund Not Available
            </h1>
            <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              Based on your pension combination, a refund is not possible.
            </p>
          </div>

          <div className="rounded-xl p-6 mb-6 bg-red-50 border border-red-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-900 mb-2">VBLextra + VBLklassik Combination</p>
                <p className="text-sm text-red-800">
                  When you have both VBLextra and VBLklassik contributions, the pension is considered vested
                  and cannot be refunded. This is due to the combined vesting rules of these two pension types.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center pt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Vested (from API response)
  if (scenario === 'vested') {
    return (
      <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
        <div className="w-full max-w-xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <h1
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
            >
              Refund Not Possible
            </h1>
            <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              Your pension contributions are vested.
            </p>
          </div>

          <div className="rounded-xl p-6 mb-6 bg-red-50 border border-red-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-900 mb-2">Pension is Vested</p>
                <p className="text-sm text-red-800">
                  Based on your contribution period and employment history, your pension has vested
                  and is no longer eligible for a refund. The contributions will be paid out as a
                  pension when you reach retirement age.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center pt-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Eligible - shows refund breakdown
  return (
    <div className="flex-1 bg-white p-8 flex flex-col justify-center rounded-2xl shadow-lg">
      <div className="w-full max-w-xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-8 pb-6 border-b border-gray-100">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
          >
            Your Supplementary Pension Estimate
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
              &euro;{formatCurrency(totalRefund || result?.totalAmount || 0)}
            </p>
          </div>
        </div>

        {/* Refund Breakdown */}
        {breakdown.length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-gray-800 mb-3">Refund Breakdown:</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {breakdown.map((item, index) => (
                <div
                  key={item.provider}
                  className={`flex items-center justify-between px-4 py-3 ${
                    index !== breakdown.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <span className="font-medium text-gray-700">{item.provider}</span>
                  <span className="font-bold text-gray-900">
                    &euro; {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
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
            onClick={handleCheckEligibility}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              fontFamily: 'var(--vbl-font-montserrat)',
              backgroundColor: 'var(--vbl-accent-lime)',
              color: 'var(--vbl-sidebar-dark)',
            }}
          >
            Claim refund
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
