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
  PrivatePensionProviderType,
  PrivateStatePensionRefundReceivedType,
  PrivateStatementValueType,
} from '@/components/vbl/get-started/flows';
import {
  extractPensionDocument,
  PensionDocumentExtractionDetails,
} from '@/lib/vbl-pension-document-extraction-api';

type UploadPhase = 'upload' | 'review' | 'state_pension_refund';

type PrivateUploadForm = {
  provider: PrivatePensionProviderType;
  statementAmount: string;
  statementValueType: PrivateStatementValueType;
  statePensionRefundReceived: PrivateStatePensionRefundReceivedType;
};

const PRIVATE_PROVIDERS: {
  id: Exclude<PrivatePensionProviderType, ''>;
  label: string;
}[] = [
  { id: 'Allianz', label: 'Allianz' },
  { id: 'Axa', label: 'AXA' },
  { id: 'Swiss_Life', label: 'Swiss Life' },
  { id: 'ERGO', label: 'ERGO' },
  { id: 'R_V', label: 'R+V' },
  { id: 'Nuernberger', label: 'Nürnberger' },
  { id: 'HDI', label: 'HDI' },
  { id: 'BVV', label: 'BVV' },
  { id: 'Other', label: 'Other provider' },
];

const VALUE_TYPE_OPTIONS: {
  id: Exclude<PrivateStatementValueType, ''>;
  label: string;
}[] = [
  { id: 'capital_amount', label: 'Surrender value — Rückkaufswert' },
  { id: 'monthly_pension', label: 'Monthly pension — monatliche Rente' },
  { id: 'not_found', label: 'No statement value shown / unclear' },
];

