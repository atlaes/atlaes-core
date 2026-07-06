'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowRight,
  X,
  ChevronDown,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  useOnboarding,
  HealthInsuranceType,
} from '@/contexts/OnboardingContext';
import {
  uploadDocument,
  extractHealthInsuranceDocument,
} from '@/lib/onboarding-api';
import { COUNTRIES } from '@/lib/countries';

interface HealthInsuranceProps {
  onNext: () => void;
  // Task 15 (mirrors Identity.tsx item 13): lets this step intercept the
  // global Back button while it's on the confirm phase, so Back returns to
  // the upload phase instead of leaving the health-insurance sub-step.
  setBackOverride?: (handler: (() => void) | null) => void;
}

type HealthInsurancePhase = 'upload' | 'processing' | 'confirm';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS = Array.from({ length: 90 }, (_, i) =>
  String(new Date().getFullYear() - i)
);

const HEALTH_INSURANCE_TYPE_OPTIONS: {
  value: HealthInsuranceType;
  label: string;
}[] = [
  {
    value: 'statutory',
    label: 'Statutory health insurance / public health fund',
  },
  { value: 'private', label: 'Private health insurance' },
  { value: 'not_sure', label: 'I am not sure' },
];

// Item 25 pattern (see Identity.tsx / Task 5): shared label + "Required"
// hint for the missing-field highlight.
function FieldLabel({
  label,
  showMissing,
}: {
  label: string;
  showMissing: boolean;
}) {
  return (
    <label
      className={`block text-sm font-medium mb-1 ${
        showMissing ? 'text-red-700' : 'text-gray-700'
      }`}
    >
      {label}
    </label>
  );
}

function MissingHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-sm font-medium text-red-700">
      <AlertCircle className="h-3.5 w-3.5" />
      Required
    </p>
  );
}

