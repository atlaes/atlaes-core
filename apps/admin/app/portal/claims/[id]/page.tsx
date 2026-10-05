'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFirmCase,
  getFirmCorrespondenceDownload,
  getFirmDownload,
  recordFirmEvent,
  setFirmReference,
  uploadFirmCorrespondence,
  type FirmCaseDetail,
} from '@/lib/law-firm-api';
import { Spinner, formatBytes } from '@/components/ui';
import {
  Chip,
  CopyIcon,
  DataRow,
  Note,
  PillButton,
  PortalCard,
  PortalColumn,
  PortalField,
  apiError,
  caseIdentifierLabel,
  caseTypeChip,
  copyText,
  fmtDay,
  fmtDayTime,
  fmtDotted,
  parseDotted,
  portalInputClass,
} from '@/components/portal/ui';

/**
 * Case screen of the law-firm portal (Figma section A):
 *   03 before AZ (1032:5127) → 04 AZ saved (1033:5127) → 05 submitted
 *   (1034:5127). Platform brief Part 1: AZ mandatory (12345-YY), download
 *   disabled until it is saved, saving the submission date creates the
 *   event "Submitted" and removes the case from the firm's view.
 */

const AZ_PATTERN = /^\d{5}-\d{2}$/;

const VISIBILITY_TEXT =
  'Case appears on “Ready for submission”; disappears from the firm’s view when the submission date is saved. No submission date after 7 days → warning to ATLAES, case stays visible. ATLAES Admin can re-release a submitted case for 48 hours.';
const FROZEN_TEXT =
  'The generated PDF is stored on the case as the frozen submitted version; later client-data corrections do not change it. Re-download allowed while the case is visible.';

/** DRV refund print order (brief Part 1; labels as in Figma). */
const DRV_PACK_CONTENTS = [
  'Cover letter (with AZ)',
  'V0901 — Antrag auf Beitragserstattung',
  'A1310 — Zahlungserklärung',
  'Power of attorney (PoA)',
  'A1002 — Lebensbescheinigung',
  'Reply to refund (Rückantwort)',
  'Copy of payslip',
  'Copy of the client’s ID',
];
const BAV_PACK_CONTENTS = [
  'Cover letter (with AZ)',
  'Power of attorney (PoA)',
  'Enclosures',
];

const todayIso = () => new Date().toISOString().slice(0, 10);

type Claim = FirmCaseDetail['claim'];

