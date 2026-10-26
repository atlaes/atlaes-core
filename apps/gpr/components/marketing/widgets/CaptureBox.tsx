'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { getAttribution, type Attribution } from '@/lib/attribution';
import { SmartLink } from '../ui/SmartLink';
import { motionAllowed } from '../motion/flag';
import './widgets.css';
import './widgets-motion.css';

export type CaptureType = 'v0900-guide' | 'wegzug-guide';

export interface CaptureBoxProps {
  type: CaptureType;
  /** Page tag for lead attribution, e.g. `v0900`, `rentenbeitragserstattung`. */
  placement: string;
  as?: 'h2' | 'h3';
}

interface CaptureCopy {
  heading: string;
  lead: string;
  exitLabel: string;
  exitError: string;
  doneTitle: string;
  fine: string;
  widget: string;
}

/** German copy per type, verbatim from the two capture HTML files. */
const COPY: Record<CaptureType, CaptureCopy> = {
  'v0900-guide': {
    heading:
      'Die komplette Anleitung als PDF + Checkliste der Unterlagen — per E-Mail',
    lead: 'Tragen Sie Ihre E-Mail-Adresse ein — Sie erhalten die V0900-Anleitung als PDF mit einer Checkliste aller Unterlagen. Eine E-Mail, kein Newsletter.',
    exitLabel:
      'Wann sind Sie aus der Versicherungspflicht ausgeschieden (oder werden es)?',
    exitError:
      'Für die Wartefrist-Erinnerung brauchen wir Monat und Jahr Ihres Ausscheidens.',
    doneTitle: 'Die Anleitung ist unterwegs!',
    fine: 'Sie erhalten die angeforderte Anleitung per E-Mail — und die Wartefrist-Erinnerung nur, wenn Sie das Häkchen setzen.',
    widget: 'V0900-CAPTURE',
  },
  'wegzug-guide': {
    heading:
      'Die Checkliste für den Wegzug als PDF — und auf Wunsch die Wartefrist-Erinnerung',
    lead: 'Tragen Sie Ihre E-Mail-Adresse ein — Sie erhalten die Checkliste vor dem Wegzug mit den Wartefrist-Regeln als PDF. Eine E-Mail, kein Newsletter.',
    exitLabel:
      'Ihr letzter Monat mit Pflichtversicherung — tatsächlich oder voraussichtlich',
    exitError:
      'Für die Wartefrist-Erinnerung brauchen wir Monat und Jahr Ihres letzten Pflichtbeitrags.',
    doneTitle: 'Die Checkliste ist unterwegs!',
    fine: 'Sie erhalten die angeforderte Checkliste per E-Mail — und die Wartefrist-Erinnerung nur, wenn Sie das Häkchen setzen.',
    widget: 'WEGZUG-CAPTURE',
  },
};

const SHARED = {
  emailLabel: 'E-Mail-Adresse',
  emailPlaceholder: 'name@beispiel.de',
  remind:
    'Ja, erinnern Sie mich zusätzlich per E-Mail, bevor meine 24-monatige Wartefrist endet.',
  optional: '(optional)',
  monthPlaceholder: 'Monat…',
  yearPlaceholder: 'Jahr…',
  send: 'Senden',
  sending: 'Wird gesendet…',
  emailError: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  sendError:
    'Beim Senden ist etwas schiefgegangen — bitte versuchen Sie es noch einmal.',
  finePrefix: 'Hinweise zum Umgang mit Ihren Daten finden Sie in unserer ',
  privacy: 'Datenschutzerklärung',
  doneBody:
    'Bitte prüfen Sie in den nächsten Minuten Ihren Posteingang (und den Spam-Ordner).',
  doneRemind:
    'Ihre Wartefrist-Erinnerung ist vorgemerkt — wir melden uns rechtzeitig.',
};

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/**
 * German e-mail capture box (V0900 guide PDF / Wegzugs-Checkliste PDF) with
 * the optional § 7 UWG waiting-period reminder opt-in that reveals the
 * month/year of the last mandatory insurance. Posts to `POST /api/leads`.
 */
