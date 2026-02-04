'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { claimsApi, Claim } from '@/lib/claims-api';

export default function ClaimsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=/claims');
      return;
    }

    if (user) {
      loadClaims();
    }
  }, [user, authLoading, router]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await claimsApi.getClaims();
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClaim = () => {
    // Navigate to intro screens first
    router.push('/claims/new');
  };

  const getStatusIcon = (status: Claim['status']) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: Claim['status']) => {
    switch (status) {
      case 'draft':
        return 'In Progress';
      case 'submitted':
        return 'Submitted';
      case 'processing':
        return 'Under Review';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Requires Attention';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="claims-page-loading">
        <div className="claims-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="claims-list-page">
      <div className="claims-list-header">
        <div>
          <h1 className="claims-list-title">My Claims</h1>
          <p className="claims-list-subtitle">
            Manage your German pension refund claims
          </p>
        </div>
        <button
          onClick={handleCreateClaim}
          className="claims-btn claims-btn-primary"
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          <span>New Claim</span>
        </button>
      </div>

      {error && (
        <div className="claims-error-banner">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {claims.length === 0 ? (
        <div className="claims-empty-state">
          <FileText className="w-16 h-16 text-gray-300" />
          <h2>No claims yet</h2>
          <p>Start your German pension refund claim to get started.</p>
          <button
            onClick={handleCreateClaim}
            className="claims-btn claims-btn-primary"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            <span>Start New Claim</span>
          </button>
        </div>
      ) : (
        <div className="claims-list">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="claims-list-item"
              onClick={() => router.push(`/claims/${claim.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/claims/${claim.id}`);
                }
              }}
            >
              <div className="claims-list-item-icon">
                {getStatusIcon(claim.status)}
              </div>
              <div className="claims-list-item-content">
                <div className="claims-list-item-header">
                  <span className="claims-list-item-type">
                    {claim.claimType === 'own_refund'
                      ? 'Own Pension Refund'
                      : 'Surviving Spouse Claim'}
                  </span>
                  <span className={`claims-list-item-status status-${claim.status}`}>
                    {getStatusLabel(claim.status)}
                  </span>
                </div>
                <div className="claims-list-item-meta">
                  <span>Created {formatDate(claim.createdAt)}</span>
                  {claim.updatedAt !== claim.createdAt && (
                    <span> &middot; Updated {formatDate(claim.updatedAt)}</span>
                  )}
                </div>
              </div>
              <ArrowRight className="claims-list-item-arrow" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
