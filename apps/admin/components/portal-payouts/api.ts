import apiClient from '@/lib/api';

// Client for /api/law-firm/payouts — payout queue and statement upload.
// Scoped server-side to the caller's firm.

export interface QueueLine {
  id: string;
  kind: 'atlaes' | 'client';
  recipient: string;
  amount: number;
  account: string;
  bic: string | null;
  bank: string | null;
  transferMethod: string;
  reference: string;
  currency: string | null;
  route: string | null;
  status: 'open' | 'paid';
  paidOn: string | null;
  remarks: string | null;
}

export interface QueueCase {
  claimId: string;
  releaseId: string;
  clientName: string;
  zeSignedAt: string | null;
  invoiceNumber: string | null;
  valueDate: string;
  totalReceived: number;
  lawFirmFee: number;
  atlaesShare: number;
  sumOk: boolean;
  hasZe: boolean;
  hasBescheid: boolean;
  lines: QueueLine[];
}

export interface QueueView {
  cases: QueueCase[];
  paidTodayEur: number;
  dailyLimitEur: number;
  today: string;
}

export interface ColumnMap {
  valueDate: string;
  amount: string;
  reference: string;
  payer: string | null;
}

export interface StatementPreview {
  fileKind: 'xlsx' | 'csv';
  headers: string[];
  headerRowIndex: number;
  sampleRows: string[][];
  suggestedMap: Partial<ColumnMap>;
  lastMap: ColumnMap | null;
}

export type LineStatus =
  | 'matched'
  | 'unmatched'
  | 'assigned'
  | 'dismissed'
  | 'debit'
  | 'duplicate'
  | 'invalid';

export type MatchReason =
  | 'vsnr+name'
  | 'vsnr'
  | 'name_only'
  | 'ambiguous'
  | 'none';

export interface StatementLine {
  id: string;
  lineNo: number;
  valueDate: string | null;
  amount: number | null;
  reference: string;
  payer: string;
  status: LineStatus;
  matchReason: MatchReason | null;
  matchReasonText: string | null;
  matchedCase: { claimId: string; name: string; vsnr: string | null } | null;
  firmSuggestion: string | null;
  resolutionNote: string | null;
}

export interface StatementResult {
  id: string;
  fileName: string;
  fileKind: string;
  createdAt: string | null;
  uploadedBy: string | null;
  columnMap: ColumnMap;
  matchedCount: number;
  unmatchedCount: number;
  matchedTotal: number;
  lines: StatementLine[];
}

export interface LastUpload {
  importId: string;
  fileName: string;
  createdAt: string | null;
  uploadedBy: string | null;
  columnMap: ColumnMap;
}

export interface ReconciliationLine extends StatementLine {
  importId: string;
  fileName: string;
}

const BASE = '/law-firm/payouts';

export async function getPayoutQueue(): Promise<QueueView> {
  const { data } = await apiClient.get(BASE);
  return data;
}

export async function markLinePaid(lineId: string, paidOn: string) {
  const { data } = await apiClient.post(`${BASE}/lines/${lineId}/paid`, {
    paidOn,
  });
  return data as { caseClosed: boolean; invoicePaid: boolean };
}

export async function downloadPayoutCsv(): Promise<void> {
  const res = await apiClient.get(`${BASE}/export.csv`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Uebersicht_Ueberweisungen_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getCaseDownload(
  claimId: string,
  kind: 'ze' | 'bescheid'
) {
  const { data } = await apiClient.get(`${BASE}/claims/${claimId}/${kind}`);
  return data as { url: string; fileName: string };
}

export async function getLastUpload(): Promise<LastUpload | null> {
  const { data } = await apiClient.get(`${BASE}/statements/last`);
  return data.last ?? null;
}

export async function getStatement(id: string): Promise<StatementResult> {
  const { data } = await apiClient.get(`${BASE}/statements/${id}`);
  return data.result;
}

function form(file: File, columnMap?: ColumnMap) {
  const fd = new FormData();
  fd.append('file', file);
  if (columnMap) fd.append('columnMap', JSON.stringify(columnMap));
  return fd;
}

export async function previewStatement(file: File): Promise<StatementPreview> {
  const { data } = await apiClient.post(
    `${BASE}/statements/preview`,
    form(file),
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data.preview;
}

export async function importStatement(
  file: File,
  columnMap: ColumnMap
): Promise<StatementResult> {
  const { data } = await apiClient.post(
    `${BASE}/statements`,
    form(file, columnMap),
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data.result;
}

export async function getReconciliation(): Promise<ReconciliationLine[]> {
  const { data } = await apiClient.get(`${BASE}/reconciliation`);
  return data.lines;
}

export async function suggestCase(lineId: string, note: string) {
  await apiClient.post(`${BASE}/reconciliation/${lineId}/suggest`, { note });
}

export function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err?.response?.data?.error || fallback;
}

/** "3,038.49" (Figma: en-GB grouping, two decimals). */
export const money = (n: number) =>
  n.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
