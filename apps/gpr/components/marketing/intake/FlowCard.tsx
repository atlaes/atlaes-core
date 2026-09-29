'use client';

/**
 * Hero flow card = step 1 of the intake flow (Homepage Build Sheet, Hero):
 * citizenship + country of residence as searchable selects, no personal
 * data. Submitting routes into the existing funnel (`FUNNEL_ENTRY`) with
 * `?citizenship=…&residence=…` plus the attribution params, so the funnel
 * prefills the answers and never re-asks them.
 */
import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/data/countries';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import { handoffAttributionQuery } from '@/lib/attribution';

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
}: {
  id: string;
  listId: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="mk-field">
      <label htmlFor={id} className="mk-field-label">
        {label}
      </label>
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
      />
      <CountryField
        id={uid + '-residence'}
        listId={listId}
        label={FLOW_CARD_COPY.residence}
        value={residence}
        onChange={setResidence}
        invalid={invalidResidence}
      />
      {invalidCitizenship || invalidResidence ? (
        <p className="mk-field-error" role="alert">
          Please choose a country from the list.
        </p>
      ) : null}
      <button type="submit" className="mk-pill mk-pill-primary mk-pill-lg">
        {FLOW_CARD_COPY.button}
      </button>
      <p className="mk-flow-micro">{FLOW_CARD_COPY.microcopy}</p>
    </form>
  );
}
