'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLexofficeStatus,
  removeLexofficeKey,
  setLexofficeKey,
  testLexoffice,
  type LexofficeStatus,
  type LexofficeTestResult,
} from '@/lib/admin-api';
import {
  Button,
  ErrorText,
  Field,
  PageHeader,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';
import { PayoutAccountsCard } from '@/components/PayoutAccountsCard';
import { OpsSettingsCard } from '@/components/OpsSettingsCard';

const SOURCE_LABEL: Record<LexofficeStatus['source'], string> = {
  admin: 'Connected (key set here)',
  env: 'Connected (deploy secret)',
  none: 'Not connected',
};

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Integrations, payout accounts and the direct-route postal authority the platform uses. API keys are stored encrypted and are never shown again after saving."
      />
      <div className="max-w-2xl space-y-6">
        <PayoutAccountsCard />
        <OpsSettingsCard />
        <LexwareCard />
      </div>
    </div>
  );
}

function LexwareCard() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [editing, setEditing] = useState(false);
  const [test, setTest] = useState<LexofficeTestResult | null>(null);

  const status = useQuery({
    queryKey: ['admin-integration-lexoffice'],
    queryFn: getLexofficeStatus,
  });
  const update = (s: LexofficeStatus) =>
    queryClient.setQueryData(['admin-integration-lexoffice'], s);

  const save = useMutation({
    mutationFn: () => setLexofficeKey(apiKey),
    onSuccess: (s) => {
      update(s);
      setApiKey('');
      setEditing(false);
      setTest(null);
    },
  });
  const remove = useMutation({
    mutationFn: removeLexofficeKey,
    onSuccess: (s) => {
      update(s);
      setTest(null);
    },
  });
  const check = useMutation({ mutationFn: testLexoffice, onSuccess: setTest });

  const s = status.data;
  const showForm = editing || s?.source === 'none';

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Lexware Office
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Creates the ATLAES invoice when funds arrive. Without a key,
            invoices stay pending.
          </p>
        </div>
        {s && (
          <StatusDot tone={s.source === 'none' ? 'neutral' : 'good'}>
            {SOURCE_LABEL[s.source]}
          </StatusDot>
        )}
      </div>

      {status.isLoading ? (
        <Spinner />
      ) : status.isError ? (
        <div className="mt-3">
          <ErrorText
            error={status.error}
            fallback="Could not load the settings"
          />
        </div>
      ) : (
        s && (
          <>
            {s.source !== 'none' && (
              <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-gray-500">API key</dt>
                <dd className="font-mono text-gray-900">•••• {s.last4}</dd>
                {s.companyName && (
                  <>
                    <dt className="text-gray-500">Account</dt>
                    <dd className="text-gray-900">{s.companyName}</dd>
                  </>
                )}
                {s.updatedAt && (
                  <>
                    <dt className="text-gray-500">Changed</dt>
                    <dd className="text-gray-900">
                      {formatDate(s.updatedAt, true)}
                      {s.updatedByEmail ? ` by ${s.updatedByEmail}` : ''}
                    </dd>
                  </>
                )}
                <dt className="text-gray-500">API</dt>
                <dd className="break-all text-gray-900">{s.baseUrl}</dd>
              </dl>
            )}

            {test && (
              <p
                role="status"
                className={`mt-4 rounded-md px-3 py-2 text-sm ${
                  test.ok
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {test.ok
                  ? `Connection works${test.companyName ? ` — ${test.companyName}` : ''}.`
                  : test.error}
              </p>
            )}

            {showForm ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (apiKey.trim()) save.mutate();
                }}
              >
                <Field
                  label={s.source === 'none' ? 'API key' : 'New API key'}
                  htmlFor="lexware-key"
                  hint="Create it in Lexware Office under Add-ons → Public API. It is checked with Lexware before it is saved."
                >
                  <input
                    id="lexware-key"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                </Field>
                {save.isError && (
                  <ErrorText
                    error={save.error}
                    fallback="Could not save the key"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!apiKey.trim() || save.isPending}
                  >
                    {save.isPending ? 'Checking…' : 'Check and save'}
                  </Button>
                  {s.source !== 'none' && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditing(false);
                        setApiKey('');
                        save.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => check.mutate()}
                  disabled={check.isPending}
                >
                  {check.isPending ? 'Testing…' : 'Test connection'}
                </Button>
                <Button onClick={() => setEditing(true)}>Replace key</Button>
                {s.source === 'admin' && (
                  <Button
                    variant="danger"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Remove the Lexware key? Invoicing falls back to the deploy secret, or stays pending if there is none.'
                        )
                      ) {
                        remove.mutate();
                      }
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}
            {(remove.isError || check.isError) && (
              <div className="mt-3">
                <ErrorText
                  error={remove.error ?? check.error}
                  fallback="Request failed"
                />
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}
