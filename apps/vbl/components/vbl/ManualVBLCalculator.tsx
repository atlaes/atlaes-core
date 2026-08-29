'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Info,
  Loader2,
  MessageCircle,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import apiClient from '../../lib/api';
import { createPendingCalculatorSession } from '../../lib/vbl-pending-calculator-sessions-api';
import {
  extractPensionDocument,
  PensionDocumentExtractionDetails,
  PensionDocumentType,
} from '../../lib/vbl-pension-document-extraction-api';
import { CompanyPensionLogo } from './icons/CompanyPensionLogo';
import {
  PUBLIC_FEDERAL_STATES,
  PUBLIC_PENSION_PROVIDERS_BY_STATE,
} from './company-pension-providers';

type PensionType = 'public' | 'stage' | '';
type EntryMethod = 'manual' | 'upload' | '';
type PublicProvider = string;
type StageProvider = 'VddB' | 'VddKO' | '';
type VBLPlan = 'VBLklassik' | 'VBLextra' | '';
type Threshold36 = 'less_than_36' | '36_or_more' | '';
type Threshold60 = 'less_than_60' | '60_or_more' | '';
type YesNo = 'yes' | 'no' | '';
type CalculatorScreen =
  | 'pension-type'
  | 'entry-method'
  | 'upload-review'
  | 'federal-state'
  | 'provider'
  | 'period'
  | 'stage-post2018'
  | 'stage-post2001'
  | 'salary'
  | 'result'
  | 'eligibility-questions'
  | 'ready'
  | 'waiting'
  | 'not-startable'
  | 'vested'
  | 'blocked';

// The post-estimate questionnaire answers. Kept as flat fields to match the
// rest of the form; the question catalogues below map each field to its copy.
type EligibilityField =
  | 'eligWorkedPublicAfter'
  | 'eligOtherInstitution'
  | 'eligPriorRefund'
  | 'eligCivilServant'
  | 'eligDisabled'
  | 'eligMandatoryInsurance';

interface ManualFormData extends Record<EligibilityField, YesNo> {
  pensionType: PensionType;
  entryMethod: EntryMethod;
  federalState: string;
  publicProvider: PublicProvider;
  stageProvider: StageProvider;
  vblPlan: VBLPlan;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  post2018Months: Threshold36;
  post2001Months: Threshold60;
  averageMonthlyGrossSalary: string;
}

interface EligibilityQuestion {
  field: EligibilityField;
  question: string;
  helper?: string;
}

const PUBLIC_ELIGIBILITY_QUESTIONS: EligibilityQuestion[] = [
  {
    field: 'eligWorkedPublicAfter',
    question:
      'After your compulsory pension insurance ended, did you work for another German public-sector employer?',
  },
  {
    field: 'eligOtherInstitution',
    question:
      'Have you been insured with another public-sector or church supplementary pension institution?',
    helper: 'This includes another VBL or ZVK pension institution.',
  },
  {
    field: 'eligPriorRefund',
    question:
      'Have contributions from another public-sector or church supplementary pension institution already been refunded?',
  },
  {
    field: 'eligCivilServant',
    question: 'Did you later become a German civil servant?',
  },
];

const STAGE_ELIGIBILITY_QUESTIONS: EligibilityQuestion[] = [
  {
    field: 'eligDisabled',
    question: 'Are you currently occupationally disabled or unable to work?',
    helper: 'This means berufsunfähig or erwerbsunfähig.',
  },
  {
    field: 'eligMandatoryInsurance',
    question:
      'Are you currently doing, or will you start, work that is subject to mandatory insurance with another supplementary pension institution?',
    helper:
      'This means Pflichtversicherung with another Zusatzversorgungseinrichtung like VBL for example.',
  },
];

const getEligibilityQuestions = (pensionType: PensionType) =>
  pensionType === 'stage'
    ? STAGE_ELIGIBILITY_QUESTIONS
    : PUBLIC_ELIGIBILITY_QUESTIONS;

interface CalculationResult {
  isEligible: boolean;
  totalAmount?: number;
  baseRefundAmount?: number;
  vblKlassik?: number;
  // Set when ineligibility is caused by the >=60-month total-contribution gate:
  // the pension is preserved as a future entitlement rather than refundable.
  isVested?: boolean;
  // The contribution period lives here — the API has no top-level
  // `monthsContributed`; that field is on the calculation *input*.
  calculationDetails?: {
    contributionPeriod: number;
  };
}

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

