import { t, tokenMeta } from '@/content/tokens';

interface Row {
  id: string;
  label: string;
  sub: string;
  pct: number;
  value: string;
  detail?: string;
  sentence: string;
}

/**
 * Cumulative share of completed refunds reaching escrow by elapsed time —
 * four rows from the token store (M-19, M-13, M-12, M-20; dataset S-14).
 * Single series, one hue; every figure is also visible as text and in the
 * table view, so the chart adds no number of its own.
 */
export function ProcessingTimeChart() {
  const dataset = t('S-14.dataset');
  const calculated = t('M-12.calculatedOn');
  const meta = tokenMeta('S-14');
  const rows: Row[] = [
    {
      id: 'median',
      label: `Within ${t('M-19.medianDays')} days`,
      sub: 'the median',
      pct: 50,
      value: 'half of cases',
      sentence: t('M-19.sentence'),
    },
    {
      id: 'd56',
      label: `Within ${t('M-13.days')} days`,
      sub: '8 weeks',
      pct: parseFloat(t('M-13.pct')),
      value: t('M-13.pct'),
      sentence: t('M-13.sentence'),
    },
    {
      id: 'd90',
      label: `Within ${t('M-12.days')} days`,
      sub: 'about 3 months',
      pct: parseFloat(t('M-12.pct')),
      value: t('M-12.pct'),
      detail: `${t('M-12.count')} of ${t('M-12.total')}`,
      sentence: t('M-12.sentence'),
    },
    {
      id: 'd180',
      label: `Within ${t('M-20.days')} days`,
      sub: 'about 6 months',
      pct: parseFloat(t('M-20.pct')),
      value: t('M-20.pct'),
      sentence: t('M-20.sentence'),
    },
  ];
  const title =
    'Cumulative share of completed refunds reaching escrow by elapsed time';
  return (
    <figure className="mk-ptc" aria-label={title}>
      <figcaption className="mk-ptc-head">
        <strong>{title}</strong>
        <span>{t('M-12.sentence')} Individual processing times vary.</span>
      </figcaption>
      <p className="mk-ptc-caption">
        Completed refunds only: share of Germany Pension Refund’s{' '}
        {t('M-12.total')} most recent completed paid refunds (ordered by escrow
        value date) that had reached the client escrow account, counted in
        calendar days from documented complete submission to the escrow value
        date. Dataset {dataset} · calculated {calculated}.
      </p>
      <ol className="mk-ptc-rows">
        {rows.map((r) => (
          <li key={r.id} className="mk-ptc-row" title={r.sentence}>
            <span className="mk-ptc-label">
              {r.label}
              <small>{r.sub}</small>
            </span>
            <span className="mk-ptc-track" aria-hidden="true">
              <span className="mk-ptc-fill" style={{ width: r.pct + '%' }} />
            </span>
            <span className="mk-ptc-value">
              {r.value}
              {r.detail ? <small>{r.detail}</small> : null}
            </span>
          </li>
        ))}
      </ol>
      <details className="mk-ptc-table">
        <summary>View as a table</summary>
        <table className="mk-table">
          <thead>
            <tr>
              <th scope="col">Reached the client escrow account</th>
              <th scope="col">
                Share of the {t('M-12.total')} completed refunds
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.label} ({r.sub})
                </td>
                <td>{r.detail ? `${r.detail} (${r.value})` : r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="mk-ptc-foot">
        Measured in calendar days from documented complete submission (as
        recorded by Germany Pension Refund) to the value date on which the
        refund reached the client escrow account, across our {t('M-12.total')}{' '}
        most recent completed paid refunds, ordered by escrow value date
        (dataset {dataset}, calculated {calculated}; refreshed quarterly, next
        refresh {meta.nextRefresh}; cohort fixed at {t('M-12.total')} between
        refreshes). Open/unpaid, withdrawn, unsuccessful, test, duplicate and
        unreliably matched records were excluded. These are dated, first-party
        Germany Pension Refund results describing finished cases — not a
        pension-office statistic, not the completion probability for a newly
        submitted claim, and not a promise or guarantee. Individual processing
        times vary, and some completed refunds took longer than six months. We
        cannot guarantee a decision or payment date, because the responsible
        pension office controls processing.
      </p>
    </figure>
  );
}
