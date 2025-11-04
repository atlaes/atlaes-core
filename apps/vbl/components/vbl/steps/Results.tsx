'use client';

import React, { useState, useEffect } from 'react';
import { StepContainer } from '../StepContainer';
import { useVBLCalculator } from '../../../hooks/useVBLCalculator';
import { Loader2, AlertCircle } from 'lucide-react';
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
}

export const Results: React.FC = () => {
  const { formData, resetForm } = useVBLCalculator();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    calculateRefund();
  }, []);

  // Helper function to convert YYYY-MM to YYYY-MM-DD
  const formatDateToYYYYMMDD = (dateString: string): string => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    // If in YYYY-MM format, append -01 for first day of month
    if (dateString.match(/^\d{4}-\d{2}$/)) return `${dateString}-01`;
    return dateString;
  };

  // Helper function to determine if state is in West Germany
  const isWestGermanyState = (state: string): boolean => {
    const westGermanyStates = [
      'Baden-Württemberg',
      'Bavaria',
      'West Berlin',
      'Bremen',
      'Hamburg',
      'Hesse',
      'Lower Saxony',
      'North Rhine-Westphalia',
      'Rhineland-Palatinate',
      'Saarland',
      'Schleswig-Holstein',
    ];
    return westGermanyStates.includes(state);
  };

  // Helper function to calculate total months contributed
  const calculateMonthsContributed = (jobs: typeof formData.jobs): number => {
    return jobs.reduce((total, job) => {
      if (!job.startDate || !job.endDate) return total;
      const start = new Date(formatDateToYYYYMMDD(job.startDate));
      const end = new Date(formatDateToYYYYMMDD(job.endDate));
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      return total + months;
    }, 0);
  };

  const calculateRefund = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Check if at least one job is in West Germany
      const hasWestGermanyJob = formData.jobs.some(job => isWestGermanyState(job.location));

      // Calculate total months contributed
      const monthsContributed = calculateMonthsContributed(formData.jobs);

      // Transform formData to API payload
      const payload = {
        userType: formData.userType || 'insured_person',
        dateOfBirth: formData.dateOfBirth || '1980-01-01',
        currentAge: formData.currentAge || 40,
        employmentStart: formatDateToYYYYMMDD(formData.jobs[0]?.startDate || ''),
        employmentEnd: formatDateToYYYYMMDD(formData.jobs[formData.jobs.length - 1]?.endDate || ''),
        isWestGermany: hasWestGermanyJob,
        monthsContributed: monthsContributed,
        consecutiveMonthsContributed: monthsContributed, // Using same value for now
        hasLeftPublicSector: true,
        isWorkingInPublicSectorEU: false,
        hasMovedContributions: false,
        hasPaidVBLExtra: formData.jobs.some(j => j.supplementaryPension === 'VBLextra'),
        isStageOrchestra: false,
        periods: formData.jobs.map((job) => ({
          startDate: formatDateToYYYYMMDD(job.startDate),
          endDate: formatDateToYYYYMMDD(job.endDate),
          state: job.location,
          grossMonthlySalary: job.monthlyIncome,
          publicSector: job.employmentType === 'Public Sector',
        })),
      };

      const response = await apiClient.post('/vbl/calculate', payload);

      if (response.data.success) {
        setResult(response.data.calculation);
      } else {
        setError(response.data.error || 'Calculation failed');
      }
    } catch (err: any) {
      console.error('VBL calculation error:', err);
      if (err.response?.data?.error) {
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

  const handleCheckEligibility = () => {
    // In real app, this might navigate to an eligibility check page or form
    console.log('Check eligibility clicked');
  };

  const handleBack = () => {
    resetForm();
  };

  if (isLoading) {
    return (
      <StepContainer
        title="Calculating Your Refund"
        description="Please wait while we process your information..."
        showBackButton={false}
        showNextButton={false}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-16 h-16 text-[#50C9A5] animate-spin mb-4" />
          <p className="text-gray-600" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            Processing...
          </p>
        </div>
      </StepContainer>
    );
  }

  if (error) {
    return (
      <StepContainer
        title="Calculation Error"
        description="We encountered an issue processing your request"
        showBackButton={true}
        showNextButton={false}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-red-600 text-center max-w-md" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
            {error}
          </p>
          <button
            onClick={calculateRefund}
            className="mt-6 px-6 py-3 bg-[#50C9A5] text-white rounded-lg hover:bg-[#45b894] font-semibold"
            style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
          >
            Try Again
          </button>
        </div>
      </StepContainer>
    );
  }

  return (
    <div className="flex-1 min-h-screen flex flex-col" style={{ background: '#F7F8F6' }}>
      {/* Header */}
      <div className="px-12 py-6 border-b border-gray-200" style={{ background: '#F7F8F6' }}>
        <p className="text-right text-sm" style={{ color: 'var(--vbl-color-gray)' }}>
          <span style={{ color: 'var(--vbl-color-black)' }}>German Pension Refund Calculator</span>
          {' - '}
          <span style={{ color: 'var(--vbl-color-accent)' }}>Easy, Fast & Secure</span>
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="vbl-style-5 mb-3">Pension Refund Amount</h1>
            <p className="vbl-style-2">Your estimated pension refund amount is:</p>
          </div>

          {/* Results Box */}
          <div
            className="border-4 rounded-2xl p-12 mb-8"
            style={{ borderColor: 'var(--vbl-color-primary)' }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span
                  className="text-2xl font-semibold"
                  style={{
                    fontFamily: 'var(--vbl-font-montserrat)',
                    color: 'var(--vbl-color-black)',
                  }}
                >
                  State Pension:
                </span>
                <span
                  className="text-4xl font-bold"
                  style={{
                    fontFamily: 'var(--vbl-font-montserrat)',
                    color: 'var(--vbl-color-accent)',
                  }}
                >
                  {formatCurrency(result?.statePension || result?.baseRefundAmount || 0)} €
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="text-2xl font-semibold"
                  style={{
                    fontFamily: 'var(--vbl-font-montserrat)',
                    color: 'var(--vbl-color-black)',
                  }}
                >
                  VBLklassik:
                </span>
                <span
                  className="text-4xl font-bold"
                  style={{
                    fontFamily: 'var(--vbl-font-montserrat)',
                    color: 'var(--vbl-color-accent)',
                  }}
                >
                  {formatCurrency(result?.vblKlassik || result?.vatAmount || 0)} €
                </span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-center mb-12">
            <p className="text-base text-gray-700" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              You have contributed to the German pension scheme for{' '}
              <strong>[{result?.monthsContributed || 'xy'}]</strong> months.
            </p>
            <p className="text-base text-gray-700 mt-2" style={{ fontFamily: 'var(--vbl-font-montserrat)' }}>
              Depending on your nationality, qualifying for a retirement pension may disqualify you from claiming a
              refund.
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              <span className="font-semibold">← Back</span>
            </button>

            <button
              onClick={handleCheckEligibility}
              className="px-8 py-3 rounded-lg font-semibold bg-[#50C9A5] text-white hover:bg-[#45b894] shadow-md transition-all duration-200"
              style={{ fontFamily: 'var(--vbl-font-montserrat)' }}
            >
              Check Eligibility
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
