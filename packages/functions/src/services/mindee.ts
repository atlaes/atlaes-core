import { logger } from '../utils/logger';
import * as mindee from 'mindee';

// Custom passport model ID
const PASSPORT_MODEL_ID = '11de0d32-3547-441b-8c39-c979f982ae6d';

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

/**
 * Extract passport data using Mindee OCR (V2 API with custom model)
 * @param fileBuffer - The file buffer to process
 * @param fileName - Original file name for extension detection
 */
export async function extractPassportData(
  fileBuffer: Buffer,
  fileName: string
): Promise<PassportOCRResult> {
  const apiKey = process.env.MINDEE_API;

  if (!apiKey) {
    logger.warn('MINDEE_API not configured, skipping OCR');
    return {
      success: false,
      error: 'OCR service not configured',
    };
  }

  try {
    logger.info(`Starting passport OCR for file: ${fileName}`);

    // Initialize Mindee V2 client for custom models
    const mindeeClient = new mindee.ClientV2({ apiKey });

    // Create input from buffer
    const inputSource = new mindee.BufferInput({
      buffer: fileBuffer,
      filename: fileName,
    });

    // Set inference parameters for custom model
    const inferenceParams = {
      modelId: PASSPORT_MODEL_ID,
    };

    // Send for processing (enqueue and wait for result)
    const response = await mindeeClient.enqueueAndGetInference(
      inputSource,
      inferenceParams
    );

    logger.info('Mindee OCR response received');

    // InferenceFields extends Map<string, SimpleField | ObjectField | ListField>
    const fieldsMap = response.inference?.result?.fields;

    if (!fieldsMap) {
      logger.warn('No fields extracted from passport');
      return {
        success: false,
        error: 'No data could be extracted from the document',
      };
    }

    // Log the field names available
    const fieldNames = Array.from(fieldsMap.keys());
    logger.info('Available fields:', fieldNames);

    // Helper to get a simple string field value from InferenceFields
    const getSimpleValue = (fieldName: string): string => {
      try {
        return fieldsMap.getSimpleField(fieldName).stringValue ?? '';
      } catch {
        return '';
      }
    };

    // Helper to get a list field value (e.g. given_names, surnames) joined as a string
    const getListValue = (fieldName: string): string => {
      try {
        return fieldsMap
          .getListField(fieldName)
          .simpleItems.map((item) => item.stringValue ?? '')
          .filter(Boolean)
          .join(' ');
      } catch {
        return '';
      }
    };

    // Helper that tries simple field first, then list field
    const getFieldValue = (fieldName: string): string => {
      return getSimpleValue(fieldName) || getListValue(fieldName);
    };

    // Map gender value
    const mapGender = (sex: string): string => {
      const normalized = sex?.toLowerCase();
      if (normalized === 'm' || normalized === 'male') return 'male';
      if (normalized === 'f' || normalized === 'female') return 'female';
      return 'other';
    };

    // Map fields from Mindee custom passport model
    // Field names based on actual model response: sex, surnames, given_names, nationality,
    // date_of_birth, date_of_issue, date_of_expiry, place_of_birth, passport_number, issuing_country
    const extractedData = {
      firstName: getFieldValue('given_names'),
      lastName: getFieldValue('surnames'),
      dateOfBirth: getFieldValue('date_of_birth'),
      gender: mapGender(getFieldValue('sex')),
      placeOfBirth: getFieldValue('place_of_birth'),
      nationality: getFieldValue('nationality'),
      passportNumber: getFieldValue('passport_number'),
      passportIssueDate: getFieldValue('date_of_issue'),
      passportExpiryDate: getFieldValue('date_of_expiry'),
      issuingCountry: getFieldValue('issuing_country') || getFieldValue('issuing_country_code'),
      mrz1: getFieldValue('mrz1'),
      mrz2: getFieldValue('mrz2'),
    };

    logger.info('Passport data extracted successfully', {
      hasFirstName: !!extractedData.firstName,
      hasLastName: !!extractedData.lastName,
      hasPassportNumber: !!extractedData.passportNumber,
      fieldsFound: fieldNames,
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
    logger.error('Mindee OCR error:', errorDetail);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
}
