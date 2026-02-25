'use client';

import React, { useState, useEffect } from 'react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import { useClaimQuery, useUpdateClaimMutation, useCompleteStepMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';

// Common countries for dropdown
const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CA', name: 'Canada' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

interface FormData {
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
}

interface CurrentAddressProps {
  claimId: string;
}

export default function CurrentAddress({ claimId }: CurrentAddressProps) {
  const { data: claim } = useClaimQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const { goToNextStep } = useClaimsStore();

  const [formData, setFormData] = useState<FormData>({
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  // Initialize form from claim data
  useEffect(() => {
    if (claim?.currentAddress) {
      setFormData({
        addressLine1: claim.currentAddress.addressLine1 || '',
        addressLine2: claim.currentAddress.addressLine2 || '',
        city: claim.currentAddress.city || '',
        postalCode: claim.currentAddress.postalCode || '',
        country: claim.currentAddress.country || '',
      });
    }
  }, [claim?.currentAddress]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.country) {
      newErrors.country = 'Country is required';
    }
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleContinue = async () => {
    // Mark all fields as touched
    setTouched({
      addressLine1: true,
      addressLine2: true,
      city: true,
      postalCode: true,
      country: true,
    });

    if (!validate()) return;

    await updateMutation.mutateAsync({
      claimId,
      data: {
        currentAddress: {
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
        },
      },
    });
    await completeMutation.mutateAsync({ claimId, stepName: 'currentAddress' });
    goToNextStep();
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  const isValid = Boolean(
    formData.country &&
    formData.addressLine1.trim() &&
    formData.city.trim() &&
    formData.postalCode.trim()
  );

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="currentAddress"
      title="Current address"
      description="This address is required by the German Pension Office."
      canContinue={isValid && !isSubmitting}
      onContinue={handleContinue}
    >
      <form className="claims-form" onSubmit={(e) => e.preventDefault()}>
        <div className="claims-form-group">
          <label htmlFor="addressLine1" className="claims-label">
            Address line 1
          </label>
          <input
            type="text"
            id="addressLine1"
            value={formData.addressLine1}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
            onBlur={() => handleBlur('addressLine1')}
            placeholder="Street Address"
            className={`claims-input ${touched.addressLine1 && errors.addressLine1 ? 'error' : ''}`}
            disabled={isSubmitting}
          />
          {touched.addressLine1 && errors.addressLine1 && (
            <span className="claims-error-text">{errors.addressLine1}</span>
          )}
        </div>

        <div className="claims-form-group">
          <label htmlFor="addressLine2" className="claims-label">
            Address line 2 (optional)
          </label>
          <input
            type="text"
            id="addressLine2"
            value={formData.addressLine2}
            onChange={(e) => handleChange('addressLine2', e.target.value)}
            onBlur={() => handleBlur('addressLine2')}
            placeholder="Apartment, suite, etc."
            className="claims-input"
            disabled={isSubmitting}
          />
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
              placeholder="City"
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
              placeholder="Postal code"
              className={`claims-input ${touched.postalCode && errors.postalCode ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            {touched.postalCode && errors.postalCode && (
              <span className="claims-error-text">{errors.postalCode}</span>
            )}
          </div>
        </div>

        <div className="claims-form-group">
          <label htmlFor="country" className="claims-label">
            Country
          </label>
          <select
            id="country"
            value={formData.country}
            onChange={(e) => handleChange('country', e.target.value)}
            onBlur={() => handleBlur('country')}
            className={`claims-select ${touched.country && errors.country ? 'error' : ''}`}
            disabled={isSubmitting}
          >
            <option value="">Select Country</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          {touched.country && errors.country && (
            <span className="claims-error-text">{errors.country}</span>
          )}
        </div>
      </form>
    </ClaimsStepContainer>
  );
}
