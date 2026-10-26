'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignLetter,
  completeLetter,
  dismissLetter,
  getLetterFile,
  getLetters,
  MATCH_REASON_LABELS,
  NEXT_STEP_LABELS,
  searchLetterCases,
  type AdminLetter,
  type CaseRef,
} from '@/lib/letters-api';
import { LETTER_TYPE_LABELS } from '@/components/portal-letters/api';
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  PageHeader,
  Pill,
  Spinner,
  StatusDot,
  formatBytes,
  formatDate,
  inputClass,
  type Tone,
} from '@/components/ui';

/**
 * Return channel — "needs attention" (owner answer 6). Letters law firms
 * uploaded that wait for a human: unmatched ones (file them to a case or
 * dismiss) and filed ones whose next step ATLAES has not released yet.
 * Nothing on the case moves until someone acts here.
 */

const TYPE_TONE: Record<AdminLetter['letterType'], Tone> = {
  refund_decision: 'good',
  document_request: 'wait',
  rejection: 'bad',
  other: 'neutral',
};

const caseLabel = (c: CaseRef) =>
  [c.name ?? 'Unnamed case', c.lawFirmRef ? `AZ ${c.lawFirmRef}` : null, c.vsnr]
    .filter(Boolean)
    .join(' · ');

const todayIso = () => new Date().toISOString().slice(0, 10);

function stateOf(l: AdminLetter): { tone: Tone; text: string } {
  if (l.status === 'dismissed') return { tone: 'neutral', text: 'Dismissed' };
  if (l.status === 'needs_review')
    return { tone: 'wait', text: 'Needs a case' };
  if (l.nextStepStatus === 'pending')
    return { tone: 'info', text: 'Filed · next step open' };
  return {
    tone: 'good',
    text: l.nextStepAction ? NEXT_STEP_LABELS[l.nextStepAction] : 'Done',
  };
}

export default function LettersPage() {
  const [view, setView] = useState<'attention' | 'handled'>('attention');
  const letters = useQuery({
    queryKey: ['admin-letters', view],
    queryFn: () => getLetters(view),
  });

  return (
    <div>
      <PageHeader
        title="DRV letters"
        subtitle="Letters partner firms uploaded via the return channel. Unmatched letters need a case; filed letters wait until you release the next step. Nothing happens on a case automatically."
      />
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(['attention', 'handled'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              view === v
                ? 'border-brand-dark font-medium text-brand-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {v === 'attention' ? 'Needs attention' : 'Handled'}
            {v === 'attention' && view === 'attention' && letters.data
              ? ` (${letters.data.length})`
              : ''}
          </button>
        ))}
      </div>
      {letters.isLoading && <Spinner />}
      {letters.isError && (
        <ErrorText error={letters.error} fallback="Could not load letters" />
      )}
      {letters.data && letters.data.length === 0 && (
        <EmptyState
          title={
            view === 'attention'
              ? 'No letters waiting'
              : 'No handled letters yet'
          }
          hint="Firms upload DRV letters under Letter upload in the partner portal."
        />
      )}
      <div className="space-y-3">
        {letters.data?.map((l) => (
          <LetterCard key={l.id} letter={l} />
        ))}
      </div>
    </div>
  );
}

function LetterCard({ letter: l }: { letter: AdminLetter }) {
  const [open, setOpen] = useState(false);
  const s = stateOf(l);
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-gray-900">
            {l.fileName}
          </p>
          <p className="mt-0.5 break-words text-xs text-gray-500">
            {l.firm.name} · {formatDate(l.createdAt, true)}
            {l.uploadedBy ? ` · ${l.uploadedBy}` : ''}
          </p>
          <p className="mt-0.5 break-words text-xs text-gray-600">
            {l.case
              ? caseLabel(l.case)
              : (MATCH_REASON_LABELS[l.matchReason] ?? l.matchReason)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={TYPE_TONE[l.letterType]}>
            {LETTER_TYPE_LABELS[l.letterType]}
          </Pill>
          <StatusDot tone={s.tone}>{s.text}</StatusDot>
        </div>
      </button>
      {open && <LetterDetail letter={l} />}
    </div>
  );
}

