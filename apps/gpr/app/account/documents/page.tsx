'use client';

import type { AccountDocument, AccountDocumentGroup } from '@/lib/account-api';
import { AccountStateView } from '@/components/account/AccountStates';
import {
  Card,
  EmptyLine,
  PageTitle,
  StatusChip,
  TextLink,
} from '@/components/account/primitives';
import { useAccountView } from '@/components/account/useAccountView';

const GROUPS: Array<{ key: AccountDocumentGroup; title: string }> = [
  { key: 'provided', title: 'What you provided' },
  { key: 'signed', title: 'What you signed' },
  { key: 'prepared', title: 'Prepared and submitted for you' },
  { key: 'letters', title: 'Letters from the pension office' },
];

function DocumentRow({ doc }: { doc: AccountDocument }) {
  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-brand-ink">{doc.name}</p>
        {doc.description ? (
          <p className="truncate text-sm text-brand-muted">{doc.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <StatusChip kind={doc.statusKind}>{doc.status}</StatusChip>
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener"
            className="text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            Open
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default function AccountDocumentsPage() {
  const view = useAccountView('/account/documents');
  if (view.state !== 'ready') return <AccountStateView view={view} />;

  const docs = view.data.documents;

  return (
    <div>
      <p className="mb-3 text-sm">
        <TextLink href="/account">← Back to your application</TextLink>
      </p>
      <PageTitle>Your documents</PageTitle>

      <div className="space-y-4">
        {GROUPS.map((group) => {
          const items = docs.filter((d) => d.group === group.key);
          return (
            <Card key={group.key} title={group.title}>
              {items.length ? (
                <ul className="divide-y divide-brand-stroke/50">
                  {items.map((doc, i) => (
                    <DocumentRow key={(doc.id || doc.name) + i} doc={doc} />
                  ))}
                </ul>
              ) : (
                <EmptyLine>Nothing here yet.</EmptyLine>
              )}
              {group.key === 'letters' ? (
                <p className="mt-3 text-sm">
                  <TextLink href="/account/letters/new">
                    Upload a letter →
                  </TextLink>
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
