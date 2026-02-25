'use client';

import { useVBLCalculator } from '@/hooks/useVBLCalculator';

interface QualificationStep2Props {
  onNext: () => void;
  onBack: () => void;
}

export default function QualificationStep2({ onNext, onBack }: QualificationStep2Props) {
  const { formData, updateFormData } = useVBLCalculator();
  const selectedValue = formData.qualification?.lastContribution || '';

  const handleSelect = (value: 'less_than_2_years' | 'more_than_2_years') => {
    updateFormData({
      qualification: {
        contributionDuration: formData.qualification?.contributionDuration || '',
        lastContribution: value,
        nationality: formData.qualification?.nationality || '',
        currentResidence: formData.qualification?.currentResidence || '',
      },
    });
  };

  const canProceed = selectedValue !== '';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl flex flex-col" style={{ minHeight: '600px' }}>
        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          {/* Progress Indicator */}
          <div className="text-center mb-8">
            <span className="text-sm text-gray-500 font-medium">2/5</span>
          </div>

          {/* Question */}
          <h2 className="text-4xl md:text-5xl font-semibold text-[#221E49] mb-16 text-center leading-tight">
            When was your last pension contribution<br />in Germany?
          </h2>

          {/* Options - Horizontal Layout */}
          <div className="flex gap-6 justify-center">
            <button
              onClick={() => handleSelect('more_than_2_years')}
              className={`px-10 py-5 rounded-xl transition-all ${
                selectedValue === 'more_than_2_years'
                  ? 'bg-[#50C9A5] text-[#221E49]'
                  : 'bg-white text-[#221E49] border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedValue === 'more_than_2_years'
                      ? 'border-[#221E49]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedValue === 'more_than_2_years' && (
                    <div className="w-3 h-3 bg-[#221E49] rounded-full" />
                  )}
                </div>
                <span className="text-lg font-medium">More than 2 years ago</span>
              </div>
            </button>

            <button
              onClick={() => handleSelect('less_than_2_years')}
              className={`px-10 py-5 rounded-xl transition-all ${
                selectedValue === 'less_than_2_years'
                  ? 'bg-[#50C9A5] text-[#221E49]'
                  : 'bg-white text-[#221E49] border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedValue === 'less_than_2_years'
                      ? 'border-[#221E49]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedValue === 'less_than_2_years' && (
                    <div className="w-3 h-3 bg-[#221E49] rounded-full" />
                  )}
                </div>
                <span className="text-lg font-medium">Less than two years ago</span>
              </div>
            </button>
          </div>
        </div>

        {/* Navigation - At bottom of container */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#221E49] font-medium text-lg hover:opacity-70 transition-opacity"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`px-16 py-4 rounded-lg font-medium text-lg transition-colors ${
              canProceed
                ? 'bg-[#7DD3FC] text-[#221E49] hover:bg-[#60C5F0]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
