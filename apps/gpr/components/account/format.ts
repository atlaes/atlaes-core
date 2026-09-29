const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** `2026-09-25` → `25 September 2026`. Unknown input is returned as-is. */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const day = parseInt(m[3], 10);
  const month = MONTHS[parseInt(m[2], 10) - 1];
  if (!month || !day) return iso;
  return day + ' ' + month + ' ' + m[1];
}

/** Today's date as YYYY-MM-DD in local time (for date inputs). */
export function todayIso(): string {
  const d = new Date();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  return (
    d.getFullYear() +
    '-' +
    (mm < 10 ? '0' : '') +
    mm +
    '-' +
    (dd < 10 ? '0' : '') +
    dd
  );
}

export function formatFileSize(bytes: number): string {
  if (!(bytes > 0)) return '';
  if (bytes < 1024 * 1024) {
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
