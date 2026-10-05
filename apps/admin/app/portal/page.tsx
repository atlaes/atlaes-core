'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getFirmClaims } from '@/lib/law-firm-api';
import { Pagination, Spinner } from '@/components/ui';
import {
  Chip,
  Note,
  PortalColumn,
  apiError,
  caseIdentifierLabel,
  caseTypeChip,
  fmtDay,
} from '@/components/portal/ui';

const PAGE_SIZE = 24;
const INTRO =
  'Cases appear here when ATLAES releases them and disappear once you save the submission date.';

/**
 * 02 · Released cases (Figma 1031:5127). Only the released batch: no
 * search, no status view (platform brief Part 1). The API already limits
 * the list to released, not-yet-submitted (or re-released) cases.
 */
export default function PortalReleasedCasesPage() {
  const [page, setPage] = useState(1);

  const claimsQuery = useQuery({
    queryKey: ['firm-claims', page],
    queryFn: () => getFirmClaims({ page, limit: PAGE_SIZE }),
  });
  const data = claimsQuery.data;

  return (
    <PortalColumn>
      <header className="flex flex-col gap-2.5">
        <p className="text-[12px] font-bold uppercase leading-[1.4] tracking-[0.96px] text-[#5e8cd9]">
          Ready for submission
        </p>
        <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.32px] text-[#181818]">
          Released cases
        </h1>
        <p className="text-[15px] leading-[1.5] text-[#4b4f58]">{INTRO}</p>
      </header>

      {claimsQuery.isLoading ? (
        <Spinner full />
      ) : claimsQuery.isError ? (
        <Note tone="error">
          {apiError(claimsQuery.error, 'Cases could not be loaded.')}
        </Note>
      ) : data && data.claims.length > 0 ? (
        <>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.claims.map((claim) => {
              const chip = caseTypeChip(claim.caseType);
              const ident = claim.caseIdentifier;
              return (
                <li key={claim.id}>
                  <Link
                    href={`/portal/claims/${claim.id}`}
                    className="group flex h-full flex-col items-start gap-4 rounded-[20px] border border-[#c6c6c6] bg-white p-6 transition-colors hover:border-[#002691] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5e8cd9]"
                  >
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                    <p className="text-[20px] font-bold leading-[1.3] text-[#181818]">
                      {claim.claimantName || 'Name missing'}
                    </p>
                    {ident && (
                      <div className="flex flex-col gap-1 font-semibold leading-[1.4]">
                        <span className="text-[12px] text-[#8c8c8c]">
                          {caseIdentifierLabel(ident.label)}
                        </span>
                        <span className="text-[15px] text-[#181818]">
                          {ident.value || '—'}
                        </span>
                      </div>
                    )}
                    <p className="text-[13px] leading-[1.4] text-[#8c8c8c]">
                      Released {fmtDay(claim.assignedAt)}
                    </p>
                    <span className="mt-auto text-[14px] font-bold leading-[1.4] text-[#002691] group-hover:underline">
                      Open case →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {data.total > data.limit && (
            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              onPage={setPage}
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[#c6c6c6] bg-[#f1f1f1] px-10 py-12 text-center">
          <p className="text-[16px] font-semibold leading-[1.4] text-[#4b4f58]">
            No cases released for submission.
          </p>
          <p className="max-w-[560px] text-[13px] leading-[1.5] text-[#8c8c8c]">
            {INTRO}
          </p>
        </div>
      )}
    </PortalColumn>
  );
}
