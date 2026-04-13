'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, CreditCard, User, Info, ArrowLeft } from 'lucide-react';
import { useOnboarding, BankAccountOption } from '@/contexts/OnboardingContext';

// Client #14: lightweight IBAN format validator. Accepts input with spaces
// (they are stripped), checks country + check digits + length in the ISO
// 13616 range. This is a structural check, not the full mod-97 verification,
// which the backend performs on submission.
const isValidIbanFormat = (raw: string): boolean => {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;
  return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban);
};

interface BankDetailsProps {
  onNext: () => void;
}

type BankDetailsPhase = 'selection' | 'phone_entry' | 'third_party_confirm';

const BANK_OPTIONS: { value: BankAccountOption; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'open_free_account',
    label: 'Open free EUR account',
    icon: <CreditCard className="w-6 h-6" />,
    description:
      'Opening a EUR account usually takes only a few minutes. Your IBAN is usually available within 2–3 business days. You can add it later, and your claim will be ready for submission once the IBAN has been provided. You\'ll be guided through the account-opening process with our EUR account partner.',
  },
  {
    value: 'trusted_third_party',
    label: 'Use a trusted third-party account',
    icon: <User className="w-6 h-6" />,
    description:
      'Please make sure you fully trust the account holder. The refund will be paid directly by the pension provider to this account, and the payment cannot be changed once issued.',
  },
];

