'use client';

import { useState, type ReactNode } from 'react';
import { CopyIcon, copyText } from '@/components/portal/ui';

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ');

/** Figma page header: eyebrow · H1 · lead (frames 06/07). */
export function PageHead({
  eyebrow,
  title,
  wide,
  children,
}: {
  eyebrow: string;
  title: string;
  /** Lead spans the column (07) instead of 720px (06). */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cx('flex w-full flex-col gap-2.5', !wide && 'max-w-[720px]')}
    >
      <p className="text-[12px] font-bold uppercase leading-[1.4] tracking-[0.08em] text-[#5e8cd9]">
        {eyebrow}
      </p>
      <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#181818]">
        {title}
      </h1>
      <p className="text-[15px] leading-[1.5] text-[#4b4f58]">{children}</p>
    </div>
  );
}

export type SmallChipTone = 'green' | 'warn' | 'blue' | 'gray';

/** Figma "Chip": pill, padding 4/10; 11px in tables, 12px in summaries. */
export function SmallChip({
  tone,
  size = 11,
  children,
}: {
  tone: SmallChipTone;
  size?: 11 | 12;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 font-semibold leading-[1.4]',
        size === 11 ? 'text-[11px]' : 'text-[12px]',
        tone === 'green' && 'bg-[#dcecdf] text-[#1f5f31]',
        tone === 'warn' && 'bg-[#fbefc7] text-[#6b4d00]',
        tone === 'blue' && 'bg-[#d7e4f6] text-[#002691]',
        tone === 'gray' && 'bg-[#f1f1f1] text-[#4b4f58]'
      )}
    >
      {children}
    </span>
  );
}

/**
 * Table cell with the Figma "Icon / copy": one click copies the value
 * (for the Sparkasse online-banking mask).
 */
export function CopyCell({
  value,
  copy,
  strong,
  label,
}: {
  value: ReactNode;
  copy: string;
  strong?: boolean;
  label: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      aria-label={`Copy ${label}: ${copy}`}
      onClick={async () => {
        if (await copyText(copy)) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        }
      }}
      className="group flex w-full min-w-0 items-start gap-1 rounded-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5e8cd9]"
    >
      <span className="mt-[2.5px] flex size-3 shrink-0 items-center justify-center">
        {done ? (
          <span className="text-[11px] font-bold leading-none text-[#1f5f31]">
            ✓
          </span>
        ) : (
          <CopyIcon className="group-hover:opacity-70" />
        )}
      </span>
      <span
        className={cx(
          'min-w-0 break-words text-[12px] leading-[1.4] text-[#181818]',
          strong && 'font-semibold'
        )}
      >
        {value}
      </span>
      <span aria-live="polite" className="sr-only">
        {done ? 'Copied' : ''}
      </span>
    </button>
  );
}

export const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
