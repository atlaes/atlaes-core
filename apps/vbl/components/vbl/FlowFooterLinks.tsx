'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { getClaim } from '@/lib/onboarding-api';

// Legal links. No dedicated imprint/privacy routes exist in this app yet; the
// only legal host referenced in the codebase is www.atlaes.de (see
// apps/web/src/App.tsx). These slugs are assumptions to confirm with the
// client — change them in one place here.
export const IMPRINT_URL = 'https://www.atlaes.de/impressum';
export const PRIVACY_URL = 'https://www.atlaes.de/datenschutz';

// Withdrawal is offered from successful payment until 14 days after.
const WITHDRAW_WINDOW_DAYS = 14;

/**
 * Persistent row of legal links rendered on the grey background BELOW the flow
 * card (never inside it). Imprint + Privacy always show. "Withdraw from
 * Contract" only appears from successful payment until 14 days after — the
 * window is derived from the claim's paidAt (fetched once when a paid claim
 * exists). If payment is complete but no timestamp is available, the link is
 * shown (documented fallback) rather than hidden.
 */
export function FlowFooterLinks() {
  const { data } = useOnboarding();
  const [claimId, setClaimId] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    let active = true;
    const cid = data.claimId;

    if (!cid || !data.paymentCompleted) {
      setShowWithdraw(false);
      return;
    }
    setClaimId(cid);

    getClaim(cid)
      .then(({ claim }) => {
        if (!active) return;
        // A stopped/withdrawn claim ('rejected') is no longer withdrawable.
        if (claim.status === 'rejected') {
          setShowWithdraw(false);
          return;
        }
        const paidAt = claim.paidAt ? new Date(claim.paidAt) : null;
        if (!paidAt || Number.isNaN(paidAt.getTime())) {
          // Payment done but no reliable timestamp — show the link.
          setShowWithdraw(true);
          return;
        }
        const deadline =
          paidAt.getTime() + WITHDRAW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        setShowWithdraw(Date.now() <= deadline);
      })
      .catch(() => {
        // Payment already completed; on a fetch error prefer showing the link.
        if (active) setShowWithdraw(true);
      });

    return () => {
      active = false;
    };
  }, [data.claimId, data.paymentCompleted]);

  const institution = data.membership.pensionProvider || '';
  const withdrawHref =
    `/withdraw-contract?claimId=${encodeURIComponent(claimId)}` +
    (institution ? `&institution=${encodeURIComponent(institution)}` : '');

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-gray-500">
      <a
        href={IMPRINT_URL}
        target="_blank"
        rel="noreferrer"
        className="transition-colors hover:text-gray-700 hover:underline"
      >
        Imprint
      </a>
      <span aria-hidden="true">·</span>
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noreferrer"
        className="transition-colors hover:text-gray-700 hover:underline"
      >
        Privacy Policy
      </a>
      {showWithdraw && claimId && (
        <>
          <span aria-hidden="true">·</span>
          <Link
            href={withdrawHref}
            className="transition-colors hover:text-gray-700 hover:underline"
          >
            Withdraw from Contract
          </Link>
        </>
      )}
    </div>
  );
}

export default FlowFooterLinks;
