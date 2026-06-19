'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
] as const;

function parseDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { day: '', month: '', year: '' };
  return {
    day: String(Number(match[3])),
    month: String(Number(match[2])),
    year: match[1],
  };
}

function toIsoDate(day: string, month: string, year: string): string | null {
  if (!day || !month || !/^\d{4}$/.test(year)) return null;

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

interface DatePartsInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  disableFuture?: boolean;
}

export const DatePartsInput: React.FC<DatePartsInputProps> = ({
  label,
  value,
  onChange,
  helperText,
  disableFuture = true,
}) => {
  const parsed = parseDateParts(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
  const [touched, setTouched] = useState(false);

  const updateParts = (nextDay: string, nextMonth: string, nextYear: string) => {
    setTouched(true);
    const isoDate = toIsoDate(nextDay, nextMonth, nextYear);

    if (!isoDate) {
      onChange('');
      return;
    }

    if (disableFuture && new Date(`${isoDate}T00:00:00Z`) > new Date()) {
      onChange('');
      return;
    }

    onChange(isoDate);
  };

  const hasAnyValue = day !== '' || month !== '' || year !== '';
  const isComplete = day !== '' && month !== '' && year !== '';
  const hasError = touched && hasAnyValue && !value;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="grid grid-cols-[0.8fr_1.4fr_1fr] gap-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={day}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
            setDay(next);
            updateParts(next, month, year);
          }}
          placeholder="Day"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
        />
        <div className="relative">
          <select
            value={month}
            onChange={(e) => {
              const next = e.target.value;
              setMonth(next);
              updateParts(day, next, year);
            }}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">Month</option>
            {MONTHS.map((monthName, index) => (
              <option key={monthName} value={String(index + 1)}>
                {monthName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={year}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
            setYear(next);
            updateParts(day, month, next);
          }}
          placeholder="Year"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
        />
      </div>
      {helperText && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}
      {hasError && (
        <p className="mt-2 text-sm font-medium text-red-700">
          {isComplete
            ? disableFuture
              ? 'Enter a valid date that is not in the future.'
              : 'Enter a valid date.'
            : 'Enter day, month, and a 4-digit year.'}
        </p>
      )}
    </div>
  );
};
