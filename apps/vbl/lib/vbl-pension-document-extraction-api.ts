import apiClient from './api';

export type PensionDocumentType = 'vbl_zvk' | 'vddb_vddko' | 'bav_private';
export type PensionDocumentProvider =
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
  | 'Other';

export interface PensionDocumentExtractionDetails {
  provider: PensionDocumentProvider | null;
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
}

interface PensionDocumentExtractionApiResponse {
  success: boolean;
  extraction?: PensionDocumentExtractionResult;
  error?: string;
}

export async function extractPensionDocument(
  file: File,
  pensionType: PensionDocumentType
): Promise<PensionDocumentExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pensionType', pensionType);

  const { data } = await apiClient.post<PensionDocumentExtractionApiResponse>(
    '/vbl/extract-pension-document',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

  if (!data.success || !data.extraction) {
    throw new Error(data.error || 'Pension document extraction failed');
  }

  return data.extraction;
}
