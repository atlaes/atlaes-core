'use client';

import React, { useCallback, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { formatFileSize } from './format';

const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const ACCEPT_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_MB = 10;

export function validateAccountFile(file: File): string | null {
  if (file.size > MAX_MB * 1024 * 1024) {
    return `${file.name}: file size must be less than ${MAX_MB}MB`;
  }
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const okExt = ACCEPT.split(',').indexOf(ext) >= 0;
  const okMime = ACCEPT_MIME.indexOf(file.type.toLowerCase()) >= 0;
  if (!okExt && !okMime) {
    return `${file.name}: only PDF, JPG or PNG files are accepted`;
  }
  return null;
}

export interface DropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  id?: string;
}

/** PDF/JPG/PNG dropzone (≤ 10MB each), single or multiple. */
export function Dropzone({
  files,
  onChange,
  multiple = false,
  disabled = false,
  label = 'Drag a file here or choose one',
  id = 'account-dropzone',
}: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const incoming: File[] = [];
      for (let i = 0; i < list.length; i++) incoming.push(list[i]);
      const problems: string[] = [];
      const good: File[] = [];
      for (const f of incoming) {
        const problem = validateAccountFile(f);
        if (problem) problems.push(problem);
        else good.push(f);
      }
      setError(problems.length ? problems.join(' ') : null);
      if (!good.length) return;
      onChange(multiple ? files.concat(good) : [good[0]]);
    },
    [files, multiple, onChange]
  );

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        className={
          'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors ' +
          (dragging
            ? 'border-brand-navy bg-brand-tint'
            : 'border-brand-stroke bg-brand-surface/60 hover:border-brand-blue') +
          (disabled ? ' cursor-not-allowed opacity-60' : '')
        }
      >
        <Upload className="mb-2 h-6 w-6 text-brand-navy" aria-hidden />
        <p className="text-sm font-semibold text-brand-ink">{label}</p>
        <p className="mt-1 text-xs text-brand-muted">
          PDF, JPG or PNG · up to {MAX_MB}MB{multiple ? ' each' : ''}
        </p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPT}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {files.length ? (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={f.name + i}
              className="flex items-center gap-3 rounded-xl border border-brand-stroke/60 bg-white px-3 py-2 text-sm"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-brand-navy"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-brand-ink">
                {f.name}
              </span>
              <span className="shrink-0 text-xs text-brand-muted">
                {formatFileSize(f.size)}
              </span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="shrink-0 rounded-full p-1 text-brand-muted hover:bg-brand-surface hover:text-brand-ink"
                  aria-label={'Remove ' + f.name}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
