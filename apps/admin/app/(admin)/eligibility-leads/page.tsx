'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ANSWER_LABELS,
  ANSWER_VALUE_LABELS,
  BLOCK_REASON_LABELS,
  getEligibilityLeads,
  RESULT_LABELS,
  setEligibilityLeadStatus,
  type EligibilityLead,
  type EligibilityLeadKind,
  type EligibilityLeadStatus,
} from '@/lib/eligibility-leads-api';
import {
  Button,
  EmptyState,
  ErrorText,
  Fact,
  FactGroup,
  PageHeader,
  Pill,
  Spinner,
  StatusDot,
  formatDate,
  type Tone,
} from '@/components/ui';

/**
 * GPR eligibility check (/check/3-step). The check runs in the visitor's
 * browser; these are the three moments the backend keeps a record: a free
 * review request from a negative result (answer by e-mail, then set the
 * status), a filing-date reminder (sent automatically two months before the
 * date) and the check a visitor attested to when creating an account.
 */

const TABS: { kind: EligibilityLeadKind; label: string; hint: string }[] = [
  {
    kind: 'review',
    label: 'Free reviews',
    hint: 'Visitors with a negative result who asked for a free review. Reply by e-mail, then mark the request.',
  },
  {
    kind: 'reminder',
    label: 'Reminders',
    hint: 'Visitors who asked to be reminded before their filing date. The reminder goes out automatically.',
  },
  {
    kind: 'signup',
    label: 'Sign-ups',
    hint: 'The check visitors attested to when they created their account from the funnel.',
  },
];

const STATUS_TONE: Record<string, Tone> = {
  open: 'wait',
  replied: 'good',
  closed: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  replied: 'Replied',
  closed: 'Closed',
};

const RESULT_TONE: Record<string, Tone> = {
  PROCEED: 'good',
  PROCEED_FROM_DATE: 'info',
  NOT_NOW: 'bad',
};

const blockLabel = (code: string | null) =>
  code ? (BLOCK_REASON_LABELS[code] ?? code) : null;

const nameOf = (l: EligibilityLead) =>
  [l.firstName, l.lastName].filter(Boolean).join(' ');

function answerValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const s = String(value);
  return ANSWER_VALUE_LABELS[key]?.[s] ?? s;
}

