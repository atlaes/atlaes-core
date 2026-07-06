'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Info,
  UploadCloud,
} from 'lucide-react';
import { useEligibility } from '@/contexts/EligibilityContext';
import {
  StageContributionDurationType,
  StagePost2001ContributionDurationType,
  StagePost2018ContributionDurationType,
} from '@/components/vbl/get-started/flows';
import {
  extractPensionDocument,
  PensionDocumentExtractionDetails,
} from '@/lib/vbl-pension-document-extraction-api';

type StageUploadProvider = 'VddB' | 'VddKO' | '';
type UploadPhase = 'upload' | 'review' | 'contribution_check';

type StageUploadForm = {
  provider: StageUploadProvider;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  employmentEndMonth: string;
  employmentEndYear: string;
  employerName: string;
};

type ContributionCheckForm = {
  total: StageContributionDurationType;
  post2001: StagePost2001ContributionDurationType;
  post2018: StagePost2018ContributionDurationType;
};

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

const YEARS = Array.from(
  { length: new Date().getFullYear() - 2004 + 1 },
  (_, index) => String(2004 + index)
).reverse();

const EMPTY_FORM: StageUploadForm = {
  provider: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  employmentEndMonth: '',
  employmentEndYear: '',
  employerName: '',
};

const TOTAL_OPTIONS: {
  id: Exclude<StageContributionDurationType, ''>;
  label: string;
}[] = [
  { id: 'less_than_12', label: 'Less than 12 months' },
  { id: '12_to_35', label: '12 to 35 months' },
  { id: '36_to_119', label: '36 to 119 months' },
  { id: '120_plus', label: '120 months or more' },
];

const POST_2001_OPTIONS: {
  id: Exclude<StagePost2001ContributionDurationType, ''>;
  label: string;
}[] = [
  { id: 'less_than_60', label: 'Less than 60 months' },
  { id: '60_plus', label: '60 months or more' },
];

const POST_2018_OPTIONS: {
  id: Exclude<StagePost2018ContributionDurationType, ''>;
  label: string;
}[] = [
  { id: 'less_than_36', label: 'Less than 36 months' },
  { id: '36_plus', label: '36 months or more' },
];

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

function getStageProvider(
  provider: PensionDocumentExtractionDetails['provider']
): StageUploadProvider {
  if (provider === 'VddB' || provider === 'VddKO') return provider;
  return '';
}