const ALL_FEDERAL_STATES = [
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

const EAST_STATES = [
  'Berlin (East)',
  'Brandenburg',
  'Mecklenburg-Vorpommern',
  'Saxony',
  'Saxony-Anhalt',
  'Thuringia',
];

// Federal-state options for the given pension type. Public (VBL/ZVK) is limited
// to the states CompanyPension supports; stage (VddB/VddKO) is available in all
// states. East states stay visible on the upload-review dropdown so OCR values
// still render (public then hits an early stop) — see handleContinue.
const getFederalStateOptions = (pensionType: PensionType) =>
  pensionType === 'stage' ? ALL_FEDERAL_STATES : PUBLIC_FEDERAL_STATES;

const getUploadFederalStates = (pensionType: PensionType) =>
  pensionType === 'stage'
    ? ['Berlin', ...ALL_FEDERAL_STATES]
    : ['Berlin', ...PUBLIC_FEDERAL_STATES, ...EAST_STATES];

const getProviderOptions = (form: ManualFormData) =>
  form.pensionType === 'stage'
    ? ['VddB', 'VddKO']
    : (PUBLIC_PENSION_PROVIDERS_BY_STATE[form.federalState] ?? ['VBL']);

const YEARS = Array.from(
  { length: new Date().getFullYear() - 2004 + 1 },
  (_, index) => String(2004 + index)
).reverse();

const INITIAL_FORM_DATA: ManualFormData = {
  pensionType: '',
  entryMethod: '',
  federalState: '',
  publicProvider: '',
  stageProvider: '',
  vblPlan: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  post2018Months: '',
  post2001Months: '',
  averageMonthlyGrossSalary: '',
  eligWorkedPublicAfter: '',
  eligOtherInstitution: '',
  eligPriorRefund: '',
  eligCivilServant: '',
  eligDisabled: '',
  eligMandatoryInsurance: '',
};

const monthToNumber = (month: string) =>
  String(MONTHS.indexOf(month) + 1).padStart(2, '0');

// Everything from the estimate onwards belongs to the last sidebar step.
const ESTIMATE_SECTION_SCREENS: CalculatorScreen[] = [
  'result',
  'eligibility-questions',
  'ready',
  'waiting',
  'not-startable',
];

const getCurrentSection = (screen: CalculatorScreen): 0 | 1 | 2 => {
  if (screen === 'pension-type') return 0;
  if (ESTIMATE_SECTION_SCREENS.includes(screen)) return 2;
  return 1;
};

const hasDateRange = (form: ManualFormData) =>
  Boolean(form.startMonth && form.startYear && form.endMonth && form.endYear);

const isDateRangeValid = (form: ManualFormData) => {
  if (!hasDateRange(form)) return false;
  const start = Number(form.startYear) * 12 + MONTHS.indexOf(form.startMonth);
  const end = Number(form.endYear) * 12 + MONTHS.indexOf(form.endMonth);
  return end >= start;
};

const getContributionMonthCount = (form: ManualFormData) => {
  if (!isDateRangeValid(form)) return 0;
  const start = Number(form.startYear) * 12 + MONTHS.indexOf(form.startMonth);
  const end = Number(form.endYear) * 12 + MONTHS.indexOf(form.endMonth);
  return end - start + 1;
};

// Month indexes (year * 12 + zero-based month) for the two stage cut-off dates.
const JANUARY_2001 = 2001 * 12;
const JANUARY_2018 = 2018 * 12;

const getEmploymentEndIndex = (form: ManualFormData) =>
  Number(form.endYear) * 12 + MONTHS.indexOf(form.endMonth);

const getMonthsSinceEmploymentEnd = (form: ManualFormData) => {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth() - getEmploymentEndIndex(form);
};

// Employment end + 24 months, e.g. "January 2027".
const getStartEligibleDate = (form: ManualFormData) => {
  const index = getEmploymentEndIndex(form) + 24;
  return `${MONTHS[index % 12]} ${Math.floor(index / 12)}`;
};

// Stage (VddB/VddKO) pre-estimate branching. Which extra question is asked
// depends on the contribution length and on when the employment *ended*.
const getNextScreenAfterPeriod = (form: ManualFormData): CalculatorScreen => {
  const months = getContributionMonthCount(form);

  // The 12-month minimum only applies to stage pensions (VddB/VddKO). Public
  // VBL/ZVK periods of any length reach the estimate.
  if (form.pensionType !== 'stage') return 'salary';
  if (months < 12) return 'blocked';
  if (months >= 120) return 'blocked';
  // The design labels the buckets "Less than 12" and "13 to 35", so exactly 12
  // months is not covered by either label. We keep the previous inclusive
  // behaviour and treat 12 as part of the no-extra-questions bucket.
  if (months < 36) return 'salary';

  const end = getEmploymentEndIndex(form);
  if (end < JANUARY_2001) return 'salary';
  if (end < JANUARY_2018) return 'stage-post2001';
  return 'stage-post2018';
};

// The stage question screen that sits directly before the salary step, if any.
const getStageQuestionBeforeSalary = (
  form: ManualFormData
): CalculatorScreen | null => {
  const next = getNextScreenAfterPeriod(form);
  return next === 'stage-post2018' || next === 'stage-post2001'
    ? 'stage-post2001'
    : null;
};

const getSelectedProvider = (form: ManualFormData) =>
  form.pensionType === 'stage' ? form.stageProvider : form.publicProvider;

const getSupplementaryPensions = (form: ManualFormData) => {
  const provider = getSelectedProvider(form);
  if (form.pensionType === 'public' && provider === 'VBL' && form.vblPlan) {
    return form.vblPlan === 'VBLklassik' ? ['VBL'] : [form.vblPlan];
  }
  return provider ? [provider] : [];
};

const getStageProviderLabel = (stageProvider: StageProvider) =>
  stageProvider === 'VddB' || stageProvider === 'VddKO'
    ? stageProvider
    : 'VddB/VddKO';

const getEstimateTitle = (
  pensionType: PensionType,
  stageProvider: StageProvider
) =>
  pensionType === 'stage'
    ? `Your estimated ${getStageProviderLabel(stageProvider)} refund`
    : 'Your estimated VBL/ZVK refund';

const getStartClaimLabel = (
  pensionType: PensionType,
  stageProvider: StageProvider
) =>
  pensionType === 'stage'
    ? `Start ${getStageProviderLabel(stageProvider)} refund`
    : 'Start VBL/ZVK refund';

const getEmploymentType = (form: ManualFormData) => {
  if (form.pensionType === 'stage') {
    return form.stageProvider === 'VddKO'
      ? 'Orchestra'
      : 'Stage / Performing Arts';
  }
  return 'Public sector';
};

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);

const buildJob = (form: ManualFormData) => {
  const provider = getSelectedProvider(form);
  const supplementaryPensions = getSupplementaryPensions(form);

  return {
    startMonth: form.startMonth,
    startYear: form.startYear,
    endMonth: form.endMonth,
    endYear: form.endYear,
    employmentType: getEmploymentType(form),
    averageMonthlyGrossSalary: form.averageMonthlyGrossSalary,
    germanFederalState: form.federalState,
    companyPension: provider,
    supplementaryPensions,
    customPensionName: '',
    statutoryPensionRefunded: '',
    privateStatementChoice: '',
    projectedMonthlyPension: '',
    capitalAmount: '',
    contractValue: '',
    estimatedMonthlyContribution: '',
  };
};

const buildCalculatePayload = (form: ManualFormData) => ({
  jobs: [
    {
      employmentType: getEmploymentType(form),
      supplementaryPensions: getSupplementaryPensions(form),
      startDate: `${form.startYear}-${monthToNumber(form.startMonth)}`,
      endDate: `${form.endYear}-${monthToNumber(form.endMonth)}`,
      averageMonthlyGrossSalary: form.averageMonthlyGrossSalary,
      germanFederalState: form.federalState || null,
    },
  ],
  userType: 'insured_person',
});

