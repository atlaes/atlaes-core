'use client';

import { useId, useState } from 'react';
import {
  CARRIERS,
  COUNTRY_OPTIONS,
  FEATURED_COUNTRY_CODES,
  REGIONAL_CARRIER_KEYS,
} from '@/content/offices';
import { FUNNEL_ENTRY } from '@/content/registries/links';
import { Pill } from '../ui/Pill';
import {
  findOffice,
  resolveWithoutNumber,
  type LastOffice,
  type OfficeFinderResult,
} from './office-routing';
import './widgets.css';

const T = {
  heading: 'Where do I send my refund application?',
  intro:
    'Find the recommended first pension office (Verbindungsstelle) for your claim.',
  lastOffice: 'Which pension office was last in charge of you in Germany?',
  lastOfficeHint:
    'Shown on your Versicherungsverlauf or any DRV letter. Important: if you EVER paid even one contribution to Knappschaft-Bahn-See, select it here — it stays responsible. Not sure? Choose "I don’t know" and we’ll use your insurance number instead.',
  select: 'Select…',
  unknown: 'I don’t know',
  bund: 'DRV Bund (Berlin)',
  kbs: 'DRV Knappschaft-Bahn-See (any contribution, ever)',
  citizenship: 'Your citizenship',
  residence: 'Country you currently live in',
  prefix:
    'First two digits of your German insurance number (Versicherungsnummer)',
  prefixHint:
    'Found on your payslips (SVNR), your social insurance card, or any DRV letter. Example: 13 160894 M 123 → enter 13.',
  prefixPlaceholder: 'e.g. 13',
  noNumber: 'I don’t know my insurance number',
  find: 'Find my pension office',
  reset: '← Start over',
  resultTitle: 'Your recommended first office:',
  noMatchTitle: 'We couldn’t determine your office automatically',
  ctaTitle: 'Or let us prepare and route it for you',
  ctaBody:
    'We prepare everything with you — filing is handled by our German partner law firm. Leave your details and your next steps arrive by email.',
  ctaButton: 'Claim my refund',
  footnote:
    'Based on Deutsche Rentenversicherung’s official liaison-office (Verbindungsstelle) assignments and the official insurance-number ranges. The result is a recommended first office, not a determination of legal responsibility — where several country connections exist, more than one liaison office can be relevant, and the receiving office forwards your application with the date preserved if another office is responsible. Forwarding can add time. Not legal advice.',
};

const SEPARATOR = '──────────────';

function CountrySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const featured = FEATURED_COUNTRY_CODES.map(
    (code) => COUNTRY_OPTIONS.filter((c) => c.code === code)[0]
  ).filter(Boolean);
  return (
    <div className="mk-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="mk-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {T.select}
        </option>
        {featured.map((c) => (
          <option key={'f-' + c.code} value={c.code}>
            {c.name}
          </option>
        ))}
        <option disabled>{SEPARATOR}</option>
        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Native office finder: latest office (incl. "I don't know"), citizenship,
 * residence and — when needed — the first two digits of the insurance number
 * (with an "I don't know my number" path). Rules in `office-routing.ts`,
 * data in `content/offices.ts`. Every result is a "recommended first office"
 * with its verified address.
 */
export function OfficeFinder({ as = 'h2' }: { as?: 'h2' | 'h3' }) {
  const id = useId();
  const [lastOffice, setLastOffice] = useState<'' | LastOffice>('');
  const [citizenship, setCitizenship] = useState('');
  const [residence, setResidence] = useState('');
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OfficeFinderResult | null>(null);
  const Heading = as;

  function show(r: OfficeFinderResult) {
    if (r.kind === 'error') {
      setError(r.message);
      return;
    }
    setError(null);
    setResult(r);
  }

  function reset() {
    setLastOffice('');
    setCitizenship('');
    setResidence('');
    setPrefix('');
    setError(null);
    setResult(null);
  }

  const ctaHref = FUNNEL_ENTRY + '?via=office-finder';

  return (
    <section className="mk-widget mk-widget-office" aria-label={T.heading}>
      <div className="mk-widget-head">
        <Heading>{T.heading}</Heading>
        <p>{T.intro}</p>
      </div>
      <div className="mk-widget-body">
        {!result ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              show(
                findOffice({
                  lastOffice: lastOffice as LastOffice,
                  citizenship,
                  residence,
                  prefix: prefix.trim() === '' ? null : parseInt(prefix, 10),
                })
              );
            }}
          >
            <div className="mk-field">
              <label htmlFor={id + '-lo'}>{T.lastOffice}</label>
              <select
                id={id + '-lo'}
                className="mk-select"
                value={lastOffice}
                onChange={(e) => setLastOffice(e.target.value as LastOffice)}
              >
                <option value="" disabled>
                  {T.select}
                </option>
                <option value="UNKNOWN">{T.unknown}</option>
                <option value="BUND">{T.bund}</option>
                <option value="KBS">{T.kbs}</option>
                {REGIONAL_CARRIER_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {CARRIERS[k].name}
                  </option>
                ))}
              </select>
              <p className="mk-hint">{T.lastOfficeHint}</p>
            </div>
            <CountrySelect
              id={id + '-cit'}
              label={T.citizenship}
              value={citizenship}
              onChange={setCitizenship}
            />
            <CountrySelect
              id={id + '-res'}
              label={T.residence}
              value={residence}
              onChange={setResidence}
            />
            {lastOffice === 'UNKNOWN' ? (
              <div className="mk-field">
                <label htmlFor={id + '-prefix'}>{T.prefix}</label>
                <input
                  id={id + '-prefix'}
                  className="mk-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder={T.prefixPlaceholder}
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
                <p className="mk-hint">{T.prefixHint}</p>
                <button
                  type="button"
                  className="mk-btn-link"
                  onClick={() =>
                    show(resolveWithoutNumber(citizenship, residence))
                  }
                >
                  {T.noNumber}
                </button>
              </div>
            ) : null}
            <button type="submit" className="mk-btn">
              {T.find}
            </button>
            {error ? (
              <p className="mk-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        ) : result.kind === 'office' ? (
          <div className="mk-verdict mk-verdict-ok" role="status">
            <h3>{T.resultTitle}</h3>
            <p className="mk-verdict-big">{result.name}</p>
            <p className="mk-verdict-address">{result.address}</p>
            <p>{result.reason}</p>
            {result.caveats.length ? (
              <ul className="mk-verdict-notes">
                {result.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
            <div className="mk-verdict-cta">
              <h3>{T.ctaTitle}</h3>
              <p>{T.ctaBody}</p>
              <Pill href={ctaHref}>{T.ctaButton}</Pill>
            </div>
            <button type="button" className="mk-btn-link" onClick={reset}>
              {T.reset}
            </button>
          </div>
        ) : (
          <div className="mk-verdict mk-verdict-warn" role="status">
            <h3>{T.noMatchTitle}</h3>
            <p>{result.message}</p>
            <button type="button" className="mk-btn-link" onClick={reset}>
              {T.reset}
            </button>
          </div>
        )}
      </div>
      <div className="mk-widget-foot">{T.footnote}</div>
    </section>
  );
}
