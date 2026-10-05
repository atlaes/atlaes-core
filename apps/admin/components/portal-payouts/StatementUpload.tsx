'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PortalColumn, fmtDay, fmtDayTime } from '@/components/portal/ui';
import {
  apiError,
  getLastUpload,
  getReconciliation,
  getStatement,
  importStatement,
  money,
  previewStatement,
  suggestCase,
  type ColumnMap,
  type ReconciliationLine,
  type StatementLine,
  type StatementPreview,
  type StatementResult,
} from './api';
import { PageHead, SmallChip } from './bits';

/**
 * 07 · Statement upload (Figma 1036:5253). The firm uploads its escrow
 * account export; each credit is matched by VSNR/name in the payment
 * reference (E1). The export's column layout is not fixed yet, so a
 * column picker confirms the mapping per upload; the last mapping is
 * remembered server-side per firm.
 */

const ACCEPT =
  '.xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

const FIELDS: { key: keyof ColumnMap; label: string; optional?: boolean }[] = [
  { key: 'valueDate', label: 'Value date' },
  { key: 'amount', label: 'Amount (€)' },
  { key: 'reference', label: 'Payment reference' },
  { key: 'payer', label: 'Payer', optional: true },
];

const pad2 = (n: number) => String(n).padStart(2, '0');

