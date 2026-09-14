'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import {
  getStats,
  getClaims,
  ClaimHandlingRoute,
  ClaimPensionType,
  ClaimSort,
} from '@/lib/admin-api';
import {
  Button,
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_TONE,
  EmptyState,
  Pagination,
  PageHeader,
  Pill,
  Spinner,
  StatTile,
  StatusDot,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  formatDate,
  inputClass,
} from '@/components/ui';

const CASE_STATE_LABELS: Record<string, string> = {
  new: 'new',
  downloaded: 'downloaded',
  submitted: 'sent to provider',
  response_received: 'response received',
  closed: 'closed',
};

type Tile = 'submitted' | 'processing' | 'lawFirm' | null;

export default function ClaimsPage() {
  const router = useRouter();
  const [tile, setTile] = useState<Tile>(null);
  const [status, setStatus] = useState('');
  const [product, setProduct] = useState<'' | ClaimPensionType>('');
  const [route, setRoute] = useState<'' | ClaimHandlingRoute>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ClaimSort>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: getStats });

  const effectiveStatus = tile === 'submitted' ? 'submitted' : tile === 'processing' ? 'processing' : status;
  const effectiveRoute = tile === 'lawFirm' ? 'law_firm' : route;

  const claimsQuery = useQuery({
    queryKey: ['admin-claims', effectiveStatus, effectiveRoute, product, search, sort, dir, page],
    queryFn: () =>
      getClaims({
        status: effectiveStatus || undefined,
        handlingRoute: effectiveRoute || undefined,
        pensionType: product || undefined,
        search: search || undefined,
        sort,
        dir,
        page,
        limit: 25,
      }),
  });

  const pickTile = (t: Tile) => {
    setTile(tile === t ? null : t);
    setStatus('');
    setRoute('');
    setPage(1);
  };

  const toggleSort = (col: ClaimSort) => {
    if (sort === col) setDir(dir === 'desc' ? 'asc' : 'desc');
    else {
      setSort(col);
      setDir('desc');
    }
    setPage(1);
  };

  const stats = statsQuery.data;
  const data = claimsQuery.data;

  return (
    <div>
      <PageHeader
        title="Claims"
        subtitle={stats ? `${stats.total} claims, ${stats.submitted} waiting for ops` : 'Pension refund and bAV cash-out applications'}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Submitted"
          hint="waiting for ops"
          value={stats?.submitted ?? '–'}
          active={tile === 'submitted'}
          onClick={() => pickTile('submitted')}
        />
        <StatTile
          label="Processing"
          hint="with the provider or lettershop"
          value={stats?.processing ?? '–'}
          active={tile === 'processing'}
          onClick={() => pickTile('processing')}
        />
        <StatTile
          label="With the law firm"
          hint="handled by Vividius"
          value={stats?.lawFirm ?? '–'}
          active={tile === 'lawFirm'}
          onClick={() => pickTile('lawFirm')}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
        className="mb-3 flex flex-wrap items-center gap-2"
      >
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="claims-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name, email, file number or claim id"
            className={`${inputClass} pl-8`}
          />
        </div>
        <Button type="submit">Search</Button>
        <select
          id="claims-status"
          value={tile ? '' : status}
          disabled={tile === 'submitted' || tile === 'processing'}
          onChange={(e) => {
            setStatus(e.target.value);
            setTile(null);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">All statuses</option>
          {Object.entries(CLAIM_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          id="claims-product"
          value={product}
          onChange={(e) => {
            setProduct(e.target.value as '' | ClaimPensionType);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">All products</option>
          <option value="private">bAV cash-out</option>
          <option value="public">Public refund</option>
        </select>
        <select
          id="claims-route"
          value={tile === 'lawFirm' ? '' : route}
          disabled={tile === 'lawFirm'}
          onChange={(e) => {
            setRoute(e.target.value as '' | ClaimHandlingRoute);
            setTile(null);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">All handling</option>
          <option value="direct">Direct (lettershop)</option>
          <option value="law_firm">Law firm</option>
        </select>
      </form>

      {claimsQuery.isLoading ? (
        <Spinner full />
      ) : data && data.claims.length > 0 ? (
        <>
          <Table minWidth={860}>
            <TableHead>
              <Th>Claimant</Th>
              <Th>Product</Th>
              <Th>Status</Th>
              <Th>Handling</Th>
              <Th>Payment</Th>
              <Th onClick={() => toggleSort('submittedAt')} sorted={sort === 'submittedAt' ? dir : null}>
                Submitted
              </Th>
              <Th onClick={() => toggleSort('updatedAt')} sorted={sort === 'updatedAt' ? dir : null}>
                Updated
              </Th>
            </TableHead>
            <TableBody>
              {data.claims.map((claim) => (
                <tr
                  key={claim.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/claims/${claim.id}`)}
                >
                  <Td>
                    <div className="font-medium text-gray-900">{claim.applicantName || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{claim.applicantEmail || claim.id.slice(0, 8)}</div>
                  </Td>
                  <Td>
                    {claim.pensionType === 'private' ? (
                      <Pill tone="brand">bAV cash-out</Pill>
                    ) : claim.pensionType === 'public' ? (
                      <Pill>Public refund</Pill>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <StatusDot tone={CLAIM_STATUS_TONE[claim.status] ?? 'neutral'}>
                      {CLAIM_STATUS_LABEL[claim.status] ?? claim.status}
                    </StatusDot>
                  </Td>
                  <Td>
                    {claim.handlingRoute === 'law_firm' ? (
                      <div>
                        <div className="text-gray-900">Law firm</div>
                        <div className="text-xs text-gray-500">
                          {CASE_STATE_LABELS[claim.lawFirmCaseState ?? 'new']}
                          {claim.lawFirmRef ? ` · ${claim.lawFirmRef}` : ' · no file number'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-700">Direct</span>
                    )}
                  </Td>
                  <Td>
                    {claim.paymentStatus ? (
                      <StatusDot
                        tone={
                          claim.paymentStatus === 'paid'
                            ? 'good'
                            : claim.paymentStatus === 'failed'
                              ? 'bad'
                              : 'wait'
                        }
                      >
                        {claim.paymentStatus}
                      </StatusDot>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Td>
                  <Td className="tabular-nums text-gray-600">{formatDate(claim.submittedAt)}</Td>
                  <Td className="tabular-nums text-gray-600">{formatDate(claim.updatedAt)}</Td>
                </tr>
              ))}
            </TableBody>
          </Table>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
        </>
      ) : (
        <div className="border-t border-gray-200">
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No claims match"
            hint={search ? `Nothing found for “${search}”. Try a shorter search.` : 'Change the filters above.'}
          />
        </div>
      )}
    </div>
  );
}
