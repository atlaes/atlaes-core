import { logger } from '../utils/logger';

export type PensionDocumentType = 'vbl_zvk' | 'vddb_vddko' | 'bav_private';

export interface PensionDocumentExtractionDetails {
  provider:
    | 'VBL'
    | 'ZVK'
    | 'VddB'
    | 'VddKO'
    | 'Allianz'
    | 'Axa'
    | 'BVV'
    | 'Swiss_Life'
    | 'ERGO'
    | 'R_V'
    | 'Nuernberger'
    | 'HDI'
    | 'Other'
    | null;
  vblPlan: 'VBLklassik' | 'VBLextra' | null;
  federalState: string | null;
  startMonth: string | null;
  startYear: string | null;
  endMonth: string | null;
  endYear: string | null;
  employmentEndMonth: string | null;
  employmentEndYear: string | null;
  averageMonthlyGrossSalary: string | null;
  statePensionRefundReceived: 'yes' | 'no' | null;
  bavStatementValueType:
    | 'monthly_pension'
    | 'capital_amount'
    | 'not_found'
    | null;
  bavStatementAmount: string | null;
}

export interface PensionDocumentExtractionConfidence {
  provider: number;
  vblPlan: number;
  federalState: number;
  dates: number;
  employmentEndDate: number;
  salary: number;
  statePensionRefund: number;
  bavStatementValue: number;
}

export interface PensionDocumentExtractionResult {
  details: PensionDocumentExtractionDetails;
  confidence: PensionDocumentExtractionConfidence;
  missingFields: string[];
  model: string;
  rawText: string;
}

export interface ExtractPensionDocumentOptions {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  pensionType: PensionDocumentType;
  apiKey?: string;
  model?: string;
  ocrModel?: string;
}

export class PensionDocumentExtractionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PensionDocumentExtractionConfigError';
  }
}

export class PensionDocumentExtractionProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PensionDocumentExtractionProviderError';
  }
}

const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_OCR_MODEL = 'mistral-ocr-latest';
const DEFAULT_EXTRACTION_MODEL = 'mistral-large-latest';
const MAX_OCR_TEXT_CHARS = 45_000;

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
] as const;

const GERMAN_FEDERAL_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin',
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
] as const;

const PUBLIC_PROVIDERS = ['VBL', 'ZVK'] as const;
const STAGE_PROVIDERS = ['VddB', 'VddKO'] as const;
const PRIVATE_PROVIDERS = [
  'Allianz',
  'Axa',
  'Swiss_Life',
  'ERGO',
  'R_V',
  'Nuernberger',
  'HDI',
  'BVV',
  'Other',
] as const;
const VBL_PLANS = ['VBLklassik', 'VBLextra'] as const;

const PUBLIC_FIELD_NAMES = [
  'provider',
  'vblPlan',
  'federalState',
  'startMonth',
  'startYear',
  'endMonth',
  'endYear',
  'employmentEndMonth',
  'employmentEndYear',
  'averageMonthlyGrossSalary',
] as const;

const STAGE_FIELD_NAMES = [
  'provider',
  'startMonth',
  'startYear',
  'endMonth',
  'endYear',
  'employmentEndMonth',
  'employmentEndYear',
] as const;

const PRIVATE_FIELD_NAMES = [
  'provider',
  'statePensionRefundReceived',
  'bavStatementValueType',
  'bavStatementAmount',
] as const;

const ALL_FIELD_NAMES = [
  ...PUBLIC_FIELD_NAMES,
  ...STAGE_FIELD_NAMES,
  ...PRIVATE_FIELD_NAMES,
] as const;

type ExtractedFieldName = (typeof ALL_FIELD_NAMES)[number];

interface MistralExtractionPayload {
  provider?: unknown;
  vblPlan?: unknown;
  federalState?: unknown;
  startMonth?: unknown;
  startYear?: unknown;
  endMonth?: unknown;
  endYear?: unknown;
  employmentEndMonth?: unknown;
  employmentEndYear?: unknown;
  averageMonthlyGrossSalary?: unknown;
  statePensionRefundReceived?: unknown;
  bavStatementValueType?: unknown;
  bavStatementAmount?: unknown;
  confidence?: {
    provider?: unknown;
    vblPlan?: unknown;
    federalState?: unknown;
    dates?: unknown;
    employmentEndDate?: unknown;
    salary?: unknown;
    statePensionRefund?: unknown;
    bavStatementValue?: unknown;
  };
  missingFields?: unknown;
}

