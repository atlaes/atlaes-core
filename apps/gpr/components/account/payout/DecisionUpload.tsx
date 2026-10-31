'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrorMessage } from '@/lib/account-api';
import type { PayoutState } from '@/lib/payout-api';
import { Dropzone } from '../Dropzone';
import { formatLongDate } from '../format';
import { Footer, NothingOpen, PayoutFrame, Question } from './PayoutFrame';
import { useDecisionNotReceived, useUploadDecision } from './usePayout';

export const DECISION_TITLE = 'Task · Your refund decision';

/**
 * Decision request (e-mail EM): the funds are in but we have no verified
 * copy of the decision. The client uploads every page (merged into one
 * PDF by the backend) or tells us it has not arrived.
 */
export function DecisionUpload({ data }: { data: PayoutState }) {
  const router = useRouter();
  const upload = useUploadDecision();
  const notReceived = useDecisionNotReceived();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const req = data.decisionRequest;

  if (req.uploadedAt) {
    return (
      <PayoutFrame title={DECISION_TITLE}>
        <Question title="Thank you, we have your letter" />
        <div className="pay-ok" role="status">
          <span className="pay-ok-tick" aria-hidden="true">
            ✓
          </span>
          <p>
            Uploaded on {formatLongDate(req.uploadedAt.slice(0, 10))}. We are
            checking it and will ask you to review it once it is verified.
          </p>
        </div>
        <Footer
          backHref="/account"
          cta="Back to your account"
          onCta={() => router.push('/account')}
        />
      </PayoutFrame>
    );
  }

  if (!req.open) {
    return (
      <PayoutFrame title={DECISION_TITLE}>
        <NothingOpen />
      </PayoutFrame>
    );
  }

  const busy = upload.isPending || notReceived.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!files.length) {
      setError('Please add a scan or photo of every page of the letter.');
      return;
    }
    try {
      await upload.mutateAsync(files);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          'Your upload did not go through. Please try again.'
        )
      );
    }
  };

  const reportMissing = async () => {
    setError(null);
    try {
      await notReceived.mutateAsync();
    } catch (err) {
      setError(
        apiErrorMessage(err, 'That did not go through. Please try again.')
      );
    }
  };

  return (
    <PayoutFrame title={DECISION_TITLE}>
      <Question
        title="Have you received your refund decision?"
        lead="Your refund has arrived, but we are still waiting for a copy of your refund decision (Bescheid). It may have been sent directly to you."
      />
      <form onSubmit={submit} noValidate className="pay-col">
        <div className="pay-stack-10">
          <span className="pay-label">
            Upload a clear scan or photo of every page
          </span>
          <Dropzone
            id="pay-decision-upload"
            files={files}
            onChange={setFiles}
            multiple
            disabled={busy}
            label="Drag the pages here or choose files"
          />
          <p className="pay-muted">
            PDF, JPG or PNG, up to 10MB each. Several photos are joined into one
            document in the order you add them.
          </p>
        </div>

        <div className="pay-warn" role="note">
          <span className="pay-warn-bang" aria-hidden="true">
            !
          </span>
          {req.notReceivedAt ? (
            <p>
              You told us on {formatLongDate(req.notReceivedAt.slice(0, 10))}{' '}
              that the letter has not arrived. We are getting a copy for you; if
              it arrives in the meantime, you can still upload it here.
            </p>
          ) : (
            <p>
              Not received it yet?{' '}
              <button
                type="button"
                className="pay-add"
                onClick={() => void reportMissing()}
                disabled={busy}
              >
                Tell us it has not arrived
              </button>
            </p>
          )}
        </div>

        {error ? (
          <p className="pay-error" role="alert">
            {error}
          </p>
        ) : null}

        <Footer
          backHref="/account"
          cta={upload.isPending ? 'Uploading…' : 'Upload my letter'}
          type="submit"
          disabled={busy}
        />
      </form>
    </PayoutFrame>
  );
}
