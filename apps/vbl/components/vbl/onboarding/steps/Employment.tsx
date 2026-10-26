'use client';

import React from 'react';
import { ArrowRight, ChevronDown, Info, AlertCircle } from 'lucide-react';
import {
  useOnboarding,
  isEmploymentComplete,
  isValidGermanTaxId,
  type BavDurchfuehrungsweg,
} from '@/contexts/OnboardingContext';
import { DatePartsInput } from '../DatePartsInput';

interface EmploymentProps {
  onNext: () => void;
}

// bAV cash-out (private pension type only): the employer that granted the
// company pension, how the scheme is implemented (Durchführungsweg) and the
// two dates the Abfindung letters cite (employment end, leaving Germany).
// Feeds the employer_*/durchfuehrungsweg/de_departure_date/tax_id
// placeholders of the letter templates.

const DURCHFUEHRUNGSWEG_OPTIONS: {
  value: Exclude<BavDurchfuehrungsweg, ''>;
  label: string;
  hint: string;
}[] = [
  {
    value: 'Direktversicherung',
    label: 'Direktversicherung',
    hint: 'A life insurance policy taken out by your employer with an insurer (e.g. Allianz, AXA, Swiss Life).',
  },
  {
    value: 'Pensionskasse',
    label: 'Pensionskasse',
    hint: 'A pension fund such as BVV or an industry Pensionskasse.',
  },
  {
    value: 'Pensionsfonds',
    label: 'Pensionsfonds',
    hint: 'A Pensionsfonds run by an insurer or bank.',
  },
  {
    value: 'Direktzusage',
    label: 'Direktzusage (pension promise by the employer)',
    hint: 'Your employer pays the pension itself; there is no insurer or fund.',
  },
  {
    value: 'Unterstützungskasse',
    label: 'Unterstützungskasse',
    hint: 'A support fund sponsored by your employer.',
  },
];

// Default Durchführungsweg by provider chosen in eligibility. Insurers can
// run either a Direktversicherung or a Pensionskasse; Direktversicherung is
// the common case, the user can change it.
export function defaultDurchfuehrungswegForProvider(
  provider: string
): BavDurchfuehrungsweg {
  const p = provider.trim().toLowerCase();
  if (!p) return '';
  if (p.includes('bvv')) return 'Pensionskasse';
  if (p.includes('pensionskasse')) return 'Pensionskasse';
  if (p.includes('pensionsfonds')) return 'Pensionsfonds';
  if (p.includes('unterstützungskasse') || p.includes('unterstuetzungskasse'))
    return 'Unterstützungskasse';
  if (
    [
      'allianz',
      'axa',
      'swiss',
      'ergo',
      'r+v',
      'r_v',
      'nürnberger',
      'nuernberger',
      'hdi',
    ].some((k) => p.includes(k))
  ) {
    return 'Direktversicherung';
  }
  return '';
}

function FieldLabel({
  label,
  showMissing,
  optional,
}: {
  label: string;
  showMissing: boolean;
  optional?: boolean;
}) {
  return (
    <label
      className={`block text-sm font-medium mb-1 ${
        showMissing ? 'text-red-700' : 'text-gray-700'
      }`}
    >
      {label}
      {optional && (
        <span className="ml-1 font-normal text-gray-500">(optional)</span>
      )}
    </label>
  );
}

function MissingHint({ show, text }: { show: boolean; text?: string }) {
  if (!show) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-sm font-medium text-red-700">
      <AlertCircle className="h-3.5 w-3.5" />
      {text ?? 'Required'}
    </p>
  );
}

const INPUT_CLASS =
  'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none';

