'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDeregistrationSurcharge,
  setDeregistrationSurcharge,
} from '@/lib/deregistration-surcharge-api';
import {
  Button,
  ErrorText,
  Field,
  Spinner,
  StatusDot,
  formatDate,
  inputClass,
} from '@/components/ui';

const eur = (n: number) =>
  `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Claim page: the optional German deregistration service. When the client
 * cannot provide an Abmeldebestätigung, ops switch it on; the amount is
 * added to the ATLAES fee at "funds received" (separate invoice line,
 * payment declaration, payout queue) and is fixed from then on.
 */
export function DeregistrationSurchargeCard({
  claimId,
  wrap,
}: {
  claimId: string;
  wrap: (body: React.ReactNode) => React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const key = ['admin-deregistration-surcharge', claimId];
  const state = useQuery({
    queryKey: key,
    queryFn: () => getDeregistrationSurcharge(claimId),
  });
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      setDeregistrationSurcharge(claimId, { enabled, reason }),
    onSuccess: (data) => {
      setReason('');
      queryClient.setQueryData(key, data);
    },
  });

  if (state.isLoading) return wrap(<Spinner />);
  if (state.isError || !state.data)
    return wrap(
      <ErrorText
        error={state.error}
        fallback="Could not load the deregistration surcharge"
      />
    );

  const s = state.data;
  const amount = eur(s.appliedEur ?? s.amountEur);
  return wrap(
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <StatusDot tone={s.enabled ? 'wait' : 'neutral'}>
          {s.enabled
            ? `Surcharge on: ${amount} incl. VAT added to the ATLAES fee`
            : 'No surcharge'}
        </StatusDot>
        {s.locked && (
          <span className="text-xs text-gray-500">
            {s.appliedEur
              ? `${eur(s.appliedEur)} applied at funds received`
              : 'Not applied at funds received'}{' '}
            · fixed on the release
          </span>
        )}
      </div>
      {s.enabled && (s.reason || s.setAt) && (
        <p className="text-xs text-gray-500">
          {s.reason ? `“${s.reason}” · ` : ''}
          {s.setAt ? `set ${formatDate(s.setAt, true)}` : ''}
        </p>
      )}
      <p className="text-xs text-gray-500">
        For clients who cannot provide a German deregistration certificate
        (Abmeldebestätigung). The client amount goes down by the same amount;
        Lexoffice gets a separate line “Zusatzleistung: Abmeldung in
        Deutschland”. Applies with or without the fee cap.
      </p>
      {!s.locked && (
        <div className="flex flex-wrap items-end gap-2">
          {!s.enabled && (
            <div className="min-w-[16rem] flex-1">
              <Field label="Reason (optional)" htmlFor="dereg-reason">
                <input
                  id="dereg-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. no Abmeldebestätigung available"
                  className={inputClass}
                />
              </Field>
            </div>
          )}
          <Button
            variant={s.enabled ? 'danger' : 'primary'}
            disabled={save.isPending}
            onClick={() => save.mutate(!s.enabled)}
          >
            {s.enabled
              ? 'Remove surcharge'
              : `Add ${eur(s.amountEur)} surcharge`}
          </Button>
        </div>
      )}
      {save.isError && (
        <ErrorText error={save.error} fallback="Could not save" />
      )}
    </div>
  );
}
