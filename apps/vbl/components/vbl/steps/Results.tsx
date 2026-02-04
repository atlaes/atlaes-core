'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVBLCalculator, JobData, RefundBreakdown } from '../../../hooks/useVBLCalculator';
import { Loader2, AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
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
  calculationDetails?: {
    contributionPeriod: number;
    consecutivePeriod: number;
    ageAtEmploymentEnd: number;
    westGermanyEligible: boolean;
    timeSinceEmploymentEnd: number;
  };
}

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

  useEffect(() => {
    calculateRefund();
  }, []);

  const calculateRefund = async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        jobs: formData.jobs
          .filter((job) => job.employmentType !== 'Private sector')
          .map((job) => ({
            employmentType: job.employmentType,
            supplementaryPension: job.supplementaryPension,
            startDate: formatDateForAPI(job.startMonth, job.startYear),
            endDate: formatDateForAPI(job.endMonth, job.endYear),
          })),
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.currentAge && { currentAge: formData.currentAge }),
        ...(formData.userType && { userType: formData.userType }),
      };

      const response = await apiClient.post('/vbl/calculate-simple', payload);

      if (response.data.success) {
        setResult(response.data.calculation);

        const calculatedBreakdown = calculateProviderBreakdown(
          formData.jobs,
          response.data.calculation
        );
        setBreakdown(calculatedBreakdown);

        const total = calculatedBreakdown.reduce((sum, item) => sum + item.amount, 0);
        setTotalRefund(total);

        updateFormData({
          calculationResult: {
            totalRefund: total,
            breakdown: calculatedBreakdown,
            totalMonths: response.data.calculation.monthsContributed || 0,
          },
        });
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

    const eligibleJobs = jobs.filter((job) => job.employmentType !== 'Private sector');

    eligibleJobs.forEach((job) => {
      if (job.supplementaryPension) {
        if (!providerAmounts[job.supplementaryPension]) {
          providerAmounts[job.supplementaryPension] = 0;
        }
      }
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
            Start your claim
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
