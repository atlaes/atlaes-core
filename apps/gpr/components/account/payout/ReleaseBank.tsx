'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiErrorMessage } from '@/lib/account-api';
import payoutApi, {
  type BankDetailsPayload,
  type PayoutAccount,
  type PayoutState,
} from '@/lib/payout-api';
import {
  bankFieldsFor,
  countryName,
  isValidIban,
  validateBankDetails,
  type BankFieldKey,
} from './bank-validation';
import { RELEASE_FIGMA as T } from './copy';
import { FeePanel } from './FeePanel';
import { Footer, PayoutFrame, Question, releaseTitle } from './PayoutFrame';
import { ReleaseClosed } from './ReleaseClosed';
import { useInvalidatePayout } from './usePayout';

type FormKey = keyof BankDetailsPayload;

const CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'AUD',
  'CAD',
  'NZD',
  'CHF',
  'INR',
  'ZAR',
  'BRL',
  'MXN',
  'TRY',
  'PLN',
  'CZK',
  'HUF',
  'SEK',
  'NOK',
  'DKK',
  'JPY',
  'SGD',
  'HKD',
  'CNY',
  'PHP',
  'IDR',
  'NGN',
  'KES',
  'GHS',
  'EGP',
  'AED',
  'ILS',
];

const DEPRECATED = [
  'AN',
  'BU',
  'CS',
  'DD',
  'DY',
  'FQ',
  'FX',
  'HV',
  'NH',
  'NQ',
  'NT',
  'PC',
  'PU',
  'PZ',
  'RH',
  'SU',
  'TP',
  'UK',
  'VD',
  'WK',
  'YD',
  'YU',
  'ZR',
  'EU',
  'EZ',
  'UN',
  'QO',
  'XA',
  'XB',
  'ZZ',
];

function countryOptions(): Array<{ code: string; name: string }> {
  const out: Array<{ code: string; name: string }> = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (DEPRECATED.indexOf(code) >= 0) continue;
      const name = countryName(code);
      if (name && name !== code) out.push({ code, name });
    }
  }
  return out.sort((x, y) => (x.name < y.name ? -1 : 1));
}

/** Prefill from the confirmed account (or intake) into the form shape. */
function toForm(a: PayoutAccount): BankDetailsPayload {
  const r = a.routingLabel;
  const v = a.routingValue ?? '';
  return {
    accountHolder: a.accountHolder ?? '',
    bank: a.bank ?? '',
    country: a.country ?? '',
    currency: a.currency ?? '',
    iban: a.iban ?? '',
    bic: a.bic ?? '',
    accountNumber:
      a.country === 'MX' ? '' : a.iban ? '' : (a.accountNumber ?? ''),
    clabe: a.country === 'MX' ? (a.accountNumber ?? '') : '',
    routingNumber: r === 'Routing number' ? v : '',
    ifsc: r === 'IFSC' ? v : '',
    sortCode: r === 'Sort code' ? v : '',
    bsb: r === 'BSB' ? v : '',
    transitNumber: r === 'Transit/Institution' ? v.split('-')[0] : '',
    institutionNumber:
      r === 'Transit/Institution' ? (v.split('-')[1] ?? '') : '',
  };
}

