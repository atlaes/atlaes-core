'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Calendar, ChevronDown, Info } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import { useClaimsStore } from '@/lib/stores/claims-store';
import {
  useClaimQuery,
  useClaimDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateClaimMutation,
  useCompleteStepMutation,
  getDocumentByRole,
} from '@/lib/queries/claims-queries';

type PassportSubStep = 'upload' | 'details';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Normalize a date string to YYYY-MM-DD, the only format the API accepts.
 * Handles what OCR returns for passports:
 * - YYYY-MM-DD (already correct)
 * - DD.MM.YYYY, DD/MM/YYYY or DD-MM-YYYY (day first, as on the document)
 * - YYYY/MM/DD or YYYY.MM.DD
 * - 12 MAY 1990 / 12 MAY/MAI 1990 (bilingual month)
 * - anything else Date() understands ("May 12, 1990")
 * Unknown input gives '' so the field shows empty instead of a value the
 * API rejects.
 */
function normalizeDateToISO(dateStr: string | undefined | null): string {
  if (!dateStr) return '';

  // Remove any extra whitespace
  const cleaned = dateStr.trim();
  if (!cleaned) return '';

  // Already in YYYY-MM-DD format
  if (ISO_DATE.test(cleaned)) {
    return cleaned;
  }

  // Day first (passports, German documents). Must run before the Date()
  // fallback, which reads 12/05/1990 as the 5th of December.
  const euroMatch = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const isoLooseMatch = cleaned.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (isoLooseMatch) {
    const [, year, month, day] = isoLooseMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 12 MAY 1990, 12 MAY/MAI 1990, 12 Sept. 1990
  const textMatch = cleaned.match(
    /^(\d{1,2})\s+([A-Za-z]{3,})\.?(?:\s*\/\s*[A-Za-z]{3,}\.?)?\s+(\d{4})$/
  );
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`;
  }

  // Anything else Date() understands
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

interface PassportUploadProps {
  claimId: string;
}

export default function PassportUpload({ claimId }: PassportUploadProps) {
  // React Query hooks
  const { data: claim } = useClaimQuery(claimId);
  const { data: documents } = useClaimDocumentsQuery(claimId);
  const uploadMutation = useUploadDocumentMutation();
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();

  // Zustand for navigation
  const { goToNextStep } = useClaimsStore();

  // Local state
  const [subStep, setSubStep] = useState<PassportSubStep>('upload');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // True while the client swaps an uploaded passport for another file.
  const [replacing, setReplacing] = useState(false);
  // Set when the file was saved but could not be read automatically.
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  // Form state for passport details
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    placeOfBirth: '',
    nationality: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    passportNumber: '',
  });

  // Initialize form data from claim when it loads
  useEffect(() => {
    if (claim) {
      setFormData({
        firstName: claim.firstName || '',
        lastName: claim.lastName || '',
        dateOfBirth: claim.dateOfBirth || '',
        gender: claim.gender || '',
        placeOfBirth: claim.placeOfBirth || '',
        nationality: claim.nationality || '',
        passportIssueDate: claim.passportIssueDate || '',
        passportExpiryDate: claim.passportExpiryDate || '',
        passportNumber: claim.passportNumber || '',
      });
    }
  }, [claim]);

  // Check if passport is uploaded
  const passportDoc = getDocumentByRole(documents, 'passport');
  const hasPassport = !!passportDoc;

  // If passport is already uploaded, show details form
  useEffect(() => {
    if (hasPassport && subStep === 'upload' && !replacing) {
      setSubStep('details');
    }
  }, [hasPassport, subStep, replacing]);

  const handleFileChange = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PDF, JPG, or PNG file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploadError(null);

    try {
      // React Query mutation - returns OCR data directly, no race condition!
      const result = await uploadMutation.mutateAsync({
        claimId,
        file,
        role: 'passport',
      });

      console.log('[PassportUpload] Upload result:', result);
      console.log('[PassportUpload] OCR data:', result.ocr);

      // Set form data directly from OCR result, normalizing dates
      if (result.ocr) {
        const normalizedData = {
          firstName: result.ocr.firstName || '',
          lastName: result.ocr.lastName || '',
          dateOfBirth: normalizeDateToISO(result.ocr.dateOfBirth),
          gender: result.ocr.gender || '',
          placeOfBirth: result.ocr.placeOfBirth || '',
          nationality: result.ocr.nationality || '',
          passportIssueDate: normalizeDateToISO(result.ocr.passportIssueDate),
          passportExpiryDate: normalizeDateToISO(result.ocr.passportExpiryDate),
          passportNumber: result.ocr.passportNumber || '',
        };
        console.log('[PassportUpload] Normalized form data:', normalizedData);
        setFormData(normalizedData);
        setOcrNotice(null);
      } else {
        console.log('[PassportUpload] No OCR data received');
        setOcrNotice(
          result.ocrError ||
            'We could not read your passport automatically. Please enter the details below.'
        );
      }
      setReplacing(false);

      // Transition to details view
      console.log('[PassportUpload] Transitioning to details view');
      setSubStep('details');
    } catch (error) {
      console.error('[PassportUpload] Upload error:', error);
      // Show the server's reason ("not a passport or national ID") instead
      // of axios' "Request failed with status code 400".
      const serverError = (
        error as { response?: { data?: { error?: unknown } } }
      )?.response?.data?.error;
      setUploadError(
        typeof serverError === 'string' && serverError
          ? serverError
          : error instanceof Error
            ? error.message
            : 'Upload failed'
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Errors propagate to the step container, which shows them in a notice.
  const handleDetailsSubmit = async () => {
    // Optional dates go as YYYY-MM-DD or not at all: an empty string fails
    // the API's format check and takes the whole update down with it.
    const dateOrUndefined = (value: string) =>
      normalizeDateToISO(value) || undefined;

    await updateMutation.mutateAsync({
      claimId,
      data: {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: normalizeDateToISO(formData.dateOfBirth),
        gender: formData.gender as 'male' | 'female' | 'other',
        placeOfBirth: formData.placeOfBirth.trim(),
        nationality: formData.nationality.trim(),
        passportIssueDate: dateOrUndefined(formData.passportIssueDate),
        passportExpiryDate: dateOrUndefined(formData.passportExpiryDate),
        passportNumber: formData.passportNumber.trim(),
      },
    });

    // Mark step as complete
    await completeMutation.mutateAsync({
      claimId,
      stepName: 'passportUpload',
    });

    // Navigate to next step
    goToNextStep();
  };

  const isUploading = uploadMutation.isPending;
  const isSubmitting = updateMutation.isPending || completeMutation.isPending;
  // Everything the backend requires at submission, nationality and place of
  // birth included; the passport dates stay optional.
  const canSubmitDetails =
    !!formData.firstName.trim() &&
    !!formData.lastName.trim() &&
    ISO_DATE.test(normalizeDateToISO(formData.dateOfBirth)) &&
    !!formData.gender &&
    !!formData.placeOfBirth.trim() &&
    !!formData.nationality.trim() &&
    !!formData.passportNumber.trim();

  // Upload screen
  if (subStep === 'upload') {
    return (
      <ClaimsStepContainer
        claimId={claimId}
        stepName="passportUpload"
        title="Upload your passport"
        description="The German Pension Office requires your passport to verify your identity. We use it to prepare your refund documents automatically on your behalf."
        canContinue={hasPassport}
        onContinue={() => {
          setReplacing(false);
          setSubStep('details');
        }}
      >
        <div
          className={`claims-upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="claims-upload-zone-content">
            <Upload className="claims-upload-icon" />
            <p className="claims-upload-text">
              Choose a file or drag & drop it here
            </p>
            <p className="claims-upload-formats">PDF, JPG or PNG</p>

            <label className="claims-upload-btn">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileChange(e.target.files[0])
                }
                disabled={isUploading}
                hidden
              />
              {isUploading ? 'Uploading...' : 'Upload passport'}
            </label>
          </div>

          {uploadError && <p className="claims-upload-error">{uploadError}</p>}
        </div>
      </ClaimsStepContainer>
    );
  }

  // Details form screen
  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="passportUpload"
      title="Confirm your passport details"
      description="These details will be used for your pension refund application."
      canContinue={canSubmitDetails && !isSubmitting}
      onContinue={handleDetailsSubmit}
      continueText={isSubmitting ? 'Saving...' : 'Confirm and continue'}
    >
      <div className="claims-passport-form">
        {ocrNotice && (
          <div className="claims-info-box">
            <Info className="w-5 h-5 text-blue-500" />
            <p>{ocrNotice}</p>
          </div>
        )}
        <p className="claims-form-label">
          {passportDoc?.fileName
            ? `Uploaded file: ${passportDoc.fileName} · `
            : ''}
          <button
            type="button"
            className="claims-link"
            onClick={() => {
              setUploadError(null);
              setReplacing(true);
              setSubStep('upload');
            }}
          >
            Upload a different file
          </button>
        </p>
        {/* Row 1: First Name / Last Name */}
        <div className="claims-form-row">
          <div className="claims-form-group">
            <label className="claims-form-label">First Name</label>
            <input
              type="text"
              className="claims-form-input"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
            />
          </div>
          <div className="claims-form-group">
            <label className="claims-form-label">Last Name</label>
            <input
              type="text"
              className="claims-form-input"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Date of Birth / Gender */}
        <div className="claims-form-row">
          <div className="claims-form-group">
            <label className="claims-form-label">Date of birth</label>
            <div className="claims-form-input-with-icon">
              <input
                type="date"
                className="claims-form-input"
                placeholder="DD/MMM/YYYY"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  handleInputChange('dateOfBirth', e.target.value)
                }
              />
              <Calendar className="claims-form-input-icon" />
            </div>
          </div>
          <div className="claims-form-group">
            <label className="claims-form-label">Gender</label>
            <div className="claims-form-select-wrapper">
              <select
                className="claims-form-select"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="claims-form-select-icon" />
            </div>
          </div>
        </div>

        {/* Row 3: Place of Birth / Nationality */}
        <div className="claims-form-row">
          <div className="claims-form-group">
            <label className="claims-form-label">Place of birth</label>
            <input
              type="text"
              className="claims-form-input"
              placeholder="Place of birth"
              value={formData.placeOfBirth}
              onChange={(e) =>
                handleInputChange('placeOfBirth', e.target.value)
              }
            />
          </div>
          <div className="claims-form-group">
            <label className="claims-form-label">Nationality</label>
            <input
              type="text"
              className="claims-form-input"
              placeholder="Nationality"
              value={formData.nationality}
              onChange={(e) => handleInputChange('nationality', e.target.value)}
            />
          </div>
        </div>

        {/* Row 4: Passport Issue Date / Expiry Date */}
        <div className="claims-form-row">
          <div className="claims-form-group">
            <label className="claims-form-label">Passport issue date</label>
            <div className="claims-form-input-with-icon">
              <input
                type="date"
                className="claims-form-input"
                placeholder="DD/MMM/YYYY"
                value={formData.passportIssueDate}
                onChange={(e) =>
                  handleInputChange('passportIssueDate', e.target.value)
                }
              />
              <Calendar className="claims-form-input-icon" />
            </div>
          </div>
          <div className="claims-form-group">
            <label className="claims-form-label">Passport expiry date</label>
            <div className="claims-form-input-with-icon">
              <input
                type="date"
                className="claims-form-input"
                placeholder="DD/MMM/YYYY"
                value={formData.passportExpiryDate}
                onChange={(e) =>
                  handleInputChange('passportExpiryDate', e.target.value)
                }
              />
              <Calendar className="claims-form-input-icon" />
            </div>
          </div>
        </div>

        {/* Row 5: Passport Number (full width) */}
        <div className="claims-form-group">
          <label className="claims-form-label">Passport Number</label>
          <input
            type="text"
            className="claims-form-input"
            placeholder="Passport Number"
            value={formData.passportNumber}
            onChange={(e) =>
              handleInputChange('passportNumber', e.target.value)
            }
          />
        </div>
      </div>
    </ClaimsStepContainer>
  );
}
