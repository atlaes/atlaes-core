'use client';

import { useEffect, useRef } from 'react';

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ');

/**
 * Six single-digit boxes (Figma 01 "Code": 52×60, radius 10, 22px bold,
 * 10px gap; focused box 2px navy). Typing advances, Backspace goes back,
 * pasting "123456" or "123 456" fills all boxes, and the first box
 * carries autocomplete="one-time-code".
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
  label = 'Six-digit code',
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus && !disabled) refs.current[Math.min(value.length, 5)]?.focus();
    // Focus once when enabled; later focus follows typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  const commit = (next: string) => {
    const trimmed = next.slice(0, 6);
    onChange(trimmed);
    refs.current[Math.min(trimmed.length, 5)]?.focus();
    if (trimmed.length === 6) onComplete?.(trimmed);
  };

  /** One typed digit replaces box i; several (paste, autofill) fill from i. */
  const setFrom = (index: number, incoming: string) => {
    const clean = incoming.replace(/\D/g, '');
    if (!clean) return;
    const at = Math.min(index, value.length);
    if (clean.length === 1) {
      commit(value.slice(0, at) + clean + value.slice(at + 1));
      if (at < 5) refs.current[at + 1]?.focus();
    } else {
      commit(value.slice(0, at) + clean);
    }
  };

  return (
    <div role="group" aria-label={label} className="flex gap-[6px] sm:gap-[10px]">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={i === 0 ? 6 : 1}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === '') {
              onChange(value.slice(0, i) + value.slice(i + 1));
              return;
            }
            // Box keeps its old digit when the caret was not on it.
            setFrom(i, digit && v.length === 2 ? v.replace(digit, '') : v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digit && i > 0) {
              e.preventDefault();
              onChange(value.slice(0, i - 1));
              refs.current[i - 1]?.focus();
            } else if (e.key === 'ArrowLeft' && i > 0) {
              refs.current[i - 1]?.focus();
            } else if (e.key === 'ArrowRight' && i < 5) {
              refs.current[i + 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            setFrom(i, e.clipboardData.getData('text'));
          }}
          className={cx(
            'h-[60px] w-[44px] rounded-[10px] border bg-white text-center text-[22px] font-bold leading-none text-[#181818] outline-none sm:w-[52px]',
            'focus:border-2 focus:border-[#002691]',
            invalid ? 'border-[#b42318]' : 'border-[#c6c6c6]',
            disabled && 'cursor-not-allowed bg-[#f1f1f1] text-[#8c8c8c]'
          )}
        />
      ))}
    </div>
  );
}