export default function PortalCasePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [azEditing, setAzEditing] = useState(false);
  const [azValue, setAzValue] = useState('');
  const [azError, setAzError] = useState<string | null>(null);
  const [subDate, setSubDate] = useState('');
  const [subError, setSubError] = useState<string | null>(null);
  // Saving the submission date hides the case server-side; keep showing
  // the "submitted" screen (Figma 05) from the cached detail.
  const [submittedLocal, setSubmittedLocal] = useState<{
    date: string;
    savedAt: Date;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  const caseQuery = useQuery({
    queryKey: ['firm-case', id],
    queryFn: () => getFirmCase(id),
    enabled: !!id,
    retry: false,
  });

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ['firm-claims'] });
    queryClient.invalidateQueries({ queryKey: ['firm-summary'] });
  };

  const azMutation = useMutation({
    mutationFn: (v: string) => setFirmReference(id, v),
    onSuccess: () => {
      setAzEditing(false);
      setAzError(null);
      queryClient.invalidateQueries({ queryKey: ['firm-case', id] });
      refreshLists();
    },
    onError: (e) => setAzError(apiError(e, 'The AZ could not be saved.')),
  });

  const submitMutation = useMutation({
    mutationFn: (date: string) =>
      recordFirmEvent(id, { event: 'submitted', date }),
    onSuccess: (_r, date) => {
      setSubmittedLocal({ date, savedAt: new Date() });
      setSubError(null);
      refreshLists();
    },
    onError: (e) =>
      setSubError(apiError(e, 'The submission date could not be saved.')),
  });

  const open = async (fn: () => Promise<{ downloadUrl: string | null }>) => {
    setDownloadError(null);
    try {
      const r = await fn();
      if (r.downloadUrl) {
        window.open(r.downloadUrl, '_blank', 'noopener');
        if (!submittedLocal)
          queryClient.invalidateQueries({ queryKey: ['firm-case', id] });
      } else {
        setDownloadError('No download is available in this environment.');
      }
    } catch (e) {
      setDownloadError(apiError(e, 'Download failed.'));
    }
  };

  if (caseQuery.isLoading) return <Spinner full />;
  if (caseQuery.error || !caseQuery.data) {
    return (
      <PortalColumn>
        <BackLink />
        <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.32px] text-[#181818]">
          Case not available
        </h1>
        <p className="text-[15px] leading-[1.5] text-[#4b4f58]">
          This case is no longer released to your firm. If you need it back,
          ask ATLAES to re-release it.
        </p>
      </PortalColumn>
    );
  }

  const { claim, events, correspondence } = caseQuery.data;
  const chip = caseTypeChip(claim.caseType);
  const isBav = claim.caseType === 'bav_cashout';
  const az = claim.lawFirmRef;
  const azValid = claim.aktenzeichenValid ?? AZ_PATTERN.test(az ?? '');
  const showAzForm = !azValid || azEditing;
  const submittedDate = submittedLocal?.date ?? claim.firmSubmittedAt ?? null;
  const isSubmitted = !!submittedDate;
  const rereleased = claim.visibility === 'rereleased';
  const releasedAt = claim.releasedAt ?? claim.assignedAt;

  const downloadAllowed =
    (claim.download ? claim.download.allowed : azValid && claim.packageReady) &&
    !showAzForm &&
    (!submittedLocal || rereleased);
  const downloadReason =
    claim.download && !claim.download.allowed
      ? 'Enter and save the Aktenzeichen first'
      : !azValid || showAzForm
        ? 'Enter and save the Aktenzeichen first'
        : null;

  const azSavedAt = events.find((e) => e.event === 'reference_set')?.createdAt;
  const submittedEvent = events.find((e) => e.event === 'submitted');
  const downloads = events.filter((e) => e.event === 'downloaded');
  const incoming = correspondence.filter((c) => c.direction === 'provider_in');

  const saveAz = (e: React.FormEvent) => {
    e.preventDefault();
    const v = azValue.trim();
    if (!AZ_PATTERN.test(v)) {
      setAzError('Format 12345-YY, e.g. 06152-26');
      return;
    }
    azMutation.mutate(v);
  };

  const saveSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    const iso = parseDotted(subDate);
    if (!iso) {
      setSubError('Enter the date as DD.MM.YYYY.');
      return;
    }
    if (iso > todayIso()) {
      setSubError('The submission date cannot be in the future.');
      return;
    }
    submitMutation.mutate(iso);
  };

  const copyAll = async () => {
    const ok = await copyText(claim.copyBlock ?? buildCopyBlock(claim));
    setCopied(ok ? 'ok' : 'fail');
    window.setTimeout(() => setCopied(null), 2500);
  };

  const caseData = (
    <PortalCard
      title="Case data"
      action={
        <PillButton variant="outline" size="sm" onClick={copyAll}>
          {copied === 'ok' ? (
            <>
              <CopyIcon /> Copied
            </>
          ) : (
            'Copy all'
          )}
        </PillButton>
      }
    >
      <CaseDataRows claim={claim} compact={isSubmitted} />
      {copied === 'fail' && (
        <Note tone="error">
          Copying is blocked in this browser. Select the fields and copy them
          manually.
        </Note>
      )}
      {!azValid && !isSubmitted && (
        <Note>
          Read-only. “Copy all” copies these fields as one block in the order
          agreed with the firm.
        </Note>
      )}
    </PortalCard>
  );

  const packContents = (
    <PortalCard title="Pack contents">
      <ol className="flex w-full flex-col gap-2.5 leading-[1.5]">
        {packContentLabels(claim, isBav).map((label, i) => (
          <li key={`${i}-${label}`} className="flex w-full items-start gap-2.5">
            <span className="w-4 shrink-0 text-[12px] font-bold leading-[21px] text-[#5e8cd9]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 text-[14px] text-[#181818]">
              {label}
            </span>
          </li>
        ))}
      </ol>
      {!azValid && (
        <Note>
          Merged into one PDF in print order. Generated at download time with
          the AZ on the cover letter.
        </Note>
      )}
    </PortalCard>
  );

  const downloadsCard =
    downloads.length > 0 ? (
      <PortalCard title="Downloads">
        <ul className="flex w-full flex-col leading-[1.5]">
          {downloads.map((d, i) => (
            <li
              key={d.id}
              className={`flex flex-col gap-0.5 py-2.5 ${i > 0 ? 'border-t border-[#f1f1f1]' : ''}`}
            >
              <span className="text-[13px] font-semibold text-[#181818]">
                Submission pack · v1
              </span>
              <span className="text-[12px] text-[#8c8c8c]">
                {fmtDayTime(d.createdAt)}
              </span>
            </li>
          ))}
        </ul>
        {!isSubmitted && (
          <Note>Every download is logged (user, time, IP).</Note>
        )}
      </PortalCard>
    ) : null;

  return (
    <PortalColumn>
      <BackLink />

      {isSubmitted && (
        <div className="flex w-full items-center gap-3 rounded-[12px] bg-[#fbefc7] px-5 py-3.5 leading-[1.4] text-[#6b4d00]">
          <span aria-hidden className="text-[12px]">
            ●
          </span>
          <p className="flex-1 text-[15px] font-semibold">
            Submitted on {fmtDay(submittedDate)} — this case will disappear
            from your view
          </p>
        </div>
      )}

      <header className="flex flex-col items-start gap-2.5">
        <div className="flex gap-2">
          <Chip tone={chip.tone}>{chip.label}</Chip>
          {isSubmitted && <Chip tone="green">Submitted</Chip>}
        </div>
        <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.32px] text-[#181818]">
          {claim.claimant.name ?? 'Name missing'}
        </h1>
        <p className="text-[15px] leading-[1.5] text-[#4b4f58]">
          {isSubmitted
            ? `Released ${fmtDay(releasedAt)} · Submitted ${fmtDay(submittedDate)}${az ? ` · AZ ${az}` : ''}`
            : `Released ${fmtDay(releasedAt)} · Ready for submission · Route: via law firm`}
        </p>
      </header>

      <div className="flex w-full flex-col items-start gap-8 lg:flex-row">
        {/* Main column */}
        <div className="flex w-full min-w-0 flex-col gap-6 lg:w-[640px] lg:shrink-0">
          {isSubmitted ? (
            <>
              <PortalCard title="Submission pack — frozen version">
                <div className="flex w-full flex-wrap items-center gap-4 rounded-[12px] bg-[#f1f1f1] px-5 py-4">
                  <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[#c6c6c6] bg-white text-[9px] font-bold leading-none text-[#002691]">
                    PDF
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
                    <span className="text-[15px] font-semibold text-[#181818]">
                      Submission pack · v1 (submitted)
                    </span>
                    <span className="truncate text-[13px] text-[#8c8c8c]">
                      {packSummary(claim)}
                    </span>
                  </div>
                  <PillButton
                    variant="outline"
                    size="sm"
                    disabled={!downloadAllowed}
                    onClick={() => open(() => getFirmDownload(id, 'package'))}
                  >
                    Re-download
                  </PillButton>
                </div>
                {downloadError && <Note tone="error">{downloadError}</Note>}
                <Note>{FROZEN_TEXT}</Note>
              </PortalCard>

              <PortalCard title="Submission">
                <div className="flex w-full flex-col gap-6 sm:flex-row">
                  <ReadonlyField
                    label="Submission date"
                    value={fmtDotted(submittedDate)}
                  />
                  <ReadonlyField label="Aktenzeichen (AZ)" value={az ?? ''} />
                </div>
                <Note>
                  Saved{' '}
                  {fmtDayTime(
                    submittedLocal?.savedAt ?? submittedEvent?.createdAt
                  )}
                  {submittedLocal && user?.email ? ` by ${user.email}` : ''} ·
                  event “Submitted” recorded on the case.
                </Note>
              </PortalCard>

              {caseData}
            </>
          ) : (
            <>
              {caseData}

              <PortalCard title="Aktenzeichen (AZ)">
                {showAzForm ? (
                  <form
                    onSubmit={saveAz}
                    className="flex w-full flex-col gap-5"
                    noValidate
                  >
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                      <PortalField
                        label="Aktenzeichen"
                        htmlFor="az-input"
                        hint={
                          azError ? (
                            <span className="text-[#b42318]">{azError}</span>
                          ) : (
                            'Format 12345-YY, e.g. 06152-26'
                          )
                        }
                      >
                        <input
                          id="az-input"
                          value={azValue}
                          onChange={(e) => {
                            setAzValue(e.target.value);
                            setAzError(null);
                          }}
                          placeholder="06152-26"
                          inputMode="numeric"
                          maxLength={8}
                          autoComplete="off"
                          aria-invalid={!!azError}
                          className={portalInputClass}
                        />
                      </PortalField>
                      <div className="flex gap-3">
                        <PillButton
                          type="submit"
                          disabled={azMutation.isPending}
                        >
                          {azMutation.isPending ? 'Saving…' : 'Save'}
                        </PillButton>
                        {azEditing && azValid && (
                          <PillButton
                            variant="outline"
                            onClick={() => {
                              setAzEditing(false);
                              setAzError(null);
                            }}
                          >
                            Cancel
                          </PillButton>
                        )}
                      </div>
                    </div>
                    <Note>
                      Mandatory. Download is disabled until the AZ is saved.
                    </Note>
                  </form>
                ) : (
                  <div className="flex w-full flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#dcecdf] py-2 pl-3.5 pr-4 font-bold leading-[1.4] text-[#1f5f31]">
                      <span className="text-[14px]">✓</span>
                      <span className="text-[15px]">AZ {az}</span>
                    </span>
                    {azSavedAt && (
                      <span className="text-[13px] leading-[1.4] text-[#8c8c8c]">
                        Saved {fmtDayTime(azSavedAt)}
                      </span>
                    )}
                    {!claim.pack?.frozen && (
                      <button
                        type="button"
                        onClick={() => {
                          setAzValue(az ?? '');
                          setAzEditing(true);
                        }}
                        className="ml-auto text-[14px] font-semibold leading-[1.4] text-[#002691] hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </PortalCard>

              <PortalCard title="Submission pack">
                <div className="flex flex-col items-start gap-2">
                  <PillButton
                    disabled={!downloadAllowed}
                    onClick={() => open(() => getFirmDownload(id, 'package'))}
                  >
                    Download submission pack
                    {downloadAllowed && <span aria-hidden>→</span>}
                  </PillButton>
                  <p
                    className={`text-[13px] leading-[1.5] ${downloadAllowed ? 'text-[#4b4f58]' : 'text-[#8c8c8c]'}`}
                  >
                    {downloadAllowed
                      ? claim.pack?.frozen
                        ? `Re-downloads the frozen pack with AZ ${az} on the cover letter`
                        : `Generates the pack now with AZ ${az} on the cover letter`
                      : (downloadReason ??
                        (!claim.packageReady
                          ? 'The pack is still being prepared by ATLAES'
                          : 'Download is not available for this case'))}
                  </p>
                  {claim.copyReady && downloadAllowed && (
                    <button
                      type="button"
                      onClick={() => open(() => getFirmDownload(id, 'copy'))}
                      className="text-[14px] font-semibold leading-[1.4] text-[#002691] hover:underline"
                    >
                      Download copy for the other party (PDF)
                    </button>
                  )}
                  {downloadError && <Note tone="error">{downloadError}</Note>}
                  {!claim.pack?.frozen &&
                    (claim.pack?.missingData.length ?? 0) > 0 && (
                      <Note tone="error">
                        Data missing for the pack:{' '}
                        {claim.pack!.missingData.join(', ')}. ATLAES has been
                        asked to complete it.
                      </Note>
                    )}
                </div>

                {azValid && !showAzForm && <Note>{FROZEN_TEXT}</Note>}

                <form
                  onSubmit={saveSubmission}
                  className="flex w-full flex-col gap-5"
                  noValidate
                >
                  <div
                    className={`flex w-full flex-col gap-3 ${azValid && !showAzForm ? 'sm:flex-row sm:items-end' : ''}`}
                  >
                    <PortalField
                      label="Submission date"
                      htmlFor="submission-date"
                      disabled={!azValid || showAzForm}
                      hint={
                        subError ? (
                          <span className="text-[#b42318]">{subError}</span>
                        ) : azValid && !showAzForm ? (
                          'Saving it creates the event “Submitted” and removes the case from your view.'
                        ) : undefined
                      }
                    >
                      <input
                        id="submission-date"
                        value={subDate}
                        onChange={(e) => {
                          setSubDate(e.target.value);
                          setSubError(null);
                        }}
                        placeholder="DD.MM.YYYY"
                        inputMode="numeric"
                        maxLength={10}
                        autoComplete="off"
                        disabled={!azValid || showAzForm}
                        aria-invalid={!!subError}
                        className={`${portalInputClass} ${!azValid || showAzForm ? 'bg-[#f1f1f1]' : ''}`}
                      />
                    </PortalField>
                    <PillButton
                      type="submit"
                      className={`self-start ${azValid && !showAzForm ? 'sm:self-end' : ''}`}
                      disabled={
                        !azValid || showAzForm || submitMutation.isPending
                      }
                    >
                      {submitMutation.isPending
                        ? 'Saving…'
                        : 'Save submission date'}
                    </PillButton>
                  </div>
                </form>
              </PortalCard>
            </>
          )}
        </div>

        {/* Rail */}
        <aside className="flex w-full min-w-0 flex-1 flex-col gap-6">
          {isSubmitted ? (
            <>
              <PortalCard title="Re-release window" tone="blue">
                <p className="text-[14px] font-semibold leading-[1.5] text-[#002691]">
                  ATLAES Admin can re-release a submitted case for 48 hours.
                </p>
                <p className="text-[14px] leading-[1.5] text-[#002691]">
                  {rereleased && claim.rereleasedUntil
                    ? `Re-released until ${fmtDayTime(claim.rereleasedUntil)}. After that the case disappears again.`
                    : 'If you need the case back after it has disappeared, ask ATLAES to re-release it. It will show here again for 48 hours with the same frozen pack.'}
                </p>
              </PortalCard>
              {downloadsCard}
              <ReturnChannelCard
                claimId={id}
                isBav={isBav}
                incoming={incoming}
                onOpen={open}
                onUploaded={() => {
                  if (!submittedLocal)
                    queryClient.invalidateQueries({
                      queryKey: ['firm-case', id],
                    });
                }}
              />
            </>
          ) : (
            <>
              {azValid && !showAzForm && downloadsCard}
              {packContents}
              <PortalCard title="Visibility" tone="blue">
                <p className="text-[14px] leading-[1.5] text-[#002691]">
                  {VISIBILITY_TEXT}
                </p>
              </PortalCard>
            </>
          )}
        </aside>
      </div>
    </PortalColumn>
  );
}

// ---------------------------------------------------------------------------

function BackLink() {
  return (
    <Link
      href="/portal"
      className="self-start text-[14px] font-semibold leading-[1.4] text-[#002691] hover:underline"
    >
      ← Released cases
    </Link>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-[13px] font-semibold leading-[1.4] text-[#8c8c8c]">
        {label}
      </span>
      <div className="flex h-[52px] items-center rounded-[10px] border border-[#c6c6c6] bg-[#f1f1f1] px-4 text-[15px] leading-[1.4] text-[#8c8c8c]">
        {value || '—'}
      </div>
    </div>
  );
}

function counterparty(claim: Claim): {
  label: string;
  name: string | null;
  mailing: string[];
} {
  const { bav } = claim;
  if (claim.caseType === 'bav_cashout') {
    const employer = bav.addresseeType === 'employer';
    const r = bav.recipient;
    return {
      label: employer ? 'Responsible employer' : 'Responsible pension provider',
      name: (employer ? bav.employerName : bav.providerName) ?? r.name,
      mailing: [
        r.name,
        r.department,
        r.street,
        [r.postalCode, r.city].filter(Boolean).join(' '),
      ].filter((l): l is string => !!l),
    };
  }
  const recipient = claim.pack?.manifest?.recipient;
  return {
    label: 'Responsible DRV office',
    name: recipient?.carrierName ?? bav.drvOffice,
    mailing: recipient?.mailingAddress ?? [],
  };
}

function addressLine(claim: Claim): string | null {
  const a = claim.claimant.address;
  return (
    [a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(' '), a.country]
      .filter(Boolean)
      .join(', ') || null
  );
}

function CaseDataRows({
  claim,
  compact,
}: {
  claim: Claim;
  compact: boolean;
}) {
  const cp = counterparty(claim);
  const ident = claim.caseIdentifier;
  return (
    <dl className="flex w-full flex-col gap-3">
      <DataRow label="Case type" value={caseTypeChip(claim.caseType).label} />
      <DataRow label="Name" value={claim.claimant.name} />
      {!compact && (
        <>
          <DataRow label="Address" value={addressLine(claim)} />
          <DataRow
            label="Date of birth"
            value={
              claim.claimant.dateOfBirth
                ? fmtDay(claim.claimant.dateOfBirth)
                : null
            }
          />
          <DataRow label="Nationality" value={claim.claimant.nationality} />
        </>
      )}
      {ident && (
        <DataRow label={caseIdentifierLabel(ident.label)} value={ident.value} />
      )}
      <DataRow label={cp.label} value={cp.name} />
      <DataRow
        label="Mailing address"
        value={
          cp.mailing.length > 0 ? (
            <>
              {cp.mailing.map((l, i) => (
                <span key={i} className="block">
                  {l}
                </span>
              ))}
            </>
          ) : null
        }
      />
    </dl>
  );
}

function packContentLabels(claim: Claim, isBav: boolean): string[] {
  const docs = claim.pack?.manifest?.documents;
  if (Array.isArray(docs) && docs.length > 0) return docs.map((d) => d.label);
  return isBav ? BAV_PACK_CONTENTS : DRV_PACK_CONTENTS;
}

function packSummary(claim: Claim): string {
  const m = claim.pack?.manifest;
  const parts = [
    `Generated ${fmtDayTime(claim.pack?.generatedAt ?? m?.generatedAt ?? claim.downloadedAt)}`,
  ];
  if (claim.lawFirmRef) parts.push(`AZ ${claim.lawFirmRef}`);
  if (Array.isArray(m?.documents) && m!.documents!.length > 0)
    parts.push(`${m!.documents!.length} documents, 1 PDF`);
  return parts.join(' · ');
}

/** Client-side fallback when the API has no `copyBlock` yet. */
function buildCopyBlock(claim: Claim): string {
  const cp = counterparty(claim);
  const rows: [string, string | null | undefined][] = [
    ['Case type', caseTypeChip(claim.caseType).label],
    ['Name', claim.claimant.name],
    ['Address', addressLine(claim)],
    ['Date of birth', claim.claimant.dateOfBirth],
    ['Nationality', claim.claimant.nationality],
    [
      caseIdentifierLabel(claim.caseIdentifier?.label),
      claim.caseIdentifier?.value,
    ],
    [cp.label, cp.name],
    ['Mailing address', cp.mailing.join(', ')],
    ['Aktenzeichen', claim.lawFirmRef],
  ];
  return rows
    .filter(([, v]) => v && String(v).trim())
    .map(([l, v]) => `${l}: ${String(v).trim()}`)
    .join('\n');
}

function ReturnChannelCard({
  claimId,
  isBav,
  incoming,
  onOpen,
  onUploaded,
}: {
  claimId: string;
  isBav: boolean;
  incoming: FirmCaseDetail['correspondence'];
  onOpen: (fn: () => Promise<{ downloadUrl: string | null }>) => void;
  onUploaded: () => void;
}) {
  const [openForm, setOpenForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [received, setReceived] = useState(todayIso());
  const [note, setNote] = useState('');
  const [uploaded, setUploaded] = useState<FirmCaseDetail['correspondence']>(
    []
  );

  const upload = useMutation({
    mutationFn: (f: File) =>
      uploadFirmCorrespondence(claimId, f, {
        note: note.trim() || undefined,
        receivedDate: received || undefined,
      }),
    onSuccess: (item) => {
      setUploaded((u) => [item, ...u]);
      setFile(null);
      setNote('');
      setReceived(todayIso());
      setOpenForm(false);
      onUploaded();
    },
  });

  const letters = [
    ...uploaded,
    ...incoming.filter((c) => !uploaded.some((u) => u.id === c.id)),
  ];

  return (
    <PortalCard title="Return channel">
      <p className="text-[14px] leading-[1.5] text-[#4b4f58]">
        {isBav
          ? 'Scan letters from the pension provider or employer for this case to the platform intake mailbox — one letter per scan. The platform matches them on name plus contract number and files them to the case.'
          : 'Scan DRV letters and Bescheide for this case to the platform intake mailbox — one letter per scan. The platform matches them on name plus VSNR and files them to the case.'}
      </p>

      {letters.length > 0 && (
        <ul className="flex w-full flex-col">
          {letters.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-start justify-between gap-3 py-2.5 ${i > 0 ? 'border-t border-[#f1f1f1]' : ''}`}
            >
              <div className="min-w-0 leading-[1.5]">
                <p className="truncate text-[13px] font-semibold text-[#181818]">
                  {c.document?.fileName ?? 'Letter'}
                </p>
                <p className="text-[12px] text-[#8c8c8c]">
                  Received {fmtDay(c.receivedDate ?? c.createdAt)}
                  {c.document ? ` · ${formatBytes(c.document.fileSize)}` : ''}
                </p>
              </div>
              {c.document && (
                <button
                  type="button"
                  onClick={() =>
                    onOpen(() => getFirmCorrespondenceDownload(claimId, c.id))
                  }
                  className="shrink-0 text-[13px] font-semibold text-[#002691] hover:underline"
                >
                  Open
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {openForm ? (
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (file) upload.mutate(file);
          }}
        >
          <PortalField
            label="Letter (PDF, JPG, PNG, max. 10 MB)"
            htmlFor="letter-file"
          >
            <input
              id="letter-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-[#4b4f58] file:mr-3 file:rounded-full file:border file:border-[#002691] file:bg-white file:px-4 file:py-1.5 file:text-[13px] file:font-bold file:text-[#002691]"
            />
          </PortalField>
          <PortalField label="Received on" htmlFor="letter-received">
            <input
              id="letter-received"
              type="date"
              value={received}
              max={todayIso()}
              onChange={(e) => setReceived(e.target.value)}
              className={portalInputClass}
            />
          </PortalField>
          <PortalField label="Note (optional)" htmlFor="letter-note">
            <textarea
              id="letter-note"
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${portalInputClass} h-auto py-3`}
            />
          </PortalField>
          {upload.isError && (
            <Note tone="error">{apiError(upload.error, 'Upload failed.')}</Note>
          )}
          <div className="flex flex-wrap gap-3">
            <PillButton
              type="submit"
              size="md"
              disabled={!file || upload.isPending}
            >
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </PillButton>
            <PillButton
              variant="outline"
              size="md"
              onClick={() => setOpenForm(false)}
            >
              Cancel
            </PillButton>
          </div>
        </form>
      ) : (
        <PillButton
          variant="outline"
          size="md"
          className="self-start"
          onClick={() => setOpenForm(true)}
        >
          Upload a letter instead
        </PillButton>
      )}
    </PortalCard>
  );
}
