'use client';

/**
 * Hero flow card = step 1 of the intake flow (Homepage Build Sheet, Hero):
 * citizenship + country of residence as searchable selects, no personal
 * data. Submitting routes into the existing funnel (`FUNNEL_ENTRY`) with
 * `?citizenship=…&residence=…` plus the attribution params, so the funnel
 * prefills the answers and never re-asks them.
 */
import { useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/data/countries';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import { handoffAttributionQuery } from '@/lib/attribution';
import {
  preliminaryHint,
  type PreliminaryHint,
} from '../widgets/preliminary-verdict';
import './flow-card.css';

export const FLOW_CARD_COPY = {
  heading: 'Check your eligibility',
  subline: 'Free · a few quick questions · see your answer before any sign-up',
  citizenship: 'Citizenship',
  residence: 'Country of residence',
  button: 'Check my eligibility →',
  microcopy: 'No personal details are needed to see your answer.',
} as const;

/** Canonical country name for a typed value (case-insensitive), or null. */
export function matchCountry(value: string): string | null {
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  for (let i = 0; i < COUNTRIES.length; i++) {
    if (COUNTRIES[i].toLowerCase() === needle) return COUNTRIES[i];
  }
  return null;
}

/** Pure: the funnel URL for a submitted card. */
export function funnelHref(
  citizenship: string,
  residence: string,
  attribution: URLSearchParams
): string {
  const params = new URLSearchParams();
  params.set('citizenship', citizenship);
  params.set('residence', residence);
  attribution.forEach((value, key) => {
    params.set(key, value);
  });
  return FUNNEL_ENTRY + '?' + params.toString();
}

function CountryField({
  id,
  listId,
  label,
  value,
  onChange,
  invalid,
  valid,
}: {
  id: string;
  listId: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  valid: boolean;
}) {
  return (
    <div className="mk-field">
      <label htmlFor={id} className="mk-field-label">
        {label}
      </label>
      <span className={'mk-flow-input' + (valid ? ' is-valid' : '')}>
        <input
          id={id}
          name={id}
          list={listId}
          className={'mk-input' + (invalid ? ' mk-input-invalid' : '')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          placeholder="Start typing…"
          aria-invalid={invalid || undefined}
          required
        />
        <svg
          className="mk-flow-tick"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
    </div>
  );
}

export function FlowCard() {
  const router = useRouter();
  const uid = useId();
  const listId = uid + '-countries';
  const [citizenship, setCitizenship] = useState('');
  const [residence, setResidence] = useState('');
  const [touched, setTouched] = useState(false);

  const citizenshipMatch = matchCountry(citizenship);
  const residenceMatch = matchCountry(residence);
  const invalidCitizenship = touched && !citizenshipMatch;
  const invalidResidence = touched && !residenceMatch;
  const ready = Boolean(citizenshipMatch && residenceMatch);
  const hint: PreliminaryHint | null = ready
    ? preliminaryHint(citizenshipMatch!, residenceMatch!)
    : null;
  const verdict = hint && hint.kind === 'verdict' ? hint.verdict : null;
  // Keep the last verdict mounted while the hint collapses again.
  const lastVerdict = useRef(verdict);
  if (verdict) lastVerdict.current = verdict;
  const shown = verdict || lastVerdict.current;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (!citizenshipMatch || !residenceMatch) return;
    const attribution = handoffAttributionQuery(window.location.search);
    router.push(funnelHref(citizenshipMatch, residenceMatch, attribution));
  }

  return (
    <form
      className="mk-flow-card"
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={uid + '-title'}
    >
      <p id={uid + '-title'} className="mk-flow-title">
        {FLOW_CARD_COPY.heading}
      </p>
      <p className="mk-flow-sub">{FLOW_CARD_COPY.subline}</p>
      <datalist id={listId}>
        {COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <CountryField
        id={uid + '-citizenship'}
        listId={listId}
        label={FLOW_CARD_COPY.citizenship}
        value={citizenship}
        onChange={setCitizenship}
        invalid={invalidCitizenship}
        valid={Boolean(citizenshipMatch)}
      />
      <CountryField
        id={uid + '-residence'}
        listId={listId}
        label={FLOW_CARD_COPY.residence}
        value={residence}
        onChange={setResidence}
        invalid={invalidResidence}
        valid={Boolean(residenceMatch)}
      />
      {/* Preliminary hint from the country-only verdict rules
          (lib/eligibility-verdicts.ts), verbatim verdict texts. */}
      <div
        className="mk-flow-hint"
        data-open={verdict ? 'true' : 'false'}
        aria-live="polite"
      >
        <div className="mk-flow-hint-inner" aria-hidden={!verdict || undefined}>
          {shown ? (
            <div className={'mk-flow-hint-box is-' + shown.status}>
              <p className="mk-flow-hint-title">{shown.title}</p>
              <p className="mk-flow-hint-body">{shown.body}</p>
            </div>
          ) : null}
        </div>
      </div>
      {invalidCitizenship || invalidResidence ? (
        <p className="mk-field-error" role="alert">
          Please choose a country from the list.
        </p>
      ) : null}
      <button
        type="submit"
        className={
          'mk-pill mk-pill-primary mk-pill-lg' + (ready ? ' mk-flow-ready' : '')
        }
      >
        {FLOW_CARD_COPY.button}
      </button>
      <p className="mk-flow-micro">{FLOW_CARD_COPY.microcopy}</p>
    </form>
  );
}
