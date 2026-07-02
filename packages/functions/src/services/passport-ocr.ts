import { logger } from '../utils/logger';

export interface PassportOCRResult {
  success: boolean;
  data?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    placeOfBirth: string;
    nationality: string;
    passportNumber: string;
    passportIssueDate: string;
    passportExpiryDate: string;
    issuingCountry: string;
    mrz1?: string;
    mrz2?: string;
  };
  error?: string;
}

interface IdentityDocumentClassification {
  isIdentityDocument: boolean;
  documentType: string;
}

const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
const DEFAULT_OCR_MODEL = 'mistral-ocr-latest';
const DEFAULT_EXTRACTION_MODEL = 'mistral-large-latest';
const MAX_OCR_TEXT_CHARS = 25_000;
const NOT_IDENTITY_DOCUMENT_ERROR =
  'Uploaded file is not a passport or national ID';

/**
 * Extract passport or national ID data using Mistral OCR.
 * The document is classified before identity fields are extracted.
 */
export async function extractPassportData(
  fileBuffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<PassportOCRResult> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    logger.warn('MISTRAL_API_KEY not configured, skipping passport OCR');
    return {
      success: false,
      error: 'OCR service not configured',
    };
  }

  try {
    logger.info(`Starting Mistral passport OCR for file: ${fileName}`);
    const rawText = await requestMistralOcr({
      fileBuffer,
      fileName,
      mimeType: mimeType || inferMimeType(fileName),
      apiKey,
      ocrModel: process.env.MISTRAL_OCR_MODEL || DEFAULT_OCR_MODEL,
    });

    const classification = await classifyIdentityDocument({
      rawText,
      apiKey,
      model: process.env.MISTRAL_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
    });

    if (!classification.isIdentityDocument) {
      logger.warn('Uploaded file is not a supported identity document', {
        fileName,
        documentType: classification.documentType,
      });
      return {
        success: false,
        error: NOT_IDENTITY_DOCUMENT_ERROR,
      };
    }

    const extractedData = await extractIdentityDetails({
      rawText,
      apiKey,
      model: process.env.MISTRAL_EXTRACTION_MODEL || DEFAULT_EXTRACTION_MODEL,
    });

    logger.info('Passport data extracted successfully with Mistral', {
      hasFirstName: !!extractedData.firstName,
      hasLastName: !!extractedData.lastName,
      hasPassportNumber: !!extractedData.passportNumber,
    });

    return {
      success: true,
      data: extractedData,
    };
  } catch (error) {
    const errorDetail =
      error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : { raw: String(error) };
    logger.error('Mistral passport OCR error:', errorDetail);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
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
    logger.error('Mistral passport OCR failed', {
      status: response.status,
      fileName,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new Error('Passport OCR failed');
  }

  const pages = Array.isArray(responseJson?.pages) ? responseJson.pages : [];
  const rawText = pages
    .map((page) => (typeof page?.markdown === 'string' ? page.markdown : ''))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!rawText) {
    throw new Error('Passport OCR returned no readable text');
  }

  return rawText.length > MAX_OCR_TEXT_CHARS
    ? rawText.slice(0, MAX_OCR_TEXT_CHARS)
    : rawText;
}

async function classifyIdentityDocument({
  rawText,
  apiKey,
  model,
}: {
  rawText: string;
  apiKey: string;
  model: string;
}): Promise<IdentityDocumentClassification> {
  const response = await requestMistralJson({
    apiKey,
    model,
    systemPrompt:
      'Decide whether OCR text is from a passport or government-issued national ID. Return only JSON with keys: isIdentityDocument boolean, documentType string. Use documentType passport, national_id, or other.',
    userPrompt: `Classify this OCR text before extraction:\n\n${rawText}`,
    errorContext: 'Mistral identity document classification failed',
  });

  return {
    isIdentityDocument: response.isIdentityDocument === true,
    documentType: stringField(response.documentType) || 'other',
  };
}

async function extractIdentityDetails({
  rawText,
  apiKey,
  model,
}: {
  rawText: string;
  apiKey: string;
  model: string;
}): Promise<Required<PassportOCRResult>['data']> {
  const response = await requestMistralJson({
    apiKey,
    model,
    systemPrompt:
      'Extract passport or national ID details from OCR text. Return only JSON with these string fields: firstName, lastName, dateOfBirth, gender, placeOfBirth, nationality, passportNumber, passportIssueDate, passportExpiryDate, issuingCountry, mrz1, mrz2. Use ISO dates YYYY-MM-DD when possible. For gender use male, female, or other. Use empty strings for unknown fields.',
    userPrompt: `Extract identity document JSON from this OCR text:\n\n${rawText}`,
    errorContext: 'Mistral passport extraction failed',
  });

  return normalizePassportExtraction(response);
}

async function requestMistralJson({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  errorContext,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  errorContext: string;
}): Promise<Record<string, unknown>> {
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
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const responseJson = await readJsonResponse(response);
  if (!response.ok) {
    logger.error(errorContext, {
      status: response.status,
      body: JSON.stringify(responseJson).slice(0, 1000),
    });
    throw new Error(errorContext);
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`${errorContext}: no JSON returned`);
  }

  return parseExtractionJson(content);
}

function normalizePassportExtraction(payload: Record<string, unknown>) {
  return {
    firstName: stringField(payload.firstName),
    lastName: stringField(payload.lastName),
    dateOfBirth: normalizeDate(stringField(payload.dateOfBirth)),
    gender: normalizeGender(stringField(payload.gender)),
    placeOfBirth: stringField(payload.placeOfBirth),
    nationality: stringField(payload.nationality),
    passportNumber: stringField(payload.passportNumber),
    passportIssueDate: normalizeDate(stringField(payload.passportIssueDate)),
    passportExpiryDate: normalizeDate(stringField(payload.passportExpiryDate)),
    issuingCountry: stringField(payload.issuingCountry),
    mrz1: stringField(payload.mrz1),
    mrz2: stringField(payload.mrz2),
  };
}

function normalizeGender(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === 'm' || normalized === 'male') return 'male';
  if (normalized === 'f' || normalized === 'female') return 'female';
  return value ? 'other' : '';
}

function normalizeDate(value: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slashMatch = value.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/);
  if (!slashMatch) return value;

  const day = slashMatch[1].padStart(2, '0');
  const month = slashMatch[2].padStart(2, '0');
  const year =
    slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
  return `${year}-${month}-${day}`;
}

function parseExtractionJson(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {};
    }
  }
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

function inferMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function readJsonResponse(response: Response): Promise<any> {
  const responseText = await response.text();
  try {
    return responseText ? JSON.parse(responseText) : null;
  } catch {
    return null;
  }
}
