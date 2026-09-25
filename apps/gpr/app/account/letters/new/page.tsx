'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { apiErrorMessage } from '@/lib/account-api';
import { AccountStateView } from '@/components/account/AccountStates';
import { Dropzone } from '@/components/account/Dropzone';
import { todayIso } from '@/components/account/format';
import {
  Button,
  Card,
  LinkButton,
  PageTitle,
  TextLink,
} from '@/components/account/primitives';
import {
  useAccountView,
  useUploadLetterMutation,
} from '@/components/account/useAccountView';

const FIELD =
  'mt-1 block w-full rounded-xl border border-brand-stroke bg-white px-3 py-2 text-[15px] text-brand-ink focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-tint';

export default function NewLetterPage() {
  const view = useAccountView('/account/letters/new');
  const upload = useUploadLetterMutation();
  const [files, setFiles] = useState<File[]>([]);
  const [receivedOn, setReceivedOn] = useState('');
  const [sender, setSender] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (view.state !== 'ready') return <AccountStateView view={view} />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!files.length) {
      setFormError('Please add the letter first.');
      return;
    }
    if (!receivedOn) {
      setFormError('Please tell us when you received it.');
      return;
    }
    upload.mutate({ file: files[0], receivedOn, sender, note });
  };

  if (upload.isSuccess) {
    return (
      <div>
        <PageTitle>Upload a letter</PageTitle>
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
              aria-hidden
            />
            <div>
              <p className="font-bold text-brand-ink">
                Thank you — we have your letter.
              </p>
              <p className="mt-1">
                We&apos;ll check what it means and take care of the next steps
                with you.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href="/account">Back to your application</LinkButton>
            <Button
              variant="secondary"
              onClick={() => {
                upload.reset();
                setFiles([]);
                setReceivedOn('');
                setSender('');
                setNote('');
              }}
            >
              Upload another letter
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const busy = upload.isPending;

  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-sm">
        <TextLink href="/account">← Back to your application</TextLink>
      </p>
      <PageTitle lead="Please upload it here as soon as you can. We'll check what it means and take care of the next steps with you.">
        Upload a letter
      </PageTitle>

      <form onSubmit={submit} noValidate>
        <Card>
          <div className="space-y-5">
            <div>
              <span className="block text-sm font-semibold text-brand-ink">
                The letter
              </span>
              <div className="mt-1">
                <Dropzone
                  files={files}
                  onChange={setFiles}
                  disabled={busy}
                  label="Drag the letter here or choose a file"
                  id="letter-file"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="letter-received"
                className="block text-sm font-semibold text-brand-ink"
              >
                Date received
              </label>
              <input
                id="letter-received"
                type="date"
                required
                max={todayIso()}
                value={receivedOn}
                disabled={busy}
                onChange={(e) => setReceivedOn(e.target.value)}
                className={FIELD}
              />
            </div>

            <div>
              <label
                htmlFor="letter-sender"
                className="block text-sm font-semibold text-brand-ink"
              >
                Sender{' '}
                <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <input
                id="letter-sender"
                type="text"
                maxLength={200}
                value={sender}
                disabled={busy}
                onChange={(e) => setSender(e.target.value)}
                placeholder="e.g. Deutsche Rentenversicherung Bund"
                className={FIELD}
              />
            </div>

            <div>
              <label
                htmlFor="letter-note"
                className="block text-sm font-semibold text-brand-ink"
              >
                Note{' '}
                <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <textarea
                id="letter-note"
                rows={4}
                maxLength={2000}
                value={note}
                disabled={busy}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything you'd like us to know about this letter"
                className={FIELD}
              />
            </div>

            {formError || upload.isError ? (
              <p role="alert" className="text-sm text-red-700">
                {formError ||
                  apiErrorMessage(
                    upload.error,
                    'The upload did not go through. Please try again.'
                  )}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send to us'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
