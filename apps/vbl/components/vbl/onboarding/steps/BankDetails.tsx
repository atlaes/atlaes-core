'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Info,
  User,
} from 'lucide-react';
import {
  BankAccountOption,
  useOnboarding,
} from '@/contexts/OnboardingContext';

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

type BankDetailsPhase =
  | 'destination'
  | 'own_details'
  | 'trusted_details'
  | 'phone_entry';

const DESTINATION_OPTIONS: {
  value: BankAccountOption;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'own_iban',
    label: 'My own EUR / SEPA account',
    description: 'Use a EUR / SEPA bank account in your own name.',
    icon: <CreditCard className="h-6 w-6" />,
  },
  {
    value: 'trusted_third_party',
    label: 'A trusted person’s EUR / SEPA account',
    description:
      'Use the account of someone you trust, such as a partner, family member or close friend.',
    icon: <User className="h-6 w-6" />,
  },
  {
    value: 'open_free_account',
    label: 'I want to open a free EUR account',
    description:
      'Open a EUR account through our account-opening partner, SummitFX.',
    icon: <CreditCard className="h-6 w-6" />,
  },
];

export const BankDetails: React.FC<BankDetailsProps> = ({ onNext }) => {
  const { data, updateBankDetails } = useOnboarding();
  const [phase, setPhase] = useState<BankDetailsPhase>('destination');

  // Client #14: default the account holder to the passport full name for the
  // user's own account. The trusted-person branch intentionally starts blank.
  useEffect(() => {
    if (
      data.bankDetails.accountOption === 'own_iban' &&
      !data.bankDetails.accountHolder &&
      data.identity.fullName
    ) {
      updateBankDetails({ accountHolder: data.identity.fullName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.identity.fullName, data.bankDetails.accountOption]);

  const ibanIsValid = isValidIbanFormat(data.bankDetails.iban);
  const ibanShowsError = data.bankDetails.iban.length >= 4 && !ibanIsValid;

  const canContinueOwn =
    data.bankDetails.accountHolder.trim() !== '' && ibanIsValid;
  const canContinueTrusted =
    data.bankDetails.accountHolder.trim() !== '' &&
    ibanIsValid &&
    data.bankDetails.thirdPartyConfirmed;
  const canContinueSummit =
    data.bankDetails.phoneNumber.trim() !== '' && data.bankDetails.phoneConsent;

  const handleOptionSelect = (option: BankAccountOption) => {
    if (option === 'own_iban') {
      updateBankDetails({
        accountOption: option,
        accountHolder: data.identity.fullName || data.bankDetails.accountHolder,
        thirdPartyConfirmed: false,
      });
      return;
    }

    if (option === 'trusted_third_party') {
      updateBankDetails({
        accountOption: option,
        accountHolder: '',
        iban: '',
        thirdPartyConfirmed: false,
      });
      return;
    }

    updateBankDetails({
      accountOption: option,
      iban: '',
      thirdPartyConfirmed: false,
    });
  };

  const handleContinueFromDestination = () => {
    if (data.bankDetails.accountOption === 'open_free_account') {
      setPhase('phone_entry');
    } else if (data.bankDetails.accountOption === 'trusted_third_party') {
      setPhase('trusted_details');
    } else {
      setPhase('own_details');
    }
  };

  const handleBackToDestination = () => {
    setPhase('destination');
  };

  const renderIbanError = () =>
    ibanShowsError ? (
      <p className="mt-1 text-xs text-red-600">
        Please enter a valid IBAN (starts with two letters, e.g. DE89 ...).
      </p>
    ) : null;

  const renderBranchBack = () => (
    <button
      type="button"
      onClick={handleBackToDestination}
      className="mx-auto mt-3 flex items-center justify-center gap-2 px-6 py-3 font-medium text-gray-600 transition-colors hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );

  if (phase === 'phone_entry') {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Open your free EUR account
        </h2>
        <div className="mx-auto mb-4 h-0.5 w-16 bg-gray-200" />
        <p className="mb-8 text-center text-gray-600">
          To receive your refund directly, you can open a EUR account with our
          account-opening partner, SummitFX. Your IBAN is usually available
          within 2-3 business days. You can return here and add it to your
          claim before submission.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Mobile phone number
          </label>
          <input
            type="tel"
            value={data.bankDetails.phoneNumber}
            onChange={(e) =>
              updateBankDetails({ phoneNumber: e.target.value })
            }
            placeholder="Enter your mobile phone number"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#9FE870]"
          />
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#F0FDE4] p-3">
            <Info className="h-5 w-5 flex-shrink-0 text-[#163300]" />
            <p className="text-sm text-[#163300]">
              SummitFX uses your mobile number to set up and activate your EUR
              account.
            </p>
          </div>
        </div>

        <label className="mb-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.bankDetails.phoneConsent}
            onChange={(e) =>
              updateBankDetails({ phoneConsent: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
          />
          <div>
            <p className="text-sm text-gray-700">
              I agree that my personal information is shared with SummitFX to
              open my EUR account.
            </p>
            <p className="mt-1 text-sm italic text-gray-500">
              This includes your name, date of birth, address and contact
              details. The information is used only to open the EUR account and
              is not used for marketing.
            </p>
          </div>
        </label>

        <button
          onClick={onNext}
          disabled={!canContinueSummit}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-semibold transition-colors ${
            canContinueSummit
              ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
              : 'cursor-not-allowed bg-gray-200 text-gray-500'
          }`}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
        {renderBranchBack()}
      </div>
    );
  }

  if (phase === 'trusted_details') {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Enter the trusted person’s bank details
        </h2>
        <div className="mx-auto mb-4 h-0.5 w-16 bg-gray-200" />
        <p className="mb-8 text-center text-gray-600">
          The refund will be paid directly by the pension provider to this
          account.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Account holder
          </label>
          <input
            type="text"
            value={data.bankDetails.accountHolder}
            onChange={(e) =>
              updateBankDetails({ accountHolder: e.target.value })
            }
            placeholder="Full name of the account holder"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#9FE870]"
          />
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#F0FDE4] p-3">
            <Info className="h-5 w-5 flex-shrink-0 text-[#163300]" />
            <p className="text-sm text-[#163300]">
              Enter the account holder name exactly as shown on the bank
              account.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            EUR / SEPA bank account — IBAN
          </label>
          <input
            type="text"
            value={data.bankDetails.iban}
            onChange={(e) =>
              updateBankDetails({ iban: e.target.value.toUpperCase() })
            }
            placeholder="Enter the IBAN"
            className={`w-full rounded-lg border px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#9FE870] ${
              ibanShowsError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {renderIbanError()}
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#F0FDE4] p-3">
            <Info className="h-5 w-5 flex-shrink-0 text-[#163300]" />
            <p className="text-sm text-[#163300]">
              Only EUR / SEPA accounts are accepted for this refund.
            </p>
          </div>
        </div>

        <label className="mb-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.bankDetails.thirdPartyConfirmed}
            onChange={(e) =>
              updateBankDetails({ thirdPartyConfirmed: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
          />
          <div>
            <p className="text-sm text-gray-700">
              I confirm that I have permission to use this bank account and
              that I trust the account holder.
            </p>
            <p className="mt-1 text-sm italic text-gray-500">
              The refund will be paid directly by the pension provider to this
              account and cannot be changed once issued.
            </p>
          </div>
        </label>

        <button
          onClick={onNext}
          disabled={!canContinueTrusted}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-semibold transition-colors ${
            canContinueTrusted
              ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
              : 'cursor-not-allowed bg-gray-200 text-gray-500'
          }`}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
        {renderBranchBack()}
      </div>
    );
  }

  if (phase === 'own_details') {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Enter your bank details
        </h2>
        <div className="mx-auto mb-8 h-0.5 w-16 bg-gray-200" />

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Account holder
          </label>
          <input
            type="text"
            value={data.bankDetails.accountHolder}
            onChange={(e) =>
              updateBankDetails({ accountHolder: e.target.value })
            }
            placeholder="Full name of the account holder"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#9FE870]"
          />
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#F0FDE4] p-3">
            <Info className="h-5 w-5 flex-shrink-0 text-[#163300]" />
            <p className="text-sm text-[#163300]">
              The account should be in your name.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            EUR / SEPA bank account — IBAN
          </label>
          <input
            type="text"
            value={data.bankDetails.iban}
            onChange={(e) =>
              updateBankDetails({
                iban: e.target.value.toUpperCase(),
                accountOption: 'own_iban',
              })
            }
            placeholder="Enter the IBAN ..."
            className={`w-full rounded-lg border px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#9FE870] ${
              ibanShowsError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {renderIbanError()}
        </div>

        <button
          onClick={onNext}
          disabled={!canContinueOwn}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-semibold transition-colors ${
            canContinueOwn
              ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
              : 'cursor-not-allowed bg-gray-200 text-gray-500'
          }`}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
        {renderBranchBack()}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Where should the refund be paid?
      </h2>
      <div className="mx-auto mb-4 h-0.5 w-16 bg-gray-200" />
      <p className="mb-8 text-center text-gray-600">
        The pension provider usually requires a EUR / SEPA bank account for the
        refund payment.
      </p>

      <div className="mb-8 grid gap-4">
        {DESTINATION_OPTIONS.map((option) => {
          const isSelected = data.bankDetails.accountOption === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleOptionSelect(option.value)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? 'border-[#9FE870] bg-[#F0FDE4]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-[#9FE870] text-[#163300]' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {option.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{option.label}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinueFromDestination}
        className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-[#9FE870] px-6 py-4 font-semibold text-[#163300] transition-colors hover:bg-[#8AD860]"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default BankDetails;
