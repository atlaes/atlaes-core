'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOpsSettings,
  saveOpsSetting,
  type OpsSetting,
  type PayoutReviewsSetting,
  type PayoutTimers,
  type PayoutTimersSetting,
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
type Product = 'gpr' | 'bav';
const PRODUCTS: { key: Product; label: string }[] = [
  { key: 'gpr', label: 'GPR' },
  { key: 'bav', label: 'CompanyPension (bAV)' },
];

const TIMER_FIELDS: {
  key: Exclude<keyof PayoutTimers, 'reminderDays' | 'directArrivalWorkingDays'>;
  label: string;
  hint: string;
}[] = [
  {
    key: 'missingFundsDays',
    label: 'Funds missing after',
    hint: 'Days after the decision: admin task + review-only e-mail',
  },
  {
    key: 'missingDecisionDays',
    label: 'Decision missing after',
    hint: 'Days after the funds: admin task + decision request',
  },
  {
    key: 'lateReviewDays',
    label: 'Late review window',
    hint: 'Review due within this many days: urgent task',
  },
  {
    key: 'reviewReminderDaysBefore',
    label: 'Review reminder',
    hint: 'Days before the review due date',
  },
  {
    key: 'followUpDays',
    label: 'Personal follow-up',
    hint: 'Days without a signature after the invitation',
  },
  {
    key: 'arrivalCheckWorkingDays',
    label: 'Arrival check',
    hint: 'Working days after the expected arrival',
  },
];

/**
 * Settings → Payout e-mails. Timers of the escrow payout e-mail engine
 * and the review links / Trustpilot BCC of the arrival check (E5), per
 * product. Changes are audited by the backend.
 */
export function PayoutEmailSettingsCard() {
  const settings = useQuery({ queryKey: QUERY_KEY, queryFn: getOpsSettings });
  const byKey = (key: OpsSetting['key']) =>
    settings.data?.find((s) => s.key === key);
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Payout e-mails</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        When the escrow payout e-mails and tasks fire, and where the arrival
        check sends happy clients.
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
          {byKey('payout_timers') && (
            <TimersRow setting={byKey('payout_timers')!} />
          )}
          {byKey('payout_reviews') && (
            <ReviewsRow setting={byKey('payout_reviews')!} />
          )}
        </div>
      )}
    </section>
  );
}

function RowHeader({ setting, text }: { setting: OpsSetting; text: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-gray-900">{setting.label}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{text}</p>
        {setting.updatedAt && (
          <p className="mt-0.5 text-xs text-gray-400">
            Changed {formatDate(setting.updatedAt, true)}
            {setting.updatedByEmail ? ` by ${setting.updatedByEmail}` : ''}
          </p>
        )}
      </div>
      <StatusDot tone={setting.source === 'admin' ? 'good' : 'neutral'}>
        {setting.source === 'admin' ? 'Set' : 'Default'}
      </StatusDot>
    </div>
  );
}

const numberList = (s: string) =>
  s
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);

