'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, CreditCard, Info, User } from 'lucide-react';
import { BankAccountOption, useOnboarding } from '@/contexts/OnboardingContext';

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
  // Item 18a: lets this step intercept the global Back button while it's on
  // one of its internal branches (own/trusted/SummitFX), so Back returns to
  // the account-type selection phase instead of leaving the bank-details
  // sub-step. Pass null to release control back to the flow's default
  // substep-level Back behavior. Same mechanism as Identity.tsx's
  // setBackOverride.
  setBackOverride?: (handler: (() => void) | null) => void;
  // Item 18b: lets the top "Bank Details" tab reset this step's internal
  // phase back to the account-type selection screen when the user re-clicks
  // the already-active tab.
  setPhaseReset?: (handler: (() => void) | null) => void;
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

export const BankDetails: React.FC<BankDetailsProps> = ({
  onNext,
  setBackOverride,
  setPhaseReset,
}) => {
  const { data, updateBankDetails } = useOnboarding();
  const [phase, setPhase] = useState<BankDetailsPhase>('destination');

  // Task 6: identity.fullName was removed in favor of separate
  // firstName/middleName/lastName fields; assemble the display name here
  // the same way ReviewSubmit.tsx does (skip empty middle name).
  const identityFullName = [
    data.identity.firstName,
    data.identity.middleName,
    data.identity.lastName,
  ]
    .filter((part) => part.trim() !== '')
    .join(' ');

  // Client #14: default the account holder to the passport full name for the
  // user's own account. The trusted-person branch intentionally starts blank.
  useEffect(() => {
    if (
      data.bankDetails.accountOption === 'own_iban' &&
      !data.bankDetails.accountHolder &&
      identityFullName
    ) {
      updateBankDetails({ accountHolder: identityFullName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityFullName, data.bankDetails.accountOption]);

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
        accountHolder: identityFullName || data.bankDetails.accountHolder,
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

  const handleBackToDestination = useCallback(() => {
    setPhase('destination');
  }, []);

  const renderIbanError = () =>
    ibanShowsError ? (
      <p className="mt-1 text-xs text-red-600">
        Please enter a valid IBAN (starts with two letters, e.g. DE89 ...).
      </p>
    ) : null;

  // Item 18a: register/release the global Back override while on one of the
  // internal branches. Only the destination (account-type selection) phase
  // relies on the flow's default Back behavior (leaving the bank-details
  // sub-step); every other phase should return to destination instead.
  useEffect(() => {
    if (!setBackOverride) return;
    if (phase !== 'destination') {
      setBackOverride(handleBackToDestination);
    } else {
      setBackOverride(null);
    }
    return () => setBackOverride(null);
  }, [phase, setBackOverride, handleBackToDestination]);

  // Item 18b: register/release the "Bank Details" tab re-click reset handler
  // the same way, so clicking the tab while already on this sub-step resets
  // back to the account-type selection phase (but only from within a branch
  // — there is nothing to reset when already on destination).
  useEffect(() => {
    if (!setPhaseReset) return;
    if (phase !== 'destination') {
      setPhaseReset(handleBackToDestination);
    } else {
      setPhaseReset(null);
    }
    return () => setPhaseReset(null);
  }, [phase, setPhaseReset, handleBackToDestination]);

  if (phase === 'phone_entry') {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Open a EUR account
        </h2>
        <div className="mx-auto mb-4 h-0.5 w-16 bg-gray-200" />
        <p className="mb-8 text-center text-gray-600">
          Open a EUR account with SummitFX and receive an IBAN for your pension
          payment. After your account has been approved and your IBAN is
          available, return to CompanyPension and add it to your claim.
        </p>

        <div className="mb-8 flex justify-center">
          <Image
            src="/summitfx-logo.png"
            alt="SummitFX"
            width={149}
            height={26}
            unoptimized
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Mobile phone number
          </label>
          <input
            type="tel"
            value={data.bankDetails.phoneNumber}
            onChange={(e) => updateBankDetails({ phoneNumber: e.target.value })}
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
          Continue with SummitFX
          <ArrowRight className="h-4 w-4" />
        </button>
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
            placeholder="Enter the IBAN ..."
            className={`w-full rounded-lg border px-4 py-3 outline-none focus:border-transparent focus:ring-2 focus:ring-[#9FE870] ${
              ibanShowsError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {renderIbanError()}
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.bankDetails.thirdPartyConfirmed}
            onChange={(e) =>
              updateBankDetails({ thirdPartyConfirmed: e.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
          />
          <p className="text-sm text-gray-700">
            I confirm that I have permission to use this bank account and that I
            trust the account holder.
          </p>
        </label>

        <div className="mb-6 flex items-center gap-3 rounded-lg bg-[#F0FDE4] p-3">
          <Info className="h-5 w-5 flex-shrink-0 text-[#163300]" />
          <p className="text-sm text-[#163300]">
            The payment cannot be changed once issued.
          </p>
        </div>

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
                  isSelected
                    ? 'bg-[#9FE870] text-[#163300]'
                    : 'bg-gray-100 text-gray-500'
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
