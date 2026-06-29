'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileText,
  Info,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import {
  ContributionDurationType,
  VBLPlan,
} from '@/components/vbl/get-started/flows';
import {
  extractPensionDocument,
  PensionDocumentExtractionDetails,
} from '@/lib/vbl-pension-document-extraction-api';

type UploadProvider = 'VBL' | 'ZVK' | '';
type UploadPhase = 'upload' | 'review';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FEDERAL_STATES = [
  'Berlin',
  'Baden-Württemberg',
  'Bavaria',
  'Berlin (West)',
  'Berlin (East)',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia',
];

const YEARS = Array.from(
  { length: new Date().getFullYear() - 2004 + 1 },
  (_, index) => String(2004 + index)
).reverse();

type UploadForm = {
  provider: UploadProvider;
  vblPlan: VBLPlan;
  federalState: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  employmentEndMonth: string;
  employmentEndYear: string;
};

const EMPTY_FORM: UploadForm = {
  provider: '',
  vblPlan: '',
  federalState: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  employmentEndMonth: '',
  employmentEndYear: '',
};

function isSupportedUpload(file: File): boolean {
  const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const supportedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const lowerName = file.name.toLowerCase();

  return (
    supportedTypes.includes(file.type) ||
    supportedExtensions.some((extension) => lowerName.endsWith(extension))
  );
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getUploadProvider(
  provider: PensionDocumentExtractionDetails['provider']
): UploadProvider {
  if (provider === 'VBL' || provider === 'ZVK') return provider;
  return '';
}

function mapExtractionToUploadForm(
  details: PensionDocumentExtractionDetails
): UploadForm {
  const provider = getUploadProvider(details.provider);

  return {
    provider,
    vblPlan: provider === 'VBL' ? details.vblPlan || '' : '',
    federalState: details.federalState || '',
    startMonth: details.startMonth || '',
    startYear: details.startYear || '',
    endMonth: details.endMonth || '',
    endYear: details.endYear || '',
    employmentEndMonth: details.employmentEndMonth || '',
    employmentEndYear: details.employmentEndYear || '',
  };
}

function getMonthIndex(month: string): number {
  return MONTHS.indexOf(month);
}

function hasDateParts(month: string, year: string): boolean {
  return Boolean(month && year && getMonthIndex(month) >= 0);
}

function isFutureMonth(month: string, year: string): boolean {
  if (!hasDateParts(month, year)) return false;

  const monthIndex = getMonthIndex(month);
  const numericYear = Number(year);
  const now = new Date();

  return (
    numericYear > now.getFullYear() ||
    (numericYear === now.getFullYear() && monthIndex > now.getMonth())
  );
}

function getContributionMonths(form: UploadForm): number {
  if (
    !hasDateParts(form.startMonth, form.startYear) ||
    !hasDateParts(form.endMonth, form.endYear)
  ) {
    return 0;
  }

  const start =
    Number(form.startYear) * 12 + getMonthIndex(form.startMonth);
  const end = Number(form.endYear) * 12 + getMonthIndex(form.endMonth);

  if (end < start) return 0;
  return end - start + 1;
}

function getContributionDuration(months: number): ContributionDurationType {
  if (months >= 60) return '60_plus';
  if (months >= 36) return '36_to_59';
  return 'less_than_36';
}

function hasCompleteRequiredDetails(form: UploadForm): boolean {
  return Boolean(
    form.provider &&
      (form.provider !== 'VBL' || form.vblPlan) &&
      form.federalState &&
      form.startMonth &&
      form.startYear &&
      form.endMonth &&
      form.endYear &&
      form.employmentEndMonth &&
      form.employmentEndYear
  );
}

function hasInvalidContributionRange(form: UploadForm): boolean {
  if (
    !hasDateParts(form.startMonth, form.startYear) ||
    !hasDateParts(form.endMonth, form.endYear)
  ) {
    return false;
  }

  const start =
    Number(form.startYear) * 12 + getMonthIndex(form.startMonth);
  const end = Number(form.endYear) * 12 + getMonthIndex(form.endMonth);

  return end < start;
}

function getMissingCount(form: UploadForm): number {
  const values = [
    form.provider,
    form.federalState,
    form.startMonth,
    form.startYear,
    form.endMonth,
    form.endYear,
    form.employmentEndMonth,
    form.employmentEndYear,
  ];

  if (form.provider === 'VBL') values.push(form.vblPlan);
  return values.filter((value) => !value).length;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  error?: boolean;
  hideLabel?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error = false,
  hideLabel = false,
}) => (
  <label className="block text-left">
    <span
      className={
        hideLabel
          ? 'sr-only'
          : 'mb-2 block text-[14px] font-semibold text-[#4A4F58]'
      }
    >
      {label}
    </span>
    <span className="relative block">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full cursor-pointer appearance-none rounded-[8px] border bg-white px-4 pr-10 text-[16px] text-[#1F2937] shadow-sm transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#B92513] focus:border-[#B92513] focus:ring-[#B92513]/20'
            : 'border-[#D3DAE8] focus:border-[#9FE870] focus:ring-[#9FE870]/20'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
    </span>
    {error && (
      <span className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#B92513]">
        <Info className="h-3.5 w-3.5" />
        Missing details
      </span>
    )}
  </label>
);

const InfoNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3 rounded-[8px] bg-[#EEF6EA] px-5 py-3 text-left text-[#4A4F58]">
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5A9A23]">
      <Info className="h-3.5 w-3.5 text-white" />
    </span>
    <p className="text-[14px] leading-5">{children}</p>
  </div>
);

