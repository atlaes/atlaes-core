'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  ArrowRight,
  X,
  ChevronDown,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { uploadDocument } from '@/lib/onboarding-api';
import { DatePartsInput } from '../DatePartsInput';

interface IdentityProps {
  onNext: () => void;
}

type IdentityPhase = 'upload' | 'processing' | 'confirm';

function isAtLeast18(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return false;

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayThisYear = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      birthDate.getUTCMonth(),
      birthDate.getUTCDate()
    )
  );

  if (
    new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    ) < birthdayThisYear
  ) {
    age -= 1;
  }

  return age >= 18;
}

export const Identity: React.FC<IdentityProps> = ({ onNext }) => {
  const { data, updateData, updateIdentity } = useOnboarding();
  const [phase, setPhase] = useState<IdentityPhase>(
    data.identity.documentPreview ? 'confirm' : 'upload'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Figma VBL-16: inline error state on the upload dropzone when the user
  // picks an unsupported file type. Persists until the next file is chosen.
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setFileTypeError(
          'This file format is not supported. Please upload a valid document.'
        );
        return;
      }
      setFileTypeError(null);

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
            fullName:
              `${result.ocr.firstName || ''} ${result.ocr.lastName || ''}`.trim(),
            firstName: result.ocr.firstName || '',
            lastName: result.ocr.lastName || '',
            dateOfBirth: result.ocr.dateOfBirth || '',
            gender:
              (result.ocr.gender?.toLowerCase() as
                | 'male'
                | 'female'
                | 'other') || '',
            passportNumber: result.ocr.passportNumber || '',
            nationality: result.ocr.nationality || '',
            placeOfBirth: result.ocr.placeOfBirth || '',
            passportIssueDate: result.ocr.passportIssueDate || '',
            passportExpiryDate: result.ocr.passportExpiryDate || '',
          });
        } else {
          setUploadError(
            'We could not read this file as a passport or ID. Please upload a clearer passport or ID, or enter the details manually.'
          );
        }

        setPhase('confirm');
      } catch (err) {
        console.error('Document upload/OCR error:', err);
        const apiError =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'error' in err.response.data &&
          typeof err.response.data.error === 'string'
            ? err.response.data.error
            : null;
        setUploadError(
          apiError ||
            'We could not read this file as a passport or ID. Please upload a clearer passport or ID.'
        );
        updateIdentity({
          documentFile: null,
          documentPreview: undefined,
        });
        setPhase('upload');
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
    setUploadError(null);
    setPhase('upload');
  };

  const canProceed =
    data.identity.fullName !== '' &&
    data.identity.dateOfBirth !== '' &&
    isAtLeast18(data.identity.dateOfBirth) &&
    data.identity.gender !== '' &&
    data.identity.nationality.trim() !== '' &&
    data.identity.placeOfBirth.trim() !== '';
  const isUnder18 =
    data.identity.dateOfBirth !== '' && !isAtLeast18(data.identity.dateOfBirth);

  if (phase === 'processing') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Processing your document
        </h2>
        <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
        <p className="text-gray-600 text-center mb-8">
          We're extracting information from your document. This may take a
          moment.
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
          A clear copy of your passport or national ID is required by the
          pension provider and will be included with your refund request.
        </p>

        {/* Upload Area */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            fileTypeError
              ? 'border-red-400 bg-red-50'
              : isDragging
                ? 'border-[#9FE870] bg-[#F0FDE4]'
                : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {/* Cloud upload icon matching design */}
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M14 32l10-10 10 10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M24 22v18" strokeLinecap="round" />
            <path
              d="M38.5 30.3A9 9 0 0 0 36 14h-1.3A14.4 14.4 0 1 0 8 26.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-gray-600 mb-2">
            Drag and drop your file here or{' '}
            <span className="text-[#163300] font-medium hover:underline">
              browse
            </span>
          </p>
          <p className="text-sm text-gray-400">Supports: JPG, PNG, PDF</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* File Type Error Banner */}
        {fileTypeError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{fileTypeError}</p>
          </div>
        )}

        {/* Upload/OCR Error Banner */}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

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
        Confirm your identity details
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        We read these details from your document. Please check and correct them
        if needed.
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
            onChange={(e) => {
              const fullName = e.target.value;
              const parts = fullName.trim().split(/\s+/);
              updateIdentity({
                fullName,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
              });
            }}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nationality
            </label>
            <input
              type="text"
              value={data.identity.nationality}
              onChange={(e) => updateIdentity({ nationality: e.target.value })}
              placeholder="e.g. Australian"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Place of birth
            </label>
            <input
              type="text"
              value={data.identity.placeOfBirth}
              onChange={(e) => updateIdentity({ placeOfBirth: e.target.value })}
              placeholder="e.g. Sydney"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Date of birth + Gender */}
        <div className="space-y-4">
          <DatePartsInput
            label="Date of birth"
            value={data.identity.dateOfBirth}
            onChange={(value) => updateIdentity({ dateOfBirth: value })}
            helperText="Use the date of birth shown on your passport."
          />
          {isUnder18 && (
            <p className="text-sm font-medium text-red-700">
              You must be at least 18 years old to submit this claim.
            </p>
          )}
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
          The details you confirm here will be used for your refund request.
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
