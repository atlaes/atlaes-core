'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CodeInput } from '@/components/auth/CodeInput';
import {
  FootNote,
  LinkButton,
  PortalAuthTopBar,
  PrimaryButton,
  StepCard,
  fieldInputClass,
} from '@/components/auth/PortalAuthChrome';
import {
  EnrolmentCard,
  RecoveryCodesCard,
} from '@/components/auth/PortalEnrolment';
import {
  PortalChallenge,
  TwoFactorApiError,
  clearChallenge,
  getTwoFactorStatus,
  loadChallenge,
  storeSession,
  verifyCode,
  verifyRecoveryCode,
} from '@/lib/two-factor-api';

/**
 * Law-firm portal sign-in with two-factor authentication
 * (Figma 01 · Sign-in with 2FA, 1030:5131).
 *
 * Step 1: work e-mail → sign-in link (the existing magic link). The link
 * lands on /auth/magic-link, which for law-firm accounts stores a 2FA
 * challenge and comes back here.
 * Step 2: six-digit code from the authenticator app — or, the first time,
 * set-up with QR code and recovery codes.
 * Admins who open the portal with an ordinary admin session come here via
 * the API's 403 "two_factor_required" and step up with their access token.
 */
type Phase = 'loading' | 'email' | 'code' | 'enrol' | 'recovery';

function remaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function safeNext(next: string | null): string {
  return next && next.startsWith('/portal') ? next : '/portal';
}

