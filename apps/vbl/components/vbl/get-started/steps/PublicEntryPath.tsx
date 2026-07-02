'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Info, Pencil, Upload } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { EntryPathType } from '@/components/vbl/get-started/flows';

const OPTIONS: {
  id: Exclude<EntryPathType, ''>;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'upload',
    title: 'Upload document',
    description:
      "We'll use it to identify the provider, pension type and key details for this check.",
    icon: Upload,
  },
  {
    id: 'manual',
    title: 'Answer questions',
    description:
      'Continue without upload. You can add documents later in your secure claim.',
    icon: Pencil,
  },
];

export const PublicEntryPath: React.FC = () => {
  const { data, goNext, goBack } = useEligibility();
  const isStage = data.employmentType === 'stage_performing_arts';
  const isPrivate = data.employmentType === 'private_sector';
  const [selected, setSelected] = useState<EntryPathType>(
    (isPrivate
      ? data.privateEntryPath
      : isStage
        ? data.stageEntryPath
        : data.publicEntryPath) || ''
  );

  const handleContinue = () => {
    if (!selected) return;
    if (isPrivate) {
      goNext({ privateEntryPath: selected });
      return;
    }
    goNext(
      isStage ? { stageEntryPath: selected } : { publicEntryPath: selected }
    );
  };

  const heading = isPrivate
    ? 'Upload your pension statement or continue manually'
    : 'Upload your pension document or continue manually';
  const description = isPrivate
    ? 'A pension statement can help us check your case faster. You can also continue without uploading a document.'
    : 'A pension document can help us check your case faster. You can also continue by answering a few questions.';

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          {heading}
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-6 text-[#4B5563]">
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={`flex min-h-[110px] w-full items-center gap-6 rounded-[8px] border px-7 py-5 text-left transition ${
                isSelected
                  ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                  : 'border-[#AEB4BF] bg-white text-[#111827] hover:border-[#163300]'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] ${
                  isSelected ? 'bg-white/55' : 'bg-[#E5E7EB]'
                }`}
              >
                <Icon className="h-6 w-6 text-[#9CA3AF]" />
              </span>
              <span>
                <span className="block text-[17px] font-bold">
                  {option.title}
                </span>
                <span className="mt-1 block text-[16px] leading-6 text-[#4B5563]">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 px-6 text-[14px] leading-5 text-[#3F464F]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3F464F]" />
        <p>
          You can upload only the relevant page. If you continue, the document
          can be carried into your secure claim so you do not need to upload it
          again.
        </p>
      </div>

      <div className="mt-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] border border-[#D3DAE8] bg-white px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:border-[#AEB4BF]"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] bg-[#9FE870] px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continue
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default PublicEntryPath;
