'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrorMessage } from '@/lib/account-api';
import payoutApi, {
  type PayoutState,
  type PayoutTransfer,
} from '@/lib/payout-api';
import { formatLongDate } from '../format';
import { Footer, NothingOpen, PayoutFrame, Question } from './PayoutFrame';
import { useConfirmReceipt } from './usePayout';

export const RECEIPT_TITLE = 'Your payout';

const money = (n: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

const STAGE_TEXT: Record<PayoutTransfer['stage'], string> = {
  queued:
    'Your payout is authorised and queued with our partner law firm for transfer.',
  funding:
    'Our partner law firm has sent your money to our payment provider TransferMate, which converts it and pays it to your account.',
  sent: 'Your payout has been sent to your bank account.',
};

/** Where the payout stands after signing (E3 → E4A/E4B). */
export function TransferFacts({ t }: { t: PayoutTransfer }) {
  const [error, setError] = useState<string | null>(null);
  const openReceipt = async () => {
    setError(null);
    try {
      const url = await payoutApi.transferReceiptUrl(t.releaseId);
      if (url) window.open(url, '_blank', 'noopener');
      else setError('The receipt is not available yet.');
    } catch (e) {
      setError(apiErrorMessage(e, 'The receipt could not be opened.'));
    }
  };
  return (
    <div className="pay-stack-10">
      <p className="pay-lead">{STAGE_TEXT[t.stage]}</p>
      {t.stage === 'sent' ? (
        <dl className="pay-facts">
          {t.amountSent !== null ? (
            <>
              <dt>Amount sent</dt>
              <dd>{money(t.amountSent, t.currency)}</dd>
            </>
          ) : null}
          {t.sentOn ? (
            <>
              <dt>Transfer date</dt>
              <dd>{formatLongDate(t.sentOn)}</dd>
            </>
          ) : null}
          {t.expectedArrival ? (
            <>
              <dt>Expected arrival</dt>
              <dd>{formatLongDate(t.expectedArrival)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {t.hasReceipt ? (
        <button
          type="button"
          className="pay-add"
          onClick={() => void openReceipt()}
        >
          Download the transfer receipt
        </button>
      ) : null}
      {error ? (
        <p className="pay-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Arrival check (E5): the client confirms the payment has arrived or
 * reports it missing; a missing payment is investigated by the team.
 */
export function TransferStatus({ data }: { data: PayoutState }) {
  const router = useRouter();
  const confirm = useConfirmReceipt();
  const [error, setError] = useState<string | null>(null);
  const t = data.transfer;

  if (!t) {
    return (
      <PayoutFrame title={RECEIPT_TITLE}>
        <NothingOpen />
      </PayoutFrame>
    );
  }

  const answer = async (status: 'confirmed' | 'not_received') => {
    setError(null);
    try {
      await confirm.mutateAsync({ releaseId: t.releaseId, status });
    } catch (e) {
      setError(
        apiErrorMessage(e, 'That did not go through. Please try again.')
      );
    }
  };

  const title =
    t.receiptStatus === 'confirmed'
      ? 'Your payout has arrived'
      : t.receiptStatus === 'not_received'
        ? 'We are looking into your payment'
        : t.stage === 'sent'
          ? 'Has your payout arrived?'
          : 'Your payout is on its way';

  return (
    <PayoutFrame title={RECEIPT_TITLE}>
      <Question title={title} />
      <TransferFacts t={t} />

      {t.receiptStatus === 'confirmed' ? (
        <div className="pay-ok" role="status">
          <span className="pay-ok-tick" aria-hidden="true">
            ✓
          </span>
          <p>Thank you for confirming. Your case is complete.</p>
        </div>
      ) : t.receiptStatus === 'not_received' ? (
        <div className="pay-warn" role="status">
          <span className="pay-warn-bang" aria-hidden="true">
            !
          </span>
          <p>
            Thank you for letting us know. Our team is checking the transfer
            with the bank and will contact you.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="pay-error" role="alert">
          {error}
        </p>
      ) : null}

      {t.stage === 'sent' && t.receiptStatus !== 'confirmed' ? (
        <>
          <Footer
            backHref="/account"
            cta={confirm.isPending ? 'Saving…' : 'Yes, the payment has arrived'}
            onCta={() => void answer('confirmed')}
            disabled={confirm.isPending}
          />
          {t.receiptStatus !== 'not_received' ? (
            <button
              type="button"
              className="pay-add"
              onClick={() => void answer('not_received')}
              disabled={confirm.isPending}
            >
              It has not arrived yet
            </button>
          ) : null}
        </>
      ) : (
        <Footer
          backHref="/account"
          cta="Back to your account"
          onCta={() => router.push('/account')}
        />
      )}
    </PayoutFrame>
  );
}
