'use client';

import React, { useState, useCallback } from 'react';
import { ArrowRight, Upload, X, Calendar, ChevronDown, Info, Loader2 } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { uploadDocument } from '@/lib/onboarding-api';

interface IdentityProps {
  onNext: () => void;
}

type IdentityPhase = 'upload' | 'processing' | 'confirm';

export const Identity: React.FC<IdentityProps> = ({ onNext }) => {
  const { data, updateData, updateIdentity } = useOnboarding();
  const [phase, setPhase] = useState<IdentityPhase>(
    data.identity.documentPreview ? 'confirm' : 'upload'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Please upload an image or PDF file');
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      updateIdentity({
        documentFile: file,
        documentPreview: previewUrl,
      });

      // Upload to backend for OCR processing
      setPhase('processing');
      setUploadError(null);

      try {
        const result = await uploadDocument(file, 'passport');

        // Store the document ID for later claim attachment
        updateData({ documentId: result.document.id });

        // Auto-fill OCR data if available
        if (result.ocr) {
          updateIdentity({
            fullName: result.ocr.fullName || `${result.ocr.firstName || ''} ${result.ocr.lastName || ''}`.trim(),
            dateOfBirth: result.ocr.dateOfBirth || '',
            gender: (result.ocr.gender?.toLowerCase() as 'male' | 'female' | 'other') || '',
          });
        }

        setPhase('confirm');
      } catch (err) {
        // If OCR fails, still allow manual entry
        console.error('Document upload/OCR error:', err);
        setUploadError('Document uploaded but OCR extraction failed. Please enter details manually.');
        setPhase('confirm');
      }
    },
    [updateIdentity, updateData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveDocument = () => {
    updateIdentity({
      documentFile: null,
      documentPreview: undefined,
    });
    setPhase('upload');
  };

  const canProceed =
    data.identity.fullName !== '' &&
    data.identity.dateOfBirth !== '' &&
    data.identity.gender !== '';

  if (phase === 'processing') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Processing your document
        </h2>
        <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
        <p className="text-gray-600 text-center mb-8">
          We're extracting information from your document. This may take a moment.
        </p>
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-12 h-12 text-[#9FE870] animate-spin" />
          <p className="text-gray-500">Analyzing document...</p>
        </div>
      </div>
    );
  }

  if (phase === 'upload') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Upload your passport or ID
        </h2>
        <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
        <p className="text-gray-600 text-center mb-8">
          A copy of your passport or ID is required by the pension authority and will be included with your refund application.
        </p>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-[#9FE870] bg-[#F0FDE4]'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {/* Cloud upload icon matching design */}
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 32l10-10 10 10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 22v18" strokeLinecap="round" />
            <path d="M38.5 30.3A9 9 0 0 0 36 14h-1.3A14.4 14.4 0 1 0 8 26.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-gray-600 mb-2">
            Drag & drop your file here or{' '}
            <label className="text-[#163300] font-medium cursor-pointer hover:underline">
              browse
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
          </p>
          <p className="text-sm text-gray-400">Supports: JPG, PNG, PDF</p>
        </div>

        {/* Continue Button */}
        <button
          disabled
          className="w-full mt-8 py-4 px-6 bg-gray-200 text-gray-500 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Confirm phase
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Confirm your details
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        We extracted the following from your document. Please verify and correct if needed.
      </p>

      {/* Uploaded Document Preview */}
      {data.identity.documentPreview && (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500">JPG</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">passport.jpg</p>
              <p className="text-xs text-gray-500">500kb</p>
            </div>
          </div>
          <button
            onClick={handleRemoveDocument}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* OCR Error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          {uploadError}
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={data.identity.fullName}
            onChange={(e) => updateIdentity({ fullName: e.target.value })}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>

        {/* Date of Birth and Gender - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of birth
            </label>
            <div className="relative">
              <input
                type="date"
                value={data.identity.dateOfBirth}
                onChange={(e) => updateIdentity({ dateOfBirth: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <div className="relative">
              <select
                value={data.identity.gender}
                onChange={(e) =>
                  updateIdentity({
                    gender: e.target.value as 'male' | 'female' | 'other' | '',
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 bg-[#F0FDE4] rounded-lg p-4 flex items-center gap-3">
        <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
        <p className="text-sm text-[#163300]">
          The details you confirm here will be used in the official refund application.
        </p>
      </div>

      {/* Continue Button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full mt-6 py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
          canProceed
            ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Identity;
