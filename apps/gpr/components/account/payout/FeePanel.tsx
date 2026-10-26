'use client';

import { useState } from 'react';
import type { FeePanel as FeePanelData } from '@/lib/payout-api';
import { RELEASE_FIGMA as T } from './copy';

/** Panel C (Figma 10 standard / 13 small refund); rows from the backend. */
export function FeePanel({ panel }: { panel: FeePanelData }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="pay-card" aria-labelledby="pay-split-title">
      <h2 id="pay-split-title" className="pay-card-title">
        {panel.title}
      </h2>
      <div className="pay-split-head" aria-hidden="true">
        <span>{T.descriptionCol}</span>
        <span>{T.amountCol}</span>
      </div>
      <dl style={{ margin: 0 }}>
        {panel.rows.map((r, i) => (
          <div
            key={r.kind + i}
            className={
              'pay-split-row' +
              (r.kind === 'fee' ? ' pay-split-fee' : '') +
              (r.kind === 'included' ? ' pay-split-included' : '') +
              (r.kind === 'total' ? ' pay-split-total' : '')
            }
          >
            <dt>{r.label}</dt>
            <dd style={{ margin: 0 }}>{r.amount}</dd>
          </div>
        ))}
      </dl>
      <p className="pay-muted">{panel.note}</p>
      {panel.expander ? (
        <div className="pay-expander" data-open={open ? 'true' : 'false'}>
          <button
            type="button"
            className="pay-expander-toggle"
            aria-expanded={open}
            aria-controls="pay-fee-cover"
            onClick={() => setOpen(!open)}
          >
            <span>{panel.expander.title}</span>
            <span aria-hidden="true">{open ? '∧' : '∨'}</span>
          </button>
          {open ? (
            <div
              id="pay-fee-cover"
              className="pay-stack-10"
              style={{ gap: 12 }}
            >
              {panel.expander.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
