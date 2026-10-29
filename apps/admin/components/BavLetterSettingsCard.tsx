'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getBavLetterSettings,
  regenerateBavPackage,
  saveBavLetterSettings,
  type BavClaimStatus,
} from '@/lib/bav-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  inputClass,
} from '@/components/ui';

const STATUS_LABEL: Record<BavClaimStatus, string> = {
  vested: 'Vested (§ 3 Abs. 3 BetrAVG after the DRV refund)',
  non_vested: 'Non-Vested (provider payout procedure)',
};

const TITLE_SUGGESTIONS = [
  'Antrag auf Beitragserstattung',
  'Antrag auf Auszahlung der betrieblichen Altersversorgung',
];

const ROUTE_LABEL = { direct: 'Direct', law_firm: 'Law firm' } as const;

/**
 * bAV letters (owner spec 29 Oct 2026): ops choose the claim status
 * (Vested / Non-Vested, or derived from the DRV refund answer) and, for
 * Non-Vested, the application title. Shows the selected cover letter, the
 * pack's attachment list and every field still missing; generation is
 * refused until the list is empty. Shown on bAV claims only.
 */
export function BavLetterSettingsCard({
  claimId,
  version,
  onChanged,
}: {
  claimId: string;
  /** The claim's updatedAt: a change elsewhere on the page reloads the list. */
  version?: string;
  /** Called after a save or regeneration (refresh the claim). */
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const key = ['admin-bav-letter-settings', claimId, version ?? ''];
  const settings = useQuery({
    queryKey: key,
    queryFn: () => getBavLetterSettings(claimId),
  });
  const s = settings.data;

  // '' = derived from the DRV refund answer.
  const [status, setStatus] = useState<'' | BavClaimStatus>('');
  const [title, setTitle] = useState('');
  useEffect(() => {
    if (!s) return;
    setStatus(s.statusOverride ?? '');
    setTitle(s.applicationTitle ?? '');
  }, [s?.statusOverride, s?.applicationTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () =>
      saveBavLetterSettings(claimId, {
        status: status || null,
        applicationTitle: title.trim() || null,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(key, result.settings);
      onChanged?.();
    },
  });
  const regenerate = useMutation({
    mutationFn: () => regenerateBavPackage(claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-bav-letter-settings', claimId],
      });
      onChanged?.();
    },
  });

  const dirty =
    !!s &&
    ((status || null) !== s.statusOverride ||
      (title.trim() || null) !== (s.applicationTitle ?? null));
  const effectiveStatus: BavClaimStatus | null =
    status || (s?.statusSource === 'derived' ? s.status : null);
  const blocking = s?.issues.filter((i) => i.blocking) ?? [];
  const notes = s?.issues.filter((i) => !i.blocking) ?? [];

  return (
    <section
      className="mb-4 rounded-lg border border-gray-200 bg-white p-4"
      id="bav-letter-settings"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">bAV letters</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Claim status and route select the cover letter; the pack follows in
            the order below.
          </p>
        </div>
        {s && (
          <StatusDot tone={s.canGenerate ? 'good' : 'bad'}>
            {s.canGenerate ? 'Ready to generate' : 'Fields missing'}
          </StatusDot>
        )}
      </div>

      {settings.isLoading ? (
        <Spinner />
      ) : settings.isError ? (
        <div className="mt-3">
          <ErrorText
            error={settings.error}
            fallback="Could not load the letter settings"
          />
        </div>
      ) : (
        s && (
          <>
            <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-gray-500">Route</dt>
              <dd className="text-gray-900">
                {ROUTE_LABEL[s.route]}
                <span className="text-gray-500">
                  {' '}
                  (authority:{' '}
                  {s.authority === 'PEV'
                    ? 'Postempfangsvollmacht'
                    : 'Vollmacht for the law firm'}
                  )
                </span>
              </dd>
              <dt className="text-gray-500">Cover letter</dt>
              <dd className="break-all font-mono text-gray-900">
                {s.templateName ?? '—'}
              </dd>
            </dl>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (dirty) save.mutate();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Claim status" htmlFor="bav-status">
                  <select
                    id="bav-status"
                    value={status}
                    disabled={!!s.lockedReason}
                    onChange={(e) =>
                      setStatus(e.target.value as '' | BavClaimStatus)
                    }
                    className={inputClass}
                  >
                    <option value="">
                      {s.statusSource === 'derived' && s.status
                        ? `From the DRV refund answer: ${s.status === 'vested' ? 'Vested' : 'Non-Vested'}`
                        : 'From the DRV refund answer (not answered)'}
                    </option>
                    <option value="vested">{STATUS_LABEL.vested}</option>
                    <option value="non_vested">
                      {STATUS_LABEL.non_vested}
                    </option>
                  </select>
                </Field>
                {effectiveStatus === 'non_vested' && (
                  <Field
                    label="Application title"
                    htmlFor="bav-title"
                    hint="German subject of the letter. Required for Non-Vested."
                  >
                    <input
                      id="bav-title"
                      list="bav-title-suggestions"
                      value={title}
                      disabled={!!s.lockedReason}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputClass}
                      maxLength={255}
                    />
                    <datalist id="bav-title-suggestions">
                      {TITLE_SUGGESTIONS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </Field>
                )}
              </div>
              {effectiveStatus === 'vested' && (
                <p className="text-xs text-gray-500">
                  Vested letters claim § 3 Abs. 3 BetrAVG: confirm the claim
                  basis and the completed DRV refund before release.
                </p>
              )}
              {s.lockedReason && (
                <p className="text-xs text-amber-800">{s.lockedReason}.</p>
              )}
              {!s.lockedReason && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!dirty || save.isPending}
                  >
                    {save.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    disabled={dirty || !s.canGenerate || regenerate.isPending}
                    onClick={() => regenerate.mutate()}
                  >
                    {regenerate.isPending ? 'Generating…' : 'Regenerate pack'}
                  </Button>
                </div>
              )}
            </form>

            {save.isError && (
              <div className="mt-2">
                <ErrorText error={save.error} fallback="Could not save" />
              </div>
            )}
            {save.data && (
              <div className="mt-2 space-y-1 text-sm">
                {save.data.regenerated && (
                  <p className="text-emerald-800">Pack regenerated.</p>
                )}
                {save.data.regenerationError && (
                  <p className="text-amber-800">
                    {save.data.regenerationError}
                  </p>
                )}
                {save.data.signedContentChanged && (
                  <p className="text-amber-800">
                    The content the client signs changed. Obtain a new client
                    signature before the pack is released.
                  </p>
                )}
              </div>
            )}
            {regenerate.isError && (
              <div className="mt-2">
                <ErrorText
                  error={regenerate.error}
                  fallback="Could not regenerate the pack"
                />
              </div>
            )}
            {regenerate.data && (
              <p className="mt-2 text-sm text-emerald-800">
                Pack regenerated.{' '}
                <a
                  href={regenerate.data.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Open PDF
                </a>
              </p>
            )}

            {blocking.length > 0 && (
              <div className="mt-4 rounded-md bg-red-50 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Missing before the letters can be generated
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-red-800">
                  {blocking.map((i, n) => (
                    <li key={`${i.field}-${n}`}>{i.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {notes.length > 0 && (
              <ul className="mt-3 space-y-0.5 text-xs text-gray-600">
                {notes.map((i, n) => (
                  <li key={`${i.field}-${n}`}>{i.message}</li>
                ))}
              </ul>
            )}
            {blocking.length === 0 && (
              <p className="mt-4 flex items-center gap-1.5 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                All fields for the selected letter are filled.
              </p>
            )}

            <div className="mt-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Pack (after the cover letter)
              </h3>
              {s.attachments.length > 0 ? (
                <ol className="mt-1.5 space-y-0.5 text-sm text-gray-800">
                  {s.attachments.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1.5 text-sm text-gray-500">—</p>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                Recipient-specific forms and evidence attached to the claim
                (provider form, extra documents) follow the passport copy.
              </p>
            </div>
          </>
        )
      )}
    </section>
  );
}
