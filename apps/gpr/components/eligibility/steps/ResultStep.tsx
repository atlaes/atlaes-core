'use client';

/**
 * Result cards (brief § 4, exact copy): PROCEED, PROCEED_FROM_DATE (with
 * the remind-me option, no account) and NOT_NOW (reason line + free-review
 * form, § 5). No card says "eligible" or "you qualify".
 */
import React, { useState, type FormEvent } from 'react';
import { ArrowRight, CalendarClock, Info } from 'lucide-react';
import { useEligibilityCheck } from '@/hooks/useEligibilityCheck';
import { countryLabel } from '@/lib/country-search';
import { RESULT_COPY, formatMonth, reasonLine } from '@/lib/eligibility-rules';

/** DP-01: the check runs in the browser; storing starts with the submit. */
export const STORAGE_NOTE =
  'The check itself runs in your browser. Nothing is stored until you submit.';

function EditLink() {
  const { editAnswers } = useEligibilityCheck();
  return (
    <button type="button" className="elig-text-link" onClick={editAnswers}>
      Change my answers
    </button>
  );
}

function Proceed() {
  const { goToAccount } = useEligibilityCheck();
  const c = RESULT_COPY.proceed;
  return (
    <div className="eligibility-result-content">
      <div className="eligibility-result-icon success" aria-hidden="true">
        <ArrowRight className="w-8 h-8" />
      </div>
      <h2 className="eligibility-result-title">{c.title}</h2>
      <p className="eligibility-result-description">{c.body}</p>
      <button
        type="button"
        className="eligibility-btn-next"
        onClick={goToAccount}
      >
        {c.button}
      </button>
      <p className="elig-result-foot">
        <EditLink />
      </p>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ProceedFromDate() {
  const { decision, formData, goToAccount, submitReminder } =
    useEligibilityCheck();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(
    'idle'
  );
  if (!decision || !decision.fileFrom) return null;
  const c = RESULT_COPY.proceedFromDate;
  const m = formatMonth(decision.fileFrom);
  const valid = EMAIL_RE.test(email.trim()) && optIn;

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!valid || state === 'sending') return;
    setState('sending');
    try {
      await submitReminder(email.trim());
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="eligibility-result-content">
      <div className="eligibility-result-icon success" aria-hidden="true">
        <CalendarClock className="w-8 h-8" />
      </div>
      <h2 className="eligibility-result-title">{c.title(m)}</h2>
      <p className="eligibility-result-description">
        {c.intro(m)}
        {decision.effectiveFromLocal
          ? ' ' + c.laterContributions(countryLabel(formData.residence))
          : ''}{' '}
        {c.outro}
      </p>
      <div className="elig-result-actions">
        <button
          type="button"
          className="eligibility-btn-next"
          onClick={goToAccount}
        >
          {c.primary}
        </button>
        {!open && state !== 'done' ? (
          <button
            type="button"
            className="eligibility-btn-secondary"
            onClick={() => setOpen(true)}
            aria-expanded={false}
          >
            {c.secondary}
          </button>
        ) : null}
      </div>

      {state === 'done' ? (
        <p className="elig-confirm" role="status">
          {c.done(m)}
        </p>
      ) : open ? (
        <form className="elig-inline-form" onSubmit={onSend} noValidate>
          <label htmlFor="reminder-email" className="eligibility-label">
            Email
          </label>
          <input
            id="reminder-email"
            type="email"
            autoComplete="email"
            className="eligibility-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="elig-check">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
            />
            <span>{c.optIn(m)}</span>
          </label>
          {state === 'error' ? (
            <p className="eligibility-error-message" role="alert">
              Sorry, that did not work. Please try again.
            </p>
          ) : null}
          <button
            type="submit"
            className="eligibility-btn-next"
            disabled={!valid || state === 'sending'}
          >
            {state === 'sending' ? 'Sending…' : c.send}
          </button>
          <p className="elig-storage-note">
            {STORAGE_NOTE}{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener">
              Privacy policy
            </a>
          </p>
        </form>
      ) : null}
      <p className="elig-result-foot">
        <EditLink />
      </p>
    </div>
  );
}

function NotNow() {
  const { decision, formData, submitReview } = useEligibilityCheck();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(
    'idle'
  );
  if (!decision || !decision.blockReason) return null;
  const c = RESULT_COPY.notNow;
  const reason = reasonLine(
    decision.blockReason,
    { residence: formData.residence, sixtyCountry: decision.sixtyCountry },
    countryLabel
  );
  const valid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    EMAIL_RE.test(email.trim());

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!valid || state === 'sending') return;
    setState('sending');
    try {
      await submitReview({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        message: message.trim(),
        hp,
      });
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="eligibility-result-content">
      <div className="eligibility-result-icon neutral" aria-hidden="true">
        <Info className="w-8 h-8" />
      </div>
      <h2 className="eligibility-result-title">{c.title}</h2>
      <p className="eligibility-result-description">{reason}</p>

      {state === 'done' ? (
        <p className="elig-confirm" role="status">
          {c.reviewDone}
        </p>
      ) : (
        <>
          <p className="elig-closing">
            {open ? (
              c.closing
            ) : (
              <button
                type="button"
                className="elig-text-link"
                onClick={() => setOpen(true)}
              >
                {c.closing}
              </button>
            )}
          </p>
          {open ? (
            <form className="elig-inline-form" onSubmit={onSend} noValidate>
              <div className="eligibility-date-row">
                <div>
                  <label htmlFor="review-first" className="eligibility-label">
                    First name
                  </label>
                  <input
                    id="review-first"
                    autoComplete="given-name"
                    className="eligibility-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="review-last" className="eligibility-label">
                    Last name
                  </label>
                  <input
                    id="review-last"
                    autoComplete="family-name"
                    className="eligibility-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <label htmlFor="review-email" className="eligibility-label">
                Email
              </label>
              <input
                id="review-email"
                type="email"
                autoComplete="email"
                className="eligibility-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="review-message" className="eligibility-label">
                Message (optional)
              </label>
              <textarea
                id="review-message"
                className="eligibility-input"
                rows={4}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="eligibility-helper-text">{message.length}/500</p>
              {/* honeypot: hidden from people, filled by bots */}
              <div className="elig-hp" aria-hidden="true">
                <label htmlFor="review-website">Website</label>
                <input
                  id="review-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                />
              </div>
              {state === 'error' ? (
                <p className="eligibility-error-message" role="alert">
                  Sorry, that did not work. Please try again.
                </p>
              ) : null}
              <button
                type="submit"
                className="eligibility-btn-next"
                disabled={!valid || state === 'sending'}
              >
                {state === 'sending' ? 'Sending…' : 'Ask for a free review'}
              </button>
              <p className="elig-storage-note">
                {STORAGE_NOTE}{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener">
                  Privacy policy
                </a>
              </p>
            </form>
          ) : null}
        </>
      )}
      <p className="elig-result-foot">
        <EditLink />
      </p>
    </div>
  );
}

export default function ResultStep() {
  const { decision } = useEligibilityCheck();
  if (!decision) return null;
  return (
    <div className="eligibility-card eligibility-result-card">
      {decision.result === 'PROCEED' ? <Proceed /> : null}
      {decision.result === 'PROCEED_FROM_DATE' ? <ProceedFromDate /> : null}
      {decision.result === 'NOT_NOW' ? <NotNow /> : null}
    </div>
  );
}
