/**
 * Case-manager signatures for client e-mails (owner, Slack 30 Oct 2026):
 * name, role and a small headshot; GPR mails end with the Trustpilot
 * link. Headshots are served by the GPR site (apps/gpr/public/email/
 * signatures). A manager without a profile signs "Your case manager";
 * no manager at all → the team signature.
 */

import type { PayoutEmailSigner } from '../gpr-payout/email-templates/layout';
import type { PayoutProduct } from './templates';
import { PRODUCT_FIELDS } from './templates';

interface SignerProfile {
  name: string;
  role: string;
  /** File name under /email/signatures/. */
  headshot: string;
}

export const SIGNER_PROFILES: SignerProfile[] = [
  { name: 'Anna Kliem', role: 'Managing Director', headshot: 'anna-kliem.jpg' },
  {
    name: 'Christian Kliem',
    role: 'Case Manager',
    headshot: 'christian-kliem.jpg',
  },
  { name: 'Julia Kim', role: 'Case Manager', headshot: 'julia-kim.jpg' },
  {
    name: 'Johannes Kühn',
    role: 'Senior Case Manager',
    headshot: 'johannes-kuehn.png',
  },
];

/** GPR Trustbox link (owner, 30 Oct 2026). */
export const GPR_TRUSTPILOT_URL = 'https://trstp.lt/CtAJbfLICS';

function siteBase(): string {
  return (process.env.GPR_FRONTEND_URL || process.env.FRONTEND_URL || '')
    .trim()
    .replace(/\/$/, '');
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Profile by full name, or by first name when that is unambiguous. */
export function signerProfile(
  manager: string | null | undefined
): SignerProfile | null {
  const m = norm(manager ?? '');
  if (!m) return null;
  const full = SIGNER_PROFILES.find((p) => norm(p.name) === m);
  if (full) return full;
  const byFirst = SIGNER_PROFILES.filter(
    (p) => norm(p.name).split(' ')[0] === m
  );
  return byFirst.length === 1 ? byFirst[0] : null;
}

export interface SenderIdentity {
  fromName: string;
  signer: PayoutEmailSigner;
  hasManager: boolean;
}

/**
 * Sender display "[first name] | [brand]" and the signature; without a
 * manager "[brand] Team" with a team signature.
 */
export function senderIdentity(
  product: PayoutProduct,
  manager: string | null | undefined
): SenderIdentity {
  const brand = PRODUCT_FIELDS[product].brand;
  const trustpilot =
    product === 'gpr'
      ? { url: GPR_TRUSTPILOT_URL, label: 'See our reviews on Trustpilot' }
      : null;
  const name = (manager ?? '').trim();
  if (!name) {
    return {
      fromName: `${brand} Team`,
      hasManager: false,
      signer: { name: `${brand} Team`, role: '', brand: '', trustpilot },
    };
  }
  const profile = signerProfile(name);
  const base = siteBase();
  return {
    fromName: `${(profile?.name ?? name).split(' ')[0]} | ${brand}`,
    hasManager: true,
    signer: {
      name: profile?.name ?? name,
      role: profile?.role ?? 'Your case manager',
      brand,
      headshotUrl:
        profile && base ? `${base}/email/signatures/${profile.headshot}` : null,
      trustpilot,
    },
  };
}
