'use client';

import React from 'react';
import { ArrowRight, ArrowUpRight, Info, Shield } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface PensionTypeSelectionProps {
  onNext: () => void;
}

export const PensionTypeSelection: React.FC<PensionTypeSelectionProps> = ({ onNext }) => {
  const { updateData } = useOnboarding();

  const handlePublicSector = () => {
    updateData({ pensionType: 'public' });
    onNext();
  };

  const handlePrivateSector = () => {
    // Open BVV external link in new tab
    window.open('https://www.bvv.de', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dark Green Header - Simplified version without steps */}
        <div
          className="px-8 py-6"
          style={{ backgroundColor: '#163300' }}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#163300]" />
            </div>
            <h1 className="text-white text-xl font-semibold">Supplementary Pension Refund</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <div className="max-w-lg mx-auto">
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Which pension refund would you like to claim first?
            </h2>
            <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
            <p className="text-gray-600 text-center mb-8">
              Choose which pension to process. You can claim the other one afterwards.
            </p>

            {/* Option Cards */}
            <div className="space-y-4">
              {/* Public Sector Option */}
              <button
                onClick={handlePublicSector}
                className="w-full p-4 bg-[#9FE870] rounded-xl flex items-center gap-4 hover:bg-[#8AD860] transition-colors group"
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#163300" strokeWidth="2">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l7-4 7 4v14" />
                    <path d="M9 21v-6h6v6" />
                    <path d="M10 9h4" />
                    <path d="M10 12h4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[#163300]">Public Sector/Stage Pension</p>
                  <p className="text-sm text-[#163300]/70">VBLklassik</p>
                </div>
                <ArrowRight className="w-6 h-6 text-[#163300]" />
              </button>

              {/* Private Sector Option */}
              <button
                onClick={handlePrivateSector}
                className="w-full p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-4 hover:border-gray-300 transition-colors group"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <rect x="3" y="7" width="18" height="14" rx="2" />
                    <path d="M3 7l9-4 9 4" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Private Sector Pension</p>
                  <p className="text-sm text-gray-500">BVV</p>
                </div>
                <ArrowUpRight className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Info Banner */}
            <div className="mt-6 bg-[#F0FDE4] rounded-lg p-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
              <p className="text-sm text-[#163300]">
                These pensions are legally separate and must be claimed one at a time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PensionTypeSelection;
