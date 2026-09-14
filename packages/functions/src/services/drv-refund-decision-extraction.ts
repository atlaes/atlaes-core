import { logger } from '../utils/logger';

// bAV cash-out, route A: OCR autofill for the DRV Erstattungsbescheid
// (§ 210 SGB VI contribution refund decision). The letters need the issuing
// office and the decision date ("Bescheid vom {{drv_decision_date}},
// {{drv_office}}"). Mirrors health-insurance-document-extraction.ts
// (Mistral OCR + JSON-mode structuring).

export interface DrvRefundDecisionExtractionDetails {
  /** Issuing office, e.g. "Deutsche Rentenversicherung Bund". */
  drvOffice: string | null;
  /** Decision date as YYYY-MM-DD. */
  decisionDate: string | null;
  /** German social insurance number (Versicherungsnummer) if printed. */
  insuranceNumber: string | null;
  /** Refunded amount in EUR as a dot-decimal string, if printed. */
  refundAmount: string | null;
  /** Addressee name as printed. */
  applicantName: string | null;
  /** True when the document reads as a refund decision, not e.g. a mere receipt. */
  isRefundDecision: boolean | null;
}

export interface DrvRefundDecisionExtractionConfidence {
  drvOffice: number;
  decisionDate: number;
  insuranceNumber: number;
  refundAmount: number;
  applicantName: number;
  isRefundDecision: number;
}

export interface DrvRefundDecisionExtractionResult {
  details: DrvRefundDecisionExtractionDetails;
  confidence: DrvRefundDecisionExtractionConfidence;
  missingFields: string[];
  model: string;
  rawText: string;
}

export interface ExtractDrvRefundDecisionOptions {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  apiKey?: string;
  model?: string;
  ocrModel?: string;
}

export class DrvRefundDecisionExtractionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrvRefundDecisionExtractionConfigError';
  }
}

export class DrvRefundDecisionExtractionProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrvRefundDecisionExtractionProviderError';
  }
}

const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_OCR_MODEL = 'mistral-ocr-latest';
const DEFAULT_EXTRACTION_MODEL = 'mistral-large-latest';
const MAX_OCR_TEXT_CHARS = 45_000;

const FIELD_NAMES = [
  'drvOffice',
  'decisionDate',
  'insuranceNumber',
  'refundAmount',
  'applicantName',
  'isRefundDecision',
] as const;

// Canonical spellings of the DRV carriers, matched case-insensitively
// against the OCR'd office name so the letter always cites the official
// name.
const DRV_OFFICES = [
  'Deutsche Rentenversicherung Bund',
  'Deutsche Rentenversicherung Knappschaft-Bahn-See',
  'Deutsche Rentenversicherung Baden-Württemberg',
  'Deutsche Rentenversicherung Bayern Süd',
  'Deutsche Rentenversicherung Berlin-Brandenburg',
  'Deutsche Rentenversicherung Braunschweig-Hannover',
  'Deutsche Rentenversicherung Hessen',
  'Deutsche Rentenversicherung Mitteldeutschland',
  'Deutsche Rentenversicherung Nord',
  'Deutsche Rentenversicherung Nordbayern',
  'Deutsche Rentenversicherung Oldenburg-Bremen',
  'Deutsche Rentenversicherung Rheinland',
  'Deutsche Rentenversicherung Rheinland-Pfalz',
  'Deutsche Rentenversicherung Saarland',
  'Deutsche Rentenversicherung Schwaben',
  'Deutsche Rentenversicherung Westfalen',
] as const;

interface MistralExtractionPayload {
  drvOffice?: unknown;
  decisionDate?: unknown;
  insuranceNumber?: unknown;
  refundAmount?: unknown;
  applicantName?: unknown;
  isRefundDecision?: unknown;
  confidence?: Partial<Record<(typeof FIELD_NAMES)[number], unknown>>;
  missingFields?: unknown;
}

