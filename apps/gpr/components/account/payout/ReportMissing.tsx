'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrorMessage } from '@/lib/account-api';
import type { PayoutState } from '@/lib/payout-api';
import { fileBadge, validateAccountFile } from '../Dropzone';
import { formatFileSize } from '../format';
import { REVIEW_COPY, REVIEW_FIGMA as T } from './copy';
import {
  Footer,
  NothingOpen,
  PayoutFrame,
  Question,
  REVIEW_TITLE,
} from './PayoutFrame';
import { useReportMissing } from './usePayout';

/** Figma 09 · Report missing periods (option B of the review task). */
export function ReportMissing({ data }: { data: PayoutState }) {
  const router = useRouter();
  const report = useReportMissing();
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const decision = data.decision;
  const releaseOpen = data.release?.status === 'open';

  const add = (list: FileList | null) => {
    if (!list) return;
    const problems: string[] = [];
    const good: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const p = validateAccountFile(list[i]);
      if (p) problems.push(p);
      else good.push(list[i]);
    }
    setError(problems.length ? problems.join(' ') : null);
    if (good.length) setFiles((prev) => prev.concat(good));
  };

  if (submitted) {
    return (
      <PayoutFrame title={REVIEW_TITLE}>
        <Question title={T.missingTitle} />
        <div className="pay-ok" role="status">
          <span className="pay-ok-tick" aria-hidden="true">
            ✓
          </span>
          <p>{REVIEW_COPY.reportReceived}</p>
        </div>
        {releaseOpen ? (
          <Footer
            backHref="/account"
            cta="Continue"
            onCta={() => router.push('/account/payout/release')}
          />
        ) : (
          <>
            <p className="pay-lead">{REVIEW_COPY.notifiedWhenFunds}</p>
            <Footer
              backHref="/account"
              cta="Back to your account"
              onCta={() => router.push('/account')}
            />
          </>
        )}
      </PayoutFrame>
    );
  }

  if (!decision || decision.reviewOutcome) {
    return (
      <PayoutFrame title={REVIEW_TITLE}>
        <NothingOpen />
      </PayoutFrame>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!description.trim()) {
      setError('Please describe what is missing or wrong.');
      return;
    }
    try {
      await report.mutateAsync({ decisionId: decision.id, description, files });
      setSubmitted(true);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          'Your report did not go through. Please try again.'
        )
      );
    }
  };

  const busy = report.isPending;

  return (
    <PayoutFrame title={REVIEW_TITLE}>
      <Question title={T.missingTitle} lead={T.missingLead} />
      <form onSubmit={submit} noValidate className="pay-col">
        <div className="pay-field">
          <label htmlFor="pay-missing" className="pay-label">
            {T.missingLabel}
          </label>
          <textarea
            id="pay-missing"
            className="pay-textarea"
            placeholder={T.missingPlaceholder}
            value={description}
            maxLength={5000}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />
          <p className="pay-muted">{T.missingHint}</p>
        </div>

        <div className="pay-stack-10">
          <span className="pay-label" id="pay-payslips">
            {T.payslipsLabel}
          </span>
          <div
            role="button"
            tabIndex={0}
            aria-labelledby="pay-payslips"
            className="pay-drop"
            data-active={dragging ? 'true' : 'false'}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                input.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              add(e.dataTransfer.files);
            }}
          >
            <p className="pay-drop-title">{T.dropTitle}</p>
            <p className="pay-muted">{T.dropHint}</p>
            <input
              ref={input}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="acc-sr-only"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
          {files.map((f, i) => (
            <div className="pay-file" key={f.name + i}>
              <span className="pay-file-badge" aria-hidden="true">
                {fileBadge(f.name)}
              </span>
              <span className="pay-file-box">
                <span className="pay-file-name">{f.name}</span>
                <span className="pay-file-size">
                  {formatFileSize(f.size)} · ready
                </span>
              </span>
              <span className="pay-file-ok" aria-hidden="true">
                ✓
              </span>
              <button
                type="button"
                className="pay-file-remove"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                aria-label={'Remove ' + f.name}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          ))}
          {files.length ? (
            <button
              type="button"
              className="pay-add"
              onClick={() => input.current?.click()}
            >
              {T.addMore}
            </button>
          ) : null}
        </div>

        <div className="pay-warn" role="note">
          <span className="pay-warn-bang" aria-hidden="true">
            !
          </span>
          <p className="pay-warn-strong">{REVIEW_COPY.payslipNotice}</p>
        </div>

        {error ? (
          <p className="pay-error" role="alert">
            {error}
          </p>
        ) : null}

        <Footer
          backHref="/account/payout/review"
          cta={busy ? 'Submitting…' : T.submit}
          type="submit"
          disabled={busy}
        />
      </form>
    </PayoutFrame>
  );
}