const formatFileSize = (size: number): string => {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getCalculatorDocumentType = (
  pensionType: PensionType
): PensionDocumentType => (pensionType === 'stage' ? 'vddb_vddko' : 'vbl_zvk');

const isPublicProvider = (
  provider: string | null
): provider is PublicProvider => provider === 'VBL' || provider === 'ZVK';

const isStageProvider = (provider: string | null): provider is StageProvider =>
  provider === 'VddB' || provider === 'VddKO';

const mapExtractionToForm = (
  details: PensionDocumentExtractionDetails,
  currentForm: ManualFormData
): Partial<ManualFormData> => {
  const updates: Partial<ManualFormData> = {
    entryMethod: 'upload',
    federalState: details.federalState || currentForm.federalState,
    startMonth: details.startMonth || currentForm.startMonth,
    startYear: details.startYear || currentForm.startYear,
    endMonth: details.endMonth || currentForm.endMonth,
    endYear: details.endYear || currentForm.endYear,
    averageMonthlyGrossSalary:
      details.averageMonthlyGrossSalary ||
      currentForm.averageMonthlyGrossSalary,
  };

  if (currentForm.pensionType === 'stage') {
    const stageProvider = isStageProvider(details.provider)
      ? details.provider
      : currentForm.stageProvider;
    return {
      ...updates,
      stageProvider,
      publicProvider: currentForm.publicProvider,
      vblPlan: '',
    };
  }

  const publicProvider = isPublicProvider(details.provider)
    ? details.provider
    : currentForm.publicProvider;

  return {
    ...updates,
    publicProvider,
    stageProvider: currentForm.stageProvider,
    vblPlan:
      publicProvider === 'VBL' ? details.vblPlan || currentForm.vblPlan : '',
  };
};

interface CardButtonProps {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}

const CardButton: React.FC<CardButtonProps> = ({
  selected,
  icon,
  title,
  description,
  onClick,
  disabled = false,
  testId,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
    className={`w-full min-h-[90px] rounded-lg border px-5 py-4 text-left transition-all duration-150 ${
      selected
        ? 'border-[#163300] bg-[#9FE870]'
        : 'border-gray-300 bg-white hover:border-[#8AD860]'
    } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
  >
    <div className="flex items-center gap-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
          selected ? 'bg-[#9FE870]' : 'bg-gray-200'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="font-bold text-gray-950">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </button>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  error?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const labelId = React.useId();
  const valueId = React.useId();
  const listboxId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative text-left">
      <span
        id={labelId}
        className="mb-2 block text-sm font-medium text-gray-800"
      >
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-12 w-full items-center justify-between rounded-lg border bg-white px-4 text-left text-gray-900 shadow-sm outline-none transition ${
          error
            ? 'border-[#B91C0B] focus:border-[#B91C0B] focus:ring-2 focus:ring-[#B91C0B]/20'
            : 'border-[#D7DCE8] focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25'
        }`}
      >
        <span
          id={valueId}
          className={value ? 'text-gray-900' : 'text-gray-400'}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-[#D7DCE8] bg-white p-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex min-h-11 w-full items-center rounded-md px-4 text-left text-sm transition ${
                value === option
                  ? 'bg-[#9FE870] text-[#163300]'
                  : 'text-gray-700 hover:bg-[#EAF8DF]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#B91C0B]">
          <Info className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

interface RadioRowProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}

const RadioRow: React.FC<RadioRowProps> = ({
  name,
  label,
  checked,
  onChange,
}) => (
  <label
    className={`flex h-10 cursor-pointer items-center gap-3 rounded-md border px-5 text-sm font-medium transition ${
      checked
        ? 'border-[#9FE870] bg-[#9FE870]/20 text-[#163300]'
        : 'border-[#D7DCE8] bg-[#EEF1EE] text-[#163300]'
    }`}
  >
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-3 w-3 accent-[#9FE870]"
    />
    {label}
  </label>
);

interface YesNoQuestionProps {
  number: number;
  name: string;
  question: string;
  helper?: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}

// A fieldset/legend pair keeps the two "Yes"/"No" rows tied to their question
// for screen readers — several identical answer labels share one screen.
const YesNoQuestion: React.FC<YesNoQuestionProps> = ({
  number,
  name,
  question,
  helper,
  value,
  onChange,
}) => (
  <fieldset className="border-0 p-0">
    <legend className="mb-3 text-sm font-bold text-gray-800">
      {number}. {question}
    </legend>
    <div className="space-y-3">
      <RadioRow
        name={name}
        label="Yes"
        checked={value === 'yes'}
        onChange={() => onChange('yes')}
      />
      <RadioRow
        name={name}
        label="No"
        checked={value === 'no'}
        onChange={() => onChange('no')}
      />
    </div>
    {helper && <p className="mt-3 text-sm leading-5 text-gray-600">{helper}</p>}
  </fieldset>
);

const PlanChip: React.FC<{
  label: VBLPlan;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`h-10 rounded-lg border px-4 text-sm font-semibold transition ${
      selected
        ? 'border-[#163300] bg-[#9FE870] text-[#163300]'
        : 'border-[#D7DCE8] bg-[#EEF1EE] text-[#163300] hover:border-[#9FE870]'
    }`}
  >
    {label}
  </button>
);

interface FormShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  canContinue?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onContinue?: () => void;
  continueText?: string;
  subtitleClassName?: string;
}

const FormShell: React.FC<FormShellProps> = ({
  title,
  subtitle,
  children,
  canContinue = true,
  showBack = true,
  onBack,
  onContinue,
  continueText = 'Continue',
  subtitleClassName = 'text-gray-600',
}) => (
  <div className="mx-auto flex w-full max-w-[660px] flex-col">
    <div className="mb-9 text-center">
      <h1
        className="text-[27px] font-bold leading-tight text-gray-950"
        style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
      >
        {title}
      </h1>
      <div className="mx-auto mt-3 h-px w-full max-w-[552px] bg-gray-200" />
      {subtitle && (
        <p
          className={`mx-auto mt-3 max-w-[580px] text-[17px] leading-7 ${subtitleClassName}`}
        >
          {subtitle}
        </p>
      )}
    </div>

    <div>{children}</div>

    <div className="mt-14 flex items-center justify-between gap-4">
      <div>
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-md border border-[#D7DCE8] bg-white px-6 font-semibold text-[#163300] shadow-sm transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-md px-6 font-semibold transition"
        style={{
          backgroundColor: canContinue ? '#9FE870' : '#CFF4B7',
          color: canContinue ? '#163300' : 'rgba(22, 51, 0, 0.42)',
          cursor: canContinue ? 'pointer' : 'not-allowed',
        }}
      >
        {continueText}
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  </div>
);

const SidebarStep: React.FC<{
  index: number;
  title: string;
  description: string;
  active: boolean;
  complete: boolean;
}> = ({ index, title, description, active, complete }) => (
  <div
    className={`relative flex min-h-[96px] items-center gap-4 rounded-l-2xl px-6 ${
      active ? 'bg-[#9FE870] text-[#163300]' : 'text-white'
    } ${complete && !active ? 'bg-[#4E8F21]' : ''}`}
  >
    <div
      className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-xl font-semibold ${
        active || complete
          ? 'bg-[#163300] text-white'
          : 'border border-white text-white'
      }`}
    >
      {complete ? <Check className="h-7 w-7" /> : index}
    </div>
    <div>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm leading-5">{description}</p>
    </div>
  </div>
);

const CalculatorSidebar: React.FC<{ screen: CalculatorScreen }> = ({
  screen,
}) => {
  const activeSection = getCurrentSection(screen);
  const steps = [
    { title: 'Pension Type', description: 'Pick what you want to check.' },
    { title: 'Details', description: 'A few quick questions.' },
    { title: 'Estimate', description: 'See your estimated refund' },
  ];

  return (
    <aside
      data-testid="calculator-sidebar"
      className="relative hidden w-[334px] shrink-0 overflow-hidden rounded-[18px] px-7 py-8 shadow-lg lg:flex lg:flex-col"
      style={{ backgroundColor: '#163300' }}
    >
      <div className="mb-10 flex justify-center">
        <CompanyPensionLogo className="h-auto w-[260px]" />
      </div>
      <div className="-mx-7 mb-12 h-px bg-white" />
      <div className="-mr-7 space-y-5">
        {steps.map((step, index) => (
          <SidebarStep
            key={step.title}
            index={index + 1}
            title={step.title}
            description={step.description}
            active={activeSection === index}
            complete={activeSection > index}
          />
        ))}
      </div>
      <div className="mt-auto flex items-center gap-3">
        <div className="flex-1">
          <p className="font-bold text-white">Need help?</p>
          <p className="text-sm text-white/80">
            Our assistant is here for you.
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
          <MessageCircle className="h-5 w-5 text-[#9FE870]" aria-hidden />
        </div>
      </div>
    </aside>
  );
};

export const ManualVBLCalculator: React.FC = () => {
  const router = useRouter();
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const [screen, setScreen] = React.useState<CalculatorScreen>('pension-type');
  const [form, setForm] = React.useState<ManualFormData>(INITIAL_FORM_DATA);
  const [calculation, setCalculation] =
    React.useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [extractionError, setExtractionError] = React.useState('');
  const [selectedUploadFile, setSelectedUploadFile] =
    React.useState<File | null>(null);
  const [showUnlistedStateInfo, setShowUnlistedStateInfo] =
    React.useState(false);
  const [reminderStep, setReminderStep] = React.useState<
    'initial' | 'form' | 'set'
  >('initial');
  const [reminderEmail, setReminderEmail] = React.useState('');

  const updateForm = (updates: Partial<ManualFormData>) => {
    setForm((previous) => ({ ...previous, ...updates }));
  };

  const reset = () => {
    setScreen('pension-type');
    setForm(INITIAL_FORM_DATA);
    setCalculation(null);
    setError('');
    setExtractionError('');
    setIsCalculating(false);
    setIsExtracting(false);
    setSelectedUploadFile(null);
    setShowUnlistedStateInfo(false);
    setReminderStep('initial');
    setReminderEmail('');
    // Without this the input keeps the old file, so re-picking the same
    // document after a restart fires no change event.
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const showUploadReview = (details: PensionDocumentExtractionDetails) => {
    setForm((previous) => ({
      ...previous,
      ...mapExtractionToForm(details, previous),
    }));
    setScreen('upload-review');
  };

  const handleUploadFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedUploadFile(file);
    setExtractionError('');
    updateForm({ entryMethod: 'upload' });
  };

  const extractSelectedUpload = async () => {
    if (isExtracting) return;

    if (!selectedUploadFile) {
      uploadInputRef.current?.click();
      return;
    }

    setIsExtracting(true);
    setExtractionError('');

    try {
      const extraction = await extractPensionDocument(
        selectedUploadFile,
        getCalculatorDocumentType(form.pensionType)
      );
      showUploadReview(extraction.details);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Pension document extraction failed';
      setExtractionError(message);
    } finally {
      setIsExtracting(false);
    }
  };

  // The screen a stage question was reached from — 'period' on the manual
  // path, 'upload-review' when the details came from a document.
  const screenBeforeStageQuestions: CalculatorScreen =
    form.entryMethod === 'upload' ? 'upload-review' : 'period';

  const goBack = () => {
    if (screen === 'entry-method') setScreen('pension-type');
    else if (screen === 'upload-review') setScreen('entry-method');
    else if (screen === 'federal-state') setScreen('entry-method');
    else if (screen === 'provider') setScreen('federal-state');
    else if (screen === 'period') setScreen('provider');
    else if (screen === 'stage-post2018') {
      setScreen(screenBeforeStageQuestions);
    } else if (screen === 'stage-post2001') {
      setScreen(
        getEmploymentEndIndex(form) >= JANUARY_2018
          ? 'stage-post2018'
          : screenBeforeStageQuestions
      );
    } else if (screen === 'salary') {
      setScreen(getStageQuestionBeforeSalary(form) ?? 'period');
    } else if (screen === 'result') {
      // Only reachable from the error state — a successful estimate uses its
      // own "Back to calculator" button.
      setScreen(form.entryMethod === 'upload' ? 'upload-review' : 'salary');
    } else if (screen === 'eligibility-questions') {
      setScreen('result');
    } else if (
      screen === 'ready' ||
      screen === 'waiting' ||
      screen === 'not-startable'
    ) {
      setScreen('eligibility-questions');
    } else if (screen === 'vested') {
      // Two ways in: the client-side VBLextra check (from provider /
      // upload-review) and the API's isVested verdict (after the estimate ran).
      if (form.entryMethod === 'upload') setScreen('upload-review');
      else setScreen(calculation?.isVested ? 'salary' : 'provider');
    } else if (screen === 'blocked') {
      if (
        form.entryMethod === 'upload' &&
        form.pensionType === 'public' &&
        EAST_STATES.includes(form.federalState)
      ) {
        setScreen('upload-review');
      } else if (
        // Both answers can survive a later date change, so only treat them as
        // the cause of the block while their screen is still part of the flow.
        form.post2018Months === '36_or_more' &&
        getNextScreenAfterPeriod(form) === 'stage-post2018'
      ) {
        setScreen('stage-post2018');
      } else if (
        form.post2001Months === '60_or_more' &&
        getStageQuestionBeforeSalary(form) === 'stage-post2001'
      ) {
        setScreen('stage-post2001');
      } else {
        setScreen(screenBeforeStageQuestions);
      }
    }
  };

  const calculateEstimate = async () => {
    setScreen('result');
    setIsCalculating(true);
    setError('');
    setCalculation(null);

    try {
      const response = await apiClient.post(
        '/vbl/calculate-simple',
        buildCalculatePayload(form)
      );
      const result = response.data?.calculation as
        | CalculationResult
        | undefined;
      if (!response.data?.success || !result) {
        throw new Error(response.data?.details || 'Calculation failed');
      }
      // Keep the result even when ineligible so the screens below (and back
      // navigation) can tell a vested pension apart from a hard block.
      setCalculation(result);
      if (!result.isEligible) {
        setScreen(result.isVested ? 'vested' : 'blocked');
        return;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to calculate your refund. Please try again.';
      setError(message);
    } finally {
      setIsCalculating(false);
    }
  };

  // On the upload path the salary is already known, so the salary screen is
  // skipped and the estimate runs straight away.
  const advanceTo = (nextScreen: CalculatorScreen) => {
    if (nextScreen === 'salary' && form.entryMethod === 'upload') {
      void calculateEstimate();
      return;
    }
    setScreen(nextScreen);
  };

  const continueFromEligibilityQuestions = () => {
    const questions = getEligibilityQuestions(form.pensionType);
    if (questions.some((question) => form[question.field] === 'yes')) {
      setScreen('not-startable');
      return;
    }
    if (form.pensionType !== 'stage') {
      setScreen('ready');
      return;
    }
    // Stage refunds can only be started 24 months after the employment ended.
    setScreen(getMonthsSinceEmploymentEnd(form) >= 24 ? 'ready' : 'waiting');
  };

  const handleContinue = () => {
    if (screen === 'pension-type') {
      setScreen('entry-method');
    } else if (screen === 'entry-method') {
      if (form.entryMethod === 'upload') {
        void extractSelectedUpload();
      } else {
        setScreen('federal-state');
      }
    } else if (screen === 'upload-review') {
      if (form.vblPlan === 'VBLextra') {
        setScreen('vested');
        return;
      }
      if (
        form.pensionType === 'public' &&
        EAST_STATES.includes(form.federalState)
      ) {
        setScreen('blocked');
        return;
      }
      advanceTo(getNextScreenAfterPeriod(form));
    } else if (screen === 'federal-state') setScreen('provider');
    else if (screen === 'provider') {
      setScreen(form.vblPlan === 'VBLextra' ? 'vested' : 'period');
    } else if (screen === 'period') {
      advanceTo(getNextScreenAfterPeriod(form));
    } else if (screen === 'stage-post2018') {
      advanceTo(
        form.post2018Months === '36_or_more' ? 'blocked' : 'stage-post2001'
      );
    } else if (screen === 'stage-post2001') {
      advanceTo(form.post2001Months === '60_or_more' ? 'blocked' : 'salary');
    } else if (screen === 'salary') {
      void calculateEstimate();
    } else if (screen === 'eligibility-questions') {
      continueFromEligibilityQuestions();
    }
  };

  const startClaim = async () => {
    const provider = getSelectedProvider(form);
    const claimTypes = [form.pensionType === 'stage' ? 'stage' : 'public'];
    const job = buildJob(form);
    const totalRefund =
      calculation?.vblKlassik ??
      calculation?.totalAmount ??
      calculation?.baseRefundAmount ??
      0;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'calculator-selection',
        JSON.stringify({
          pensionProvider: provider,
          claimTypes,
          publicStageProvider: provider,
          privateProvider: '',
        })
      );
    }

    try {
      const result = await createPendingCalculatorSession({
        jobs: [job],
        calculationResult: {
          totalRefund,
          breakdown: [],
          totalMonths: calculation?.calculationDetails?.contributionPeriod ?? 0,
        },
        scenario: 'eligible',
        currentAge: 40,
        userType: 'insured_person',
        pensionProvider: provider,
        claimTypes,
        publicStageProvider: provider,
      });
      router.push(
        `/calculator/onboarding?session=${encodeURIComponent(result.token)}`
      );
    } catch (err) {
      console.warn(
        'Failed to create VBL pending calculator session — proceeding with sessionStorage only',
        err
      );
      router.push('/calculator/onboarding');
    }
  };

  const canContinue =
    (screen === 'pension-type' && form.pensionType !== '') ||
    (screen === 'entry-method' && form.entryMethod !== '') ||
    (screen === 'upload-review' &&
      getSelectedProvider(form) !== '' &&
      // Extraction can return VBL without a plan; without this the VBLextra
      // question would be skipped and a VBLklassik estimate assumed.
      (form.pensionType !== 'public' ||
        form.publicProvider !== 'VBL' ||
        form.vblPlan !== '') &&
      form.federalState !== '' &&
      isDateRangeValid(form) &&
      form.averageMonthlyGrossSalary !== '') ||
    (screen === 'federal-state' && form.federalState !== '') ||
    (screen === 'provider' &&
      getSelectedProvider(form) !== '' &&
      (form.pensionType !== 'public' ||
        form.publicProvider !== 'VBL' ||
        form.vblPlan !== '')) ||
    (screen === 'period' && isDateRangeValid(form)) ||
    (screen === 'stage-post2018' && form.post2018Months !== '') ||
    (screen === 'stage-post2001' && form.post2001Months !== '') ||
    (screen === 'salary' && form.averageMonthlyGrossSalary !== '') ||
    (screen === 'eligibility-questions' &&
      getEligibilityQuestions(form.pensionType).every(
        (question) => form[question.field] !== ''
      ));

  const refundAmount =
    calculation?.vblKlassik ??
    calculation?.totalAmount ??
    calculation?.baseRefundAmount ??
    0;
  // The final questionnaire is a full-width, centered screen in the approved
  // design (Figma node 1858:1682) — it drops the calculator sidebar in favour
  // of the onboarding step header. Applies to the stage variant of the same
  // screen too, since it is the same layout with different copy.
  const showSidebar =
    screen !== 'stage-post2018' &&
    screen !== 'stage-post2001' &&
    screen !== 'eligibility-questions';

  return (
    <div
      className="min-h-screen p-3 md:p-4"
      style={{
        backgroundColor: 'var(--vbl-bg-light)',
        fontFamily: 'var(--vbl-font-montserrat)',
      }}
    >
      <div
        className={`flex min-h-[calc(100vh-24px)] md:min-h-[calc(100vh-32px)] ${
          showSidebar ? 'gap-4' : ''
        }`}
      >
        {showSidebar && <CalculatorSidebar screen={screen} />}
        <main
          className={`flex rounded-[18px] bg-white p-6 shadow-lg md:p-10 ${
            showSidebar ? 'flex-1' : 'w-full'
          }`}
        >
          <div className="flex min-h-full w-full items-start justify-center pt-8 md:pt-12">
            {screen === 'pension-type' && (
              <FormShell
                title="What refund do you want to estimate?"
                subtitle="Estimate your possible VBL, ZVK, VddB or VddKO refund."
                subtitleClassName="text-[#3E3F3C]"
                showBack={false}
                canContinue={canContinue}
                onContinue={handleContinue}
              >
                <div className="space-y-4">
                  <CardButton
                    selected={form.pensionType === 'public'}
                    icon={
                      <Image
                        src="/marketing/icons/pension-vbl.svg"
                        alt=""
                        width={61}
                        height={61}
                      />
                    }
                    title="VBL / ZVK refund"
                    description="Estimate your possible public-sector company pension refund."
                    onClick={() => {
                      setSelectedUploadFile(null);
                      setExtractionError('');
                      updateForm({
                        pensionType: 'public',
                        entryMethod: '',
                        publicProvider: '',
                        stageProvider: '',
                        vblPlan: '',
                      });
                    }}
                  />
                  <CardButton
                    selected={form.pensionType === 'stage'}
                    icon={
                      <Image
                        src="/marketing/icons/pension-vddb.svg"
                        alt=""
                        width={61}
                        height={61}
                      />
                    }
                    title="VddB / VddKO refund"
                    description="Estimate your possible stage or orchestra pension refund."
                    onClick={() => {
                      setSelectedUploadFile(null);
                      setExtractionError('');
                      updateForm({
                        pensionType: 'stage',
                        entryMethod: '',
                        publicProvider: '',
                        stageProvider: '',
                        vblPlan: '',
                      });
                    }}
                  />
                </div>
              </FormShell>
            )}

            {screen === 'entry-method' && (
              <FormShell
                title="Upload a pension document or enter details manually"
                subtitle="Upload your pension statement for a faster estimate, or answer a few questions yourself."
                canContinue={canContinue && !isExtracting}
                onBack={goBack}
                onContinue={handleContinue}
                continueText={isExtracting ? 'Reading document' : 'Continue'}
              >
                <div className="space-y-4">
                  <CardButton
                    selected={form.entryMethod === 'upload'}
                    icon={
                      isExtracting ? (
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )
                    }
                    title="Upload document"
                    description="Use your pension document to pre-fill details for the estimate."
                    onClick={() => {
                      updateForm({ entryMethod: 'upload' });
                      setExtractionError('');
                      uploadInputRef.current?.click();
                    }}
                    disabled={isExtracting}
                    testId="entry-method-card"
                  />
                  <CardButton
                    selected={form.entryMethod === 'manual'}
                    icon={<Pencil className="h-8 w-8 text-gray-500" />}
                    title="Enter details manually"
                    description="Continue without upload and enter the details yourself."
                    onClick={() => {
                      setSelectedUploadFile(null);
                      setExtractionError('');
                      updateForm({
                        entryMethod: 'manual',
                        federalState: '',
                        publicProvider: '',
                        stageProvider: '',
                        vblPlan: '',
                        startMonth: '',
                        startYear: '',
                        endMonth: '',
                        endYear: '',
                        averageMonthlyGrossSalary: '',
                      });
                    }}
                    testId="entry-method-card"
                  />
                  <input
                    ref={uploadInputRef}
                    name="pensionDocument"
                    type="file"
                    accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp"
                    className="sr-only"
                    onChange={handleUploadFileChange}
                  />
                  {selectedUploadFile && (
                    <div className="flex items-center gap-2 rounded-lg bg-[#F0FDE4] px-3 py-2 text-sm text-[#163300]">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">
                        {selectedUploadFile.name}
                      </span>
                      <span className="text-[#163300]/60">
                        {formatFileSize(selectedUploadFile.size)}
                      </span>
                    </div>
                  )}
                  {extractionError && (
                    <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {extractionError}
                    </p>
                  )}
                  <div className="flex items-start gap-2 px-1 text-center text-sm leading-5 text-gray-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      You can upload only the relevant page and hide details
                      that are not needed for this check. If you continue with a
                      refund request, the document can be carried into your
                      secure claim.
                    </p>
                  </div>
                </div>
              </FormShell>
            )}

            {screen === 'upload-review' && (
              <FormShell
                title="We found these details in your document"
                subtitle="Please check and correct anything that is missing or incorrect."
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <div className="space-y-5 text-left">
                  <SelectField
                    label="Company pension provider"
                    value={getSelectedProvider(form)}
                    onChange={(value) => {
                      if (form.pensionType === 'stage') {
                        updateForm({ stageProvider: value as StageProvider });
                        return;
                      }

                      const publicProvider = value as PublicProvider;
                      updateForm({
                        publicProvider,
                        vblPlan:
                          publicProvider === 'VBL'
                            ? form.vblPlan || 'VBLklassik'
                            : '',
                      });
                    }}
                    options={getProviderOptions(form)}
                    placeholder="Select company pension provider"
                  />

                  {form.pensionType === 'public' &&
                    form.publicProvider === 'VBL' && (
                      <div>
                        <p className="mb-3 text-sm font-medium text-gray-800">
                          VBL plan
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <PlanChip
                            label="VBLklassik"
                            selected={form.vblPlan === 'VBLklassik'}
                            onClick={() =>
                              updateForm({ vblPlan: 'VBLklassik' })
                            }
                          />
                          <PlanChip
                            label="VBLextra"
                            selected={form.vblPlan === 'VBLextra'}
                            onClick={() => updateForm({ vblPlan: 'VBLextra' })}
                          />
                        </div>
                      </div>
                    )}

                  <SelectField
                    label="German federal state"
                    value={form.federalState}
                    onChange={(value) =>
                      updateForm({
                        federalState: value,
                        publicProvider: '',
                        vblPlan: '',
                      })
                    }
                    options={getUploadFederalStates(form.pensionType)}
                    placeholder="Select federal state"
                  />

                  {form.pensionType === 'public' &&
                    EAST_STATES.includes(form.federalState) && (
                      <div className="flex items-start gap-5 rounded-xl bg-[#EEF6EA] px-7 py-6 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4E8F21] text-white">
                          <Info className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-lg font-bold leading-6 text-[#444844]">
                            This refund cannot currently be estimated with
                            CompanyPension
                          </p>
                          <p className="mt-2 text-lg leading-7 text-[#4C504D]">
                            CompanyPension currently checks VBL West
                            contribution refunds. If your contributions were
                            paid only while working in a state that is not
                            listed, this refund cannot currently continue
                            through the online calculator.
                          </p>
                        </div>
                      </div>
                    )}

                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <SelectField
                      label="Start month"
                      value={form.startMonth}
                      onChange={(value) => updateForm({ startMonth: value })}
                      options={MONTHS}
                      placeholder="Select start month"
                      error={!form.startMonth ? 'Missing details' : undefined}
                    />
                    <SelectField
                      label="Start year"
                      value={form.startYear}
                      onChange={(value) => updateForm({ startYear: value })}
                      options={YEARS}
                      placeholder="Select start year"
                      error={!form.startYear ? 'Missing details' : undefined}
                    />
                    <SelectField
                      label="End month"
                      value={form.endMonth}
                      onChange={(value) => updateForm({ endMonth: value })}
                      options={MONTHS}
                      placeholder="Select end month"
                      error={!form.endMonth ? 'Missing details' : undefined}
                    />
                    <SelectField
                      label="End year"
                      value={form.endYear}
                      onChange={(value) => updateForm({ endYear: value })}
                      options={YEARS}
                      placeholder="Select end year"
                      error={!form.endYear ? 'Missing details' : undefined}
                    />
                  </div>

                  {hasDateRange(form) && !isDateRangeValid(form) && (
                    <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      End date cannot be earlier than start date.
                    </p>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-800">
                      Average monthly gross salary (€)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.averageMonthlyGrossSalary}
                      onChange={(event) =>
                        updateForm({
                          averageMonthlyGrossSalary: event.target.value.replace(
                            /[^0-9]/g,
                            ''
                          ),
                        })
                      }
                      placeholder="E.g., 3500"
                      className="h-12 w-full rounded-lg border border-[#D7DCE8] px-4 text-gray-900 shadow-sm outline-none transition focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25"
                    />
                  </label>

                  <div className="flex items-start gap-2 px-1 text-sm leading-5 text-gray-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      These details are used only to calculate your estimate. If
                      you continue with a refund request, they can be carried
                      into your secure claim.
                    </p>
                  </div>
                </div>
              </FormShell>
            )}

            {screen === 'federal-state' && (
              <FormShell
                title={
                  form.pensionType === 'stage'
                    ? 'Where was your employer located?'
                    : 'Where was your public-sector employer located?'
                }
                subtitle={
                  form.pensionType === 'stage'
                    ? 'Select the German federal state where your employer was based.'
                    : 'Select the German federal state where your employer was based. CompanyPension currently only checks contributions in West Germany states.'
                }
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <SelectField
                  label="Employer’s federal state"
                  value={form.federalState}
                  onChange={(value) =>
                    updateForm({
                      federalState: value,
                      publicProvider: '',
                      vblPlan: '',
                    })
                  }
                  options={getFederalStateOptions(form.pensionType)}
                  placeholder="Select federal state"
                />
                {form.pensionType !== 'stage' && (
                  <button
                    type="button"
                    onClick={() => setShowUnlistedStateInfo(true)}
                    className="mt-3 block text-left text-sm font-bold text-[#163300] underline"
                  >
                    My state is not listed &gt;
                  </button>
                )}
                {form.pensionType !== 'stage' && showUnlistedStateInfo && (
                  <div className="mt-8 flex items-start gap-5 rounded-xl bg-[#EEF6EA] px-7 py-6 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4E8F21] text-white">
                      <Info className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-6 text-[#444844]">
                        This refund cannot currently be estimated with
                        CompanyPension
                      </p>
                      <p className="mt-2 text-lg leading-7 text-[#4C504D]">
                        CompanyPension currently checks VBL West contribution
                        refunds. If your contributions were paid only while
                        working in a state that is not listed, this refund
                        cannot currently continue through the online calculator.
                      </p>
                    </div>
                  </div>
                )}
              </FormShell>
            )}

            {screen === 'provider' && (
              <FormShell
                title={
                  form.pensionType === 'stage'
                    ? 'Select your stage or orchestra pension'
                    : 'Select your company pension'
                }
                subtitle={
                  form.pensionType === 'stage'
                    ? 'Choose the company pension you paid into during your employment.'
                    : 'Choose the company pension your employer paid into.'
                }
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <SelectField
                  label="Company pension"
                  value={getSelectedProvider(form)}
                  onChange={(value) =>
                    form.pensionType === 'stage'
                      ? updateForm({ stageProvider: value as StageProvider })
                      : updateForm({
                          publicProvider: value as PublicProvider,
                          vblPlan: '',
                        })
                  }
                  options={getProviderOptions(form)}
                  placeholder="Select company pension"
                />

                {form.pensionType === 'public' &&
                  form.publicProvider === 'VBL' && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-medium text-gray-800">
                        VBL plan
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <PlanChip
                          label="VBLklassik"
                          selected={form.vblPlan === 'VBLklassik'}
                          onClick={() => updateForm({ vblPlan: 'VBLklassik' })}
                        />
                        <PlanChip
                          label="VBLextra"
                          selected={form.vblPlan === 'VBLextra'}
                          onClick={() => updateForm({ vblPlan: 'VBLextra' })}
                        />
                      </div>
                    </div>
                  )}
              </FormShell>
            )}

            {screen === 'period' && (
              <FormShell
                title="When did you pay into this pension?"
                subtitle="Enter the full period when contributions were paid into this company pension."
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <SelectField
                    label="Start month"
                    value={form.startMonth}
                    onChange={(value) => updateForm({ startMonth: value })}
                    options={MONTHS}
                    placeholder="Select start month"
                  />
                  <SelectField
                    label="Start year"
                    value={form.startYear}
                    onChange={(value) => updateForm({ startYear: value })}
                    options={YEARS}
                    placeholder="Select start year"
                  />
                  <SelectField
                    label="End month"
                    value={form.endMonth}
                    onChange={(value) => updateForm({ endMonth: value })}
                    options={MONTHS}
                    placeholder="Select end month"
                  />
                  <SelectField
                    label="End year"
                    value={form.endYear}
                    onChange={(value) => updateForm({ endYear: value })}
                    options={YEARS}
                    placeholder="Select end year"
                  />
                </div>
                {hasDateRange(form) && !isDateRangeValid(form) && (
                  <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    End date cannot be earlier than start date.
                  </p>
                )}
              </FormShell>
            )}

            {screen === 'stage-post2018' && (
              <FormShell
                title={`How many ${getStageProviderLabel(
                  form.stageProvider
                )} contribution months did you have since 1 January 2018?`}
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <p className="mb-3 text-sm font-bold text-gray-800">
                  Contribution period
                </p>
                <div className="space-y-3">
                  <RadioRow
                    name="post2018Months"
                    label="Less than 36 months"
                    checked={form.post2018Months === 'less_than_36'}
                    onChange={() =>
                      updateForm({ post2018Months: 'less_than_36' })
                    }
                  />
                  <RadioRow
                    name="post2018Months"
                    label="36 months or more"
                    checked={form.post2018Months === '36_or_more'}
                    onChange={() =>
                      updateForm({ post2018Months: '36_or_more' })
                    }
                  />
                </div>
              </FormShell>
            )}

            {screen === 'stage-post2001' && (
              <FormShell
                title={`How many ${getStageProviderLabel(
                  form.stageProvider
                )} contribution months did you have since 1 January 2001?`}
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <p className="mb-3 text-sm font-bold text-gray-800">
                  Contribution period
                </p>
                <div className="space-y-3">
                  <RadioRow
                    name="post2001Months"
                    label="Less than 60 months"
                    checked={form.post2001Months === 'less_than_60'}
                    onChange={() =>
                      updateForm({ post2001Months: 'less_than_60' })
                    }
                  />
                  <RadioRow
                    name="post2001Months"
                    label="60 months or more"
                    checked={form.post2001Months === '60_or_more'}
                    onChange={() =>
                      updateForm({ post2001Months: '60_or_more' })
                    }
                  />
                </div>
              </FormShell>
            )}

            {screen === 'eligibility-questions' && (
              <FormShell
                title={
                  form.pensionType === 'stage'
                    ? `A few more details about your ${getStageProviderLabel(
                        form.stageProvider
                      )} insurance`
                    : 'A few more details about your public-sector pension'
                }
                subtitle="Please answer these final questions so we can complete your refund check."
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <div className="space-y-7">
                  {getEligibilityQuestions(form.pensionType).map(
                    (question, index) => (
                      <YesNoQuestion
                        key={question.field}
                        number={index + 1}
                        name={question.field}
                        question={question.question}
                        helper={question.helper}
                        value={form[question.field]}
                        onChange={(value) =>
                          updateForm({ [question.field]: value })
                        }
                      />
                    )
                  )}
                </div>
              </FormShell>
            )}

            {screen === 'salary' && (
              <FormShell
                title="What was your average gross monthly salary?"
                subtitle="A rough average is enough for this estimate."
                canContinue={canContinue}
                onBack={goBack}
                onContinue={handleContinue}
              >
                <label className="block text-left">
                  <span className="mb-2 block text-sm font-medium text-gray-800">
                    Average monthly gross salary (€)
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.averageMonthlyGrossSalary}
                    onChange={(event) =>
                      updateForm({
                        averageMonthlyGrossSalary: event.target.value.replace(
                          /[^0-9]/g,
                          ''
                        ),
                      })
                    }
                    placeholder="E.g., 3500"
                    className="h-12 w-full rounded-lg border border-[#D7DCE8] px-4 text-gray-900 shadow-sm outline-none transition focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25"
                  />
                </label>
              </FormShell>
            )}

            {screen === 'vested' && (
              <div className="mx-auto w-full max-w-[560px] text-center">
                <div className="mx-auto mb-8 flex h-[122px] w-[122px] items-center justify-center rounded-full bg-[#F1CFCB]">
                  <div className="flex h-[94px] w-[94px] items-center justify-center rounded-full bg-[#B91C0B]">
                    <X className="h-14 w-14 text-white" />
                  </div>
                </div>
                <h1
                  className="mx-auto max-w-[560px] text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  Not eligible for a supplementary pension refund
                </h1>
                <p className="mx-auto mt-6 max-w-[560px] text-lg leading-7 text-[#4C504D]">
                  Based on your information, your supplementary pension is
                  vested, so it is preserved as a future pension entitlement and
                  cannot be refunded as a lump sum.
                  {form.vblPlan === 'VBLextra' &&
                    ' When contributions to VBLextra exist, any VBLklassik contributions are preserved in the same way.'}
                </p>
                <p className="mx-auto mt-6 max-w-[560px] text-lg leading-7 text-[#4C504D]">
                  This means your pension remains credited to you and may be
                  paid out later as a regular pension benefit when you reach the
                  German retirement age.
                </p>
                <button
                  type="button"
                  onClick={goBack}
                  className="mx-auto mt-9 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Go back
                </button>
              </div>
            )}

            {screen === 'blocked' && (
              <div className="mx-auto w-full max-w-[560px] text-center">
                <div className="mx-auto mb-8 flex h-[122px] w-[122px] items-center justify-center rounded-full bg-[#F1CFCB]">
                  <div className="flex h-[94px] w-[94px] items-center justify-center rounded-full bg-[#B91C0B]">
                    <X className="h-14 w-14 text-white" />
                  </div>
                </div>
                <h1
                  className="mx-auto max-w-[560px] text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  This refund cannot currently be claimed with CompanyPension
                </h1>
                <button
                  type="button"
                  onClick={reset}
                  className="mx-auto mt-9 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Return to start
                </button>
              </div>
            )}

            {screen === 'not-startable' && (
              <div className="mx-auto w-full max-w-[560px] text-center">
                <div className="mx-auto mb-8 flex h-[122px] w-[122px] items-center justify-center rounded-full bg-[#F1CFCB]">
                  <div className="flex h-[94px] w-[94px] items-center justify-center rounded-full bg-[#B91C0B]">
                    <X className="h-14 w-14 text-white" />
                  </div>
                </div>
                <h1
                  className="mx-auto max-w-[560px] text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  This refund cannot currently be started with CompanyPension
                </h1>
                <button
                  type="button"
                  onClick={reset}
                  className="mx-auto mt-9 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Return to start
                </button>
              </div>
            )}

            {screen === 'ready' && (
              <div className="mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
                <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#9FE870]">
                  <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#163300]">
                    <Check
                      className="h-11 w-11 text-[#9FE870]"
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <h1
                  className="text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  Your refund can be started with CompanyPension
                </h1>
                <button
                  type="button"
                  onClick={() => void startClaim()}
                  className="mt-9 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                >
                  {getStartClaimLabel(form.pensionType, form.stageProvider)}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {screen === 'waiting' && reminderStep === 'set' && (
              <div className="mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
                <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#9FE870]">
                  <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#163300]">
                    <Check
                      className="h-11 w-11 text-[#9FE870]"
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <h1
                  className="text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  Reminder set
                </h1>
                <p className="mt-4 max-w-[460px] text-base leading-6 text-[#4B5563]">
                  We&apos;ll email you when you can start your refund.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-8 flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Return to start
                </button>
              </div>
            )}

            {screen === 'waiting' && reminderStep === 'form' && (
              <div className="mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
                <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#EEF6EA]">
                  <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#5A9A23]">
                    <Clock className="h-11 w-11 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h1
                  className="text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  Your refund cannot be started yet
                </h1>
                <p className="mb-8 mt-4 max-w-[520px] text-base leading-6 text-[#4B5563]">
                  You can return on or after {getStartEligibleDate(form)}.
                </p>

                <label className="w-full max-w-[400px] text-left">
                  <span className="mb-2 block text-sm font-semibold text-[#4A4F58]">
                    Email address
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={reminderEmail}
                    onChange={(event) => setReminderEmail(event.target.value)}
                    className="mb-5 h-12 w-full rounded-lg border border-[#D3DAE8] bg-white px-4 text-gray-900 shadow-sm outline-none transition focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/25"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setReminderStep('set')}
                  disabled={!reminderEmail}
                  className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Set reminder
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-4 max-w-[430px] text-sm italic leading-5 text-[#6B7280]">
                  We&apos;ll send you an email reminder when you can start your
                  refund.
                </p>
                <button
                  type="button"
                  onClick={() => setReminderStep('initial')}
                  className="mt-6 text-[15px] font-semibold text-[#163300] underline underline-offset-2 transition hover:text-[#2A5A00]"
                >
                  Back
                </button>
              </div>
            )}

            {screen === 'waiting' && reminderStep === 'initial' && (
              <div className="mx-auto flex w-full max-w-[620px] flex-col items-center text-center">
                <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#EEF6EA]">
                  <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#5A9A23]">
                    <Clock className="h-11 w-11 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h1
                  className="text-[25px] font-bold leading-tight text-gray-950"
                  style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                >
                  Your refund cannot be started yet
                </h1>
                <p className="mb-8 mt-4 max-w-[460px] text-base leading-6 text-[#4B5563]">
                  You can return on or after {getStartEligibleDate(form)}.
                </p>

                <button
                  type="button"
                  onClick={() => setReminderStep('form')}
                  className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                >
                  <Bell className="h-5 w-5" />
                  Notify me when I can start
                </button>
                <p className="mt-4 text-sm italic leading-5 text-[#6B7280]">
                  We&apos;ll send you an email reminder.
                </p>
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-6 text-[15px] font-semibold text-[#163300] underline underline-offset-2 transition hover:text-[#2A5A00]"
                >
                  Back
                </button>
              </div>
            )}

            {screen === 'result' && (
              <div className="mx-auto w-full max-w-[640px] text-center">
                {isCalculating ? (
                  <>
                    <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[#9FE870] border-t-[#163300]" />
                    <h1 className="text-2xl font-bold text-gray-950">
                      Calculating your estimate
                    </h1>
                  </>
                ) : error ? (
                  <>
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
                      <X className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-950">
                      Calculation Error
                    </h1>
                    <p className="mt-3 text-sm text-red-700">{error}</p>
                    <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={goBack}
                        className="flex h-12 items-center justify-center gap-2 rounded-md border border-[#D7DCE8] bg-white px-6 font-semibold text-[#163300] shadow-sm transition hover:bg-gray-50"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => void calculateEstimate()}
                        className="flex h-12 items-center justify-center rounded-md bg-[#9FE870] px-6 font-semibold text-[#163300]"
                      >
                        Try again
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h1
                      className="text-[25px] font-bold leading-tight text-gray-950"
                      style={{ fontFamily: 'var(--vbl-font-inter-tight)' }}
                    >
                      {getEstimateTitle(form.pensionType, form.stageProvider)}
                    </h1>
                    <div className="mx-auto mt-8 flex min-h-[174px] w-full max-w-[600px] items-center justify-center rounded-lg bg-[#9FE870] shadow-md">
                      <div>
                        <div className="mb-2 flex items-center justify-center gap-2 text-xl font-bold text-[#163300]">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#163300]">
                            <Check className="h-4 w-4 text-white" />
                          </span>
                          Estimated refund
                        </div>
                        <p className="text-[50px] font-bold leading-none text-[#163300]">
                          € {formatAmount(refundAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="mx-auto mt-7 flex max-w-[600px] items-start gap-2 text-left text-sm leading-5 text-gray-700">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        This is a rough estimate based on your contribution
                        period, average salary and federal state. The final
                        refund amount may differ after the pension provider
                        confirms the records.
                      </p>
                    </div>
                    <div className="mx-auto mt-8 grid max-w-[600px] gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={reset}
                        className="flex h-12 items-center justify-center gap-2 rounded-md border border-[#D7DCE8] bg-white font-semibold text-[#163300] shadow-sm transition hover:bg-gray-50"
                      >
                        <ArrowLeft className="h-5 w-5" />
                        Back to calculator
                      </button>
                      <button
                        type="button"
                        onClick={() => setScreen('eligibility-questions')}
                        className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#9FE870] font-semibold text-[#163300] shadow-md transition hover:bg-[#8AD860]"
                      >
                        {getStartClaimLabel(
                          form.pensionType,
                          form.stageProvider
                        )}
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManualVBLCalculator;
