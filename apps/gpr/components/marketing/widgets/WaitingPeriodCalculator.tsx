'use client';

import { useId, useState, type CSSProperties } from 'react';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import { Pill } from '../ui/Pill';
import {
  MONTHS,
  WAITING_PERIOD_STRINGS,
  computeWaitingPeriod,
  type WaitingPeriodResult,
  type WidgetLang,
} from './waiting-period';
import { waitingTimeline, type WaitingTimeline } from './waiting-timeline';
import './widgets.css';
import './widgets-motion.css';

/**
 * Visual 24-month timeline above the verdict text (decorative: the verdict
 * text carries the same dates). Last insured month → 24 shaded months
 * (darker = already elapsed) → the filing date on the 1st of the 25th month.
 */
function Timeline({ t }: { t: WaitingTimeline }) {
  return (
    <div className="mk-wt" aria-hidden="true">
      <div className="mk-wt-bar">
        <span className="mk-wt-start" />
        <ol
          className="mk-wt-months"
          style={{ '--mk-wt-n': t.elapsedCount } as CSSProperties}
        >
          {t.months.map((m, i) => (
            <li
              key={m.year * 12 + m.month}
              className={m.elapsed ? 'is-past' : undefined}
              style={{ '--i': i } as CSSProperties}
            />
          ))}
        </ol>
        <span className="mk-wt-flag" />
      </div>
      <div className="mk-wt-labels">
        <span className="mk-wt-label-start">{t.startLabel}</span>
        <span className="mk-wt-label-apply">{t.applyLabel}</span>
      </div>
    </div>
  );
}

export interface WaitingPeriodCalculatorProps {
  lang?: WidgetLang;
  /** Page-level attribution for the CTA: `waiting-period-guide`, `waiting-calculator`, `wartefrist-rechner`. */
  via: string;
  /** Heading level of the widget title (h2 by default; h3 inside articles). */
  as?: 'h2' | 'h3';
}

const FIRST_YEAR = 1990;

/**
 * Native rendering of the 24-month waiting-period calculator (EN v1.2 /
 * German hub rendering): last month of mandatory pension insurance → the
 * first possible filing date (1st of the 25th month), restart rule, footnote
 * and the CTA into the intake flow with the placement's `via`.
 */
export function WaitingPeriodCalculator({
  lang = 'en',
  via,
  as = 'h2',
}: WaitingPeriodCalculatorProps) {
  const s = WAITING_PERIOD_STRINGS[lang];
  const id = useId();
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(currentYear);
  const [result, setResult] = useState<WaitingPeriodResult | null>(null);
  const Heading = as;

  const years: number[] = [];
  for (let y = currentYear; y >= FIRST_YEAR; y--) years.push(y);

  const verdict = result ? s.verdict(result) : null;
  const timeline = result ? waitingTimeline(result, lang) : null;
  const ctaHref = FUNNEL_ENTRY + '?via=' + encodeURIComponent(via);

  return (
    <section
      className="mk-widget mk-widget-waiting"
      lang={lang}
      aria-label={s.heading}
    >
      <div className="mk-widget-head">
        <Heading>{s.heading}</Heading>
        <p>{s.intro}</p>
      </div>
      <div className="mk-widget-body">
        {!result ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResult(computeWaitingPeriod(year, month));
            }}
          >
            <div className="mk-field">
              <span className="mk-field-label" id={id + '-label'}>
                {s.label}
              </span>
              <div
                className="mk-row"
                role="group"
                aria-labelledby={id + '-label'}
              >
                <select
                  className="mk-select"
                  aria-label={s.monthLabel}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTHS[lang].map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className="mk-select"
                  aria-label={s.yearLabel}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mk-hint">{s.hint}</p>
            </div>
            <button type="submit" className="mk-btn">
              {s.calculate}
            </button>
          </form>
        ) : (
          <div
            className={
              'mk-verdict ' +
              (result.status === 'complete'
                ? 'mk-verdict-ok'
                : 'mk-verdict-warn')
            }
            role="status"
          >
            {timeline ? <Timeline t={timeline} /> : null}
            <h3>{verdict!.title}</h3>
            {verdict!.big ? (
              <p className="mk-verdict-big">{verdict!.big}</p>
            ) : null}
            <p>{verdict!.body}</p>
            <ul className="mk-verdict-notes">
              {verdict!.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div className="mk-verdict-cta">
              <Pill href={ctaHref}>{s.cta}</Pill>
            </div>
            <button
              type="button"
              className="mk-btn-link"
              onClick={() => setResult(null)}
            >
              {s.reset}
            </button>
          </div>
        )}
      </div>
      <div className="mk-widget-foot">{s.footnote}</div>
    </section>
  );
}
