'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Clock, Scale, Inbox, FileText, Eye, Copy, Check } from 'lucide-react';
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
  Field,
  Pill,
  Spinner,
  StatusDot,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  formatBytes,
  formatDate,
  inputClass,
} from '@/components/ui';
import { DocumentViewer, ViewerDoc } from '@/components/DocumentViewer';

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

const ROLE_LABELS: Record<string, string> = {
  passport: 'Passport',
  payslip: 'Payslip',
  abmeldung: 'Abmeldung',
  bank_statement: 'Bank statement',
  certified_id_form: 'Certified ID form',
  health_insurance: 'Health insurance',
  drv_refund_decision: 'DRV refund decision',
  pension_statement: 'Pension statement',
  provider_form: 'Provider form',
  employer_consent: 'Employer consent',
  employment_end_proof: 'Employment end proof',
  foreign_health_insurance: 'Foreign health insurance',
  bank_proof: 'Bank proof',
};

function maskIban(iban: string | null) {
  if (!iban) return null;
  const c = iban.replace(/\s+/g, '');
  return c.length <= 8 ? c : `${c.slice(0, 4)} **** **** ${c.slice(-4)}`;
}

interface TimelineItem {
  id: string;
  at: string;
  kind: 'status' | 'handling' | 'note' | 'firm' | 'file';
  title: string;
  body?: string | null;
  actor?: string | null;
}

