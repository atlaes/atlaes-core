'use client';

/**
 * Contact form → `POST /api/leads` (`type: 'claim-lead'`,
 * `placement: 'contact'`). The lead endpoint has no free-text field, so
 * the message travels in `verdictTitle` (255 chars, stored and shown to
 * ops as the lead's context line); the first-touch attribution record is
 * attached like the other lead forms.
 */
import { useId, useState, type FormEvent } from 'react';
import { getAttribution, type Attribution } from '@/lib/attribution';
import { CONTACT_FORM } from '@/content/pages/contact-us';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const LEADS_URL = API_BASE_URL + '/api/leads';
export const MESSAGE_MAX = 255;

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'invalid';

/** Pure: the JSON body for a submission. */
export function contactPayload(input: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  hp: string;
  pageReferrer: string;
}): Record<string, unknown> {
  const a: Partial<Attribution> = getAttribution() || {};
  return {
    type: 'claim-lead',
    placement: 'contact',
    widget: 'CONTACT-FORM',
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    verdictTitle: input.message.trim().slice(0, MESSAGE_MAX),
    pageReferrer: input.pageReferrer,
    landingPage: a.landingPage,
    referrer: a.referrer,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    utmTerm: a.utmTerm,
    utmContent: a.utmContent,
    gclid: a.gclid,
    fbclid: a.fbclid,
    via: a.via,
    submittedAt: new Date().toISOString(),
    hp: input.hp,
  };
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function ContactForm() {
  const uid = useId();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !message.trim() ||
      !isEmail(email)
    ) {
      setStatus('invalid');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(LEADS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          contactPayload({
            firstName,
            lastName,
            email,
            message,
            hp,
            pageReferrer: window.location.href,
          })
        ),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="mk-flow-card" role="status">
        <p className="mk-flow-title">{CONTACT_FORM.title}</p>
        <p className="mk-p">{CONTACT_FORM.success}</p>
      </div>
    );
  }

  return (
    <form
      className="mk-flow-card"
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={uid + '-title'}
    >
      <p id={uid + '-title'} className="mk-flow-title">
        {CONTACT_FORM.title}
      </p>
      <div className="mk-field">
        <label htmlFor={uid + '-first'} className="mk-field-label">
          {CONTACT_FORM.firstName}
        </label>
        <input
          id={uid + '-first'}
          name="firstName"
          className="mk-input"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={CONTACT_FORM.firstNamePlaceholder}
          autoComplete="given-name"
          required
        />
      </div>
      <div className="mk-field">
        <label htmlFor={uid + '-last'} className="mk-field-label">
          {CONTACT_FORM.lastName}
        </label>
        <input
          id={uid + '-last'}
          name="lastName"
          className="mk-input"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={CONTACT_FORM.lastNamePlaceholder}
          autoComplete="family-name"
          required
        />
      </div>
      <div className="mk-field">
        <label htmlFor={uid + '-email'} className="mk-field-label">
          {CONTACT_FORM.email}
        </label>
        <input
          id={uid + '-email'}
          name="email"
          type="email"
          className="mk-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={CONTACT_FORM.emailPlaceholder}
          autoComplete="email"
          required
        />
      </div>
      <div className="mk-field">
        <label htmlFor={uid + '-message'} className="mk-field-label">
          {CONTACT_FORM.message}
        </label>
        <textarea
          id={uid + '-message'}
          name="message"
          className="mk-input"
          rows={5}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={CONTACT_FORM.messagePlaceholder}
          required
        />
      </div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor={uid + '-hp'}>Company</label>
        <input
          id={uid + '-hp'}
          name="hp"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>
      {status === 'invalid' ? (
        <p className="mk-field-error" role="alert">
          {CONTACT_FORM.invalid}
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="mk-field-error" role="alert">
          {CONTACT_FORM.error}
        </p>
      ) : null}
      <button
        type="submit"
        className="mk-pill mk-pill-primary mk-pill-lg"
        disabled={status === 'sending'}
      >
        {status === 'sending' ? CONTACT_FORM.sending : CONTACT_FORM.submit}
      </button>
    </form>
  );
}
