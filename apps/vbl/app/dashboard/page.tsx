'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getUserClaims, Claim } from '@/lib/onboarding-api';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import {
  Loader2,
  User,
  Mail,
  Calendar,
  MapPin,
  Phone,
  LogOut,
  Plus,
  ArrowRight,
  CheckCircle,
  Eye,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getCompletedCount(
  steps: Record<string, boolean> | string[] | undefined
): number {
  if (!steps) return 0;
  if (Array.isArray(steps)) return steps.length;
  return Object.values(steps).filter(Boolean).length;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon?: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
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
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
  },
};

const TOTAL_STEPS = 10;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);
  const [claimsError, setClaimsError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    getUserClaims()
      .then((res) => setClaims(res.claims))
      .catch(() => setClaimsError('Failed to load applications'))
      .finally(() => setIsLoadingClaims(false));
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#163300]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Dark Green Header */}
        <div className="px-8 py-6" style={{ backgroundColor: '#163300' }}>
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

        {/* Content Area */}
        <div className="p-8">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#163300]">
              Welcome back
              {user.profile?.firstName ? `, ${user.profile.firstName}` : ''}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your pension refund applications
            </p>
          </div>

          {/* Claims Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#163300]">
                Your Applications
              </h2>
              <button
                onClick={() => router.push('/get-started')}
                className="flex items-center gap-2 py-2 px-4 bg-[#9FE870] text-[#163300] font-semibold rounded-lg hover:bg-[#8AD860] transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New Application
              </button>
            </div>

            {isLoadingClaims ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin h-6 w-6 text-[#163300] mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  Loading applications...
                </p>
              </div>
            ) : claimsError ? (
              <div className="text-center py-12">
                <p className="text-red-600 text-sm">{claimsError}</p>
              </div>
            ) : claims.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="w-16 h-16 bg-[#F0FDE4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-[#163300]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#163300] mb-2">
                  Ready to start your German pension refund?
                </h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Start your application and we'll guide you through every step
                  of the process.
                </p>
                <button
                  onClick={() => router.push('/get-started')}
                  className="inline-flex items-center gap-2 py-3 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg hover:bg-[#8AD860] transition-colors"
                >
                  Start New Application
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Claims List */
              <div className="space-y-4">
                {claims.map((claim) => {
                  const statusConfig =
                    STATUS_CONFIG[claim.status] || STATUS_CONFIG.draft;
                  const completedCount = getCompletedCount(
                    claim.completedSteps
                  );
                  const progressPercent = Math.round(
                    (completedCount / TOTAL_STEPS) * 100
                  );
                  const displayName =
                    claim.firstName && claim.lastName
                      ? `${claim.firstName} ${claim.lastName}`
                      : 'Untitled Application';
                  const isDraft = claim.status === 'draft';
                  const dateLabel =
                    claim.submittedAt
                      ? `Submitted ${formatDate(claim.submittedAt)}`
                      : `Created ${formatDate(claim.createdAt)}`;
                  const subtitle = isDraft && claim.currentCountry
                    ? `${dateLabel} · ${claim.currentCountry}`
                    : dateLabel;

                  return (
                    <div
                      key={claim.id}
                      onClick={() =>
                        router.push(`/dashboard/claims/${claim.id}`)
                      }
                      className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-[#163300]">
                            {displayName}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {subtitle}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Progress Bar (drafts & ready only) */}
                      {(isDraft || claim.status === 'ready') && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>
                              {completedCount}/{TOTAL_STEPS} steps
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#9FE870] rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center gap-4">
                        {isDraft && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              localStorage.setItem(
                                'vbl_draft_claimId',
                                claim.id
                              );
                              router.push('/get-started');
                            }}
                            className="flex items-center gap-1 text-sm font-medium text-[#163300] hover:opacity-70 transition-opacity"
                          >
                            Continue Application
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/claims/${claim.id}`
                            );
                          }}
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#163300] transition-colors ml-auto"
                        >
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profile Section */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-[#163300] mb-4">
              Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-[#163300]">
                    {user.email}
                  </p>
                </div>
              </div>

              {user.profile?.firstName && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-[#163300]">
                      {user.profile.firstName} {user.profile.lastName}
                    </p>
                  </div>
                </div>
              )}

              {user.profile?.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="text-sm font-medium text-[#163300]">
                      {user.profile.dateOfBirth}
                    </p>
                  </div>
                </div>
              )}

              {user.profile?.nationality && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Nationality</p>
                    <p className="text-sm font-medium text-[#163300]">
                      {user.profile.nationality}
                    </p>
                  </div>
                </div>
              )}

              {user.profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-[#163300]">
                      {user.profile.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
