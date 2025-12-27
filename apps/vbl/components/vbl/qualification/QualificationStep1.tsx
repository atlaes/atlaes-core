'use client';

import { useVBLCalculator } from '@/hooks/useVBLCalculator';

interface QualificationStep1Props {
  onNext: () => void;
  onBack: () => void;
}

export default function QualificationStep1({ onNext, onBack }: QualificationStep1Props) {
  const { formData, updateFormData } = useVBLCalculator();
  const selectedValue = formData.qualification?.contributionDuration || '';

  const handleSelect = (value: 'less_than_5' | '5_or_more') => {
    updateFormData({
      qualification: {
        contributionDuration: value,
        lastContribution: formData.qualification?.lastContribution || '',
        nationality: formData.qualification?.nationality || '',
        currentResidence: formData.qualification?.currentResidence || '',
      },
    });
  };

  const canProceed = selectedValue !== '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-16 px-6">
      <div className="w-full max-w-3xl">
        {/* Question with inline progress */}
        <h2 className="text-4xl md:text-5xl font-semibold text-[#221E49] mb-16 text-center leading-tight">
          How long have you contributed to the German<br />state pension? (1/5)
        </h2>

        {/* Options - Horizontal Layout */}
        <div className="flex gap-6 mb-16 justify-center">
          <button
            onClick={() => handleSelect('less_than_5')}
            className={`px-10 py-5 rounded-xl transition-all ${
              selectedValue === 'less_than_5'
                ? 'bg-[#50C9A5] text-[#221E49]'
                : 'bg-white text-[#221E49] border border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedValue === 'less_than_5'
                    ? 'border-[#221E49]'
                    : 'border-gray-300'
                }`}
              >
                {selectedValue === 'less_than_5' && (
                  <div className="w-3 h-3 bg-[#221E49] rounded-full" />
                )}
              </div>
              <span className="text-lg font-medium">Less than 5 years</span>
            </div>
          </button>

          <button
            onClick={() => handleSelect('5_or_more')}
            className={`px-10 py-5 rounded-xl transition-all ${
              selectedValue === '5_or_more'
                ? 'bg-[#50C9A5] text-[#221E49]'
                : 'bg-white text-[#221E49] border border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedValue === '5_or_more'
                    ? 'border-[#221E49]'
                    : 'border-gray-300'
                }`}
              >
                {selectedValue === '5_or_more' && (
                  <div className="w-3 h-3 bg-[#221E49] rounded-full" />
                )}
              </div>
              <span className="text-lg font-medium">5 years or longer</span>
            </div>
          </button>
        </div>

        {/* Info Box */}
        <div
          className="bg-white border-[3px] border-[#242150] rounded-[20px] p-8 relative max-w-xl mx-auto mb-16"
          style={{ boxShadow: '5px 5px 0px #242150' }}
        >
          <div className="flex gap-6">
            {/* Exclamation mark icon - using actual text */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <span
                className="text-[#242150]"
                style={{
                  fontFamily: 'Inter Tight, sans-serif',
                  fontSize: '145px',
                  lineHeight: '45px',
                  fontWeight: 'normal',
                  textAlign: 'left',
                  letterSpacing: '0px',
                }}
              >
                !
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 py-2">
              <h3 className="font-bold text-[#242150] mb-4 text-xl">
                Including !!
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-[#50C9A5] text-xl flex-shrink-0">✓</span>
                  <span>When you were employed</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#50C9A5] text-xl flex-shrink-0">✓</span>
                  <span>Receiving unemployment benefits</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#50C9A5] text-xl flex-shrink-0">✓</span>
                  <span>on maternity/paternity leave.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end max-w-xl mx-auto">
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
