/**
 * Step states of the office finder's visual "route" through its six rules
 * (KBS → DRV Bund → citizenship liaison → residence liaison → regional
 * carrier → no match), in the order of `office-routing.ts`. Pure; the
 * routing itself stays in `findOffice` / `resolveWithoutNumber`.
 */
import { LIAISON_BY_COUNTRY } from '@/content/offices';
import {
  MSG_IMPLAUSIBLE,
  prefixCarrier,
  prefixPlausible,
  type LastOffice,
  type OfficeFinderResult,
} from './office-routing';

export const ROUTE_STEP_COUNT = 6;

/** idle = not reached yet, passed = rule does not apply, match = stops here, skipped = not checked (no-number path). */
export type RouteState = 'idle' | 'passed' | 'match' | 'skipped';

export interface RouteInput {
  lastOffice: '' | LastOffice;
  citizenship: string;
  residence: string;
  prefix: number | null;
}

type Check = 'match' | 'passed' | 'unknown';

/**
 * Live preview while the form is filled: walk the rules in order and stop
 * at the first one that matches or still lacks an answer.
 */
export function previewRoute(input: RouteInput): RouteState[] {
  const lo = input.lastOffice;
  const n = input.prefix === null ? NaN : Number(input.prefix);
  const pc = lo === 'UNKNOWN' && prefixPlausible(n) ? prefixCarrier(n) : null;
  const prefixReady = lo !== 'UNKNOWN' || prefixPlausible(n);

  const checks: Array<() => Check> = [
    () => {
      if (!lo || !prefixReady) return 'unknown';
      return lo === 'KBS' || pc === 'KBS' ? 'match' : 'passed';
    },
    () => (lo === 'BUND' || pc === 'BUND' ? 'match' : 'passed'),
    () => {
      if (!input.citizenship) return 'unknown';
      return LIAISON_BY_COUNTRY[input.citizenship] ? 'match' : 'passed';
    },
    () => {
      if (!input.residence) return 'unknown';
      return LIAISON_BY_COUNTRY[input.residence] ? 'match' : 'passed';
    },
    () => {
      const regional = lo === 'UNKNOWN' ? pc : lo;
      return regional ? 'match' : 'passed';
    },
    () => 'match',
  ];

  const states: RouteState[] = [];
  let stopped = false;
  for (let i = 0; i < checks.length; i++) {
    if (stopped) {
      states.push('idle');
      continue;
    }
    const c = checks[i]();
    if (c === 'unknown') {
      states.push('idle');
      stopped = true;
    } else {
      states.push(c);
      if (c === 'match') stopped = true;
    }
  }
  return states;
}

/** Index of the rule that produced a result, or null (errors, implausible prefix). */
export function resultStep(
  input: RouteInput,
  result: OfficeFinderResult
): number | null {
  if (result.kind === 'error') return null;
  if (result.kind === 'no-match') {
    return result.message === MSG_IMPLAUSIBLE ? null : 5;
  }
  if (result.carrier === 'KBS') return 0;
  if (result.carrier === 'BUND') return 1;
  if (LIAISON_BY_COUNTRY[input.citizenship] === result.carrier) return 2;
  if (
    !LIAISON_BY_COUNTRY[input.citizenship] &&
    LIAISON_BY_COUNTRY[input.residence] === result.carrier
  ) {
    return 3;
  }
  return 4;
}

/** Final route for a shown result. */
export function resultRoute(
  step: number | null,
  noNumber: boolean
): RouteState[] {
  const states: RouteState[] = [];
  for (let i = 0; i < ROUTE_STEP_COUNT; i++) {
    if (step === null) states.push('idle');
    else if (i === step) states.push('match');
    else if (i > step) states.push('idle');
    else if (noNumber && (i === 0 || i === 1 || i === 4))
      states.push('skipped');
    else states.push('passed');
  }
  return states;
}