export const HealthInsurance: React.FC<HealthInsuranceProps> = ({
  onNext,
  setBackOverride,
}) => {
  const { data, updateHealthInsurance } = useOnboarding();
  // Entry screen (VBL-23): the user picks a type before uploading. If they
  // already picked one (state carried from a prior visit / entry screen),
  // skip straight past the upload dropzone's own type picker duplication —
  // the upload phase below still shows the dropzone; the type field is only
  // asked once, on this phase, matching VBL-23.
  const [phase, setPhase] = useState<HealthInsurancePhase>(
    data.healthInsurance.documentPreview ? 'confirm' : 'upload'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Task 15 client requirement: the user's type choice on the entry screen
  // survives OCR disagreement — OCR only pre-fills empty fields, so once the
  // user has explicitly chosen a type here, a later extraction result must
  // not overwrite it. Tracked locally (not derived from data.healthInsurance
  // .type, which OCR also writes to) so we can tell "user chose this" apart
  // from "OCR set this".
  const userSelectedTypeRef = useRef(false);

  const providerName =
    data.membership.pensionProvider || 'Your pension provider';

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setFileTypeError(
          'This file format is not supported. Please upload a valid document.'
        );
        return;
      }
      setFileTypeError(null);

      const previewUrl = URL.createObjectURL(file);
      updateHealthInsurance({
        documentFile: file,
        documentPreview: previewUrl,
        documentFileName: file.name,
      });

      setPhase('processing');
      setUploadError(null);

      try {
        // Upload for storage/claim-attachment (mirrors Identity.tsx), and
        // separately request OCR extraction (Task 15's dedicated
        // extract-health-insurance-document endpoint).
        const [uploadResult, extractionResult] = await Promise.allSettled([
          uploadDocument(file, 'health_insurance'),
          extractHealthInsuranceDocument(file),
        ]);

        if (uploadResult.status === 'fulfilled') {
          updateHealthInsurance({ documentId: uploadResult.value.document.id });
        }

        if (extractionResult.status === 'fulfilled') {
          const { details } = extractionResult.value.extraction;
          updateHealthInsurance({
            // User's manual type choice (entry screen) wins over OCR.
            type: userSelectedTypeRef.current
              ? data.healthInsurance.type
              : details.type || data.healthInsurance.type,
            providerName:
              details.providerName || data.healthInsurance.providerName,
            providerAddress:
              details.providerAddress || data.healthInsurance.providerAddress,
            insuredSinceMonth:
              details.insuredSinceMonth ||
              data.healthInsurance.insuredSinceMonth,
            insuredSinceYear:
              details.insuredSinceYear || data.healthInsurance.insuredSinceYear,
            placeOfBirth:
              details.placeOfBirth || data.healthInsurance.placeOfBirth,
            countryOfBirth:
              details.countryOfBirth || data.healthInsurance.countryOfBirth,
            insuranceNumber:
              details.insuranceNumber || data.healthInsurance.insuranceNumber,
          });
        } else {
          setUploadError(
            'We could not read details from this document. Please check and complete the fields manually.'
          );
        }

        if (uploadResult.status === 'rejected') {
          throw uploadResult.reason;
        }

        setPhase('confirm');
      } catch (err) {
        console.error('Health insurance document upload/OCR error:', err);
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
          apiError || 'We could not upload this document. Please try again.'
        );
        updateHealthInsurance({
          documentFile: null,
          documentPreview: undefined,
          documentFileName: undefined,
        });
        setPhase('upload');
      }
    },
    [updateHealthInsurance, data.healthInsurance]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveDocument = () => {
    updateHealthInsurance({
      documentFile: null,
      documentPreview: undefined,
      documentFileName: undefined,
    });
    setUploadError(null);
    setPhase('upload');
  };

  // Item 13 pattern: Back from confirm returns to a clean upload phase
  // rather than leaving the sub-step. Already-typed/confirmed field values
  // stay in context; a fresh upload's OCR result overwrites them the same
  // way it would on first upload (except the user-selected type, per the
  // rule above).
  const handleBackToUpload = useCallback(() => {
    updateHealthInsurance({
      documentFile: null,
      documentPreview: undefined,
      documentFileName: undefined,
    });
    setUploadError(null);
    setFileTypeError(null);
    setPhase('upload');
  }, [updateHealthInsurance]);

  useEffect(() => {
    if (!setBackOverride) return;
    if (phase === 'confirm') {
      setBackOverride(handleBackToUpload);
    } else {
      setBackOverride(null);
    }
    return () => setBackOverride(null);
  }, [phase, setBackOverride, handleBackToUpload]);

  const missingFields = {
    type: data.healthInsurance.type === '',
  };
  const showMissingHighlights = phase === 'confirm';

  const canProceed =
    data.healthInsurance.type !== '' &&
    (!!data.healthInsurance.documentFile ||
      !!data.healthInsurance.documentId ||
      data.healthInsurance.providerName.trim() !== '');

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
          Health insurance confirmation
        </h2>
        <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
        <p className="text-gray-600 text-center mb-8">
          {providerName} requires current health insurance information to
          process your bAV cash-out request.
        </p>

        {/* Type of health insurance (entry screen, VBL-23) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What type of health insurance do you currently have?
          </label>
          <div className="relative">
            <select
              value={data.healthInsurance.type}
              onChange={(e) => {
                userSelectedTypeRef.current = true;
                updateHealthInsurance({
                  type: e.target.value as HealthInsuranceType,
                });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Select type of health insurance</option>
              {HEALTH_INSURANCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

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
          <p className="text-sm text-gray-400 mb-1">
            Accepted formats: PDF, JPG, PNG
          </p>
          <p className="text-sm text-gray-400">
            Health insurance card, certificate, confirmation letter or policy
            document
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {fileTypeError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{fileTypeError}</p>
          </div>
        )}

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

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

  // Confirm phase (VBL-1 / VBL-2)
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Confirm your health insurance details
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        We read these details from your document. Please check and complete any
        missing information.
      </p>

      {data.healthInsurance.documentPreview && (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500">
                {(data.healthInsurance.documentFileName || 'FILE')
                  .split('.')
                  .pop()
                  ?.toUpperCase()
                  .slice(0, 3)}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {data.healthInsurance.documentFileName || 'healthinsurance.jpg'}
              </p>
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

      {uploadError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          {uploadError}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <FieldLabel
            label="Type of health insurance"
            showMissing={showMissingHighlights && missingFields.type}
          />
          <div className="relative">
            <select
              value={data.healthInsurance.type}
              onChange={(e) => {
                userSelectedTypeRef.current = true;
                updateHealthInsurance({
                  type: e.target.value as HealthInsuranceType,
                });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white ${
                showMissingHighlights && missingFields.type
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
            >
              <option value="">Select type of health insurance</option>
              {HEALTH_INSURANCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          <MissingHint show={showMissingHighlights && missingFields.type} />
        </div>

        <div>
          <FieldLabel label="Health insurance provider" showMissing={false} />
          <input
            type="text"
            value={data.healthInsurance.providerName}
            onChange={(e) =>
              updateHealthInsurance({ providerName: e.target.value })
            }
            placeholder="Enter the name of your health insurance provider"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <FieldLabel
            label="Health insurance provider address"
            showMissing={false}
          />
          <input
            type="text"
            value={data.healthInsurance.providerAddress}
            onChange={(e) =>
              updateHealthInsurance({ providerAddress: e.target.value })
            }
            placeholder="Enter the provider's address"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Insured since
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select
                value={data.healthInsurance.insuredSinceMonth}
                onChange={(e) =>
                  updateHealthInsurance({ insuredSinceMonth: e.target.value })
                }
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="">Month</option>
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={data.healthInsurance.insuredSinceYear}
                onChange={(e) =>
                  updateHealthInsurance({ insuredSinceYear: e.target.value })
                }
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="">Year</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel label="Place of birth" showMissing={false} />
          <input
            type="text"
            value={data.healthInsurance.placeOfBirth}
            onChange={(e) =>
              updateHealthInsurance({ placeOfBirth: e.target.value })
            }
            placeholder="Enter your place of birth"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <FieldLabel label="Country of birth" showMissing={false} />
          <div className="relative">
            <select
              value={data.healthInsurance.countryOfBirth}
              onChange={(e) =>
                updateHealthInsurance({ countryOfBirth: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((country) => (
                <option key={country.value} value={country.label}>
                  {country.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <FieldLabel label="Health insurance number" showMissing={false} />
          <input
            type="text"
            value={data.healthInsurance.insuranceNumber}
            onChange={(e) =>
              updateHealthInsurance({ insuranceNumber: e.target.value })
            }
            placeholder="Enter your health insurance number, if shown on your document"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 bg-[#F0FDE4] rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#163300] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#163300]">
          {providerName} requires this information for insurance reporting
          purposes. If your health insurance system works differently where you
          live now, choose the option that best matches your situation.
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

export default HealthInsurance;
