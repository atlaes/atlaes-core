'use client';

import React, { useState } from 'react';
import {
  Landmark,
  Drama,
  Building2,
  ArrowRight,
  HelpCircle,
  Info,
} from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { EmploymentType as EmploymentTypeValue } from '@/components/vbl/get-started/flows';

const EMPLOYMENT_OPTIONS = [
  {
    id: 'private_sector',
    employmentType: 'private_sector' as EmploymentTypeValue,
    label: 'bAV / Company Pension Cash-Out',
    description: 'For Direktversicherung and other bAV contracts.',
    icon: Building2,
  },
  {
    id: 'public_sector',
    employmentType: 'public_sector' as EmploymentTypeValue,
    label: 'VBL / ZVK Refund',
    description: 'For public-sector supplementary pensions.',
    icon: Landmark,
  },
  {
    id: 'stage_performing_arts',
    employmentType: 'stage_performing_arts' as EmploymentTypeValue,
    label: 'VddB / VddKO Refund',
    description: 'For stage, theatre and orchestra pensions.',
    icon: Drama,
  },
  {
    id: 'not_sure',
    employmentType: 'public_sector' as EmploymentTypeValue,
    label: 'Not sure',
    description: 'Answer a few questions or upload a document.',
    icon: HelpCircle,
  },
] as const;

type StartOptionId = (typeof EMPLOYMENT_OPTIONS)[number]['id'];

export const EmploymentType: React.FC = () => {
  const { data, goNext } = useEligibility();
  const initialSelected =
    EMPLOYMENT_OPTIONS.find(
      (option) => option.employmentType === data.employmentType
    )?.id || 'public_sector';
  const [selected, setSelected] = useState<StartOptionId>(initialSelected);

  const handleContinue = () => {
    if (!selected) return;
    const option = EMPLOYMENT_OPTIONS.find((item) => item.id === selected);
    if (!option) return;
    goNext({ employmentType: option.employmentType });
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          What do you want to start?
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-6 text-[#4B5563]">
          Choose the pension type so we can check whether your cash-out or
          refund can be started through CompanyPension.
        </p>
      </div>

      <p className="mb-3 text-[14px] font-semibold text-[#4A4F58]">
        Pension type
      </p>

      <div className="space-y-4">
        {EMPLOYMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          const Icon = option.icon;
          return (
            <React.Fragment key={option.id}>
              <button
                onClick={() => setSelected(option.id)}
                className={`flex min-h-[90px] w-full items-center gap-6 rounded-[8px] border px-5 py-4 text-left transition ${
                  isSelected
                    ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                    : 'border-[#AEB4BF] bg-white text-[#111827] hover:border-[#163300]'
                }`}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center">
                  <Icon
                    className="h-11 w-11 text-[#3F464F]"
                    strokeWidth={2.1}
                  />
                </span>
                <span>
                  <span className="block text-[17px] font-bold">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-[16px] leading-6 text-[#4B5563]">
                    {option.description}
                  </span>
                </span>
              </button>

              {option.id === 'private_sector' && isSelected && (
                <div className="flex items-start gap-4 rounded-[10px] bg-[#EEF6EA] px-6 py-4 text-[#3F464F]">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5A9A23]">
                    <Info className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[15px] leading-6">
                    bAV cash-outs depend on your provider, contract value and
                    whether the required conditions are met. We’ll check whether
                    your case can be started through CompanyPension.
                  </p>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mx-auto mt-14 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Start check
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default EmploymentType;
