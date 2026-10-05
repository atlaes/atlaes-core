'use client';

/**
 * Hero flow card = step 1 of the intake flow (Homepage Build Sheet, Hero):
 * citizenship + country of residence as searchable selects, no personal
 * data. Submitting routes into the existing funnel (`FUNNEL_ENTRY`) with
 * `?citizenship=…&residence=…` plus the attribution params, so the funnel
 * prefills the answers and never re-asks them.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/data/countries';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import { handoffAttributionQuery } from '@/lib/attribution';
import {
  preliminaryHint,
  type PreliminaryHint,
} from '../widgets/preliminary-verdict';
import { motionAllowed } from '../motion/flag';
import { MOTION } from '../motion/tokens';
import './flow-card.css';

/** useLayoutEffect in the browser (no flash of the new hint text before
 * the cross-fade starts), useEffect on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
      <span className="mk-flow-input">
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
  const verdictKey = verdict
    ? verdict.status + '|' + verdict.title + '|' + verdict.body
    : '';
  // Keep the last verdict mounted while the hint collapses again.
  const lastVerdict = useRef(verdict);
  if (verdict) lastVerdict.current = verdict;
  // Figma 02 C′: when an answer changes while the hint is open, the old
  // text fades out (150ms) and the new one fades in (150ms); the panel
  // does not re-open. Instant without motion.
  const [held, setHeld] = useState<typeof verdict>(null);
  const wasOpen = useRef(false);
  const shownKey = useRef('');
  /** What the last committed render showed (set after every commit). */
  const painted = useRef<typeof verdict>(null);
  useIsoLayoutEffect(() => {
    if (!verdict) {
      wasOpen.current = false;
      return;
    }
    const swap = wasOpen.current && shownKey.current !== verdictKey;
    wasOpen.current = true;
    if (!swap || !motionAllowed()) {
      shownKey.current = verdictKey;
      setHeld(null);
      return;
    }
    // hold the old text while it fades out, then show the new one
    setHeld((h) => h || painted.current);
    const t = window.setTimeout(() => {
      shownKey.current = verdictKey;
      setHeld(null);
    }, MOTION.instant);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdictKey]);
  const shown = held || verdict || lastVerdict.current;
  useIsoLayoutEffect(() => {
    painted.current = shown;
  });

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
      {/* Preliminary hint from the country-only verdict rules
          (lib/eligibility-verdicts.ts), verbatim verdict texts. */}
      <div
        className="mk-flow-hint"
        data-open={verdict ? 'true' : 'false'}
        aria-live="polite"
      >
        <div
          className={'mk-flow-hint-inner' + (held ? ' is-swapping' : '')}
          aria-hidden={!verdict || undefined}
        >
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
        {FLOW_CARD_COPY.button.replace(/\s*→$/, '')}{' '}
        <span className="mk-pill-arrow" aria-hidden="true">
          →
        </span>
      </button>
      <p className="mk-flow-micro">{FLOW_CARD_COPY.microcopy}</p>
    </form>
  );
}
