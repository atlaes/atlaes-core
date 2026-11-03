'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Trash2, Upload } from 'lucide-react';
import {
  confirmDirectPayment,
  generateDirectPack,
  getDirectPackDownloadUrl,
  getDirectSubmission,
  recordDirectDispatch,
  releaseDirectPack,
  removeDirectPackDocument,
  setDirectBenefit,
  uploadDirectPackDocument,
  withdrawDirectRelease,
  type DirectSubmissionState,
  type DispatchMethod,
  type StageBenefit,
} from '@/lib/direct-submission-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';
import type { ViewerDoc } from '@/components/DocumentViewer';

const BRANCH_LABELS: Record<string, string> = {
  germany: 'V0901 11.1 (account in Germany)',
  sepa: 'V0901 11.2 (account in Europe)',
  outside_europe: 'V0901 11.3 (account outside Europe)',
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Claim page: direct client submission of a DRV refund (submission route
 * "Direct client submission") or of a KVBW ZVK / VddB / VddKO refund.
 * Generate the pack for review, release the completed pack for dispatch,
 * record who sent it, how and when (this marks the case submitted), then
 * the client's confirmation of payment. For provider refunds admin also
 * picks the benefit (VddB/VddKO) and uploads the KVBW application form and
 * any extra documents. Renders nothing for other cases (the VBL goes
 * through the lettershop) or the Vividius route.
 */
export function DirectSubmissionCard({
  claimId,
  wrap,
  onPreview,
  onChanged,
}: {
  claimId: string;
  wrap: (body: React.ReactNode) => React.ReactNode;
  onPreview: (doc: ViewerDoc) => void;
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const key = ['admin-direct-submission', claimId];
  const state = useQuery({
    queryKey: key,
    queryFn: () => getDirectSubmission(claimId),
  });
  const [dispatch, setDispatch] = useState<{
    sender: string;
    method: DispatchMethod;
    date: string;
    note: string;
  } | null>(null);
  const [paymentDate, setPaymentDate] = useState('');

  const done = (data: DirectSubmissionState) => {
    queryClient.setQueryData(key, data);
    onChanged?.();
  };
  const generate = useMutation({
    mutationFn: () => generateDirectPack(claimId),
    onSuccess: done,
  });
  const release = useMutation({
    mutationFn: () => releaseDirectPack(claimId),
    onSuccess: done,
  });
  const withdraw = useMutation({
    mutationFn: () => withdrawDirectRelease(claimId),
    onSuccess: done,
  });
  const record = useMutation({
    mutationFn: (input: NonNullable<typeof dispatch>) =>
      recordDirectDispatch(claimId, input),
    onSuccess: (data) => {
      setDispatch(null);
      done(data);
    },
  });
  const payment = useMutation({
    mutationFn: (date: string) => confirmDirectPayment(claimId, { date }),
    onSuccess: (data) => {
      setPaymentDate('');
      done(data);
    },
  });
  const benefit = useMutation({
    mutationFn: (value: StageBenefit | null) =>
      setDirectBenefit(claimId, value),
    onSuccess: done,
  });
  // Uploads return no state; reload it (the pack must then be regenerated).
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: key });
    onChanged?.();
  };
  const upload = useMutation({
    mutationFn: (input: { file: File; role: 'provider_form' | 'bav_extra' }) =>
      uploadDirectPackDocument(claimId, input.file, input.role),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (docId: string) => removeDirectPackDocument(claimId, docId),
    onSuccess: refresh,
  });

  if (state.isLoading) return null;
  if (state.isError || !state.data)
    return wrap(
      <ErrorText
        error={state.error}
        fallback="Could not load the direct submission"
      />
    );
  const s = state.data;
  if (!s.applicable) return null;

  const busy =
    generate.isPending ||
    release.isPending ||
    withdraw.isPending ||
    record.isPending ||
    payment.isPending ||
    benefit.isPending ||
    upload.isPending ||
    remove.isPending;
  const error =
    generate.error ??
    release.error ??
    withdraw.error ??
    record.error ??
    payment.error ??
    benefit.error ??
    upload.error ??
    remove.error;
  const provider = s.kind === 'provider' ? s.provider : null;
  const recipientName = provider?.label ?? 'the DRV';
  // Uploads can change until the pack is released.
  const editable = !s.release && !s.dispatch;
  const pick =
    (role: 'provider_form' | 'bav_extra') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) upload.mutate({ file, role });
    };
  const agent = [
    s.postalAgent.name,
    s.postalAgent.coLine,
    s.postalAgent.street,
    `${s.postalAgent.postalCode} ${s.postalAgent.city}`,
  ]
    .filter(Boolean)
    .join(', ');

  return wrap(
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <StatusDot
          tone={
            s.dispatch
              ? 'good'
              : s.release
                ? 'info'
                : s.pack
                  ? 'wait'
                  : 'neutral'
          }
        >
          {s.dispatch
            ? `Submitted ${formatDate(s.dispatch.dispatchedAt)}`
            : s.release
              ? `Released for dispatch ${formatDate(s.release.releasedAt, true)}`
              : s.pack
                ? 'Pack generated, not released'
                : 'No pack yet'}
        </StatusDot>
        <span className="text-xs text-gray-500">
          Client signs and applies; post goes to {agent}; {recipientName} pays
          the client directly (no escrow
          {provider ? '' : ', no ZE'}).
        </span>
      </div>

      {s.missing.length > 0 && (
        <p className="text-amber-700">
          Missing for the pack: {s.missing.join(', ')}
        </p>
      )}
      {s.bankBranch && (
        <p className="text-xs text-gray-600">
          Client bank account → {BRANCH_LABELS[s.bankBranch] ?? s.bankBranch}
        </p>
      )}
      {s.bankWarnings.map((w) => (
        <p key={w} className="text-xs text-amber-700">
          {w}
        </p>
      ))}

      {s.benefit && (
        <Field label="Benefit applied for (form field 1)" htmlFor="benefit">
          <select
            id="benefit"
            value={s.benefit.value}
            disabled={busy || !editable}
            onChange={(e) => benefit.mutate(e.target.value as StageBenefit)}
            className={inputClass}
          >
            {s.benefit.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {s.benefit.setByAdmin ? (
              <button
                type="button"
                className="underline"
                disabled={busy || !editable}
                onClick={() => benefit.mutate(null)}
              >
                Reset to the default from the client&apos;s answers
              </button>
            ) : (
              'Default from the client’s answers (full refund only when unable to work for health reasons).'
            )}
          </p>
        </Field>
      )}

      {provider && (
        <div className="space-y-2 rounded-md border border-gray-200 p-3">
          <p className="font-medium text-gray-900">Documents for the pack</p>
          {s.uploads.length === 0 ? (
            <p className="text-xs text-gray-500">None uploaded.</p>
          ) : (
            <ul className="space-y-1">
              {s.uploads.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {u.role === 'provider_form'
                      ? 'Application form'
                      : 'Extra document'}
                  </span>
                  <span className="truncate">{u.fileName}</span>
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => remove.mutate(u.id)}
                      aria-label={`Remove ${u.fileName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <div className="flex flex-wrap gap-2">
              {provider.code === 'KVBW_ZVK' && (
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
                  <Upload className="h-3.5 w-3.5" />
                  Application form (completed, client-signed PDF)
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    disabled={busy}
                    onChange={pick('provider_form')}
                  />
                </label>
              )}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">
                <Upload className="h-3.5 w-3.5" />
                Extra document (e.g. tax-ID form)
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  disabled={busy}
                  onChange={pick('bav_extra')}
                />
              </label>
            </div>
          )}
          <p className="text-xs text-gray-500">
            {provider.code === 'KVBW_ZVK'
              ? 'The latest application form goes in after the cover letter. '
              : ''}
            Extra documents go at the end; the file name is their line in the
            cover letter’s Anlagen list.
          </p>
        </div>
      )}

      {s.pack && (
        <div className="rounded-md border border-gray-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">
                Direct pack · {s.pack.totalPages ?? '?'} pages
              </p>
              <p className="text-xs text-gray-500">
                Generated {formatDate(s.pack.generatedAt, true)}
                {s.pack.recipient
                  ? ` · to ${s.pack.recipient.carrierName}`
                  : ''}
                {s.pack.signatureDate
                  ? ` · signed ${s.pack.signatureDate}`
                  : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onPreview({
                  title: 'Direct submission pack',
                  subtitle: s.pack?.recipient?.carrierName,
                  fileType: 'application/pdf',
                  load: () => getDirectPackDownloadUrl(claimId),
                })
              }
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
          </div>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-gray-700">
            {s.pack.documents.map((d) => (
              <li key={d.key}>
                {d.label}{' '}
                <span className="text-xs text-gray-400">({d.pages} p.)</span>
              </li>
            ))}
          </ol>
          {!s.pack.signed && (
            <p className="mt-2 text-amber-700">
              Not signed: the client has no online signature on file.
            </p>
          )}
          {s.pack.warnings.map((w) => (
            <p key={w} className="mt-1 text-xs text-amber-700">
              {w}
            </p>
          ))}
        </div>
      )}

      {!s.release && !s.dispatch && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || s.missing.length > 0}
              onClick={() => generate.mutate()}
            >
              {generate.isPending
                ? 'Generating…'
                : s.pack
                  ? 'Regenerate pack'
                  : 'Generate pack'}
            </Button>
            <Button
              variant="primary"
              disabled={busy || s.releaseBlockers.length > 0}
              onClick={() => release.mutate()}
            >
              {release.isPending ? 'Releasing…' : 'Release for dispatch'}
            </Button>
          </div>
          {s.releaseBlockers.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-gray-500">
              {s.releaseBlockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {s.release && !s.dispatch && !dispatch && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              setDispatch({
                sender: s.defaultSender ?? '',
                method: 'post',
                date: today(),
                note: '',
              })
            }
          >
            Record dispatch
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => withdraw.mutate()}
          >
            Withdraw release
          </Button>
        </div>
      )}

      {dispatch && (
        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Sent by" htmlFor="dispatch-sender">
              <input
                id="dispatch-sender"
                value={dispatch.sender}
                onChange={(e) =>
                  setDispatch({ ...dispatch, sender: e.target.value })
                }
                maxLength={200}
                className={inputClass}
              />
            </Field>
            <Field label="Method" htmlFor="dispatch-method">
              <select
                id="dispatch-method"
                value={dispatch.method}
                onChange={(e) =>
                  setDispatch({
                    ...dispatch,
                    method: e.target.value as DispatchMethod,
                  })
                }
                className={inputClass}
              >
                {s.dispatchMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Actual submission date" htmlFor="dispatch-date">
              <input
                id="dispatch-date"
                type="date"
                value={dispatch.date}
                max={today()}
                onChange={(e) =>
                  setDispatch({ ...dispatch, date: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>
          <input
            value={dispatch.note}
            onChange={(e) => setDispatch({ ...dispatch, note: e.target.value })}
            placeholder="Note, e.g. tracking number (optional)"
            className={inputClass}
          />
          <p className="text-xs text-gray-500">
            Saving marks the claim as submitted to {recipientName} and locks the
            submission route.
          </p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={busy || !dispatch.sender.trim() || !dispatch.date}
              onClick={() => record.mutate(dispatch)}
            >
              {record.isPending ? 'Saving…' : 'Save dispatch'}
            </Button>
            <Button variant="ghost" onClick={() => setDispatch(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {s.dispatch && (
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Submitted</dt>
            <dd>
              {formatDate(s.dispatch.dispatchedAt)} ·{' '}
              {s.dispatchMethods.find((m) => m.value === s.dispatch!.method)
                ?.label ?? s.dispatch.method}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Sent by</dt>
            <dd>{s.dispatch.sender}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Recorded</dt>
            <dd>{formatDate(s.dispatch.recordedAt, true)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Client confirmed payment</dt>
            <dd>
              {s.paymentConfirmedAt
                ? formatDate(s.paymentConfirmedAt)
                : 'not yet'}
            </dd>
          </div>
        </dl>
      )}

      {s.dispatch && !s.paymentConfirmedAt && (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Client confirmed the refund arrived on"
            htmlFor="payment-date"
          >
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              max={today()}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Button
            disabled={busy || !paymentDate}
            onClick={() => payment.mutate(paymentDate)}
          >
            {payment.isPending ? 'Saving…' : 'Record payment'}
          </Button>
        </div>
      )}

      {busy && <Spinner />}
      {error && <ErrorText error={error} fallback="Could not save" />}
    </div>
  );
}
