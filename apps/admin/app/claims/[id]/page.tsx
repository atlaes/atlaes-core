'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { homeForRole, useAuth } from '@/contexts/AuthContext';
import {
  getClaimDetail,
  updateClaimStatus,
  addNote,
  getDocumentDownloadUrl,
  setClaimRouting,
  getPackageDownloadUrl,
  regeneratePackage,
  getClaimCorrespondence,
  getCorrespondenceDownloadUrl,
  ClaimDetailResponse,
  ClaimHandlingRoute,
  ClaimPayoutTarget,
} from '@/lib/admin-api';
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  MapPin,
  Building,
  CreditCard,
  DollarSign,
  Clock,
  MessageSquare,
  Send,
  Scale,
  Briefcase,
  Inbox,
} from 'lucide-react';

const CASE_STATE_LABELS: Record<string, string> = {
  new: 'New (not yet downloaded)',
  downloaded: 'Package downloaded',
  submitted: 'Sent to provider',
  response_received: 'Response received',
  closed: 'Closed by the firm',
};

const FIRM_EVENT_LABELS: Record<string, string> = {
  downloaded: 'Package downloaded',
  submitted: 'Sent to provider',
  response_received: 'Response received',
  closed: 'Case closed',
  reference_set: 'File number set',
  correspondence_uploaded: 'Correspondence uploaded',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    ready: 'bg-green-100 text-green-700',
    submitted: 'bg-blue-100 text-blue-700',
    processing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskIban(iban: string | null) {
  if (!iban) return '—';
  if (iban.length <= 8) return iban;
  return iban.slice(0, 4) + ' **** **** ' + iban.slice(-4);
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['processing'],
  processing: ['completed', 'rejected'],
};

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusNote, setStatusNote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  // Handling route form (direct vs law firm). Seeded from the claim once
  // it loads; kept local until Save so a half-edited form never persists.
  const [routeForm, setRouteForm] = useState<{
    handlingRoute: ClaimHandlingRoute;
    payoutTarget: ClaimPayoutTarget;
    lawFirmRef: string;
    note: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace('/');
    else if (!isAdmin) router.replace(homeForRole(user?.role));
  }, [authLoading, isAuthenticated, isAdmin, user?.role, router]);

  const detailQuery = useQuery({
    queryKey: ['admin-claim', id],
    queryFn: () => getClaimDetail(id),
    enabled: isAdmin && !!id,
  });

  const isLawFirmClaim = detailQuery.data?.claim.handlingRoute === 'law_firm';
  const correspondenceQuery = useQuery({
    queryKey: ['admin-claim-correspondence', id],
    queryFn: () => getClaimCorrespondence(id),
    enabled: isAdmin && !!id && isLawFirmClaim,
  });

  const handleCorrespondenceDownload = async (corrId: string) => {
    try {
      const result = await getCorrespondenceDownloadUrl(id, corrId);
      if (result.downloadUrl) window.open(result.downloadUrl, '_blank');
    } catch (err) {
      console.error('Correspondence download failed:', err);
    }
  };

  const statusMutation = useMutation({
    mutationFn: ({
      status,
      note,
    }: {
      status: string;
      note?: string;
    }) => updateClaimStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claim', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      setSelectedStatus('');
      setStatusNote('');
    },
  });

  const routingMutation = useMutation({
    mutationFn: (input: {
      handlingRoute: ClaimHandlingRoute;
      payoutTarget: ClaimPayoutTarget;
      lawFirmRef: string;
      note: string;
    }) =>
      setClaimRouting(id, {
        handlingRoute: input.handlingRoute,
        payoutTarget:
          input.handlingRoute === 'law_firm' ? input.payoutTarget : null,
        lawFirmRef:
          input.handlingRoute === 'law_firm'
            ? input.lawFirmRef.trim() || null
            : null,
        note: input.note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claim', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
      setRouteForm(null);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regeneratePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claim', id] });
    },
  });

  const handlePackageDownload = async () => {
    try {
      const result = await getPackageDownloadUrl(id);
      if (result.downloadUrl) window.open(result.downloadUrl, '_blank');
    } catch (err) {
      console.error('Package download failed:', err);
    }
  };

  const noteMutation = useMutation({
    mutationFn: (note: string) => addNote(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-claim', id] });
      setNewNote('');
    },
  });

  const handleDownload = async (docId: string) => {
    try {
      const result = await getDocumentDownloadUrl(id, docId);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-gray-500">
          Claim not found or failed to load.
        </p>
        <button
          onClick={() => router.push('/claims')}
          className="mt-4 text-sm text-brand-dark underline"
        >
          Back to claims
        </button>
      </div>
    );
  }

  const { claim, documents, workflow, userInfo } = detailQuery.data;
  const nextStatuses = VALID_TRANSITIONS[claim.status] || [];
  const currentRoute: ClaimHandlingRoute = claim.handlingRoute ?? 'direct';
  const isBav = claim.pensionType === 'private';
  const routeLocked =
    !!claim.lettershopSubmissionId && currentRoute === 'direct';
  const openRouteForm = () =>
    setRouteForm({
      handlingRoute: currentRoute,
      payoutTarget: claim.payoutTarget ?? 'client',
      lawFirmRef: claim.lawFirmRef ?? '',
      note: '',
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/claims')}
          className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to claims
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-dark">
              {claim.firstName && claim.lastName
                ? `${claim.firstName} ${claim.lastName}`
                : userInfo?.firstName && userInfo?.lastName
                  ? `${userInfo.firstName} ${userInfo.lastName}`
                  : 'Unknown Applicant'}
            </h1>
            <p className="text-sm text-gray-500">
              {userInfo?.email} &middot; Claim {claim.id.slice(0, 8)}...
            </p>
          </div>
          <StatusBadge status={claim.status} />
        </div>
      </div>

      {/* Status Update */}
      {nextStatuses.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Update Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setSelectedStatus(selectedStatus === s ? '' : s)
                }
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedStatus === s
                    ? 'border-brand-dark bg-brand-dark text-white'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Move to {s}
              </button>
            ))}
          </div>
          {selectedStatus && (
            <div className="mt-3 space-y-2">
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note (optional)..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    statusMutation.mutate({
                      status: selectedStatus,
                      note: statusNote || undefined,
                    })
                  }
                  disabled={statusMutation.isPending}
                  className="rounded-lg bg-brand-dark px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                >
                  {statusMutation.isPending ? 'Updating...' : 'Confirm'}
                </button>
                <button
                  onClick={() => {
                    setSelectedStatus('');
                    setStatusNote('');
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              {statusMutation.isError && (
                <p className="text-sm text-red-600">
                  {(statusMutation.error as Error).message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Handling route */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Scale className="h-4 w-4" />
              Handling
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isBav
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-sky-100 text-sky-700'
                }`}
              >
                {isBav
                  ? 'bAV cash-out'
                  : claim.pensionType === 'public'
                    ? 'Public refund'
                    : 'Product not set'}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  currentRoute === 'law_firm'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {currentRoute === 'law_firm'
                  ? 'Law firm (Vividius)'
                  : 'Direct via lettershop'}
              </span>
              {currentRoute === 'law_firm' && (
                <span className="text-xs text-gray-500">
                  Payout to{' '}
                  {claim.payoutTarget === 'law_firm'
                    ? 'law firm Anderkonto'
                    : 'client account'}
                  {claim.lawFirmRef ? ` · Ref ${claim.lawFirmRef}` : ' · no file number yet'}
                </span>
              )}
            </div>
            {currentRoute === 'law_firm' && (
              <p className="mt-1 text-xs text-indigo-700">
                Firm case state:{' '}
                {CASE_STATE_LABELS[claim.lawFirmCaseState ?? 'new'] ??
                  claim.lawFirmCaseState}
                {claim.lawFirmSubmittedAt
                  ? ` · sent ${formatDate(claim.lawFirmSubmittedAt)}${
                      claim.lawFirmSubmissionChannel
                        ? ` by ${claim.lawFirmSubmissionChannel}`
                        : ''
                    }`
                  : ''}
                {claim.lawFirmResponseAt
                  ? ` · response ${formatDate(claim.lawFirmResponseAt)}`
                  : ''}
                {!claim.lawFirmId ? ' · not assigned to a firm (no active firm?)' : ''}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {claim.handlingRouteSetAt
                ? `Set ${formatDate(claim.handlingRouteSetAt)}`
                : 'Default; not set by ops yet'}
              {claim.lettershopSubmissionId
                ? ` · Sent to lettershop (job ${claim.lettershopSubmissionId})`
                : ''}
              {claim.pdfS3Key ? ' · Package generated' : ' · No package yet'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {claim.pdfS3Key && (
                <button
                  onClick={handlePackageDownload}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download package
                </button>
              )}
              {isBav && claim.status !== 'draft' && (
                <button
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {regenerateMutation.isPending
                    ? 'Generating...'
                    : 'Regenerate bAV package'}
                </button>
              )}
            </div>
            {regenerateMutation.isError && (
              <p className="mt-1 text-xs text-red-600">
                {(
                  (regenerateMutation.error as { response?: { data?: { error?: string } } })
                    .response?.data?.error ??
                  (regenerateMutation.error as Error).message
                )}
              </p>
            )}
            {regenerateMutation.isSuccess &&
              regenerateMutation.data.missingPlaceholders.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Generated with empty placeholders:{' '}
                  {regenerateMutation.data.missingPlaceholders.join(', ')}
                </p>
              )}
          </div>
          {!routeForm && (
            <button
              onClick={openRouteForm}
              disabled={routeLocked}
              title={
                routeLocked
                  ? 'Already sent to the lettershop; the route can no longer change'
                  : undefined
              }
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Change handling
            </button>
          )}
        </div>

        {routeForm && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'direct', label: 'Direct via lettershop' },
                  { key: 'law_firm', label: 'Law firm (Vividius)' },
                ] as { key: ClaimHandlingRoute; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() =>
                    setRouteForm({ ...routeForm, handlingRoute: opt.key })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    routeForm.handlingRoute === opt.key
                      ? 'border-brand-dark bg-brand-dark text-white'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {routeForm.handlingRoute === 'law_firm' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-gray-600">
                  <span className="mb-1 block text-xs text-gray-500">
                    Payout to
                  </span>
                  <select
                    value={routeForm.payoutTarget}
                    onChange={(e) =>
                      setRouteForm({
                        ...routeForm,
                        payoutTarget: e.target.value as ClaimPayoutTarget,
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  >
                    <option value="client">Client account</option>
                    <option value="law_firm">Law firm Anderkonto</option>
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  <span className="mb-1 block text-xs text-gray-500">
                    Law firm file number (Unser Zeichen)
                  </span>
                  <input
                    type="text"
                    value={routeForm.lawFirmRef}
                    onChange={(e) =>
                      setRouteForm({ ...routeForm, lawFirmRef: e.target.value })
                    }
                    placeholder="e.g. 2026/0815-KC"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  />
                </label>
              </div>
            )}
            <textarea
              value={routeForm.note}
              onChange={(e) =>
                setRouteForm({ ...routeForm, note: e.target.value })
              }
              placeholder="Why this route? (optional, kept in the timeline)"
              rows={2}
              className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => routingMutation.mutate(routeForm)}
                disabled={routingMutation.isPending}
                className="rounded-lg bg-brand-dark px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {routingMutation.isPending ? 'Saving...' : 'Save handling'}
              </button>
              <button
                onClick={() => setRouteForm(null)}
                className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
            {routingMutation.isError && (
              <p className="text-sm text-red-600">
                {(
                  (routingMutation.error as { response?: { data?: { error?: string } } })
                    .response?.data?.error ??
                  (routingMutation.error as Error).message
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* bAV cash-out intake */}
      {isBav && (
        <Section title="Company Pension (bAV) Cash-out" icon={<Briefcase className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Salutation" value={claim.salutation} />
            <InfoItem label="Employer" value={claim.employerName} />
            <InfoItem label="Employment Ended" value={claim.employmentEndDate} />
            <InfoItem label="Personnel No." value={claim.employerPersonnelNumber} />
            <InfoItem label="Provider" value={claim.bavProviderName} />
            <InfoItem label="Durchführungsweg" value={claim.bavDurchfuehrungsweg} />
            <InfoItem
              label={claim.bavContractReferenceLabel || 'Contract Ref.'}
              value={claim.bavContractReference}
            />
            <InfoItem label="Left Germany" value={claim.moveOutDate} />
            <InfoItem label="Tax ID" value={claim.taxId} />
            <InfoItem label="Health Insurance Ended" value={claim.healthInsuranceEndDate} />
            <InfoItem
              label="Route"
              value={
                claim.drvRefundReceived === true
                  ? 'A — DRV refund granted (§ 3 Abs. 3)'
                  : claim.drvRefundReceived === false
                    ? 'B — small entitlement (§ 3 Abs. 2)'
                    : null
              }
            />
            <InfoItem label="DRV Office" value={claim.drvOffice} />
            <InfoItem label="DRV Decision Date" value={claim.drvDecisionDate} />
            <InfoItem label="Statement" value={claim.bavStatementType} />
            <InfoItem label="Statement Date" value={claim.bavStatementDate} />
            <InfoItem label="Benefit Form" value={claim.bavBenefitForm} />
            <InfoItem
              label="Benefit Amount"
              value={claim.bavBenefitAmount ? `€${claim.bavBenefitAmount}` : null}
            />
            <InfoItem label="Addressee" value={claim.bavAddresseeType} />
            <InfoItem label="Recipient" value={claim.bavRecipientName} />
            <InfoItem
              label="Recipient Address"
              value={
                [claim.bavRecipientStreet, claim.bavRecipientPostalCode, claim.bavRecipientCity]
                  .filter(Boolean)
                  .join(', ') || null
              }
            />
          </InfoGrid>
        </Section>
      )}

      {/* Personal Info */}
      {(claim.firstName || claim.dateOfBirth || claim.nationality) && (
        <Section title="Personal Information" icon={<User className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Full Name" value={`${claim.firstName || ''} ${claim.lastName || ''}`.trim()} />
            <InfoItem label="Date of Birth" value={claim.dateOfBirth} />
            <InfoItem label="Gender" value={claim.gender} />
            <InfoItem label="Nationality" value={claim.nationality} />
            <InfoItem label="Place of Birth" value={claim.placeOfBirth} />
            <InfoItem label="Passport No." value={claim.passportNumber} />
            <InfoItem label="Claim Type" value={claim.claimType} />
            <InfoItem label="SV Nummer" value={claim.svNummer} />
          </InfoGrid>
        </Section>
      )}

      {/* Current Address */}
      {claim.currentAddressLine1 && (
        <Section title="Current Address" icon={<MapPin className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Address" value={[claim.currentAddressLine1, claim.currentAddressLine2].filter(Boolean).join(', ')} />
            <InfoItem label="City" value={claim.currentCity} />
            <InfoItem label="Postal Code" value={claim.currentPostalCode} />
            <InfoItem label="Country" value={claim.currentCountry} />
          </InfoGrid>
        </Section>
      )}

      {/* German Address */}
      {claim.germanStreet && (
        <Section title="German Address" icon={<Building className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Street" value={claim.germanStreet} />
            <InfoItem label="City" value={claim.germanCity} />
            <InfoItem label="Postal Code" value={claim.germanPostalCode} />
            <InfoItem label="Move Out Date" value={claim.moveOutDate} />
            <InfoItem label="Abmeldung Method" value={claim.abmeldungMethod} />
          </InfoGrid>
        </Section>
      )}

      {/* Bank Details */}
      {claim.accountHolderName && (
        <Section title="Bank Details" icon={<CreditCard className="h-4 w-4" />}>
          <InfoGrid>
            <InfoItem label="Account Holder" value={claim.accountHolderName} />
            <InfoItem label="Bank Name" value={claim.bankName} />
            <InfoItem label="IBAN" value={maskIban(claim.iban)} />
            <InfoItem label="SWIFT/BIC" value={claim.swiftBic} />
            <InfoItem label="Currency" value={claim.preferredCurrency} />
          </InfoGrid>
        </Section>
      )}

      {/* Payment */}
      <Section title="Payment" icon={<DollarSign className="h-4 w-4" />}>
        <InfoGrid>
          <InfoItem
            label="Payment Status"
            value={claim.paymentStatus}
          />
          <InfoItem label="Amount" value="€199.00" />
          <InfoItem label="Paid At" value={formatDate(claim.paidAt)} />
          <InfoItem label="Service Fee" value={claim.serviceFee ? `€${claim.serviceFee}` : null} />
        </InfoGrid>
        {claim.stripePaymentId && (
          <div className="mt-3">
            <dt className="text-xs text-gray-500">Stripe Payment ID</dt>
            <dd className="text-sm">
              <a
                href={`https://dashboard.stripe.com/payments/${claim.stripePaymentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-dark underline hover:text-opacity-80"
              >
                {claim.stripePaymentId}
              </a>
            </dd>
          </div>
        )}
      </Section>

      {/* Documents */}
      {documents.length > 0 && (
        <Section title="Documents" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {doc.document?.fileName || 'Unknown file'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Role: {doc.documentRole} &middot;{' '}
                    {doc.document?.fileType}
                  </p>
                </div>
                <button
                  onClick={() =>
                    doc.document && handleDownload(doc.document.id)
                  }
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Law firm exchange */}
      {isLawFirmClaim && (
        <Section title="Law firm exchange" icon={<Inbox className="h-4 w-4" />}>
          {correspondenceQuery.isLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Correspondence
              </h4>
              {(correspondenceQuery.data?.correspondence.length ?? 0) === 0 ? (
                <p className="mb-4 text-sm text-gray-400">
                  Nothing exchanged yet.
                </p>
              ) : (
                <div className="mb-4 space-y-2">
                  {correspondenceQuery.data!.correspondence.map((item) => (
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
                            ? `From provider, uploaded by ${item.uploadedBy?.email ?? 'the firm'}`
                            : item.direction === 'firm_note'
                              ? 'Firm note'
                              : 'Outgoing'}
                          {item.receivedDate ? ` · received ${item.receivedDate}` : ''}
                          {' · '}
                          {formatDate(item.createdAt)}
                        </p>
                        {item.note && (
                          <p className="mt-1 text-sm text-gray-600">{item.note}</p>
                        )}
                      </div>
                      {item.document && (
                        <button
                          onClick={() => handleCorrespondenceDownload(item.id)}
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
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Case events recorded by the firm
              </h4>
              {(correspondenceQuery.data?.events.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-400">No events yet.</p>
              ) : (
                <div className="space-y-2">
                  {correspondenceQuery.data!.events.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-indigo-200 pl-4">
                      <p className="text-sm font-medium text-gray-700">
                        {FIRM_EVENT_LABELS[entry.event] ?? entry.event}
                        {entry.channel ? ` via ${entry.channel}` : ''}
                        {entry.date ? ` on ${entry.date}` : ''}
                      </p>
                      {entry.note && (
                        <p className="text-sm text-gray-600">{entry.note}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(entry.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {/* Admin Notes */}
      <Section title="Notes & Workflow" icon={<MessageSquare className="h-4 w-4" />}>
        {/* Add note form */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newNote.trim()) {
                  noteMutation.mutate(newNote.trim());
                }
              }}
            />
            <button
              onClick={() => {
                if (newNote.trim()) noteMutation.mutate(newNote.trim());
              }}
              disabled={!newNote.trim() || noteMutation.isPending}
              className="flex items-center gap-1 rounded-lg bg-brand-dark px-3 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {workflow.map((entry) => {
            const meta = entry.metadata as Record<string, any> | null;
            const isNote = meta?.type === 'admin_note';
            const isFirmEvent = meta?.type === 'law_firm_event';
            const note = meta?.note;

            return (
              <div
                key={entry.id}
                className="flex gap-3 border-l-2 border-gray-200 pl-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isNote ? (
                      <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {isNote
                        ? 'Admin Note'
                        : isFirmEvent
                          ? `Law firm: ${FIRM_EVENT_LABELS[String(meta?.event)] ?? meta?.event}`
                          : meta?.action === 'handling_route_update'
                            ? `Handling: ${meta.previousRoute} → ${meta.handlingRoute}`
                            : entry.previousState
                              ? `${entry.previousState} → ${entry.state}`
                              : entry.state}
                    </span>
                    <span className="text-xs text-gray-400">
                      by {entry.triggeredBy || 'system'}
                    </span>
                  </div>
                  {note && (
                    <p className="mt-0.5 text-sm text-gray-600">{note}</p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