export function CaptureBox({ type, placement, as = 'h2' }: CaptureBoxProps) {
  const c = COPY[type];
  const id = useId();
  const Heading = as;
  const [email, setEmail] = useState('');
  const [remind, setRemind] = useState(false);
  const [exitMonth, setExitMonth] = useState('');
  const [exitYear, setExitYear] = useState('');
  const [hp, setHp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const formHeight = useRef<number | null>(null);

  // Success: the body collapses smoothly from the form's height to the
  // confirmation's height (only when motion is allowed).
  useLayoutEffect(() => {
    const el = bodyRef.current;
    const from = formHeight.current;
    formHeight.current = null;
    if (!done || !el || from === null || !motionAllowed()) return;
    const to = el.offsetHeight;
    if (Math.abs(from - to) < 2) return;
    el.style.height = from + 'px';
    el.style.overflow = 'hidden';
    void el.offsetHeight; // commit the start height
    el.classList.add('is-collapsing');
    el.style.height = to + 'px';
    const end = () => {
      el.classList.remove('is-collapsing');
      el.style.height = '';
      el.style.overflow = '';
    };
    const timer = window.setTimeout(end, 450);
    return () => {
      window.clearTimeout(timer);
      end();
    };
  }, [done]);

  const nowYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = nowYear + 1; y >= nowYear - 8; y--) years.push(y);

  async function submit() {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError(SHARED.emailError);
      return;
    }
    if (remind && (!exitMonth || !exitYear)) {
      setError(c.exitError);
      return;
    }
    setError(null);
    setSending(true);
    const attr: Partial<Attribution> = getAttribution() || {};
    const payload = {
      type,
      placement,
      email: trimmed,
      reminderOptIn: remind,
      lastContributionMonth: remind
        ? `${exitYear}-${pad2(Number(exitMonth))}`
        : null,
      widget: c.widget + ' @ ' + placement,
      submittedAt: new Date().toISOString(),
      pageReferrer:
        typeof document !== 'undefined' ? document.referrer || '' : '',
      landingPage: attr.landingPage || '',
      referrer: attr.referrer || '',
      via: attr.via || '',
      utmSource: attr.utmSource || '',
      utmMedium: attr.utmMedium || '',
      utmCampaign: attr.utmCampaign || '',
      utmTerm: attr.utmTerm || '',
      utmContent: attr.utmContent || '',
      gclid: attr.gclid || '',
      fbclid: attr.fbclid || '',
      hp,
    };
    try {
      await apiClient.post('/leads', payload);
      if (bodyRef.current) formHeight.current = bodyRef.current.offsetHeight;
      setDone(true);
    } catch {
      setError(SHARED.sendError);
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className="mk-widget mk-widget-capture"
      lang="de"
      aria-label={c.heading}
    >
      <div className="mk-widget-head">
        <Heading>{c.heading}</Heading>
      </div>
      <div className="mk-widget-body" ref={bodyRef}>
        {done ? (
          <div
            className="mk-verdict mk-verdict-ok mk-widget-done"
            role="status"
          >
            <svg
              className="mk-done-check"
              viewBox="0 0 40 40"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="20" cy="20" r="18" />
              <path d="M12 20.5l5.5 5.5L28.5 14" />
            </svg>
            <h3>{c.doneTitle}</h3>
            <p>
              {SHARED.doneBody}
              {remind ? ' ' + SHARED.doneRemind : ''}
            </p>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <p className="mk-p">{c.lead}</p>
            <div className="mk-field">
              <label htmlFor={id + '-email'}>{SHARED.emailLabel}</label>
              <input
                id={id + '-email'}
                className="mk-input"
                type="email"
                autoComplete="email"
                placeholder={SHARED.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <label className="mk-check" htmlFor={id + '-remind'}>
              <input
                id={id + '-remind'}
                type="checkbox"
                checked={remind}
                onChange={(e) => setRemind(e.target.checked)}
              />
              <span>
                {SHARED.remind}{' '}
                <span style={{ color: 'var(--mk-muted)' }}>
                  {SHARED.optional}
                </span>
              </span>
            </label>
            {remind ? (
              <div className="mk-field">
                <span className="mk-field-label" id={id + '-exit'}>
                  {c.exitLabel}
                </span>
                <div
                  className="mk-row"
                  role="group"
                  aria-labelledby={id + '-exit'}
                >
                  <select
                    className="mk-select"
                    aria-label="Monat"
                    value={exitMonth}
                    onChange={(e) => setExitMonth(e.target.value)}
                  >
                    <option value="" disabled>
                      {SHARED.monthPlaceholder}
                    </option>
                    {MONTHS_DE.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    className="mk-select"
                    aria-label="Jahr"
                    value={exitYear}
                    onChange={(e) => setExitYear(e.target.value)}
                  >
                    <option value="" disabled>
                      {SHARED.yearPlaceholder}
                    </option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
            <input
              className="mk-hp"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
            <button type="submit" className="mk-btn" disabled={sending}>
              {sending ? SHARED.sending : SHARED.send}
            </button>
            {error ? (
              <p className="mk-error" role="alert">
                {error}
              </p>
            ) : null}
            <p className="mk-fine">
              {SHARED.finePrefix}
              <SmartLink
                href="/privacy-policy"
                className="mk-link"
                darkClassName="mk-dark"
              >
                {SHARED.privacy}
              </SmartLink>
              . {c.fine}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
