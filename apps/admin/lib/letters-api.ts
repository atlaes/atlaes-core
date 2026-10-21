import apiClient from './api';
import type { CaseRef, LetterStatus, LetterType } from '@/components/portal-letters/api';

// Client for /api/admin/letters — the return-channel "needs attention"
// queue (letters law firms uploaded that wait for ATLAES).

export type { CaseRef, LetterStatus, LetterType };
export type LetterNextStep = 'record_decision' | 'notify_client' | 'mark_handled';

export interface AdminLetter {
  id: string;
  fileName: string;
  createdAt: string;
  uploadedBy: string | null;
  status: LetterStatus;
  letterType: LetterType;
  matchReason: string;
  case: CaseRef | null;
  firm: { id: string; name: string };
  fileType: string;
  fileSize: number;
  ocrStatus: string;
  ocrError: string | null;
  ocrText: string | null;
  extracted: {
    vsnr: string[];
    az: string[];
    name: string | null;
    letterDate: string | null;
  } | null;
  matchMethod: 'vsnr_name' | 'az' | 'admin' | null;
  candidates: CaseRef[];
  nextStepStatus: 'pending' | 'done' | null;
  nextStepAction: LetterNextStep | null;
  handledBy: string | null;
  handledAt: string | null;
  handledNote: string | null;
}

export const MATCH_REASON_LABELS: Record<string, string> = {
  vsnr_name: 'VSNR and name',
  az: 'Aktenzeichen',
  vsnr_without_name: 'VSNR found, but the client name is not in the letter',
  name_only: 'Only the client name fits — confirm the case',
  ambiguous: 'Several cases fit',
  conflict: 'Aktenzeichen and VSNR point at different cases',
  none: 'No VSNR, Aktenzeichen or client name found',
  ocr_failed: 'The file could not be read',
};

export const NEXT_STEP_LABELS: Record<LetterNextStep, string> = {
  record_decision: 'Decision recorded',
  notify_client: 'Client notified',
  mark_handled: 'Marked handled',
};

export async function getLetters(
  view: 'attention' | 'handled'
): Promise<AdminLetter[]> {
  const { data } = await apiClient.get('/admin/letters', { params: { view } });
  return data.letters;
}

export async function getLetterCount(): Promise<number> {
  const { data } = await apiClient.get('/admin/letters/count');
  return data.attention;
}

export async function getLetterFile(
  id: string
): Promise<{ url: string | null; fileName: string; fileType: string }> {
  const { data } = await apiClient.get(`/admin/letters/${id}/file`);
  return data;
}

export async function searchLetterCases(
  id: string,
  q: string
): Promise<CaseRef[]> {
  const { data } = await apiClient.get(`/admin/letters/${id}/cases`, {
    params: { q },
  });
  return data.cases;
}

export async function assignLetter(
  id: string,
  claimId: string,
  note?: string
): Promise<AdminLetter> {
  const { data } = await apiClient.post(`/admin/letters/${id}/assign`, {
    claimId,
    note: note || undefined,
  });
  return data.letter;
}

export async function dismissLetter(
  id: string,
  note: string
): Promise<AdminLetter> {
  const { data } = await apiClient.post(`/admin/letters/${id}/dismiss`, {
    note,
  });
  return data.letter;
}

export type CompleteInput =
  | {
      action: 'record_decision';
      receivedAt?: string | null;
      note?: string | null;
    }
  | {
      action: 'notify_client';
      customerAction: string;
      customerActionDue?: string | null;
      infoRequestSource: 'customer' | 'file';
      note?: string | null;
    }
  | { action: 'mark_handled'; note: string };

export async function completeLetter(
  id: string,
  input: CompleteInput
): Promise<{ letter: AdminLetter; result: Record<string, unknown> }> {
  const { data } = await apiClient.post(`/admin/letters/${id}/complete`, input);
  return { letter: data.letter, result: data.result };
}
