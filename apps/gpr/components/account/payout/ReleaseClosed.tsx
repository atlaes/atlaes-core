'use client';

import { useState } from 'react';
import { apiErrorMessage } from '@/lib/account-api';
import payoutApi, { type PayoutState } from '@/lib/payout-api';
import { formatLongDate } from '../format';
import {
  Footer,
  NothingOpen,
  PayoutFrame,
  Question,
  releaseTitle,
} from './PayoutFrame';
import { REVIEW_COPY } from './copy';

/**
 * Release step when there is nothing open: the signed payment instruction
 * (brief §4 "Final PDF shown to the client"), or the "funds not yet in"
 * notice.
 */
export function ReleaseClosed({ data }: { data: PayoutState }) {
  const release = data.release;
  const [error, setError] = useState<string | null>(null);
  if (release && release.status === 'signed') {
    const open = async () => {
      setError(null);
      try {
        const url = await payoutApi.signedZeUrl(release.id);
        if (url) window.open(url, '_blank', 'noopener');
        else setError('The document is not available right now.');
      } catch (e) {
        setError(apiErrorMessage(e, 'The document could not be opened.'));
      }
    };
    return (
      <PayoutFrame title={releaseTitle(3)} step={3}>
        <Question
          title="Your payment instruction is signed"
          lead={
            release.signedAt
              ? `Signed on ${formatLongDate(release.signedAt.slice(0, 10))}${
                  release.zeDocumentNumber
                    ? ` · Document ID ${release.zeDocumentNumber}`
                    : ''
                }.`
              : undefined
          }
        />
        <div className="pay-ok" role="status">
          <span className="pay-ok-tick" aria-hidden="true">
            ✓
          </span>
          <p>The signed PDF is stored on your case.</p>
        </div>
        {error ? (
          <p className="pay-error" role="alert">
            {error}
          </p>
        ) : null}
        <Footer
          backHref="/account"
          cta="Open the signed PDF"
          onCta={() => void open()}
        />
      </PayoutFrame>
    );
  }
  return (
    <PayoutFrame title={releaseTitle(1)}>
      {data.decision ? (
        <>
          <Question
            title="Release your refund"
            lead={REVIEW_COPY.notifiedWhenFunds}
          />
          <Footer
            backHref="/account"
            cta="Back to your account"
            onCta={() => (window.location.href = '/account')}
          />
        </>
      ) : (
        <NothingOpen />
      )}
    </PayoutFrame>
  );
}
