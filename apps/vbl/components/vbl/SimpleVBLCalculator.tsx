'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';
import apiClient from '../../lib/api';

interface SimpleCalculationResult {
  isEligible: boolean;
  calculationMethod: string;
  baseRefundAmount: number;
  vatAmount: number;
  totalAmount: number;
  eligibilityReasons: string[];
  rulesApplied: string[];
}

const SimpleVBLCalculator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimpleCalculationResult | null>(null);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    userType: 'insured_person',
    dateOfBirth: '',
    currentAge: 0,
    employmentStart: '',
    employmentEnd: '',
    isWestGermany: true,
    monthsContributed: 0,
    consecutiveMonthsContributed: 0,
    hasLeftPublicSector: true,
    isWorkingInPublicSectorEU: false,
    hasPaidVBLExtra: false,
    hasMovedContributions: false,
    isStageOrchestra: false,
    retirementAge: 67,
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await apiClient.post('/vbl/calculate', formData);

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
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                VBL Refund Calculator
              </h2>
              <p className="text-sm text-gray-600">
                Calculate your eligibility for VBL supplementary pension refund
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">User Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Type
                </label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="insured_person">Insured Person</option>
                  <option value="widow">Widow</option>
                  <option value="orphan">Orphan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Age
                </label>
                <input
                  name="currentAge"
                  type="number"
                  min="0"
                  max="120"
                  value={formData.currentAge}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Employment Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Start
                </label>
                <input
                  name="employmentStart"
                  type="date"
                  value={formData.employmentStart}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment End
                </label>
                <input
                  name="employmentEnd"
                  type="date"
                  value={formData.employmentEnd}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Months Contributed
                </label>
                <input
                  name="monthsContributed"
                  type="number"
                  min="0"
                  value={formData.monthsContributed}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consecutive Months
                </label>
                <input
                  name="consecutiveMonthsContributed"
                  type="number"
                  min="0"
                  value={formData.consecutiveMonthsContributed}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  name="isWestGermany"
                  type="checkbox"
                  checked={formData.isWestGermany}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Employment was in West Germany
                </label>
              </div>

              <div className="flex items-center">
                <input
                  name="isStageOrchestra"
                  type="checkbox"
                  checked={formData.isStageOrchestra}
                  onChange={handleInputChange}
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
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  name="hasLeftPublicSector"
                  type="checkbox"
                  checked={formData.hasLeftPublicSector}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Has left the public sector
                </label>
              </div>

              <div className="flex items-center">
                <input
                  name="isWorkingInPublicSectorEU"
                  type="checkbox"
                  checked={formData.isWorkingInPublicSectorEU}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Currently working in public sector in EU/EEA/UK/Switzerland
                </label>
              </div>

              <div className="flex items-center">
                <input
                  name="hasPaidVBLExtra"
                  type="checkbox"
                  checked={formData.hasPaidVBLExtra}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Has paid VBL extra contributions
                </label>
              </div>

              <div className="flex items-center">
                <input
                  name="hasMovedContributions"
                  type="checkbox"
                  checked={formData.hasMovedContributions}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Has moved contributions to another insurance
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  userType: 'insured_person',
                  dateOfBirth: '',
                  currentAge: 0,
                  employmentStart: '',
                  employmentEnd: '',
                  isWestGermany: true,
                  monthsContributed: 0,
                  consecutiveMonthsContributed: 0,
                  hasLeftPublicSector: true,
                  isWorkingInPublicSectorEU: false,
                  hasPaidVBLExtra: false,
                  hasMovedContributions: false,
                  isStageOrchestra: false,
                  retirementAge: 67,
                });
                setResult(null);
                setError('');
              }}
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Calculating...' : 'Calculate Refund'}</span>
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-t border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="px-6 py-4 bg-green-50 border-t border-green-200">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {result.isEligible ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {result.isEligible ? 'Eligible for VBL Refund' : 'Not Eligible for VBL Refund'}
                </h3>
              </div>

              {result.isEligible && (
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Base Refund Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(result.baseRefundAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">VAT (19%)</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(result.vatAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(result.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Calculation Method</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {result.calculationMethod.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              )}

              {result.eligibilityReasons.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Eligibility Reasons:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.eligibilityReasons.map((reason, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-red-500">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.rulesApplied.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Rules Applied:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.rulesApplied.map((rule, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleVBLCalculator;
