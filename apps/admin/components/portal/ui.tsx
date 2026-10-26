'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LawFirmClaimCaseType } from '@/lib/law-firm-api';

/**
 * Law-firm portal building blocks (Figma "Law-firm portal & payout",
 * section A). Portal-only: the ops admin keeps its own look in
 * components/ui.tsx. Colours are the Figma values:
 *   navy #002691 · blue-light #d7e4f6 · accent #5e8cd9 · ink #181818
 *   body #4b4f58 · muted #8c8c8c · line #c6c6c6 · surface #f1f1f1
 *   good #dcecdf/#1f5f31 · warn #fbefc7/#6b4d00
 */

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Centered 960px content column with the Figma body padding. */
export function PortalColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center px-4 pb-24 pt-12 sm:px-6">
      <div className="flex w-full max-w-[960px] flex-col gap-8">{children}</div>
    </div>
  );
}

export function PortalCard({
  title,
  action,
  tone = 'white',
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  tone?: 'white' | 'blue';
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'flex w-full flex-col gap-5 rounded-[20px] p-7',
        tone === 'blue' ? 'bg-[#d7e4f6]' : 'border border-[#c6c6c6] bg-white',
        className
      )}
    >
      {(title || action) && (
        <div className="flex w-full items-center justify-between gap-3">
          {title && (
            <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Note({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'body' | 'error';
}) {
  return (
    <p
      className={cx(
        'w-full text-[13px] leading-[1.5]',
        tone === 'muted' && 'text-[#8c8c8c]',
        tone === 'body' && 'text-[#4b4f58]',
        tone === 'error' && 'text-[#b42318]'
      )}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Chips & buttons
// ---------------------------------------------------------------------------

export type ChipTone = 'blue' | 'gray' | 'green';

export function Chip({
  tone = 'blue',
  children,
}: {
  tone?: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold leading-[1.4]',
        tone === 'blue' && 'bg-[#d7e4f6] text-[#002691]',
        tone === 'gray' && 'bg-[#f1f1f1] text-[#4b4f58]',
        tone === 'green' && 'bg-[#dcecdf] text-[#1f5f31]'
      )}
    >
      {children}
    </span>
  );
}

type PillVariant = 'primary' | 'outline';
type PillSize = 'lg' | 'md' | 'sm';

export function PillButton({
  variant = 'primary',
  size = 'lg',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PillVariant;
  size?: PillSize;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold leading-[1.4] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5e8cd9] focus-visible:ring-offset-2',
        size === 'lg' && 'h-[52px] px-7 text-[15px]',
        size === 'md' && 'h-11 px-5 text-[14px]',
        size === 'sm' && 'h-10 px-[18px] text-[13px]',
        variant === 'primary' &&
          'bg-[#002691] text-white hover:bg-[#001d70] disabled:bg-[#f1f1f1] disabled:text-[#8c8c8c]',
        variant === 'outline' &&
          'border border-[#002691] bg-white text-[#002691] hover:bg-[#f3f6fc] disabled:border-[#c6c6c6] disabled:text-[#8c8c8c] disabled:hover:bg-white',
        'disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

/** Figma "Icon / copy" (1035:5127): two offset 8px squares, 12px box. */
export function CopyIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('relative inline-block size-3 shrink-0', className)}
    >
      <span className="absolute left-0 top-1 size-2 rounded-[1.5px] border border-[#8c8c8c]" />
      <span className="absolute left-1 top-0 size-2 rounded-[1.5px] border border-[#8c8c8c] bg-white" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const portalInputClass =
  'h-[52px] w-full rounded-[10px] border border-[#c6c6c6] bg-white px-4 text-[15px] leading-[1.4] text-[#181818] placeholder:text-[#8c8c8c] focus:border-[#002691] focus:outline-none focus:ring-1 focus:ring-[#002691] disabled:bg-[#f1f1f1] disabled:text-[#8c8c8c]';

export function PortalField({
  label,
  htmlFor,
  hint,
  disabled,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className={cx(
          'text-[13px] font-semibold leading-[1.4]',
          disabled ? 'text-[#8c8c8c]' : 'text-[#181818]'
        )}
      >
        {label}
      </label>
      {children}
      {hint && <Note>{hint}</Note>}
    </div>
  );
}

/** Label/value row of the read-only case data block (200px label column). */
export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[13px] font-semibold leading-[1.5] text-[#8c8c8c] sm:w-[200px]">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[15px] leading-[1.5] text-[#181818]">
        {value === null || value === undefined || value === '' ? (
          <span className="text-[#8c8c8c]">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labels & formatting
// ---------------------------------------------------------------------------

/** Brief Part 1: case type is "pension refund" or "company pension". */
export function caseTypeChip(caseType: LawFirmClaimCaseType | undefined): {
  label: string;
  tone: ChipTone;
} {
  return caseType === 'bav_cashout'
    ? { label: 'Company pension', tone: 'gray' }
    : { label: 'Pension refund', tone: 'blue' };
}

/** "Case identifier (VSNR)" / "Case identifier (contract no.)". */
export function caseIdentifierLabel(label: string | undefined): string {
  if (!label || label === 'VSNR') return 'Case identifier (VSNR)';
  return 'Case identifier (contract no.)';
}

const toDate = (v: string | Date | null | undefined): Date | null => {
  if (!v) return null;
  const d =
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? new Date(`${v}T12:00:00`)
      : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "21 Sep 2026" (fixed three-letter months; en-GB would print "Sept"). */
export function fmtDay(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d
    ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    : '—';
}

/** "22 Sep 2026, 09:12" */
export function fmtDayTime(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return '—';
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fmtDay(d)}, ${time}`;
}

/** "24.09.2026" */
export function fmtDotted(v: string | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Parses "DD.MM.YYYY" (also D.M.YYYY) into "YYYY-MM-DD"; null when the
 * text is not a real calendar date.
 */
export function parseDotted(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

/** Copies text; falls back to a hidden textarea where the API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function apiError(error: unknown, fallback: string): string {
  const e = error as {
    response?: { data?: { error?: string; issues?: { message: string }[] } };
    message?: string;
  };
  return (
    e?.response?.data?.issues?.[0]?.message ??
    e?.response?.data?.error ??
    e?.message ??
    fallback
  );
}
