'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { apiErrorMessage } from '@/lib/account-api';
import { AccountStateView } from '@/components/account/AccountStates';
import { Dropzone } from '@/components/account/Dropzone';
import { todayIso } from '@/components/account/format';
import {
  Button,
  Card,
  Column,
  LinkButton,
  PageTitle,
} from '@/components/account/primitives';
import {
  useAccountView,
  useUploadLetterMutation,
} from '@/components/account/useAccountView';

const FIELD = 'acc-input';

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
      <Column width={640}>
        <PageTitle>Upload a letter</PageTitle>
        <Card>
          <div className="acc-success">
            <CheckCircle className="acc-success-icon" aria-hidden />
            <div className="acc-card-body">
              <p className="acc-tl-title">Thank you — we have your letter.</p>
              <p className="acc-card-muted">
                We&apos;ll check what it means and take care of the next steps
                with you.
              </p>
            </div>
          </div>
          <div className="acc-actions">
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
      </Column>
    );
  }

  const busy = upload.isPending;

  return (
    <Column width={640}>
      <PageTitle lead="Please upload it here as soon as you can. We'll check what it means and take care of the next steps with you.">
        Upload a letter
      </PageTitle>

      <form onSubmit={submit} noValidate className="acc-form">
        <div className="acc-field">
          <span className="acc-label">The letter</span>
          <Dropzone
            files={files}
            onChange={setFiles}
            disabled={busy}
            label="Drag the letter here or choose a file"
            id="letter-file"
          />
        </div>

        <div className="acc-field">
          <label htmlFor="letter-received" className="acc-label">
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

        <div className="acc-field">
          <label htmlFor="letter-sender" className="acc-label">
            Sender <span className="acc-label-opt">(optional)</span>
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

        <div className="acc-field">
          <label htmlFor="letter-note" className="acc-label">
            Note <span className="acc-label-opt">(optional)</span>
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
            {busy ? 'Sending…' : 'Send to us'}
          </Button>
        </div>
      </form>
    </Column>
  );
}
