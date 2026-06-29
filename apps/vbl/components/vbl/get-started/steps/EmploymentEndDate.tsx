'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, Info } from 'lucide-react';
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
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          When did your employment end?
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
      </div>

      <p className="mb-2 text-[15px] font-semibold text-[#4A4F58]">
        Employment end date
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-12 w-full cursor-pointer appearance-none rounded-[8px] border border-[#D3DAE8] bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
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
            className="h-12 w-full cursor-pointer appearance-none rounded-[8px] border border-[#D3DAE8] bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
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

      {month && year && !isFutureDate && (
        <div className="mt-3 flex items-start gap-4 rounded-[10px] bg-[#EEF6EA] px-6 py-4 text-[#3F464F]">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5A9A23]">
            <Info className="h-4 w-4 text-white" />
          </div>
          <p className="text-[15px] leading-6">
            Your employment end date is needed to check whether the 24-month
            waiting period has been met.
          </p>
        </div>
      )}

      {isFutureDate && (
        <p className="mt-3 text-sm font-medium text-red-700" aria-live="polite">
          Employment end date cannot be in the future.
        </p>
      )}

      <button
        onClick={handleContinue}
        disabled={!month || !year || isFutureDate}
        className="mx-auto mt-16 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default EmploymentEndDate;
