'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDrvPackData,
  setDrvPackData,
  type DrvPackDataState,
  type DrvPackDataValues,
  type DrvPackSex,
} from '@/lib/admin-api';
import { Button, ErrorText, Field, inputClass } from '@/components/ui';

const SEX_LABEL: Record<DrvPackSex, string> = {
  male: 'Male (männlich)',
  female: 'Female (weiblich)',
  diverse: 'Diverse (divers)',
  none: 'Not stated (ohne Angabe)',
};

interface Form {
  vsnr: string;
  sex: DrvPackSex | '';
  years: string;
  months: string;
  moveOutDate: string;
  germanStreet: string;
  germanPostalCode: string;
  germanCity: string;
}

function toForm(v: DrvPackDataValues): Form {
  const total = v.germanContributionMonths;
  return {
    vsnr: v.vsnr ?? '',
    sex: v.sex ?? '',
    years: total ? String(Math.floor(total / 12)) : '',
    months: total ? String(total % 12) : '',
    moveOutDate: v.moveOutDate ?? '',
    germanStreet: v.germanStreet ?? '',
    germanPostalCode: v.germanPostalCode ?? '',
    germanCity: v.germanCity ?? '',
  };
}

function toValues(f: Form): Partial<DrvPackDataValues> {
  const y = f.years === '' ? 0 : Number(f.years);
  const m = f.months === '' ? 0 : Number(f.months);
  const total = y * 12 + m;
  return {
    vsnr: f.vsnr.trim() || null,
    sex: f.sex || null,
    germanContributionMonths:
      f.years === '' && f.months === '' ? null : total || null,
    moveOutDate: f.moveOutDate || null,
    germanStreet: f.germanStreet.trim() || null,
    germanPostalCode: f.germanPostalCode.trim() || null,
    germanCity: f.germanCity.trim() || null,
  };
}

/**
 * DRV pack data (VSNR, sex, contribution months, move-out date, last German
 * address) for a GPR case. Shows what the pack builder still misses and
 * lets ops complete it, e.g. when the client skipped the optional SV
 * number or uploaded an Abmeldebestätigung instead of typing the address.
 * Renders nothing for VBL / bAV cases.
 */
export function DrvPackDataCard({
  claimId,
  wrap,
  onChanged,
}: {
  claimId: string;
  wrap: (body: ReactNode) => ReactNode;
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const key = ['admin-claim-drv-pack-data', claimId];
  const q = useQuery({ queryKey: key, queryFn: () => getDrvPackData(claimId) });
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data && form === null) setForm(toForm(q.data.values));
  }, [q.data, form]);

  const save = useMutation({
    mutationFn: (values: Partial<DrvPackDataValues>) =>
      setDrvPackData(claimId, values),
    onSuccess: (s: DrvPackDataState) => {
      queryClient.setQueryData(key, s);
      setForm(toForm(s.values));
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['admin-claim', claimId] });
      onChanged?.();
    },
  });

  if (q.isLoading) return null;
  if (q.isError)
    return wrap(
      <ErrorText error={q.error} fallback="Could not load the DRV pack data" />
    );
  const s = q.data;
  if (!s?.applicable || !form) return null;
  const locked = s.frozen || save.isPending;
  const set = (patch: Partial<Form>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };

  return wrap(
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(toValues(form));
      }}
    >
      {s.missing.length > 0 ? (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The pack cannot be built yet. Missing: {s.missing.join(', ')}.
        </p>
      ) : (
        <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Everything the DRV pack needs is on the case.
        </p>
      )}
      {s.frozen && (
        <p className="mb-3 text-xs text-gray-500">
          {s.frozenReason} These values can no longer change.
        </p>
      )}
      <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Insurance number (VSNR)"
          hint={
            s.intake.svNummer
              ? `Client typed: ${s.intake.svNummer}`
              : 'The client did not give one'
          }
        >
          <input
            className={inputClass}
            value={form.vsnr}
            onChange={(e) => set({ vsnr: e.target.value.toUpperCase() })}
            placeholder="12 345678 A 012"
          />
        </Field>
        <Field
          label="Sex (V0901)"
          hint={
            s.intake.gender
              ? `Passport step: ${s.intake.gender}`
              : 'Not given in the passport step'
          }
        >
          <select
            className={inputClass}
            value={form.sex}
            onChange={(e) => set({ sex: e.target.value as DrvPackSex | '' })}
          >
            <option value="">Select</option>
            {(Object.keys(SEX_LABEL) as DrvPackSex[]).map((k) => (
              <option key={k} value={k}>
                {SEX_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="German contribution time"
          hint="From 60 months a Willenserklärung is added for non-agreement states."
        >
          <div className="flex gap-2">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={50}
              value={form.years}
              onChange={(e) => set({ years: e.target.value })}
              placeholder="Years"
              aria-label="Years"
            />
            <input
              className={inputClass}
              type="number"
              min={0}
              max={11}
              value={form.months}
              onChange={(e) => set({ months: e.target.value })}
              placeholder="Months"
              aria-label="Months"
            />
          </div>
        </Field>
        <Field label="Left Germany on">
          <input
            className={inputClass}
            type="date"
            value={form.moveOutDate}
            onChange={(e) => set({ moveOutDate: e.target.value })}
          />
        </Field>
        <Field label="Last German street">
          <input
            className={inputClass}
            value={form.germanStreet}
            onChange={(e) => set({ germanStreet: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <Field label="Postal code">
            <input
              className={inputClass}
              value={form.germanPostalCode}
              onChange={(e) => set({ germanPostalCode: e.target.value })}
            />
          </Field>
          <Field label="City">
            <input
              className={inputClass}
              value={form.germanCity}
              onChange={(e) => set({ germanCity: e.target.value })}
            />
          </Field>
        </div>
      </fieldset>
      {!s.frozen && (
        <div className="mt-3 flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={locked}>
            {save.isPending ? 'Saving…' : 'Save pack data'}
          </Button>
          {saved && !save.isPending && (
            <span className="text-xs text-emerald-700">Saved</span>
          )}
        </div>
      )}
      {save.isError && (
        <div className="mt-2">
          <ErrorText
            error={save.error}
            fallback="Could not save the pack data"
          />
        </div>
      )}
    </form>
  );
}
