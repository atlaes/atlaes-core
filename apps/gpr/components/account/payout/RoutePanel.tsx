'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage } from '@/lib/account-api';
import payoutApi, {
  type PayoutState,
  type RouteOption,
} from '@/lib/payout-api';
import { EUR, eur, ROUTE_COPY as F } from './copy';
import { Footer, PayoutFrame, Question, releaseTitle } from './PayoutFrame';
import { ReleaseClosed } from './ReleaseClosed';
import { payoutKeys, useInvalidatePayout } from './usePayout';

function pct(rate: number): string {
  return `${Number((rate * 100).toFixed(2))}%`;
}

function rateWhen(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : date;
}

/** Figma 11 · Release — route panel (accounts not in euros), text F. */
export function RoutePanel({ data }: { data: PayoutState }) {
  const router = useRouter();
  const invalidate = useInvalidatePayout();
  const release = data.release;
  const [choice, setChoice] = useState<1 | 2 | 3 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const routes = useQuery({
    queryKey: payoutKeys.routes(release?.id ?? ''),
    queryFn: () => payoutApi.routeOptions(release!.id),
    enabled: !!release && release.status === 'open' && !!release.account,
  });

  const redirect =
    release && release.status === 'open'
      ? !release.account
        ? '/account/payout/release'
        : routes.data && !routes.data.choiceNeeded
          ? '/account/payout/release/sign'
          : null
      : null;
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (!release || release.status !== 'open')
    return <ReleaseClosed data={data} />;
  if (redirect) return null;
  const o = routes.data;
  if (routes.isPending || !o) {
    return (
      <PayoutFrame title={releaseTitle(2)} step={2}>
        {routes.isError ? (
          <p className="pay-error" role="alert">
            {apiErrorMessage(
              routes.error,
              'The payout options could not be loaded.'
            )}
          </p>
        ) : (
          <p className="pay-muted" role="status">
            Loading…
          </p>
        )}
      </PayoutFrame>
    );
  }

  const x = eur(o.amountAvailableEur);
  const cur = o.currency;
  const byNo = (n: 1 | 2 | 3): RouteOption | undefined =>
    o.options.filter((r) => r.option === n && r.available)[0];
  const opt2 = byNo(2);

  const text = (n: 1 | 2 | 3) => {
    if (n === 1) return [F.option1];
    if (n === 3) return [F.option3];
    return [
      F.option2({
        currency: cur,
        p: pct(opt2!.costRate ?? 0),
        y: eur(opt2!.costEur ?? 0),
        x,
        z:
          opt2!.estimatedTargetAmount !== null
            ? EUR.format(opt2!.estimatedTargetAmount)
            : '[Z]',
        institution: opt2!.executedBy || '[regulated payment institution]',
      }),
      F.option2Disclosure,
    ];
  };
  const titles = {
    1: F.option1Title,
    2: F.option2Title,
    3: F.option3Title,
  } as const;
  const shown = ([1, 2, 3] as const).filter((n) => !!byNo(n));

  const submit = async () => {
    setError(null);
    if (!choice) {
      setError('Please choose one of the options.');
      return;
    }
    setBusy(true);
    try {
      const res = await payoutApi.chooseRoute(release.id, choice);
      if (res.needsEurAccount) {
        router.push('/account/payout/release?eur=1');
        return;
      }
      if (!res.ok) {
        const msgs = Object.values(res.errors);
        setError(
          (msgs.length ? msgs.join(' ') + ' ' : '') +
            'Please complete your bank details for an international transfer.'
        );
        return;
      }
      await invalidate();
      router.push('/account/payout/release/sign');
    } catch (e) {
      setError(apiErrorMessage(e, 'Your choice could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PayoutFrame title={releaseTitle(2)} step={2}>
      <Question title={F.title} lead={F.lead(x)} />
      <div className="pay-info">
        <p>{F.info(cur)}</p>
      </div>

      <fieldset className="pay-options pay-route">
        <legend className="acc-sr-only">{F.title}</legend>
        {shown.map((n) => (
          <label
            key={n}
            className="pay-option"
            data-checked={choice === n ? 'true' : 'false'}
          >
            <input
              type="radio"
              name="route"
              value={n}
              checked={choice === n}
              onChange={() => setChoice(n)}
            />
            <span className="pay-radio" aria-hidden="true" />
            <span className="pay-option-body">
              <span className="pay-option-title">
                <span className="pay-option-num">{n} —</span>
                {titles[n]}
              </span>
              {text(n).map((t) => (
                <span key={t.slice(0, 20)} className="pay-option-text">
                  {t}
                </span>
              ))}
            </span>
          </label>
        ))}
      </fieldset>

      <section className="pay-hand" aria-labelledby="pay-hand">
        <h2 id="pay-hand">{F.handTitle}</h2>
        <ul>
          {(
            [
              [1, F.hand1],
              [2, F.hand2(cur)],
              [3, F.hand3],
            ] as const
          )
            .filter(([n]) => shown.indexOf(n) >= 0)
            .map(([n, t]) => (
              <li key={n}>
                <span aria-hidden="true">•</span>
                <span>{t}</span>
                <button
                  type="button"
                  className="pay-hand-go"
                  onClick={() => setChoice(n)}
                >
                  → Option {n}
                </button>
              </li>
            ))}
        </ul>
      </section>

      {error ? (
        <p className="pay-error" role="alert">
          {error}
        </p>
      ) : null}

      <Footer
        backHref="/account/payout/release"
        cta={busy ? 'Saving…' : 'Continue'}
        onCta={() => void submit()}
        disabled={busy}
      />

      {opt2 ? (
        <>
          <p className="pay-foot">
            {F.footnote(
              o.referenceRate ? rateWhen(o.referenceRate.date) : '[date/time]'
            )}
          </p>
          <p className="pay-foot">{F.tierRule}</p>
        </>
      ) : null}
    </PayoutFrame>
  );
}
