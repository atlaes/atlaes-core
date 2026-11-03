'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  downloadTransferMateCsv,
  getEscrow,
  publishDecision,
  recordOnwardTransfer,
  resolvePayoutTask,
  setContactPause,
  setDecisionDirect,
  setExpectedArrival,
  setPayoutHold,
  type DecisionRecipient,
  type EscrowTransfer,
} from '@/lib/escrow-payout-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';

const TEMPLATE_LABELS: Record<string, string> = {
  E1A: 'E1A review + release invitation',
  E1B: 'E1B review only (late decision)',
  E1C: 'E1C release invitation',
  E2A: 'E2A review reminder',
  E2B: 'E2B release reminder',
  E2C: 'E2C combined reminder',
  EM: 'EM decision request',
  E3: 'E3 payout queued',
  E4A: 'E4A payment sent',
  E4B: 'E4B TransferMate payment sent',
  E5: 'E5 arrival check',
};

const ROUTE_LABEL: Record<string, string> = {
  A: 'SEPA (EUR)',
  B: 'TransferMate',
  C: 'SWIFT (EUR)',
};

/**
 * Claim page: escrow payout controls. Payout hold and contact pause,
 * verification of a client-uploaded decision, the onward TransferMate
 * transfer (E4B) or the expected arrival of a direct payment (E5),
 * payout tasks and the e-mail log.
 */
