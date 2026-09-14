'use client';

import { useEffect, useState } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';

export interface ViewerDoc {
  title: string;
  subtitle?: string;
  fileType?: string | null;
  /** Resolves a fresh presigned URL; called when the drawer opens. */
  load: () => Promise<{ downloadUrl: string | null }>;
}

/**
 * Slide-over that previews a PDF or image inline next to the record, the
 * way Remote shows an invoice beside its facts. Falls back to a download
 * link when the browser cannot render the type.
 */
export function DocumentViewer({
  doc,
  onClose,
}: {
  doc: ViewerDoc | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) return;
    let alive = true;
    setUrl(null);
    setError(null);
    setLoading(true);
    doc
      .load()
      .then((r) => {
        if (!alive) return;
        if (r.downloadUrl) setUrl(r.downloadUrl);
        else setError('No preview available in this environment.');
      })
      .catch(
        (e: Error) => alive && setError(e.message || 'Could not load the file')
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [doc]);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;
  const isImage = !!doc.fileType && doc.fileType.startsWith('image/');
  const isPdf = doc.fileType === 'application/pdf';

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
    >
      <button
        className="flex-1 bg-black/30"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              {doc.title}
            </p>
            {doc.subtitle && (
              <p className="truncate text-xs text-gray-500">{doc.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            )}
            {url && (
              <a
                href={url}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          )}
          {error && <p className="p-6 text-sm text-gray-600">{error}</p>}
          {url && isPdf && (
            <iframe title={doc.title} src={url} className="h-full w-full" />
          )}
          {url && isImage && (
            <div className="flex min-h-full items-start justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={doc.title}
                className="max-w-full rounded shadow"
              />
            </div>
          )}
          {url && !isPdf && !isImage && (
            <p className="p-6 text-sm text-gray-600">
              This file type cannot be previewed here. Use Download.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
