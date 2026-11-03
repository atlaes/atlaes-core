'use client';

import { useRef, useState } from 'react';
import { Bold, Link2, Upload } from 'lucide-react';
import { uploadBlogImage, toBlogApiError } from '@/lib/blog-api';
import {
  Button,
  Pill,
  formatDate,
  inputClass,
  type Tone,
} from '@/components/ui';

// ------------------------------------------------------------------ status

export function PostStatusPill({
  status,
  publishedAt,
  scheduled,
}: {
  status: string;
  publishedAt: string | null;
  scheduled: boolean;
}) {
  if (status !== 'published') return <Pill tone="neutral">Draft</Pill>;
  if (scheduled)
    return (
      <span title={`Goes live ${formatDate(publishedAt, true)}`}>
        <Pill tone="wait">Scheduled</Pill>
      </span>
    );
  return <Pill tone="good">Published</Pill>;
}

export function scoreTone(score: number): Tone {
  if (score >= 80) return 'good';
  if (score >= 50) return 'wait';
  return 'bad';
}

const SCORE_TEXT: Record<string, string> = {
  good: 'text-emerald-700',
  wait: 'text-amber-700',
  bad: 'text-red-700',
};

export function ScoreBadge({
  score,
  errors,
}: {
  score: number;
  errors: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span
        className={`font-semibold tabular-nums ${SCORE_TEXT[scoreTone(score)]}`}
      >
        {score}
      </span>
      {errors > 0 && (
        <span className="text-xs text-red-700">
          {errors} error{errors === 1 ? '' : 's'}
        </span>
      )}
    </span>
  );
}

// ------------------------------------------------------ inline-syntax area

/** Wrap the textarea's selection; returns the new value and selection. */
function wrapSelection(
  el: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const selected = value.slice(s, e) || placeholder;
  const next = value.slice(0, s) + before + selected + after + value.slice(e);
  return {
    next,
    start: s + before.length,
    end: s + before.length + selected.length,
  };
}

/**
 * Textarea for the inline syntax (`**bold**`, `[label](href)`), with Bold
 * and Link buttons that wrap the selection.
 */
export function InlineTextArea({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  toolbar = true,
  className = '',
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  toolbar?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply = (before: string, after: string, placeholder: string) => {
    const el = ref.current;
    if (!el) return;
    const r = wrapSelection(el, before, after, placeholder);
    onChange(r.next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  };

  const link = () => {
    const href = window.prompt('Link URL (https://… or /path on the site)');
    if (!href || !href.trim()) return;
    apply('[', `](${href.trim()})`, 'link text');
  };

  return (
    <div className={className}>
      {toolbar && (
        <div className="mb-1 flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => apply('**', '**', 'bold text')}
            title="Bold (**text**)"
          >
            <Bold className="h-3.5 w-3.5" />
            Bold
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={link}
            title="Link ([label](href))"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link
          </Button>
        </div>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y`}
      />
    </div>
  );
}

export const INLINE_HINT =
  'Formatting: **bold** and [link text](https://… or /path). Nothing else is rendered.';

// --------------------------------------------------------------- image URL

/** URL input + upload button (POST /admin/blog/images) + thumbnail. */
export function ImageUrlInput({
  id,
  value,
  onChange,
  alt,
}: {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  alt?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('The image is larger than 5 MB.');
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadBlogImage(file));
    } catch (e) {
      setError(toBlogApiError(e, 'Upload failed').message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={alt || ''}
          className="h-16 w-24 flex-none rounded border border-gray-200 bg-gray-50 object-cover"
        />
      ) : (
        <div className="flex h-16 w-24 flex-none items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
          No image
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload"
          className={inputClass}
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange('')}
            >
              Remove
            </Button>
          )}
          <span className="text-xs text-gray-400">
            JPG, PNG, WebP, GIF or AVIF, up to 5 MB
          </span>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) upload(f);
          }}
        />
      </div>
    </div>
  );
}

/** Character counter coloured against a recommended range. */
export function CharCount({
  value,
  min,
  max,
}: {
  value: string;
  min: number;
  max: number;
}) {
  const n = value.trim().length;
  const ok = n >= min && n <= max;
  return (
    <span
      className={`text-xs tabular-nums ${
        n === 0 ? 'text-gray-400' : ok ? 'text-emerald-700' : 'text-amber-700'
      }`}
    >
      {n} / {min}–{max}
    </span>
  );
}
