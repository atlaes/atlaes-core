'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import { EligibilityData } from '@/components/vbl/get-started/flows';

type YesNo = 'yes' | 'no' | '';

type YesNoField = {
  [K in keyof EligibilityData]: EligibilityData[K] extends YesNo ? K : never;
}[keyof EligibilityData];

export interface PublicQuestion<F extends YesNoField> {
  field: F;
  question: string;
  helper?: string;
}

interface PublicQuestionnaireProps<F extends YesNoField> {
  title: string;
  subtitle: string;
  questions: PublicQuestion<F>[];
}

const RadioRow: React.FC<{
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}> = ({ name, label, checked, onChange }) => (
  <label
    className={`flex h-10 cursor-pointer items-center gap-3 rounded-md border px-5 text-sm font-medium transition ${
      checked
        ? 'border-[#9FE870] bg-[#9FE870]/20 text-[#163300]'
        : 'border-[#D7DCE8] bg-[#EEF1EE] text-[#163300]'
    }`}
  >
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-3 w-3 accent-[#9FE870]"
    />
    {label}
  </label>
);

// Shared yes/no questionnaire screen for the public-sector eligibility
// check. Both the manual four-question screen (Figma 2346-3635) and the
// upload-path two-question screen (Figma 2346-5922) render through it; the
// flow config decides which answers block the refund.
export function PublicQuestionnaire<F extends YesNoField>({
  title,
  subtitle,
  questions,
}: PublicQuestionnaireProps<F>) {
  const { data, goNext } = useEligibility();
  const [answers, setAnswers] = useState<Record<F, YesNo>>(() =>
    questions.reduce(
      (acc, { field }) => ({ ...acc, [field]: data[field] || '' }),
      {} as Record<F, YesNo>
    )
  );

  const canContinue = questions.every(({ field }) => answers[field] !== '');

  const handleContinue = () => {
    if (!canContinue) return;
    goNext(answers as Partial<EligibilityData>);
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-9 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          {title}
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
          {subtitle}
        </p>
      </div>

      <div className="space-y-7">
        {questions.map(({ field, question, helper }, index) => (
          <fieldset key={field} className="border-0 p-0">
            <legend className="mb-3 text-sm font-bold text-gray-800">
              {index + 1}. {question}
            </legend>
            <div className="space-y-3">
              <RadioRow
                name={field}
                label="Yes"
                checked={answers[field] === 'yes'}
                onChange={() =>
                  setAnswers((prev) => ({ ...prev, [field]: 'yes' }))
                }
              />
              <RadioRow
                name={field}
                label="No"
                checked={answers[field] === 'no'}
                onChange={() =>
                  setAnswers((prev) => ({ ...prev, [field]: 'no' }))
                }
              />
            </div>
            {helper && (
              <p className="mt-3 text-sm leading-5 text-gray-600">{helper}</p>
            )}
          </fieldset>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="mx-auto mt-14 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export default PublicQuestionnaire;