export const Employment: React.FC<EmploymentProps> = ({ onNext }) => {
  const { data, updateEmployment } = useOnboarding();
  const employment = data.employment;
  const providerName =
    data.membership.pensionProvider || 'your pension provider';
  const [submitAttempted, setSubmitAttempted] = React.useState(false);

  // Prefill the Durchführungsweg from the provider once, never overriding a
  // choice the user already made.
  React.useEffect(() => {
    if (employment.durchfuehrungsweg !== '') return;
    const guess = defaultDurchfuehrungswegForProvider(
      data.membership.pensionProvider
    );
    if (guess) updateEmployment({ durchfuehrungsweg: guess });
  }, [
    data.membership.pensionProvider,
    employment.durchfuehrungsweg,
    updateEmployment,
  ]);

  const missing = {
    employerName: employment.employerName.trim() === '',
    employmentEndDate: employment.employmentEndDate === '',
    durchfuehrungsweg: employment.durchfuehrungsweg === '',
    leftGermanyDate: employment.leftGermanyDate === '',
  };
  const taxIdInvalid =
    employment.taxId.trim() !== '' && !isValidGermanTaxId(employment.taxId);
  const canProceed = isEmploymentComplete(employment);
  const showMissing = submitAttempted;

  const selectedOption = DURCHFUEHRUNGSWEG_OPTIONS.find(
    (o) => o.value === employment.durchfuehrungsweg
  );

  const handleContinue = () => {
    if (!canProceed) {
      setSubmitAttempted(true);
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Your employment in Germany
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Tell us about the employer that set up your company pension with{' '}
        {providerName}. These details appear in your cash-out request.
      </p>

      <div className="space-y-5">
        <div>
          <FieldLabel
            label="Employer (legal name)"
            showMissing={showMissing && missing.employerName}
          />
          <input
            type="text"
            value={employment.employerName}
            onChange={(e) => updateEmployment({ employerName: e.target.value })}
            placeholder="e.g. Muster Technologies GmbH"
            className={`${INPUT_CLASS} ${
              showMissing && missing.employerName
                ? 'border-red-400'
                : 'border-gray-300'
            }`}
          />
          <MissingHint show={showMissing && missing.employerName} />
        </div>

        <DatePartsInput
          label="Last day of employment"
          value={employment.employmentEndDate}
          onChange={(value) => updateEmployment({ employmentEndDate: value })}
          helperText="The date your employment contract with this employer ended."
          showMissing={showMissing && missing.employmentEndDate}
        />

        <div>
          <FieldLabel label="Personnel number" showMissing={false} optional />
          <input
            type="text"
            value={employment.personnelNumber}
            onChange={(e) =>
              updateEmployment({ personnelNumber: e.target.value })
            }
            placeholder="Your employee or personnel number, if you know it"
            className={`${INPUT_CLASS} border-gray-300`}
          />
        </div>

        <div>
          <FieldLabel
            label="How is your company pension set up?"
            showMissing={showMissing && missing.durchfuehrungsweg}
          />
          <div className="relative">
            <select
              value={employment.durchfuehrungsweg}
              onChange={(e) =>
                updateEmployment({
                  durchfuehrungsweg: e.target.value as BavDurchfuehrungsweg,
                })
              }
              className={`${INPUT_CLASS} appearance-none bg-white ${
                showMissing && missing.durchfuehrungsweg
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
            >
              <option value="">Select</option>
              {DURCHFUEHRUNGSWEG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {selectedOption ? (
            <p className="mt-1 text-sm text-gray-500">{selectedOption.hint}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Your pension statement or contract usually names it. If unsure,
              pick the closest match; we check it against your documents.
            </p>
          )}
          <MissingHint show={showMissing && missing.durchfuehrungsweg} />
        </div>

        <DatePartsInput
          label="Date you left Germany"
          value={employment.leftGermanyDate}
          onChange={(value) => updateEmployment({ leftGermanyDate: value })}
          helperText="The date of your deregistration (Abmeldung) or your move abroad."
          showMissing={showMissing && missing.leftGermanyDate}
        />

        <div>
          <FieldLabel
            label="German tax ID (Steuer-ID)"
            showMissing={showMissing && taxIdInvalid}
            optional
          />
          <input
            type="text"
            inputMode="numeric"
            value={employment.taxId}
            onChange={(e) => updateEmployment({ taxId: e.target.value })}
            placeholder="11 digits, e.g. 12 345 678 901"
            className={`${INPUT_CLASS} ${
              taxIdInvalid ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <p className="mt-1 text-sm text-gray-500">
            Found on your German payslips or tax letters. Helps the provider
            report the payout correctly; leave empty if you no longer have it.
          </p>
          <MissingHint
            show={taxIdInvalid}
            text="The Steuer-ID has exactly 11 digits"
          />
        </div>
      </div>

      <div className="mt-6 bg-[#F0FDE4] rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#163300] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#163300]">
          Your request is addressed to{' '}
          {employment.durchfuehrungsweg === 'Direktzusage' ||
          employment.durchfuehrungsweg === 'Unterstützungskasse'
            ? 'your former employer, who is responsible for this type of pension.'
            : `${providerName}, with your former employer informed where the provider needs their approval.`}
        </p>
      </div>

      <button
        onClick={handleContinue}
        className={`w-full mt-6 py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
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

export default Employment;
