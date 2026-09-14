'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, MessageSquare, Clock, Scale, Inbox, FileText } from 'lucide-react';
import {
  addNote,
  getClaimCorrespondence,
  getClaimDetail,
  getCorrespondenceDownloadUrl,
  getDocumentDownloadUrl,
  getPackageDownloadUrl,
  regeneratePackage,
  setClaimRouting,
  updateClaimStatus,
  ClaimHandlingRoute,
  ClaimPayoutTarget,
} from '@/lib/admin-api';
import {
  Button,
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_TONE,
  ErrorText,
  Fact,
  FactGroup,
  Field,
  PageHeader,
  Pill,
  Spinner,
  StatusDot,
  formatBytes,
  formatDate,
  inputClass,
} from '@/components/ui';

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['processing'],
  processing: ['completed', 'rejected'],
};

const CASE_STATE_LABELS: Record<string, string> = {
  new: 'New, not downloaded yet',
  downloaded: 'Package downloaded',
  submitted: 'Sent to the provider',
  response_received: 'Response received',
  closed: 'Closed by the firm',
};

const FIRM_EVENT_LABELS: Record<string, string> = {
  downloaded: 'downloaded the package',
  submitted: 'sent the letter to the provider',
  response_received: 'recorded a response from the provider',
  closed: 'closed the case',
  reference_set: 'set the file number',
  correspondence_uploaded: 'uploaded correspondence',
};

function maskIban(iban: string | null) {
  if (!iban) return null;
  const c = iban.replace(/\s+/g, '');
  return c.length <= 8 ? c : `${c.slice(0, 4)} **** **** ${c.slice(-4)}`;
}

