/**
 * Match a statement credit line to a case (platform brief Part 2, E1):
 * by VSNR and name in the payment reference. Pure — the caller supplies
 * the firm's candidate cases.
 *
 * Rules:
 *  - VSNR found in the reference (spaces ignored) for exactly one case →
 *    matched ("vsnr+name" when the case's last name is also there, else
 *    "vsnr").
 *  - No VSNR, but first AND last name of exactly one case in the
 *    reference → not matched automatically; goes to the reconciliation
 *    queue with that case as a suggestion (names are not unique enough to
 *    move money on).
 *  - Several cases fit → unmatched ("ambiguous"), all listed as suggestions.
 *  - Nothing found → unmatched ("no VSNR or name in reference").
 */

export interface MatchCandidate {
  claimId: string;
  firstName: string | null;
  lastName: string | null;
  vsnr: string | null;
}

export type MatchReason =
  | 'vsnr+name'
  | 'vsnr'
  | 'name_only'
  | 'ambiguous'
  | 'none';

export interface MatchResult {
  claimId: string | null;
  reason: MatchReason;
  /** Candidate cases for the reconciliation queue. */
  suggestions: string[];
}

export function normalizeText(s: string): string {
  return ` ${s
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()} `;
}

export function compact(s: string): string {
  return normalizeText(s).replace(/\s+/g, '');
}

/** Every name part (e.g. "Van der Berg" → VAN, DER, BERG) appears as a word. */
export function containsName(normRef: string, name: string | null): boolean {
  if (!name) return false;
  const parts = normalizeText(name)
    .trim()
    .split(' ')
    .filter((p) => p.length >= 2);
  if (!parts.length) return false;
  return parts.every((p) => normRef.includes(` ${p} `));
}

export function matchStatementLine(
  reference: string,
  candidates: MatchCandidate[],
  payer = ''
): MatchResult {
  const ref = `${reference} ${payer}`;
  const normRef = normalizeText(ref);
  const compactRef = compact(ref);

  const byVsnr = candidates.filter((c) => {
    const v = c.vsnr ? compact(c.vsnr) : '';
    return v.length >= 10 && compactRef.includes(v);
  });
  if (byVsnr.length === 1) {
    const c = byVsnr[0];
    return {
      claimId: c.claimId,
      reason: containsName(normRef, c.lastName) ? 'vsnr+name' : 'vsnr',
      suggestions: [],
    };
  }
  if (byVsnr.length > 1) {
    // Same VSNR on several cases (e.g. an earlier closed case): the name
    // decides when it singles one out.
    const named = byVsnr.filter((c) => containsName(normRef, c.lastName));
    if (named.length === 1) {
      return {
        claimId: named[0].claimId,
        reason: 'vsnr+name',
        suggestions: [],
      };
    }
    return {
      claimId: null,
      reason: 'ambiguous',
      suggestions: byVsnr.map((c) => c.claimId),
    };
  }

  const byName = candidates.filter(
    (c) =>
      containsName(normRef, c.lastName) && containsName(normRef, c.firstName)
  );
  if (byName.length === 1) {
    return {
      claimId: null,
      reason: 'name_only',
      suggestions: [byName[0].claimId],
    };
  }
  if (byName.length > 1) {
    return {
      claimId: null,
      reason: 'ambiguous',
      suggestions: byName.map((c) => c.claimId),
    };
  }
  return { claimId: null, reason: 'none', suggestions: [] };
}

export const MATCH_REASON_TEXT: Record<MatchReason, string> = {
  'vsnr+name': 'VSNR and name in reference',
  vsnr: 'VSNR in reference',
  name_only: 'Name only — needs ATLAES confirmation',
  ambiguous: 'Several cases fit',
  none: 'no VSNR or name in reference',
};
