'use client';

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, CreditCard, User, Calendar, Info } from 'lucide-react';
import { useOnboarding, BankAccountOption } from '@/contexts/OnboardingContext';

interface BankDetailsProps {
  onNext: () => void;
}

const BANK_OPTIONS: { value: BankAccountOption; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'open_free_account',
    label: 'Open free EUR account',
    icon: <CreditCard className="w-6 h-6" />,
    description: 'We\'ll help you open a free EUR account to receive your refund directly.',
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

  const selectedOption = BANK_OPTIONS.find((opt) => opt.value === data.bankDetails.accountOption);

  const canProceed =
    data.bankDetails.iban !== '' ||
    data.bankDetails.accountOption === 'open_free_account' ||
    data.bankDetails.accountOption === 'trusted_third_party' ||
    data.bankDetails.accountOption === 'add_later';

  const handleOptionSelect = (option: BankAccountOption) => {
    updateBankDetails({ accountOption: option });
    if (option !== 'own_iban') {
      // Clear IBAN if selecting alternative option
      updateBankDetails({ iban: '' });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Which bank account should the refund be paid to?
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-8" />

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
          placeholder="DE89 3704 0044 0532 0130 00"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
        />
        <p className="text-sm text-gray-500 mt-2">
          Supplementary pension refunds are paid directly by the pension provider via SEPA transfer.
        </p>
      </div>

      {/* Expandable Options Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-2 text-[#163300] font-medium hover:opacity-70 transition-opacity"
        >
          Don't have a EUR/SEPA account yet?
          {showOptions ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showOptions && (
          <div className="mt-4 space-y-4">
            <p className="text-gray-600 text-sm">
              To receive the refund, the pension provider needs a EUR bank account.
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
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
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

export default BankDetails;