export async function extractDrvRefundDecisionDetails({
  fileBuffer,
  fileName,
  mimeType,
  apiKey = process.env.MISTRAL_API_KEY,
  model = process.env.MISTRAL_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
  ocrModel = process.env.MISTRAL_OCR_MODEL || DEFAULT_OCR_MODEL,
}: ExtractDrvRefundDecisionOptions): Promise<DrvRefundDecisionExtractionResult> {
  if (!apiKey) {
    throw new DrvRefundDecisionExtractionConfigError(
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
  const parsed = await requestMistralExtraction({ rawText, apiKey, model });
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
  const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  const document =
    mimeType === 'application/pdf'
      ? { type: 'document_url', document_url: dataUrl }
      : { type: 'image_url', image_url: dataUrl };

  const response = await fetch(MISTRAL_OCR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ocrModel,
      document,
      include_image_base64: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseJson = await readJsonResponse(response);
  if (!response.ok) {
    logger.error('Mistral OCR failed (DRV refund decision)', {
      status: response.status,
      fileName,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new DrvRefundDecisionExtractionProviderError(
      'DRV refund decision OCR failed'
    );
  }

  const pages = Array.isArray(responseJson?.pages) ? responseJson.pages : [];
  const rawText = pages
    .map((page: { markdown?: unknown }) =>
      typeof page?.markdown === 'string' ? page.markdown : ''
    )
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!rawText) {
    throw new DrvRefundDecisionExtractionProviderError(
      'DRV refund decision OCR returned no readable text'
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
        { role: 'system', content: buildExtractionPrompt() },
        {
          role: 'user',
          content: `Extract the DRV refund decision fields JSON from this OCR text:\n\n${rawText}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseJson = await readJsonResponse(response);
  if (!response.ok) {
    logger.error('Mistral DRV refund decision extraction failed', {
      status: response.status,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new DrvRefundDecisionExtractionProviderError(
      'DRV refund decision extraction failed'
    );
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new DrvRefundDecisionExtractionProviderError(
      'DRV refund decision extraction returned no JSON'
    );
  }
  return parseExtractionJson(content);
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
    'Extract fields from a German statutory pension document. The expected document is an "Erstattungsbescheid" or "Bescheid über die Erstattung von Beiträgen" from the Deutsche Rentenversicherung (DRV), i.e. the decision granting a refund of pension contributions under § 210 SGB VI.',
    'Return only valid JSON. Do not include markdown.',
    'If a value is not clearly visible, use null and add the field name to missingFields.',
    'drvOffice is the issuing DRV carrier exactly as printed in the letterhead, e.g. "Deutsche Rentenversicherung Bund", "Deutsche Rentenversicherung Nord", "Deutsche Rentenversicherung Bayern Süd".',
    'decisionDate is the date of the decision (the letter date, usually printed near the top right or next to "Datum"). Return it as YYYY-MM-DD.',
    'insuranceNumber is the Versicherungsnummer (12 characters, e.g. 12 345678 A 123) if printed.',
    'refundAmount is the refunded amount in EUR as a plain decimal with a dot (e.g. "4321.50"), if printed.',
    "applicantName is the addressee's full name as printed.",
    'isRefundDecision is true only if the document actually grants a refund of contributions (Erstattung der Beiträge), false if it is a different DRV document (e.g. Renteninformation, Versicherungsverlauf, a rejection, or a mere receipt of an application), null if unclear.',
    'Return this exact JSON shape:',
    JSON.stringify({
      drvOffice: null,
      decisionDate: null,
      insuranceNumber: null,
      refundAmount: null,
      applicantName: null,
      isRefundDecision: null,
      confidence: {
        drvOffice: 0,
        decisionDate: 0,
        insuranceNumber: 0,
        refundAmount: 0,
        applicantName: 0,
        isRefundDecision: 0,
      },
      missingFields: FIELD_NAMES,
    }),
  ].join('\n');
}

function parseExtractionJson(content: string): MistralExtractionPayload {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const objectMatch = withoutFence.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(objectMatch ? objectMatch[0] : withoutFence);
  } catch {
    throw new DrvRefundDecisionExtractionProviderError(
      'DRV refund decision extraction returned invalid JSON'
    );
  }
}

function normalizeExtraction(
  parsed: MistralExtractionPayload,
  model: string,
  rawText: string
): DrvRefundDecisionExtractionResult {
  const details: DrvRefundDecisionExtractionDetails = {
    drvOffice: normalizeDrvOffice(parsed.drvOffice),
    decisionDate: normalizeDate(parsed.decisionDate),
    insuranceNumber: normalizeText(parsed.insuranceNumber),
    refundAmount: normalizeAmount(parsed.refundAmount),
    applicantName: normalizeText(parsed.applicantName),
    isRefundDecision: normalizeBoolean(parsed.isRefundDecision),
  };

  const reported = Array.isArray(parsed.missingFields)
    ? parsed.missingFields.filter((f): f is string => typeof f === 'string')
    : [];
  const missingFields = Array.from(
    new Set([
      ...reported,
      ...FIELD_NAMES.filter(
        (field) => details[field] === null || details[field] === undefined
      ),
    ])
  ).filter((f) => (FIELD_NAMES as readonly string[]).includes(f));

  const confidence = {} as DrvRefundDecisionExtractionConfidence;
  for (const field of FIELD_NAMES) {
    confidence[field] = normalizeConfidence(parsed.confidence?.[field]);
  }

  return { details, confidence, missingFields, model, rawText };
}

/** Maps a free-text office name to the canonical DRV carrier spelling. */
export function normalizeDrvOffice(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const compact = text.toLowerCase().replace(/[\s-]+/g, '');
  for (const office of DRV_OFFICES) {
    const officeCompact = office.toLowerCase().replace(/[\s-]+/g, '');
    if (compact === officeCompact) return office;
    const suffix = officeCompact.replace('deutscherentenversicherung', '');
    if (
      compact.includes('rentenversicherung') &&
      compact.endsWith(suffix) &&
      suffix.length > 0
    ) {
      return office;
    }
  }
  if (/^drv\s+/i.test(text)) {
    return normalizeDrvOffice(
      text.replace(/^drv\s+/i, 'Deutsche Rentenversicherung ')
    );
  }
  return text;
}

/** Accepts YYYY-MM-DD or DD.MM.YYYY (and D.M.YYYY); returns YYYY-MM-DD. */
export function normalizeDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  let y: number;
  let m: number;
  let d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else if (de) {
    d = Number(de[1]);
    m = Number(de[2]);
    y = Number(de[3]);
  } else {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

function normalizeAmount(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  const text = normalizeText(value);
  if (!text) return null;
  let s = text.replace(/[^0-9.,]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s =
      s.lastIndexOf(',') > s.lastIndexOf('.')
        ? s.replace(/\./g, '').replace(',', '.')
        : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const parts = s.split(',');
    s =
      parts.length === 2 && parts[1].length !== 3
        ? s.replace(',', '.')
        : s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) && s !== '' ? n.toFixed(2) : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'yes' || v === 'ja') return true;
    if (v === 'false' || v === 'no' || v === 'nein') return false;
  }
  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
