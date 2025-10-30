'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calculator,
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
} from 'lucide-react';
import apiClient from '../../lib/api';

// Validation schema
const vblCalculationSchema = z.object({
  // User information
  userType: z.enum(['insured_person', 'widow', 'orphan']),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  currentAge: z.number().min(0).max(120),

  // Employment information
  employmentStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  employmentEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isWestGermany: z.boolean(),
  monthsContributed: z.number().min(0),
  consecutiveMonthsContributed: z.number().min(0).optional(),
  vblInsuranceNumber: z.string().optional(),

  // Additional information
  hasLeftPublicSector: z.boolean(),
  isWorkingInPublicSectorEU: z.boolean(),
  hasPaidVBLExtra: z.boolean(),
  hasMovedContributions: z.boolean(),

  // Stage/Orchestra specific
  isStageOrchestra: z.boolean(),
  hasOccupationalDisability: z.boolean().optional(),
  disabilityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  isMandatoryInsuranceRequired: z.boolean().optional(),
  retirementAge: z.number().min(50).max(80).optional(),
});

type VBLCalculationFormData = z.infer<typeof vblCalculationSchema>;

interface VBLCalculationResult {
  isEligible: boolean;
  eligibilityReasons: string[];
  calculationMethod: 'pre2018' | 'post2018' | 'stage_orchestra';
  baseRefundAmount: number;
  vatAmount: number;
  totalAmount: number;
  calculationDetails: {
    contributionPeriod: number;
    consecutivePeriod?: number;
    ageAtEmploymentEnd: number;
    westGermanyEligible: boolean;
    timeSinceEmploymentEnd: number;
  };
  rulesApplied: string[];
  warnings: string[];
}

const VBLCalculator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VBLCalculationResult | null>(null);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<VBLCalculationFormData>({
    resolver: zodResolver(vblCalculationSchema),
    defaultValues: {
      userType: 'insured_person',
      isWestGermany: true,
      hasLeftPublicSector: true,
      isWorkingInPublicSectorEU: false,
      hasPaidVBLExtra: false,
      hasMovedContributions: false,
      isStageOrchestra: false,
      retirementAge: 67,
    },
  });

  const isStageOrchestra = watch('isStageOrchestra');

  const onSubmit = async (data: VBLCalculationFormData) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await apiClient.post('/vbl/calculate', data);

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
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading calculator...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  VBL Refund Calculator
                </h2>
                <p className="text-sm text-gray-600">
                  Calculate your eligibility for VBL supplementary pension
                  refund
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Info className="h-4 w-4" />
              <span>View Rules</span>
            </button>
          </div>
        </div>

        {/* Rules Panel */}
        {showRules && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Eligibility Rules
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">
                  Public Service Sector
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Left public sector (not working in EU/EEA/UK/CH)</li>
                  <li>• Employment in West Germany</li>
                  <li>• Contribution period &lt; 60 months</li>
                  <li>• Only VBLklassik (no VBL extra)</li>
                  <li>• Age &lt; 69 years</li>
                  <li>• No contributions moved elsewhere</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">
                  Stage/Orchestra
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Minimum 12 months contribution</li>
                  <li>• Maximum 36 months (post-2003)</li>
                  <li>• Left employment with conditions</li>
                  <li>• 24 months passed OR disability OR other conditions</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              User Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Type
                </label>
                <select
                  {...register('userType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="insured_person">Insured Person</option>
                  <option value="widow">Widow</option>
                  <option value="orphan">Orphan</option>
                </select>
                {errors.userType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.userType.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  {...register('dateOfBirth')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Age
                </label>
                <input
                  {...register('currentAge', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.currentAge && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.currentAge.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Employment Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Start
                </label>
                <input
                  {...register('employmentStart')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.employmentStart && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.employmentStart.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment End
                </label>
                <input
                  {...register('employmentEnd')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.employmentEnd && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.employmentEnd.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Months Contributed
                </label>
                <input
                  {...register('monthsContributed', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.monthsContributed && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.monthsContributed.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VBL Insurance Number (Optional)
                </label>
                <input
                  {...register('vblInsuranceNumber')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  {...register('isWestGermany')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Employment was in West Germany
                </label>
              </div>

              <div className="flex items-center">
                <input
                  {...register('isStageOrchestra')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Stage/Orchestra employment (VddB/VddKO)
                </label>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Additional Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  {...register('hasLeftPublicSector')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Has left the public sector
                </label>
              </div>

              <div className="flex items-center">
                <input
                  {...register('isWorkingInPublicSectorEU')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Currently working in public sector in EU/EEA/UK/Switzerland
                </label>
              </div>

              <div className="flex items-center">
                <input
                  {...register('hasPaidVBLExtra')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Has paid VBL extra contributions
                </label>
              </div>

              <div className="flex items-center">
                <input
                  {...register('hasMovedContributions')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Has moved contributions to another insurance
                </label>
              </div>
            </div>
          </div>

          {/* Stage/Orchestra Specific Fields */}
          {isStageOrchestra && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Stage/Orchestra Specific
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retirement Age
                  </label>
                  <input
                    {...register('retirementAge', { valueAsNumber: true })}
                    type="number"
                    min="50"
                    max="80"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disability Date (Optional)
                  </label>
                  <input
                    {...register('disabilityDate')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    {...register('hasOccupationalDisability')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Has occupational disability
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...register('isMandatoryInsuranceRequired')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Mandatory insurance still required
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  <span>Calculate Refund</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start space-x-3">
              {result.isEligible ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {result.isEligible
                    ? 'Eligible for VBL Refund'
                    : 'Not Eligible for VBL Refund'}
                </h3>

                {result.isEligible ? (
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Base Refund Amount
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {formatCurrency(result.baseRefundAmount)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">VAT (19%)</p>
                        <p className="text-xl font-semibold text-gray-900">
                          {formatCurrency(result.vatAmount)}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-xl font-semibold text-blue-600">
                          {formatCurrency(result.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Calculation Details
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p>
                            <span className="font-medium">Method:</span>{' '}
                            {result.calculationMethod}
                          </p>
                          <p>
                            <span className="font-medium">
                              Contribution Period:
                            </span>{' '}
                            {result.calculationDetails.contributionPeriod}{' '}
                            months
                          </p>
                          {result.calculationDetails.consecutivePeriod && (
                            <p>
                              <span className="font-medium">
                                Consecutive Period:
                              </span>{' '}
                              {result.calculationDetails.consecutivePeriod}{' '}
                              months
                            </p>
                          )}
                        </div>
                        <div>
                          <p>
                            <span className="font-medium">
                              Age at Employment End:
                            </span>{' '}
                            {result.calculationDetails.ageAtEmploymentEnd} years
                          </p>
                          <p>
                            <span className="font-medium">West Germany:</span>{' '}
                            {result.calculationDetails.westGermanyEligible
                              ? 'Yes'
                              : 'No'}
                          </p>
                          <p>
                            <span className="font-medium">Time Since End:</span>{' '}
                            {result.calculationDetails.timeSinceEmploymentEnd}{' '}
                            months
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">
                        Eligibility Requirements Not Met
                      </h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {result.eligibilityReasons.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {result.rulesApplied.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-green-900 mb-2">
                      Rules Applied
                    </h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      {result.rulesApplied.map((rule, index) => (
                        <li key={index}>• {rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 border-t border-gray-200 bg-red-50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VBLCalculator;
