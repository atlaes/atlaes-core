import { logger } from '../utils/logger';

// Task 15: Health Insurance substep OCR autofill (bAV/private pension type
// only). Mirrors packages/functions/src/services/pension-document-extraction.ts
// (Mistral OCR + mistral-large-latest structuring) but for the simpler,
// non-branching health-insurance field set.

export interface HealthInsuranceDocumentExtractionDetails {
  type: 'statutory' | 'private' | null;
  providerName: string | null;
  providerAddress: string | null;
  insuredSinceMonth: string | null;
  insuredSinceYear: string | null;
  placeOfBirth: string | null;
  countryOfBirth: string | null;
  insuranceNumber: string | null;
}

export interface HealthInsuranceDocumentExtractionConfidence {
  type: number;
  provider: number;
  insuredSince: number;
  placeOfBirth: number;
  countryOfBirth: number;
  insuranceNumber: number;
}

export interface HealthInsuranceDocumentExtractionResult {
  details: HealthInsuranceDocumentExtractionDetails;
  confidence: HealthInsuranceDocumentExtractionConfidence;
  missingFields: string[];
  model: string;
  rawText: string;
}

export interface ExtractHealthInsuranceDocumentOptions {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  apiKey?: string;
  model?: string;
  ocrModel?: string;
}

export class HealthInsuranceDocumentExtractionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HealthInsuranceDocumentExtractionConfigError';
  }
}

export class HealthInsuranceDocumentExtractionProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HealthInsuranceDocumentExtractionProviderError';
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

const FIELD_NAMES = [
  'type',
  'providerName',
  'providerAddress',
  'insuredSinceMonth',
  'insuredSinceYear',
  'placeOfBirth',
  'countryOfBirth',
  'insuranceNumber',
] as const;

type ExtractedFieldName = (typeof FIELD_NAMES)[number];

interface MistralExtractionPayload {
  type?: unknown;
  providerName?: unknown;
  providerAddress?: unknown;
  insuredSinceMonth?: unknown;
  insuredSinceYear?: unknown;
  placeOfBirth?: unknown;
  countryOfBirth?: unknown;
  insuranceNumber?: unknown;
  confidence?: {
    type?: unknown;
    provider?: unknown;
    insuredSince?: unknown;
    placeOfBirth?: unknown;
    countryOfBirth?: unknown;
    insuranceNumber?: unknown;
  };
  missingFields?: unknown;
}

export async function extractHealthInsuranceDocumentDetails({
  fileBuffer,
  fileName,
  mimeType,
  apiKey = process.env.MISTRAL_API_KEY,
  model = process.env.MISTRAL_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
  ocrModel = process.env.MISTRAL_OCR_MODEL || DEFAULT_OCR_MODEL,
}: ExtractHealthInsuranceDocumentOptions): Promise<HealthInsuranceDocumentExtractionResult> {
  if (!apiKey) {
    throw new HealthInsuranceDocumentExtractionConfigError(
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
    apiKey,
    model,
  });

  return normalizeExtraction(parsed, `${ocrModel}+${model}`, rawText);
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
    throw new HealthInsuranceDocumentExtractionProviderError(
      'Health insurance document OCR failed'
    );
  }

  const pages = Array.isArray(responseJson?.pages) ? responseJson.pages : [];
  const rawText = pages
    .map((page) => (typeof page?.markdown === 'string' ? page.markdown : ''))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!rawText) {
    throw new HealthInsuranceDocumentExtractionProviderError(
      'Health insurance document OCR returned no readable text'
    );
  }

  return rawText.length > MAX_OCR_TEXT_CHARS
    ? rawText.slice(0, MAX_OCR_TEXT_CHARS)
    : rawText;
}

