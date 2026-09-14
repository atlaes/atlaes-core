'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Info,
  AlertCircle,
  Loader2,
  Upload,
  X,
  FileText,
} from 'lucide-react';
import {
  useOnboarding,
  isCashOutBasisComplete,
  BAV_STATEMENT_TYPES,
  type BavBenefitForm,
  type BavStatementType,
} from '@/contexts/OnboardingContext';
import { uploadDocument, extractDrvRefundDecision } from '@/lib/onboarding-api';
import {
  formatEuro,
  getBavThresholds,
  normalizeEuroAmount,
} from '@/lib/bav-thresholds';
import { DatePartsInput } from '../DatePartsInput';

interface CashOutBasisProps {
  onNext: () => void;
}

// bAV cash-out (private pension type only): the legal basis of the
// Abfindung request.
//   Route A — the DRV has already refunded the statutory pension
//             contributions (§ 3 Abs. 3 BetrAVG): upload the
//             Erstattungsbescheid, confirm office + decision date.
//   Route B — small entitlement (§ 3 Abs. 2 BetrAVG): upload the latest
//             statement and enter what it shows at retirement age.

const STATEMENT_TYPE_LABELS: Record<Exclude<BavStatementType, ''>, string> = {
  Standmitteilung: 'Standmitteilung (annual status letter)',
  Renteninformation: 'Renteninformation (pension information)',
  Austrittsmitteilung: 'Austrittsmitteilung (leaving notice)',
  Versicherungsschein: 'Versicherungsschein (policy document)',
};

const BENEFIT_FORM_OPTIONS: {
  value: Exclude<BavBenefitForm, ''>;
  label: string;
  hint: string;
}[] = [
  {
    value: 'pension',
    label: 'Monthly pension at retirement age',
    hint: 'A monthly amount the scheme expects to pay from retirement.',
  },
  {
    value: 'capital',
    label: 'One-off capital payment at retirement age',
    hint: 'A lump sum the scheme expects to pay at retirement.',
  },
  {
    value: 'unknown',
    label: 'Only the current value is shown',
    hint: 'The statement shows today’s balance (Deckungskapital) but no value at retirement. The provider will confirm the applicable value.',
  },
];

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

