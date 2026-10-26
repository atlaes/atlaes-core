'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrorMessage } from '@/lib/account-api';
import payoutApi, {
  type PayoutDecision,
  type PayoutState,
} from '@/lib/payout-api';
import { formatShortDate } from '../format';
import {
  ENTGELT_EXPLAINER,
  EUR,
  eur,
  REVIEW_COPY,
  REVIEW_FIGMA as T,
} from './copy';
import {
  Footer,
  NothingOpen,
  PayoutFrame,
  Question,
  REVIEW_TITLE,
} from './PayoutFrame';
import { useConfirmDecision } from './usePayout';

function dmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

function Cell({ value }: { value: number | null }) {
  return value === null ? (
    <span className="pay-td-missing">—</span>
  ) : (
    <span>{EUR.format(value)}</span>
  );
}

/** PDF slot (Figma "Bescheid preview"): inline preview once the link loads. */
function BescheidPreview({ decision }: { decision: PayoutDecision }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (decision.hasDocument) {
      payoutApi
        .decisionDocumentUrl(decision.id)
        .then((u) => live && setUrl(u))
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [decision.id, decision.hasDocument]);
  const openFull = async () => {
    setError(null);
    try {
      const u = url ?? (await payoutApi.decisionDocumentUrl(decision.id));
      if (u) window.open(u, '_blank', 'noopener');
      else setError('The document is not available right now.');
    } catch (e) {
      setError(apiErrorMessage(e, 'The document could not be opened.'));
    }
  };
  return (
    <div className="pay-pdf">
      {url ? <iframe src={url} title={T.pdfTitle(decision.office)} /> : null}
      {!url ? (
        <>
          <p className="pay-pdf-title">{T.pdfTitle(decision.office)}</p>
          <p className="pay-pdf-meta">{T.pdfMeta(decision.pageCount)}</p>
        </>
      ) : null}
      {decision.hasDocument ? (
        <button
          type="button"
          className={'pay-pdf-open' + (url ? ' pay-pdf-bar' : '')}
          onClick={() => void openFull()}
        >
          {T.pdfOpen}
        </button>
      ) : null}
      {error ? <p className="pay-error">{error}</p> : null}
    </div>
  );
}

function PeriodsTable({ decision }: { decision: PayoutDecision }) {
  if (!decision.periods.length && decision.refundAmountEur === null)
    return null;
  return (
    <section className="pay-stack-10" aria-labelledby="pay-periods">
      <h2 id="pay-periods" className="pay-h2">
        {T.tableTitle}
      </h2>
      <div className="pay-table" role="table">
        <div className="pay-tr pay-thead" role="row">
          <span role="columnheader">{T.colPeriod}</span>
          <span role="columnheader">{T.colEntgelt}</span>
          <span role="columnheader">{T.colContributions}</span>
        </div>
        {decision.periods.map((p, i) => (
          <div className="pay-tr" role="row" key={p.from + p.to + i}>
            <span role="cell">
              {dmy(p.from)} – {dmy(p.to)}
            </span>
            <span role="cell">
              <Cell value={p.entgeltEur} />
            </span>
            <span role="cell">
              <Cell value={p.contributionsEur} />
            </span>
          </div>
        ))}
        {decision.refundAmountEur !== null ? (
          <div className="pay-tr pay-tfoot" role="row">
            <span role="cell">{T.total}</span>
            <span role="cell">{eur(decision.refundAmountEur)}</span>
          </div>
        ) : null}
      </div>
      <p className="pay-muted">{T.tableNote}</p>
    </section>
  );
}

/** Figma 08 · Review your refund decision. */
export function ReviewDecision({ data }: { data: PayoutState }) {
  const router = useRouter();
  const confirm = useConfirmDecision();
  const [choice, setChoice] = useState<'confirm' | 'report' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const decision = data.decision;
  const releaseOpen = data.release?.status === 'open';

  if (done) {
    return (
      <PayoutFrame title={REVIEW_TITLE}>
        <Question title={T.title} />
        <div className="pay-ok" role="status">
          <span className="pay-ok-tick" aria-hidden="true">
            ✓
          </span>
          <p>{REVIEW_COPY.notifiedWhenFunds}</p>
        </div>
        <Footer
          backHref="/account"
          cta="Back to your account"
          onCta={() => router.push('/account')}
        />
      </PayoutFrame>
    );
  }

  if (!decision || decision.reviewOutcome) {
    return (
      <PayoutFrame title={REVIEW_TITLE}>
        <NothingOpen />
      </PayoutFrame>
    );
  }

  const next = async () => {
    setError(null);
    if (!choice) {
      setError('Please choose one of the two options.');
      return;
    }
    if (choice === 'report') {
      router.push('/account/payout/review/missing');
      return;
    }
    try {
      await confirm.mutateAsync(decision.id);
      if (releaseOpen) router.push('/account/payout/release');
      else setDone(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'Your confirmation did not go through.'));
    }
  };

  const options = [
    {
      key: 'confirm' as const,
      title: REVIEW_COPY.optionA,
      text: T.optionAText,
    },
    { key: 'report' as const, title: REVIEW_COPY.optionB, text: T.optionBText },
  ];

  return (
    <PayoutFrame title={REVIEW_TITLE}>
      <div className="pay-warn" role="note">
        <div>
          <p className="pay-warn-title">
            {T.bannerTitle(formatShortDate(decision.clientReviewBy))}
          </p>
          <p className="pay-warn-text">{T.bannerText}</p>
        </div>
      </div>

      <Question title={T.title} lead={T.lead} />

      <BescheidPreview decision={decision} />
      <PeriodsTable decision={decision} />

      <section className="pay-explainer" aria-labelledby="pay-entgelt">
        <h2 id="pay-entgelt">{ENTGELT_EXPLAINER.title}</h2>
        <p>{ENTGELT_EXPLAINER.text}</p>
      </section>

      <fieldset className="pay-options">
        <legend className="pay-h2">{T.question}</legend>
        {options.map((o) => (
          <label
            key={o.key}
            className="pay-option"
            data-checked={choice === o.key ? 'true' : 'false'}
          >
            <input
              type="radio"
              name="review"
              value={o.key}
              checked={choice === o.key}
              onChange={() => setChoice(o.key)}
            />
            <span className="pay-radio" aria-hidden="true" />
            <span className="pay-option-body">
              <span className="pay-option-title">{o.title}</span>
              <span className="pay-option-text">{o.text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error ? (
        <p className="pay-error" role="alert">
          {error}
        </p>
      ) : null}

      <Footer
        backHref="/account"
        cta="Continue"
        onCta={() => void next()}
        disabled={confirm.isPending}
      />
    </PayoutFrame>
  );
}