function FieldBox({
  id,
  label,
  value,
  editing,
  onEdit,
  onChange,
  error,
  children,
}: {
  id: string;
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onChange?: (v: string) => void;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="pay-field">
      <label htmlFor={id} className="pay-label">
        {label}
      </label>
      <div className="pay-input-box" data-invalid={error ? 'true' : 'false'}>
        {editing ? (
          (children ?? (
            <input
              id={id}
              className="pay-input"
              value={value}
              autoComplete="off"
              onChange={(e) => onChange?.(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? id + '-err' : undefined}
            />
          ))
        ) : (
          <>
            <span className="pay-input-value" id={id}>
              {value}
            </span>
            <button type="button" className="pay-edit" onClick={onEdit}>
              Edit<span className="acc-sr-only"> {label}</span>
            </button>
          </>
        )}
      </div>
      {error ? (
        <p className="pay-error" id={id + '-err'}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Figma 10 (standard) / 13 (small refund) · Release your refund — bank details. */
export function ReleaseBank({ data }: { data: PayoutState }) {
  const router = useRouter();
  const params = useSearchParams();
  const wantEur = params?.get('eur') === '1';
  const invalidate = useInvalidatePayout();
  const release = data.release;
  const initial = useMemo(() => {
    if (!release) return null;
    const f = toForm(release.account ?? release.prefill);
    if (wantEur && f.currency !== 'EUR') {
      return { ...f, currency: 'EUR', iban: '', bic: '', accountNumber: '' };
    }
    return f;
  }, [release, wantEur]);
  const [form, setForm] = useState<BankDetailsPayload | null>(initial);
  const [editing, setEditing] = useState<Record<string, boolean>>(() => {
    const e: Record<string, boolean> = {};
    if (initial) {
      (Object.keys(initial) as FormKey[]).forEach((k) => {
        if (!initial[k]) e[k] = true;
      });
    }
    return e;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const countries = useMemo(countryOptions, []);

  if (!release || release.status !== 'open' || !form) {
    return <ReleaseClosed data={data} />;
  }

  const currency = (form.currency || '').toUpperCase();
  const route = currency === 'EUR' ? 'A' : 'B';
  const fields = bankFieldsFor(form.country, route).filter(
    (f) => f.key !== 'bic'
  );
  const set = (k: FormKey) => (v: string) => setForm({ ...form, [k]: v });
  const edit = (k: string) => () => setEditing({ ...editing, [k]: true });
  const ibanOk = route === 'A' && isValidIban(form.iban);
  const hasIban = fields.some((f) => f.key === 'iban');
  const local = fields.filter((f) => f.key !== 'iban');
  const pairs: (typeof local)[] = [];
  for (let i = 0; i < local.length; i += 2) pairs.push(local.slice(i, i + 2));

  const submit = async () => {
    setFormError(null);
    const local = validateBankDetails(form, route);
    if (!local.ok) {
      setErrors(local.errors as Record<string, string>);
      const e = { ...editing };
      Object.keys(local.errors).forEach((k) => (e[k] = true));
      setEditing(e);
      return;
    }
    setBusy(true);
    try {
      const res = await payoutApi.saveBank(release.id, form);
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      setErrors({});
      await invalidate();
      router.push(
        route === 'A'
          ? '/account/payout/release/sign'
          : '/account/payout/release/route'
      );
    } catch (e) {
      setFormError(apiErrorMessage(e, 'Your bank details could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  const fieldBox = (key: BankFieldKey | 'bank', label: string) => (
    <FieldBox
      key={key}
      id={'pay-' + key}
      label={label}
      value={(form[key] as string) ?? ''}
      editing={!!editing[key]}
      onEdit={edit(key)}
      onChange={set(key)}
      error={errors[key]}
    />
  );

  return (
    <PayoutFrame title={releaseTitle(1)} step={1}>
      <Question title={T.title} lead={T.lead} />
      <FeePanel panel={release.panel} />

      <section
        className="pay-card pay-card-bank"
        aria-labelledby="pay-bank-title"
      >
        <div className="pay-card-head">
          <h2 id="pay-bank-title" className="pay-card-title">
            {T.bankTitle}
          </h2>
          <span className="pay-card-hint">{T.bankHint}</span>
        </div>

        <FieldBox
          id="pay-holder"
          label="Account holder"
          value={form.accountHolder}
          editing={!!editing.accountHolder}
          onEdit={edit('accountHolder')}
          onChange={set('accountHolder')}
          error={errors.accountHolder}
        />

        {hasIban ? (
          <div className="pay-field">
            {fieldBox('iban', 'IBAN')}
            {ibanOk && !errors.iban ? (
              <p className="pay-check">{T.sepaCheck}</p>
            ) : null}
          </div>
        ) : null}
        {pairs.map((pair) =>
          pair.length === 2 ? (
            <div key={pair[0].key} className="pay-row2">
              {fieldBox(pair[0].key, pair[0].label)}
              {fieldBox(pair[1].key, pair[1].label)}
            </div>
          ) : (
            fieldBox(pair[0].key, pair[0].label)
          )
        )}

        <div className="pay-row2">
          {fieldBox('bic', 'BIC')}
          {fieldBox('bank', 'Bank')}
        </div>

        <div className="pay-row2">
          <FieldBox
            id="pay-country"
            label="Account country"
            value={countryName(form.country)}
            editing={!!editing.country}
            onEdit={edit('country')}
            error={errors.country}
          >
            <select
              id="pay-country"
              className="pay-select"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            >
              <option value="">Choose…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </FieldBox>
          <FieldBox
            id="pay-currency"
            label="Account currency"
            value={currency}
            editing={!!editing.currency}
            onEdit={edit('currency')}
            error={errors.currency}
          >
            <select
              id="pay-currency"
              className="pay-select"
              value={currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="">Choose…</option>
              {(CURRENCIES.indexOf(currency) < 0 && currency
                ? [currency].concat(CURRENCIES)
                : CURRENCIES
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FieldBox>
        </div>

        <p className="pay-muted">{T.reviewNotice}</p>
      </section>

      {formError ? (
        <p className="pay-error" role="alert">
          {formError}
        </p>
      ) : null}

      <Footer
        backHref="/account"
        cta={busy ? 'Saving…' : 'Continue'}
        onCta={() => void submit()}
        disabled={busy}
      />
    </PayoutFrame>
  );
}
