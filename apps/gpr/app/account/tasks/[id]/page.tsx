'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { apiErrorMessage } from '@/lib/account-api';
import { AccountStateView } from '@/components/account/AccountStates';
import { Dropzone } from '@/components/account/Dropzone';
import { formatLongDate } from '@/components/account/format';
import {
  BackLink,
  Button,
  Card,
  Column,
  LinkButton,
  PageTitle,
} from '@/components/account/primitives';
import {
  useAccountView,
  useUploadTaskDocumentsMutation,
} from '@/components/account/useAccountView';

const BUTTON_LABEL = 'Upload requested documents';

export default function TaskUploadPage() {
  const params = useParams();
  const taskId = typeof params.id === 'string' ? params.id : '';
  const view = useAccountView('/account/tasks/' + taskId);
  const upload = useUploadTaskDocumentsMutation(taskId);
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  if (view.state !== 'ready') return <AccountStateView view={view} />;

  const task = view.data.openCustomerTask;
  const isOpen = !!task && task.id === taskId;

  if (upload.isSuccess) {
    return (
      <Column width={640}>
        <PageTitle>{BUTTON_LABEL}</PageTitle>
        <Card>
          <div className="acc-success">
            <CheckCircle className="acc-success-icon" aria-hidden />
            <div className="acc-card-body">
              <p className="acc-tl-title">
                Thank you — we have your documents.
              </p>
              <p className="acc-card-muted">
                We&apos;ll take it from here and let you know once they have
                been passed on.
              </p>
            </div>
          </div>
          <div className="acc-actions">
            <LinkButton href="/account">Back to your application</LinkButton>
          </div>
        </Card>
      </Column>
    );
  }

  if (!isOpen) {
    return (
      <Column width={640}>
        <BackLink href="/account">← Back to your application</BackLink>
        <PageTitle>{BUTTON_LABEL}</PageTitle>
        <Card title="This task is no longer open">
          <p className="acc-card-muted">
            There is nothing for you to upload here right now. Your application
            overview shows anything that still needs your attention.
          </p>
          <div className="acc-actions">
            <LinkButton href="/account">Back to your application</LinkButton>
          </div>
        </Card>
      </Column>
    );
  }

  const busy = upload.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!files.length) {
      setFormError('Please add at least one document.');
      return;
    }
    upload.mutate(files);
  };

  return (
    <Column width={640}>
      <PageTitle>{BUTTON_LABEL}</PageTitle>

      <form onSubmit={submit} noValidate className="acc-form">
        <div className="acc-task-box">
          {task.dueDate ? (
            <p className="acc-banner-title">
              Due by {formatLongDate(task.dueDate)}
            </p>
          ) : null}
          <p>{task.text}</p>
        </div>

        <Dropzone
          files={files}
          onChange={setFiles}
          multiple
          disabled={busy}
          label="Drag your documents here or choose files"
          id="task-files"
        />

        {formError || upload.isError ? (
          <p role="alert" className="acc-error">
            {formError ||
              apiErrorMessage(
                upload.error,
                'The upload did not go through. Please try again.'
              )}
          </p>
        ) : null}

        <div className="acc-footer-row">
          <Link href="/account" className="acc-footer-back">
            ← Back to your application
          </Link>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? 'Uploading…' : BUTTON_LABEL}
          </Button>
        </div>
      </form>
    </Column>
  );
}
