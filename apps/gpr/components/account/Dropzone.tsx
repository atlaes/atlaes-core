'use client';

import React, { useCallback, useRef, useState } from 'react';
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
          'acc-drop' +
          (dragging ? ' acc-drop-active' : '') +
          (disabled ? ' acc-drop-disabled' : '')
        }
      >
        <p className="acc-drop-title">{label}</p>
        <p className="acc-drop-hint">
          PDF, JPG or PNG · up to {MAX_MB}MB{multiple ? ' each' : ''}
        </p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPT}
          multiple={multiple}
          disabled={disabled}
          className="acc-sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="acc-error" style={{ marginTop: 8 }}>
          {error}
        </p>
      ) : null}

      {files.length ? (
        <ul className="acc-files">
          {files.map((f, i) => (
            <li key={f.name + i} className="acc-file">
              <span className="acc-row-icon" aria-hidden="true">
                {fileBadge(f.name)}
              </span>
              <span className="acc-file-box">
                <span className="acc-file-name">{f.name}</span>
                <span className="acc-file-size">{formatFileSize(f.size)}</span>
              </span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="acc-file-remove"
                  aria-label={'Remove ' + f.name}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** "PDF" / "JPG" / "PNG" badge text for a file row. */
export function fileBadge(name: string): string {
  const ext = (name.split('.').pop() || '').toUpperCase();
  if (ext === 'JPEG') return 'JPG';
  return ext && ext.length <= 4 ? ext : 'FILE';
}
