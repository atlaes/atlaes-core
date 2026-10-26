'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fmtDay } from '@/components/portal/ui';
import {
  apiError,
  downloadPayoutCsv,
  getCaseDownload,
  getPayoutQueue,
  markLinePaid,
  money,
  type QueueCase,
  type QueueLine,
} from './api';
import { CopyCell, PageHead, SmallChip, todayIso } from './bits';

/**
 * 06 · Payout queue (Figma 1035:5130) — replaces the gsheet "Übersicht
 * Überweisungen". One row per transfer line, grouped per case.
 */

// Column widths from the Figma head row (gap 8, padding 16).
const GRID =
  'grid grid-cols-[100px_30px_72px_80px_62px_70px_34px_104px_80px_150px_88px_62px_130px_100px_70px] gap-x-2 px-4';

const HEAD = [
  'Client name',
  'ZE',
  'Value date',
  'Total received',
  'Law-firm fee',
  'ATLAES share',
  'Sum',
  'Recipient',
  'Amount',
  'IBAN / account',
  'Bank',
  'SEPA/ SWIFT',
  'Verwendungszweck',
  'Status',
  'Remarks',
];

function DailyLimit({ paid, limit }: { paid: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (paid / limit) * 100) : 0;
  const limitText = `€${limit.toLocaleString('en-GB')}`;
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-2xl bg-[#d7e4f6] px-6 py-[18px] lg:mt-6 lg:w-[400px] lg:shrink-0">
      <p className="text-[14px] font-semibold leading-[1.4] text-[#002691]">
        Marked paid today: €{money(paid)} of {limitText} daily limit
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-white">
        <div
          className={`h-full ${paid > limit ? 'bg-[#b42318]' : 'bg-[#002691]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[12px] leading-[1.4] text-[#002691]/70">
        Law-firm daily transfer limit {limitText} · {pct.toFixed(1)}% used
      </p>
    </div>
  );
}

function MarkPaid({ line }: { line: QueueLine }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const m = useMutation({
    mutationFn: () => markLinePaid(line.id, date),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['payout-queue'] });
    },
  });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center whitespace-nowrap rounded-full bg-[#002691] px-3 text-[12px] font-bold leading-[1.4] text-white hover:bg-[#001d70] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5e8cd9] focus-visible:ring-offset-1"
      >
        Mark paid
      </button>
    );
  }
  return (
    <div className="flex w-[100px] flex-col gap-1.5">
      <label className="sr-only" htmlFor={`paid-${line.id}`}>
        Paid on
      </label>
      <input
        id={`paid-${line.id}`}
        type="date"
        value={date}
        max={todayIso()}
        onChange={(e) => setDate(e.target.value)}
        className="h-7 w-full rounded-md border border-[#c6c6c6] px-1 text-[11px] text-[#181818] focus:border-[#002691] focus:outline-none"
      />
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!date || m.isPending}
          onClick={() => m.mutate()}
          className="h-7 flex-1 rounded-full bg-[#002691] text-[11px] font-bold text-white disabled:bg-[#c6c6c6]"
        >
          {m.isPending ? '…' : 'Paid'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-7 rounded-full px-1.5 text-[11px] font-semibold text-[#4b4f58]"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>
      {m.isError && (
        <p className="text-[11px] leading-[1.3] text-[#b42318]">
          {apiError(m.error, 'Could not save')}
        </p>
      )}
    </div>
  );
}

function DownloadLink({
  claimId,
  kind,
  children,
}: {
  claimId: string;
  kind: 'ze' | 'bescheid';
  children: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={busy}
      title={err ?? undefined}
      onClick={async () => {
        setBusy(true);
        setErr(null);
        try {
          const { url } = await getCaseDownload(claimId, kind);
          window.open(url, '_blank', 'noopener');
        } catch (e) {
          setErr(apiError(e, 'Download not available'));
        } finally {
          setBusy(false);
        }
      }}
      className={`whitespace-nowrap text-[12px] font-semibold leading-[1.4] hover:underline ${
        err ? 'text-[#b42318]' : 'text-[#002691]'
      }`}
    >
      {err ? `${children} — not available` : children}
    </button>
  );
}

function CaseRow({ c }: { c: QueueCase }) {
  return (
    <div className="flex min-h-[117px] flex-wrap items-center gap-4 border-t border-[#c6c6c6] bg-white px-4 pb-1.5 pt-2.5">
      <span className="text-[13px] font-bold leading-[1.4] text-[#181818]">
        {c.clientName}
      </span>
      {c.zeSignedAt && (
        <SmallChip tone="green">ZE ✓ signed {fmtDay(c.zeSignedAt)}</SmallChip>
      )}
      <span className="text-[12px] leading-[1.4] text-[#8c8c8c]">
        {c.invoiceNumber ? `Invoice ${c.invoiceNumber}` : 'Invoice pending'}
      </span>
      <span className="flex-1" />
      {c.hasZe ? (
        <DownloadLink claimId={c.claimId} kind="ze">
          Download ZE
        </DownloadLink>
      ) : (
        <span className="text-[12px] font-semibold leading-[1.4] text-[#8c8c8c]">
          ZE not stored
        </span>
      )}
      {c.hasBescheid ? (
        <DownloadLink claimId={c.claimId} kind="bescheid">
          Download Bescheid
        </DownloadLink>
      ) : (
        <span className="text-[12px] font-semibold leading-[1.4] text-[#8c8c8c]">
          Bescheid not yet received
        </span>
      )}
    </div>
  );
}

function LineRow({
  c,
  line,
  first,
}: {
  c: QueueCase;
  line: QueueLine;
  first: boolean;
}) {
  const valueDate = fmtDay(c.valueDate);
  const tick = (ok: boolean) => (
    <span
      className={`text-[12px] font-bold leading-[1.4] ${ok ? 'text-[#1f5f31]' : 'text-[#b42318]'}`}
      aria-label={ok ? 'yes' : 'no'}
    >
      {ok ? '✓' : '✗'}
    </span>
  );
  return (
    <div className={`${GRID} items-start bg-white py-2.5`}>
      <div>
        {first ? (
          <CopyCell
            label="client name"
            value={c.clientName}
            copy={c.clientName}
          />
        ) : null}
      </div>
      <div>{tick(!!c.zeSignedAt)}</div>
      <CopyCell label="value date" value={valueDate} copy={valueDate} />
      <CopyCell
        label="total received"
        value={money(c.totalReceived)}
        copy={money(c.totalReceived)}
      />
      <CopyCell
        label="law-firm fee"
        value={money(c.lawFirmFee)}
        copy={money(c.lawFirmFee)}
      />
      <CopyCell
        label="ATLAES share"
        value={money(c.atlaesShare)}
        copy={money(c.atlaesShare)}
      />
      <div>{tick(c.sumOk)}</div>
      <CopyCell
        label="recipient"
        value={line.recipient}
        copy={line.recipient}
      />
      <CopyCell
        label="amount"
        value={money(line.amount)}
        copy={money(line.amount)}
        strong
      />
      <CopyCell
        label="IBAN / account"
        value={line.bic ? `${line.account} · ${line.bic}` : line.account}
        copy={line.account}
      />
      {line.bank ? (
        <CopyCell label="bank" value={line.bank} copy={line.bank} />
      ) : (
        <span className="text-[12px] leading-[1.4] text-[#8c8c8c]">—</span>
      )}
      <CopyCell
        label="transfer type"
        value={line.transferMethod}
        copy={line.transferMethod}
      />
      <CopyCell
        label="Verwendungszweck"
        value={line.reference}
        copy={line.reference}
      />
      <div>
        {line.status === 'paid' ? (
          <SmallChip tone="green">Paid {fmtDay(line.paidOn)}</SmallChip>
        ) : (
          <MarkPaid line={line} />
        )}
      </div>
      <p className="break-words text-[12px] leading-[1.4] text-[#4b4f58]">
        {line.remarks ?? '—'}
      </p>
    </div>
  );
}

export function PayoutQueue() {
  const q = useQuery({ queryKey: ['payout-queue'], queryFn: getPayoutQueue });
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col items-center px-4 pb-24 pt-12 sm:px-6">
      <div className="flex w-full max-w-[1392px] flex-col gap-8">
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <PageHead eyebrow="Übersicht Überweisungen" title="Payout queue">
            One row per transfer line. Cases with a signed payment instruction
            and at least one open transfer line; a case leaves the view when all
            its lines are marked paid. Every field copies with one click for the
            Sparkasse online-banking mask.
          </PageHead>
          {q.data && (
            <DailyLimit
              paid={q.data.paidTodayEur}
              limit={q.data.dailyLimitEur}
            />
          )}
        </div>

        <div className="w-full overflow-x-auto rounded-2xl border border-[#c6c6c6]">
          <div className="min-w-[1390px]">
            <div className={`${GRID} bg-[#f1f1f1] py-2.5`} role="row">
              {HEAD.map((h) => (
                <span
                  key={h}
                  role="columnheader"
                  className={`font-semibold uppercase leading-[1.4] tracking-[0.02em] text-[#8c8c8c] ${
                    h === 'Verwendungszweck' ? 'text-[10px]' : 'text-[11px]'
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
            {q.isLoading && (
              <p className="border-t border-[#c6c6c6] px-4 py-10 text-[13px] text-[#8c8c8c]">
                Loading…
              </p>
            )}
            {q.isError && (
              <p className="border-t border-[#c6c6c6] px-4 py-10 text-[13px] text-[#b42318]">
                {apiError(q.error, 'The payout queue could not be loaded.')}
              </p>
            )}
            {q.data && q.data.cases.length === 0 && (
              <p className="border-t border-[#c6c6c6] px-4 py-10 text-[13px] text-[#8c8c8c]">
                No open transfer lines.
              </p>
            )}
            {q.data?.cases.map((c) => (
              <div key={c.releaseId}>
                <CaseRow c={c} />
                {c.lines.map((l, i) => (
                  <LineRow key={l.id} c={c} line={l} first={i === 0} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-[13px] leading-[1.5] text-[#8c8c8c]">
            Lines per case: (1) ATLAES share → ATLAES IBAN, Verwendungszweck =
            invoice number; (2) client remainder → client account (SEPA), or the
            provider collection account per route from the provider register
            (WISE / TransferMate accounts), Verwendungszweck =
            “Beitragserstattung [client name]” or the provider’s required
            reference. Law-firm fee is retained — no line.
          </p>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              disabled={exporting || !q.data}
              onClick={async () => {
                setExporting(true);
                setExportErr(null);
                try {
                  await downloadPayoutCsv();
                } catch (e) {
                  setExportErr(apiError(e, 'Export failed'));
                } finally {
                  setExporting(false);
                }
              }}
              className="inline-flex h-10 items-center whitespace-nowrap rounded-full border border-[#002691] bg-white px-[18px] text-[13px] font-bold leading-[1.4] text-[#002691] hover:bg-[#f3f6fc] disabled:border-[#c6c6c6] disabled:text-[#8c8c8c]"
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            {exportErr && (
              <span className="text-[12px] text-[#b42318]">{exportErr}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
