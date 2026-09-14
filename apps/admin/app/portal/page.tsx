'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { getFirmClaims, LawFirmCaseState } from '@/lib/law-firm-api';
import { CaseStateBadge } from '@/components/CaseStateBadge';

const STATE_TABS: { key: '' | LawFirmCaseState; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'downloaded', label: 'Downloaded' },
  { key: 'submitted', label: 'Sent' },
  { key: 'response_received', label: 'Response' },
  { key: 'closed', label: 'Closed' },
];

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PortalQueuePage() {
  const router = useRouter();
  const [stateFilter, setStateFilter] = useState<'' | LawFirmCaseState>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const claimsQuery = useQuery({
    queryKey: ['firm-claims', stateFilter, search, page],
    queryFn: () =>
      getFirmClaims({
        caseState: stateFilter || undefined,
        search: search || undefined,
        page,
        limit: 20,
      }),
  });

  const data = claimsQuery.data;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Cases</h1>
        <p className="text-sm text-gray-500">
          bAV cash-out cases routed to your firm by CompanyPension
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {STATE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStateFilter(tab.key);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                stateFilter === tab.key
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
            setPage(1);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name or file number"
              className="w-56 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {claimsQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
          </div>
        ) : data && data.claims.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Claimant',
                      'Route',
                      'File number',
                      'Case state',
                      'Package',
                      'Assigned',
                      'Updated',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.claims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/portal/claims/${claim.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {claim.claimantName || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {claim.bavRoute
                          ? `Route ${claim.bavRoute}`
                          : claim.pensionType === 'public'
                            ? 'Public refund'
                            : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {claim.lawFirmRef ? (
                          <span className="text-gray-700">
                            {claim.lawFirmRef}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            missing
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <CaseStateBadge state={claim.caseState} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {claim.packageReady ? 'Ready' : 'Pending'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(claim.assignedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(claim.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-500">
                  {(page - 1) * data.limit + 1}–
                  {Math.min(page * data.limit, data.total)} of {data.total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-gray-400">
            <FileText className="mb-2 h-8 w-8" />
            <p className="text-sm">No cases yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
