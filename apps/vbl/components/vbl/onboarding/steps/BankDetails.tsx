'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, CreditCard, User, Calendar, Info, ArrowLeft, Phone } from 'lucide-react';
import { useOnboarding, BankAccountOption } from '@/contexts/OnboardingContext';

interface BankDetailsProps {
  onNext: () => void;
}

type BankDetailsPhase = 'selection' | 'phone_entry' | 'third_party_confirm';

const BANK_OPTIONS: { value: BankAccountOption; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'open_free_account',
    label: 'Open free EUR account',
    icon: <CreditCard className="w-6 h-6" />,
    description: 'Applying takes a few minutes. Your IBAN is usually available within 2-3 business days. We\'ll prepare your claim and submit it as soon as your IBAN is added.',
  },
  {
    value: 'trusted_third_party',
    label: 'Use a trusted third-party account',
    icon: <User className="w-6 h-6" />,
    description: 'Please make sure you fully trust the account holder. The refund will be paid directly by the pension provider to this account, and the payment cannot be changed once issued.',
  },
  {
    value: 'add_later',
    label: "I'll add my IBAN in the next days",
    icon: <Calendar className="w-6 h-6" />,
    description: 'Applying takes a few minutes. Your IBAN is usually available within 2-3 business days. We\'ll prepare your claim and submit it as soon as your IBAN is added.',
  },
];

export const BankDetails: React.FC<BankDetailsProps> = ({ onNext }) => {
  const { data, updateBankDetails } = useOnboarding();
  const [showOptions, setShowOptions] = useState(false);
  const [phase, setPhase] = useState<BankDetailsPhase>('selection');

  const selectedOption = BANK_OPTIONS.find((opt) => opt.value === data.bankDetails.accountOption);

  // Determine if user can proceed based on current phase
  const canProceedFromSelection =
    data.bankDetails.iban !== '' ||
    data.bankDetails.accountOption === 'open_free_account' ||
    data.bankDetails.accountOption === 'trusted_third_party' ||
    data.bankDetails.accountOption === 'add_later';

  const canProceedFromPhoneEntry =
    data.bankDetails.phoneNumber !== '' && data.bankDetails.phoneConsent;

  const canProceedFromThirdParty =
    data.bankDetails.accountHolder !== '' &&
    data.bankDetails.iban !== '' &&
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
          To receive your supplementary pension refund, the pension provider requires a EUR/SEPA bank account.
          We can help you open a free EUR account via our banking partner.
          You'll receive your IBAN shortly and can return here to add it.
        </p>

        {/* Mobile Phone Number Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile phone number: <span className="text-gray-500">(required)</span>
          </label>
          <input
            type="tel"
            value={data.bankDetails.phoneNumber}
            onChange={(e) => updateBankDetails({ phoneNumber: e.target.value })}
            placeholder="Enter your mobile phone number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          {/* Info Banner */}
          <div className="mt-3 bg-[#163300] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#9FE870] flex-shrink-0" />
            <p className="text-sm text-white">
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
          You chose to receive the refund via a trusted third-party bank account.
          The pension provider will pay the refund directly to this account.
        </p>

        {/* Account Holder Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account holder:*
          </label>
          <input
            type="text"
            value={data.bankDetails.accountHolder}
            onChange={(e) => updateBankDetails({ accountHolder: e.target.value })}
            placeholder="Full name of the account holder"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          {/* Info Banner */}
          <div className="mt-3 bg-[#163300] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#9FE870] flex-shrink-0" />
            <p className="text-sm text-white">
              This must match the name on the bank account.
            </p>
          </div>
        </div>

        {/* IBAN Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            EUR / SEPA bank account (IBAN):*
          </label>
          <input
            type="text"
            value={data.bankDetails.iban}
            onChange={(e) => updateBankDetails({ iban: e.target.value })}
            placeholder="Enter the IBAN ..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
          {/* Info Banner */}
          <div className="mt-3 bg-[#163300] rounded-lg p-3 flex items-center gap-3">
            <Info className="w-5 h-5 text-[#9FE870] flex-shrink-0" />
            <p className="text-sm text-white">
              Only EUR/SEPA accounts are accepted.
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
            updateBankDetails({ iban: e.target.value, accountOption: 'own_iban' });
          }}
          placeholder="Enter the IBAN ..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
        />
        {/* Info Banner */}
        <div className="mt-3 bg-[#F0FDE4] rounded-lg p-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#163300] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#163300]">
            Supplementary pension refunds are paid directly by the pension provider via SEPA transfer. The account does not need to be in your own name.
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
            <div className="grid grid-cols-3 gap-3 mt-4">
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