function mapExtractionToForm(
  details: PensionDocumentExtractionDetails
): StageUploadForm {
  return {
    provider: getStageProvider(details.provider),
    startMonth: details.startMonth || '',
    startYear: details.startYear || '',
    endMonth: details.endMonth || '',
    endYear: details.endYear || '',
    employmentEndMonth: details.employmentEndMonth || '',
    employmentEndYear: details.employmentEndYear || '',
    employerName: '',
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

function getContributionMonths(form: StageUploadForm): number {
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

function getStageContributionDuration(
  months: number
): StageContributionDurationType {
  if (months < 12) return 'less_than_12';
  if (months < 36) return '12_to_35';
  if (months < 120) return '36_to_119';
  return '120_plus';
}

function hasCompleteRequiredDetails(form: StageUploadForm): boolean {
  return Boolean(
    form.provider &&
      form.startMonth &&
      form.startYear &&
      form.endMonth &&
      form.endYear &&
      form.employmentEndMonth &&
      form.employmentEndYear
  );
}

function hasInvalidContributionRange(form: StageUploadForm): boolean {
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

function getMissingCount(form: StageUploadForm): number {
  return [
    form.provider,
    form.startMonth,
    form.startYear,
    form.endMonth,
    form.endYear,
    form.employmentEndMonth,
    form.employmentEndYear,
  ].filter((value) => !value).length;
}

function canContinueContributionCheck(
  form: StageUploadForm,
  check: ContributionCheckForm
): boolean {
  if (!check.total) return false;
  if (check.total !== '36_to_119') return true;
  if (form.provider === 'VddB') return Boolean(check.post2001);
  if (form.provider === 'VddKO') return Boolean(check.post2018);
  return Boolean(check.post2001 || check.post2018);
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  error?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error = false,
}) => (
  <label className="block text-left">
    <span className="mb-2 block text-[14px] font-semibold text-[#4A4F58]">
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

const OptionGroup = <T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: { id: T; label: string }[];
  selected: T | '';
  onSelect: (value: T) => void;
}) => (
  <section className="rounded-[10px] bg-[#EEF6EA] p-6 text-left">
    <h3 className="mb-2 text-[17px] font-bold leading-6 text-[#3F464F]">
      {title}
    </h3>
    <p className="mb-3 text-[14px] font-semibold text-[#4A4F58]">
      Contribution period
    </p>
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`flex min-h-[42px] w-full items-center gap-3 rounded-[7px] border px-4 py-2 text-left text-[14px] font-semibold transition ${
              isSelected
                ? 'border-[#5A9A23] bg-[#9FE870] text-[#163300]'
                : 'border-[#D6DCE3] bg-white/55 text-[#3F464F] hover:border-[#5A9A23]'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                isSelected ? 'bg-[#163300]' : 'border border-[#C6CED6]'
              }`}
            >
              {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  </section>
);

export const StageUploadDocument: React.FC = () => {
  const { data, goBack, goNext } = useEligibility();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<StageUploadForm>(() => ({
    ...EMPTY_FORM,
    provider:
      data.pensionProvider === 'VddB' || data.pensionProvider === 'VddKO'
        ? data.pensionProvider
        : '',
    startMonth: data.contributionStartMonth,
    startYear: data.contributionStartYear,
    endMonth: data.contributionEndMonth,
    endYear: data.contributionEndYear,
    employmentEndMonth: data.employmentEndMonth,
    employmentEndYear: data.employmentEndYear,
  }));
  const [contributionCheck, setContributionCheck] =
    useState<ContributionCheckForm>({
      total: data.stageContributionDuration,
      post2001: data.stagePost2001ContributionDuration,
      post2018: data.stagePost2018ContributionDuration,
    });
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
  const totalMonths = getContributionMonths(form);
  const detectedDuration = totalMonths
    ? getStageContributionDuration(totalMonths)
    : '';

  const updateForm = (updates: Partial<StageUploadForm>) => {
    setForm((previous) => ({ ...previous, ...updates }));
  };

  const updateContributionCheck = (updates: Partial<ContributionCheckForm>) => {
    setContributionCheck((previous) => ({ ...previous, ...updates }));
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
      const extraction = await extractPensionDocument(
        selectedFile,
        'vddb_vddko'
      );
      const extractedForm = mapExtractionToForm(extraction.details);
      const extractedMissingCount = getMissingCount(extractedForm);
      setForm(extractedForm);
      setHasAttemptedContinue(extractedMissingCount > 0);
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

  const finishUploadCheck = (check: ContributionCheckForm) => {
    goNext({
      stageEntryPath: 'upload',
      pensionProvider: form.provider,
      contributionStartMonth: form.startMonth,
      contributionStartYear: form.startYear,
      contributionEndMonth: form.endMonth,
      contributionEndYear: form.endYear,
      employmentEndMonth: form.employmentEndMonth,
      employmentEndYear: form.employmentEndYear,
      stageContributionDuration: check.total,
      stagePost2001ContributionDuration:
        check.total === '36_to_119' ? check.post2001 : '',
      stagePost2018ContributionDuration:
        check.total === '36_to_119' ? check.post2018 : '',
    });
  };

  const handleConfirmReview = () => {
    setHasAttemptedContinue(true);
    if (!canConfirm || !detectedDuration) return;

    const nextCheck = {
      total: detectedDuration,
      post2001: contributionCheck.post2001,
      post2018: contributionCheck.post2018,
    };
    setContributionCheck(nextCheck);

    if (detectedDuration === '36_to_119') {
      setPhase('contribution_check');
      return;
    }

    finishUploadCheck(nextCheck);
  };

  const handleConfirmContributionCheck = () => {
    if (!canContinueContributionCheck(form, contributionCheck)) return;
    finishUploadCheck(contributionCheck);
  };

  if (phase === 'contribution_check') {
    const showPost2018 = form.provider === 'VddKO';
    const showPost2001 = form.provider === 'VddB';

    return (
      <div className="mx-auto max-w-[640px]">
        <div className="mb-9 text-center">
          <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
            A few more contribution details are needed
          </h2>
          <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
          <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-6 text-[#4B5563]">
            VddB/VddKO uses contribution-period rules based on how long and
            when contributions were paid.
          </p>
        </div>

        <div className="space-y-6">
          <OptionGroup
            title="How many VddB/VddKO contribution months do you have in total?"
            options={TOTAL_OPTIONS}
            selected={contributionCheck.total}
            onSelect={(value) =>
              updateContributionCheck({
                total: value,
                post2001: value === '36_to_119' ? contributionCheck.post2001 : '',
                post2018: value === '36_to_119' ? contributionCheck.post2018 : '',
              })
            }
          />

          {contributionCheck.total === '36_to_119' && showPost2018 && (
            <OptionGroup
              title="How many of those contribution months were after 1 January 2018?"
              options={POST_2018_OPTIONS}
              selected={contributionCheck.post2018}
              onSelect={(value) => updateContributionCheck({ post2018: value })}
            />
          )}

          {contributionCheck.total === '36_to_119' && showPost2001 && (
            <OptionGroup
              title="How many of those contribution months were after 1 January 2001?"
              options={POST_2001_OPTIONS}
              selected={contributionCheck.post2001}
              onSelect={(value) => updateContributionCheck({ post2001: value })}
            />
          )}
        </div>

        <FooterActions
          onBack={() => setPhase('review')}
          onContinue={handleConfirmContributionCheck}
          canContinue={canContinueContributionCheck(form, contributionCheck)}
        />
      </div>
    );
  }

  if (phase === 'review') {
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
              ? 'We could not confirm everything from your document. Please add the missing details so we can check whether your VddB/VddKO refund can be started.'
              : 'Please check the details needed for the first refund check.'}
          </p>
        </div>

        <div className="space-y-5">
          <SelectField
            label="Pension institution"
            value={form.provider}
            onChange={(value) =>
              updateForm({ provider: value as StageUploadProvider })
            }
            options={['VddB', 'VddKO']}
            placeholder="Select pension institution"
            error={hasAttemptedContinue && !form.provider}
          />

          {!reviewIsMissing && (
            <InfoNote>Use the pension institution shown on your document.</InfoNote>
          )}

          <div className="text-left">
            <p className="mb-3 text-[14px] font-semibold text-[#4A4F58]">
              Contribution Period
            </p>
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
              Use the contribution period shown on your VddB or VddKO document.
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
              />
              <SelectField
                label="Employment end year"
                value={form.employmentEndYear}
                onChange={(value) => updateForm({ employmentEndYear: value })}
                options={YEARS}
                placeholder="Select year"
                error={hasAttemptedContinue && !form.employmentEndYear}
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
              Use the date when your stage, theatre, opera or orchestra
              employment in Germany ended.
            </InfoNote>
          )}

          <label className="block text-left">
            <span className="mb-2 block text-[14px] font-semibold text-[#4A4F58]">
              Employer, stage or orchestra
            </span>
            <input
              value={form.employerName}
              onChange={(event) => updateForm({ employerName: event.target.value })}
              placeholder="Employer, stage or orchestra"
              className="h-12 w-full rounded-[8px] border border-[#D3DAE8] bg-white px-4 text-[16px] text-[#1F2937] shadow-sm transition-all focus:border-[#9FE870] focus:outline-none focus:ring-2 focus:ring-[#9FE870]/20"
            />
          </label>

          {!reviewIsMissing && (
            <InfoNote>
              Enter the employer, stage or orchestra shown on your document, if
              available.
            </InfoNote>
          )}

          <div className="flex items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
            <p>
              These details are used only for the first refund check. If you
              continue, confirmed information can be carried into your secure
              claim.
            </p>
          </div>
        </div>

        <FooterActions
          onBack={handleReviewBack}
          onContinue={handleConfirmReview}
          canContinue={canConfirm}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-8 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          Upload your stage or orchestra pension document
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
          Upload your VddB, VddKO, Bühnenversorgung or Kulturorchester
          document so we can check whether your refund can be started.
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
        name="stagePensionDocument"
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

export default StageUploadDocument;
