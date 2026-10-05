'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage } from '@/lib/account-api';
import payoutApi, { type PayoutState, type ZeSection } from '@/lib/payout-api';
import { SIGN_FIGMA as T } from './copy';
import { Footer, PayoutFrame, Question, releaseTitle } from './PayoutFrame';
import { ReleaseClosed } from './ReleaseClosed';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import { payoutKeys, useInvalidatePayout } from './usePayout';

const TRANSLATION_LABEL =
  'English translation — the German version is authoritative.';

const BLOCKER_TEXT: Record<string, string> = {
  invoice_missing: 'your invoice is still being issued',
  aktenzeichen_missing: 'the law firm’s file number is not on your case yet',
  atlaes_iban_missing: 'our payment details are being set up',
  bank_details_missing: 'your bank details are missing',
  route_missing: 'no payout option has been chosen',
};

/** One language block of the Zahlungserklärung (D) / payment instruction (E). */
function DocBlock({ sections }: { sections: ZeSection[] }) {
  return (
    <>
      {sections.map((s, i) => {
        if (i === 0) {
          return (
            <div key={i} className="pay-stack-10" style={{ gap: 14 }}>
              <p className="pay-doc-title">{s.heading}</p>
              {s.lines.map((l) => (
                <p key={l} className="pay-doc-name">
                  {l}
                </p>
              ))}
            </div>
          );
        }
        const small = s.lines.some((l) => /(Unterschrift|Signature):/.test(l));
        if (
          !s.heading &&
          !small &&
          s.lines.length > 1 &&
          !/^\d\. /.test(s.lines[0])
        ) {
          // intro paragraphs: one <p> each
          return s.lines.map((l) => <p key={l}>{l}</p>);
        }
        return (
          <p key={i} className={small ? 'pay-doc-small' : undefined}>
            {(s.heading ? [s.heading] : []).concat(s.lines).map((l, j, all) => (
              <span key={j}>
                {l}
                {j < all.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** Figma 12 · Sign the payment instruction. */
export function SignInstruction({ data }: { data: PayoutState }) {
  const router = useRouter();
  const invalidate = useInvalidatePayout();
  const release = data.release;
  const pad = useRef<SignaturePadHandle>(null);
  const [hasInk, setHasInk] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useQuery({
    queryKey: payoutKeys.ze(release?.id ?? ''),
    queryFn: () => payoutApi.zePreview(release!.id),
    enabled: !!release && release.status === 'open' && !!release.account,
  });

  if (!release || release.status !== 'open')
    return <ReleaseClosed data={data} />;

  const backHref =
    release.account && release.account.currency !== 'EUR'
      ? '/account/payout/release/route'
      : '/account/payout/release';
  const blockers = preview.data?.blockers ?? release.blockers;

  const submit = async () => {
    setError(null);
    const sig = pad.current?.toDataUrl();
    if (!sig) {
      setError('Please draw your signature.');
      return;
    }
    if (!confirmed) {
      setError('Please confirm that you have read the payment instruction.');
      return;
    }
    setBusy(true);
    try {
      const res = await payoutApi.sign(release.id, sig);
      await invalidate();
      if (res.url) window.open(res.url, '_blank', 'noopener');
      router.push('/account/payout/release');
    } catch (e) {
      setError(apiErrorMessage(e, 'Your signature could not be submitted.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PayoutFrame title={releaseTitle(3)} step={3}>
      <Question title={T.title} lead={T.lead} />

      <article className="pay-doc" aria-label={T.docLabel}>
        <div className="pay-doc-head">
          <span className="pay-doc-firm">{T.firm}</span>
          <span className="pay-doc-page">{T.docLabel}</span>
        </div>
        {preview.data ? (
          <>
            <DocBlock sections={preview.data.text.german} />
            <div className="pay-doc-rule" />
            <p className="pay-doc-label">{TRANSLATION_LABEL}</p>
            <DocBlock sections={preview.data.text.english} />
          </>
        ) : preview.isError ? (
          <p className="pay-error">
            {apiErrorMessage(
              preview.error,
              'The payment instruction could not be loaded.'
            )}
          </p>
        ) : (
          <p className="pay-muted">Loading…</p>
        )}
      </article>

      <div className="pay-stack-10">
        <div className="pay-sig-head">
          <span>{T.drawLabel}</span>
          <button
            type="button"
            className="pay-sig-clear"
            onClick={() => pad.current?.clear()}
            disabled={!hasInk}
          >
            {T.clear}
          </button>
        </div>
        <SignaturePad
          ref={pad}
          hint={T.padHint}
          label={T.drawLabel}
          onChange={setHasInk}
        />
      </div>

      <label className="pay-confirm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>{T.confirm}</span>
      </label>

      {blockers.length ? (
        <div className="pay-info" role="status">
          <p>
            You can sign as soon as everything is ready on our side:{' '}
            {blockers.map((b) => BLOCKER_TEXT[b] ?? b).join('; ')}.
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="pay-error" role="alert">
          {error}
        </p>
      ) : null}

      <Footer
        backHref={backHref}
        cta={busy ? 'Signing…' : T.submit}
        onCta={() => void submit()}
        disabled={busy || blockers.length > 0}
      />
    </PayoutFrame>
  );
}
