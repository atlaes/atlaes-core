/**
 * Client account API (`/api/account/*`, Stream F).
 *
 * The frontend codes against the `AccountCase` contract below. The backend
 * panel is still moving, so `normalizeAccountCase()` accepts both the flat
 * contract shape and the nested `AccountPanel` shape the current
 * `routes/account.ts` returns, and maps either onto `AccountCase`. Any
 * future mismatch is fixed in this file only.
 *
 * Contract coded against:
 *   GET  /api/account/case
 *     → { caseId, stage: 'preparing'|'submitted'|'decision'|'payout',
 *         pensionOffice, submissionDate, nextClientUpdateDue,
 *         nextOfficeAction: { type, dueDate, label } | null,
 *         openCustomerTask: { id, text, dueDate,
 *                             button: 'upload_documents'|'upload_letter'|null } | null,
 *         latest: [{ date, text, code? }],
 *         updates: [{ date, title, text, code? }],
 *         documents: [{ group, name, description, status,
 *                       statusKind: 'ok'|'info'|'warn', url? }],
 *         stepper: [{ key, label, detail, state: 'done'|'current'|'next' }] }
 *   POST /api/account/letters            multipart { file, receivedOn, sender?, note? }
 *   POST /api/account/tasks/:id/documents multipart { files[] }
 */
import apiClient from './api';

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------

export type AccountStage = 'preparing' | 'submitted' | 'decision' | 'payout';

export const ACCOUNT_STAGES: AccountStage[] = [
  'preparing',
  'submitted',
  'decision',
  'payout',
];

export type AccountTaskButton = 'upload_documents' | 'upload_letter' | null;

export interface AccountNextOfficeAction {
  type: string;
  /** YYYY-MM-DD */
  dueDate: string;
  label: string;
}

export interface AccountOpenTask {
  id: string;
  text: string;
  /** YYYY-MM-DD */
  dueDate: string | null;
  button: AccountTaskButton;
}

export interface AccountLatestEntry {
  /** YYYY-MM-DD */
  date: string;
  text: string;
  code?: string;
}

export interface AccountUpdate {
  id?: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  text: string;
  code?: string;
}

export type AccountDocumentGroup =
  | 'provided'
  | 'signed'
  | 'prepared'
  | 'letters';

export type AccountStatusKind = 'ok' | 'info' | 'warn';

export interface AccountDocument {
  id?: string;
  group: AccountDocumentGroup;
  name: string;
  description: string;
  status: string;
  statusKind: AccountStatusKind;
  url?: string | null;
}

export type AccountStepState = 'done' | 'current' | 'next';

export interface AccountStep {
  key: AccountStage;
  label: string;
  detail: string;
  state: AccountStepState;
}

export interface AccountCase {
  caseId: string;
  stage: AccountStage;
  pensionOffice: string | null;
  /** YYYY-MM-DD */
  submissionDate: string | null;
  /** YYYY-MM-DD */
  nextClientUpdateDue: string | null;
  nextOfficeAction: AccountNextOfficeAction | null;
  openCustomerTask: AccountOpenTask | null;
  latest: AccountLatestEntry[];
  updates: AccountUpdate[];
  documents: AccountDocument[];
  stepper: AccountStep[];
}

