'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CompanyPensionLogo } from '@/components/vbl/icons/CompanyPensionLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  identifyWithdrawal,
  confirmWithdrawal,
  getUserClaims,
  WithdrawalContract,
} from '@/lib/onboarding-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Phase = 'loading' | 'identify' | 'confirm' | 'success';

const GENERIC_NOT_FOUND =
  'We could not identify the contract from the information provided. Please log in to your account or contact support.';

function institutionLabel(contract: WithdrawalContract | null): string {
  return (
    contract?.pensionTypeOrInstitution?.trim() || 'your pension institution'
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-10">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[20px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
        <div
          className="flex items-center justify-center px-6 py-6"
          style={{ backgroundColor: '#163300' }}
        >
          <CompanyPensionLogo className="h-auto w-[220px] max-w-full" />
        </div>
        <div className="px-7 py-8 sm:px-9">{children}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-[#163300]">{value}</span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function WithdrawContractInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    claimId: '',
    pensionTypeOrInstitution: '',
  });
  const [contract, setContract] = useState<WithdrawalContract | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Logged-in users skip the identification form and go straight to the
  // confirmation screen (details derived from their account + claim).
  useEffect(() => {
    if (isLoading) return;
    let active = true;

    (async () => {
      if (!isAuthenticated || !user) {
        if (active) setPhase('identify');
        return;
      }

      try {
        const queryClaimId = searchParams?.get('claimId') || '';
        const institution = searchParams?.get('institution') || '';

        let claimId = queryClaimId;
        if (!claimId) {
          const { claims } = await getUserClaims();
          claimId = claims[0]?.id || '';
        }
        if (!claimId) {
          if (active) setPhase('identify');
          return;
        }

        const fullName = [user.profile?.firstName, user.profile?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        const { contract: c } = await identifyWithdrawal({
          fullName: fullName || user.email,
          email: user.email,
          claimId,
          pensionTypeOrInstitution: institution || 'CompanyPension',
        });

        if (!active) return;
        setContract(c);
        setForm({
          fullName: fullName || c.fullName,
          email: user.email,
          claimId,
          pensionTypeOrInstitution:
            institution || c.pensionTypeOrInstitution || '',
        });
        setPhase('confirm');
      } catch {
        // Fall back to the manual form (confirm still works via the owner path).
        if (active) setPhase('identify');
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoading, isAuthenticated, user, searchParams]);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { contract: c } = await identifyWithdrawal(form);
      setContract(c);
      setPhase('confirm');
    } catch (err: unknown) {
      setError(readError(err) || GENERIC_NOT_FOUND);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { contract: c } = await confirmWithdrawal({
        claimId: form.claimId || contract?.claimId || '',
        fullName: form.fullName || undefined,
        email: form.email || undefined,
        pensionTypeOrInstitution:
          form.pensionTypeOrInstitution ||
          contract?.pensionTypeOrInstitution ||
          undefined,
      });
      setContract(c);
      setPhase('success');
    } catch (err: unknown) {
      setError(readError(err) || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return (
      <CardShell>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#163300]" />
        </div>
      </CardShell>
    );
  }

  if (phase === 'identify') {
    return (
      <CardShell>
        <h1 className="mb-2 text-2xl font-bold text-[#163300]">
          Withdraw your CompanyPension contract
        </h1>
        <p className="mb-6 text-gray-600">
          Enter the details connected with your CompanyPension contract.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleIdentify} className="space-y-4">
          <Field
            label="Full name"
            value={form.fullName}
            onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
            autoComplete="name"
          />
          <Field
            label="Email address used for CompanyPension"
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            autoComplete="email"
          />
          <Field
            label="Claim ID"
            value={form.claimId}
            onChange={(v) => setForm((f) => ({ ...f, claimId: v }))}
          />
          <Field
            label="Pension type or pension institution"
            value={form.pensionTypeOrInstitution}
            onChange={(v) =>
              setForm((f) => ({ ...f, pensionTypeOrInstitution: v }))
            }
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#9FE870] py-3 font-semibold text-[#163300] transition-colors hover:bg-[#8AD860] disabled:opacity-60"
          >
            {submitting ? 'Checking…' : 'Continue to confirmation'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-center text-sm font-medium text-gray-500 hover:text-[#163300]"
          >
            Cancel
          </button>
        </form>
      </CardShell>
    );
  }

  if (phase === 'confirm' && contract) {
    const submitted = contract.applicationAlreadySubmitted;
    const institution = institutionLabel(contract);
    return (
      <CardShell>
        <h1 className="mb-2 text-2xl font-bold text-[#163300]">
          Confirm contract withdrawal
        </h1>
        <p className="mb-6 text-gray-600">
          Please confirm that you want to withdraw your CompanyPension contract.
        </p>

        <div className="mb-6 rounded-xl border border-gray-200 p-4">
          <DetailRow label="Full name" value={contract.fullName || '—'} />
          <DetailRow label="Email" value={contract.email} />
          <DetailRow label="Claim ID" value={contract.claimId} />
          <DetailRow
            label="Pension type / institution"
            value={contract.pensionTypeOrInstitution || '—'}
          />
          <DetailRow
            label="Contract date"
            value={formatDate(contract.contractDate)}
          />
          <DetailRow
            label="Deposit paid"
            value={formatDate(contract.paymentDate)}
          />
        </div>

        {contract.alreadyWithdrawn && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This contract has already been withdrawn.
          </div>
        )}

        <div className="mb-6 space-y-3 text-sm leading-relaxed text-gray-600">
          {submitted ? (
            <>
              <p>
                Your refund application has already been submitted to{' '}
                {institution}. Withdrawing your CompanyPension contract does not
                reverse steps already completed or withdraw the submitted refund
                application.
              </p>
              <p>
                Under the pension institution&apos;s rules that you confirmed
                before submission, the refund application may no longer be
                withdrawn. The pension institution may therefore continue
                processing it.
              </p>
              <p>
                CompanyPension&apos;s authorization to receive correspondence
                and communicate with the pension institution will be revoked.
                Any applicable refund, fee or outstanding amount under your
                CompanyPension contract will be confirmed separately.
              </p>
            </>
          ) : (
            <p>
              CompanyPension will stop processing your application. Any
              applicable refund or amount payable will be determined according
              to the services already provided and the withdrawal terms
              applicable to your contract.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full rounded-lg bg-[#9FE870] py-3 font-semibold text-[#163300] transition-colors hover:bg-[#8AD860] disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Confirm withdrawal'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-3 w-full text-center text-sm font-medium text-gray-500 hover:text-[#163300]"
        >
          Keep my contract
        </button>
      </CardShell>
    );
  }

  if (phase === 'success' && contract) {
    return (
      <CardShell>
        <h1 className="mb-2 text-2xl font-bold text-[#163300]">
          Withdrawal received
        </h1>
        <p className="mb-4 text-gray-600">
          We have received your contract withdrawal.
        </p>
        <p className="mb-4 text-gray-600">
          A confirmation has been sent to{' '}
          <span className="font-medium text-[#163300]">{contract.email}</span>.
        </p>
        {contract.applicationAlreadySubmitted && (
          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            We will notify {institutionLabel(contract)} that
            CompanyPension&apos;s authorization to receive correspondence has
            been revoked. Future correspondence should then be sent directly to
            you. The institution may need time to update its records.
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full rounded-lg bg-[#9FE870] py-3 font-semibold text-[#163300] transition-colors hover:bg-[#8AD860]"
        >
          Return to CompanyPension
        </button>
      </CardShell>
    );
  }

  return null;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#163300]">
        {label}
      </span>
      <input
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#163300] outline-none focus:border-[#163300]"
      />
    </label>
  );
}

function readError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { data?: { error?: string } } }).response?.data?.error
  ) {
    return (err as { response: { data: { error: string } } }).response.data
      .error;
  }
  return '';
}

export default function WithdrawContractPage() {
  return (
    <Suspense
      fallback={
        <CardShell>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#163300]" />
          </div>
        </CardShell>
      }
    >
      <WithdrawContractInner />
    </Suspense>
  );
}