export const BankDetails: React.FC<BankDetailsProps> = ({ onNext }) => {
  const { data, updateBankDetails } = useOnboarding();
  const [showOptions, setShowOptions] = useState(false);
  const [phase, setPhase] = useState<BankDetailsPhase>('selection');

  // Client #14: default the account holder to the passport full name on
  // first visit. The user can still change it (e.g. third-party account).
  useEffect(() => {
    if (!data.bankDetails.accountHolder && data.identity.fullName) {
      updateBankDetails({ accountHolder: data.identity.fullName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.identity.fullName]);

  const selectedOption = BANK_OPTIONS.find((opt) => opt.value === data.bankDetails.accountOption);

  // Client #14: IBAN must pass format validation before the user can continue.
  // We only enforce the check when an IBAN is actually required for the chosen
  // option (own IBAN or trusted third-party).
  const ibanIsValid = isValidIbanFormat(data.bankDetails.iban);
  const ibanShowsError =
    data.bankDetails.iban.length >= 4 && !ibanIsValid;

  // Determine if user can proceed based on current phase
  const canProceedFromSelection =
    (ibanIsValid) ||
    data.bankDetails.accountOption === 'open_free_account' ||
    data.bankDetails.accountOption === 'trusted_third_party';

  const canProceedFromPhoneEntry =
    data.bankDetails.phoneNumber !== '' && data.bankDetails.phoneConsent;

  const canProceedFromThirdParty =
    data.bankDetails.accountHolder !== '' &&
    ibanIsValid &&
    data.bankDetails.thirdPartyConfirmed;

  const handleOptionSelect = (option: BankAccountOption) => {
    updateBankDetails({ accountOption: option });
    if (option !== 'own_iban' && option !== 'trusted_third_party') {
      // Clear IBAN if selecting non-IBAN option
      updateBankDetails({ iban: '' });
    }
  };

  const handleContinueFromSelection = () => {
    if (data.bankDetails.accountOption === 'open_free_account') {
      setPhase('phone_entry');
    } else if (data.bankDetails.accountOption === 'trusted_third_party') {
      setPhase('third_party_confirm');
    } else {
      onNext();
    }
  };

  const handleBackToSelection = () => {
    setPhase('selection');
  };

  // Phase: Phone Entry (for "Open free EUR account")
  if (phase === 'phone_entry') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Open your free EUR account
        </h2>
        <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-4" />
        <p className="text-gray-600 text-center mb-8">
          To receive your company pension refund, the pension provider requires a EUR / SEPA bank account. You can open a free EUR account with our banking partner. Your IBAN is usually available within 2–3 business days, and you can return here to add it to your claim.
        </p>

        {/* Mobile Phone Number Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile phone number (required)
          </label>
          <input
            type="tel"
            value={data.bankDetails.phoneNumber}
            onChange={(e) => updateBankDetails({ phoneNumber: e.target.value })}
            placeholder="Enter your mobile phone number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          {/* Info Banner */}
          <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
            <p className="text-sm text-[#163300]">
              The bank uses your mobile number to set up and activate your account.
            </p>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.bankDetails.phoneConsent}
              onChange={(e) => updateBankDetails({ phoneConsent: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
            />
            <div>
              <p className="text-sm text-gray-700">
                I agree that my personal information is shared with the banking partner to open my EUR account.
              </p>
              <p className="text-sm text-gray-500 italic mt-1">
                This includes your name, date of birth, address, and contact details. The information is used only to open the bank account and is not used for marketing.
              </p>
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onNext}
            disabled={!canProceedFromPhoneEntry}
            className={`w-full py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
              canProceedFromPhoneEntry
                ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleBackToSelection}
            className="w-full py-3 px-6 text-gray-600 font-medium hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  // Phase: Third Party Confirmation
  if (phase === 'third_party_confirm') {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Enter the bank details for the refund
        </h2>
        <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-4" />
        <p className="text-gray-600 text-center mb-8">
          You chose to receive the refund via a trusted third-party bank account. The pension provider will pay the refund directly to this account.
        </p>

        {/* Account Holder Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account holder
          </label>
          <input
            type="text"
            value={data.bankDetails.accountHolder}
            onChange={(e) => updateBankDetails({ accountHolder: e.target.value })}
            placeholder="Full name of the account holder"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          {/* Info Banner */}
          <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
            <p className="text-sm text-[#163300]">
              Please enter the account holder name exactly as shown on the bank account.
            </p>
          </div>
        </div>

        {/* IBAN Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            EUR / SEPA bank account (IBAN)
          </label>
          <input
            type="text"
            value={data.bankDetails.iban}
            onChange={(e) =>
              updateBankDetails({ iban: e.target.value.toUpperCase() })
            }
            placeholder="Enter the IBAN"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none ${
              ibanShowsError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {ibanShowsError && (
            <p className="mt-1 text-xs text-red-600">
              Please enter a valid IBAN (starts with two letters, e.g. DE89 …).
            </p>
          )}
          {/* Info Banner */}
          <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
            <p className="text-sm text-[#163300]">
              Only EUR / SEPA accounts are accepted.
            </p>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.bankDetails.thirdPartyConfirmed}
              onChange={(e) => updateBankDetails({ thirdPartyConfirmed: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
            />
            <div>
              <p className="text-sm text-gray-700">
                I confirm that I have permission to use this bank account and fully trust the account holder.
              </p>
              <p className="text-sm text-gray-500 italic mt-1">
                The refund will be paid directly by the pension provider to this account and cannot be changed once issued.
              </p>
            </div>
          </label>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onNext}
            disabled={!canProceedFromThirdParty}
            className={`w-full py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
              canProceedFromThirdParty
                ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleBackToSelection}
            className="w-full py-3 px-6 text-gray-600 font-medium hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  // Phase: Selection (default)
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Which bank account should the refund be paid to?
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-8" />

      {/* Account Holder Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account holder
        </label>
        <input
          type="text"
          value={data.bankDetails.accountHolder}
          onChange={(e) => {
            updateBankDetails({ accountHolder: e.target.value });
          }}
          placeholder="Full name of the account holder"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
        />
        {/* Info Banner */}
        <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-center gap-3">
          <Info className="w-5 h-5 text-[#163300] flex-shrink-0" />
          <p className="text-sm text-[#163300]">
            The account does not need to be in your own name.
          </p>
        </div>
      </div>

      {/* IBAN Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          EUR / SEPA bank account (IBAN)
        </label>
        <input
          type="text"
          value={data.bankDetails.iban}
          onChange={(e) => {
            updateBankDetails({
              iban: e.target.value.toUpperCase(),
              accountOption: 'own_iban',
            });
          }}
          placeholder="Enter the IBAN ..."
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none ${
            ibanShowsError ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {ibanShowsError && (
          <p className="mt-1 text-xs text-red-600">
            Please enter a valid IBAN (starts with two letters, e.g. DE89 …).
          </p>
        )}
        {/* Info Banner */}
        <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#163300] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#163300]">
            Refunds are paid directly by the pension provider via SEPA transfer. The account may be in your own name or in the name of a trusted third party.
          </p>
        </div>
      </div>

      {/* Expandable Options Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-[#163300] font-medium hover:opacity-70 transition-opacity"
        >
          Don't have a EUR/SEPA account anymore?
          {showOptions ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showOptions && (
          <div className="mt-4 space-y-4">
            <p className="text-gray-600 text-sm">
              To pay the refund, the pension provider requires a EUR/SEPA bank account.
            </p>
            <p className="text-gray-600 text-sm">This can be:</p>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
              <li>Your own EUR/SEPA account or</li>
              <li>The account of a trusted third party (e.g. partner, family member, close friend).</li>
            </ul>
            <p className="text-gray-600 text-sm">
              Many users choose to open a free EUR account so the refund is paid directly to them.
            </p>

            {/* Option Cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {BANK_OPTIONS.map((option) => {
                const isSelected = data.bankDetails.accountOption === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionSelect(option.value)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? 'border-[#9FE870] bg-[#9FE870]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#163300] rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}

                    <div
                      className={`w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center ${
                        isSelected ? 'bg-[#163300]/10' : 'bg-gray-100'
                      }`}
                    >
                      <div className={isSelected ? 'text-[#163300]' : 'text-gray-500'}>
                        {option.icon}
                      </div>
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? 'text-[#163300]' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Info Box for Selected Option */}
            {selectedOption && data.bankDetails.accountOption !== 'own_iban' && (
              <div className="bg-[#F0FDE4] rounded-lg p-4 flex gap-3 mt-4">
                <Info className="w-5 h-5 text-[#163300] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#163300]">{selectedOption.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinueFromSelection}
        disabled={!canProceedFromSelection}
        className={`w-full py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
          canProceedFromSelection
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

export default BankDetails;