function LetterDetail({ letter: l }: { letter: AdminLetter }) {
  const file = useQuery({
    queryKey: ['admin-letter-file', l.id],
    queryFn: () => getLetterFile(l.id),
    staleTime: 4 * 60_000,
  });
  const x = l.extracted;
  return (
    <div className="grid gap-5 border-t border-gray-100 px-4 py-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {file.data?.url ? (
            <a
              href={file.data.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-dark hover:underline"
            >
              Open letter
            </a>
          ) : (
            <span className="text-gray-500">
              {file.isLoading ? 'Loading file…' : 'File preview unavailable'}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {l.fileType} · {formatBytes(l.fileSize)}
          </span>
        </div>
        {file.data?.url && l.fileType === 'application/pdf' && (
          <iframe
            src={file.data.url}
            title={l.fileName}
            className="hidden h-[480px] w-full rounded border border-gray-200 lg:block"
          />
        )}
        {file.data?.url && l.fileType !== 'application/pdf' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.data.url}
            alt={l.fileName}
            className="max-h-[480px] w-full rounded border border-gray-200 object-contain"
          />
        )}
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-gray-500">VSNR</dt>
          <dd className="break-words">{x?.vsnr.join(', ') || '—'}</dd>
          <dt className="text-gray-500">Aktenzeichen</dt>
          <dd className="break-words">{x?.az.join(', ') || '—'}</dd>
          <dt className="text-gray-500">Name</dt>
          <dd className="break-words">{x?.name || '—'}</dd>
          <dt className="text-gray-500">Letter date</dt>
          <dd>{x?.letterDate ? formatDate(x.letterDate) : '—'}</dd>
          <dt className="text-gray-500">Matched by</dt>
          <dd>
            {l.matchMethod
              ? l.matchMethod === 'admin'
                ? 'ATLAES'
                : MATCH_REASON_LABELS[l.matchMethod]
              : '—'}
          </dd>
        </dl>
        {l.ocrError && (
          <p className="text-sm text-red-700">OCR: {l.ocrError}</p>
        )}
        {l.ocrText && (
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600">
              Recognised text
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-xs text-gray-700">
              {l.ocrText}
            </pre>
          </details>
        )}
      </div>
      <div className="min-w-0 space-y-5">
        <CaseSection letter={l} />
        {l.case && l.nextStepStatus === 'pending' && <NextStep letter={l} />}
        {l.nextStepStatus === 'done' && (
          <p className="text-sm text-gray-600">
            {l.nextStepAction ? NEXT_STEP_LABELS[l.nextStepAction] : 'Done'}{' '}
            {l.handledBy ? `by ${l.handledBy} ` : ''}
            {formatDate(l.handledAt, true)}
            {l.handledNote ? ` — ${l.handledNote}` : ''}
          </p>
        )}
        {l.status === 'dismissed' && (
          <p className="text-sm text-gray-600">
            Dismissed {l.handledBy ? `by ${l.handledBy} ` : ''}
            {formatDate(l.handledAt, true)} — {l.handledNote}
          </p>
        )}
      </div>
    </div>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['admin-letters'] });
    qc.invalidateQueries({ queryKey: ['admin-letter-count'] });
  };
}

