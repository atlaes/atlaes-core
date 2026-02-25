'use client';

import React, { useState, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import DocumentUpload from '../DocumentUpload';
import { useClaimQuery, useClaimDocumentsQuery, useUpdateClaimMutation, useCompleteStepMutation, useUploadDocumentMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import { AbmeldungMethod } from '@/lib/claims-api';

type MethodChoice = 'upload' | 'manual' | null;

interface FormData {
  streetAddress: string;
  city: string;
  postalCode: string;
  moveOutDate: string;
}

interface LastAddressInGermanyProps {
  claimId: string;
}

export default function LastAddressInGermany({ claimId }: LastAddressInGermanyProps) {
  const { data: claim } = useClaimQuery(claimId);
  const { data: documents } = useClaimDocumentsQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const uploadMutation = useUploadDocumentMutation();
  const { goToNextStep } = useClaimsStore();

  // Determine initial method choice from saved data
  const getInitialMethodChoice = (): MethodChoice => {
    if (claim?.abmeldungMethod === 'uploaded') return 'upload';
    if (claim?.abmeldungMethod === 'manual') return 'manual';
    return null;
  };

  const [methodChoice, setMethodChoice] = useState<MethodChoice>(null);

  const [formData, setFormData] = useState<FormData>({
    streetAddress: '',
    city: '',
    postalCode: '',
    moveOutDate: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize from claim data
  useEffect(() => {
    if (claim) {
      setMethodChoice(getInitialMethodChoice());
      setFormData({
        streetAddress: claim.lastGermanAddress?.streetAddress || '',
        city: claim.lastGermanAddress?.city || '',
        postalCode: claim.lastGermanAddress?.postalCode || '',
        moveOutDate: claim.moveOutDate ? claim.moveOutDate.split('T')[0] : '',
      });
    }
  }, [claim]);

  // Find existing abmeldung document
  const abmeldungDoc = documents?.find((doc) => doc.documentRole === 'abmeldung');

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleUploadAbmeldung = async (file: File) => {
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({ claimId, file, role: 'abmeldung' });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      throw error;
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = 'Street address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }
    if (!formData.moveOutDate) {
      newErrors.moveOutDate = 'Move-out date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!methodChoice) return;

    // For manual entry, validate address fields
    if (methodChoice === 'manual') {
      setTouched({
        streetAddress: true,
        city: true,
        postalCode: true,
        moveOutDate: true,
      });

      if (!validate()) return;
    }

    // For upload, check that document exists
    if (methodChoice === 'upload' && !abmeldungDoc) {
      setUploadError('Please upload your Abmeldung document');
      return;
    }

    // Map methodChoice to AbmeldungMethod
    const abmeldungMethod: AbmeldungMethod = methodChoice === 'upload' ? 'uploaded' : 'manual';

    await updateMutation.mutateAsync({
      claimId,
      data: {
        lastGermanAddress: methodChoice === 'manual' ? {
          streetAddress: formData.streetAddress,
          city: formData.city,
          postalCode: formData.postalCode,
        } : undefined,
        moveOutDate: methodChoice === 'manual' ? formData.moveOutDate : undefined,
        abmeldungMethod,
      },
    });

    await completeMutation.mutateAsync({ claimId, stepName: 'lastAddressInGermany' });
    goToNextStep();
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  // Determine if we can continue based on method choice
  const canContinue = (() => {
    if (!methodChoice || isSubmitting) return false;

    if (methodChoice === 'upload') {
      return !!abmeldungDoc;
    }

    if (methodChoice === 'manual') {
      return !!(
        formData.streetAddress.trim() &&
        formData.city.trim() &&
        formData.postalCode.trim() &&
        formData.moveOutDate
      );
    }

    return false;
  })();

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="lastAddressInGermany"
      title="Last address in Germany"
      description="The deregistration certificate ('Abmeldung') is required for the refund process. If you don't have it at hand, you can still continue — just choose one of the options below."
      canContinue={canContinue}
      onContinue={handleContinue}
    >
      <div className="claims-type-options">
        {/* Upload option */}
        <button
          type="button"
          onClick={() => setMethodChoice('upload')}
          className={`claims-type-card ${methodChoice === 'upload' ? 'selected' : ''}`}
          disabled={isSubmitting}
        >
          <div className="claims-type-card-icon">
            <Upload className="w-5 h-5" />
          </div>
          <span className="claims-type-card-text">
            Upload deregistration certificate (Abmeldung)
          </span>
        </button>

        {/* Manual entry option */}
        <button
          type="button"
          onClick={() => setMethodChoice('manual')}
          className={`claims-type-card ${methodChoice === 'manual' ? 'selected' : ''}`}
          disabled={isSubmitting}
        >
          <div className="claims-type-card-icon">
            <FileText className="w-5 h-5" />
          </div>
          <span className="claims-type-card-text">
            Enter manually
          </span>
        </button>
      </div>

      {/* Show upload zone when "Upload" is selected */}
      {methodChoice === 'upload' && (
        <div className="claims-method-content">
          <p className="claims-method-description">
            The German Pension Office requires the deregistration certificate ('Abmeldung') to verify that you permanently left Germany.
          </p>
          <DocumentUpload
            label="Upload Abmeldung certificate"
            helperText="PDF, JPG, PNG"
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={10}
            currentFile={
              abmeldungDoc?.fileName ? { name: abmeldungDoc.fileName, url: abmeldungDoc.fileUrl } : null
            }
            onUpload={handleUploadAbmeldung}
            onRemove={() => {
              // TODO: Implement document removal
            }}
            isUploading={uploadMutation.isPending}
            error={uploadError || undefined}
          />
        </div>
      )}

      {/* Show address form when "Enter manually" is selected */}
      {methodChoice === 'manual' && (
        <div className="claims-method-content">
          <form className="claims-form" onSubmit={(e) => e.preventDefault()}>
            <div className="claims-form-group">
              <label htmlFor="streetAddress" className="claims-label">
                Street Address
              </label>
              <input
                type="text"
                id="streetAddress"
                value={formData.streetAddress}
                onChange={(e) => handleChange('streetAddress', e.target.value)}
                onBlur={() => handleBlur('streetAddress')}
                placeholder="e.g., Hauptstraße 123"
                className={`claims-input ${touched.streetAddress && errors.streetAddress ? 'error' : ''}`}
                disabled={isSubmitting}
              />
              {touched.streetAddress && errors.streetAddress && (
                <span className="claims-error-text">{errors.streetAddress}</span>
              )}
            </div>

            <div className="claims-form-row">
              <div className="claims-form-group">
                <label htmlFor="city" className="claims-label">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  onBlur={() => handleBlur('city')}
                  placeholder="e.g., Berlin"
                  className={`claims-input ${touched.city && errors.city ? 'error' : ''}`}
                  disabled={isSubmitting}
                />
                {touched.city && errors.city && (
                  <span className="claims-error-text">{errors.city}</span>
                )}
              </div>

              <div className="claims-form-group">
                <label htmlFor="postalCode" className="claims-label">
                  Postal code
                </label>
                <input
                  type="text"
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  onBlur={() => handleBlur('postalCode')}
                  placeholder="e.g., 10115"
                  className={`claims-input ${touched.postalCode && errors.postalCode ? 'error' : ''}`}
                  maxLength={5}
                  disabled={isSubmitting}
                />
                {touched.postalCode && errors.postalCode && (
                  <span className="claims-error-text">{errors.postalCode}</span>
                )}
              </div>
            </div>

            <div className="claims-form-group">
              <label htmlFor="moveOutDate" className="claims-label">
                Move-out date
              </label>
              <input
                type="date"
                id="moveOutDate"
                value={formData.moveOutDate}
                onChange={(e) => handleChange('moveOutDate', e.target.value)}
                onBlur={() => handleBlur('moveOutDate')}
                className={`claims-input ${touched.moveOutDate && errors.moveOutDate ? 'error' : ''}`}
                max={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
              />
              {touched.moveOutDate && errors.moveOutDate && (
                <span className="claims-error-text">{errors.moveOutDate}</span>
              )}
            </div>
          </form>
        </div>
      )}
    </ClaimsStepContainer>
  );
}