/** Flat label/value row, Stripe-style: label left in grey, value right. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-gray-900">{value}</dd>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-200 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function RailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-200 pt-3">
      <h3 className="mb-1 text-sm font-semibold text-gray-900">{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

function RailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="py-1">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="break-words text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(id).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-brand-dark"
      title="Copy claim id"
    >
      {id}
      {done ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [composing, setComposing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [routeForm, setRouteForm] = useState<{ handlingRoute: ClaimHandlingRoute; payoutTarget: ClaimPayoutTarget; lawFirmRef: string; note: string } | null>(null);
  const [viewer, setViewer] = useState<ViewerDoc | null>(null);

  const detailQuery = useQuery({ queryKey: ['admin-claim', id], queryFn: () => getClaimDetail(id), enabled: !!id });
  const isLawFirmClaim = detailQuery.data?.claim.handlingRoute === 'law_firm';
  const exchangeQuery = useQuery({ queryKey: ['admin-claim-correspondence', id], queryFn: () => getClaimCorrespondence(id), enabled: !!id && isLawFirmClaim });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-claim', id] });
    queryClient.invalidateQueries({ queryKey: ['admin-claim-correspondence', id] });
    queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => updateClaimStatus(id, status, note),
    onSuccess: () => { setPendingStatus(null); setStatusNote(''); invalidate(); },
  });
  const noteMutation = useMutation({
    mutationFn: (note: string) => addNote(id, note),
    onSuccess: () => { setNewNote(''); setComposing(false); invalidate(); },
  });
  const routingMutation = useMutation({
    mutationFn: (input: NonNullable<typeof routeForm>) =>
      setClaimRouting(id, {
        handlingRoute: input.handlingRoute,
        payoutTarget: input.handlingRoute === 'law_firm' ? input.payoutTarget : null,
        lawFirmRef: input.handlingRoute === 'law_firm' ? input.lawFirmRef.trim() || null : null,
        note: input.note.trim() || undefined,
      }),
    onSuccess: () => { setRouteForm(null); invalidate(); },
  });
  const regenerateMutation = useMutation({ mutationFn: () => regeneratePackage(id), onSuccess: invalidate });

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!detailQuery.data) return [];
    const items: TimelineItem[] = detailQuery.data.workflow.map((entry) => {
      const meta = (entry.metadata ?? {}) as Record<string, any>;
      if (meta.type === 'admin_note') return { id: entry.id, at: entry.createdAt, kind: 'note', title: 'Note', body: meta.note, actor: 'ops' };
      if (meta.type === 'law_firm_event') {
        return {
          id: entry.id, at: entry.createdAt, kind: 'firm',
          title: `Law firm ${FIRM_EVENT_LABELS[String(meta.event)] ?? String(meta.event)}${meta.channel ? ` by ${meta.channel}` : ''}${meta.date ? ` on ${formatDate(meta.date)}` : ''}${meta.lawFirmRef ? ` (${meta.lawFirmRef})` : ''}`,
          body: meta.note ?? null, actor: 'law firm',
        };
      }
      if (meta.action === 'handling_route_update') {
        return { id: entry.id, at: entry.createdAt, kind: 'handling', title: `Handling changed to ${meta.handlingRoute === 'law_firm' ? 'law firm' : 'direct'}${meta.payoutTarget === 'law_firm' ? ', payout to Anderkonto' : ''}`, body: meta.note ?? null, actor: 'ops' };
      }
      return {
        id: entry.id, at: entry.createdAt, kind: 'status',
        title: entry.previousState && entry.previousState !== entry.state ? `${CLAIM_STATUS_LABEL[entry.previousState] ?? entry.previousState} → ${CLAIM_STATUS_LABEL[entry.state] ?? entry.state}` : `${CLAIM_STATUS_LABEL[entry.state] ?? entry.state}`,
        body: meta.note ?? null, actor: entry.triggeredBy,
      };
    });
    for (const c of exchangeQuery.data?.correspondence ?? []) {
      if (!c.createdAt) continue;
      items.push({
        id: `c-${c.id}`, at: c.createdAt, kind: 'file',
        title: c.direction === 'provider_in' ? `Provider correspondence uploaded: ${c.document?.fileName ?? 'file'}` : c.direction === 'package_out' ? 'Letter package generated' : c.direction === 'copy_out' ? 'Copy print generated' : 'Note from the firm',
        body: c.note, actor: c.direction === 'provider_in' ? c.uploadedBy?.email ?? 'law firm' : 'system',
      });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [detailQuery.data, exchangeQuery.data]);

  if (detailQuery.isLoading) return <Spinner full />;
  if (detailQuery.error || !detailQuery.data) return <p className="text-sm text-gray-500">Claim not found.</p>;

  const { claim, documents, userInfo } = detailQuery.data;
  const name = claim.firstName && claim.lastName ? `${claim.firstName} ${claim.lastName}` : userInfo?.firstName && userInfo?.lastName ? `${userInfo.firstName} ${userInfo.lastName}` : 'Unnamed claimant';
  const nextStatuses = VALID_TRANSITIONS[claim.status] || [];
  const currentRoute: ClaimHandlingRoute = claim.handlingRoute ?? 'direct';
  const isBav = claim.pensionType === 'private';
  const routeLocked = !!claim.lettershopSubmissionId && currentRoute === 'direct';
  const correspondenceFiles = (exchangeQuery.data?.correspondence ?? []).filter((c) => c.document);

  const openRouteForm = () => setRouteForm({ handlingRoute: currentRoute, payoutTarget: claim.payoutTarget ?? 'client', lawFirmRef: claim.lawFirmRef ?? '', note: '' });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          Claim · {isBav ? 'bAV cash-out' : claim.pensionType === 'public' ? 'Public refund' : 'Product not set'}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold text-gray-900">
              {name}
              <StatusDot tone={CLAIM_STATUS_TONE[claim.status] ?? 'neutral'}>{CLAIM_STATUS_LABEL[claim.status] ?? claim.status}</StatusDot>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {userInfo?.email}
              {claim.submittedAt ? ` · submitted ${formatDate(claim.submittedAt, true)}` : ' · not submitted'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {nextStatuses.map((s) => (
              <Button key={s} variant={s === 'rejected' ? 'danger' : 'primary'} onClick={() => setPendingStatus(pendingStatus === s ? null : s)}>
                {s === 'processing' ? 'Move to processing' : s === 'completed' ? 'Mark completed' : 'Reject'}
              </Button>
            ))}
            <Button onClick={openRouteForm} disabled={routeLocked || !!routeForm} title={routeLocked ? 'Already sent to the lettershop' : undefined}>Change handling</Button>
            {isBav && claim.status !== 'draft' && (
              <Button disabled={regenerateMutation.isPending} onClick={() => regenerateMutation.mutate()}>{regenerateMutation.isPending ? 'Generating…' : 'Regenerate package'}</Button>
            )}
          </div>
        </div>
        {pendingStatus && (
          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-white p-3">
            <div className="min-w-[240px] flex-1">
              <Field label={`Note for “${CLAIM_STATUS_LABEL[pendingStatus] ?? pendingStatus}” (optional)`} htmlFor="status-note">
                <input id="status-note" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className={inputClass} autoFocus />
              </Field>
            </div>
            <Button variant="primary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ status: pendingStatus, note: statusNote || undefined })}>{statusMutation.isPending ? 'Saving…' : 'Confirm'}</Button>
            <Button variant="ghost" onClick={() => { setPendingStatus(null); setStatusNote(''); }}>Cancel</Button>
            {statusMutation.isError && <div className="w-full"><ErrorText error={statusMutation.error} fallback="Could not update" /></div>}
          </div>
        )}
        {routeForm && (
          <div className="mt-3 space-y-3 rounded-md border border-gray-200 bg-white p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Handling" htmlFor="route-select">
                <select id="route-select" value={routeForm.handlingRoute} onChange={(e) => setRouteForm({ ...routeForm, handlingRoute: e.target.value as ClaimHandlingRoute })} className={inputClass}>
                  <option value="direct">Direct via lettershop</option>
                  <option value="law_firm">Law firm (Vividius)</option>
                </select>
              </Field>
              {routeForm.handlingRoute === 'law_firm' && (
                <>
                  <Field label="Payout to" htmlFor="payout-select">
                    <select id="payout-select" value={routeForm.payoutTarget} onChange={(e) => setRouteForm({ ...routeForm, payoutTarget: e.target.value as ClaimPayoutTarget })} className={inputClass}>
                      <option value="client">Client account</option>
                      <option value="law_firm">Law firm Anderkonto</option>
                    </select>
                  </Field>
                  <Field label="File number (Unser Zeichen)" htmlFor="ref-input">
                    <input id="ref-input" value={routeForm.lawFirmRef} onChange={(e) => setRouteForm({ ...routeForm, lawFirmRef: e.target.value })} className={inputClass} placeholder="The firm can set this later" />
                  </Field>
                </>
              )}
            </div>
            <input id="route-note" value={routeForm.note} onChange={(e) => setRouteForm({ ...routeForm, note: e.target.value })} placeholder="Why? (kept in the timeline)" className={inputClass} />
            <div className="flex gap-2">
              <Button variant="primary" disabled={routingMutation.isPending} onClick={() => routingMutation.mutate(routeForm)}>{routingMutation.isPending ? 'Saving…' : 'Save handling'}</Button>
              <Button variant="ghost" onClick={() => setRouteForm(null)}>Cancel</Button>
            </div>
            {routingMutation.isError && <ErrorText error={routingMutation.error} fallback="Could not save" />}
          </div>
        )}
        {regenerateMutation.isError && <div className="mt-2"><ErrorText error={regenerateMutation.error} fallback="Could not regenerate" /></div>}
        {regenerateMutation.isSuccess && regenerateMutation.data.missingPlaceholders.length > 0 && (
          <p className="mt-2 text-xs text-amber-700">Package generated with empty placeholders: {regenerateMutation.data.missingPlaceholders.join(', ')}</p>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main */}
        <div className="min-w-0 space-y-8">
          <Section
            title="Timeline"
            action={!composing && <Button size="sm" onClick={() => setComposing(true)}><MessageSquare className="h-3.5 w-3.5" />Add note</Button>}
          >
            {composing && (
              <div className="mb-4 rounded-md border border-gray-200 bg-white p-3">
                <textarea id="claim-note" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note for the team…" rows={3} className={inputClass} autoFocus />
                <div className="mt-2 flex gap-2">
                  <Button variant="primary" size="sm" disabled={!newNote.trim() || noteMutation.isPending} onClick={() => noteMutation.mutate(newNote.trim())}>Add note</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setComposing(false); setNewNote(''); }}>Cancel</Button>
                </div>
                {noteMutation.isError && <ErrorText error={noteMutation.error} fallback="Could not add the note" />}
              </div>
            )}
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((item) => {
                  const Icon = item.kind === 'note' ? MessageSquare : item.kind === 'firm' ? Scale : item.kind === 'file' ? Inbox : Clock;
                  return (
                    <li key={item.id} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gray-100 text-gray-500"><Icon className="h-3 w-3" /></span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900">{item.title}</p>
                        {item.body && <p className="whitespace-pre-line text-sm text-gray-600">{item.body}</p>}
                        <p className="text-xs text-gray-400">{formatDate(item.at, true)}{item.actor ? ` · ${item.actor}` : ''}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>

          {isBav && (
            <Section title="bAV intake">
              <dl className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <Row label="Route" value={claim.drvRefundReceived === true ? 'A · DRV refund granted (§ 3 Abs. 3)' : claim.drvRefundReceived === false ? 'B · small entitlement (§ 3 Abs. 2)' : null} />
                  <Row label="Employer" value={claim.employerName} />
                  <Row label="Employment ended" value={formatDate(claim.employmentEndDate)} />
                  <Row label="Personnel no." value={claim.employerPersonnelNumber} />
                  <Row label="Provider" value={claim.bavProviderName} />
                  <Row label="Durchführungsweg" value={claim.bavDurchfuehrungsweg} />
                  <Row label={claim.bavContractReferenceLabel || 'Contract ref.'} value={claim.bavContractReference} />
                </div>
                <div>
                  <Row label="DRV office" value={claim.drvOffice} />
                  <Row label="DRV decision" value={formatDate(claim.drvDecisionDate)} />
                  <Row label="Statement" value={claim.bavStatementType ? `${claim.bavStatementType}${claim.bavStatementDate ? `, ${formatDate(claim.bavStatementDate)}` : ''}` : null} />
                  <Row label="Benefit" value={claim.bavBenefitAmount ? `€${claim.bavBenefitAmount} (${claim.bavBenefitForm ?? 'unknown'})` : null} />
                  <Row label="Addressee" value={claim.bavRecipientName ? `${claim.bavAddresseeType === 'employer' ? 'Employer' : 'Provider'}: ${claim.bavRecipientName}${claim.bavRecipientDepartment ? `, ${claim.bavRecipientDepartment}` : ''}` : null} />
                  <Row label="Address" value={[claim.bavRecipientStreet, [claim.bavRecipientPostalCode, claim.bavRecipientCity].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null} />
                  <Row label="Their reference" value={claim.bavRecipientRef} />
                  <Row label="Tax ID" value={claim.taxId} />
                  <Row label="Health insurance ended" value={formatDate(claim.healthInsuranceEndDate)} />
                </div>
              </dl>
            </Section>
          )}

          <Section title="Claim details">
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <Row label="Claim type" value={claim.claimType} />
                <Row label="Salutation" value={claim.salutation === 'herr' ? 'Herr' : claim.salutation === 'frau' ? 'Frau' : null} />
                <Row label="Date of birth" value={formatDate(claim.dateOfBirth)} />
                <Row label="Place of birth" value={claim.placeOfBirth} />
                <Row label="Nationality" value={claim.nationality} />
                <Row label="Passport" value={claim.passportNumber ? `${claim.passportNumber}${claim.passportExpiryDate ? `, expires ${formatDate(claim.passportExpiryDate)}` : ''}` : null} />
                <Row label="SV-Nummer" value={claim.svNummer} />
              </div>
              <div>
                <Row label="Address" value={[claim.currentAddressLine1, claim.currentAddressLine2, [claim.currentPostalCode, claim.currentCity].filter(Boolean).join(' '), claim.currentCountry].filter(Boolean).join(', ') || null} />
                <Row label="Last German address" value={[claim.germanStreet, [claim.germanPostalCode, claim.germanCity].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null} />
                <Row label="Left Germany" value={formatDate(claim.moveOutDate)} />
                <Row label="Abmeldung" value={claim.abmeldungMethod} />
                <Row label="Health insurance" value={claim.healthInsuranceProviderName ? `${claim.healthInsuranceProviderName}${claim.healthInsuranceType ? ` (${claim.healthInsuranceType})` : ''}` : claim.healthInsuranceType} />
                <Row label="Identity verified" value={claim.identityVerifiedAt ? `${formatDate(claim.identityVerifiedAt)}${claim.certifyingAuthority ? ` by ${claim.certifyingAuthority.replace(/_/g, ' ')}` : ''}` : null} />
              </div>
            </dl>
          </Section>

          <Section title="Bank and payment">
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <Row label="Account holder" value={claim.accountHolderName} />
                <Row label="Bank" value={claim.bankName} />
                <Row label="IBAN" value={maskIban(claim.iban)} />
                <Row label="BIC" value={claim.swiftBic} />
                <Row label="Currency" value={claim.preferredCurrency} />
              </div>
              <div>
                <Row label="Payment" value={claim.paymentStatus ? <StatusDot tone={claim.paymentStatus === 'paid' ? 'good' : claim.paymentStatus === 'failed' ? 'bad' : 'wait'}>{claim.paymentStatus}</StatusDot> : null} />
                <Row label="Paid" value={formatDate(claim.paidAt, true)} />
                <Row label="Service fee" value={claim.serviceFee ? `€${claim.serviceFee}` : null} />
                <Row label="Stripe" value={claim.stripePaymentId ? <a className="underline" href={`https://dashboard.stripe.com/payments/${claim.stripePaymentId}`} target="_blank" rel="noopener noreferrer">{claim.stripePaymentId}</a> : null} />
                <Row label="Deregistration service" value={claim.deregistrationServiceRequested ? 'requested' : null} />
              </div>
            </dl>
          </Section>

          <Section title="Documents">
            {!claim.pdfS3Key && documents.length === 0 && correspondenceFiles.length === 0 ? (
              <p className="text-sm text-gray-400">No files yet.</p>
            ) : (
              <Table minWidth={560}>
                <TableHead>
                  <Th>File</Th>
                  <Th>Type</Th>
                  <Th>Added</Th>
                  <Th align="right"></Th>
                </TableHead>
                <TableBody>
                  {claim.pdfS3Key && (
                    <tr>
                      <Td><span className="text-gray-900">Letter package</span></Td>
                      <Td className="text-gray-600">{isBav ? 'bAV Abfindung package' : 'VBL package'}</Td>
                      <Td className="tabular-nums text-gray-600">{formatDate(claim.updatedAt)}</Td>
                      <Td align="right">
                        <Button size="sm" variant="ghost" onClick={() => setViewer({ title: 'Letter package', subtitle: name, fileType: 'application/pdf', load: () => getPackageDownloadUrl(id) })}><Eye className="h-3.5 w-3.5" />Preview</Button>
                      </Td>
                    </tr>
                  )}
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <Td nowrap={false}><span className="text-gray-900">{doc.document?.fileName ?? 'file'}</span></Td>
                      <Td className="text-gray-600">{ROLE_LABELS[doc.documentRole] ?? doc.documentRole.replace(/_/g, ' ')}</Td>
                      <Td className="tabular-nums text-gray-600">{formatDate(doc.createdAt)}</Td>
                      <Td align="right">
                        {doc.document && (
                          <Button size="sm" variant="ghost" onClick={() => setViewer({ title: doc.document!.fileName, subtitle: ROLE_LABELS[doc.documentRole] ?? doc.documentRole, fileType: doc.document!.fileType, load: () => getDocumentDownloadUrl(id, doc.document!.id) })}><Eye className="h-3.5 w-3.5" />Preview</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                  {correspondenceFiles.map((c) => (
                    <tr key={c.id}>
                      <Td nowrap={false}>
                        <span className="text-gray-900">{c.document!.fileName}</span>
                        {c.note && <span className="block text-xs text-gray-500">{c.note}</span>}
                      </Td>
                      <Td className="text-gray-600">From provider via law firm{c.receivedDate ? ` · received ${formatDate(c.receivedDate)}` : ''}</Td>
                      <Td className="tabular-nums text-gray-600">{formatDate(c.createdAt)}</Td>
                      <Td align="right">
                        <Button size="sm" variant="ghost" onClick={() => setViewer({ title: c.document!.fileName, subtitle: `From the provider · ${formatBytes(c.document!.fileSize)}`, fileType: c.document!.fileType, load: () => getCorrespondenceDownloadUrl(id, c.id) })}><Eye className="h-3.5 w-3.5" />Preview</Button>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </div>

        {/* Details rail */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <RailGroup title="Details">
            <RailRow label="Claim ID" value={<CopyId id={claim.id} />} />
            <RailRow label="Product" value={isBav ? <Pill tone="brand">bAV cash-out</Pill> : claim.pensionType === 'public' ? <Pill>Public refund</Pill> : 'Not set'} />
            <RailRow label="Status" value={<StatusDot tone={CLAIM_STATUS_TONE[claim.status] ?? 'neutral'}>{CLAIM_STATUS_LABEL[claim.status] ?? claim.status}</StatusDot>} />
            <RailRow label="Workflow step" value={claim.workflowState.replace(/_/g, ' ')} />
            <RailRow label="Created" value={formatDate(claim.createdAt, true)} />
            <RailRow label="Last updated" value={formatDate(claim.updatedAt, true)} />
          </RailGroup>

          <RailGroup title="Handling">
            <RailRow label="Route" value={currentRoute === 'law_firm' ? 'Law firm (Vividius)' : 'Direct via lettershop'} />
            {currentRoute === 'law_firm' ? (
              <>
                <RailRow label="Firm case state" value={CASE_STATE_LABELS[claim.lawFirmCaseState ?? 'new']} />
                <RailRow label="File number" value={claim.lawFirmRef ?? <span className="text-amber-700">not set yet</span>} />
                <RailRow label="Payout to" value={claim.payoutTarget === 'law_firm' ? 'Anderkonto' : 'Client account'} />
                <RailRow label="Assigned" value={formatDate(claim.lawFirmAssignedAt, true)} />
                <RailRow label="Downloaded" value={formatDate(claim.lawFirmDownloadedAt, true)} />
                <RailRow label="Sent to provider" value={claim.lawFirmSubmittedAt ? `${formatDate(claim.lawFirmSubmittedAt)}${claim.lawFirmSubmissionChannel ? ` by ${claim.lawFirmSubmissionChannel}` : ''}` : null} />
                <RailRow label="Response" value={formatDate(claim.lawFirmResponseAt)} />
                <RailRow label="Closed" value={formatDate(claim.lawFirmClosedAt)} />
                {!claim.lawFirmId && <RailRow label="Warning" value={<span className="text-amber-700">Not assigned to a firm</span>} />}
              </>
            ) : (
              <>
                <RailRow label="Lettershop job" value={claim.lettershopSubmissionId} />
                <RailRow label="Package" value={claim.pdfS3Key ? 'generated' : 'not generated'} />
              </>
            )}
            <RailRow label="Set" value={claim.handlingRouteSetAt ? formatDate(claim.handlingRouteSetAt, true) : 'default, not set by ops'} />
          </RailGroup>

          <RailGroup title="Claimant">
            <RailRow label="Name" value={name} />
            <RailRow label="Email" value={userInfo?.email} />
            <RailRow label="Account" value={userInfo?.firstName || userInfo?.lastName ? `${userInfo?.firstName ?? ''} ${userInfo?.lastName ?? ''}`.trim() : null} />
            <RailRow label="Country" value={claim.currentCountry} />
          </RailGroup>
        </aside>
      </div>

      <DocumentViewer doc={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}