const FooterActions: React.FC<{
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  continueText?: string;
}> = ({ onBack, onContinue, canContinue, continueText = 'Continue' }) => (
  <div className="mt-14 flex items-center justify-between gap-4">
    <button
      type="button"
      onClick={onBack}
      className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] border border-[#D3DAE8] bg-white px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:border-[#AEB4BF]"
    >
      <ArrowLeft className="h-5 w-5" />
      Back
    </button>
    <button
      type="button"
      onClick={onContinue}
      disabled={!canContinue}
      className="flex h-12 min-w-[164px] items-center justify-center gap-2 rounded-[8px] bg-[#9FE870] px-6 text-[17px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {continueText}
      <ArrowRight className="h-5 w-5" />
    </button>
  </div>
);

export const PublicUploadDocument: React.FC = () => {
  const { data, goBack, goNext } = useEligibility();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<UploadForm>(() => ({
    ...EMPTY_FORM,
    provider:
      data.pensionProvider === 'VBL' || data.pensionProvider === 'ZVK'
        ? data.pensionProvider
        : '',
    vblPlan: data.vblPlan,
    federalState: data.federalState,
    startMonth: data.contributionStartMonth,
    startYear: data.contributionStartYear,
    endMonth: data.contributionEndMonth,
    endYear: data.contributionEndYear,
    employmentEndMonth: data.employmentEndMonth,
    employmentEndYear: data.employmentEndYear,
  }));
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);

  const missingCount = useMemo(() => getMissingCount(form), [form]);
  const reviewIsMissing = missingCount > 0;
  const invalidContributionRange = hasInvalidContributionRange(form);
  const futureEmploymentEnd = isFutureMonth(
    form.employmentEndMonth,
    form.employmentEndYear
  );
  const canConfirm =
    hasCompleteRequiredDetails(form) &&
    !invalidContributionRange &&
    !futureEmploymentEnd;

  const updateForm = (updates: Partial<UploadForm>) => {
    setForm((previous) => ({ ...previous, ...updates }));
  };

  const handleFile = (file: File) => {
    if (!isSupportedUpload(file)) {
      setUploadError('Please upload a PDF, JPG or PNG file.');
      setSelectedFile(null);
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleExtract = async () => {
    if (!selectedFile || isExtracting) return;

    setIsExtracting(true);
    setUploadError('');

    try {
      const extraction = await extractPensionDocument(selectedFile, 'vbl_zvk');
      const extractedForm = mapExtractionToUploadForm(extraction.details);
      setForm(extractedForm);
      setHasAttemptedContinue(getMissingCount(extractedForm) > 0);
      setPhase('review');
    } catch (error: unknown) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Pension document extraction failed. Please try again.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReviewBack = () => {
    setPhase('upload');
    setHasAttemptedContinue(false);
  };

  const handleConfirm = () => {
    setHasAttemptedContinue(true);
    if (!canConfirm) return;

    const months = getContributionMonths(form);
    goNext({
      publicEntryPath: 'upload',
      pensionProvider: form.provider,
      vblPlan: form.provider === 'VBL' ? form.vblPlan : '',
      federalState: form.federalState,
      contributionStartMonth: form.startMonth,
      contributionStartYear: form.startYear,
      contributionEndMonth: form.endMonth,
      contributionEndYear: form.endYear,
      employmentEndMonth: form.employmentEndMonth,
      employmentEndYear: form.employmentEndYear,
      consecutiveContribution: months >= 36 ? 'yes' : 'no',
      contributionDuration: getContributionDuration(months),
    });
  };

  if (phase === 'review') {
    const providerLabel = reviewIsMissing
      ? 'Pension scheme shown on your document'
      : 'Pension scheme';

    return (
      <div className="mx-auto max-w-[640px]">
        <div className="mb-8 text-center">
          <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
            {reviewIsMissing
              ? 'A few details are still needed'
              : 'We found these details in your document'}
          </h2>
          <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
            {reviewIsMissing
              ? 'We could not confirm everything from your document. Please add the missing details so we can check whether your refund can be started.'
              : 'Please check the details needed for the first refund check.'}
          </p>
        </div>

        <div className="space-y-5">
          <SelectField
            label={providerLabel}
            value={form.provider}
            onChange={(value) =>
              updateForm({
                provider: value as UploadProvider,
                vblPlan: value === 'VBL' ? form.vblPlan : '',
              })
            }
            options={['VBL', 'ZVK']}
            placeholder="Select pension scheme"
            error={hasAttemptedContinue && !form.provider}
          />

          {!reviewIsMissing && (
            <InfoNote>Use the pension scheme shown on your document.</InfoNote>
          )}

          {form.provider === 'VBL' && (
            <div className="text-left">
              <p className="mb-3 text-[14px] font-semibold text-[#4A4F58]">
                VBL plan
              </p>
              <div className="flex flex-wrap gap-3">
                {(['VBLklassik', 'VBLextra'] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    aria-pressed={form.vblPlan === plan}
                    onClick={() => updateForm({ vblPlan: plan })}
                    className={`rounded-[7px] border px-5 py-2.5 text-[14px] font-semibold transition-all ${
                      form.vblPlan === plan
                        ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
                        : 'border-[#D6DCE3] bg-[#EFF2F0] text-[#163300] hover:border-[#163300]'
                    }`}
                  >
                    {plan}
                  </button>
                ))}
              </div>
              {hasAttemptedContinue && !form.vblPlan && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#B92513]">
                  <Info className="h-3.5 w-3.5" />
                  Missing details
                </p>
              )}
            </div>
          )}

          <SelectField
            label="Federal state or employer location"
            value={form.federalState}
            onChange={(value) => updateForm({ federalState: value })}
            options={FEDERAL_STATES}
            placeholder="Select federal state"
            error={hasAttemptedContinue && !form.federalState}
          />

          {!reviewIsMissing && (
            <InfoNote>
              Choose the German federal state where you mainly worked for this
              public-sector employer. If your document shows an employer
              location, use that.
            </InfoNote>
          )}

          <div className="text-left">
            {!reviewIsMissing && (
              <p className="mb-3 text-[14px] font-semibold text-[#4A4F58]">
                Contribution period
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Start month"
                value={form.startMonth}
                onChange={(value) => updateForm({ startMonth: value })}
                options={MONTHS}
                placeholder="Select start month"
                error={hasAttemptedContinue && !form.startMonth}
              />
              <SelectField
                label="Start year"
                value={form.startYear}
                onChange={(value) => updateForm({ startYear: value })}
                options={YEARS}
                placeholder="Select start year"
                error={hasAttemptedContinue && !form.startYear}
              />
              <SelectField
                label="End month"
                value={form.endMonth}
                onChange={(value) => updateForm({ endMonth: value })}
                options={MONTHS}
                placeholder="Select end month"
                error={hasAttemptedContinue && !form.endMonth}
              />
              <SelectField
                label="End year"
                value={form.endYear}
                onChange={(value) => updateForm({ endYear: value })}
                options={YEARS}
                placeholder="Select end year"
                error={hasAttemptedContinue && !form.endYear}
              />
            </div>
          </div>

          {invalidContributionRange && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-left text-sm font-semibold text-[#B92513]">
              End date cannot be earlier than start date.
            </p>
          )}

          {!reviewIsMissing && (
            <InfoNote>
              Use the contribution period shown on your VBL or ZVK document.
            </InfoNote>
          )}

          <div className="text-left">
            <p className="mb-3 text-[14px] font-semibold text-[#4A4F58]">
              Employment end date
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Employment end month"
                value={form.employmentEndMonth}
                onChange={(value) => updateForm({ employmentEndMonth: value })}
                options={MONTHS}
                placeholder="Select month"
                error={hasAttemptedContinue && !form.employmentEndMonth}
                hideLabel
              />
              <SelectField
                label="Employment end year"
                value={form.employmentEndYear}
                onChange={(value) => updateForm({ employmentEndYear: value })}
                options={YEARS}
                placeholder="Select year"
                error={hasAttemptedContinue && !form.employmentEndYear}
                hideLabel
              />
            </div>
          </div>

          {futureEmploymentEnd && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-left text-sm font-semibold text-[#B92513]">
              Employment end date cannot be in the future.
            </p>
          )}

          {!reviewIsMissing && (
            <InfoNote>
              Use the date when your public-sector employment ended.
            </InfoNote>
          )}

          {!reviewIsMissing && (
            <div className="flex items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
              <p>
                These details are used only for the first refund check. If you
                continue, confirmed information can be carried into your secure
                claim.
              </p>
            </div>
          )}
        </div>

        <FooterActions
          onBack={handleReviewBack}
          onContinue={handleConfirm}
          canContinue={canConfirm}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-8 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          Upload your pension document
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
          Upload your VBL or ZVK letter, statement or pension document so we
          can check whether your refund can be started with CompanyPension.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-[#8D8D8D] bg-white px-6 text-center transition hover:border-[#163300] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/30"
      >
        <UploadCloud className="mb-5 h-11 w-11 text-[#8D8D8D]" strokeWidth={2} />
        <p className="text-[16px] font-medium text-[#3F464F]">
          Drag and drop your file here or browse
        </p>
        <p className="mt-1 text-[16px] text-[#3F464F]">
          Accepted formats: PDF, JPG or PNG
        </p>
      </button>

      <input
        ref={inputRef}
        name="publicPensionDocument"
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={handleFileInput}
      />

      {selectedFile && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F0FDE4] px-3 py-2 text-sm text-[#163300]">
          <FileText className="h-4 w-4" />
          <span className="font-semibold">{selectedFile.name}</span>
          <span className="text-[#163300]/65">
            {formatFileSize(selectedFile.size)}
          </span>
        </div>
      )}

      {uploadError && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-[#B92513]">
          {uploadError}
        </p>
      )}

      <div className="mt-5 flex items-start gap-2 text-[14px] leading-5 text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          You can upload only the relevant page and hide details that are not
          needed for this check.
        </p>
      </div>

      <FooterActions
        onBack={goBack}
        onContinue={() => void handleExtract()}
        canContinue={Boolean(selectedFile) && !isExtracting}
        continueText={isExtracting ? 'Reading document' : 'Continue'}
      />
    </div>
  );
};

export default PublicUploadDocument;
