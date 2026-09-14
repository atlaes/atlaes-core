'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Scale, UserPlus, UserX } from 'lucide-react';
import { homeForRole, useAuth } from '@/contexts/AuthContext';
import {
  getLawFirmMembers,
  getLawFirms,
  inviteLawFirmMember,
  removeLawFirmMember,
} from '@/lib/admin-api';
import { apiErrorMessage } from '@/lib/law-firm-api';

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function LawFirmsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member' as 'member' | 'firm_admin',
  });
  const [lastInvite, setLastInvite] = useState<{
    email: string;
    magicLinkUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace('/');
    else if (!isAdmin) router.replace(homeForRole(user?.role));
  }, [authLoading, isAuthenticated, isAdmin, user?.role, router]);

  const firmsQuery = useQuery({
    queryKey: ['admin-law-firms'],
    queryFn: getLawFirms,
    enabled: isAdmin,
  });

  const firmId = selectedFirmId ?? firmsQuery.data?.[0]?.id ?? null;

  const membersQuery = useQuery({
    queryKey: ['admin-law-firm-members', firmId],
    queryFn: () => getLawFirmMembers(firmId!),
    enabled: isAdmin && !!firmId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteLawFirmMember(firmId!, form),
    onSuccess: (member) => {
      setLastInvite({ email: member.email, magicLinkUrl: member.magicLinkUrl });
      setForm({ email: '', firstName: '', lastName: '', role: 'member' });
      queryClient.invalidateQueries({
        queryKey: ['admin-law-firm-members', firmId],
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeLawFirmMember(firmId!, memberId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin-law-firm-members', firmId],
      }),
  });

  if (authLoading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  const firm = membersQuery.data?.firm;
  const members = membersQuery.data?.members ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href="/claims"
        className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to claims
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-dark">
            <Scale className="h-6 w-6" />
            Partner law firms
          </h1>
          <p className="text-sm text-gray-500">
            Portal accounts are created here by invitation only.
          </p>
        </div>
        {firmsQuery.data && firmsQuery.data.length > 1 && (
          <select
            value={firmId ?? ''}
            onChange={(e) => setSelectedFirmId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
          >
            {firmsQuery.data.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {firm && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700">{firm.name}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {[
              firm.street,
              [firm.postalCode, firm.city].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join(', ') || 'No address on file'}
            {firm.notificationEmail || firm.contactEmail
              ? ` · notifications to ${firm.notificationEmail ?? firm.contactEmail}`
              : ' · no notification email set (new-case notices are not sent)'}
          </p>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <UserPlus className="h-4 w-4" />
          Invite a person at the firm
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (firmId) inviteMutation.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email address"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent sm:col-span-2"
          />
          <input
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="First name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
          <input
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Last name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
          <select
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value as 'member' | 'firm_admin',
              })
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="member">Member</option>
            <option value="firm_admin">Firm admin</option>
          </select>
          <button
            type="submit"
            disabled={inviteMutation.isPending || !firmId}
            className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {inviteMutation.isPending ? 'Inviting…' : 'Send invitation'}
          </button>
        </form>
        {inviteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {apiErrorMessage(inviteMutation.error, 'Invitation failed')}
          </p>
        )}
        {lastInvite && (
          <div className="mt-3 rounded-lg bg-brand-light p-3 text-sm text-brand-dark">
            Invitation sent to <strong>{lastInvite.email}</strong>.
            {lastInvite.magicLinkUrl && (
              <p className="mt-1 break-all text-xs text-gray-600">
                Dev sign-in link: {lastInvite.magicLinkUrl}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Invited', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  No portal users yet.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {m.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {m.role === 'firm_admin' ? 'Firm admin' : 'Member'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {m.active ? 'Active' : 'Removed'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {formatDate(m.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  {m.active && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(`Remove ${m.email} from the portal?`)
                        ) {
                          removeMutation.mutate(m.id);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
