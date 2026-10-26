/**
 * Hero flow-card instant hint: the part of `evaluateEligibility()` that is
 * decided by citizenship + residence alone. Uses the verdict rules and
 * texts of `lib/eligibility-verdicts.ts` unchanged; it only fills the
 * answers the flow card does not ask yet with values that cannot trigger
 * the later rules on their own, and keeps a verdict only when its rule
 * reads nothing but the two countries.
 */
import { COUNTRY_OPTIONS } from '@/content/offices';
import {
  evaluateEligibility,
  type Verdict,
  type VerdictCode,
} from '@/lib/eligibility-verdicts';

/** Flow-card names (`data/countries.ts`) that differ from the widget list. */
const NAME_ALIASES: Record<string, string> = {
  congo: 'CG',
  'czech republic': 'CZ',
  'ivory coast': 'CI',
  'sao tome and principe': 'ST',
  turkey: 'TR',
};

/** ISO 3166-1 alpha-2 for a canonical country name, or null. */
export function countryCode(name: string): string | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  if (NAME_ALIASES[needle]) return NAME_ALIASES[needle];
  for (let i = 0; i < COUNTRY_OPTIONS.length; i++) {
    if (COUNTRY_OPTIONS[i].name.toLowerCase() === needle) {
      return COUNTRY_OPTIONS[i].code;
    }
  }
  return null;
}

/** Verdicts whose rule reads only citizenship and residence. */
export const COUNTRY_ONLY_CODES: VerdictCode[] = [
  'eu-citizen',
  'eu-resident',
  'ex-yu-resident',
  'india-resident',
  'israel-resident',
];

export type PreliminaryHint =
  | { kind: 'verdict'; verdict: Verdict }
  /** No country-only rule applies: the funnel's later questions decide. */
  | { kind: 'continue' };

/**
 * Preliminary hint for two canonical country names, or null while either
 * name has no ISO mapping.
 */
export function preliminaryHint(
  citizenship: string,
  residence: string
): PreliminaryHint | null {
  const cit = countryCode(citizenship);
  const res = countryCode(residence);
  if (!cit || !res) return null;
  const verdict = evaluateEligibility({
    citizenship: cit,
    residence: res,
    // Neutral fillers: no local pension answer, under 60 months, waiting
    // period long over — so only the country rules (1, 2, 4, 5, 6) can fire.
    paysLocalPension: null,
    contributionMonths: 0,
    lastYear: 1900,
    lastMonth: 1,
  });
  if (COUNTRY_ONLY_CODES.indexOf(verdict.code) !== -1) {
    return { kind: 'verdict', verdict };
  }
  return { kind: 'continue' };
}
