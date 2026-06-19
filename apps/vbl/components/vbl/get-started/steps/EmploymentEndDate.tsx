'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';

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

export const EmploymentEndDate: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [month, setMonth] = useState(data.employmentEndMonth || '');
  const [year, setYear] = useState(data.employmentEndYear || '');
  const selectedMonthIndex = MONTHS.indexOf(month);
  const selectedYear = Number(year);
  const now = new Date();
  const isFutureDate =
    selectedMonthIndex >= 0 &&
    Number.isFinite(selectedYear) &&
    (selectedYear > now.getFullYear() ||
      (selectedYear === now.getFullYear() &&
        selectedMonthIndex > now.getMonth()));

  const handleContinue = () => {
    if (!month || !year || isFutureDate) return;
    goNext({ employmentEndMonth: month, employmentEndYear: year });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        When did your employment end?
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-6" />

      <p className="text-sm font-medium text-gray-700 mb-2">
        Employment end date
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
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
            value={year}
            onChange={(e) => setYear(e.target.value)}
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

      {isFutureDate && (
        <p className="mb-6 text-sm font-medium text-red-700" aria-live="polite">
          Employment end date cannot be in the future.
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={!month || !year || isFutureDate}
        className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default EmploymentEndDate;