export default function EligibilityLeadsPage() {
  const [kind, setKind] = useState<EligibilityLeadKind>('review');
  const leads = useQuery({
    queryKey: ['admin-eligibility-leads', kind],
    queryFn: () => getEligibilityLeads(kind),
  });
  const tab = TABS.find((t) => t.kind === kind) ?? TABS[0];

  return (
    <div>
      <PageHeader
        title="Eligibility leads"
        subtitle="Records from the GPR eligibility check. The check runs in the visitor's browser; these are the answers they gave when they asked for a review, a reminder or created an account."
      />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.kind}
            onClick={() => setKind(t.kind)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              kind === t.kind
                ? 'border-brand-dark font-medium text-brand-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
            {kind === t.kind && leads.data ? ` (${leads.data.length})` : ''}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-gray-500">{tab.hint}</p>
      {leads.isLoading && <Spinner />}
      {leads.isError && (
        <ErrorText error={leads.error} fallback="Could not load leads" />
      )}
      {leads.data && leads.data.length === 0 && (
        <EmptyState
          title={`No ${tab.label.toLowerCase()} yet`}
          hint="Records appear here as soon as visitors use the check."
        />
      )}
      <div className="space-y-3">
        {leads.data?.map((l) => (
          <LeadCard key={l.id} lead={l} kind={kind} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({
  lead: l,
  kind,
}: {
  lead: EligibilityLead;
  kind: EligibilityLeadKind;
}) {
  const [open, setOpen] = useState(false);
  const name = nameOf(l);
  const block = blockLabel(l.blockReason);
  const a = l.answers ?? {};

  let sub = '';
  if (kind === 'reminder') {
    sub = l.reminderSentAt
      ? `Reminder sent ${formatDate(l.reminderSentAt)}`
      : `Reminder due ${formatDate(l.reminderDueOn)}`;
  } else if (kind === 'signup') {
    sub = `Attested ${formatDate(l.attestedAt, true)}`;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-gray-900">
            {name || l.email}
          </p>
          <p className="mt-0.5 break-words text-xs text-gray-500">
            {name ? `${l.email} · ` : ''}
            {formatDate(l.createdAt, true)}
            {sub ? ` · ${sub}` : ''}
          </p>
          <p className="mt-0.5 break-words text-xs text-gray-600">
            {[
              a.citizenship ? `Citizen ${a.citizenship}` : null,
              a.residence ? `lives in ${a.residence}` : null,
              l.fileFrom ? `file from ${formatDate(l.fileFrom)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {block && <Pill tone="bad">{block}</Pill>}
          {l.result && (
            <Pill tone={RESULT_TONE[l.result] ?? 'neutral'}>
              {RESULT_LABELS[l.result] ?? l.result}
            </Pill>
          )}
          {kind === 'review' && (
            <StatusDot tone={STATUS_TONE[l.status ?? 'open'] ?? 'neutral'}>
              {STATUS_LABEL[l.status ?? 'open'] ?? l.status}
            </StatusDot>
          )}
        </div>
      </button>
      {open && <LeadDetail lead={l} kind={kind} />}
    </div>
  );
}

function LeadDetail({
  lead: l,
  kind,
}: {
  lead: EligibilityLead;
  kind: EligibilityLeadKind;
}) {
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: (status: EligibilityLeadStatus) =>
      setEligibilityLeadStatus(l.id, status),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin-eligibility-leads'] }),
  });
  const answers = Object.entries(l.answers ?? {});
  const block = blockLabel(l.blockReason);

  return (
    <div className="space-y-4 border-t border-gray-100 px-4 py-4">
      {kind === 'review' && (
        <div className="space-y-2">
          {l.message && (
            <p className="whitespace-pre-wrap break-words rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800">
              {l.message}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`mailto:${l.email}`}
              className="text-sm font-medium text-brand-dark hover:underline"
            >
              Reply by e-mail
            </a>
            <span className="flex-1" />
            {(['open', 'replied', 'closed'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={l.status === s ? 'primary' : 'secondary'}
                disabled={setStatus.isPending || l.status === s}
                onClick={() => setStatus.mutate(s)}
              >
                {s === 'open'
                  ? 'Reopen'
                  : s === 'replied'
                    ? 'Mark replied'
                    : 'Close'}
              </Button>
            ))}
          </div>
          {setStatus.isError && (
            <ErrorText
              error={setStatus.error}
              fallback="Could not update the status"
            />
          )}
        </div>
      )}

      <FactGroup title="Check">
        <Fact
          label="Result"
          value={l.result ? (RESULT_LABELS[l.result] ?? l.result) : null}
        />
        <Fact
          label="Block reason"
          value={block ? `${block} (${l.blockReason})` : null}
        />
        <Fact label="Rule set" value={l.ruleSet} />
        <Fact
          label="File from"
          value={l.fileFrom ? formatDate(l.fileFrom) : null}
        />
        {kind === 'reminder' && (
          <>
            <Fact label="Reminder due" value={formatDate(l.reminderDueOn)} />
            <Fact
              label="Reminder sent"
              value={
                l.reminderSentAt
                  ? formatDate(l.reminderSentAt, true)
                  : 'Not yet'
              }
            />
          </>
        )}
        {kind === 'signup' && (
          <Fact label="Attested" value={formatDate(l.attestedAt, true)} />
        )}
        {kind === 'review' && (
          <>
            <Fact
              label="Replied"
              value={l.repliedAt ? formatDate(l.repliedAt, true) : null}
            />
            <Fact
              label="Team notice"
              value={
                l.teamNoticeSentAt
                  ? `Sent ${formatDate(l.teamNoticeSentAt, true)}`
                  : 'Not mailed'
              }
            />
          </>
        )}
      </FactGroup>

      <FactGroup title="Answers">
        {answers.length === 0 && (
          <Fact label="Answers" value="None recorded" wide />
        )}
        {answers.map(([key, value]) => (
          <Fact
            key={key}
            label={ANSWER_LABELS[key] ?? key}
            value={answerValue(key, value)}
          />
        ))}
      </FactGroup>

      <FactGroup title="Attribution">
        <Fact label="Page" value={l.referrer} wide />
        <Fact label="Landing page" value={l.landingPage} wide />
        <Fact label="Via" value={l.via} />
        <Fact label="UTM source" value={l.utmSource} />
        <Fact label="UTM medium" value={l.utmMedium} />
        <Fact label="UTM campaign" value={l.utmCampaign} />
        <Fact label="UTM term" value={l.utmTerm} />
        <Fact label="UTM content" value={l.utmContent} />
        <Fact label="gclid" value={l.gclid} />
        <Fact label="fbclid" value={l.fbclid} />
        {!l.referrer &&
          !l.landingPage &&
          !l.via &&
          !l.utmSource &&
          !l.gclid &&
          !l.fbclid && <Fact label="Source" value="Direct / none recorded" />}
      </FactGroup>
    </div>
  );
}