interface TimelineItem {
  id: string;
  at: string;
  kind: 'status' | 'handling' | 'note' | 'firm' | 'file' | 'other';
  title: string;
  body?: string | null;
  actor?: string | null;
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [statusNote, setStatusNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [routeForm, setRouteForm] = useState<{
    handlingRoute: ClaimHandlingRoute;
    payoutTarget: ClaimPayoutTarget;
    lawFirmRef: string;
    note: string;
  } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['admin-claim', id],
    queryFn: () => getClaimDetail(id),
    enabled: !!id,
  });
  const isLawFirmClaim = detailQuery.data?.claim.handlingRoute === 'law_firm';
  const exchangeQuery = useQuery({
    queryKey: ['admin-claim-correspondence', id],
    queryFn: () => getClaimCorrespondence(id),
    enabled: !!id && isLawFirmClaim,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-claim', id] });
    queryClient.invalidateQueries({ queryKey: ['admin-claim-correspondence', id] });
    queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => updateClaimStatus(id, status, note),
    onSuccess: () => {
      setSelectedStatus('');
      setStatusNote('');
      invalidate();
    },
  });
  const noteMutation = useMutation({
    mutationFn: (note: string) => addNote(id, note),
    onSuccess: () => {
      setNewNote('');
      invalidate();
    },
  });
  const routingMutation = useMutation({
    mutationFn: (input: NonNullable<typeof routeForm>) =>
      setClaimRouting(id, {
        handlingRoute: input.handlingRoute,
        payoutTarget: input.handlingRoute === 'law_firm' ? input.payoutTarget : null,
        lawFirmRef: input.handlingRoute === 'law_firm' ? input.lawFirmRef.trim() || null : null,
        note: input.note.trim() || undefined,
      }),
    onSuccess: () => {
      setRouteForm(null);
      invalidate();
    },
  });
  const regenerateMutation = useMutation({
    mutationFn: () => regeneratePackage(id),
    onSuccess: invalidate,
  });

  const open = async (fn: () => Promise<{ downloadUrl: string | null }>) => {
    setDownloadError(null);
    try {
      const r = await fn();
      if (r.downloadUrl) window.open(r.downloadUrl, '_blank', 'noopener');
      else setDownloadError('No download available in this environment.');
    } catch (e) {
      setDownloadError((e as Error).message || 'Download failed');
    }
  };

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!detailQuery.data) return [];
    const items: TimelineItem[] = detailQuery.data.workflow.map((entry) => {
      const meta = (entry.metadata ?? {}) as Record<string, any>;
      if (meta.type === 'admin_note') {
        return { id: entry.id, at: entry.createdAt, kind: 'note', title: 'Admin note', body: meta.note, actor: 'ops' };
      }
      if (meta.type === 'law_firm_event') {
        return {
          id: entry.id,
          at: entry.createdAt,
          kind: 'firm',
          title: `Law firm ${FIRM_EVENT_LABELS[String(meta.event)] ?? String(meta.event)}${meta.channel ? ` by ${meta.channel}` : ''}${meta.date ? ` on ${formatDate(meta.date)}` : ''}${meta.lawFirmRef ? ` (${meta.lawFirmRef})` : ''}`,
          body: meta.note ?? null,
          actor: 'law firm',
        };
      }
      if (meta.action === 'handling_route_update') {
        return {
          id: entry.id,
          at: entry.createdAt,
          kind: 'handling',
          title: `Handling changed to ${meta.handlingRoute === 'law_firm' ? 'law firm' : 'direct'}${meta.payoutTarget === 'law_firm' ? ', payout to Anderkonto' : ''}`,
          body: meta.note ?? null,
          actor: 'ops',
        };
      }
      return {
        id: entry.id,
        at: entry.createdAt,
        kind: 'status',
        title: entry.previousState && entry.previousState !== entry.state
          ? `Status ${CLAIM_STATUS_LABEL[entry.previousState] ?? entry.previousState} → ${CLAIM_STATUS_LABEL[entry.state] ?? entry.state}`
          : `Status ${CLAIM_STATUS_LABEL[entry.state] ?? entry.state}`,
        body: meta.note ?? null,
        actor: entry.triggeredBy,
      };
    });
    for (const c of exchangeQuery.data?.correspondence ?? []) {
      if (!c.createdAt) continue;
      items.push({
        id: `c-${c.id}`,
        at: c.createdAt,
        kind: 'file',
        title:
          c.direction === 'provider_in'
            ? `Provider correspondence uploaded: ${c.document?.fileName ?? 'file'}`
            : c.direction === 'package_out'
              ? 'Letter package generated'
              : c.direction === 'copy_out'
                ? 'Copy print generated'
                : 'Note from the firm',
        body: c.note,
        actor: c.direction === 'provider_in' ? c.uploadedBy?.email ?? 'law firm' : 'system',
      });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [detailQuery.data, exchangeQuery.data]);

  if (detailQuery.isLoading) return <Spinner full />;
  if (detailQuery.error || !detailQuery.data) {
    return (
      <PageHeader title="Claim not found" back={{ href: '/claims', label: 'Claims' }} />
    );
  }

  const { claim, documents, userInfo } = detailQuery.data;
  const name =
    claim.firstName && claim.lastName
      ? `${claim.firstName} ${claim.lastName}`
      : userInfo?.firstName && userInfo?.lastName
        ? `${userInfo.firstName} ${userInfo.lastName}`
        : 'Unnamed claimant';
  const nextStatuses = VALID_TRANSITIONS[claim.status] || [];
  const currentRoute: ClaimHandlingRoute = claim.handlingRoute ?? 'direct';
  const isBav = claim.pensionType === 'private';
  const routeLocked = !!claim.lettershopSubmissionId && currentRoute === 'direct';
  const correspondenceFiles = (exchangeQuery.data?.correspondence ?? []).filter((c) => c.document);

  return (
    <div>
      <PageHeader
        back={{ href: '/claims', label: 'Claims' }}
        title={name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {isBav ? <Pill tone="brand">bAV cash-out</Pill> : claim.pensionType === 'public' ? <Pill>Public refund</Pill> : null}
            <span>{userInfo?.email}</span>
            <span className="text-gray-400">·</span>
            <span className="font-mono text-xs">{claim.id}</span>
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Left: facts */}
        <div className="space-y-5 lg:order-1">
          {isBav && (
            <FactGroup title="bAV intake">
              <Fact label="Route" value={claim.drvRefundReceived === true ? 'A · DRV refund granted' : claim.drvRefundReceived === false ? 'B · small entitlement' : null} wide />
              <Fact label="Employer" value={claim.employerName} wide />
              <Fact label="Employment ended" value={formatDate(claim.employmentEndDate)} />
              <Fact label="Personnel no." value={claim.employerPersonnelNumber} />
              <Fact label="Provider" value={claim.bavProviderName} wide />
              <Fact label="Durchführungsweg" value={claim.bavDurchfuehrungsweg} />
              <Fact label={claim.bavContractReferenceLabel || 'Contract ref.'} value={claim.bavContractReference} />
              <Fact label="DRV office" value={claim.drvOffice} wide />
              <Fact label="DRV decision" value={formatDate(claim.drvDecisionDate)} />
              <Fact label="Statement" value={claim.bavStatementType ? `${claim.bavStatementType}${claim.bavStatementDate ? `, ${formatDate(claim.bavStatementDate)}` : ''}` : null} />
              <Fact label="Benefit" value={claim.bavBenefitAmount ? `€${claim.bavBenefitAmount} (${claim.bavBenefitForm ?? 'unknown'})` : null} />
              <Fact label="Addressee" value={claim.bavRecipientName ? `${claim.bavAddresseeType === 'employer' ? 'Employer' : 'Provider'}: ${claim.bavRecipientName}` : null} wide />
              <Fact label="Address" value={[claim.bavRecipientStreet, [claim.bavRecipientPostalCode, claim.bavRecipientCity].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null} wide />
              <Fact label="Tax ID" value={claim.taxId} />
              <Fact label="Health insurance ended" value={formatDate(claim.healthInsuranceEndDate)} />
            </FactGroup>
          )}
          <FactGroup title="Claimant">
            <Fact label="Salutation" value={claim.salutation === 'herr' ? 'Herr' : claim.salutation === 'frau' ? 'Frau' : null} />
            <Fact label="Date of birth" value={formatDate(claim.dateOfBirth)} />
            <Fact label="Nationality" value={claim.nationality} />
            <Fact label="Passport" value={claim.passportNumber} />
            <Fact label="Claim type" value={claim.claimType} />
            <Fact label="SV-Nummer" value={claim.svNummer} />
            <Fact label="Address" value={[claim.currentAddressLine1, claim.currentAddressLine2, [claim.currentPostalCode, claim.currentCity].filter(Boolean).join(' '), claim.currentCountry].filter(Boolean).join(', ') || null} wide />
            <Fact label="Last German address" value={[claim.germanStreet, [claim.germanPostalCode, claim.germanCity].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null} wide />
            <Fact label="Left Germany" value={formatDate(claim.moveOutDate)} />
            <Fact label="Abmeldung" value={claim.abmeldungMethod} />
          </FactGroup>
          <FactGroup title="Bank">
            <Fact label="Account holder" value={claim.accountHolderName} wide />
            <Fact label="Bank" value={claim.bankName} />
            <Fact label="IBAN" value={maskIban(claim.iban)} />
            <Fact label="BIC" value={claim.swiftBic} />
            <Fact label="Currency" value={claim.preferredCurrency} />
          </FactGroup>
          <FactGroup title="Payment">
            <Fact label="Status" value={claim.paymentStatus} />
            <Fact label="Paid" value={formatDate(claim.paidAt, true)} />
            <Fact label="Service fee" value={claim.serviceFee ? `€${claim.serviceFee}` : null} />
            <Fact
              label="Stripe"
              value={claim.stripePaymentId ? (
                <a className="underline" href={`https://dashboard.stripe.com/payments/${claim.stripePaymentId}`} target="_blank" rel="noopener noreferrer">
                  {claim.stripePaymentId.slice(0, 18)}…
                </a>
              ) : null}
              wide
            />
          </FactGroup>
        </div>

        {/* Center: activity */}
        <div className="min-w-0 lg:order-2">
          <div className="mb-4 flex gap-2">
            <input
              id="claim-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note for the team…"
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNote.trim()) noteMutation.mutate(newNote.trim());
              }}
            />
            <Button
              variant="primary"
              disabled={!newNote.trim() || noteMutation.isPending}
              onClick={() => newNote.trim() && noteMutation.mutate(newNote.trim())}
            >
              Note
            </Button>
          </div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Activity</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing recorded yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 pl-5">
              {timeline.map((item) => {
                const Icon =
                  item.kind === 'note' ? MessageSquare : item.kind === 'firm' ? Scale : item.kind === 'file' ? Inbox : Clock;
                return (
                  <li key={item.id} className="relative mb-5">
                    <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
                      <Icon className="h-2.5 w-2.5" />
                    </span>
                    <p className="text-sm text-gray-900">{item.title}</p>
                    {item.body && <p className="mt-0.5 whitespace-pre-line text-sm text-gray-600">{item.body}</p>}
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDate(item.at, true)}{item.actor ? ` · ${item.actor}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Right: state and actions */}
        <div className="space-y-4 lg:order-3 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</h3>
              <StatusDot tone={CLAIM_STATUS_TONE[claim.status] ?? 'neutral'}>{CLAIM_STATUS_LABEL[claim.status] ?? claim.status}</StatusDot>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Submitted {formatDate(claim.submittedAt, true)}
            </p>
            {nextStatuses.length > 0 && (
              <div className="mt-3 space-y-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={selectedStatus === s ? 'primary' : 'secondary'}
                    className="w-full justify-center"
                    onClick={() => setSelectedStatus(selectedStatus === s ? '' : s)}
                  >
                    Move to {CLAIM_STATUS_LABEL[s] ?? s}
                  </Button>
                ))}
                {selectedStatus && (
                  <div className="space-y-2 border-t border-gray-100 pt-2">
                    <textarea
                      id="status-note"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Note (optional)"
                      rows={2}
                      className={inputClass}
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ status: selectedStatus, note: statusNote || undefined })}>
                        {statusMutation.isPending ? 'Saving…' : 'Confirm'}
                      </Button>
                      <Button variant="ghost" onClick={() => { setSelectedStatus(''); setStatusNote(''); }}>Cancel</Button>
                    </div>
                    {statusMutation.isError && <ErrorText error={statusMutation.error} fallback="Could not update" />}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Handling</h3>
              {!routeForm && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={routeLocked}
                  title={routeLocked ? 'Already sent to the lettershop' : undefined}
                  onClick={() => setRouteForm({ handlingRoute: currentRoute, payoutTarget: claim.payoutTarget ?? 'client', lawFirmRef: claim.lawFirmRef ?? '', note: '' })}
                >
                  Change
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-900">
              {currentRoute === 'law_firm' ? 'Law firm (Vividius)' : 'Direct via lettershop'}
            </p>
            {currentRoute === 'law_firm' && (
              <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                <p>{CASE_STATE_LABELS[claim.lawFirmCaseState ?? 'new']}</p>
                <p>{claim.lawFirmRef ? `File number ${claim.lawFirmRef}` : 'No file number yet'}</p>
                <p>Payout to {claim.payoutTarget === 'law_firm' ? 'the Anderkonto' : 'the client'}</p>
                {claim.lawFirmSubmittedAt && <p>Sent {formatDate(claim.lawFirmSubmittedAt)}{claim.lawFirmSubmissionChannel ? ` by ${claim.lawFirmSubmissionChannel}` : ''}</p>}
                {!claim.lawFirmId && <p className="text-amber-700">Not assigned to a firm</p>}
              </div>
            )}
            {currentRoute === 'direct' && claim.lettershopSubmissionId && (
              <p className="mt-1 text-xs text-gray-500">Lettershop job {claim.lettershopSubmissionId}</p>
            )}
            {routeForm && (
              <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                <Field label="Route" htmlFor="route-select">
                  <select
                    id="route-select"
                    value={routeForm.handlingRoute}
                    onChange={(e) => setRouteForm({ ...routeForm, handlingRoute: e.target.value as ClaimHandlingRoute })}
                    className={inputClass}
                  >
                    <option value="direct">Direct via lettershop</option>
                    <option value="law_firm">Law firm (Vividius)</option>
                  </select>
                </Field>
                {routeForm.handlingRoute === 'law_firm' && (
                  <>
                    <Field label="Payout to" htmlFor="payout-select">
                      <select
                        id="payout-select"
                        value={routeForm.payoutTarget}
                        onChange={(e) => setRouteForm({ ...routeForm, payoutTarget: e.target.value as ClaimPayoutTarget })}
                        className={inputClass}
                      >
                        <option value="client">Client account</option>
                        <option value="law_firm">Law firm Anderkonto</option>
                      </select>
                    </Field>
                    <Field label="File number (Unser Zeichen)" htmlFor="ref-input">
                      <input id="ref-input" value={routeForm.lawFirmRef} onChange={(e) => setRouteForm({ ...routeForm, lawFirmRef: e.target.value })} className={inputClass} placeholder="The firm can set this later" />
                    </Field>
                  </>
                )}
                <textarea id="route-note" value={routeForm.note} onChange={(e) => setRouteForm({ ...routeForm, note: e.target.value })} placeholder="Why? (kept in the activity)" rows={2} className={inputClass} />
                <div className="flex gap-2">
                  <Button variant="primary" disabled={routingMutation.isPending} onClick={() => routingMutation.mutate(routeForm)}>
                    {routingMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => setRouteForm(null)}>Cancel</Button>
                </div>
                {routingMutation.isError && <ErrorText error={routingMutation.error} fallback="Could not save" />}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Files</h3>
            <ul className="mt-2 divide-y divide-gray-100 text-sm">
              {claim.pdfS3Key && (
                <li className="flex items-center justify-between py-1.5">
                  <span className="text-gray-900">Letter package</span>
                  <button className="text-gray-500 hover:text-brand-dark" onClick={() => open(() => getPackageDownloadUrl(id))} aria-label="Download package"><Download className="h-4 w-4" /></button>
                </li>
              )}
              {claim.copyPdfS3Key && (
                <li className="flex items-center justify-between py-1.5 text-gray-600">
                  <span>Copy print</span>
                  <span className="text-xs text-gray-400">via the portal</span>
                </li>
              )}
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-gray-900">{doc.document?.fileName ?? 'file'}</span>
                    <span className="block text-xs text-gray-500">{doc.documentRole.replace(/_/g, ' ')}</span>
                  </span>
                  {doc.document && (
                    <button className="flex-none text-gray-500 hover:text-brand-dark" onClick={() => open(() => getDocumentDownloadUrl(id, doc.document!.id))} aria-label={`Download ${doc.document.fileName}`}><Download className="h-4 w-4" /></button>
                  )}
                </li>
              ))}
              {correspondenceFiles.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-gray-900">{c.document!.fileName}</span>
                    <span className="block text-xs text-gray-500">from the provider · {formatBytes(c.document!.fileSize)}{c.receivedDate ? ` · received ${formatDate(c.receivedDate)}` : ''}</span>
                  </span>
                  <button className="flex-none text-gray-500 hover:text-brand-dark" onClick={() => open(() => getCorrespondenceDownloadUrl(id, c.id))} aria-label={`Download ${c.document!.fileName}`}><Download className="h-4 w-4" /></button>
                </li>
              ))}
              {!claim.pdfS3Key && documents.length === 0 && correspondenceFiles.length === 0 && (
                <li className="py-1.5 text-gray-400">No files yet.</li>
              )}
            </ul>
            {isBav && claim.status !== 'draft' && (
              <Button size="sm" className="mt-3 w-full justify-center" disabled={regenerateMutation.isPending} onClick={() => regenerateMutation.mutate()}>
                <FileText className="h-3.5 w-3.5" />
                {regenerateMutation.isPending ? 'Generating…' : 'Regenerate bAV package'}
              </Button>
            )}
            {regenerateMutation.isError && <div className="mt-2"><ErrorText error={regenerateMutation.error} fallback="Could not regenerate" /></div>}
            {regenerateMutation.isSuccess && regenerateMutation.data.missingPlaceholders.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">Empty placeholders: {regenerateMutation.data.missingPlaceholders.join(', ')}</p>
            )}
            {downloadError && <p className="mt-2 text-xs text-red-700">{downloadError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
