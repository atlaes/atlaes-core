'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import {
  CASE_STAGES,
  CASE_STATE_LABELS,
  getFirmClaims,
  getFirmSummary,
  LawFirmCaseState,
} from '@/lib/law-firm-api';
import {
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  StatTile,
  Stepper,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  formatDate,
  inputClass,
} from '@/components/ui';

type Tile = 'new' | 'missingRef' | 'awaiting' | 'response' | null;

export default function PortalQueuePage() {
  const router = useRouter();
  const [tile, setTile] = useState<Tile>(null);
  const [stateFilter, setStateFilter] = useState<'' | LawFirmCaseState>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const summary = useQuery({
    queryKey: ['firm-summary'],
    queryFn: getFirmSummary,
  });

  const caseState: LawFirmCaseState | undefined =
    tile === 'new'
      ? 'new'
      : tile === 'awaiting'
        ? 'submitted'
        : tile === 'response'
          ? 'response_received'
          : stateFilter || undefined;

  const claimsQuery = useQuery({
    queryKey: ['firm-claims', tile, caseState, search, page],
    queryFn: () =>
      getFirmClaims({
        caseState,
        missingRef: tile === 'missingRef' ? '1' : undefined,
        search: search || undefined,
        page,
        limit: 25,
      }),
  });

  const pickTile = (t: Tile) => {
    setTile(tile === t ? null : t);
    setStateFilter('');
    setPage(1);
  };

  const data = claimsQuery.data;
  const s = summary.data;

  return (
    <div>
      <PageHeader
        title="Akten"
        subtitle={
          s
            ? `${s.total} Akten von CompanyPension an Ihre Kanzlei übergeben`
            : 'Von CompanyPension an Ihre Kanzlei übergebene bAV-Abfindungen'
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Neu"
          hint="noch nicht heruntergeladen"
          value={s?.new ?? '–'}
          active={tile === 'new'}
          onClick={() => pickTile('new')}
        />
        <StatTile
          label="Aktenzeichen fehlt"
          hint="bitte eintragen"
          value={s?.missingRef ?? '–'}
          active={tile === 'missingRef'}
          onClick={() => pickTile('missingRef')}
        />
        <StatTile
          label="Beim Versorgungsträger"
          hint="Antwort ausstehend"
          value={s?.awaitingProvider ?? '–'}
          active={tile === 'awaiting'}
          onClick={() => pickTile('awaiting')}
        />
        <StatTile
          label="Antwort erhalten"
          hint="Abschluss offen"
          value={s?.responseReceived ?? '–'}
          active={tile === 'response'}
          onClick={() => pickTile('response')}
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
            id="portal-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name oder Aktenzeichen"
            className={`${inputClass} pl-8`}
          />
        </div>
        <Button type="submit">Suchen</Button>
        <select
          id="portal-state"
          value={tile ? '' : stateFilter}
          disabled={tile !== null}
          onChange={(e) => {
            setStateFilter(e.target.value as '' | LawFirmCaseState);
            setTile(null);
            setPage(1);
          }}
          className={`${inputClass} w-auto`}
        >
          <option value="">Alle Stände</option>
          {CASE_STAGES.map((st) => (
            <option key={st.key} value={st.key}>
              {st.label}
            </option>
          ))}
        </select>
      </form>

      {claimsQuery.isLoading ? (
        <Spinner full />
      ) : data && data.claims.length > 0 ? (
        <>
          <Table minWidth={760}>
            <TableHead>
              <Th>Mandant</Th>
              <Th>Weg</Th>
              <Th>Aktenzeichen</Th>
              <Th>Stand</Th>
              <Th>Paket</Th>
              <Th>Übergeben</Th>
              <Th>Aktualisiert</Th>
            </TableHead>
            <TableBody>
              {data.claims.map((claim) => (
                <tr
                  key={claim.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/portal/claims/${claim.id}`)}
                >
                  <Td>
                    <span className="font-medium text-gray-900">
                      {claim.claimantName || 'Ohne Namen'}
                    </span>
                  </Td>
                  <Td className="text-gray-700">
                    {claim.bavRoute
                      ? `Weg ${claim.bavRoute}`
                      : claim.pensionType === 'public'
                        ? 'Erstattung'
                        : '—'}
                  </Td>
                  <Td>
                    {claim.lawFirmRef ? (
                      <span className="text-gray-900">{claim.lawFirmRef}</span>
                    ) : claim.caseState === 'closed' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className="text-amber-700">fehlt</span>
                    )}
                  </Td>
                  <Td>
                    <div className="w-36">
                      <Stepper
                        steps={CASE_STAGES}
                        current={claim.caseState}
                        size="sm"
                      />
                      <div className="mt-1 text-xs text-gray-600">
                        {CASE_STATE_LABELS[claim.caseState]}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-gray-600">
                    {claim.packageReady ? 'bereit' : 'in Vorbereitung'}
                  </Td>
                  <Td className="tabular-nums text-gray-600">
                    {formatDate(claim.assignedAt)}
                  </Td>
                  <Td className="tabular-nums text-gray-600">
                    {formatDate(claim.updatedAt)}
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onPage={setPage}
          />
        </>
      ) : (
        <div className="border-t border-gray-200">
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Keine Akten"
            hint={
              search
                ? `Nichts gefunden für „${search}“.`
                : 'Sobald CompanyPension eine Akte an Ihre Kanzlei übergibt, erscheint sie hier.'
            }
          />
        </div>
      )}
    </div>
  );
}