function DropZone({
  onFile,
  disabled,
  lastLine,
}: {
  onFile: (f: File) => void;
  disabled: boolean;
  lastLine: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !disabled) onFile(f);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`relative flex w-full flex-col items-center gap-2.5 rounded-[20px] px-10 py-12 text-center ${
        over ? 'bg-[#e7eef9]' : 'bg-[#f1f1f1]'
      }`}
    >
      {/* Figma: 1.5px #5e8cd9 border, dash 8/6, radius 20 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <rect
          x="0.75"
          y="0.75"
          style={{ width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)' }}
          rx="20"
          fill="none"
          stroke="#5e8cd9"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
      </svg>
      <span className="flex h-[52px] w-11 items-center justify-center rounded-lg border border-[#c6c6c6] bg-white">
        <span className="text-[9px] font-bold leading-none text-[#1f5f31]">
          XLSX
        </span>
      </span>
      <p className="text-[18px] font-bold leading-[1.3] text-[#181818]">
        Drop the Excel account statement here
      </p>
      <p className="text-[14px] leading-[1.5] text-[#8c8c8c]">
        or browse your files · .xlsx or .csv · one statement per upload
      </p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="inline-flex h-11 items-center rounded-full border border-[#002691] bg-white px-[22px] text-[14px] font-bold leading-[1.4] text-[#002691] hover:bg-[#f3f6fc] disabled:border-[#c6c6c6] disabled:text-[#8c8c8c]"
      >
        Choose file
      </button>
      {lastLine && (
        <p className="text-[12px] leading-[1.5] text-[#8c8c8c]">{lastLine}</p>
      )}
    </div>
  );
}

function ColumnPicker({
  file,
  preview,
  onImport,
  onCancel,
  busy,
  error,
}: {
  file: File;
  preview: StatementPreview;
  onImport: (m: ColumnMap) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const initial = { ...preview.suggestedMap };
  const [map, setMap] = useState<Partial<ColumnMap>>(initial);
  const complete = !!(map.valueDate && map.amount && map.reference);
  const remembered =
    !!preview.lastMap &&
    FIELDS.every(
      (f) => (preview.lastMap?.[f.key] ?? null) === (map[f.key] ?? null)
    );
  const colIdx = (label: string | null | undefined) =>
    label ? preview.headers.indexOf(label) : -1;

  return (
    <section className="flex w-full flex-col gap-5 rounded-[20px] border border-[#c6c6c6] bg-white p-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
          Columns — {file.name}
        </h2>
        <p className="text-[13px] leading-[1.5] text-[#4b4f58]">
          {remembered
            ? 'Same columns as the last upload. Check and import.'
            : 'Choose which column holds each field. The choice is remembered for the next upload.'}
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase leading-[1.4] tracking-[0.04em] text-[#8c8c8c]">
              {f.label}
              {f.optional ? ' (optional)' : ''}
            </span>
            <select
              value={map[f.key] ?? ''}
              onChange={(e) =>
                setMap((m) => ({
                  ...m,
                  [f.key]: e.target.value || (f.optional ? null : undefined),
                }))
              }
              className="h-11 w-full rounded-[10px] border border-[#c6c6c6] bg-white px-3 text-[13px] text-[#181818] focus:border-[#002691] focus:outline-none focus:ring-1 focus:ring-[#002691]"
            >
              <option value="">
                {f.optional ? '— none —' : 'Choose a column'}
              </option>
              {preview.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {preview.sampleRows.length > 0 && (
        <div className="w-full overflow-x-auto rounded-xl border border-[#c6c6c6]">
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-[#f1f1f1]">
              <tr>
                {FIELDS.map((f) => (
                  <th
                    key={f.key}
                    className="px-4 py-2.5 text-[11px] font-semibold uppercase leading-[1.4] tracking-[0.04em] text-[#8c8c8c]"
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((r, i) => (
                <tr key={i} className="border-t border-[#f1f1f1]">
                  {FIELDS.map((f) => {
                    const idx = colIdx(map[f.key]);
                    return (
                      <td
                        key={f.key}
                        className="px-4 py-2 text-[13px] leading-[1.4] text-[#181818]"
                      >
                        {idx >= 0 ? r[idx] || '—' : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <p className="text-[13px] leading-[1.5] text-[#b42318]">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!complete || busy}
          onClick={() =>
            onImport({
              valueDate: map.valueDate!,
              amount: map.amount!,
              reference: map.reference!,
              payer: map.payer ?? null,
            })
          }
          className="inline-flex h-11 items-center rounded-full bg-[#002691] px-5 text-[14px] font-bold leading-[1.4] text-white hover:bg-[#001d70] disabled:bg-[#f1f1f1] disabled:text-[#8c8c8c]"
        >
          {busy ? 'Importing…' : 'Import statement'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="text-[14px] font-semibold leading-[1.4] text-[#002691] hover:underline"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function resultChip(l: StatementLine) {
  if (l.status === 'matched' || l.status === 'assigned')
    return <SmallChip tone="green">Matched · E1</SmallChip>;
  if (l.status === 'unmatched')
    return <SmallChip tone="warn">Unmatched</SmallChip>;
  if (l.status === 'duplicate')
    return <SmallChip tone="gray">Already imported</SmallChip>;
  if (l.status === 'dismissed')
    return <SmallChip tone="gray">Dismissed</SmallChip>;
  return <SmallChip tone="gray">Not readable</SmallChip>;
}

function matchedCaseText(l: StatementLine): string {
  if (l.matchedCase) {
    return [l.matchedCase.name, l.matchedCase.vsnr].filter(Boolean).join(' · ');
  }
  if (l.status === 'duplicate') return '— imported from an earlier statement';
  if (l.status === 'invalid') return '— no amount or value date';
  return `— ${l.matchReasonText ?? 'no VSNR or name in reference'}`;
}

function ResultCard({ result }: { result: StatementResult }) {
  const shown = result.lines.filter((l) => l.status !== 'debit');
  return (
    <section className="flex w-full flex-col gap-5 rounded-[20px] border border-[#c6c6c6] bg-white p-7">
      <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
        Result — {result.fileName}
      </h2>
      <div className="flex flex-wrap gap-3">
        <SmallChip tone="green" size={12}>
          {result.matchedCount} matched
        </SmallChip>
        <SmallChip tone="warn" size={12}>
          {result.unmatchedCount} unmatched
        </SmallChip>
        <SmallChip tone="blue" size={12}>
          Total matched €{money(result.matchedTotal)}
        </SmallChip>
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-[#c6c6c6]">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[50px_78px_110px_300px_220px_124px] gap-x-2 bg-[#f1f1f1] px-4 py-2.5">
            {[
              'Line',
              'Value date',
              'Amount (€)',
              'Payment reference',
              'Matched case',
              'Result',
            ].map((h) => (
              <span
                key={h}
                className="text-[11px] font-semibold uppercase leading-[1.4] tracking-[0.04em] text-[#8c8c8c]"
              >
                {h}
              </span>
            ))}
          </div>
          {shown.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-[#8c8c8c]">
              No incoming payments in this statement.
            </p>
          )}
          {shown.map((l, i) => (
            <div
              key={l.id}
              className={`grid grid-cols-[50px_78px_110px_300px_220px_124px] items-center gap-x-2 bg-white px-4 py-3 ${
                i > 0 ? 'border-t border-[#f1f1f1]' : ''
              }`}
            >
              <span className="text-[13px] leading-[1.4] text-[#8c8c8c]">
                {pad2(l.lineNo)}
              </span>
              <span className="whitespace-nowrap text-[13px] leading-[1.4] text-[#181818]">
                {l.valueDate ? fmtDay(l.valueDate) : '—'}
              </span>
              <span className="text-[13px] font-semibold leading-[1.4] text-[#181818]">
                {l.amount != null ? money(l.amount) : '—'}
              </span>
              <span className="break-words text-[13px] leading-[1.4] text-[#181818]">
                {l.reference || '—'}
              </span>
              <span className="break-words text-[13px] leading-[1.4] text-[#181818]">
                {matchedCaseText(l)}
              </span>
              <span>{resultChip(l)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[13px] leading-[1.5] text-[#8c8c8c]">
        Matched lines create the event E1 “Funds received” on the case: fee,
        invoice and the client’s release step start automatically. The OCR
        amount on a Bescheid is informational only; the statement amount is
        authoritative.
      </p>
    </section>
  );
}

function reconciliationText(l: ReconciliationLine): string {
  if (l.resolutionNote) return l.resolutionNote;
  const tail =
    'Forwarded to the ATLAES reconciliation queue; the amount stays unassigned until ATLAES matches it to a case.';
  if (l.matchReason === 'name_only')
    return `Client name found, but no VSNR in the payment reference. ${tail}`;
  if (l.matchReason === 'ambiguous')
    return `More than one case fits the payment reference. ${tail}`;
  return `No VSNR or client name found in the payment reference. ${tail}`;
}

function ReconciliationItem({ line }: { line: ReconciliationLine }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => suggestCase(line.id, note.trim()),
    onSuccess: () => {
      setOpen(false);
      setNote('');
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
    },
  });
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl bg-white px-5 py-4">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#181818]">
            Line {pad2(line.lineNo)} ·{' '}
            {line.valueDate ? fmtDay(line.valueDate) : '—'}
            {line.amount != null ? ` · €${money(line.amount)}` : ''} · reference
            “{line.reference}”
          </p>
          <p className="text-[13px] leading-[1.5] text-[#4b4f58]">
            {reconciliationText(line)}
          </p>
          {line.firmSuggestion && (
            <p className="text-[13px] leading-[1.5] text-[#1f5f31]">
              Your suggestion: {line.firmSuggestion}
            </p>
          )}
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 shrink-0 items-center self-start rounded-full border border-[#002691] bg-white px-[18px] text-[13px] font-bold leading-[1.4] text-[#002691] hover:bg-[#f3f6fc] sm:self-center"
          >
            Suggest a case
          </button>
        )}
      </div>
      {open && (
        <div className="flex w-full flex-col gap-2">
          <label
            htmlFor={`sugg-${line.id}`}
            className="text-[13px] font-semibold text-[#181818]"
          >
            Which case is it? (client name, Aktenzeichen)
          </label>
          <textarea
            id={`sugg-${line.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full rounded-[10px] border border-[#c6c6c6] px-3 py-2 text-[13px] text-[#181818] focus:border-[#002691] focus:outline-none focus:ring-1 focus:ring-[#002691]"
          />
          {m.isError && (
            <p className="text-[12px] text-[#b42318]">
              {apiError(m.error, 'Could not send')}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!note.trim() || m.isPending}
              onClick={() => m.mutate()}
              className="inline-flex h-10 items-center rounded-full bg-[#002691] px-[18px] text-[13px] font-bold text-white disabled:bg-[#f1f1f1] disabled:text-[#8c8c8c]"
            >
              Send to ATLAES
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[13px] font-semibold text-[#002691] hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReconciliationCard({ lines }: { lines: ReconciliationLine[] }) {
  return (
    <section className="flex w-full flex-col gap-5 rounded-[20px] bg-[#fbefc7] p-7">
      <h2 className="text-[18px] font-bold leading-[1.3] text-[#181818]">
        Reconciliation queue
      </h2>
      {lines.map((l) => (
        <ReconciliationItem key={l.id} line={l} />
      ))}
      <p className="text-[13px] leading-[1.5] text-[#6b4d00]">
        Unmatched receipts → ATLAES reconciliation queue. The law firm does not
        assign receipts; ATLAES resolves them and the case then receives its E1
        event.
      </p>
    </section>
  );
}

export function StatementUpload() {
  const qc = useQueryClient();
  const last = useQuery({
    queryKey: ['statement-last'],
    queryFn: getLastUpload,
  });
  const recon = useQuery({
    queryKey: ['reconciliation'],
    queryFn: getReconciliation,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [result, setResult] = useState<StatementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastResult = useQuery({
    queryKey: ['statement', last.data?.importId],
    queryFn: () => getStatement(last.data!.importId),
    enabled: !!last.data?.importId && !result,
  });
  useEffect(() => {
    if (!result && lastResult.data) setResult(lastResult.data);
  }, [lastResult.data, result]);

  const previewM = useMutation({
    mutationFn: (f: File) => previewStatement(f),
    onSuccess: (p) => setPreview(p),
    onError: (e) => {
      setError(apiError(e, 'The file could not be read.'));
      setFile(null);
    },
  });
  const importM = useMutation({
    mutationFn: (m: ColumnMap) => importStatement(file!, m),
    onSuccess: (r) => {
      setResult(r);
      setFile(null);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['statement-last'] });
      qc.invalidateQueries({ queryKey: ['reconciliation'] });
      qc.invalidateQueries({ queryKey: ['payout-queue'] });
    },
  });

  const lastLine = last.data
    ? `Last upload: ${last.data.fileName} · ${fmtDayTime(last.data.createdAt)}${
        last.data.uploadedBy ? ` · by ${last.data.uploadedBy}` : ''
      }`
    : null;

  return (
    <PortalColumn>
      <PageHead eyebrow="Incoming funds" title="Account statement upload" wide>
        Upload the Excel export of the escrow account (today twice a week).
        Amount and value date from the statement are the authoritative figures
        for everything downstream; each receipt is matched to the case by
        VSNR/name in the payment reference. Unmatched receipts go to the ATLAES
        reconciliation queue.
      </PageHead>

      <DropZone
        disabled={previewM.isPending || importM.isPending}
        lastLine={lastLine}
        onFile={(f) => {
          setError(null);
          importM.reset();
          setFile(f);
          setPreview(null);
          previewM.mutate(f);
        }}
      />
      {error && <p className="-mt-4 text-[13px] text-[#b42318]">{error}</p>}
      {previewM.isPending && (
        <p className="-mt-4 text-[13px] text-[#8c8c8c]">
          Reading {file?.name}…
        </p>
      )}

      {file && preview && (
        <ColumnPicker
          file={file}
          preview={preview}
          busy={importM.isPending}
          error={
            importM.isError
              ? apiError(importM.error, 'The import failed.')
              : null
          }
          onImport={(m) => importM.mutate(m)}
          onCancel={() => {
            setFile(null);
            setPreview(null);
          }}
        />
      )}

      {result && !preview && <ResultCard result={result} />}

      {recon.data && recon.data.length > 0 && (
        <ReconciliationCard lines={recon.data} />
      )}
    </PortalColumn>
  );
}
