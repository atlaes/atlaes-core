'use client';

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import { useClaimQuery, useUpdateClaimMutation, useCompleteStepMutation } from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';

type Currency = 'EUR' | 'USD' | 'GBP' | 'AUD' | 'CHF' | 'CAD' | 'NZD';

interface BankFormData {
  preferredCurrency: Currency;
  accountHolderName: string;
  bankName: string;
  bankCountry: string;
  // EUR fields
  iban: string;
  // AUD fields
  bsb: string;
  accountNumber: string;
  // Other currencies
  swiftBic: string;
}

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)' },
];

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

interface BankDetailsProps {
  claimId: string;
}

export default function BankDetails({ claimId }: BankDetailsProps) {
  const { data: claim } = useClaimQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const { goToNextStep } = useClaimsStore();

  const [formData, setFormData] = useState<BankFormData>({
    preferredCurrency: 'EUR',
    accountHolderName: '',
    bankName: '',
    bankCountry: '',
    iban: '',
    bsb: '',
    accountNumber: '',
    swiftBic: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BankFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof BankFormData, boolean>>>({});

  // Initialize from claim data
  useEffect(() => {
    if (claim) {
      setFormData({
        preferredCurrency: (claim.preferredCurrency as Currency) || 'EUR',
        accountHolderName: claim.bankDetails?.accountHolderName || '',
        bankName: claim.bankDetails?.bankName || '',
        bankCountry: claim.bankDetails?.bankCountry || '',
        iban: claim.bankDetails?.iban || '',
        bsb: claim.bankDetails?.bsb || '',
        accountNumber: claim.bankDetails?.accountNumber || '',
        swiftBic: claim.bankDetails?.swiftBic || '',
      });
    }
  }, [claim]);

  const handleChange = (field: keyof BankFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof BankFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Format IBAN with spaces every 4 characters
  const formatIban = (value: string): string => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIban(e.target.value);
    handleChange('iban', formatted);
  };

  // Format BSB as XXX-XXX
  const formatBsb = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
    }
    return digits;
  };

  const handleBsbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBsb(e.target.value);
    handleChange('bsb', formatted);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BankFormData, string>> = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    if (!formData.bankCountry) {
      newErrors.bankCountry = 'Bank country is required';
    }

    // Currency-specific validation
    if (formData.preferredCurrency === 'EUR') {
      if (!formData.iban.trim()) {
        newErrors.iban = 'IBAN is required for EUR payments';
      } else if (formData.iban.replace(/\s/g, '').length < 15) {
        newErrors.iban = 'Please enter a valid IBAN';
      }
    } else if (formData.preferredCurrency === 'AUD') {
      if (!formData.bsb.trim()) {
        newErrors.bsb = 'BSB is required for AUD payments';
      } else if (formData.bsb.replace(/\D/g, '').length !== 6) {
        newErrors.bsb = 'BSB must be 6 digits';
      }
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      }
    } else {
      // USD, GBP, CHF, CAD, NZD
      if (!formData.swiftBic.trim()) {
        newErrors.swiftBic = 'SWIFT/BIC code is required';
      } else if (formData.swiftBic.length < 8 || formData.swiftBic.length > 11) {
        newErrors.swiftBic = 'SWIFT/BIC must be 8-11 characters';
      }
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    // Touch all relevant fields
    setTouched({
      preferredCurrency: true,
      accountHolderName: true,
      bankName: true,
      bankCountry: true,
      iban: formData.preferredCurrency === 'EUR',
      bsb: formData.preferredCurrency === 'AUD',
      accountNumber: formData.preferredCurrency !== 'EUR',
      swiftBic: !['EUR', 'AUD'].includes(formData.preferredCurrency),
    });

    if (!validate()) return;

    await updateMutation.mutateAsync({
      claimId,
      data: {
        preferredCurrency: formData.preferredCurrency,
        bankDetails: {
          accountHolderName: formData.accountHolderName,
          bankName: formData.bankName,
          bankCountry: formData.bankCountry,
          iban: formData.preferredCurrency === 'EUR' ? formData.iban : undefined,
          bsb: formData.preferredCurrency === 'AUD' ? formData.bsb : undefined,
          accountNumber:
            formData.preferredCurrency !== 'EUR' ? formData.accountNumber : undefined,
          swiftBic:
            !['EUR', 'AUD'].includes(formData.preferredCurrency) ? formData.swiftBic : undefined,
        },
      },
    });

    await completeMutation.mutateAsync({ claimId, stepName: 'bankDetails' });
    goToNextStep();
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  const renderCurrencyFields = () => {
    if (formData.preferredCurrency === 'EUR') {
      return (
        <div className="claims-form-group">
          <label htmlFor="iban" className="claims-label">
            IBAN <span className="claims-required">*</span>
          </label>
          <input
            type="text"
            id="iban"
            value={formData.iban}
            onChange={handleIbanChange}
            onBlur={() => handleBlur('iban')}
            placeholder="DE89 3704 0044 0532 0130 00"
            className={`claims-input ${touched.iban && errors.iban ? 'error' : ''}`}
            disabled={isSubmitting}
          />
          {touched.iban && errors.iban && (
            <span className="claims-error-text">{errors.iban}</span>
          )}
        </div>
      );
    }

    if (formData.preferredCurrency === 'AUD') {
      return (
        <>
          <div className="claims-form-row">
            <div className="claims-form-group">
              <label htmlFor="bsb" className="claims-label">
                BSB <span className="claims-required">*</span>
              </label>
              <input
                type="text"
                id="bsb"
                value={formData.bsb}
                onChange={handleBsbChange}
                onBlur={() => handleBlur('bsb')}
                placeholder="XXX-XXX"
                className={`claims-input ${touched.bsb && errors.bsb ? 'error' : ''}`}
                maxLength={7}
                disabled={isSubmitting}
              />
              {touched.bsb && errors.bsb && (
                <span className="claims-error-text">{errors.bsb}</span>
              )}
            </div>

            <div className="claims-form-group">
              <label htmlFor="accountNumber" className="claims-label">
                Account Number <span className="claims-required">*</span>
              </label>
              <input
                type="text"
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                onBlur={() => handleBlur('accountNumber')}
                placeholder="Account number"
                className={`claims-input ${touched.accountNumber && errors.accountNumber ? 'error' : ''}`}
                disabled={isSubmitting}
              />
              {touched.accountNumber && errors.accountNumber && (
                <span className="claims-error-text">{errors.accountNumber}</span>
              )}
            </div>
          </div>
        </>
      );
    }

    // USD, GBP, CHF, CAD, NZD
    return (
      <>
        <div className="claims-form-group">
          <label htmlFor="swiftBic" className="claims-label">
            SWIFT/BIC Code <span className="claims-required">*</span>
          </label>
          <input
            type="text"
            id="swiftBic"
            value={formData.swiftBic}
            onChange={(e) => handleChange('swiftBic', e.target.value.toUpperCase())}
            onBlur={() => handleBlur('swiftBic')}
            placeholder="e.g., AAAAAABBCCC"
            className={`claims-input ${touched.swiftBic && errors.swiftBic ? 'error' : ''}`}
            maxLength={11}
            disabled={isSubmitting}
          />
          {touched.swiftBic && errors.swiftBic && (
            <span className="claims-error-text">{errors.swiftBic}</span>
          )}
        </div>

        <div className="claims-form-group">
          <label htmlFor="accountNumber" className="claims-label">
            Account Number <span className="claims-required">*</span>
          </label>
          <input
            type="text"
            id="accountNumber"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            onBlur={() => handleBlur('accountNumber')}
            placeholder="Account number"
            className={`claims-input ${touched.accountNumber && errors.accountNumber ? 'error' : ''}`}
            disabled={isSubmitting}
          />
          {touched.accountNumber && errors.accountNumber && (
            <span className="claims-error-text">{errors.accountNumber}</span>
          )}
        </div>
      </>
    );
  };

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="bankDetails"
      title="Bank Details"
      description="Enter your bank account details for receiving your pension refund."
      canContinue={!isSubmitting}
      onContinue={handleContinue}
    >
      <div className="claims-bank-section">
        <div className="claims-info-box">
          <Info className="w-5 h-5 text-blue-500" />
          <p>
            Your refund will be sent directly to this bank account. Please ensure all details are correct
            to avoid payment delays.
          </p>
        </div>

        <form className="claims-form" onSubmit={(e) => e.preventDefault()}>
          <div className="claims-form-group">
            <label htmlFor="preferredCurrency" className="claims-label">
              Preferred Currency <span className="claims-required">*</span>
            </label>
            <select
              id="preferredCurrency"
              value={formData.preferredCurrency}
              onChange={(e) => handleChange('preferredCurrency', e.target.value as Currency)}
              className="claims-select"
              disabled={isSubmitting}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>

          <div className="claims-form-group">
            <label htmlFor="accountHolderName" className="claims-label">
              Account Holder Name <span className="claims-required">*</span>
            </label>
            <input
              type="text"
              id="accountHolderName"
              value={formData.accountHolderName}
              onChange={(e) => handleChange('accountHolderName', e.target.value)}
              onBlur={() => handleBlur('accountHolderName')}
              placeholder="Name as it appears on your bank account"
              className={`claims-input ${touched.accountHolderName && errors.accountHolderName ? 'error' : ''}`}
              disabled={isSubmitting}
            />
            {touched.accountHolderName && errors.accountHolderName && (
              <span className="claims-error-text">{errors.accountHolderName}</span>
            )}
          </div>

          <div className="claims-form-row">
            <div className="claims-form-group">
              <label htmlFor="bankName" className="claims-label">
                Bank Name <span className="claims-required">*</span>
              </label>
              <input
                type="text"
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                onBlur={() => handleBlur('bankName')}
                placeholder="e.g., Commonwealth Bank"
                className={`claims-input ${touched.bankName && errors.bankName ? 'error' : ''}`}
                disabled={isSubmitting}
              />
              {touched.bankName && errors.bankName && (
                <span className="claims-error-text">{errors.bankName}</span>
              )}
            </div>

            <div className="claims-form-group">
              <label htmlFor="bankCountry" className="claims-label">
                Bank Country <span className="claims-required">*</span>
              </label>
              <select
                id="bankCountry"
                value={formData.bankCountry}
                onChange={(e) => handleChange('bankCountry', e.target.value)}
                onBlur={() => handleBlur('bankCountry')}
                className={`claims-select ${touched.bankCountry && errors.bankCountry ? 'error' : ''}`}
                disabled={isSubmitting}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {touched.bankCountry && errors.bankCountry && (
                <span className="claims-error-text">{errors.bankCountry}</span>
              )}
            </div>
          </div>

          {/* Currency-specific fields */}
          {renderCurrencyFields()}
        </form>
      </div>
    </ClaimsStepContainer>
  );
}