export interface UploadLetterInput {
  file: File;
  /** YYYY-MM-DD */
  receivedOn: string;
  sender?: string;
  note?: string;
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

export const STEP_LABELS: Record<AccountStage, string> = {
  preparing: 'Preparing',
  submitted: 'Submitted',
  decision: 'Decision',
  payout: 'Payout',
};

const STEP_DETAILS: Record<AccountStage, string> = {
  preparing: 'Your documents and forms',
  submitted: 'With the pension office',
  decision: 'Their answer',
  payout: 'Your refund',
};

/** Builds the four-step stepper from the case stage. */
export function stepperFor(stage: AccountStage): AccountStep[] {
  const current = ACCOUNT_STAGES.indexOf(stage);
  return ACCOUNT_STAGES.map((key, i) => ({
    key,
    label: STEP_LABELS[key],
    detail: STEP_DETAILS[key],
    state: i < current ? 'done' : i === current ? 'current' : 'next',
  }));
}

// ---------------------------------------------------------------------------
// Normalisation (contract shape or the backend's nested AccountPanel)
// ---------------------------------------------------------------------------

type Dict = Record<string, unknown>;

function isDict(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function isoDate(v: unknown): string | null {
  if (typeof v === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
    return m ? m[1] : null;
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return null;
}

function stageOf(v: unknown): AccountStage {
  return typeof v === 'string' && ACCOUNT_STAGES.indexOf(v as AccountStage) >= 0
    ? (v as AccountStage)
    : 'preparing';
}

function taskButtonOf(v: unknown): AccountTaskButton {
  if (typeof v !== 'string' || v === '') return null;
  if (v === 'upload_documents' || v === 'upload_letter') return v;
  if (/letter/i.test(v)) return 'upload_letter';
  if (/document|upload/i.test(v)) return 'upload_documents';
  return null;
}

function openTaskOf(v: unknown): AccountOpenTask | null {
  if (!isDict(v)) return null;
  const id = str(v.id);
  if (!id) return null;
  return {
    id,
    text: str(v.text) || '',
    dueDate: isoDate(v.dueDate),
    button: taskButtonOf(v.button),
  };
}

function officeActionOf(v: unknown): AccountNextOfficeAction | null {
  if (!isDict(v)) return null;
  const label = str(v.label);
  const dueDate = isoDate(v.dueDate) || isoDate(v.date);
  if (!label || !dueDate) return null;
  return { type: str(v.type) || 'office_action', dueDate, label };
}

function latestEntryOf(v: unknown): AccountLatestEntry | null {
  if (!isDict(v)) return null;
  const date = isoDate(v.date);
  const text = str(v.text) || str(v.summary);
  if (!date || !text) return null;
  const code = str(v.code) || str(v.kind);
  return code ? { date, text, code } : { date, text };
}

function updateOf(v: unknown): AccountUpdate | null {
  if (!isDict(v)) return null;
  const date = isoDate(v.date);
  if (!date) return null;
  const title = str(v.title) || str(v.subject) || 'Update';
  const text = str(v.text) || str(v.body) || '';
  const code = str(v.code) || str(v.template);
  const id = str(v.id);
  const out: AccountUpdate = { date, title, text };
  if (code) out.code = code;
  if (id) out.id = id;
  return out;
}

const GROUPS: AccountDocumentGroup[] = [
  'provided',
  'signed',
  'prepared',
  'letters',
];

const ROLE_LABELS: Record<string, string> = {
  passport: 'Passport',
  payslip: 'Payslip',
  abmeldung: 'Deregistration (Abmeldung)',
  bank_statement: 'Bank statement',
  certified_id_form: 'Certified identity form',
  letter: 'Letter from the pension office',
  task_document: 'Requested document',
};

function roleLabel(role: string | null, fileName: string): string {
  if (role && ROLE_LABELS[role]) return ROLE_LABELS[role];
  if (role)
    return role.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return fileName;
}

function formatBytes(n: number): string {
  if (!(n > 0)) return '';
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Maps one document from either shape onto the contract. */
function documentOf(v: unknown): AccountDocument | null {
  if (!isDict(v)) return null;
  const id = str(v.id) || undefined;
  const url = str(v.url);

  // Contract shape
  const group = str(v.group) as AccountDocumentGroup | null;
  if (group && GROUPS.indexOf(group) >= 0 && str(v.name)) {
    const kind = str(v.statusKind);
    return {
      id,
      group,
      name: str(v.name) as string,
      description: str(v.description) || '',
      status: str(v.status) || '',
      statusKind: kind === 'ok' || kind === 'warn' ? kind : 'info',
      url,
    };
  }

  // Backend AccountPanel shape: { fileName, fileType, fileSize, kind, role, createdAt, url }
  const fileName = str(v.fileName);
  if (!fileName) return null;
  const kind = str(v.kind);
  const role = str(v.role);
  const size = typeof v.fileSize === 'number' ? formatBytes(v.fileSize) : '';
  const description = [fileName, size].filter(Boolean).join(' · ');

  let mapped: AccountDocumentGroup = 'provided';
  let status = 'Received';
  let statusKind: AccountStatusKind = 'ok';
  if (kind === 'letter') {
    mapped = 'letters';
    status = 'Received';
    statusKind = 'info';
  } else if (role === 'certified_id_form' || /sign/i.test(role || '')) {
    mapped = 'signed';
    status = 'Signed';
  } else if (/pack|submission|application|drv|prepared/i.test(role || '')) {
    mapped = 'prepared';
    status = 'Submitted';
  }

  return {
    id,
    group: mapped,
    name: roleLabel(role, fileName),
    description,
    status,
    statusKind,
    url,
  };
}

/**
 * Accepts the raw JSON of GET /api/account/case in either shape and
 * returns the `AccountCase` the screens render.
 */
export function normalizeAccountCase(raw: unknown): AccountCase {
  const r: Dict = isDict(raw) ? raw : {};
  const stage = stageOf(r.stage);

  const nextUpdate = isDict(r.nextUpdate) ? r.nextUpdate : null;
  const anythingToDo = isDict(r.anythingToDo) ? r.anythingToDo : null;
  const whatNext = isDict(r.whatWeAreDoingNext) ? r.whatWeAreDoingNext : null;
  const latestOne = isDict(r.latest) ? r.latest : null;

  const latestSource = Array.isArray(r.latest)
    ? r.latest
    : Array.isArray(r.activity)
      ? r.activity
      : latestOne
        ? [latestOne]
        : [];

  const stepperRaw = arr(r.stepper)
    .map((s): AccountStep | null => {
      if (!isDict(s)) return null;
      const key = stageOf(s.key);
      const state = str(s.state);
      return {
        key,
        label: str(s.label) || STEP_LABELS[key],
        detail: str(s.detail) || STEP_DETAILS[key],
        state: state === 'done' || state === 'current' ? state : 'next',
      };
    })
    .filter((s): s is AccountStep => s !== null);

  return {
    caseId: str(r.caseId) || str(r.claimId) || '',
    stage,
    pensionOffice: str(r.pensionOffice),
    submissionDate: isoDate(r.submissionDate),
    nextClientUpdateDue:
      isoDate(r.nextClientUpdateDue) ||
      (nextUpdate ? isoDate(nextUpdate.date) : null),
    nextOfficeAction:
      officeActionOf(r.nextOfficeAction) ||
      (whatNext ? officeActionOf(whatNext.action) : null),
    openCustomerTask:
      openTaskOf(r.openCustomerTask) ||
      (anythingToDo ? openTaskOf(anythingToDo.task) : null),
    latest: latestSource
      .map(latestEntryOf)
      .filter((e): e is AccountLatestEntry => e !== null),
    updates: arr(r.updates)
      .map(updateOf)
      .filter((u): u is AccountUpdate => u !== null),
    documents: arr(r.documents)
      .map(documentOf)
      .filter((d): d is AccountDocument => d !== null),
    stepper: stepperRaw.length === 4 ? stepperRaw : stepperFor(stage),
  };
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export const accountApi = {
  async getCase(): Promise<AccountCase> {
    const res = await apiClient.get('/account/case');
    return normalizeAccountCase(res.data);
  },

  /**
   * Upload a letter the client received directly. The backend reads
   * `file`, `receivedDate` and `note`; the contract names the date
   * `receivedOn`, so both keys are sent. `sender` is sent as its own field
   * and also folded into the note so it survives either implementation.
   */
  async uploadLetter(input: UploadLetterInput): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', input.file);
    form.append('receivedOn', input.receivedOn);
    form.append('receivedDate', input.receivedOn);
    const sender = (input.sender || '').trim();
    const note = (input.note || '').trim();
    if (sender) form.append('sender', sender);
    const noteOut = [sender ? 'Sender: ' + sender : '', note]
      .filter(Boolean)
      .join('\n\n');
    if (noteOut) form.append('note', noteOut);
    const res = await apiClient.post('/account/letters', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as UploadResult;
  },

  /**
   * Upload documents for an open customer task. The backend accepts one
   * `file` per request, so files are sent sequentially; the contract's
   * `files[]` is also appended so a multi-file backend receives them all.
   */
  async uploadTaskDocuments(
    taskId: string,
    files: File[]
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append('files', file);
      const res = await apiClient.post(
        `/account/tasks/${encodeURIComponent(taskId)}/documents`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      results.push(res.data as UploadResult);
    }
    return results;
  },
};

/** HTTP status of an axios error, or null. */
export function httpStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const e = error as { response?: { status?: unknown } };
  return typeof e.response?.status === 'number' ? e.response.status : null;
}

/** Backend `error` message of an axios error, if any. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as { response?: { data?: { error?: unknown } } };
    const msg = e.response?.data?.error;
    if (typeof msg === 'string' && msg) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default accountApi;
