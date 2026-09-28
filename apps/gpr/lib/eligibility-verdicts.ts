/**
 * Eligibility verdicts of the combined refund widget
 * (`gpr-refund-widget.html`, step 1), ported so the funnel and the country
 * pages can reuse the same rule branches and verdict texts. Pure functions,
 * no UI. Copy is verbatim from the widget (no HTML; the "apply from" date
 * is also exposed as `canApplyFrom`).
 *
 * Evaluation order (`VERDICT_ORDER`, first match wins):
 *   1. eu-citizen       EU / EEA / CH / UK citizens (voluntary-contribution right)
 *   2. eu-resident      residence in the EU or the UK
 *   3. local-pension    residence in TR / ex-YU + paying mandatory local pension
 *   4. ex-yu-resident   BA/XK/ME/RS citizens living in any of those four states
 *   5. india-resident   non-Indian citizens living in India
 *   6. israel-resident  Israeli citizens living in Israel
 *   7. sixty-months     60+ German months for contracting-state citizens
 *                       (Japan only while living in Japan)
 *   8. waiting-period   fewer than 24 months since the last contribution
 *   9. eligible
 */

export const EU: string[] = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
];
export const EEA_EXTRA: string[] = ['IS', 'LI', 'NO'];
export const CH = 'CH';
export const UK = 'GB';
/** Citizens with the <60-month rule. */
export const CONTRACTING_60: string[] = [
  'US',
  'IN',
  'AU',
  'CA',
  'BR',
  'AL',
  'MD',
  'MK',
  'PH',
  'KR',
  'UY',
];
/** Ex-Yugoslav REGION (residence tests). */
export const EX_YU: string[] = ['BA', 'XK', 'ME', 'RS', 'MK'];
/** Citizens with the region-residence block (NOT North Macedonia). */
export const EX_YU_CIT: string[] = ['BA', 'XK', 'ME', 'RS'];
/** Residence that triggers the local-pension question. */
export const LOCAL_PENSION_ASK: string[] = ['TR', 'BA', 'XK', 'ME', 'RS', 'MK'];
export const JP = 'JP';
export const IL = 'IL';

export type VerdictStatus = 'no' | 'warn' | 'ok';

export type VerdictCode =
  | 'eu-citizen'
  | 'eu-resident'
  | 'local-pension'
  | 'ex-yu-resident'
  | 'india-resident'
  | 'israel-resident'
  | 'sixty-months'
  | 'waiting-period'
  | 'eligible';

export const VERDICT_ORDER: VerdictCode[] = [
  'eu-citizen',
  'eu-resident',
  'local-pension',
  'ex-yu-resident',
  'india-resident',
  'israel-resident',
  'sixty-months',
  'waiting-period',
  'eligible',
];

export interface EligibilityInput {
  /** ISO 3166-1 alpha-2 (XK = Kosovo). */
  citizenship: string;
  residence: string;
  /** Last month of German pension contributions. */
  lastYear: number;
  lastMonth: number;
  /** German contribution months (any month with one contribution day counts). */
  contributionMonths: number;
  /** Answer to the local-pension question when `needsLocalPensionQuestion`. */
  paysLocalPension?: 'yes' | 'no' | null;
  /** Injectable for tests. */
  now?: Date;
}