export function EscrowPayoutCard({
  claimId,
  wrap,
}: {
  claimId: string;
  wrap: (body: React.ReactNode) => React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const key = ['admin-escrow-payout', claimId];
  const state = useQuery({ queryKey: key, queryFn: () => getEscrow(claimId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refresh,
  });

  const [holdReason, setHoldReason] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');
  const [taskNote, setTaskNote] = useState<Record<string, string>>({});

  if (state.isLoading) return wrap(<Spinner />);
  if (state.isError || !state.data)
    return wrap(
      <ErrorText error={state.error} fallback="Could not load escrow payout" />
    );
  const s = state.data;
  const openTasks = s.tasks.filter((t) => t.status === 'open');

  return wrap(
    <div className="space-y-5 text-sm">
      {/* Hold */}
      <div className="space-y-2">
        <StatusDot tone={s.hold ? 'bad' : 'good'}>
          {s.hold ? `Payout on hold: ${s.hold.reason ?? ''}` : 'No payout hold'}
        </StatusDot>
        {s.hold?.at && (
          <p className="text-xs text-gray-500">
            since {formatDate(s.hold.at, true)} · blocks the release invitation,
            reminders and signing
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          {!s.hold && (
            <div className="min-w-[16rem] flex-1">
              <Field label="Hold reason" htmlFor="hold-reason">
                <input
                  id="hold-reason"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  maxLength={1000}
                  placeholder="e.g. identity check, dispute, legal question"
                  className={inputClass}
                />
              </Field>
            </div>
          )}
          <Button
            variant={s.hold ? 'secondary' : 'danger'}
            disabled={act.isPending || (!s.hold && !holdReason.trim())}
            onClick={() =>
              act.mutate(async () => {
                await setPayoutHold(claimId, s.hold ? null : holdReason);
                setHoldReason('');
              })
            }
          >
            {s.hold ? 'Lift hold' : 'Put payout on hold'}
          </Button>
        </div>
      </div>

      {/* Contact pause */}
      <div className="space-y-2">
        <StatusDot tone={s.contactPause ? 'wait' : 'neutral'}>
          {s.contactPause
            ? `Contact paused: ${s.contactPause.reason ?? ''}${
                s.contactPause.nextContactDate
                  ? ` · next contact ${formatDate(s.contactPause.nextContactDate)}`
                  : ''
              }`
            : 'Routine reminders active'}
        </StatusDot>
        <p className="text-xs text-gray-500">
          A pause stops routine payout reminders only; deadline alerts and
          payment confirmations still go out.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          {!s.contactPause && (
            <>
              <div className="min-w-[14rem] flex-1">
                <Field label="Reason" htmlFor="pause-reason">
                  <input
                    id="pause-reason"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    maxLength={1000}
                    placeholder="e.g. travelling until December"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Next contact" htmlFor="pause-until">
                <input
                  id="pause-until"
                  type="date"
                  min={s.today}
                  value={pauseUntil}
                  onChange={(e) => setPauseUntil(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          )}
          <Button
            disabled={act.isPending || (!s.contactPause && !pauseReason.trim())}
            onClick={() =>
              act.mutate(async () => {
                await setContactPause(
                  claimId,
                  s.contactPause
                    ? null
                    : {
                        reason: pauseReason,
                        nextContactDate: pauseUntil || null,
                      }
                );
                setPauseReason('');
                setPauseUntil('');
              })
            }
          >
            {s.contactPause ? 'Resume contact' : 'Pause contact'}
          </Button>
        </div>
      </div>

      {/* Decision */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!s.decisionDirectToClientAt}
            disabled={act.isPending}
            onChange={(e) =>
              act.mutate(() => setDecisionDirect(claimId, e.target.checked))
            }
          />
          The decision went to the client directly (sends the decision request
          EM now)
        </label>
        {s.decisionNotReceivedAt && (
          <p className="text-xs text-amber-700">
            Client reported on {formatDate(s.decisionNotReceivedAt, true)} that
            the decision has not arrived.
          </p>
        )}
        {s.pendingUpload && (
          <PublishUpload
            claimId={claimId}
            today={s.today}
            upload={s.pendingUpload}
            onDone={refresh}
          />
        )}
      </div>

      {/* Transfers */}
      {s.transfers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Authorised payouts
            </h3>
            {s.transfers.some((t) => t.route === 'B') && (
              <Button size="sm" onClick={() => void downloadTransferMateCsv()}>
                TransferMate sheet (CSV)
              </Button>
            )}
          </div>
          {s.transfers.map((t) => (
            <TransferRow
              key={t.releaseId}
              claimId={claimId}
              today={s.today}
              t={t}
              onDone={refresh}
            />
          ))}
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Payout tasks
        </h3>
        {openTasks.length === 0 ? (
          <p className="text-gray-400">No open tasks.</p>
        ) : (
          <ul className="space-y-2">
            {openTasks.map((t) => (
              <li key={t.id} className="rounded-md border border-gray-200 p-3">
                <StatusDot tone={t.urgent ? 'bad' : 'wait'}>
                  {t.urgent ? 'Urgent: ' : ''}
                  {t.label}
                </StatusDot>
                {t.detail && (
                  <p className="mt-1 text-xs text-gray-600">{t.detail}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Resolution note"
                    value={taskNote[t.id] ?? ''}
                    onChange={(e) =>
                      setTaskNote({ ...taskNote, [t.id]: e.target.value })
                    }
                    placeholder="Note (optional)"
                    className={`${inputClass} max-w-xs`}
                  />
                  <Button
                    size="sm"
                    disabled={act.isPending}
                    onClick={() =>
                      act.mutate(() =>
                        resolvePayoutTask(t.id, taskNote[t.id]?.trim() || null)
                      )
                    }
                  >
                    Mark done
                  </Button>
                  <span className="text-xs text-gray-400">
                    opened {formatDate(t.createdAt, true)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* E-mail log */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Payout e-mails
        </h3>
        {s.emails.filter((e) => e.status !== 'settled').length === 0 ? (
          <p className="text-gray-400">None sent yet.</p>
        ) : (
          <ul className="space-y-1">
            {s.emails
              .filter((e) => e.status !== 'settled')
              .map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3 text-xs">
                  <span className="font-medium text-gray-800">
                    {TEMPLATE_LABELS[e.template] ?? e.template}
                  </span>
                  <span className="text-gray-500">
                    {e.status === 'sent'
                      ? `sent ${formatDate(e.sentAt, true)}`
                      : 'sending…'}
                  </span>
                  {e.recipient && (
                    <span className="text-gray-400">to {e.recipient}</span>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>

      {act.isError && <ErrorText error={act.error} fallback="Could not save" />}
    </div>
  );
}

function PublishUpload({
  claimId,
  today,
  upload,
  onDone,
}: {
  claimId: string;
  today: string;
  upload: {
    decisionId: string;
    uploadedAt: string | null;
    documentUrl: string | null;
  };
  onDone: () => void;
}) {
  const [receivedAt, setReceivedAt] = useState('');
  const [atlaesReceivedAt, setAtlaesReceivedAt] = useState(today);
  const [reviewBy, setReviewBy] = useState('');
  const [recipient, setRecipient] = useState<DecisionRecipient>('client');
  const publish = useMutation({
    mutationFn: () =>
      publishDecision(claimId, upload.decisionId, {
        receivedAt: receivedAt || null,
        atlaesReceivedAt: atlaesReceivedAt || null,
        reviewBy: reviewBy || null,
        recipient,
      }),
    onSuccess: onDone,
  });
  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p>
        The client uploaded a copy of the decision
        {upload.uploadedAt
          ? ` on ${formatDate(upload.uploadedAt, true)}`
          : ''}.{' '}
        {upload.documentUrl && (
          <a
            href={upload.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open the upload
          </a>
        )}
      </p>
      <p className="text-xs text-gray-600">
        Check the letter, record who received it and when, and verify the review
        date. Publishing shows it to the client and starts the review.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <Field label="Received by" htmlFor="pub-recipient">
          <select
            id="pub-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value as DecisionRecipient)}
            className={inputClass}
          >
            <option value="client">Client</option>
            <option value="law_firm">Law firm</option>
            <option value="atlaes">ATLAES</option>
          </select>
        </Field>
        <Field label="Received on" htmlFor="pub-received">
          <input
            id="pub-received"
            type="date"
            max={today}
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="ATLAES received" htmlFor="pub-atlaes">
          <input
            id="pub-atlaes"
            type="date"
            max={today}
            value={atlaesReceivedAt}
            onChange={(e) => setAtlaesReceivedAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Review due"
          htmlFor="pub-review"
          hint="Leave empty to calculate"
        >
          <input
            id="pub-review"
            type="date"
            value={reviewBy}
            onChange={(e) => setReviewBy(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Button
        variant="primary"
        disabled={publish.isPending || !receivedAt}
        onClick={() => publish.mutate()}
      >
        Verify and publish
      </Button>
      {publish.isError && (
        <ErrorText error={publish.error} fallback="Could not publish" />
      )}
    </div>
  );
}

function TransferRow({
  claimId,
  today,
  t,
  onDone,
}: {
  claimId: string;
  today: string;
  t: EscrowTransfer;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(
    t.onwardAmount !== null ? String(t.onwardAmount) : ''
  );
  const [currency, setCurrency] = useState(t.onwardCurrency ?? '');
  const [transferDate, setTransferDate] = useState(t.onwardTransferDate ?? '');
  const [arrival, setArrival] = useState(t.expectedArrivalDate ?? '');
  const [receipt, setReceipt] = useState<File | null>(null);
  const save = useMutation({
    mutationFn: () =>
      t.route === 'B'
        ? recordOnwardTransfer(claimId, t.releaseId, {
            amount,
            currency,
            transferDate,
            expectedArrival: arrival,
            receipt,
          })
        : setExpectedArrival(claimId, t.releaseId, arrival || null),
    onSuccess: () => {
      setReceipt(null);
      onDone();
    },
  });
  const receiptTone =
    t.receiptStatus === 'confirmed'
      ? 'good'
      : t.receiptStatus === 'not_received'
        ? 'bad'
        : 'neutral';
  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">
          {t.route ? ROUTE_LABEL[t.route] : 'Route not chosen'}
        </span>
        <span className="text-xs text-gray-500">
          signed {formatDate(t.signedAt, true)}
        </span>
        <StatusDot tone={receiptTone}>
          {t.receiptStatus === 'confirmed'
            ? 'Client confirmed receipt'
            : t.receiptStatus === 'not_received'
              ? 'Client reports not received'
              : 'Receipt not confirmed yet'}
        </StatusDot>
      </div>
      {t.route === 'B' ? (
        <>
          <p className="text-xs text-gray-600">
            Record the TransferMate payment to the client. E4B goes once the
            amount, currency, date, expected arrival and receipt are all in.
          </p>
          <div className="grid gap-2 sm:grid-cols-5">
            <Field label="Amount sent" htmlFor={`amt-${t.releaseId}`}>
              <input
                id={`amt-${t.releaseId}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Currency" htmlFor={`cur-${t.releaseId}`}>
              <input
                id={`cur-${t.releaseId}`}
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={inputClass}
              />
            </Field>
            <Field label="Transfer date" htmlFor={`td-${t.releaseId}`}>
              <input
                id={`td-${t.releaseId}`}
                type="date"
                max={today}
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Expected arrival" htmlFor={`ea-${t.releaseId}`}>
              <input
                id={`ea-${t.releaseId}`}
                type="date"
                value={arrival}
                onChange={(e) => setArrival(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Receipt"
              htmlFor={`rc-${t.releaseId}`}
              hint={
                t.hasReceipt ? 'On file; upload to replace' : 'PDF or image'
              }
            >
              <input
                id={`rc-${t.releaseId}`}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                className="block w-full text-xs"
              />
            </Field>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Expected arrival"
            htmlFor={`ea-${t.releaseId}`}
            hint="Schedules the arrival check (E5)"
          >
            <input
              id={`ea-${t.releaseId}`}
              type="date"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      )}
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        Save
      </Button>
      {save.isError && (
        <ErrorText error={save.error} fallback="Could not save" />
      )}
    </div>
  );
}
