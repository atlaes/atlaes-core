'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  FileText,
  Inbox,
  Pencil,
  Send,
  Upload,
  User,
} from 'lucide-react';
import {
  apiErrorMessage,
  CHANNEL_LABELS,
  getFirmCase,
  getFirmCorrespondenceDownload,
  getFirmDownload,
  LawFirmCaseEvent,
  LawFirmSubmissionChannel,
  recordFirmEvent,
  setFirmReference,
  uploadFirmCorrespondence,
} from '@/lib/law-firm-api';
import { CaseStateBadge } from '@/components/CaseStateBadge';

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const EVENT_LABELS: Record<string, string> = {
  downloaded: 'Package downloaded',
  submitted: 'Sent to provider',
  response_received: 'Response received',
  closed: 'Case closed',
  reference_set: 'File number set',
  correspondence_uploaded: 'Correspondence uploaded',
};

export default function PortalCasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [refEditing, setRefEditing] = useState(false);
  const [refValue, setRefValue] = useState('');
  const [eventForm, setEventForm] = useState<{
    event: LawFirmCaseEvent;
    date: string;
    channel: LawFirmSubmissionChannel;
    note: string;
  } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadDate, setUploadDate] = useState(todayIso());
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const caseQuery = useQuery({
    queryKey: ['firm-case', id],
    queryFn: () => getFirmCase(id),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['firm-case', id] });
    queryClient.invalidateQueries({ queryKey: ['firm-claims'] });
  };

  const refMutation = useMutation({
    mutationFn: (value: string) => setFirmReference(id, value),
    onSuccess: () => {
      setRefEditing(false);
      invalidate();
    },
  });

  const eventMutation = useMutation({
    mutationFn: (input: NonNullable<typeof eventForm>) =>
      recordFirmEvent(id, {
        event: input.event,
        date: input.date || null,
        channel: input.event === 'submitted' ? input.channel : null,
        note: input.note.trim() || null,
      }),
    onSuccess: () => {
      setEventForm(null);
      invalidate();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFirmCorrespondence(id, file, {
        note: uploadNote.trim() || undefined,
        receivedDate: uploadDate || undefined,
      }),
    onSuccess: () => {
      setUploadFile(null);
      setUploadNote('');
      setUploadDate(todayIso());
      invalidate();
    },
  });

  const openDownload = async (kind: 'package' | 'copy') => {
    setDownloadError(null);
    try {
      const result = await getFirmDownload(id, kind);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener');
        invalidate();
      } else {
        setDownloadError('Download is not available in this environment.');
      }
    } catch (error) {
      setDownloadError(apiErrorMessage(error, 'Download failed'));
    }
  };

  const openCorrespondence = async (corrId: string) => {
    setDownloadError(null);
    try {
      const result = await getFirmCorrespondenceDownload(id, corrId);
      if (result.downloadUrl)
        window.open(result.downloadUrl, '_blank', 'noopener');
      else setDownloadError('Download is not available in this environment.');
    } catch (error) {
      setDownloadError(apiErrorMessage(error, 'Download failed'));
    }
  };

  if (caseQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (caseQuery.error || !caseQuery.data) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">This case is not available.</p>
        <button
          onClick={() => router.push('/portal')}
          className="mt-4 text-sm text-brand-dark underline"
        >
          Back to cases
        </button>
      </div>
    );
  }

  const { claim, correspondence, events } = caseQuery.data;
  const { claimant, bav } = claim;
  const isClosed = claim.caseState === 'closed';
  const canRespond = ['submitted', 'response_received'].includes(
    claim.caseState
  );

  const availableEvents: { key: LawFirmCaseEvent; label: string }[] = isClosed
    ? []
    : [
        { key: 'submitted', label: 'Sent to provider' },
        ...(canRespond
          ? [{ key: 'response_received' as const, label: 'Response received' }]
          : []),
        { key: 'closed', label: 'Close case' },
      ];

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => router.push('/portal')}
        className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">
            {claimant.name ?? 'Claimant'}
          </h1>
          <p className="text-sm text-gray-500">
            Case {claim.id.slice(0, 8)} &middot; assigned{' '}
            {formatDate(claim.assignedAt)}
            {claim.payoutTarget === 'law_firm' ? ' · payout to Anderkonto' : ''}
          </p>
        </div>
        <CaseStateBadge state={claim.caseState} />
      </div>

      {/* File number */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Your file number (Unser Zeichen)
            </h3>
            {claim.lawFirmRef ? (
              <p className="mt-1 text-sm text-gray-900">{claim.lawFirmRef}</p>
            ) : (
              <p className="mt-1 text-sm text-amber-700">
                Not set yet. The letter shows an empty &ldquo;Unser
                Zeichen&rdquo; until you enter it.
              </p>
            )}
          </div>
          {!refEditing && !isClosed && (
            <button
              onClick={() => {
                setRefValue(claim.lawFirmRef ?? '');
                setRefEditing(true);
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              {claim.lawFirmRef ? 'Edit' : 'Enter'}
            </button>
          )}
        </div>
        {refEditing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (refValue.trim()) refMutation.mutate(refValue.trim());
            }}
            className="mt-3 flex flex-wrap gap-2"
          >
            <input
              value={refValue}
              onChange={(e) => setRefValue(e.target.value)}
              placeholder="e.g. 2026/0815-KC"
              maxLength={100}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
            <button
              type="submit"
              disabled={refMutation.isPending || !refValue.trim()}
              className="rounded-lg bg-brand-dark px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {refMutation.isPending ? 'Saving…' : 'Save and regenerate letter'}
            </button>
            <button
              type="button"
              onClick={() => setRefEditing(false)}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            {refMutation.isError && (
              <p className="w-full text-sm text-red-600">
                {apiErrorMessage(refMutation.error, 'Could not save')}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Claimant and route */}
      <Section title="Claimant and route" icon={<User className="h-4 w-4" />}>
        <InfoGrid>
          <InfoItem label="Name" value={claimant.name} />
          <InfoItem
            label="Salutation"
            value={
              claimant.salutation === 'herr'
                ? 'Herr'
                : claimant.salutation === 'frau'
                  ? 'Frau'
                  : null
            }
          />
          <InfoItem
            label="Date of birth"
            value={formatDate(claimant.dateOfBirth)}
          />
          <InfoItem label="Nationality" value={claimant.nationality} />
          <InfoItem label="Email" value={claimant.email} />
          <InfoItem label="Tax ID" value={claimant.taxId} />
          <InfoItem
            label="Address"
            value={
              [
                claimant.address.line1,
                claimant.address.line2,
                [claimant.address.postalCode, claimant.address.city]
                  .filter(Boolean)
                  .join(' '),
                claimant.address.country,
              ]
                .filter(Boolean)
                .join(', ') || null
            }
          />
          <InfoItem
            label="Last German address"
            value={
              [
                claimant.germanAddress.street,
                [claimant.germanAddress.postalCode, claimant.germanAddress.city]
                  .filter(Boolean)
                  .join(' '),
              ]
                .filter(Boolean)
                .join(', ') || null
            }
          />
          <InfoItem
            label="Left Germany"
            value={formatDate(claimant.germanAddress.moveOutDate)}
          />
          <InfoItem label="Account holder" value={claimant.accountHolderName} />
          <InfoItem label="IBAN" value={claimant.ibanMasked} />
        </InfoGrid>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <InfoGrid>
            <InfoItem
              label="Route"
              value={
                bav.route === 'A'
                  ? 'A — DRV refund granted (§ 3 Abs. 3 BetrAVG)'
                  : bav.route === 'B'
                    ? 'B — small entitlement (§ 3 Abs. 2 BetrAVG)'
                    : null
              }
            />
            <InfoItem label="Employer" value={bav.employerName} />
            <InfoItem
              label="Employment ended"
              value={formatDate(bav.employmentEndDate)}
            />
            <InfoItem label="Provider" value={bav.providerName} />
            <InfoItem label="Durchführungsweg" value={bav.durchfuehrungsweg} />
            <InfoItem
              label={bav.contractReferenceLabel || 'Contract ref.'}
              value={bav.contractReference}
            />
            {bav.route === 'A' && (
              <>
                <InfoItem label="DRV office" value={bav.drvOffice} />
                <InfoItem
                  label="DRV decision"
                  value={formatDate(bav.drvDecisionDate)}
                />
              </>
            )}
            {bav.route === 'B' && (
              <>
                <InfoItem label="Statement" value={bav.statementType} />
                <InfoItem
                  label="Statement date"
                  value={formatDate(bav.statementDate)}
                />
                <InfoItem
                  label="Benefit"
                  value={
                    bav.benefitAmount
                      ? `€${bav.benefitAmount} (${bav.benefitForm ?? 'unknown'})`
                      : null
                  }
                />
              </>
            )}
            <InfoItem
              label="Addressee"
              value={
                bav.recipient.name
                  ? `${bav.addresseeType === 'employer' ? 'Employer' : 'Provider'}: ${bav.recipient.name}${bav.recipient.department ? `, ${bav.recipient.department}` : ''}`
                  : null
              }
            />
            <InfoItem
              label="Addressee address"
              value={
                [
                  bav.recipient.street,
                  [bav.recipient.postalCode, bav.recipient.city]
                    .filter(Boolean)
                    .join(' '),
                ]
                  .filter(Boolean)
                  .join(', ') || null
              }
            />
            <InfoItem label="Their reference" value={bav.recipient.ref} />
          </InfoGrid>
        </div>
      </Section>

      {/* Downloads */}
      <Section title="Downloads" icon={<FileText className="h-4 w-4" />}>
        {claim.packageReady ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openDownload('package')}
              className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              <Download className="h-4 w-4" />
              Letter package (PDF)
            </button>
            {claim.copyReady && (
              <button
                onClick={() => openDownload('copy')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Copy print for the other party
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            The package has not been generated yet. CompanyPension ops will
            regenerate it.
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Links are valid for 15 minutes. The package holds the unsigned letter,
          the client&rsquo;s Vollmacht and the enclosures; your firm prints,
          signs and sends it.
          {claim.downloadedAt
            ? ` First downloaded ${formatDate(claim.downloadedAt, true)}.`
            : ''}
        </p>
        {downloadError && (
          <p className="mt-2 text-sm text-red-600">{downloadError}</p>
        )}
      </Section>

      {/* Events */}
      <Section title="Case events" icon={<Send className="h-4 w-4" />}>
        {availableEvents.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {availableEvents.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() =>
                    setEventForm(
                      eventForm?.event === opt.key
                        ? null
                        : {
                            event: opt.key,
                            date: todayIso(),
                            channel: 'post',
                            note: '',
                          }
                    )
                  }
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    eventForm?.event === opt.key
                      ? 'border-brand-dark bg-brand-dark text-white'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {eventForm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  eventMutation.mutate(eventForm);
                }}
                className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-gray-600">
                    <span className="mb-1 block text-xs text-gray-500">
                      Date
                    </span>
                    <input
                      type="date"
                      value={eventForm.date}
                      max={todayIso()}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, date: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    />
                  </label>
                  {eventForm.event === 'submitted' && (
                    <label className="text-sm text-gray-600">
                      <span className="mb-1 block text-xs text-gray-500">
                        Channel
                      </span>
                      <select
                        value={eventForm.channel}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            channel: e.target.value as LawFirmSubmissionChannel,
                          })
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                      >
                        {(
                          Object.keys(
                            CHANNEL_LABELS
                          ) as LawFirmSubmissionChannel[]
                        ).map((k) => (
                          <option key={k} value={k}>
                            {CHANNEL_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <textarea
                  value={eventForm.note}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, note: e.target.value })
                  }
                  placeholder="Note for CompanyPension ops (optional)"
                  rows={2}
                  maxLength={1000}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={eventMutation.isPending}
                    className="rounded-lg bg-brand-dark px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                  >
                    {eventMutation.isPending ? 'Saving…' : 'Record'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventForm(null)}
                    className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
                {eventMutation.isError && (
                  <p className="text-sm text-red-600">
                    {apiErrorMessage(
                      eventMutation.error,
                      'Could not record the event'
                    )}
                  </p>
                )}
              </form>
            )}
          </div>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">No events recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((entry) => (
              <div key={entry.id} className="border-l-2 border-gray-200 pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {EVENT_LABELS[entry.event] ?? entry.event}
                  </span>
                  {entry.channel && (
                    <span className="text-xs text-gray-500">
                      via{' '}
                      {CHANNEL_LABELS[
                        entry.channel as LawFirmSubmissionChannel
                      ] ?? entry.channel}
                    </span>
                  )}
                  {entry.date && (
                    <span className="text-xs text-gray-500">
                      on {formatDate(entry.date)}
                    </span>
                  )}
                </div>
                {entry.note && (
                  <p className="mt-0.5 text-sm text-gray-600">{entry.note}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDate(entry.createdAt, true)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Correspondence */}
      <Section
        title="Correspondence from the provider"
        icon={<Inbox className="h-4 w-4" />}
      >
        {!isClosed && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (uploadFile) uploadMutation.mutate(uploadFile);
            }}
            className="mb-4 space-y-3 rounded-lg bg-gray-50 p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-gray-600">
                <span className="mb-1 block text-xs text-gray-500">
                  Scan or forwarded email (PDF, JPG, PNG, max 10 MB)
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100"
                />
              </label>
              <label className="text-sm text-gray-600">
                <span className="mb-1 block text-xs text-gray-500">
                  Received on
                </span>
                <input
                  type="date"
                  value={uploadDate}
                  max={todayIso()}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
              </label>
            </div>
            <textarea
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="Short note: what does the provider say or ask for?"
              rows={2}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!uploadFile || uploadMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
              </button>
              <span className="text-xs text-gray-400">
                CompanyPension ops are notified by email.
              </span>
            </div>
            {uploadMutation.isError && (
              <p className="text-sm text-red-600">
                {apiErrorMessage(uploadMutation.error, 'Upload failed')}
              </p>
            )}
          </form>
        )}
        {correspondence.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {correspondence.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.document?.fileName ??
                      (item.direction === 'package_out'
                        ? 'Letter package generated'
                        : item.direction === 'copy_out'
                          ? 'Copy print generated'
                          : 'Note')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.direction === 'provider_in'
                      ? 'From provider'
                      : item.direction === 'firm_note'
                        ? 'Firm note'
                        : 'From CompanyPension'}
                    {item.receivedDate
                      ? ` · received ${formatDate(item.receivedDate)}`
                      : ''}
                    {' · '}
                    {formatDate(item.createdAt, true)}
                  </p>
                  {item.note && (
                    <p className="mt-1 text-sm text-gray-600">{item.note}</p>
                  )}
                </div>
                {item.document && (
                  <button
                    onClick={() => openCorrespondence(item.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {children}
    </dl>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value || value === '—') return null;
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