export interface Verdict {
  code: VerdictCode;
  status: VerdictStatus;
  title: string;
  body: string;
  /** First possible filing month (waiting-period verdict). */
  canApplyFrom?: { year: number; month: number; label: string };
  eligibleSoon?: boolean;
  months?: number;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function inGroup(code: string, group: string[]): boolean {
  return group.indexOf(code) !== -1;
}

export function isEUEEACH(code: string): boolean {
  return inGroup(code, EU) || inGroup(code, EEA_EXTRA) || code === CH;
}

export function needsLocalPensionQuestion(residence: string): boolean {
  return inGroup(residence, LOCAL_PENSION_ASK);
}

/** Hint under the local-pension question (Kosovo names the Trust/KPST). */
export function localPensionHint(residence: string): string {
  return residence === 'XK'
    ? 'This applies because you live in a former Yugoslav country. Note: Kosovo’s mandatory individual pension fund (Trust/KPST) does not count — answer No if that is your only pension contribution.'
    : 'This applies because you live in Türkiye or a former Yugoslav country.';
}

function mIndex(y: number, m: number): number {
  return y * 12 + (m - 1);
}

export function evaluateEligibility(input: EligibilityInput): Verdict {
  const cit = input.citizenship;
  const res = input.residence;
  const months = input.contributionMonths;
  const now = input.now || new Date();
  const nowIdx = mIndex(now.getFullYear(), now.getMonth() + 1);
  const endIdx = mIndex(input.lastYear, input.lastMonth);
  const waitedMonths = nowIdx - endIdx; // months since last work month
  const canApplyIdx = endIdx + 25; // first month after 24-month wait

  // 1. EU / EEA / CH / UK citizens: excluded (voluntary contribution right)
  if (isEUEEACH(cit) || cit === UK) {
    return {
      code: 'eu-citizen',
      status: 'no',
      title: 'Not eligible for a refund',
      body: 'As a citizen of the EU, EEA, Switzerland or the UK, you keep the right to contribute to the German pension system, so contribution refunds are not available. Your contributions are not lost — they count towards a German pension at retirement age. If your German record stays under five qualifying years, a refund becomes possible once you reach German retirement age.',
    };
  }
  // 2. EU / UK residents: excluded while living there
  if (inGroup(res, EU) || res === UK) {
    return {
      code: 'eu-resident',
      status: 'no',
      title: 'Not eligible while living in the EU or UK',
      body: 'While you live in the EU or the United Kingdom, a refund is not possible. If you move to an eligible country outside the EU/UK, you may qualify — check again after moving.',
    };
  }
  // 3. Residence in Turkey / former Yugoslav states + mandatory local pension
  if (inGroup(res, LOCAL_PENSION_ASK) && input.paysLocalPension === 'yes') {
    return {
      code: 'local-pension',
      status: 'no',
      title: 'Not eligible while paying local state pension contributions',
      body: 'Because you currently pay mandatory contributions into the state pension system where you live, a German refund is not possible. Your 24-month waiting period starts once those contributions end.',
    };
  }
  // 4. Ex-Yugoslav citizens (BA/XK/ME/RS) living in any of those four states
  if (inGroup(cit, EX_YU_CIT) && inGroup(res, EX_YU_CIT)) {
    return {
      code: 'ex-yu-resident',
      status: 'no',
      title:
        'Not eligible while living in Bosnia and Herzegovina, Kosovo, Montenegro or Serbia',
      body: 'Citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia cannot claim a refund before retirement age while living in any of those four countries. If you move to an eligible country, the refund opens up.',
    };
  }
  // 5. India residence: non-Indian citizens are blocked (treated like EU residence)
  if (res === 'IN' && cit !== 'IN') {
    return {
      code: 'india-resident',
      status: 'no',
      title: 'Not eligible while living in India',
      body: 'Under the German-Indian social security agreement, citizens of other countries living in India keep the right to pay voluntary German pension contributions — as if India were part of the EU — which blocks a refund. If you move to another eligible country, you may qualify. Indian citizens themselves are not affected by this rule.',
    };
  }
  // 6. Israeli citizens living in Israel
  if (cit === IL && res === IL) {
    return {
      code: 'israel-resident',
      status: 'no',
      title: 'Not eligible while living in Israel',
      body: 'Israeli citizens cannot claim a refund before retirement age while living in Israel. If you move to another eligible country, you may qualify.',
    };
  }
  // 7. 60-month restriction (contracting states; Japan only while living in Japan)
  const sixtyApplies =
    inGroup(cit, CONTRACTING_60) || (cit === JP && res === JP);
  if (sixtyApplies && months >= 60) {
    return {
      code: 'sixty-months',
      status: 'no',
      title: 'Not eligible before retirement age (60+ months of contributions)',
      body:
        'With 60 or more months of German pension contributions, citizens of your country cannot claim a refund before retirement age. Instead, you will be entitled to a German pension — a refund of your own contributions can become possible at retirement age if no pension entitlement exists.' +
        (cit === JP
          ? ' Note: this restriction applies while you live in Japan.'
          : ''),
    };
  }
  // 8. 24-month waiting period
  if (waitedMonths < 24) {
    const y = Math.floor(canApplyIdx / 12);
    const m = (canApplyIdx % 12) + 1;
    const label = MONTHS[m - 1] + ' ' + y;
    return {
      code: 'waiting-period',
      status: 'warn',
      title: 'Not eligible yet — but you can start now',
      body: `You appear to meet the requirements — a refund can only be filed 24 months after your last German pension contribution; in your case from ${label}. You don't have to wait to start: sign up now, we prepare everything so your claim is filed on the first possible date — and about two months before, we confirm with you that nothing has changed. One thing off your list.`,
      canApplyFrom: { year: y, month: m, label },
      months,
      eligibleSoon: true,
    };
  }
  // 9. Eligible
  return {
    code: 'eligible',
    status: 'ok',
    title: 'Good news — you appear to be eligible for a refund!',
    body: 'You meet the general requirements for a German pension refund — estimate your amount below.',
    months,
  };
}
