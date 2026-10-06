'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import {
  ClaimDetail,
  SUBMISSION_HOLD_LABELS,
  resolveSubmissionHold,
  saveBavRecipient,
} from '@/lib/admin-api';
import {
  Button,
  ErrorText,
  Field,
  formatDate,
  inputClass,
} from '@/components/ui';

const HOLD_HELP: Record<string, string> = {
  awaiting_provider_data:
    'The claim is submitted and paid, but the letter recipient has no postal address (the provider matrix has no entry). No package has been generated and nothing has gone to the law firm or the lettershop. Enter the recipient below; the package is generated when you save.',
  manual_submission_required:
    'There is no claim form for this institution in the system yet, so nothing was sent to the lettershop. Submit the claim manually, then mark it as submitted here.',
  package_generation_failed:
    'The claim package could not be built after submission, so nothing was sent. Fix the data and regenerate, or resolve the hold once it has been handled otherwise.',
};

/** Banner for a claim on a submission hold, with the matching action. */
export function SubmissionHoldBanner({
  claim,
  onEditRecipient,
  onChanged,
}: {
  claim: ClaimDetail;
  onEditRecipient: () => void;
  onChanged: () => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState('');
  const resolveMutation = useMutation({
    mutationFn: () => resolveSubmissionHold(claim.id, note.trim()),
    onSuccess: () => {
      setResolving(false);
      setNote('');
      onChanged();
    },
  });
  if (!claim.submissionHold) return null;
  const isProviderData = claim.submissionHold === 'awaiting_provider_data';

  return (
    <div
      className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-700" />
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-amber-900"
              data-testid="submission-hold"
            >
              {SUBMISSION_HOLD_LABELS[claim.submissionHold]}
              {claim.submissionHoldAt ? (
                <span className="font-normal text-amber-800">
                  {' '}
                  · since {formatDate(claim.submissionHoldAt, true)}
                </span>
              ) : null}
            </p>
            {claim.submissionHoldReason && (
              <p className="text-sm text-amber-900">
                {claim.submissionHoldReason}
              </p>
            )}
            <p className="mt-1 text-xs text-amber-800">
              {HOLD_HELP[claim.submissionHold]}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isProviderData ? (
            <Button variant="primary" onClick={onEditRecipient}>
              Enter recipient
            </Button>
          ) : (
            !resolving && (
              <Button onClick={() => setResolving(true)}>
                {claim.submissionHold === 'manual_submission_required'
                  ? 'Mark as submitted manually'
                  : 'Resolve hold'}
              </Button>
            )
          )}
        </div>
      </div>
      {resolving && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <Field
              label="What was done (kept in the timeline)"
              htmlFor="hold-note"
            >
              <input
                id="hold-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
                placeholder="e.g. Posted to VddB on 6 Oct 2026"
                autoFocus
              />
            </Field>
          </div>
          <Button
            variant="primary"
            disabled={!note.trim() || resolveMutation.isPending}
            onClick={() => resolveMutation.mutate()}
          >
            {resolveMutation.isPending ? 'Saving…' : 'Confirm'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setResolving(false);
              setNote('');
            }}
          >
            Cancel
          </Button>
          {resolveMutation.isError && (
            <div className="w-full">
              <ErrorText
                error={resolveMutation.error}
                fallback="Could not resolve the hold"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RecipientForm {
  addresseeType: 'employer' | 'provider';
  name: string;
  department: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  reference: string;
  saveToProviderMatrix: boolean;
}

function initialForm(claim: ClaimDetail): RecipientForm {
  const addresseeType =
    claim.bavAddresseeType === 'employer' ? 'employer' : 'provider';
  return {
    addresseeType,
    name:
      claim.bavRecipientName ??
      (addresseeType === 'employer'
        ? (claim.employerName ?? '')
        : (claim.bavProviderName ?? '')),
    department: claim.bavRecipientDepartment ?? '',
    street: claim.bavRecipientStreet ?? '',
    postalCode: claim.bavRecipientPostalCode ?? '',
    city: claim.bavRecipientCity ?? '',
    country: claim.bavRecipientCountry ?? 'Deutschland',
    reference: claim.bavRecipientRef ?? '',
    // Default on while the claim waits for provider data: the next claim
    // for the same provider then gets the address automatically.
    saveToProviderMatrix:
      addresseeType === 'provider' &&
      claim.submissionHold === 'awaiting_provider_data',
  };
}

/** Ops edit the bAV letter recipient (and optionally the provider matrix). */
export function BavRecipientEditor({
  claim,
  onClose,
  onSaved,
}: {
  claim: ClaimDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RecipientForm>(() => initialForm(claim));
  const set = (patch: Partial<RecipientForm>) =>
    setForm((f) => ({ ...f, ...patch }));
  const mutation = useMutation({
    mutationFn: () =>
      saveBavRecipient(claim.id, {
        addresseeType: form.addresseeType,
        name: form.name.trim(),
        department: form.department.trim() || null,
        street: form.street.trim(),
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        country: form.country.trim() || null,
        reference: form.reference.trim() || null,
        saveToProviderMatrix:
          form.addresseeType === 'provider' && form.saveToProviderMatrix,
      }),
    onSuccess: (result) => {
      onSaved();
      if (!result.packageResult || result.packageResult.generated) onClose();
    },
  });
  const complete =
    form.name.trim() &&
    form.street.trim() &&
    form.postalCode.trim() &&
    form.city.trim();
  const employerOnly =
    claim.bavDurchfuehrungsweg === 'Direktzusage' ||
    claim.bavDurchfuehrungsweg === 'Unterstützungskasse';
  const result = mutation.data;

  return (
    <div
      className="mb-4 space-y-3 rounded-md border border-gray-200 bg-white p-3"
      id="bav-recipient-editor"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Addressee" htmlFor="rcp-type">
          <select
            id="rcp-type"
            value={form.addresseeType}
            onChange={(e) =>
              set({
                addresseeType: e.target.value as RecipientForm['addresseeType'],
              })
            }
            className={inputClass}
          >
            <option value="provider" disabled={employerOnly}>
              Provider
              {claim.bavProviderName ? ` (${claim.bavProviderName})` : ''}
            </option>
            <option value="employer">
              Employer{claim.employerName ? ` (${claim.employerName})` : ''}
            </option>
          </select>
        </Field>
        <Field label="Name" htmlFor="rcp-name">
          <input
            id="rcp-name"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Department (optional)" htmlFor="rcp-dept">
          <input
            id="rcp-dept"
            value={form.department}
            onChange={(e) => set({ department: e.target.value })}
            className={inputClass}
            placeholder="e.g. Betriebliche Altersversorgung"
          />
        </Field>
        <Field label="Street and number" htmlFor="rcp-street">
          <input
            id="rcp-street"
            value={form.street}
            onChange={(e) => set({ street: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Postal code" htmlFor="rcp-zip">
          <input
            id="rcp-zip"
            value={form.postalCode}
            onChange={(e) => set({ postalCode: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="City" htmlFor="rcp-city">
          <input
            id="rcp-city"
            value={form.city}
            onChange={(e) => set({ city: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field
          label="Country"
          htmlFor="rcp-country"
          hint="Not printed: the letters assume a German address."
        >
          <input
            id="rcp-country"
            value={form.country}
            onChange={(e) => set({ country: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field
          label="Their reference (Ihr Zeichen, optional)"
          htmlFor="rcp-ref"
        >
          <input
            id="rcp-ref"
            value={form.reference}
            onChange={(e) => set({ reference: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      {form.addresseeType === 'provider' && (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.saveToProviderMatrix}
            onChange={(e) => set({ saveToProviderMatrix: e.target.checked })}
          />
          <span>
            Save to the provider matrix for future cases
            <span className="block text-xs text-gray-500">
              Creates or updates the entry for “
              {claim.bavProviderName || form.name}”; later claims for this
              provider get the address at submission.
            </span>
          </span>
        </label>
      )}
      {claim.status !== 'draft' && (
        <p className="text-xs text-gray-500">
          Saving generates the letter package
          {claim.handlingRoute === 'law_firm'
            ? ' for the law firm'
            : ' and, if submission was waiting for it, sends it to the lettershop'}
          .
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={!complete || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Saving…' : 'Save recipient'}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
      {mutation.isError && (
        <ErrorText
          error={mutation.error}
          fallback="Could not save the recipient"
        />
      )}
      {result?.packageResult && !result.packageResult.generated && (
        <p className="text-sm text-red-700">
          Recipient saved, but the package could not be generated:{' '}
          {result.packageResult.error}
        </p>
      )}
    </div>
  );
}
