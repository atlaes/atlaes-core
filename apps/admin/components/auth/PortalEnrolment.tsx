'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CodeInput } from './CodeInput';
import {
  FootNote,
  PrimaryButton,
  SecondaryButton,
  StepCard,
} from './PortalAuthChrome';
import {
  PortalChallenge,
  PortalSession,
  TwoFactorApiError,
  confirmEnrolment,
  startEnrolment,
} from '@/lib/two-factor-api';

/**
 * First-time set-up of two-factor sign-in. Not drawn in Figma: it reuses
 * the Step 2 card of frame 01 (1030:5154). The QR code is an SVG built by
 * the backend's own encoder (services/totp/qr.ts, no dependency); the key
 * is also shown for manual entry.
 */
export function EnrolmentCard({
  challenge,
  countdown,
  expired,
  expiredMessage,
  onEnrolled,
  onAlreadyEnrolled,
}: {
  challenge: PortalChallenge | null;
  countdown: ReactNode;
  expired: boolean;
  expiredMessage: string | null;
  onEnrolled: (session: PortalSession, recoveryCodes: string[]) => void;
  onAlreadyEnrolled: () => void;
}) {
  const [setup, setSetup] = useState<{
    qrSvg: string;
    manualKey: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startEnrolment(challenge)
      .then((r) => {
        if (!cancelled) setSetup({ qrSvg: r.qrSvg, manualKey: r.manualKey });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof TwoFactorApiError && err.code === 'already_enrolled') {
          onAlreadyEnrolled();
          return;
        }
        setLoadError(
          err instanceof Error ? err.message : 'Could not start the set-up.'
        );
      });
    return () => {
      cancelled = true;
    };
    // Start once per mount; a new secret replaces the unconfirmed one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (value = code) => {
    if (busy || expired) return;
    if (value.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { recoveryCodes, ...session } = await confirmEnrolment(
        challenge,
        value
      );
      onEnrolled(session, recoveryCodes);
    } catch (err) {
      setError(
        err instanceof TwoFactorApiError
          ? err.attemptsLeft !== undefined
            ? `${err.message} ${err.attemptsLeft} ${err.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`
            : err.message
          : 'Something went wrong. Please try again.'
      );
      setCode('');
      setBusy(false);
    }
  };

  const shownError = expired ? expiredMessage : error ?? loadError;

  return (
    <StepCard
      step="Step 2 of 2"
      title="Set up two-factor sign-in"
      intro="Scan the QR code with an authenticator app, then enter the 6-digit code it shows for Vividius Law-firm portal."
      labelledBy="portal-step-2"
    >
      <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div
          className="flex h-[168px] w-[168px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#c6c6c6] bg-white"
          aria-label="QR code for your authenticator app"
        >
          {setup ? (
            // Server-generated SVG from our own encoder (no user content).
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`}
              alt="QR code for your authenticator app"
              width={160}
              height={160}
            />
          ) : (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#002691] border-t-transparent" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[13px] font-semibold leading-[1.4] text-[#181818]">
            Can’t scan? Enter this key
          </p>
          <code className="break-all rounded-[10px] bg-[#f1f1f1] px-3 py-2 font-mono text-[14px] leading-[1.5] tracking-[0.04em] text-[#181818]">
            {setup?.manualKey ?? '…'}
          </code>
          <p className="text-[13px] leading-[1.5] text-[#8c8c8c]">
            Time-based, 6 digits, 30 seconds.
          </p>
        </div>
      </div>
      <form
        className="flex w-full flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <CodeInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(null);
          }}
          onComplete={(v) => submit(v)}
          disabled={!setup || expired || busy}
          invalid={!!shownError}
        />
        <FootNote>{countdown}</FootNote>
        {shownError && (
          <FootNote tone="error" role="alert">
            {shownError}
          </FootNote>
        )}
        <PrimaryButton
          type="submit"
          disabled={!setup || expired || busy}
        >
          {busy ? 'Verifying…' : 'Confirm and continue'}
        </PrimaryButton>
      </form>
      <FootNote>Trouble signing in? Contact ATLAES support.</FootNote>
    </StepCard>
  );
}

/** Recovery codes, shown exactly once after set-up. */
export function RecoveryCodesCard({
  codes,
  onContinue,
}: {
  codes: string[];
  onContinue: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob(
      [`Vividius Law-firm portal recovery codes\n\n${text}\n`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'law-firm-portal-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StepCard
      step="Set-up complete"
      title="Save your recovery codes"
      intro="If you lose access to your authenticator app, each of these codes lets you sign in once. They are shown only now."
      labelledBy="portal-recovery"
    >
      <ul className="grid w-full grid-cols-2 gap-2" aria-label="Recovery codes">
        {codes.map((c) => (
          <li
            key={c}
            className="rounded-[10px] border border-[#c6c6c6] bg-white px-3 py-2 text-center font-mono text-[14px] tracking-[0.04em] text-[#181818]"
          >
            {c}
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-wrap gap-3">
        <SecondaryButton type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy codes'}
        </SecondaryButton>
        <SecondaryButton type="button" onClick={download}>
          Download
        </SecondaryButton>
      </div>
      <label className="flex items-start gap-3 text-[15px] leading-[1.5] text-[#4b4f58]">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#002691]"
        />
        I have stored these codes in a safe place.
      </label>
      <PrimaryButton type="button" disabled={!saved} onClick={onContinue}>
        Continue to the portal
      </PrimaryButton>
    </StepCard>
  );
}