function CaseSection({ letter: l }: { letter: AdminLetter }) {
  const refresh = useRefresh();
  const [changing, setChanging] = useState(!l.case);
  const [q, setQ] = useState('');
  const [dismissNote, setDismissNote] = useState('');
  const search = useQuery({
    queryKey: ['admin-letter-cases', l.id, q],
    queryFn: () => searchLetterCases(l.id, q),
    enabled: q.trim().length >= 2,
  });
  const assign = useMutation({
    mutationFn: (claimId: string) => assignLetter(l.id, claimId),
    onSuccess: () => {
      setChanging(false);
      refresh();
    },
  });
  const dismiss = useMutation({
    mutationFn: () => dismissLetter(l.id, dismissNote.trim()),
    onSuccess: refresh,
  });
  const editable = l.status !== 'dismissed' && l.nextStepStatus !== 'done';

  const pick = (c: CaseRef) => (
    <li
      key={c.claimId}
      className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="break-words text-sm text-gray-800">{caseLabel(c)}</span>
      <Button
        size="sm"
        variant="primary"
        disabled={assign.isPending}
        onClick={() => assign.mutate(c.claimId)}
      >
        File to this case
      </Button>
    </li>
  );

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Case
      </h3>
      {l.case ? (
        <p className="text-sm">
          <Link
            href={`/claims/${l.case.claimId}`}
            className="font-medium text-brand-dark hover:underline"
          >
            {caseLabel(l.case)}
          </Link>
        </p>
      ) : (
        <p className="text-sm text-gray-600">
          {MATCH_REASON_LABELS[l.matchReason] ?? l.matchReason}
        </p>
      )}
      {editable && l.case && !changing && (
        <Button size="sm" onClick={() => setChanging(true)}>
          Wrong case? Change
        </Button>
      )}
      {editable && changing && (
        <div className="space-y-2">
          {l.candidates.length > 0 && (
            <div>
              <p className="text-xs text-gray-500">Suggested</p>
              <ul className="divide-y divide-gray-100">
                {l.candidates
                  .filter((c) => c.claimId !== l.case?.claimId)
                  .map(pick)}
              </ul>
            </div>
          )}
          <Field label={`Search ${l.firm.name}'s cases`} htmlFor={`q-${l.id}`}>
            <input
              id={`q-${l.id}`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, VSNR or Aktenzeichen"
              className={inputClass}
            />
          </Field>
          {search.data && (
            <ul className="divide-y divide-gray-100">
              {search.data.length === 0 && (
                <li className="py-2 text-sm text-gray-500">No case found.</li>
              )}
              {search.data
                .filter((c) => c.claimId !== l.case?.claimId)
                .map(pick)}
            </ul>
          )}
          {assign.isError && (
            <ErrorText error={assign.error} fallback="Could not file" />
          )}
          {l.case && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setChanging(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
      {!l.case && l.status === 'needs_review' && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <Field
            label="Not a case letter? Dismiss with a note"
            htmlFor={`dismiss-${l.id}`}
          >
            <input
              id={`dismiss-${l.id}`}
              value={dismissNote}
              onChange={(e) => setDismissNote(e.target.value)}
              placeholder="e.g. general notice, blank scan"
              className={inputClass}
            />
          </Field>
          <Button
            size="sm"
            variant="danger"
            disabled={!dismissNote.trim() || dismiss.isPending}
            onClick={() => dismiss.mutate()}
          >
            Dismiss
          </Button>
          {dismiss.isError && (
            <ErrorText error={dismiss.error} fallback="Could not dismiss" />
          )}
        </div>
      )}
    </section>
  );
}

function NextStep({ letter: l }: { letter: AdminLetter }) {
  const refresh = useRefresh();
  const preferred =
    l.letterType === 'refund_decision'
      ? 'record_decision'
      : l.letterType === 'document_request'
        ? 'notify_client'
        : 'mark_handled';
  const [action, setAction] = useState<
    'record_decision' | 'notify_client' | 'mark_handled'
  >(preferred);
  const [receivedAt, setReceivedAt] = useState(l.createdAt.slice(0, 10));
  const [customerAction, setCustomerAction] = useState('');
  const [due, setDue] = useState('');
  const [source, setSource] = useState<'customer' | 'file'>('customer');
  const [note, setNote] = useState('');

  const complete = useMutation({
    mutationFn: () =>
      completeLetter(
        l.id,
        action === 'record_decision'
          ? { action, receivedAt, note: note.trim() || null }
          : action === 'notify_client'
            ? {
                action,
                customerAction: customerAction.trim(),
                customerActionDue: due || null,
                infoRequestSource: source,
                note: note.trim() || null,
              }
            : { action, note: note.trim() }
      ),
    onSuccess: refresh,
  });
  const ready =
    action === 'record_decision'
      ? !!receivedAt
      : action === 'notify_client'
        ? !!customerAction.trim()
        : !!note.trim();

  const options = [
    ['record_decision', 'Record decision'],
    ['notify_client', 'Notify client'],
    ['mark_handled', 'Mark handled'],
  ] as const;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Next step
      </h3>
      <div className="flex flex-wrap gap-2">
        {options.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAction(key)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              action === key
                ? 'border-brand-dark bg-brand-light font-medium text-brand-dark'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {action === 'record_decision' && (
        <>
          <p className="text-sm text-gray-600">
            Records this Bescheid on the case (objection deadline and client
            review run from the date the firm received it) and starts the payout
            flow.
          </p>
          <Field label="Received by the firm on" htmlFor={`rec-${l.id}`}>
            <input
              id={`rec-${l.id}`}
              type="date"
              max={todayIso()}
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className={inputClass}
            />
          </Field>
        </>
      )}
      {action === 'notify_client' && (
        <>
          <p className="text-sm text-gray-600">
            Logs the DRV request on the client-update case and drafts the update
            (E2A when the client must act, E2B when we answer from the file).
            You still review and send it on the claim page.
          </p>
          <Field label="What the DRV asks for" htmlFor={`ca-${l.id}`}>
            <textarea
              id={`ca-${l.id}`}
              rows={2}
              value={customerAction}
              onChange={(e) => setCustomerAction(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Due" htmlFor={`due-${l.id}`}>
              <input
                id={`due-${l.id}`}
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Who answers" htmlFor={`src-${l.id}`}>
              <select
                id={`src-${l.id}`}
                value={source}
                onChange={(e) =>
                  setSource(e.target.value as 'customer' | 'file')
                }
                className={inputClass}
              >
                <option value="customer">The client (E2A)</option>
                <option value="file">We answer from the file (E2B)</option>
              </select>
            </Field>
          </div>
        </>
      )}
      <Field
        label={action === 'mark_handled' ? 'Note (required)' : 'Note'}
        htmlFor={`note-${l.id}`}
      >
        <input
          id={`note-${l.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Button
        variant="primary"
        disabled={!ready || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {complete.isPending
          ? 'Working…'
          : options.find(([k]) => k === action)![1]}
      </Button>
      {complete.isError && (
        <ErrorText error={complete.error} fallback="Could not complete" />
      )}
    </section>
  );
}
