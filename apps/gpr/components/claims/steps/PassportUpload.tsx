'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Calendar, ChevronDown } from 'lucide-react';
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

/**
 * Normalize date string to YYYY-MM-DD format for API compatibility.
 * Handles various input formats from OCR:
 * - YYYY-MM-DD (already correct)
 * - DD/MM/YYYY or DD-MM-YYYY
 * - MM/DD/YYYY or MM-DD-YYYY
 * - YYYY/MM/DD
 */
function normalizeDateToISO(dateStr: string | undefined | null): string {
  if (!dateStr) return '';

  // Remove any extra whitespace
  const cleaned = dateStr.trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try parsing with Date object and format properly
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY (common European format)
  const euroMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Handle YYYY/MM/DD
  const isoSlashMatch = cleaned.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (isoSlashMatch) {
    const [, year, month, day] = isoSlashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Return original if no format matched (might still be valid)
  return cleaned;
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
    if (hasPassport && subStep === 'upload') {
      setSubStep('details');
    }
  }, [hasPassport, subStep]);

  const handleFileChange = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
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
      } else {
        console.log('[PassportUpload] No OCR data received');
      }

      // Transition to details view
      console.log('[PassportUpload] Transitioning to details view');
      setSubStep('details');
    } catch (error) {
      console.error('[PassportUpload] Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDetailsSubmit = async () => {
    try {
      // Update claim with passport details, ensuring dates are in YYYY-MM-DD format
      await updateMutation.mutateAsync({
        claimId,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: normalizeDateToISO(formData.dateOfBirth),
          gender: formData.gender as 'male' | 'female' | 'other',
          placeOfBirth: formData.placeOfBirth,
          nationality: formData.nationality,
          passportIssueDate: normalizeDateToISO(formData.passportIssueDate),
          passportExpiryDate: normalizeDateToISO(formData.passportExpiryDate),
          passportNumber: formData.passportNumber,
        },
      });

      // Mark step as complete
      await completeMutation.mutateAsync({
        claimId,
        stepName: 'passportUpload',
      });

      // Navigate to next step
      goToNextStep();
    } catch (error) {
      console.error('Failed to save passport details:', error);
    }
  };

  const isUploading = uploadMutation.isPending;
  const isSubmitting = updateMutation.isPending || completeMutation.isPending;
  const canSubmitDetails = formData.firstName && formData.lastName && formData.dateOfBirth && formData.gender && formData.passportNumber;

  // Upload screen
  if (subStep === 'upload') {
    return (
      <ClaimsStepContainer
        claimId={claimId}
        stepName="passportUpload"
        title="Upload your passport"
        description="The German Pension Office requires your passport to verify your identity. We use it to prepare your refund documents automatically on your behalf."
        canContinue={hasPassport}
        onContinue={() => setSubStep('details')}
      >
        <div
          className={`claims-upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="claims-upload-zone-content">
            <Upload className="claims-upload-icon" />
            <p className="claims-upload-text">Choose a file or drag & drop it here</p>
            <p className="claims-upload-formats">PDF, JPG or PNG</p>

            <label className="claims-upload-btn">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                disabled={isUploading}
                hidden
              />
              {isUploading ? 'Uploading...' : 'Upload passport'}
            </label>
          </div>

          {uploadError && (
            <p className="claims-upload-error">{uploadError}</p>
          )}
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
      canContinue={!!canSubmitDetails && !isSubmitting}
      onContinue={handleDetailsSubmit}
      continueText={isSubmitting ? 'Saving...' : 'Confirm and continue'}
    >
      <div className="claims-passport-form">
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
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
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
              onChange={(e) => handleInputChange('placeOfBirth', e.target.value)}
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
                onChange={(e) => handleInputChange('passportIssueDate', e.target.value)}
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
                onChange={(e) => handleInputChange('passportExpiryDate', e.target.value)}
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
            onChange={(e) => handleInputChange('passportNumber', e.target.value)}
          />
        </div>
      </div>
    </ClaimsStepContainer>
  );
}
