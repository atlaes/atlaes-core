'use client';

import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import {
  StageContributionDurationType,
  StagePost2001ContributionDurationType,
  StagePost2018ContributionDurationType,
} from '@/components/vbl/get-started/flows';

type StageDurationOptionId =
  | Exclude<StageContributionDurationType, ''>
  | Exclude<StagePost2001ContributionDurationType, ''>
  | Exclude<StagePost2018ContributionDurationType, ''>;

type StageDurationConfig = {
  heading: string;
  selectedValue: StageDurationOptionId | '';
  options: {
    id: StageDurationOptionId;
    label: string;
  }[];
  getUpdate: (selected: StageDurationOptionId) => {
    stageContributionDuration?: StageContributionDurationType;
    stagePost2001ContributionDuration?: StagePost2001ContributionDurationType;
    stagePost2018ContributionDuration?: StagePost2018ContributionDurationType;
  };
};

const TOTAL_OPTIONS: StageDurationConfig['options'] = [
  { id: 'less_than_12', label: 'Less than 12 months' },
  { id: '12_to_35', label: '12 to 35 months' },
  { id: '36_to_119', label: '36 to 119 months' },
  { id: '120_plus', label: '120 months or more' },
];

const POST_2001_OPTIONS: StageDurationConfig['options'] = [
  { id: 'less_than_60', label: 'Less than 60 months' },
  { id: '60_plus', label: '60 months or more' },
];

const POST_2018_OPTIONS: StageDurationConfig['options'] = [
  { id: 'less_than_36', label: 'Less than 36 months' },
  { id: '36_plus', label: '36 months or more' },
];

function getConfig(
  currentStepId: string | null,
  data: ReturnType<typeof useEligibility>['data']
): StageDurationConfig {
  if (currentStepId === 'stage_post_2001_contribution_duration') {
    return {
      heading:
        'How many of those contribution months were after 1 January 2001?',
      selectedValue: data.stagePost2001ContributionDuration,
      options: POST_2001_OPTIONS,
      getUpdate: (selected) => ({
        stagePost2001ContributionDuration:
          selected as StagePost2001ContributionDurationType,
      }),
    };
  }

  if (currentStepId === 'stage_post_2018_contribution_duration') {
    return {
      heading:
        'How many of those contribution months were after 1 January 2018?',
      selectedValue: data.stagePost2018ContributionDuration,
      options: POST_2018_OPTIONS,
      getUpdate: (selected) => ({
        stagePost2018ContributionDuration:
          selected as StagePost2018ContributionDurationType,
      }),
    };
  }

  return {
    heading: 'How many VddB/VddKO contribution months do you have in total?',
    selectedValue: data.stageContributionDuration,
    options: TOTAL_OPTIONS,
    getUpdate: (selected) => ({
      stageContributionDuration: selected as StageContributionDurationType,
      stagePost2001ContributionDuration: '',
      stagePost2018ContributionDuration: '',
    }),
  };
}

const STAGE_LABEL = 'Contribution period';

export const StageContributionDuration: React.FC = () => {
  const { data, currentStepId, goNext } = useEligibility();
  const config = getConfig(currentStepId, data);
  const [selected, setSelected] = useState<StageDurationOptionId | ''>(
    config.selectedValue || ''
  );

  const handleContinue = () => {
    if (!selected) return;
    goNext(config.getUpdate(selected));
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          {config.heading}
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
      </div>

      <p className="mb-3 text-[15px] font-semibold text-[#4A4F58]">
        {STAGE_LABEL}
      </p>

      <div className="mb-6 space-y-3">
        {config.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={`flex min-h-[54px] w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-[16px] font-semibold transition-all ${
                isSelected
                  ? 'bg-[#9FE870] text-[#163300]'
                  : 'bg-[#EFF2F0] text-[#163300] hover:bg-[#E1E9DD]'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  isSelected ? 'bg-[#163300]' : 'border-2 border-[#C6CED6]'
                }`}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="mx-auto mt-16 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default StageContributionDuration;
