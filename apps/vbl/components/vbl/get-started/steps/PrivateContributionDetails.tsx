'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, Info } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { EmployerPaidType } from '@/components/vbl/get-started/flows';

const MONTHS = [
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

// Client #2: mirror calculator — earliest supported year is 2004.
const YEARS = Array.from(
  { length: new Date().getFullYear() - 2004 + 1 },
  (_, i) => (2004 + i).toString()
).reverse();

export const PrivateContributionDetails: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [startMonth, setStartMonth] = useState(
    data.contributionStartMonth || ''
  );
  const [startYear, setStartYear] = useState(
    data.contributionStartYear || ''
  );
  const [endMonth, setEndMonth] = useState(data.contributionEndMonth || '');
  const [endYear, setEndYear] = useState(data.contributionEndYear || '');
  const [monthlyAmount, setMonthlyAmount] = useState(
    data.averageMonthlyContribution || ''
  );
  const [employerPaid, setEmployerPaid] = useState<EmployerPaidType>(
    data.employerPaidContributions || ''
  );

  const canContinue =
    startMonth !== '' &&
    startYear !== '' &&
    endMonth !== '' &&
    endYear !== '' &&
    employerPaid !== '';

  const handleContinue = () => {
    if (!canContinue) return;
    goNext({
      contributionStartMonth: startMonth,
      contributionStartYear: startYear,
      contributionEndMonth: endMonth,
      contributionEndYear: endYear,
      averageMonthlyContribution: monthlyAmount,
      employerPaidContributions: employerPaid,
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Contribution details
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Provide details about your pension contributions.
      </p>

      {/* Contribution start */}
      <p className="text-sm font-medium text-gray-700 mb-2">
        Contribution start
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="relative">
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700"
          >
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Contribution end */}
      <p className="text-sm font-medium text-gray-700 mb-2">
        Contribution end
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="relative">
          <select
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700"
          >
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Average monthly contribution (optional) */}
      <p className="text-sm font-medium text-gray-700 mb-2">
        Average monthly contribution{' '}
        <span className="text-gray-400 font-normal">(optional)</span>
      </p>
      {/* Client #1: numeric-only (strip non-digits on paste/type) */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={monthlyAmount}
        onChange={(e) => setMonthlyAmount(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="E.g., 350"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all text-gray-700 mb-4"
      />

      {/* Employer paid contributions */}
      <p className="text-sm font-medium text-gray-700 mb-3">
        Were contributions paid via your employer?
      </p>
      <div className="flex gap-3 mb-4">
        {(
          [
            { value: 'yes', label: 'Yes' },
            { value: 'not_sure', label: 'Not sure' },
          ] as const
        ).map(({ value, label }) => {
          const isSelected = employerPaid === value;
          return (
            <button
              key={value}
              onClick={() => setEmployerPaid(value)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all ${
                isSelected
                  ? 'bg-[#9FE870] text-[#163300] border-[#9FE870]'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F0FDE4] mb-6">
        <div className="w-8 h-8 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-[#163300]" />
        </div>
        <p className="text-sm text-[#163300]">
          Estimates are sufficient. We will verify the details later if needed.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PrivateContributionDetails;
