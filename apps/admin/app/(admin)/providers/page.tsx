'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import {
  createBavProvider,
  deleteBavProvider,
  listBavProviders,
  updateBavProvider,
  type BavProvider,
  type BavProviderInput,
} from '@/lib/bav-api';
import {
  Button,
  EmptyState,
  ErrorText,
  Field,
  PageHeader,
  Spinner,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  inputClass,
} from '@/components/ui';

const EMPTY: BavProviderInput = {
  name: '',
  shortName: null,
  defaultAddresseeType: 'provider',
  department: null,
  street: null,
  postalCode: null,
  city: null,
  country: 'Deutschland',
  requiresBankAddress: false,
  notes: null,
};

function toInput(p: BavProvider): BavProviderInput {
  return {
    name: p.name,
    shortName: p.shortName,
    defaultAddresseeType: p.defaultAddresseeType,
    department: p.department,
    street: p.street,
    postalCode: p.postalCode,
    city: p.city,
    country: p.country,
    requiresBankAddress: p.requiresBankAddress,
    notes: p.notes,
  };
}

/**
 * bAV providers (owner, 29 Oct 2026: "enable adding further provider
 * names"). Each entry is a letter recipient: the short name is the label
 * in the claim's recipient dropdown, the name and address are printed on
 * the cover letter. Claims whose provider matches a name or short name
 * get the address at submission.
 */
export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const providers = useQuery({
    queryKey: ['admin-bav-providers'],
    queryFn: listBavProviders,
  });
  // null = closed, 'new' = add form, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-bav-providers'] });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBavProvider(id),
    onSuccess: refresh,
  });

  const list = providers.data ?? [];

  return (
    <div>
      <PageHeader
        title="bAV providers"
        subtitle="Letter recipients for bAV cash-outs. The short name is what ops pick in a claim; name and address are printed on the cover letter."
        actions={
          editing !== 'new' && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              Add provider
            </Button>
          )
        }
      />

      {editing === 'new' && (
        <ProviderForm
          initial={EMPTY}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {providers.isLoading ? (
        <Spinner />
      ) : providers.isError ? (
        <ErrorText
          error={providers.error}
          fallback="Could not load the providers"
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No providers yet"
          hint="Add the institutions bAV letters are sent to."
        />
      ) : (
        <Table minWidth={760}>
          <TableHead>
            <Th>Short name</Th>
            <Th>Recipient</Th>
            <Th>Address</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </TableHead>
          <TableBody>
            {list.map((p) =>
              editing === p.id ? (
                <tr key={p.id}>
                  <td colSpan={4} className="px-3 py-3">
                    <ProviderForm
                      initial={toInput(p)}
                      providerId={p.id}
                      onCancel={() => setEditing(null)}
                      onSaved={() => {
                        setEditing(null);
                        refresh();
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <Td className="font-medium">{p.shortName || '—'}</Td>
                  <Td nowrap={false}>
                    {p.name}
                    {p.department && (
                      <span className="block text-xs text-gray-500">
                        {p.department}
                      </span>
                    )}
                  </Td>
                  <Td nowrap={false}>
                    {[
                      p.street,
                      [p.postalCode, p.city].filter(Boolean).join(' '),
                    ]
                      .filter(Boolean)
                      .join(', ') || (
                      <span className="text-amber-700">No address</span>
                    )}
                    {p.notes && (
                      <span className="block text-xs text-gray-500">
                        {p.notes}
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" onClick={() => setEditing(p.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${p.shortName || p.name}"? Claims keep the address they already have.`
                            )
                          ) {
                            remove.mutate(p.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              )
            )}
          </TableBody>
        </Table>
      )}
      {remove.isError && (
        <div className="mt-3">
          <ErrorText error={remove.error} fallback="Could not delete" />
        </div>
      )}
    </div>
  );
}

function ProviderForm({
  initial,
  providerId,
  onCancel,
  onSaved,
}: {
  initial: BavProviderInput;
  providerId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BavProviderInput>(initial);
  const save = useMutation({
    mutationFn: () => {
      const clean = (v: string | null) =>
        v && v.trim() !== '' ? v.trim() : null;
      const input: BavProviderInput = {
        ...form,
        name: form.name.trim(),
        shortName: clean(form.shortName),
        department: clean(form.department),
        street: clean(form.street),
        postalCode: clean(form.postalCode),
        city: clean(form.city),
        country: clean(form.country),
        notes: clean(form.notes),
      };
      return providerId
        ? updateBavProvider(providerId, input)
        : createBavProvider(input);
    },
    onSuccess: onSaved,
  });
  const id = (f: string) => `prov-${providerId ?? 'new'}-${f}`;
  const text =
    (f: keyof BavProviderInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));

  return (
    <form
      className="mb-5 space-y-3 rounded-md border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (form.name.trim()) save.mutate();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Short name"
          htmlFor={id('short')}
          hint="Label in the claim dropdown, e.g. VBL or KVBW ZVK."
        >
          <input
            id={id('short')}
            value={form.shortName ?? ''}
            onChange={text('shortName')}
            className={inputClass}
            maxLength={60}
          />
        </Field>
        <Field
          label="Recipient name"
          htmlFor={id('name')}
          hint="Printed on the letter."
        >
          <input
            id={id('name')}
            value={form.name}
            onChange={text('name')}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Department (optional)" htmlFor={id('dept')}>
          <input
            id={id('dept')}
            value={form.department ?? ''}
            onChange={text('department')}
            className={inputClass}
          />
        </Field>
        <Field
          label="Street or PO box (optional)"
          htmlFor={id('street')}
          hint="Leave empty for a large-customer postal code (e.g. 76240 Karlsruhe)."
        >
          <input
            id={id('street')}
            value={form.street ?? ''}
            onChange={text('street')}
            className={inputClass}
          />
        </Field>
        <Field label="Postal code" htmlFor={id('zip')}>
          <input
            id={id('zip')}
            value={form.postalCode ?? ''}
            onChange={text('postalCode')}
            className={inputClass}
          />
        </Field>
        <Field label="City" htmlFor={id('city')}>
          <input
            id={id('city')}
            value={form.city ?? ''}
            onChange={text('city')}
            className={inputClass}
          />
        </Field>
        <Field
          label="Country"
          htmlFor={id('country')}
          hint="Printed only when it is not Germany."
        >
          <input
            id={id('country')}
            value={form.country ?? ''}
            onChange={text('country')}
            className={inputClass}
          />
        </Field>
        <Field label="Letters go to" htmlFor={id('addressee')}>
          <select
            id={id('addressee')}
            value={form.defaultAddresseeType ?? 'provider'}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                defaultAddresseeType: e.target
                  .value as BavProviderInput['defaultAddresseeType'],
              }))
            }
            className={inputClass}
          >
            <option value="provider">This provider</option>
            <option value="employer">The employer</option>
          </select>
        </Field>
      </div>
      <Field label="Notes (internal)" htmlFor={id('notes')}>
        <textarea
          id={id('notes')}
          value={form.notes ?? ''}
          onChange={text('notes')}
          rows={2}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.requiresBankAddress}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              requiresBankAddress: e.target.checked,
            }))
          }
        />
        Requires the bank&apos;s address on the letter
      </label>
      {save.isError && (
        <ErrorText error={save.error} fallback="Could not save the provider" />
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!form.name.trim() || save.isPending}
        >
          {save.isPending ? 'Saving…' : providerId ? 'Save' : 'Add provider'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