function FieldLabel({
  label,
  showMissing,
}: {
  label: string;
  showMissing: boolean;
}) {
  return (
    <label
      className={`block text-sm font-medium mb-1 ${
        showMissing ? 'text-red-700' : 'text-gray-700'
      }`}
    >
      {label}
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

interface DropzoneProps {
  id: string;
  title: string;
  hint: string;
  fileName?: string;
  uploading: boolean;
  error: string | null;
  showMissing: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}

function Dropzone({
  id,
  title,
  hint,
  fileName,
  uploading,
  error,
  showMissing,
  onFile,
  onRemove,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  if (fileName) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#9FE870] bg-[#F0FDE4] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-[#163300] flex-shrink-0" />
          <span className="text-sm text-[#163300] truncate">{fileName}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-[#9FE870] bg-[#F0FDE4]'
            : showMissing
              ? 'border-red-400'
              : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading and reading your document…
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-2 w-6 h-6 text-gray-400" />
            <p className="text-sm font-medium text-gray-800">{title}</p>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1 text-sm text-red-700">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      <MissingHint
        show={showMissing && !uploading}
        text="Please upload the document"
      />
    </div>
  );
}

export const CashOutBasis: React.FC<CashOutBasisProps> = ({ onNext }) => {
  const { data, updateCashOutBasis } = useOnboarding();
  const basis = data.cashOutBasis;
  const providerName =
    data.membership.pensionProvider || 'your pension provider';
  const thresholds = getBavThresholds();

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [uploadingDecision, setUploadingDecision] = useState(false);
  const [uploadingStatement, setUploadingStatement] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [decisionWarning, setDecisionWarning] = useState<string | null>(null);
  const userEditedOfficeRef = useRef(basis.drvOffice.trim() !== '');
  const userEditedDateRef = useRef(basis.drvDecisionDate !== '');

  useEffect(() => {
    // Reset the "submit attempted" highlights when the route flips.
    setSubmitAttempted(false);
  }, [basis.drvRefundReceived]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload a PDF, JPG, PNG or WEBP file.';
    }
    if (file.size > 10 * 1024 * 1024)
      return 'The file must be smaller than 10 MB.';
    return null;
  };

  const handleDecisionFile = useCallback(
    async (file: File) => {
      const problem = validateFile(file);
      if (problem) {
        setDecisionError(problem);
        return;
      }
      setDecisionError(null);
      setDecisionWarning(null);
      setUploadingDecision(true);
      updateCashOutBasis({
        refundDecisionFile: file,
        refundDecisionFileName: file.name,
      });
      const [upload, extraction] = await Promise.allSettled([
        uploadDocument(file, 'drv_refund_decision'),
        extractDrvRefundDecision(file),
      ]);
      if (upload.status === 'fulfilled') {
        updateCashOutBasis({
          refundDecisionDocumentId: upload.value.document.id,
        });
      } else {
        setDecisionError(
          'Upload failed. Please check your connection and try again.'
        );
        updateCashOutBasis({
          refundDecisionFile: null,
          refundDecisionFileName: undefined,
          refundDecisionDocumentId: undefined,
        });
        setUploadingDecision(false);
        return;
      }
      if (extraction.status === 'fulfilled') {
        const details = extraction.value.extraction.details;
        const updates: Partial<typeof basis> = {};
        if (details.drvOffice && !userEditedOfficeRef.current) {
          updates.drvOffice = details.drvOffice;
        }
        if (details.decisionDate && !userEditedDateRef.current) {
          updates.drvDecisionDate = details.decisionDate;
        }
        if (Object.keys(updates).length > 0) updateCashOutBasis(updates);
        if (details.isRefundDecision === false) {
          setDecisionWarning(
            'This does not look like a refund decision (Erstattungsbescheid). You can keep it, but please make sure you upload the letter in which the Deutsche Rentenversicherung granted your refund.'
          );
        }
      } else {
        setDecisionWarning(
          'We could not read the document automatically. Please enter the office and date from the letter below.'
        );
      }
      setUploadingDecision(false);
    },
    [updateCashOutBasis]
  );

  const handleStatementFile = useCallback(
    async (file: File) => {
      const problem = validateFile(file);
      if (problem) {
        setStatementError(problem);
        return;
      }
      setStatementError(null);
      setUploadingStatement(true);
      updateCashOutBasis({ statementFile: file, statementFileName: file.name });
      try {
        const result = await uploadDocument(file, 'pension_statement');
        updateCashOutBasis({ statementDocumentId: result.document.id });
      } catch {
        setStatementError(
          'Upload failed. Please check your connection and try again.'
        );
        updateCashOutBasis({
          statementFile: null,
          statementFileName: undefined,
          statementDocumentId: undefined,
        });
      } finally {
        setUploadingStatement(false);
      }
    },
    [updateCashOutBasis]
  );

  const canProceed =
    isCashOutBasisComplete(basis) && !uploadingDecision && !uploadingStatement;
  const showMissing = submitAttempted;

  const amountValue = normalizeEuroAmount(basis.benefitAmount);
  const amountNumber = amountValue === null ? null : Number(amountValue);
  const limit =
    basis.benefitForm === 'pension'
      ? thresholds.pension
      : basis.benefitForm === 'capital'
        ? thresholds.capital
        : null;
  const amountAboveLimit =
    limit !== null && amountNumber !== null && amountNumber > limit;
  const amountRequired =
    basis.benefitForm === 'pension' || basis.benefitForm === 'capital';

  const handleContinue = () => {
    if (!canProceed) {
      setSubmitAttempted(true);
      return;
    }
    onNext();
  };

  const chipClass = (selected: boolean) =>
    `flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
      selected
        ? 'border-[#9FE870] bg-[#9FE870] text-[#163300]'
        : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'
    }`;

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Basis of your cash-out request
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        German law allows a one-off payout of a company pension in two
        situations. Tell us which one applies to you.
      </p>

      <div className="space-y-6">
        <div>
          <FieldLabel
            label="Has the Deutsche Rentenversicherung already refunded your statutory pension contributions?"
            showMissing={showMissing && basis.drvRefundReceived === ''}
          />
          <div role="radiogroup" className="flex gap-3">
            <button
              type="button"
              role="radio"
              aria-checked={basis.drvRefundReceived === 'yes'}
              onClick={() => updateCashOutBasis({ drvRefundReceived: 'yes' })}
              className={chipClass(basis.drvRefundReceived === 'yes')}
            >
              Yes, I received the refund
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={basis.drvRefundReceived === 'no'}
              onClick={() => updateCashOutBasis({ drvRefundReceived: 'no' })}
              className={chipClass(basis.drvRefundReceived === 'no')}
            >
              No
            </button>
          </div>
          <MissingHint show={showMissing && basis.drvRefundReceived === ''} />
        </div>

        {basis.drvRefundReceived === 'yes' && (
          <div className="space-y-5 rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-700">
              With the refund granted, {providerName} must pay out your company
              pension on request (§ 3 Abs. 3 BetrAVG). We attach the refund
              decision to your request.
            </p>
            <div>
              <FieldLabel
                label="Refund decision (Erstattungsbescheid) from the Deutsche Rentenversicherung"
                showMissing={showMissing && !basis.refundDecisionDocumentId}
              />
              <Dropzone
                id="drv-refund-decision-file"
                title="Upload the refund decision"
                hint="PDF or photo, max 10 MB. We read the office and date for you."
                fileName={basis.refundDecisionFileName}
                uploading={uploadingDecision}
                error={decisionError}
                showMissing={showMissing && !basis.refundDecisionDocumentId}
                onFile={handleDecisionFile}
                onRemove={() => {
                  setDecisionWarning(null);
                  updateCashOutBasis({
                    refundDecisionFile: null,
                    refundDecisionFileName: undefined,
                    refundDecisionDocumentId: undefined,
                  });
                }}
              />
              {decisionWarning && (
                <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                  {decisionWarning}
                </div>
              )}
            </div>
            <div>
              <FieldLabel
                label="Issuing office"
                showMissing={showMissing && basis.drvOffice.trim() === ''}
              />
              <input
                type="text"
                value={basis.drvOffice}
                onChange={(e) => {
                  userEditedOfficeRef.current = true;
                  updateCashOutBasis({ drvOffice: e.target.value });
                }}
                placeholder="e.g. Deutsche Rentenversicherung Bund"
                className={`${INPUT_CLASS} ${
                  showMissing && basis.drvOffice.trim() === ''
                    ? 'border-red-400'
                    : 'border-gray-300'
                }`}
              />
              <MissingHint
                show={showMissing && basis.drvOffice.trim() === ''}
              />
            </div>
            <DatePartsInput
              label="Date of the decision"
              value={basis.drvDecisionDate}
              onChange={(value) => {
                userEditedDateRef.current = true;
                updateCashOutBasis({ drvDecisionDate: value });
              }}
              helperText="The date printed on the refund decision letter."
              showMissing={showMissing && basis.drvDecisionDate === ''}
            />
          </div>
        )}

        {basis.drvRefundReceived === 'no' && (
          <div className="space-y-5 rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-700">
              Without a refund, a payout is possible for small entitlements (§ 3
              Abs. 2 BetrAVG): up to {formatEuro(thresholds.pension)} EUR per
              month or {formatEuro(thresholds.capital)} EUR as a one-off amount
              at retirement age. Your latest statement shows this value.
            </p>
            <div>
              <FieldLabel
                label="Latest statement from your pension provider"
                showMissing={showMissing && !basis.statementDocumentId}
              />
              <Dropzone
                id="pension-statement-file"
                title="Upload your latest statement"
                hint="Standmitteilung, Renteninformation, Austrittsmitteilung or Versicherungsschein. PDF or photo, max 10 MB."
                fileName={basis.statementFileName}
                uploading={uploadingStatement}
                error={statementError}
                showMissing={showMissing && !basis.statementDocumentId}
                onFile={handleStatementFile}
                onRemove={() =>
                  updateCashOutBasis({
                    statementFile: null,
                    statementFileName: undefined,
                    statementDocumentId: undefined,
                  })
                }
              />
            </div>
            <div>
              <FieldLabel
                label="Type of statement"
                showMissing={showMissing && basis.statementType === ''}
              />
              <div className="relative">
                <select
                  value={basis.statementType}
                  onChange={(e) =>
                    updateCashOutBasis({
                      statementType: e.target.value as BavStatementType,
                    })
                  }
                  className={`${INPUT_CLASS} appearance-none bg-white ${
                    showMissing && basis.statementType === ''
                      ? 'border-red-400'
                      : 'border-gray-300'
                  }`}
                >
                  <option value="">Select</option>
                  {BAV_STATEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {STATEMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              <MissingHint show={showMissing && basis.statementType === ''} />
            </div>
            <DatePartsInput
              label="Date of the statement"
              value={basis.statementDate}
              onChange={(value) => updateCashOutBasis({ statementDate: value })}
              showMissing={showMissing && basis.statementDate === ''}
            />
            <div>
              <FieldLabel
                label="What does the statement show for retirement age?"
                showMissing={showMissing && basis.benefitForm === ''}
              />
              <div role="radiogroup" className="space-y-2">
                {BENEFIT_FORM_OPTIONS.map((option) => {
                  const selected = basis.benefitForm === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                        selected
                          ? 'border-[#9FE870] bg-[#9FE870]/10'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="benefitForm"
                        value={option.value}
                        checked={selected}
                        onChange={() =>
                          updateCashOutBasis({
                            benefitForm: option.value,
                            ...(option.value === 'unknown'
                              ? { benefitAmount: '' }
                              : {}),
                          })
                        }
                        className="mt-1 w-4 h-4 accent-[#9FE870]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-800">
                          {option.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <MissingHint show={showMissing && basis.benefitForm === ''} />
            </div>
            {amountRequired && (
              <div>
                <FieldLabel
                  label={
                    basis.benefitForm === 'pension'
                      ? 'Monthly pension shown (EUR)'
                      : 'Capital amount shown (EUR)'
                  }
                  showMissing={showMissing && amountValue === null}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={basis.benefitAmount}
                  onChange={(e) =>
                    updateCashOutBasis({ benefitAmount: e.target.value })
                  }
                  placeholder={
                    basis.benefitForm === 'pension'
                      ? 'e.g. 41,20'
                      : 'e.g. 6.500,00'
                  }
                  className={`${INPUT_CLASS} ${
                    (showMissing && amountValue === null) || amountAboveLimit
                      ? 'border-red-400'
                      : 'border-gray-300'
                  }`}
                />
                <MissingHint
                  show={showMissing && amountValue === null}
                  text="Enter the amount from your statement"
                />
                {amountAboveLimit && limit !== null && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      This is above the {formatEuro(limit)} EUR limit for a
                      small-entitlement payout in {new Date().getFullYear()}.
                      Without a DRV refund, {providerName} is unlikely to pay
                      out. Please check the value on your statement.
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 bg-[#F0FDE4] rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#163300] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#163300]">
          Not sure whether your contributions were refunded? The refund arrives
          as a letter from the Deutsche Rentenversicherung called
          “Erstattungsbescheid” followed by a bank transfer. If you never
          applied for it, choose “No”.
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

export default CashOutBasis;
