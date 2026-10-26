'use client';

import type { AccountDocument, AccountDocumentGroup } from '@/lib/account-api';
import { AccountStateView } from '@/components/account/AccountStates';
import { fileBadge } from '@/components/account/Dropzone';
import { HOME_COPY } from '@/components/account/HomePanel';
import {
  BackLink,
  Column,
  EmptyLine,
  LinkButton,
  PageTitle,
  StatusChip,
} from '@/components/account/primitives';
import { useAccountView } from '@/components/account/useAccountView';

const GROUPS: Array<{ key: AccountDocumentGroup; title: string }> = [
  { key: 'provided', title: 'What you provided' },
  { key: 'signed', title: 'What you signed' },
  { key: 'prepared', title: 'Prepared and submitted for you' },
  { key: 'letters', title: 'Letters from the pension office' },
];

function docBadge(doc: AccountDocument): string {
  const source = doc.url || doc.description || doc.name;
  const clean = source.split('?')[0].split(' · ')[0];
  return /\.(pdf|jpe?g|png)$/i.test(clean) ? fileBadge(clean) : 'PDF';
}

function DocumentRow({ doc }: { doc: AccountDocument }) {
  return (
    <li className="acc-row">
      <span className="acc-row-icon" aria-hidden="true">
        {docBadge(doc)}
      </span>
      <div className="acc-row-box">
        <p className="acc-row-name">{doc.name}</p>
        {doc.description ? (
          <p className="acc-row-desc">{doc.description}</p>
        ) : null}
      </div>
      <div className="acc-row-meta">
        <StatusChip kind={doc.statusKind}>{doc.status}</StatusChip>
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener"
            className="acc-row-action"
          >
            Open →
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
    <Column width={800}>
      <BackLink href="/account">← Back to your application</BackLink>
      <PageTitle>Your documents</PageTitle>

      {GROUPS.map((group) => {
        const items = docs.filter((d) => d.group === group.key);
        const letters = group.key === 'letters';
        return (
          <section key={group.key} className="acc-group">
            <h2 className="acc-eyebrow">{group.title}</h2>
            <ul className="acc-list">
              {items.map((doc, i) => (
                <DocumentRow key={(doc.id || doc.name) + i} doc={doc} />
              ))}
              {!items.length ? (
                <li className="acc-row">
                  <EmptyLine>Nothing here yet.</EmptyLine>
                </li>
              ) : null}
              {letters ? (
                <li className="acc-row acc-row-add">
                  <span className="acc-row-icon" aria-hidden="true">
                    +
                  </span>
                  <div className="acc-row-box">
                    <p className="acc-row-name">
                      {HOME_COPY.receivedALetter.heading}
                    </p>
                    <p className="acc-row-desc">
                      {HOME_COPY.receivedALetter.text}
                    </p>
                  </div>
                  <LinkButton href="/account/letters/new" size="sm">
                    {HOME_COPY.receivedALetter.button}
                  </LinkButton>
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}
    </Column>
  );
}
