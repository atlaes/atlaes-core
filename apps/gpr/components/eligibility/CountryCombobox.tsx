'use client';

/**
 * Searchable country select (eligibility brief § 7): word-start typeahead
 * with aliases, list order likely country → top five → divider → A–Z, no
 * preselection. ARIA 1.2 combobox pattern (input + listbox). The value is
 * an ISO code; a typed text that resolves exactly (name, alias, code) is
 * accepted on blur, anything else leaves the value empty.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  countryLabel,
  orderedCountries,
  resolveCountry,
  searchCountries,
  type CountryOption,
} from '@/lib/country-search';
import './country-combobox.css';

export interface CountryComboboxProps {
  id?: string;
  label: string;
  value: string | null;
  onChange: (code: string | null) => void;
  /** Ordering hint: the visitor's likely country (never preselected). */
  likely?: string | null;
  /** The five most frequent countries for this select. */
  top: string[];
  hint?: string;
  invalid?: boolean;
  placeholder?: string;
  /** Input class (lets the marketing hero keep its own field look). */
  inputClassName?: string;
  labelClassName?: string;
  fieldClassName?: string;
  autoFocus?: boolean;
}

type Row =
  | { kind: 'option'; country: CountryOption; key: string }
  | { kind: 'divider'; key: string };

export function CountryCombobox({
  id,
  label,
  value,
  onChange,
  likely = null,
  top,
  hint,
  invalid = false,
  placeholder = 'Start typing…',
  inputClassName = 'eligibility-input',
  labelClassName = 'eligibility-label',
  fieldClassName = 'eligibility-form-group',
  autoFocus,
}: CountryComboboxProps) {
  const uid = useId();
  const inputId = id || uid + '-input';
  const listId = uid + '-list';
  const hintId = uid + '-hint';
  const [text, setText] = useState(countryLabel(value));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the shown text in step with a value set from outside (prefill).
  useEffect(() => {
    setText(countryLabel(value));
  }, [value]);

  const rows: Row[] = useMemo(() => {
    if (query.trim()) {
      return searchCountries(query).map((c) => ({
        kind: 'option' as const,
        country: c,
        key: c.code,
      }));
    }
    const g = orderedCountries(likely, top);
    const out: Row[] = g.pinned.map((c) => ({
      kind: 'option' as const,
      country: c,
      key: 'pin-' + c.code,
    }));
    if (out.length) out.push({ kind: 'divider', key: 'divider' });
    g.all.forEach((c) => out.push({ kind: 'option', country: c, key: c.code }));
    return out;
  }, [query, likely, top]);

  const options = rows.filter(
    (r): r is Extract<Row, { kind: 'option' }> => r.kind === 'option'
  );

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [active, open]);

  function choose(c: CountryOption) {
    onChange(c.code);
    setText(c.name);
    setQuery('');
    setOpen(false);
  }

  function commitTyped() {
    const hit = resolveCountry(text);
    if (hit) {
      if (hit.code !== value) onChange(hit.code);
      setText(hit.name);
    } else if (text.trim() === '') {
      if (value) onChange(null);
    } else if (value && text !== countryLabel(value)) {
      onChange(null);
    }
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && options[active]) {
        e.preventDefault();
        choose(options[active].country);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setText(countryLabel(value));
        setQuery('');
        setOpen(false);
      }
    } else if (e.key === 'Tab') {
      commitTyped();
    }
  }

  let optionIndex = -1;
  const activeOption = open ? options[active] : undefined;

  return (
    <div className={fieldClassName + ' gpr-cc'}>
      <label htmlFor={inputId} className={labelClassName}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="eligibility-helper-text gpr-cc-hint">
          {hint}
        </p>
      ) : null}
      <div className="gpr-cc-wrap">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            activeOption ? listId + '-' + activeOption.key : undefined
          }
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          className={
            inputClassName +
            ' gpr-cc-input' +
            (invalid ? ' eligibility-input-error mk-input-invalid' : '')
          }
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setActive(0);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onBlur={commitTyped}
          onKeyDown={onKeyDown}
        />
        {open ? (
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label={label}
            className="gpr-cc-list"
          >
            {options.length === 0 ? (
              <li className="gpr-cc-empty" role="presentation">
                No country found
              </li>
            ) : (
              rows.map((r) => {
                if (r.kind === 'divider') {
                  return (
                    <li
                      key={r.key}
                      role="separator"
                      className="gpr-cc-divider"
                    />
                  );
                }
                optionIndex += 1;
                const idx = optionIndex;
                const isActive = idx === active;
                return (
                  <li
                    key={r.key}
                    id={listId + '-' + r.key}
                    role="option"
                    aria-selected={r.country.code === value}
                    data-active={isActive ? 'true' : undefined}
                    className="gpr-cc-option"
                    // mousedown, not click: runs before the input's blur
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(r.country);
                    }}
                    onMouseEnter={() => setActive(idx)}
                  >
                    {r.country.name}
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export default CountryCombobox;
