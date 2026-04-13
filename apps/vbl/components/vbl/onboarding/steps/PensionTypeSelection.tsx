'use client';

import React, { ReactNode } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface PensionTypeSelectionProps {
  onNext: () => void;
  headerTitle?: string;
  headerIcon?: ReactNode;
  // Client #8: the calculator passes which sectors the user actually has,
  // so the card labels and subtitles can describe the user's own situation
  // instead of showing a generic "Public/Stage vs Private" split.
  claimTypes?: string[];
  // Figma VBL-30/31/32: the private-card subtitle shows the actual private
  // provider detected in the calculator (BVV, Allianz, Swiss Life, …).
  privateProvider?: string;
  // Figma subtitles for the public/stage card — pulled from the calculator's
  // detected supplementary pension (VBLklassik, VddB, VddKO, …).
  publicStageProvider?: string;
}

export const PensionTypeSelection: React.FC<PensionTypeSelectionProps> = ({
  onNext,
  headerTitle,
  headerIcon,
  claimTypes = [],
  privateProvider = '',
  publicStageProvider = '',
}) => {
  const { updateData } = useOnboarding();

  const hasPublic = claimTypes.includes('public');
  const hasStage = claimTypes.includes('stage');
  const hasOrchestra = claimTypes.includes('orchestra');

  // Figma VBL-30/31/32: rename the left card per detected sector.
  const publicStageLabel = (() => {
    if (hasOrchestra) return 'Orchestra refund claim';
    if (hasStage) return 'Stage / Performing Arts refund claim';
    return 'Public sector refund claim';
  })();
  const publicStageSubtitle = (() => {
    if (publicStageProvider) return publicStageProvider;
    if (hasOrchestra) return 'VddKO';
    if (hasStage) return 'VddB';
    if (hasPublic) return 'VBLklassik';
    return '';
  })();

  const handlePublicSector = () => {
    updateData({ pensionType: 'public' });
    onNext();
  };

  const handlePrivateSector = () => {
    updateData({ pensionType: 'private' });
    onNext();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dark Green Header - Simplified version without steps */}
        <div
          className="px-8 py-6"
          style={{ backgroundColor: '#163300' }}
        >
          <div className="flex items-center justify-center gap-3">
            {headerIcon ?? <CompanyPensionLogo />}
            {headerTitle && (
              <h1 className="text-[#9FE870] text-xl font-semibold">{headerTitle}</h1>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          <div className="max-w-lg mx-auto">
            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Which claim would you like to start first?
            </h2>
            <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
            <p className="text-gray-600 text-center mb-8">
              You can only submit one claim at a time. Please choose which claim you want to start first. You can start the other claim afterwards.
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
                  <p className="font-semibold text-[#163300]">{publicStageLabel}</p>
                  <p className="text-sm text-[#163300]/70">{publicStageSubtitle}</p>
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
                  <p className="font-semibold text-gray-900">Private-sector settlement claim</p>
                  <p className="text-sm text-gray-500">{privateProvider || 'BVV'}</p>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Info Banner */}
            <div className="mt-6 bg-[#F0FDE4] rounded-lg p-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
              <p className="text-sm text-[#163300]">
                These claims are legally separate and must be submitted one at a time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PensionTypeSelection;
