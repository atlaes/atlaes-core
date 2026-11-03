'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOpsSettings,
  saveOpsSetting,
  type DispatchOperator,
  type OpsSetting,
  type PostalAgent,
} from '@/lib/ops-settings-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';

const QUERY_KEY = ['admin-ops-settings'];

const EMPTY_AGENT: PostalAgent = {
  salutation: 'Frau',
  name: '',
  coLine: null,
  street: '',
  postalCode: '',
  city: '',
};

/**
 * Settings → Direct route. The postal authority is printed on direct-route
 * cover letters and the Postempfangsvollmacht as the correspondence
 * address; the dispatch operator is prefilled as the sender when admin
 * records a dispatch. Changes are audited by the backend.
 */
export function OpsSettingsCard() {
  const settings = useQuery({ queryKey: QUERY_KEY, queryFn: getOpsSettings });
  const byKey = (key: OpsSetting['key']) =>
    settings.data?.find((s) => s.key === key);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Direct route</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Who receives the post for direct-route clients and who sends the packs.
      </p>
      {settings.isLoading ? (
        <Spinner />
      ) : settings.isError ? (
        <div className="mt-3">
          <ErrorText
            error={settings.error}
            fallback="Could not load the settings"
          />
        </div>
      ) : (
        <div className="mt-4 divide-y divide-gray-100">
          {byKey('postal_agent') && (
            <PostalAgentRow setting={byKey('postal_agent')!} />
          )}
          {byKey('direct_dispatch_operator') && (
            <DispatchOperatorRow setting={byKey('direct_dispatch_operator')!} />
          )}
        </div>
      )}
    </section>
  );
}

function SourceDot({ setting }: { setting: OpsSetting }) {
  if (setting.source === 'admin') return <StatusDot tone="good">Set</StatusDot>;
  return setting.value ? (
    <StatusDot tone="neutral">Default</StatusDot>
  ) : (
    <StatusDot tone="wait">Not set</StatusDot>
  );
}

function Changed({ setting }: { setting: OpsSetting }) {
  if (!setting.updatedAt) return null;
  return (
    <>
      <dt className="text-gray-500">Changed</dt>
      <dd className="text-gray-900">
        {formatDate(setting.updatedAt, true)}
        {setting.updatedByEmail ? ` by ${setting.updatedByEmail}` : ''}
      </dd>
    </>
  );
}

function PostalAgentRow({ setting }: { setting: OpsSetting }) {
  const queryClient = useQueryClient();
  const current = (setting.value as PostalAgent | null) ?? null;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PostalAgent>(EMPTY_AGENT);

  const save = useMutation({
    mutationFn: () =>
      saveOpsSetting('postal_agent', {
        salutation: form.salutation,
        name: form.name.trim(),
        coLine: form.coLine?.trim() || null,
        street: form.street.trim(),
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const set =
    (f: keyof PostalAgent) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));
  const complete =
    form.name.trim() &&
    form.street.trim() &&
    form.postalCode.trim() &&
    form.city.trim();

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{setting.label}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Correspondence address on direct-route cover letters and the
            Postempfangsvollmacht (DRV and bAV). New packs use the new address;
            packs already generated keep theirs.
          </p>
        </div>
        <SourceDot setting={setting} />
      </div>

      {!editing && current && (
        <>
          <address className="mt-3 whitespace-pre-line text-sm not-italic text-gray-900">
            {[
              [current.salutation, current.name].filter(Boolean).join(' '),
              current.coLine,
              current.street,
              `${current.postalCode} ${current.city}`,
            ]
              .filter(Boolean)
              .join('\n')}
          </address>
          <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
            <Changed setting={setting} />
          </dl>
        </>
      )}

      {editing ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (complete) save.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Salutation"
              htmlFor="pa-salutation"
              hint="Used in the DRV direct cover letter: “habe ich Frau Anna Kliem … bevollmächtigt”."
            >
              <select
                id="pa-salutation"
                value={form.salutation}
                onChange={set('salutation')}
                className={inputClass}
              >
                <option value="Frau">Frau</option>
                <option value="Herr">Herr</option>
                <option value="">None (e.g. a company)</option>
              </select>
            </Field>
            <Field label="Name" htmlFor="pa-name">
              <input
                id="pa-name"
                value={form.name}
                onChange={set('name')}
                className={inputClass}
                maxLength={120}
              />
            </Field>
            <Field
              label="c/o or company (optional)"
              htmlFor="pa-co"
              hint="Printed under the name."
            >
              <input
                id="pa-co"
                value={form.coLine ?? ''}
                onChange={set('coLine')}
                className={inputClass}
                maxLength={120}
              />
            </Field>
            <Field label="Street and number" htmlFor="pa-street">
              <input
                id="pa-street"
                value={form.street}
                onChange={set('street')}
                className={inputClass}
                maxLength={120}
              />
            </Field>
            <Field label="Postal code" htmlFor="pa-zip">
              <input
                id="pa-zip"
                value={form.postalCode}
                onChange={set('postalCode')}
                className={inputClass}
                maxLength={12}
              />
            </Field>
            <Field label="City" htmlFor="pa-city">
              <input
                id="pa-city"
                value={form.city}
                onChange={set('city')}
                className={inputClass}
                maxLength={80}
              />
            </Field>
          </div>
          {save.isError && (
            <ErrorText error={save.error} fallback="Could not save" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!complete || save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                save.reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => {
              setForm(current ? { ...EMPTY_AGENT, ...current } : EMPTY_AGENT);
              save.reset();
              setEditing(true);
            }}
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}

function DispatchOperatorRow({ setting }: { setting: OpsSetting }) {
  const queryClient = useQueryClient();
  const current = (setting.value as DispatchOperator | null) ?? null;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const save = useMutation({
    mutationFn: () =>
      saveOpsSetting('direct_dispatch_operator', { name: name.trim() }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{setting.label}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Who posts direct-route packs. Prefilled as the sender when a
            dispatch is recorded on a claim.
          </p>
        </div>
        <SourceDot setting={setting} />
      </div>

      {!editing && current && (
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="text-gray-900">{current.name}</dd>
          <Changed setting={setting} />
        </dl>
      )}

      {editing ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) save.mutate();
          }}
        >
          <Field label="Name" htmlFor="dispatch-name">
            <input
              id="dispatch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              maxLength={200}
            />
          </Field>
          {save.isError && (
            <ErrorText error={save.error} fallback="Could not save" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim() || save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                save.reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => {
              setName(current?.name ?? '');
              save.reset();
              setEditing(true);
            }}
          >
            {current ? 'Change' : 'Set'}
          </Button>
        </div>
      )}
    </div>
  );
}
