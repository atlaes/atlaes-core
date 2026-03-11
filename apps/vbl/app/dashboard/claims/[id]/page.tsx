'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import {
  getClaim,
  getClaimDocuments,
  getClaimWorkflowHistory,
  Claim,
  ClaimDocument,
  WorkflowHistoryEntry,
} from '@/lib/onboarding-api';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  LogOut,
  FileText,
  Clock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STEP_LABELS: Record<string, string> = {
  claimType: 'Claim Type',
  passportUpload: 'Passport Upload',
  currentAddress: 'Current Address',
  germanSocialInsurance: 'German Social Insurance',
  lastAddressInGermany: 'Last Address in Germany',
  bankDetails: 'Bank Details',
  signDocuments: 'Sign Documents',
  identityConfirmationForm: 'Identity Confirmation',
  reviewInformation: 'Review Information',
  finalConfirmation: 'Final Confirmation',
};

const TOTAL_STEPS = Object.keys(STEP_LABELS).length;

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  ready: {
    label: 'Ready to Submit',
    className: 'bg-[#9FE870] text-[#163300]',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700',
  },
  processing: {
    label: 'Processing',
    className: 'bg-yellow-100 text-yellow-700',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
  },
};

const DOCUMENT_ROLE_LABELS: Record<string, string> = {
  passport: 'Passport',
  payslip: 'Payslip',
  abmeldung: 'Deregistration Certificate',
  bank_statement: 'Bank Statement',
  certified_id_form: 'Certified ID Form',
};

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskIban(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  if (clean.length <= 4) return clean;
  const masked = '*'.repeat(clean.length - 4) + clean.slice(-4);
  return masked.replace(/(.{4})/g, '$1 ').trim();
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-[#163300]">{value}</p>
    </div>
  );
}

export default function ClaimDetailPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const claimId = params.id as string;

  const [claim, setClaim] = useState<Claim | null>(null);
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [error, setError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user || !claimId) return;

    Promise.all([
      getClaim(claimId),
      getClaimDocuments(claimId),
      getClaimWorkflowHistory(claimId),
    ])
      .then(([claimRes, docsRes, historyRes]) => {
        setClaim(claimRes.claim);
        setDocuments(docsRes.documents);
        setHistory(historyRes.history);
      })
      .catch(() => setError('Failed to load claim details'))
      .finally(() => setIsLoadingData(false));
  }, [user, claimId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#163300]" />
      </div>
    );
  }

  if (!user) return null;

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin h-6 w-6 text-[#163300]" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
          <div
            className="px-8 py-6"
            style={{ backgroundColor: '#163300' }}
          >
            <CompanyPensionLogo />
          </div>
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">
              {error || 'Claim not found'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm font-medium text-[#163300] hover:opacity-70"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig =
    STATUS_CONFIG[claim.status] || STATUS_CONFIG.draft;
  const displayName =
    claim.firstName && claim.lastName
      ? `${claim.firstName} ${claim.lastName}`
      : 'Untitled Application';
  const isDraft = claim.status === 'draft';
  const showProgress = isDraft || claim.status === 'ready';
  const completedSteps = claim.completedSteps || {};
  const completedCount =
    Object.values(completedSteps).filter(Boolean).length;

  const hasPersonalInfo =
    claim.firstName ||
    claim.lastName ||
    claim.dateOfBirth ||
    claim.gender ||
    claim.nationality ||
    claim.passportNumber;
  const hasAddress =
    claim.currentAddressLine1 ||
    claim.currentCity ||
    claim.currentCountry;
  const hasBankDetails =
    claim.iban || claim.accountHolderName || claim.bankName;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div
          className="px-8 py-6"
          style={{ backgroundColor: '#163300' }}
        >
          <div className="flex items-center justify-between">
            <CompanyPensionLogo />
            <button
              onClick={logout}
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Back link + title */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#163300] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#163300]">
                {displayName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {claim.submittedAt
                  ? `Submitted ${formatDate(claim.submittedAt)}`
                  : `Created ${formatDate(claim.createdAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
              {isDraft && (
                <button
                  onClick={() => {
                    localStorage.setItem(
                      'vbl_draft_claimId',
                      claim.id
                    );
                    router.push('/get-started');
                  }}
                  className="flex items-center gap-1 py-2 px-4 bg-[#9FE870] text-[#163300] font-semibold rounded-lg hover:bg-[#8AD860] transition-colors text-sm"
                >
                  Continue Application
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress checklist */}
          {showProgress && (
            <div className="border border-gray-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#163300]">
                  Progress
                </h2>
                <span className="text-xs text-gray-500">
                  {completedCount}/{TOTAL_STEPS} steps completed
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-[#9FE870] rounded-full transition-all"
                  style={{
                    width: `${Math.round((completedCount / TOTAL_STEPS) * 100)}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(STEP_LABELS).map(([key, label]) => {
                  const done = completedSteps[key] === true;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 text-sm"
                    >
                      {done ? (
                        <CheckCircle className="w-4 h-4 text-[#9FE870] shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span
                        className={
                          done ? 'text-[#163300]' : 'text-gray-400'
                        }
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personal Info */}
          {hasPersonalInfo && (
            <div className="border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-[#163300] mb-3">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField label="First Name" value={claim.firstName} />
                <InfoField label="Last Name" value={claim.lastName} />
                <InfoField
                  label="Date of Birth"
                  value={
                    claim.dateOfBirth
                      ? formatDate(claim.dateOfBirth)
                      : undefined
                  }
                />
                <InfoField label="Gender" value={claim.gender} />
                <InfoField
                  label="Nationality"
                  value={claim.nationality}
                />
                <InfoField
                  label="Passport Number"
                  value={claim.passportNumber}
                />
                <InfoField
                  label="Place of Birth"
                  value={claim.placeOfBirth}
                />
              </div>
            </div>
          )}

          {/* Address */}
          {hasAddress && (
            <div className="border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-[#163300] mb-3">
                Current Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField
                  label="Street"
                  value={claim.currentAddressLine1}
                />
                {claim.currentAddressLine2 && (
                  <InfoField
                    label="Street (Line 2)"
                    value={claim.currentAddressLine2}
                  />
                )}
                <InfoField label="City" value={claim.currentCity} />
                <InfoField
                  label="Postal Code"
                  value={claim.currentPostalCode}
                />
                <InfoField
                  label="Country"
                  value={claim.currentCountry}
                />
              </div>
            </div>
          )}

          {/* Bank Details */}
          {hasBankDetails && (
            <div className="border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-[#163300] mb-3">
                Bank Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField
                  label="Account Holder"
                  value={claim.accountHolderName}
                />
                <InfoField
                  label="IBAN"
                  value={claim.iban ? maskIban(claim.iban) : undefined}
                />
                <InfoField label="Bank Name" value={claim.bankName} />
                <InfoField
                  label="Preferred Currency"
                  value={claim.preferredCurrency}
                />
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-[#163300] mb-3">
                Documents
              </h2>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 bg-[#F0FDE4] rounded-lg px-4 py-3"
                  >
                    <FileText className="w-4 h-4 text-[#163300] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#163300] truncate">
                        {doc.document?.fileName || 'Document'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {DOCUMENT_ROLE_LABELS[doc.documentRole] ||
                          doc.documentRole}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {history.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#163300] mb-3">
                Timeline
              </h2>
              <div className="space-y-0">
                {history.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      {index < history.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-[#163300]">
                        {entry.state.replace(/_/g, ' ')}
                      </p>
                      {entry.createdAt && (
                        <p className="text-xs text-gray-500">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