export async function extractPensionDocumentDetails({
  fileBuffer,
  fileName,
  mimeType,
  pensionType,
  apiKey = process.env.MISTRAL_API_KEY,
  model = process.env.MISTRAL_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
  ocrModel = process.env.MISTRAL_OCR_MODEL || DEFAULT_OCR_MODEL,
}: ExtractPensionDocumentOptions): Promise<PensionDocumentExtractionResult> {
  if (!apiKey) {
    throw new PensionDocumentExtractionConfigError(
      'MISTRAL_API_KEY is not configured'
    );
  }

  const rawText = await requestMistralOcr({
    fileBuffer,
    fileName,
    mimeType,
    apiKey,
    ocrModel,
  });

  const parsed = await requestMistralExtraction({
    rawText,
    pensionType,
    apiKey,
    model,
  });

  return normalizeExtraction(
    parsed,
    `${ocrModel}+${model}`,
    rawText,
    pensionType
  );
}

async function requestMistralOcr({
  fileBuffer,
  fileName,
  mimeType,
  apiKey,
  ocrModel,
}: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  apiKey: string;
  ocrModel: string;
}): Promise<string> {
  const response = await fetch(MISTRAL_OCR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ocrModel,
      document: buildMistralDocument(fileBuffer, mimeType),
      include_image_base64: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseJson = await readJsonResponse(response);
  if (!response.ok) {
    logger.error('Mistral OCR failed', {
      status: response.status,
      fileName,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new PensionDocumentExtractionProviderError(
      'Pension document OCR failed'
    );
  }

  const pages = Array.isArray(responseJson?.pages) ? responseJson.pages : [];
  const rawText = pages
    .map((page) => (typeof page?.markdown === 'string' ? page.markdown : ''))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!rawText) {
    throw new PensionDocumentExtractionProviderError(
      'Pension document OCR returned no readable text'
    );
  }

  return rawText.length > MAX_OCR_TEXT_CHARS
    ? rawText.slice(0, MAX_OCR_TEXT_CHARS)
    : rawText;
}

async function requestMistralExtraction({
  rawText,
  pensionType,
  apiKey,
  model,
}: {
  rawText: string;
  pensionType: PensionDocumentType;
  apiKey: string;
  model: string;
}): Promise<MistralExtractionPayload> {
  const response = await fetch(MISTRAL_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildExtractionPrompt(pensionType),
        },
        {
          role: 'user',
          content: `Extract the calculator JSON from this OCR text:\n\n${rawText}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseJson = await readJsonResponse(response);
  if (!response.ok) {
    logger.error('Mistral pension extraction failed', {
      status: response.status,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new PensionDocumentExtractionProviderError(
      'Pension document extraction failed'
    );
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new PensionDocumentExtractionProviderError(
      'Pension document extraction returned no JSON'
    );
  }

  return parseExtractionJson(content);
}

function buildMistralDocument(fileBuffer: Buffer, mimeType: string) {
  const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

  if (mimeType === 'application/pdf') {
    return {
      type: 'document_url',
      document_url: dataUrl,
    };
  }

  return {
    type: 'image_url',
    image_url: dataUrl,
  };
}

async function readJsonResponse(response: Response): Promise<any> {
  const responseText = await response.text();
  try {
    return responseText ? JSON.parse(responseText) : null;
  } catch {
    return null;
  }
}

function buildExtractionPrompt(pensionType: PensionDocumentType): string {
  const providerInstruction =
    pensionType === 'bav_private'
      ? 'This is a private bAV / company pension cash-out document. The provider must be one of Allianz, Axa, Swiss_Life, ERGO, R_V, Nuernberger, HDI, BVV, or Other if visible. vblPlan, federalState, contribution dates and employment end date should be null unless they are clearly relevant.'
      : pensionType === 'vddb_vddko'
        ? 'The provider must be one of VddB or VddKO if visible. vblPlan should be null for VddB or VddKO documents.'
        : 'The provider must be one of VBL or ZVK if visible. If the provider is VBL, extract vblPlan as VBLklassik or VBLextra when visible.';

  const fieldNames = getFieldNamesForPensionType(pensionType);

  return [
    'Extract calculator fields from this German company pension document.',
    providerInstruction,
    'Return only valid JSON. Do not include markdown.',
    'If a value is not clearly visible, use null and add the field name to missingFields.',
    'Use English month names exactly: January, February, March, April, May, June, July, August, September, October, November, December.',
    'Use German federal state names in English exactly where possible, for example Berlin, Bremen, Bavaria, Hesse, North Rhine-Westphalia.',
    'Contribution period start/end should describe the pension-covered contribution period shown on the document.',
    'Employment end date should describe the employment termination/end date if it is separate from the contribution period end date.',
    'For salary, return only digits as a string, with no currency symbol and no separators.',
    'For private bAV documents, extract whether the German state pension refund / DRV refund is already approved as statePensionRefundReceived: yes or no. If unclear, use null.',
    'For private bAV documents, extract bavStatementValueType as monthly_pension, capital_amount, or not_found. Use monthly_pension for projected monthly pension at retirement. Use capital_amount for a one-time value, capital value, surrender value, or lump-sum amount.',
    'For private bAV documents, return bavStatementAmount as digits only when an amount is visible, with no currency symbol and no separators.',
    'Return this exact JSON shape:',
    JSON.stringify({
      provider: null,
      vblPlan: null,
      federalState: null,
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null,
      employmentEndMonth: null,
      employmentEndYear: null,
      averageMonthlyGrossSalary: null,
      statePensionRefundReceived: null,
      bavStatementValueType: null,
      bavStatementAmount: null,
      confidence: {
        provider: 0,
        vblPlan: 0,
        federalState: 0,
        dates: 0,
        employmentEndDate: 0,
        salary: 0,
        statePensionRefund: 0,
        bavStatementValue: 0,
      },
      missingFields: fieldNames,
    }),
  ].join('\n');
}

function parseExtractionJson(content: string): MistralExtractionPayload {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const objectMatch = withoutFence.match(/\{[\s\S]*\}/);
  const jsonText = objectMatch ? objectMatch[0] : withoutFence;

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new PensionDocumentExtractionProviderError(
      'Pension document extraction returned invalid JSON'
    );
  }
}

function normalizeExtraction(
  parsed: MistralExtractionPayload,
  model: string,
  rawText: string,
  pensionType: PensionDocumentType
): PensionDocumentExtractionResult {
  const details: PensionDocumentExtractionDetails = {
    provider: normalizeProvider(parsed.provider, pensionType),
    vblPlan: normalizeVblPlan(parsed.vblPlan),
    federalState: normalizeState(parsed.federalState),
    startMonth: normalizeMonth(parsed.startMonth),
    startYear: normalizeYear(parsed.startYear),
    endMonth: normalizeMonth(parsed.endMonth),
    endYear: normalizeYear(parsed.endYear),
    employmentEndMonth: normalizeMonth(parsed.employmentEndMonth),
    employmentEndYear: normalizeYear(parsed.employmentEndYear),
    averageMonthlyGrossSalary: normalizeDigits(
      parsed.averageMonthlyGrossSalary
    ),
    statePensionRefundReceived: normalizeYesNo(
      parsed.statePensionRefundReceived
    ),
    bavStatementValueType: normalizeBavStatementValueType(
      parsed.bavStatementValueType
    ),
    bavStatementAmount: normalizeDigits(parsed.bavStatementAmount),
  };

  if (pensionType === 'bav_private') {
    details.vblPlan = null;
    details.federalState = null;
    details.startMonth = null;
    details.startYear = null;
    details.endMonth = null;
    details.endYear = null;
    details.employmentEndMonth = null;
    details.employmentEndYear = null;
    details.averageMonthlyGrossSalary = null;
  } else {
    details.statePensionRefundReceived = null;
    details.bavStatementValueType = null;
    details.bavStatementAmount = null;
  }

  if (details.provider !== 'VBL') {
    details.vblPlan = null;
  }

  const fieldNames = getFieldNamesForPensionType(pensionType);
  const missingFields = mergeMissingFields(
    parsed.missingFields,
    fieldNames,
    fieldNames.filter((field) => {
      if (field === 'vblPlan' && details.provider !== 'VBL') {
        return false;
      }
      if (
        field === 'bavStatementAmount' &&
        details.bavStatementValueType === 'not_found'
      ) {
        return false;
      }
      return !details[field];
    })
  );

  return {
    details,
    confidence: {
      provider: normalizeConfidence(parsed.confidence?.provider),
      vblPlan: normalizeConfidence(parsed.confidence?.vblPlan),
      federalState: normalizeConfidence(parsed.confidence?.federalState),
      dates: normalizeConfidence(parsed.confidence?.dates),
      employmentEndDate: normalizeConfidence(
        parsed.confidence?.employmentEndDate
      ),
      salary: normalizeConfidence(parsed.confidence?.salary),
      statePensionRefund: normalizeConfidence(
        parsed.confidence?.statePensionRefund
      ),
      bavStatementValue: normalizeConfidence(
        parsed.confidence?.bavStatementValue
      ),
    },
    missingFields,
    model,
    rawText,
  };
}

function normalizeProvider(
  value: unknown,
  pensionType: PensionDocumentType
): PensionDocumentExtractionDetails['provider'] {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  const providers =
    pensionType === 'bav_private'
      ? PRIVATE_PROVIDERS
      : pensionType === 'vddb_vddko'
        ? STAGE_PROVIDERS
        : PUBLIC_PROVIDERS;

  const aliases: Record<string, PensionDocumentExtractionDetails['provider']> =
    {
      axa: 'Axa',
      swisslife: 'Swiss_Life',
      'swiss life': 'Swiss_Life',
      ruv: 'R_V',
      'r+v': 'R_V',
      'r v': 'R_V',
      nurnberger: 'Nuernberger',
      nuernberger: 'Nuernberger',
      nürnberger: 'Nuernberger',
      other: 'Other',
    };

  const alias = aliases[normalized];
  if (alias && providers.includes(alias as any)) {
    return alias;
  }

  const provider = providers.find((candidate) => {
    const canonical = candidate.toLowerCase();
    return normalized === canonical || normalized.includes(canonical);
  }) as PensionDocumentExtractionDetails['provider'] | undefined;
  return provider ?? null;
}

function normalizeVblPlan(
  value: unknown
): PensionDocumentExtractionDetails['vblPlan'] {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes('extra')) return 'VBLextra';
  if (normalized.includes('klassik') || normalized.includes('classic')) {
    return 'VBLklassik';
  }

  const plan = VBL_PLANS.find(
    (candidate) => candidate.toLowerCase() === normalized
  );
  return plan ?? null;
}

function normalizeState(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const state = GERMAN_FEDERAL_STATES.find(
    (candidate) => candidate.toLowerCase() === normalized
  );
  return state ?? null;
}

function normalizeMonth(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const month = MONTHS.find((candidate) => {
    const lower = candidate.toLowerCase();
    return normalized === lower || normalized.startsWith(lower.slice(0, 3));
  });
  return month ?? null;
}

function normalizeYear(value: unknown): string | null {
  const text = String(value ?? '').trim();
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
}

function normalizeDigits(value: unknown): string | null {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits || null;
}

function normalizeYesNo(value: unknown): 'yes' | 'no' | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['yes', 'ja', 'approved', 'bewilligt', 'received'].includes(normalized)) {
    return 'yes';
  }
  if (
    ['no', 'nein', 'not approved', 'not received', 'not yet'].includes(
      normalized
    )
  ) {
    return 'no';
  }
  if (
    normalized.includes('not') ||
    normalized.includes('nicht') ||
    normalized.includes('kein')
  ) {
    return 'no';
  }
  if (
    normalized.includes('approved') ||
    normalized.includes('bewilligt') ||
    normalized.includes('erstattet')
  ) {
    return 'yes';
  }
  return null;
}

function normalizeBavStatementValueType(
  value: unknown
): PensionDocumentExtractionDetails['bavStatementValueType'] {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes('monthly') ||
    normalized.includes('monat') ||
    normalized.includes('rente')
  ) {
    return 'monthly_pension';
  }

  if (
    normalized.includes('capital') ||
    normalized.includes('one-time') ||
    normalized.includes('lump') ||
    normalized.includes('kapital') ||
    normalized.includes('einmal') ||
    normalized.includes('auszahlung')
  ) {
    return 'capital_amount';
  }

  if (
    normalized.includes('not_found') ||
    normalized.includes('not found') ||
    normalized.includes('unknown') ||
    normalized.includes('unclear')
  ) {
    return 'not_found';
  }

  return null;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function mergeMissingFields(
  modelMissingFields: unknown,
  allowedFieldNames: readonly ExtractedFieldName[],
  locallyMissingFields: readonly ExtractedFieldName[]
): string[] {
  const fields = new Set<string>();

  if (Array.isArray(modelMissingFields)) {
    modelMissingFields.forEach((field) => {
      if (
        typeof field === 'string' &&
        allowedFieldNames.includes(field as any)
      ) {
        fields.add(field);
      }
    });
  }

  locallyMissingFields.forEach((field) => fields.add(field));
  return Array.from(fields);
}

function getFieldNamesForPensionType(
  pensionType: PensionDocumentType
): readonly ExtractedFieldName[] {
  if (pensionType === 'bav_private') {
    return PRIVATE_FIELD_NAMES;
  }

  if (pensionType === 'vddb_vddko') {
    return STAGE_FIELD_NAMES;
  }

  return PUBLIC_FIELD_NAMES;
}
