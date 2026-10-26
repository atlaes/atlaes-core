import apiClient from '@/lib/api';

// Client for /api/law-firm/letters — the return-channel bulk upload.
// Scoped server-side to the caller's firm.

export type LetterStatus =
  | 'matched'
  | 'needs_review'
  | 'resolved'
  | 'dismissed';
export type LetterType =
  | 'refund_decision'
  | 'document_request'
  | 'rejection'
  | 'other';

export interface CaseRef {
  claimId: string;
  name: string | null;
  vsnr: string | null;
  lawFirmRef: string | null;
}

export interface FirmLetter {
  id: string;
  fileName: string;
  createdAt: string;
  uploadedBy: string | null;
  status: LetterStatus;
  letterType: LetterType;
  matchReason: string;
  case: CaseRef | null;
}

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  refund_decision: 'Refund decision',
  document_request: 'Request for documents',
  rejection: 'Rejection',
  other: 'Other letter',
};

export const LETTER_ACCEPT = 'application/pdf,image/jpeg,image/png';
export const LETTER_MAX_BYTES = 10 * 1024 * 1024;

export async function getLetters(): Promise<FirmLetter[]> {
  const { data } = await apiClient.get('/law-firm/letters');
  return data.letters;
}

export async function uploadLetter(
  file: File,
  onSent?: () => void
): Promise<{ duplicate: boolean; letter: FirmLetter }> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await apiClient.post('/law-firm/letters', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onSent && e.total && e.loaded >= e.total) onSent();
    },
  });
  return { duplicate: data.duplicate, letter: data.letter };
}
