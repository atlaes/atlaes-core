'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { getOverview, AttentionItem, ActivityItem } from '@/lib/admin-api';
import { useAuth } from '@/contexts/AuthContext';
import {
  CLAIM_STATUS_LABEL,
  PageHeader,
  Pill,
  Spinner,
  StatTile,
  formatDate,
} from '@/components/ui';

const FIRM_EVENT_LABELS: Record<string, string> = {
  downloaded: 'downloaded the package',
  submitted: 'sent the letter to the provider',
  response_received: 'recorded a provider response',
  closed: 'closed the case',
  reference_set: 'set the file number',
  correspondence_uploaded: 'uploaded correspondence',
};

function describe(a: ActivityItem): string {
  const m = (a.metadata ?? {}) as Record<string, any>;
  if (m.type === 'admin_note') return `Ops left a note${m.note ? `: “${String(m.note).slice(0, 80)}”` : ''}`;
  if (m.type === 'law_firm_event') return `Law firm ${FIRM_EVENT_LABELS[String(m.event)] ?? String(m.event)}`;
  if (m.action === 'handling_route_update') return `Handling set to ${m.handlingRoute === 'law_firm' ? 'law firm' : 'direct'}`;
  if (a.previousState && a.previousState !== a.state) {
    return `Status ${CLAIM_STATUS_LABEL[a.previousState] ?? a.previousState} → ${CLAIM_STATUS_LABEL[a.state] ?? a.state}`;
  }
  return `Status ${CLAIM_STATUS_LABEL[a.state] ?? a.state}`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function AttentionGroup({
  title,
  hint,
  items,
  href,
  ageLabel,
  empty,
}: {
  title: string;
  hint: string;
  items: AttentionItem[];
  href: string;
  ageLabel: (i: AttentionItem) => string;
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {title}
            {items.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-1.5 text-xs tabular-nums text-gray-600">
                {items.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
        <Link href={href} className="flex items-center gap-1 text-xs text-brand-dark hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/claims/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-gray-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gray-900">{i.claimantName ?? i.email ?? i.id.slice(0, 8)}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {i.pensionType === 'private' ? 'bAV cash-out' : i.pensionType === 'public' ? 'Public refund' : 'No product'}
                    {i.handlingRoute === 'law_firm' ? ' · law firm' : ''}
                    {i.lawFirmRef ? ` · ${i.lawFirmRef}` : ''}
                  </span>
                </span>
                <span className={`flex-none text-xs tabular-nums ${i.ageDays >= 7 ? 'text-red-700' : i.ageDays >= 3 ? 'text-amber-700' : 'text-gray-500'}`}>
                  {ageLabel(i)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const overview = useQuery({ queryKey: ['admin-overview'], queryFn: getOverview, refetchInterval: 60_000 });

  if (overview.isLoading) return <Spinner full />;
  const data = overview.data;
  if (!data) return <PageHeader title="Could not load the overview" />;

  const age = (i: AttentionItem) => (i.ageDays === 0 ? 'today' : i.ageDays === 1 ? '1 day' : `${i.ageDays} days`);

  return (
    <div>
      <PageHeader
        title={`${greeting()}${user?.profile?.firstName ? `, ${user.profile.firstName}` : ''}`}
        subtitle="What needs ops today, and what changed last."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Waiting for ops" value={data.counts.submitted} hint="submitted, not yet processed" />
        <StatTile label="In processing" value={data.counts.processing} hint="with provider or lettershop" />
        <StatTile label="With the law firm" value={data.counts.lawFirm} hint="handled by Vividius" />
        <StatTile label="Completed this week" value={data.counts.completedThisWeek} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <AttentionGroup
            title="Submitted, waiting for ops"
            hint="Oldest first. Move them to processing once the package has gone out."
            items={data.attention.submitted}
            href="/claims?view=needs-ops"
            ageLabel={(i) => `waiting ${age(i)}`}
            empty="Nothing waiting. Every submitted claim has been picked up."
          />
          <AttentionGroup
            title="Provider responses from the law firm"
            hint="Vividius uploaded a reply and recorded it. Read it and move the claim on."
            items={data.attention.responses}
            href="/claims?view=law-firm"
            ageLabel={(i) => `received ${age(i)} ago`}
            empty="No responses waiting."
          />
          <AttentionGroup
            title="bAV claims without a package"
            hint="Submitted but no letter package stored. Open and regenerate."
            items={data.attention.missingPackage}
            href="/claims?view=bav"
            ageLabel={(i) => `submitted ${age(i)} ago`}
            empty="Every submitted bAV claim has its package."
          />
          <AttentionGroup
            title="Payment not through"
            hint="Past draft with payment pending or failed."
            items={data.attention.paymentIssues}
            href="/claims?view=all"
            ageLabel={(i) => i.paymentStatus ?? 'pending'}
            empty="All payments are in."
          />
        </div>

        <aside>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent activity</h2>
          {data.activity.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing yet.</p>
          ) : (
            <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {data.activity.map((a) => (
                <li key={a.id} className="px-3 py-2">
                  <Link href={`/claims/${a.claimId}`} className="block hover:underline">
                    <span className="block text-sm text-gray-900">{a.claimantName ?? a.claimId.slice(0, 8)}</span>
                  </Link>
                  <p className="text-xs text-gray-600">{describe(a)}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(a.createdAt, true)}
                    {a.triggeredBy ? ` · ${a.triggeredBy === 'law_firm' ? 'law firm' : a.triggeredBy}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-xs text-gray-400">
            <Pill>Refreshes every minute</Pill>
          </p>
        </aside>
      </div>
    </div>
  );
}
