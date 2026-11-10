/**
 * Hero flow-card instant hint: Step A1–A5 of the eligibility rule set
 * (`lib/eligibility-rules.ts`, GPR-ELIG-2026-11-10) — the blocking tests
 * that read only citizenship and residence. A blocked pair shows the
 * NOT_NOW title and its reason line (brief § 4 copy); anything else
 * continues into the funnel, where the later questions decide.
 */
import { countryLabel, resolveCountry } from '@/lib/country-search';
import {
  RESULT_COPY,
  countryBlock,
  reasonLine,
  type BlockReason,
} from '@/lib/eligibility-rules';

/** ISO 3166-1 alpha-2 for a country name, alias or code, or null. */
export function countryCode(name: string): string | null {
  const hit = resolveCountry(name);
  if (hit) return hit.code;
  const v = name.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) && countryLabel(v) !== v ? v : null;
}

export interface PreliminaryVerdict {
  code: BlockReason;
  status: 'no';
  title: string;
  body: string;
}

export type PreliminaryHint =
  | { kind: 'verdict'; verdict: PreliminaryVerdict }
  /** No country-only rule applies: the funnel's later questions decide. */
  | { kind: 'continue' };

/** Preliminary hint for two ISO codes (or names), or null if unknown. */
export function preliminaryHint(
  citizenship: string,
  residence: string
): PreliminaryHint | null {
  const cit = countryCode(citizenship);
  const res = countryCode(residence);
  if (!cit || !res) return null;
  const block = countryBlock({ citizenship: cit, residence: res });
  if (!block) return { kind: 'continue' };
  return {
    kind: 'verdict',
    verdict: {
      code: block,
      status: 'no',
      title: RESULT_COPY.notNow.title,
      body: reasonLine(
        block,
        { residence: res, sixtyCountry: null },
        countryLabel
      ),
    },
  };
}