function TimersRow({ setting }: { setting: OpsSetting }) {
  const queryClient = useQueryClient();
  const current = setting.value as PayoutTimersSetting;
  const [draft, setDraft] = useState<PayoutTimersSetting | null>(null);
  const [reminders, setReminders] = useState<Record<Product, string>>({
    gpr: '',
    bav: '',
  });
  const save = useMutation({
    mutationFn: () => {
      const value = draft!;
      for (const p of PRODUCTS)
        value[p.key].reminderDays = numberList(reminders[p.key]);
      return saveOpsSetting('payout_timers', value);
    },
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
  const set = (p: Product, patch: Partial<PayoutTimers>) =>
    setDraft((d) => (d ? { ...d, [p]: { ...d[p], ...patch } } : d));

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <RowHeader
        setting={setting}
        text="Days are calendar days unless marked as working days."
      />
      {!draft ? (
        <div className="mt-3 space-y-3">
          {PRODUCTS.map((p) => {
            const t = current[p.key];
            return (
              <p key={p.key} className="text-xs text-gray-700">
                <span className="font-medium">{p.label}:</span> funds missing{' '}
                {t.missingFundsDays}d · decision missing {t.missingDecisionDays}
                d · reminders {t.reminderDays.join(', ')}d · review reminder{' '}
                {t.reviewReminderDaysBefore}d before · follow-up{' '}
                {t.followUpDays}d · arrival check {t.arrivalCheckWorkingDays}{' '}
                working days · direct arrival{' '}
                {t.directArrivalWorkingDays === null
                  ? 'entered by admin'
                  : `${t.directArrivalWorkingDays} working days`}
              </p>
            );
          })}
          <Button
            size="sm"
            onClick={() => {
              setDraft(structuredClone(current));
              setReminders({
                gpr: current.gpr.reminderDays.join(', '),
                bav: current.bav.reminderDays.join(', '),
              });
              save.reset();
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          {PRODUCTS.map((p) => (
            <fieldset key={p.key} className="space-y-2">
              <legend className="text-xs font-semibold text-gray-700">
                {p.label}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {TIMER_FIELDS.map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    htmlFor={`${p.key}-${f.key}`}
                    hint={f.hint}
                  >
                    <input
                      id={`${p.key}-${f.key}`}
                      type="number"
                      min={0}
                      value={draft[p.key][f.key]}
                      onChange={(e) =>
                        set(p.key, { [f.key]: Number(e.target.value) })
                      }
                      className={inputClass}
                    />
                  </Field>
                ))}
                <Field
                  label="Release reminders"
                  htmlFor={`${p.key}-reminders`}
                  hint="Days after the invitation, comma-separated"
                >
                  <input
                    id={`${p.key}-reminders`}
                    value={reminders[p.key]}
                    onChange={(e) =>
                      setReminders({ ...reminders, [p.key]: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Direct payment arrival"
                  htmlFor={`${p.key}-direct`}
                  hint="Working days after the transfer; empty = admin enters the date"
                >
                  <input
                    id={`${p.key}-direct`}
                    type="number"
                    min={0}
                    value={draft[p.key].directArrivalWorkingDays ?? ''}
                    onChange={(e) =>
                      set(p.key, {
                        directArrivalWorkingDays:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </fieldset>
          ))}
          {save.isError && (
            <ErrorText error={save.error} fallback="Could not save" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const linesToLinks = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf('|');
      return i < 0
        ? { label: l, url: '' }
        : { label: l.slice(0, i).trim(), url: l.slice(i + 1).trim() };
    });

function ReviewsRow({ setting }: { setting: OpsSetting }) {
  const queryClient = useQueryClient();
  const current = setting.value as PayoutReviewsSetting;
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<Record<Product, string>>({
    gpr: '',
    bav: '',
  });
  const [bcc, setBcc] = useState<Record<Product, string>>({ gpr: '', bav: '' });
  const save = useMutation({
    mutationFn: () =>
      saveOpsSetting('payout_reviews', {
        gpr: {
          links: linesToLinks(links.gpr),
          trustpilotBcc: bcc.gpr.trim() || null,
        },
        bav: {
          links: linesToLinks(links.bav),
          trustpilotBcc: bcc.bav.trim() || null,
        },
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <RowHeader
        setting={setting}
        text="The arrival check (E5) asks confirmed clients for a review once per client. Without links or a BCC the invitation is left out."
      />
      {!editing ? (
        <div className="mt-3 space-y-2">
          {PRODUCTS.map((p) => {
            const r = current[p.key];
            return (
              <p key={p.key} className="text-xs text-gray-700">
                <span className="font-medium">{p.label}:</span>{' '}
                {r.links.length
                  ? r.links.map((l) => l.label).join(', ')
                  : 'no review links'}{' '}
                · Trustpilot BCC {r.trustpilotBcc ?? 'none'}
              </p>
            );
          })}
          <Button
            size="sm"
            onClick={() => {
              setLinks({
                gpr: current.gpr.links
                  .map((l) => `${l.label} | ${l.url}`)
                  .join('\n'),
                bav: current.bav.links
                  .map((l) => `${l.label} | ${l.url}`)
                  .join('\n'),
              });
              setBcc({
                gpr: current.gpr.trustpilotBcc ?? '',
                bav: current.bav.trustpilotBcc ?? '',
              });
              save.reset();
              setEditing(true);
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <form
          className="mt-4 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          {PRODUCTS.map((p) => (
            <fieldset key={p.key} className="space-y-2">
              <legend className="text-xs font-semibold text-gray-700">
                {p.label}
              </legend>
              <Field
                label="Review links"
                htmlFor={`${p.key}-links`}
                hint="One per line: Label | https://…"
              >
                <textarea
                  id={`${p.key}-links`}
                  rows={3}
                  value={links[p.key]}
                  onChange={(e) =>
                    setLinks({ ...links, [p.key]: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field
                label="Trustpilot invitation BCC"
                htmlFor={`${p.key}-bcc`}
                hint="Added to the arrival check only"
              >
                <input
                  id={`${p.key}-bcc`}
                  type="email"
                  value={bcc[p.key]}
                  onChange={(e) => setBcc({ ...bcc, [p.key]: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </fieldset>
          ))}
          {save.isError && (
            <ErrorText error={save.error} fallback="Could not save" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
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
      )}
    </div>
  );
}
