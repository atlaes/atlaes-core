'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { apiErrorMessage } from '@/lib/account-api';
import { AccountStateView } from '@/components/account/AccountStates';
import { Dropzone } from '@/components/account/Dropzone';
import { formatLongDate } from '@/components/account/format';
import {
  Button,
  Card,
  LinkButton,
  PageTitle,
  TextLink,
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
      <div>
        <PageTitle>{BUTTON_LABEL}</PageTitle>
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
              aria-hidden
            />
            <div>
              <p className="font-bold text-brand-ink">
                Thank you — we have your documents.
              </p>
              <p className="mt-1">
                We&apos;ll take it from here and let you know once they have
                been passed on.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <LinkButton href="/account">Back to your application</LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div>
        <p className="mb-3 text-sm">
          <TextLink href="/account">← Back to your application</TextLink>
        </p>
        <PageTitle>{BUTTON_LABEL}</PageTitle>
        <Card title="This task is no longer open">
          <p>
            There is nothing for you to upload here right now. Your application
            overview shows anything that still needs your attention.
          </p>
          <div className="mt-4">
            <LinkButton href="/account">Back to your application</LinkButton>
          </div>
        </Card>
      </div>
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
    <div className="max-w-2xl">
      <p className="mb-3 text-sm">
        <TextLink href="/account">← Back to your application</TextLink>
      </p>
      <PageTitle>{BUTTON_LABEL}</PageTitle>

      <form onSubmit={submit} noValidate>
        <Card className="border-brand-navy">
          <p className="text-brand-ink">{task.text}</p>
          {task.dueDate ? (
            <p className="mt-1 text-sm font-semibold text-brand-navy">
              Due by {formatLongDate(task.dueDate)}
            </p>
          ) : null}

          <div className="mt-5">
            <Dropzone
              files={files}
              onChange={setFiles}
              multiple
              disabled={busy}
              label="Drag your documents here or choose files"
              id="task-files"
            />
          </div>

          {formError || upload.isError ? (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {formError ||
                apiErrorMessage(
                  upload.error,
                  'The upload did not go through. Please try again.'
                )}
            </p>
          ) : null}

          <div className="mt-5">
            <Button type="submit" disabled={busy}>
              {busy ? 'Uploading…' : BUTTON_LABEL}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
