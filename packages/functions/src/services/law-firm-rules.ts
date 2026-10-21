/**
 * Pure rules of the law-firm portal (platform brief 2026-09-16, client
 * message 21 Sep 2026). No database access, so everything here is unit
 * tested without Postgres; `LawFirmService` applies these on the rows.
 *
 *  - Aktenzeichen (AZ) is mandatory and has the pattern 12345-YY
 *  - the pack is generated at download time and frozen on the case
 *  - the firm sees a case only while it is released and not yet submitted;
 *    saving the submission date hides it 24 hours later (re-download of
 *    the frozen pack until then; owner's answer 20 Oct 2026)
 *  - no submission date 7 days after the first download → warning to ops,
 *    the case stays visible
 *  - ops can re-release a submitted case for 24 hours
 */

export const AKTENZEICHEN_PATTERN = /^\d{5}-\d{2}$/;

export const OVERDUE_SUBMISSION_DAYS = 7;
export const RERELEASE_HOURS = 24;
/** Re-download window after the submission date is saved. */
export const REDOWNLOAD_HOURS = 24;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Trims and validates; returns null when the value is not a valid AZ. */
export function normalizeAktenzeichen(
  value: string | null | undefined
): string | null {
  const v = (value ?? '').trim();
  return AKTENZEICHEN_PATTERN.test(v) ? v : null;
}

export function isValidAktenzeichen(value: string | null | undefined): boolean {
  return normalizeAktenzeichen(value) !== null;
}

export interface VisibilityInput {
  releasedAt: Date | null | undefined;
  /** Submission date saved by the firm (law_firm_submitted_at). */
  firmSubmittedAt: Date | null | undefined;
  /**
   * When the firm saved that date (law_firm_submission_saved_at). The
   * entered date can lie in the past, so the re-download window counts
   * from here. Null on cases submitted before migration 0026.
   */
  submissionSavedAt?: Date | null | undefined;
  rereleasedUntil: Date | null | undefined;
  now?: Date;
}

export type CaseVisibility =
  | 'not_released'
  | 'visible'
  | 'redownload'
  | 'submitted'
  | 'rereleased';

/** End of the re-download window, or null when there is none. */
export function redownloadUntil(
  submissionSavedAt: Date | null | undefined,
  hours = REDOWNLOAD_HOURS
): Date | null {
  return submissionSavedAt
    ? new Date(submissionSavedAt.getTime() + hours * HOUR_MS)
    : null;
}

/**
 * Visibility of a case for the firm. Ops release makes it visible; saving
 * the submission date leaves it open for re-download for 24 hours, then
 * hides it; a re-release re-opens it until that window closes.
 */
export function caseVisibility(input: VisibilityInput): CaseVisibility {
  const now = input.now ?? new Date();
  if (!input.releasedAt) return 'not_released';
  if (!input.firmSubmittedAt) return 'visible';
  if (
    input.rereleasedUntil &&
    input.rereleasedUntil.getTime() > now.getTime()
  ) {
    return 'rereleased';
  }
  const grace = redownloadUntil(input.submissionSavedAt);
  if (grace && grace.getTime() > now.getTime()) return 'redownload';
  return 'submitted';
}

export function isVisibleToFirm(input: VisibilityInput): boolean {
  const v = caseVisibility(input);
  return v === 'visible' || v === 'redownload' || v === 'rereleased';
}

export interface DownloadGateInput extends VisibilityInput {
  lawFirmRef: string | null | undefined;
}

/**
 * Whether the firm may download (= generate) the submission pack now.
 * Order matters for the message the firm sees.
 */
export function downloadGate(
  input: DownloadGateInput
): { ok: true } | { ok: false; reason: string } {
  if (!isVisibleToFirm(input)) {
    return { ok: false, reason: 'The case is not released to the firm' };
  }
  if (!isValidAktenzeichen(input.lawFirmRef)) {
    return {
      ok: false,
      reason: 'Enter and save the Aktenzeichen (format 12345-YY) first',
    };
  }
  return { ok: true };
}

export interface OverdueInput {
  downloadedAt: Date | null | undefined;
  firmSubmittedAt: Date | null | undefined;
  overdueWarnedAt: Date | null | undefined;
  now?: Date;
  days?: number;
}

/** True when ops should be warned: downloaded, not submitted, 7+ days, not warned yet. */
export function isSubmissionOverdue(input: OverdueInput): boolean {
  const now = input.now ?? new Date();
  const days = input.days ?? OVERDUE_SUBMISSION_DAYS;
  if (!input.downloadedAt || input.firmSubmittedAt || input.overdueWarnedAt)
    return false;
  return now.getTime() - input.downloadedAt.getTime() >= days * DAY_MS;
}

/** Deadline shown on the case ("submission date expected by …"). */
export function submissionDeadline(
  downloadedAt: Date,
  days = OVERDUE_SUBMISSION_DAYS
): Date {
  return new Date(downloadedAt.getTime() + days * DAY_MS);
}

export function rereleaseUntil(
  now = new Date(),
  hours = RERELEASE_HOURS
): Date {
  return new Date(now.getTime() + hours * HOUR_MS);
}

/** Frozen-pack file name: "Einreichung_<AZ>_<Nachname>_<Vorname>.pdf". */
export function submissionPackFileName(
  az: string,
  lastName: string | null,
  firstName: string | null
): string {
  const clean = (s: string | null) =>
    (s ?? '')
      .normalize('NFKD')
      .replace(/\p{M}+/gu, '')
      .replace(/[^\w-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  return (
    ['Einreichung', az, clean(lastName), clean(firstName)]
      .filter(Boolean)
      .join('_') + '.pdf'
  );
}

export interface CopyBlockField {
  label: string;
  value: string | null | undefined;
}

/**
 * "Copy all" text for the firm's own system: the values only, one line
 * per field in the order shown, so the firm can paste them field by field
 * or all at once into its input mask. An empty value keeps its (empty)
 * line so every field stays on the same line number.
 */
export function caseCopyBlock(fields: CopyBlockField[]): string {
  return fields
    .map((f) =>
      f.value === null || f.value === undefined ? '' : String(f.value).trim()
    )
    .join('\n')
    .replace(/\n+$/, '');
}