const EMPTY_FORM: PrivateUploadForm = {
  provider: '',
  statementAmount: '',
  statementValueType: '',
  statePensionRefundReceived: '',
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

function getPrivateProvider(
  provider: PensionDocumentExtractionDetails['provider']
): PrivatePensionProviderType {
  if (
    provider === 'Allianz' ||
    provider === 'Axa' ||
    provider === 'BVV' ||
    provider === 'Swiss_Life' ||
    provider === 'ERGO' ||
    provider === 'R_V' ||
    provider === 'Nuernberger' ||
    provider === 'HDI' ||
    provider === 'Other'
  ) {
    return provider;
  }
  return '';
}

function getStatementValueType(
  valueType: PensionDocumentExtractionDetails['bavStatementValueType']
): PrivateStatementValueType {
  if (
    valueType === 'monthly_pension' ||
    valueType === 'capital_amount' ||
    valueType === 'not_found'
  ) {
    return valueType;
  }
  return '';
}

function getStatePensionRefundReceived(
  value: PensionDocumentExtractionDetails['statePensionRefundReceived']
): PrivateStatePensionRefundReceivedType {
  if (value === 'yes' || value === 'no') return value;
  return '';
}

function mapExtractionToForm(
  details: PensionDocumentExtractionDetails
): PrivateUploadForm {
  return {
    provider: getPrivateProvider(details.provider),
    statementAmount: details.bavStatementAmount || '',
    statementValueType: getStatementValueType(details.bavStatementValueType),
    statePensionRefundReceived: getStatePensionRefundReceived(
      details.statePensionRefundReceived
    ),
  };
}

function isAmountRequired(form: PrivateUploadForm): boolean {
  return form.statementValueType !== 'not_found';
}

function getMissingCount(form: PrivateUploadForm): number {
  return [
    form.provider,
    isAmountRequired(form) ? form.statementAmount : 'not-required',
    form.statementValueType,
  ].filter((value) => !value).length;
}

function hasCompleteReviewDetails(form: PrivateUploadForm): boolean {
  return Boolean(
    form.provider &&
      form.statementValueType &&
      (!isAmountRequired(form) || form.statementAmount)
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
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
          <option key={option.id} value={option.id}>
            {option.label}
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
}> = ({ onBack, onContinue, canContinue }) => (
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
      Continue
      <ArrowRight className="h-5 w-5" />
    </button>
  </div>
);

const RefundStatusOption: React.FC<{
  value: Exclude<PrivateStatePensionRefundReceivedType, ''>;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ selected, onSelect, children }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={`flex min-h-[76px] w-full items-center gap-3 rounded-[7px] border px-5 py-4 text-left text-[15px] font-bold transition ${
      selected
        ? 'border-[#5A9A23] bg-[#9FE870] text-[#163300]'
        : 'border-[#D6DCE3] bg-[#EFF2F0] text-[#3F464F] hover:border-[#5A9A23]'
    }`}
  >
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
        selected ? 'bg-[#163300]' : 'border border-[#C6CED6] bg-white'
      }`}
    >
      {selected && <Check className="h-2.5 w-2.5 text-white" />}
    </span>
    {children}
  </button>
);

export const PrivateUploadDocument: React.FC = () => {
  const { data, goBack, goNext } = useEligibility();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<PrivateUploadForm>(() => ({
    ...EMPTY_FORM,
    provider: data.privatePensionProvider,
    statementAmount: data.privateStatementAmount,
    statementValueType: data.privateStatementValueType,
    statePensionRefundReceived: data.privateStatePensionRefundReceived,
  }));
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);

  const missingCount = useMemo(() => getMissingCount(form), [form]);
  const reviewIsMissing = missingCount > 0;
  const canConfirmReview = hasCompleteReviewDetails(form);
  const canConfirmRefundStatus = Boolean(form.statePensionRefundReceived);

  const updateForm = (updates: Partial<PrivateUploadForm>) => {
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
      const extraction = await extractPensionDocument(
        selectedFile,
        'bav_private'
      );
      const extractedForm = mapExtractionToForm(extraction.details);
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

  const handleConfirmReview = () => {
    setHasAttemptedContinue(true);
    if (!canConfirmReview) return;
    setPhase('state_pension_refund');
  };

  const handleConfirmRefundStatus = () => {
    if (!canConfirmRefundStatus) return;
    goNext({
      privateEntryPath: 'upload',
      privatePensionProvider: form.provider,
      privatePensionProviderOther: '',
      privateStatementAmount: form.statementAmount,
      privateStatementValueType: form.statementValueType,
      privateStatePensionRefundReceived: form.statePensionRefundReceived,
    });
  };

  if (phase === 'state_pension_refund') {
    return (
      <div className="mx-auto max-w-[640px]">
        <div className="mb-9 text-center">
          <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
            Have you already received your German state pension refund?
          </h2>
          <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
            For some bAV cash-outs, an approved German state pension refund can
            be important — especially if the pension amount is above the usual
            small-benefit range.
          </p>
        </div>

        <div className="mx-auto max-w-[560px] space-y-3">
          <RefundStatusOption
            value="yes"
            selected={form.statePensionRefundReceived === 'yes'}
            onSelect={() => updateForm({ statePensionRefundReceived: 'yes' })}
          >
            Yes, my German state pension refund has been approved
          </RefundStatusOption>
          <RefundStatusOption
            value="no"
            selected={form.statePensionRefundReceived === 'no'}
            onSelect={() => updateForm({ statePensionRefundReceived: 'no' })}
          >
            No, I have not received a German state pension refund
          </RefundStatusOption>
        </div>

        <div className="mx-auto mt-5 flex max-w-[560px] items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
          <p>
            A DRV refund does not include your bAV. It can only matter as part
            of a separate bAV cash-out request.
          </p>
        </div>

        <FooterActions
          onBack={() => setPhase('review')}
          onContinue={handleConfirmRefundStatus}
          canContinue={canConfirmRefundStatus}
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
              ? 'We could not confirm everything from your document. Please add the missing details so we can check whether your bAV cash-out can be started.'
              : 'Please check the details needed for the first cash-out check.'}
          </p>
        </div>

        <div className="space-y-5">
          <SelectField
            label="Provider"
            value={form.provider}
            onChange={(value) =>
              updateForm({ provider: value as PrivatePensionProviderType })
            }
            options={PRIVATE_PROVIDERS}
            placeholder="Select provider"
            error={hasAttemptedContinue && !form.provider}
          />

          {!reviewIsMissing && (
            <InfoNote>
              Enter the provider name shown on your document, such as Allianz,
              AXA, Swiss Life, ERGO, R+V, Nürnberger, HDI, BVV or another
              provider.
            </InfoNote>
          )}

          <label className="block text-left">
            <span className="mb-2 block text-[14px] font-semibold text-[#4A4F58]">
              Pension value
            </span>
            <input
              aria-label="Pension value"
              type="text"
              inputMode="numeric"
              value={form.statementAmount}
              onChange={(event) =>
                updateForm({
                  statementAmount: event.target.value.replace(/[^\d]/g, ''),
                })
              }
              placeholder="Pension value"
              className={`h-12 w-full rounded-[8px] border bg-white px-4 text-[16px] text-[#1F2937] shadow-sm transition-all focus:outline-none focus:ring-2 ${
                hasAttemptedContinue &&
                isAmountRequired(form) &&
                !form.statementAmount
                  ? 'border-[#B92513] focus:border-[#B92513] focus:ring-[#B92513]/20'
                  : 'border-[#D3DAE8] focus:border-[#9FE870] focus:ring-[#9FE870]/20'
              }`}
            />
            {hasAttemptedContinue &&
              isAmountRequired(form) &&
              !form.statementAmount && (
                <span className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-[#B92513]">
                  <Info className="h-3.5 w-3.5" />
                  Missing details
                </span>
              )}
          </label>

          {!reviewIsMissing && (
            <InfoNote>
              Enter the value shown on your document. If several values are
              shown, choose the one that looks most relevant. The provider
              confirms the final cash-out amount later.
            </InfoNote>
          )}

          <SelectField
            label="Value type shown on your document"
            value={form.statementValueType}
            onChange={(value) =>
              updateForm({
                statementValueType: value as PrivateStatementValueType,
              })
            }
            options={VALUE_TYPE_OPTIONS}
            placeholder="Select value type"
            error={hasAttemptedContinue && !form.statementValueType}
          />

          {!reviewIsMissing && (
            <InfoNote>
              These details are used only for the first cash-out check. If you
              continue, confirmed information can be carried into your secure
              claim.
            </InfoNote>
          )}

          <div className="flex items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
            <p>
              These details are used only for the first cash-out check. If you
              continue, confirmed information can be carried into your secure
              claim.
            </p>
          </div>
        </div>

        <FooterActions
          onBack={handleReviewBack}
          onContinue={handleConfirmReview}
          canContinue={canConfirmReview}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-8 text-center">
        <h2 className="text-[26px] font-bold leading-tight text-[#111827]">
          Upload your bAV document
        </h2>
        <div className="mx-auto mt-3 h-px w-full max-w-[560px] bg-[#D9DEE7]" />
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-6 text-[#4B5563]">
          Upload a provider letter, insurance statement, bAV contract summary or
          pension statement so we can check whether your cash-out can be
          started.
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
        <p className="mt-3 text-[14px] text-[#6B7280]">
          Accepted formats: PDF, JPG or PNG
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        name="privatePensionDocument"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={handleFileInput}
        className="hidden"
      />

      {selectedFile && (
        <div className="mt-4 flex items-center gap-3 rounded-[8px] border border-[#D3DAE8] bg-white px-4 py-3 text-left">
          <FileText className="h-5 w-5 shrink-0 text-[#5A9A23]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#1F2937]">
              {selectedFile.name}
            </p>
            <p className="text-[13px] text-[#6B7280]">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-left text-sm font-semibold text-[#B92513]">
          {uploadError}
        </p>
      )}

      <div className="mt-5 flex items-start gap-2 text-left text-[14px] leading-5 text-[#4B5563]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4B5563]" />
        <p>
          You can upload only the relevant page and hide details that are not
          needed for this check.
        </p>
      </div>

      <FooterActions
        onBack={goBack}
        onContinue={handleExtract}
        canContinue={Boolean(selectedFile) && !isExtracting}
      />
    </div>
  );
};

export default PrivateUploadDocument;
