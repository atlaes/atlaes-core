'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import {
  getLawFirmMembers,
  getLawFirms,
  inviteLawFirmMember,
  removeLawFirmMember,
} from '@/lib/admin-api';
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  PageHeader,
  Spinner,
  StatusDot,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  formatDate,
  inputClass,
} from '@/components/ui';

export default function LawFirmsPage() {
  const queryClient = useQueryClient();
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member' as 'member' | 'firm_admin',
  });
  const [notice, setNotice] = useState<{ email: string; magicLinkUrl?: string } | null>(null);

  const firmsQuery = useQuery({ queryKey: ['admin-law-firms'], queryFn: getLawFirms });
  const firmId = selectedFirmId ?? firmsQuery.data?.[0]?.id ?? null;
  const membersQuery = useQuery({
    queryKey: ['admin-law-firm-members', firmId],
    queryFn: () => getLawFirmMembers(firmId!),
    enabled: !!firmId,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-law-firm-members', firmId] });

  const inviteMutation = useMutation({
    mutationFn: (input: typeof form) => inviteLawFirmMember(firmId!, input),
    onSuccess: (member) => {
      setNotice({ email: member.email, magicLinkUrl: member.magicLinkUrl });
      setForm({ email: '', firstName: '', lastName: '', role: 'member' });
      refresh();
    },
  });

  const resendMutation = useMutation({
    mutationFn: (m: { email: string; firstName: string | null; lastName: string | null; role: 'member' | 'firm_admin' }) =>
      inviteLawFirmMember(firmId!, {
        email: m.email,
        firstName: m.firstName || 'Portal',
        lastName: m.lastName || 'User',
        role: m.role,
      }),
    onSuccess: (member) => {
      setNotice({ email: member.email, magicLinkUrl: member.magicLinkUrl });
      refresh();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeLawFirmMember(firmId!, memberId),
    onSuccess: refresh,
  });

  const firm = membersQuery.data?.firm;
  const members = membersQuery.data?.members ?? [];
  const active = members.filter((m) => m.active);
  const removed = members.filter((m) => !m.active);

  return (
    <div>
      <PageHeader
        title="Law firms"
        subtitle="Partner firms that receive routed claims. Portal accounts are created here, by invitation only."
        actions={
          firmsQuery.data && firmsQuery.data.length > 1 ? (
            <select
              id="firm-select"
              value={firmId ?? ''}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className={`${inputClass} w-auto`}
            >
              {firmsQuery.data.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          ) : null
        }
      />

      {firmsQuery.isLoading ? (
        <Spinner full />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Portal users
            </h2>
            {membersQuery.isLoading ? (
              <Spinner />
            ) : active.length === 0 ? (
              <div className="border-t border-gray-200">
                <EmptyState title="No portal users yet" hint="Invite a named person at the firm with the form." />
              </div>
            ) : (
              <Table minWidth={640}>
                <TableHead>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Access</Th>
                  <Th>Invited</Th>
                  <Th align="right"></Th>
                </TableHead>
                <TableBody>
                  {active.map((m) => {
                    const signedIn = !!m.firstSignInAt;
                    return (
                      <tr key={m.id}>
                        <Td>
                          <div className="text-gray-900">
                            {[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </Td>
                        <Td className="text-gray-700">{m.role === 'firm_admin' ? 'Firm admin' : 'Member'}</Td>
                        <Td>
                          {signedIn ? (
                            <StatusDot tone="good">Signed in {formatDate(m.firstSignInAt)}</StatusDot>
                          ) : (
                            <StatusDot tone="wait">Invited, not signed in yet</StatusDot>
                          )}
                        </Td>
                        <Td className="tabular-nums text-gray-600">{formatDate(m.createdAt)}</Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1">
                            {!signedIn && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={resendMutation.isPending}
                                onClick={() => resendMutation.mutate(m)}
                              >
                                Resend invitation
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                if (window.confirm(`Remove ${m.email} from the portal?`)) {
                                  removeMutation.mutate(m.id);
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {removed.length > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                Removed: {removed.map((m) => m.email).join(', ')}
              </p>
            )}
            {notice && (
              <div className="mt-4 rounded-md bg-brand-light px-3 py-2 text-sm text-brand-dark">
                Invitation sent to <strong>{notice.email}</strong>. The email carries a sign-in link that opens the portal.
                {notice.magicLinkUrl && (
                  <p className="mt-1 break-all text-xs text-gray-600">Dev link: {notice.magicLinkUrl}</p>
                )}
              </div>
            )}
            {(resendMutation.isError || removeMutation.isError) && (
              <div className="mt-2">
                <ErrorText error={resendMutation.error ?? removeMutation.error} fallback="Action failed" />
              </div>
            )}
          </div>

          <aside className="space-y-6">
            {firm && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-brand-dark">{firm.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {[firm.street, [firm.postalCode, firm.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'No address on file'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {firm.notificationEmail || firm.contactEmail
                    ? `New-case notices go to ${firm.notificationEmail ?? firm.contactEmail}`
                    : 'No notification email set, so new-case notices are not sent.'}
                </p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (firmId) inviteMutation.mutate(form);
              }}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark">
                <UserPlus className="h-4 w-4" />
                Invite a person at the firm
              </h3>
              <div className="space-y-3">
                <Field label="Email" htmlFor="invite-email">
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name" htmlFor="invite-first">
                    <input
                      id="invite-first"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Last name" htmlFor="invite-last">
                    <input
                      id="invite-last"
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Role" htmlFor="invite-role">
                  <select
                    id="invite-role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as 'member' | 'firm_admin' })}
                    className={inputClass}
                  >
                    <option value="member">Member</option>
                    <option value="firm_admin">Firm admin</option>
                  </select>
                </Field>
                <Button type="submit" variant="primary" disabled={inviteMutation.isPending || !firmId} className="w-full justify-center">
                  {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
                </Button>
                {inviteMutation.isError && <ErrorText error={inviteMutation.error} fallback="Invitation failed" />}
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
