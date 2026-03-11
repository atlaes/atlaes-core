'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClaimDetail,
  updateClaimStatus,
  addNote,
  getDocumentDownloadUrl,
  ClaimDetailResponse,
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
} from 'lucide-react';

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusNote, setStatusNote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const detailQuery = useQuery({
    queryKey: ['admin-claim', id],
    queryFn: () => getClaimDetail(id),
    enabled: isAuthenticated && !!id,
  });

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

  if (authLoading || !isAuthenticated) {
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
