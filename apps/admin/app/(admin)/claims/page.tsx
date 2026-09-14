'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, X, ArrowUpRight } from 'lucide-react';
import {
  getStats,
  getClaims,
  getClaimDetail,
  updateClaimStatus,
  ClaimHandlingRoute,
  ClaimPensionType,
  ClaimSort,
  ClaimListItem,
} from '@/lib/admin-api';
import {
  Button,
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_TONE,
  EmptyState,
  ErrorText,
  Fact,
  FactGroup,
  Pagination,
  PageHeader,
  Pill,
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

const CASE_STATE_LABELS: Record<string, string> = {
  new: 'new',
  downloaded: 'downloaded',
  submitted: 'sent to provider',
  response_received: 'response received',
  closed: 'closed',
};

// Saved views: the questions ops actually ask, as tabs.
type ViewKey = 'needs-ops' | 'processing' | 'law-firm' | 'bav' | 'all';
const VIEWS: {
  key: ViewKey;
  label: string;
  status?: string;
  route?: ClaimHandlingRoute;
  product?: ClaimPensionType;
  count?: (s: { submitted: number; processing: number; lawFirm: number; total: number }) => number;
}[] = [
  { key: 'needs-ops', label: 'Needs ops', status: 'submitted', count: (s) => s.submitted },
  { key: 'processing', label: 'Processing', status: 'processing', count: (s) => s.processing },
  { key: 'law-firm', label: 'With law firm', route: 'law_firm', count: (s) => s.lawFirm },
  { key: 'bav', label: 'bAV cash-out', product: 'private' },
  { key: 'all', label: 'All claims', count: (s) => s.total },
];

export default function ClaimsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const initialView = (params.get('view') as ViewKey) || 'needs-ops';
  const [view, setView] = useState<ViewKey>(VIEWS.some((v) => v.key === initialView) ? initialView : 'needs-ops');
  const [status, setStatus] = useState('');
  const [product, setProduct] = useState<'' | ClaimPensionType>('');
  const [route, setRoute] = useState<'' | ClaimHandlingRoute>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ClaimSort>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [peekId, setPeekId] = useState<string | null>(null);

  useEffect(() => {
    const v = params.get('view') as ViewKey | null;
    if (v && VIEWS.some((x) => x.key === v)) setView(v);
  }, [params]);

  const current = VIEWS.find((v) => v.key === view)!;
  const effStatus = current.status ?? status;
  const effRoute = current.route ?? route;
  const effProduct = current.product ?? product;

  const statsQuery = useQuery({ queryKey: ['admin-stats'], queryFn: getStats });
  const claimsQuery = useQuery({
    queryKey: ['admin-claims', effStatus, effRoute, effProduct, search, sort, dir, page],
    queryFn: () =>
      getClaims({
        status: effStatus || undefined,
        handlingRoute: effRoute || undefined,
        pensionType: effProduct || undefined,
        search: search || undefined,
        sort,
        dir,
        page,
        limit: 25,
      }),
  });

  const selectView = (key: ViewKey) => {
    setView(key);
    setStatus('');
    setRoute('');
    setProduct('');
    setPage(1);
    router.replace(`/claims?view=${key}`);
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
  const chips: { label: string; clear: () => void }[] = [];
  if (search) chips.push({ label: `“${search}”`, clear: () => { setSearch(''); setSearchInput(''); setPage(1); } });
  if (!current.status && status) chips.push({ label: `Status: ${CLAIM_STATUS_LABEL[status] ?? status}`, clear: () => { setStatus(''); setPage(1); } });
  if (!current.product && product) chips.push({ label: product === 'private' ? 'bAV cash-out' : 'Public refund', clear: () => { setProduct(''); setPage(1); } });
  if (!current.route && route) chips.push({ label: route === 'law_firm' ? 'Law firm' : 'Direct', clear: () => { setRoute(''); setPage(1); } });

  return (
    <div>
      <PageHeader title="Claims" subtitle="Pension refund and bAV cash-out applications" />

      {/* Views */}
      <div className="mb-3 flex flex-wrap gap-1 border-b border-gray-200">
        {VIEWS.map((v) => {
          const n = stats && v.count ? v.count(stats) : undefined;
          const active = v.key === view;
          return (
            <button
              key={v.key}
              onClick={() => selectView(v.key)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
                active ? 'border-brand-dark font-medium text-brand-dark' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {v.label}
              {typeof n === 'number' && (
                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? 'bg-brand-light text-brand-dark' : 'bg-gray-100 text-gray-500'}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
          setPage(1);
        }}
        className="mb-2 flex flex-wrap items-center gap-2"
      >
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input id="claims-search" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Name, email, file number or claim id" className={`${inputClass} pl-8`} />
        </div>
        <Button type="submit">Search</Button>
        {!current.status && (
          <select id="claims-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${inputClass} w-auto`}>
            <option value="">Status</option>
            {Object.entries(CLAIM_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        {!current.product && (
          <select id="claims-product" value={product} onChange={(e) => { setProduct(e.target.value as '' | ClaimPensionType); setPage(1); }} className={`${inputClass} w-auto`}>
            <option value="">Product</option>
            <option value="private">bAV cash-out</option>
            <option value="public">Public refund</option>
          </select>
        )}
        {!current.route && (
          <select id="claims-route" value={route} onChange={(e) => { setRoute(e.target.value as '' | ClaimHandlingRoute); setPage(1); }} className={`${inputClass} w-auto`}>
            <option value="">Handling</option>
            <option value="direct">Direct (lettershop)</option>
            <option value="law_firm">Law firm</option>
          </select>
        )}
      </form>
      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button key={c.label} onClick={c.clear} className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-50">
              {c.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button onClick={() => chips.forEach((c) => c.clear())} className="text-xs text-gray-500 hover:underline">Clear all</button>
        </div>
      )}

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
              <Th onClick={() => toggleSort('submittedAt')} sorted={sort === 'submittedAt' ? dir : null}>Submitted</Th>
              <Th onClick={() => toggleSort('updatedAt')} sorted={sort === 'updatedAt' ? dir : null}>Updated</Th>
              <Th align="right"></Th>
            </TableHead>
            <TableBody>
              {data.claims.map((claim) => (
                <tr
                  key={claim.id}
                  className={`cursor-pointer ${peekId === claim.id ? 'bg-brand-light/60' : 'hover:bg-gray-50'}`}
                  onClick={() => setPeekId(claim.id)}
                >
                  <Td>
                    <div className="font-medium text-gray-900">{claim.applicantName || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{claim.applicantEmail || claim.id.slice(0, 8)}</div>
                  </Td>
                  <Td>
                    {claim.pensionType === 'private' ? <Pill tone="brand">bAV cash-out</Pill> : claim.pensionType === 'public' ? <Pill>Public refund</Pill> : <span className="text-xs text-gray-400">—</span>}
                  </Td>
                  <Td><StatusDot tone={CLAIM_STATUS_TONE[claim.status] ?? 'neutral'}>{CLAIM_STATUS_LABEL[claim.status] ?? claim.status}</StatusDot></Td>
                  <Td>
                    {claim.handlingRoute === 'law_firm' ? (
                      <div>
                        <div className="text-gray-900">Law firm</div>
                        <div className="text-xs text-gray-500">{CASE_STATE_LABELS[claim.lawFirmCaseState ?? 'new']}{claim.lawFirmRef ? ` · ${claim.lawFirmRef}` : ' · no file number'}</div>
                      </div>
                    ) : (
                      <span className="text-gray-700">Direct</span>
                    )}
                  </Td>
                  <Td>
                    {claim.paymentStatus ? (
                      <StatusDot tone={claim.paymentStatus === 'paid' ? 'good' : claim.paymentStatus === 'failed' ? 'bad' : 'wait'}>{claim.paymentStatus}</StatusDot>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </Td>
                  <Td className="tabular-nums text-gray-600">{formatDate(claim.submittedAt)}</Td>
                  <Td className="tabular-nums text-gray-600">{formatDate(claim.updatedAt)}</Td>
                  <Td align="right">
                    <Link href={`/claims/${claim.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-dark">
                      Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
        </>
      ) : (
        <div className="border-t border-gray-200">
          <EmptyState icon={<FileText className="h-8 w-8" />} title={view === 'needs-ops' ? 'Nothing waiting for ops' : 'No claims match'} hint={search ? `Nothing found for “${search}”.` : 'Try another view or clear the filters.'} />
        </div>
      )}

      {peekId && (
        <PeekPanel
          id={peekId}
          onClose={() => setPeekId(null)}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          }}
        />
      )}
    </div>
  );
}

/** Row preview beside the list, so ops can triage without leaving it. */
function PeekPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const detail = useQuery({ queryKey: ['admin-claim', id], queryFn: () => getClaimDetail(id) });
  const move = useMutation({
    mutationFn: (status: string) => updateClaimStatus(id, status),
    onSuccess: () => {
      detail.refetch();
      onChanged();
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const c = detail.data?.claim;
  const u = detail.data?.userInfo;
  const name = c?.firstName && c?.lastName ? `${c.firstName} ${c.lastName}` : u?.email ?? '…';

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
          {c && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusDot tone={CLAIM_STATUS_TONE[c.status] ?? 'neutral'}>{CLAIM_STATUS_LABEL[c.status] ?? c.status}</StatusDot>
              {c.pensionType === 'private' ? <Pill tone="brand">bAV cash-out</Pill> : c.pensionType === 'public' ? <Pill>Public refund</Pill> : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/claims/${id}`} className="inline-flex items-center gap-1 rounded-md bg-brand-accent px-3 py-1.5 text-sm font-medium text-brand-dark">
            Open <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {detail.isLoading || !c ? (
          <Spinner />
        ) : (
          <>
            {(c.status === 'submitted' || c.status === 'processing') && (
              <div className="rounded-md bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Quick action</p>
                <div className="flex flex-wrap gap-2">
                  {c.status === 'submitted' && <Button variant="primary" size="sm" disabled={move.isPending} onClick={() => move.mutate('processing')}>Move to processing</Button>}
                  {c.status === 'processing' && <Button variant="primary" size="sm" disabled={move.isPending} onClick={() => move.mutate('completed')}>Mark completed</Button>}
                  {c.status === 'processing' && <Button variant="danger" size="sm" disabled={move.isPending} onClick={() => move.mutate('rejected')}>Reject</Button>}
                </div>
                {move.isError && <div className="mt-2"><ErrorText error={move.error} fallback="Could not update" /></div>}
              </div>
            )}
            <FactGroup title="Overview">
              <Fact label="Email" value={u?.email} wide />
              <Fact label="Submitted" value={formatDate(c.submittedAt, true)} />
              <Fact label="Updated" value={formatDate(c.updatedAt, true)} />
              <Fact label="Handling" value={c.handlingRoute === 'law_firm' ? `Law firm · ${CASE_STATE_LABELS[c.lawFirmCaseState ?? 'new']}${c.lawFirmRef ? ` · ${c.lawFirmRef}` : ''}` : 'Direct via lettershop'} wide />
              <Fact label="Payment" value={c.paymentStatus} />
              <Fact label="Package" value={c.pdfS3Key ? 'generated' : 'not yet'} />
            </FactGroup>
            {c.pensionType === 'private' && (
              <FactGroup title="bAV">
                <Fact label="Route" value={c.drvRefundReceived === true ? 'A · DRV refund' : c.drvRefundReceived === false ? 'B · small entitlement' : null} />
                <Fact label="Provider" value={c.bavProviderName} />
                <Fact label="Employer" value={c.employerName} wide />
                <Fact label="Addressee" value={c.bavRecipientName} wide />
              </FactGroup>
            )}
            <FactGroup title="Claimant">
              <Fact label="Date of birth" value={formatDate(c.dateOfBirth)} />
              <Fact label="Nationality" value={c.nationality} />
              <Fact label="Address" value={[c.currentAddressLine1, [c.currentPostalCode, c.currentCity].filter(Boolean).join(' '), c.currentCountry].filter(Boolean).join(', ') || null} wide />
            </FactGroup>
            <FactGroup title="Documents">
              <Fact label="Uploaded" value={`${detail.data!.documents.length} file${detail.data!.documents.length === 1 ? '' : 's'}`} />
              <Fact label="Latest activity" value={detail.data!.workflow[0] ? formatDate(detail.data!.workflow[0].createdAt, true) : null} />
            </FactGroup>
          </>
        )}
      </div>
    </div>
  );
}

// Keep the list item type referenced for editors that strip unused imports.
export type { ClaimListItem };
