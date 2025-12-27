'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  calculationDetails?: {
    contributionPeriod: number;
    consecutivePeriod: number;
    ageAtEmploymentEnd: number;
    westGermanyEligible: boolean;
    timeSinceEmploymentEnd: number;
  };
}

export const Results: React.FC = () => {
  const router = useRouter();
  const { formData, updateFormData, resetForm } = useVBLCalculator();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    calculateRefund();
  }, []);

  const calculateRefund = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Use the simplified API - just send the job data directly!
      const payload = {
        jobs: formData.jobs.map((job) => ({
          location: job.location,
          employmentType: job.employmentType,
          supplementaryPension: job.supplementaryPension,
          startDate: job.startDate,
          endDate: job.endDate,
          monthlyIncome: job.monthlyIncome,
        })),
        // Optional fields (if collected in the future)
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
        ...(formData.currentAge && { currentAge: formData.currentAge }),
        ...(formData.userType && { userType: formData.userType }),
      };

      const response = await apiClient.post('/vbl/calculate-simple', payload);

      if (response.data.success) {
        setResult(response.data.calculation);

        // Store the calculation results in the context for later use
        updateFormData({
          calculationResult: {
            statePension: response.data.calculation.statePension || 0,
            vblKlassik: response.data.calculation.vblKlassik || 0,
            totalMonths: response.data.calculation.monthsContributed || 0,
          },
        });
      } else {
        setError(response.data.error || 'Calculation failed');
      }
    } catch (err: any) {
      console.error('VBL calculation error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error details:', JSON.stringify(err.response?.data, null, 2));

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

  const handleCheckEligibility = () => {
    // Navigate to qualification flow
    router.push('/calculator/qualification/1');
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
              <strong>{result?.calculationDetails?.contributionPeriod || result?.monthsContributed || 'N/A'}</strong> months.
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