export default function PortalSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const { requestMagicLink, logout } = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<PortalChallenge | null>(null);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Where are we? Pending challenge → step 2; admin session → step-up.
  useEffect(() => {
    const pending = loadChallenge();
    if (pending && new Date(pending.challengeExpiresAt).getTime() > Date.now()) {
      setChallenge(pending);
      setEmail(pending.email);
      setPhase(pending.enrolmentRequired ? 'enrol' : 'code');
      return;
    }
    clearChallenge();
    const hasSession =
      typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
    if (!hasSession) {
      setPhase('email');
      return;
    }
    getTwoFactorStatus(null)
      .then((s) => {
        setEmail(s.email);
        setPhase(s.enrolled ? 'code' : 'enrol');
      })
      .catch(() => setPhase('email'));
  }, []);

  // Countdown: the sign-in challenge, or (step-up) the current 30-s code.
  useEffect(() => {
    if (phase !== 'code' && phase !== 'enrol') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const msLeft = useMemo(() => {
    if (challenge) return new Date(challenge.challengeExpiresAt).getTime() - now;
    return 30_000 - (now % 30_000);
  }, [challenge, now]);

  useEffect(() => {
    if (challenge && msLeft <= 0 && !expired && phase !== 'recovery') {
      setExpired(true);
      setCodeError('Your sign-in has expired. Request a new sign-in link.');
    }
  }, [challenge, msLeft, expired, phase]);

  const finish = useCallback(() => {
    window.location.replace(next);
  }, [next]);

  const sendLink = async (target: string) => {
    setSending(true);
    setEmailError(null);
    try {
      const result = await requestMagicLink(target);
      // Local development returns the link instead of e-mailing it.
      if (result.magicLink) {
        const token = new URL(result.magicLink).searchParams.get('token');
        if (token) {
          router.push(`/auth/magic-link?token=${token}`);
          return;
        }
      }
      setSentTo(target);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send sign-in link');
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    clearChallenge();
    setChallenge(null);
    setExpired(false);
    setCode('');
    setCodeError(null);
    setPhase('email');
    if (email) await sendLink(email);
  };

  const signOut = () => {
    clearChallenge();
    logout();
    setChallenge(null);
    setEmail('');
    setSentTo(null);
    setCode('');
    setCodeError(null);
    setExpired(false);
    setPhase('email');
  };

  const handleApiError = (err: unknown) => {
    if (err instanceof TwoFactorApiError) {
      if (err.code === 'challenge_invalid') {
        setExpired(true);
        setCodeError('Your sign-in has expired. Request a new sign-in link.');
      } else if (err.code === 'invalid_code' && err.attemptsLeft !== undefined) {
        setCodeError(
          `${err.message} ${err.attemptsLeft} ${err.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`
        );
      } else {
        setCodeError(err.message);
      }
    } else {
      setCodeError('Something went wrong. Please try again.');
    }
  };

  const submitCode = async (value = code) => {
    if (verifying || expired) return;
    if (useRecovery ? recoveryCode.trim().length < 12 : value.length !== 6) {
      setCodeError(
        useRecovery ? 'Enter a recovery code.' : 'Enter the 6-digit code.'
      );
      return;
    }
    setVerifying(true);
    setCodeError(null);
    try {
      const session = useRecovery
        ? await verifyRecoveryCode(challenge, recoveryCode)
        : await verifyCode(challenge, value);
      storeSession(session);
      finish();
    } catch (err) {
      handleApiError(err);
      if (!useRecovery) setCode('');
      setVerifying(false);
    }
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-white">
        <PortalAuthTopBar />
      </div>
    );
  }

  const step2Active = phase === 'code';
  const codeLine = challenge ? (
    <>
      Code expires in {remaining(msLeft)} ·{' '}
      <LinkButton onClick={resend} disabled={sending}>
        Resend code
      </LinkButton>
    </>
  ) : (
    <>Code expires in {remaining(msLeft)}</>
  );

  return (
    <div className="min-h-screen bg-white text-[#181818]">
      <PortalAuthTopBar
        email={phase === 'email' ? null : email}
        onSignOut={phase === 'email' ? undefined : signOut}
      />
      <main className="flex w-full flex-col items-center px-4 pb-24 pt-12 sm:px-6">
        <div className="flex w-full max-w-[960px] flex-col gap-8 lg:flex-row lg:items-start">
          {/* Step 1 · Magic link (1030:5143) */}
          <StepCard
            step="Step 1 of 2"
            title="Sign in"
            intro="Enter your work email. We will send you a single-use sign-in link."
            labelledBy="portal-step-1"
          >
            <form
              className="flex w-full flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                // From step 2 this starts over with a fresh link.
                if (phase === 'email') sendLink(email.trim());
                else resend();
              }}
            >
              <label className="flex w-full flex-col gap-2">
                <span className="text-[13px] font-semibold leading-[1.4] text-[#181818]">
                  Work email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  disabled={phase === 'recovery'}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@firm.de"
                  className={fieldInputClass}
                />
              </label>
              <PrimaryButton type="submit" disabled={phase === 'recovery' || sending}>
                {sending ? 'Sending…' : 'Send sign-in link'}
              </PrimaryButton>
            </form>
            {emailError && (
              <FootNote tone="error" role="alert">
                {emailError}
              </FootNote>
            )}
            {sentTo && phase === 'email' && (
              <FootNote tone="body" role="status">
                We sent a sign-in link to {sentTo}. Open it to continue.
              </FootNote>
            )}
            <FootNote>
              Access is limited to the law-firm role. Every download is logged
              (user, time, IP).
            </FootNote>
          </StepCard>

          {phase === 'enrol' ? (
            <EnrolmentCard
              challenge={challenge}
              countdown={codeLine}
              expired={expired}
              expiredMessage={codeError}
              onAlreadyEnrolled={() => setPhase('code')}
              onEnrolled={(session, codes) => {
                storeSession(session);
                setRecoveryCodes(codes);
                setPhase('recovery');
              }}
            />
          ) : phase === 'recovery' && recoveryCodes ? (
            <RecoveryCodesCard codes={recoveryCodes} onContinue={finish} />
          ) : (
            /* Step 2 · 6-digit code (1030:5154) */
            <StepCard
              step="Step 2 of 2"
              title={useRecovery ? 'Enter a recovery code' : 'Enter your 6-digit code'}
              intro={
                useRecovery
                  ? 'Use one of the recovery codes you saved when you set up two-factor sign-in. Each code works once.'
                  : 'Open your authenticator app and enter the code shown for Vividius Law-firm portal.'
              }
              muted={!step2Active}
              labelledBy="portal-step-2"
            >
              <form
                className="flex w-full flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCode();
                }}
              >
                {useRecovery ? (
                  <input
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                    disabled={!step2Active || expired}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="XXXX-XXXX-XXXX"
                    aria-label="Recovery code"
                    aria-invalid={!!codeError || undefined}
                    className={`${fieldInputClass} font-mono tracking-[0.08em] ${codeError ? 'border-[#b42318]' : ''}`}
                  />
                ) : (
                  <CodeInput
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      if (codeError && !expired) setCodeError(null);
                    }}
                    onComplete={(v) => submitCode(v)}
                    disabled={!step2Active || expired || verifying}
                    invalid={!!codeError}
                    autoFocus={step2Active}
                  />
                )}
                {step2Active && <FootNote>{codeLine}</FootNote>}
                {codeError && (
                  <FootNote tone="error" role="alert">
                    {codeError}
                  </FootNote>
                )}
                <PrimaryButton
                  type="submit"
                  disabled={!step2Active || expired || verifying}
                >
                  {verifying ? 'Verifying…' : 'Verify and sign in'}
                </PrimaryButton>
              </form>
              <FootNote>
                {step2Active && (
                  <>
                    <LinkButton
                      onClick={() => {
                        setUseRecovery(!useRecovery);
                        setCodeError(expired ? codeError : null);
                      }}
                    >
                      {useRecovery ? 'Use the 6-digit code instead' : 'Use a recovery code'}
                    </LinkButton>
                    <br />
                  </>
                )}
                Trouble signing in? Contact ATLAES support.
              </FootNote>
            </StepCard>
          )}
        </div>
      </main>
    </div>
  );
}