async function requestMistralExtraction({
  rawText,
  apiKey,
  model,
}: {
  rawText: string;
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
          content: buildExtractionPrompt(),
        },
        {
          role: 'user',
          content: `Extract the health insurance fields JSON from this OCR text:\n\n${rawText}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseJson = await readJsonResponse(response);
  if (!response.ok) {
    logger.error('Mistral health insurance extraction failed', {
      status: response.status,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new HealthInsuranceDocumentExtractionProviderError(
      'Health insurance document extraction failed'
    );
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new HealthInsuranceDocumentExtractionProviderError(
      'Health insurance document extraction returned no JSON'
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

function buildExtractionPrompt(): string {
  return [
    'Extract health insurance fields from this document (health insurance card, certificate, confirmation letter, or policy document).',
    'The document may be German (gesetzliche/private Krankenversicherung) or from another country.',
    'Return only valid JSON. Do not include markdown.',
    'If a value is not clearly visible, use null and add the field name to missingFields.',
    'Extract type as statutory (for German public/statutory health insurance / gesetzliche Krankenversicherung / public health fund) or private (for private health insurance / private Krankenversicherung). Use null if unclear.',
    'providerName is the name of the health insurance provider/fund (e.g. AOK, TK, Techniker Krankenkasse, Barmer, DAK, Allianz Private Krankenversicherung).',
    "providerAddress is the provider's postal address if shown.",
    'insuredSinceMonth and insuredSinceYear describe the date the person became insured with this provider, if shown.',
    'Use English month names exactly: January, February, March, April, May, June, July, August, September, October, November, December.',
    "placeOfBirth and countryOfBirth are the insured person's place and country of birth, if shown on the document.",
    'insuranceNumber is the health insurance / member / policy number if shown.',
    'Return this exact JSON shape:',
    JSON.stringify({
      type: null,
      providerName: null,
      providerAddress: null,
      insuredSinceMonth: null,
      insuredSinceYear: null,
      placeOfBirth: null,
      countryOfBirth: null,
      insuranceNumber: null,
      confidence: {
        type: 0,
        provider: 0,
        insuredSince: 0,
        placeOfBirth: 0,
        countryOfBirth: 0,
        insuranceNumber: 0,
      },
      missingFields: FIELD_NAMES,
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
    throw new HealthInsuranceDocumentExtractionProviderError(
      'Health insurance document extraction returned invalid JSON'
    );
  }
}

function normalizeExtraction(
  parsed: MistralExtractionPayload,
  model: string,
  rawText: string
): HealthInsuranceDocumentExtractionResult {
  const details: HealthInsuranceDocumentExtractionDetails = {
    type: normalizeType(parsed.type),
    providerName: normalizeText(parsed.providerName),
    providerAddress: normalizeText(parsed.providerAddress),
    insuredSinceMonth: normalizeMonth(parsed.insuredSinceMonth),
    insuredSinceYear: normalizeYear(parsed.insuredSinceYear),
    placeOfBirth: normalizeText(parsed.placeOfBirth),
    countryOfBirth: normalizeText(parsed.countryOfBirth),
    insuranceNumber: normalizeText(parsed.insuranceNumber),
  };

  const missingFields = mergeMissingFields(
    parsed.missingFields,
    FIELD_NAMES.filter((field) => !details[field])
  );

  return {
    details,
    confidence: {
      type: normalizeConfidence(parsed.confidence?.type),
      provider: normalizeConfidence(parsed.confidence?.provider),
      insuredSince: normalizeConfidence(parsed.confidence?.insuredSince),
      placeOfBirth: normalizeConfidence(parsed.confidence?.placeOfBirth),
      countryOfBirth: normalizeConfidence(parsed.confidence?.countryOfBirth),
      insuranceNumber: normalizeConfidence(parsed.confidence?.insuranceNumber),
    },
    missingFields,
    model,
    rawText,
  };
}

function normalizeType(
  value: unknown
): HealthInsuranceDocumentExtractionDetails['type'] {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized.includes('statutory') ||
    normalized.includes('public') ||
    normalized.includes('gesetzlich')
  ) {
    return 'statutory';
  }

  if (normalized.includes('private') || normalized.includes('privat')) {
    return 'private';
  }

  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
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

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function mergeMissingFields(
  modelMissingFields: unknown,
  locallyMissingFields: readonly ExtractedFieldName[]
): string[] {
  const fields = new Set<string>();

  if (Array.isArray(modelMissingFields)) {
    modelMissingFields.forEach((field) => {
      if (typeof field === 'string' && FIELD_NAMES.includes(field as any)) {
        fields.add(field);
      }
    });
  }

  locallyMissingFields.forEach((field) => fields.add(field));
  return Array.from(fields);
}
