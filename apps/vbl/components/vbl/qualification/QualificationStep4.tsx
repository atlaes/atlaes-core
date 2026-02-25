'use client';

import { useVBLCalculator } from '@/hooks/useVBLCalculator';
import CountrySelect from './CountrySelect';

interface QualificationStep4Props {
  onNext: () => void;
  onBack: () => void;
}

export default function QualificationStep4({ onNext, onBack }: QualificationStep4Props) {
  const { formData, updateFormData } = useVBLCalculator();
  const selectedCountry = formData.qualification?.currentResidence || '';

  const handleCountryChange = (countryCode: string) => {
    updateFormData({
      qualification: {
        contributionDuration: formData.qualification?.contributionDuration || '',
        lastContribution: formData.qualification?.lastContribution || '',
        nationality: formData.qualification?.nationality || '',
        currentResidence: countryCode,
      },
    });
  };

  const canProceed = selectedCountry !== '';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl flex flex-col" style={{ minHeight: '600px' }}>
        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          {/* Progress Indicator */}
          <div className="text-center mb-8">
            <span className="text-sm text-gray-500 font-medium">4/5</span>
          </div>

          {/* Question */}
          <h2 className="text-4xl md:text-5xl font-semibold text-[#221E49] mb-16 text-center leading-tight">
            In which country do you currently live?
          </h2>

          {/* Country Selector */}
          <div className="w-full max-w-md">
            <CountrySelect
              value={selectedCountry}
              onChange={handleCountryChange}
              placeholder="Select your current country of residence"
            />
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
