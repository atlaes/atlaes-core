'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPayoutAccounts,
  savePayoutAccount,
  type PayoutAccountEntry,
  type PayoutAccountInput,
} from '@/lib/payout-accounts-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';

const HINT: Record<PayoutAccountEntry['key'], string> = {
  atlaes:
    'Receives the ATLAES share (payout queue line 1, reference = invoice number) and is printed on the payment declaration. Clients cannot sign until it is set.',
  summitfx_collection:
    'Route 2 payouts (conversion through SummitFX) are paid into this account. The reference field is the provider’s required reference.',
  wise_collection:
    'Stored for payouts through Wise. Not used in the payout queue yet; which payouts go to Wise is still to be decided.',
};

const EMPTY: PayoutAccountInput = {
  holder: '',
  iban: '',
  bic: null,
  bank: null,
  reference: null,
};

/**
 * Settings → Payout accounts. Every change is validated (IBAN checksum,
 * BIC), audited and mailed to ops by the backend; the form asks for a
 * confirmation that names the old and new IBAN before saving.
 */
export function PayoutAccountsCard() {
  const accounts = useQuery({
    queryKey: ['admin-payout-accounts'],
    queryFn: getPayoutAccounts,
  });

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Payout accounts</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Where the payout queue sends money. Changes are logged and e-mailed to
        operations.
      </p>
      {accounts.isLoading ? (
        <Spinner />
      ) : accounts.isError ? (
        <div className="mt-3">
          <ErrorText
            error={accounts.error}
            fallback="Could not load the accounts"
          />
        </div>
      ) : (
        <div className="mt-4 divide-y divide-gray-100">
          {accounts.data?.map((entry) => (
            <AccountRow key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function AccountRow({ entry }: { entry: PayoutAccountEntry }) {
  const queryClient = useQueryClient();
  const a = entry.account;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PayoutAccountInput>(EMPTY);

  const save = useMutation({
    mutationFn: () => savePayoutAccount(entry.key, form),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['admin-payout-accounts'] });
    },
  });

  const startEdit = () => {
    setForm(
      a
        ? {
            holder: a.holder,
            iban: a.iban,
            bic: a.bic,
            bank: a.bank,
            reference: a.reference,
          }
        : EMPTY
    );
    save.reset();
    setEditing(true);
  };

  const id = (f: string) => `${entry.key}-${f}`;
  const set =
    (f: keyof PayoutAccountInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value || null }));

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{entry.label}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{HINT[entry.key]}</p>
        </div>
        <StatusDot
          tone={a ? 'good' : entry.key === 'atlaes' ? 'bad' : 'neutral'}
        >
          {a
            ? a.source === 'env'
              ? 'Set (deploy setting)'
              : 'Set'
            : 'Not set'}
        </StatusDot>
      </div>

      {!editing && a && (
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-gray-500">Holder</dt>
          <dd className="text-gray-900">{a.holder}</dd>
          <dt className="text-gray-500">IBAN</dt>
          <dd className="break-all font-mono text-gray-900">{a.iban}</dd>
          {a.bic && (
            <>
              <dt className="text-gray-500">BIC</dt>
              <dd className="font-mono text-gray-900">{a.bic}</dd>
            </>
          )}
          {a.bank && (
            <>
              <dt className="text-gray-500">Bank</dt>
              <dd className="text-gray-900">{a.bank}</dd>
            </>
          )}
          {a.reference && (
            <>
              <dt className="text-gray-500">Reference</dt>
              <dd className="font-mono text-gray-900">{a.reference}</dd>
            </>
          )}
          {a.updatedAt && (
            <>
              <dt className="text-gray-500">Changed</dt>
              <dd className="text-gray-900">
                {formatDate(a.updatedAt, true)}
                {a.updatedByEmail ? ` by ${a.updatedByEmail}` : ''}
              </dd>
            </>
          )}
        </dl>
      )}

      {editing ? (
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const old = a?.iban;
            const message = old
              ? `Change the ${entry.label}?\n\nIBAN ${old}\n→ ${form.iban}\n\nFuture payouts go to the new account.`
              : `Save the ${entry.label} with IBAN ${form.iban}?`;
            if (window.confirm(message)) save.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <Field label="Account holder" htmlFor={id('holder')}>
              <input
                id={id('holder')}
                required
                value={form.holder}
                onChange={set('holder')}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="IBAN" htmlFor={id('iban')}>
              <input
                id={id('iban')}
                required
                autoComplete="off"
                spellCheck={false}
                value={form.iban}
                onChange={set('iban')}
                className={`${inputClass} font-mono`}
              />
            </Field>
          </div>
          <Field label="BIC (optional)" htmlFor={id('bic')}>
            <input
              id={id('bic')}
              spellCheck={false}
              value={form.bic ?? ''}
              onChange={set('bic')}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Bank (optional)" htmlFor={id('bank')}>
            <input
              id={id('bank')}
              value={form.bank ?? ''}
              onChange={set('bank')}
              className={inputClass}
            />
          </Field>
          {entry.key !== 'atlaes' && (
            <div className="sm:col-span-2">
              <Field
                label="Reference (Verwendungszweck)"
                htmlFor={id('reference')}
                hint="The reference the provider requires on every transfer."
              >
                <input
                  id={id('reference')}
                  value={form.reference ?? ''}
                  onChange={set('reference')}
                  className={`${inputClass} font-mono`}
                />
              </Field>
            </div>
          )}
          {save.isError && (
            <div className="sm:col-span-2">
              <ErrorText
                error={save.error}
                fallback="Could not save the account"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="submit"
              variant="primary"
              disabled={
                !form.holder.trim() || !form.iban.trim() || save.isPending
              }
            >
              {save.isPending ? 'Saving…' : 'Save account'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <Button size="sm" onClick={startEdit}>
            {a ? 'Change' : 'Set account'}
          </Button>
        </div>
      )}
    </div>
  );
}
