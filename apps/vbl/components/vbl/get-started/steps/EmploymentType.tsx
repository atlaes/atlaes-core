'use client';

import React, { useState } from 'react';
import {
  Landmark,
  Drama,
  Building2,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { EmploymentType as EmploymentTypeValue } from '@/components/vbl/get-started/flows';

const EMPLOYMENT_OPTIONS = [
  {
    id: 'public_sector' as EmploymentTypeValue,
    label: 'Public sector',
    icon: Landmark,
  },
  {
    id: 'stage_performing_arts' as EmploymentTypeValue,
    label: 'Stage / Performing Arts/ Orchestra',
    icon: Drama,
  },
  {
    id: 'private_sector' as EmploymentTypeValue,
    label: 'Private Sector',
    icon: Building2,
  },
];

export const EmploymentType: React.FC = () => {
  const { data, goNext } = useEligibility();
  const [selected, setSelected] = useState<EmploymentTypeValue>(
    data.employmentType || ''
  );

  const handleContinue = () => {
    if (!selected) return;
    goNext({ employmentType: selected });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Let&apos;s check your eligibility
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Answer a few questions to see if you qualify for a company pension
        payout.
      </p>

      <p className="text-sm font-medium text-gray-700 mb-3">
        Employment type
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {EMPLOYMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 pt-6 rounded-lg border-2 transition-all min-h-[120px] ${
                isSelected
                  ? 'bg-[#F0FDE4] border-[#9FE870]'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Selection indicator */}
              <div
                className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-[#9FE870]' : 'border-2 border-gray-300'
                }`}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-[#163300]" />
                )}
              </div>

              <Icon
                className={`w-8 h-8 ${
                  isSelected ? 'text-[#163300]' : 'text-gray-500'
                }`}
              />
              <span
                className={`text-xs font-medium text-center leading-tight ${
                  isSelected ? 'text-[#163300]' : 'text-gray-600'
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {selected === 'private_sector' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-[#F0FDE4] mb-4">
          <div className="w-8 h-8 rounded-full bg-[#9FE870] flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-[#163300]" />
          </div>
          <p className="text-sm text-[#163300]">
            Private sector company pensions usually do not allow a direct
            refund. A lump-sum settlement (Abfindung) may be possible depending
            on the scheme.
          </p>
        </div>
      )}

      {selected !== 'private_sector' && <div className="mb-2" />}

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default EmploymentType;
