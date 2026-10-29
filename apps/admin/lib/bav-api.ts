import apiClient from './api';

// ------------------------------------------------------------ providers

export interface BavProvider {
  id: string;
  /** Recipient name printed on the letter. */
  name: string;
  /** Dropdown label, e.g. "KVBW ZVK". */
  shortName: string | null;
  defaultAddresseeType: 'employer' | 'provider' | null;
  department: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  requiresBankAddress: boolean;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BavProviderInput {
  name: string;
  shortName: string | null;
  defaultAddresseeType: 'employer' | 'provider' | null;
  department: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  requiresBankAddress: boolean;
  notes: string | null;
}

export async function listBavProviders(): Promise<BavProvider[]> {
  const { data } = await apiClient.get('/admin/bav/providers');
  return data.providers;
}

export async function createBavProvider(
  input: BavProviderInput
): Promise<BavProvider> {
  const { data } = await apiClient.post('/admin/bav/providers', input);
  return data.provider;
}

export async function updateBavProvider(
  id: string,
  input: BavProviderInput
): Promise<BavProvider> {
  const { data } = await apiClient.put(`/admin/bav/providers/${id}`, input);
  return data.provider;
}

export async function deleteBavProvider(id: string): Promise<void> {
  await apiClient.delete(`/admin/bav/providers/${id}`);
}

/** Dropdown label: the short name, else the full name. */
export function providerLabel(p: Pick<BavProvider, 'name' | 'shortName'>) {
  return p.shortName || p.name;
}

// ------------------------------------------------------- letter settings

export type BavClaimStatus = 'vested' | 'non_vested';

export interface BavLetterIssue {
  field: string;
  message: string;
  blocking: boolean;
}

export interface BavLetterSettings {
  status: BavClaimStatus | null;
  statusSource: 'admin' | 'derived' | null;
  statusOverride: BavClaimStatus | null;
  applicationTitle: string | null;
  route: 'direct' | 'law_firm';
  templateId: string | null;
  templateName: string | null;
  authority: 'PEV' | 'VOLL';
  attachments: string[];
  issues: BavLetterIssue[];
  canGenerate: boolean;
  lockedReason: string | null;
}

export interface BavLetterSettingsSaveResult {
  settings: BavLetterSettings;
  regenerated: boolean;
  regenerationError: string | null;
  signedContentChanged: boolean;
}

export async function getBavLetterSettings(
  claimId: string
): Promise<BavLetterSettings> {
  const { data } = await apiClient.get(
    `/admin/claims/${claimId}/bav-letter-settings`
  );
  return data.settings;
}

export async function saveBavLetterSettings(
  claimId: string,
  input: { status: BavClaimStatus | null; applicationTitle: string | null }
): Promise<BavLetterSettingsSaveResult> {
  const { data } = await apiClient.put(
    `/admin/claims/${claimId}/bav-letter-settings`,
    input
  );
  return data;
}

export interface BavRegenerateResult {
  downloadUrl: string;
  templateId: string;
  sentToLettershop: boolean;
}

/** POST /admin/claims/:id/package/regenerate (bAV packages). */
export async function regenerateBavPackage(
  claimId: string
): Promise<BavRegenerateResult> {
  const { data } = await apiClient.post(
    `/admin/claims/${claimId}/package/regenerate`
  );
  return data;
}
