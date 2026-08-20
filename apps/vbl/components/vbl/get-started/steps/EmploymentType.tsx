'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { EmploymentType as EmploymentTypeValue } from '@/components/vbl/get-started/flows';

const EMPLOYMENT_OPTIONS = [
  {
    id: 'private_sector',
    employmentType: 'private_sector' as EmploymentTypeValue,
    label: 'bAV / Company Pension Cash-Out',
    description: 'For Direktversicherung and other bAV contracts.',
    icon: '/assets/get-started/pension-type-bav.png',
    iconWidth: 53,
    iconHeight: 53,
  },
  {
    id: 'public_sector',
    employmentType: 'public_sector' as EmploymentTypeValue,
    label: 'VBL / ZVK Refund',
    description: 'For public-sector company pensions.',
    icon: '/assets/get-started/pension-type-public.svg',
    iconWidth: 48,
    iconHeight: 48,
  },
  {
    id: 'stage_performing_arts',
    employmentType: 'stage_performing_arts' as EmploymentTypeValue,
    label: 'VddB / VddKO Refund',
    description: 'For stage, theatre and orchestra pensions.',
    icon: '/assets/get-started/pension-type-stage.svg',
    iconWidth: 62,
    iconHeight: 53,
  },
] as const;

type StartOptionId = (typeof EMPLOYMENT_OPTIONS)[number]['id'];

export const EmploymentType: React.FC = () => {
  const { data, goNext } = useEligibility();
  const initialSelected =
    EMPLOYMENT_OPTIONS.find(
      (option) => option.employmentType === data.employmentType
    )?.id || 'private_sector';
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
        <h2 className="text-[24px] font-semibold leading-8 tracking-[-0.36px] text-[#0E0F0B]">
          What do you want to start?
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-6 tracking-[-0.08px] text-[#454846]">
          Choose the pension type so we can check whether your cash-out or
          refund can be started through CompanyPension.
        </p>
      </div>

      <p className="mb-3 text-[14px] font-semibold text-[#454745]">
        Pension type
      </p>

      <div className="space-y-4">
        {EMPLOYMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`flex h-[90px] w-full items-center gap-6 rounded-[10px] border px-4 py-4 text-left transition ${
                isSelected
                  ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                  : 'border-[#A9A9A9] bg-white text-[#111827] hover:border-[#163300]'
              }`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center">
                <img
                  src={option.icon}
                  alt=""
                  width={option.iconWidth}
                  height={option.iconHeight}
                  className="max-h-full w-auto max-w-none object-contain"
                />
              </span>
              <span>
                <span className="block text-[16px] font-semibold leading-7 tracking-[0.1px] text-[#0E0F0B]">
                  {option.label}
                </span>
                <span className="block text-[16px] leading-6 tracking-[-0.08px] text-[#454846]">
                  {option.description}
                </span>
              </span>
              <ArrowRight
                className={`ml-auto mr-2 h-5 w-5 shrink-0 ${
                  isSelected ? 'text-[#163300]' : 'text-[#454846]'
                }`}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mx-auto mt-14 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Start check
        <img
          src="/assets/get-started/pension-type-arrow.svg"
          alt=""
          width={16}
          height={16}
          className="h-4 w-4"
        />
      </button>
    </div>
  );
};

export default EmploymentType;
