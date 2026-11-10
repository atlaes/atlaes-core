/**
 * Eligibility flow rules for `/check/3-step` — rule set
 * `GPR-ELIG-2026-11-10` (Johannes, "GPR — Eligibility flow: rule set for
 * Karl", v1.2, 10 Nov 2026). It replaces the old Wix widget port
 * (`evaluate()` / eligibility-verdicts); where they differ, the brief wins.
 *
 * Principle: ask a question only when its answer can change the result.
 * Every result is a filing decision of Germany Pension Refund, never a
 * statement about the visitor's rights — the copy never says "eligible".
 *
 * Decision procedure (brief § 3), in this order:
 *   A  blocking tests (first match → NOT_NOW, nothing else asked)
 *   B  clock anchor L_eff (later local contributions move it)
 *   C  60-month rule (question M only when it applies)
 *   D  waiting period: file_from = 1st of the 25th month after L_eff
 *
 * Pure functions, no UI. Country codes are ISO 3166-1 alpha-2, XK = Kosovo.
 */

export const RULE_SET_ID = 'GPR-ELIG-2026-11-10';

// § 2 country sets
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
/** Citizenship blocks: EU + EEA + Switzerland + UK. */
export const BLOCK_CIT: string[] = [...EU, ...EEA_EXTRA, CH, UK];
/** Residence blocks: EU + UK only (EEA and Switzerland do NOT block). */
export const BLOCK_RES: string[] = [...EU, UK];
/** 60-month rule worldwide. */
export const SIXTY: string[] = [
  'US',
  'IN',
  'CA',
  'AU',
  'BR',
  'KR',
  'PH',
  'AL',
  'MD',
  'MK',
  'UY',
];
/** 60-month rule only while living in Japan. */
export const JP = 'JP';
/** Blocked only while living in Israel. */
export const IL = 'IL';
/** Citizens of these four: blocked while living in any of the four. */
export const EXYU4: string[] = ['BA', 'XK', 'ME', 'RS'];
/** Residence here triggers question P (everyone, any citizenship). */
export const LOCAL_ASK: string[] = ['TR', 'BA', 'XK', 'ME', 'RS', 'MK'];

export type LocalPensionAnswer = 'no' | 'yes-currently' | 'not-any-more';
export type GermanMonthsAnswer = 'lt60' | '60plus';

export type BlockReason =
  | 'citizenship'
  | 'residence-eu-uk'
  | 'residence-india'
  | 'residence-israel'
  | 'residence-exyu'
  | 'local-insurance'
  | 'sixty-months';

export type EligibilityOutcome = 'PROCEED' | 'PROCEED_FROM_DATE' | 'NOT_NOW';

/** A calendar month; `month` is 1–12. */
export interface YearMonth {
  year: number;
  month: number;
}

export interface EligibilityAnswers {
  /** C1 */
  citizenship: string;
  /** C2 — optional second citizenship (step 2 link). */
  secondCitizenship?: string | null;
  /** R */
  residence: string;
  /** L — last month of mandatory German pension contributions. */
  lastContribution?: YearMonth | null;
  /** P — only when R ∈ LOCAL_ASK. */
  localPension?: LocalPensionAnswer | null;
  /** P → "Not any more": last month of those contributions. */
  localPensionEnd?: YearMonth | null;
  /** M — only when the 60-month rule applies. */
  germanMonths?: GermanMonthsAnswer | null;
}

export interface EligibilityDecision {
  result: EligibilityOutcome;
  blockReason: BlockReason | null;
  /** L_eff (null only when blocked before L was needed). */
  effectiveLast: YearMonth | null;
  /** True when L_eff came from the later local contributions (P). */
  effectiveFromLocal: boolean;
  /** First possible filing month (its 1st day); set when L_eff is known. */
  fileFrom: YearMonth | null;
  /** Whether question M applied. */
  sixtyApplies: boolean;
  /** The citizenship the 60-month reason names. */
  sixtyCountry: string | null;
}

export const MONTH_NAMES = [
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

function inSet(code: string | null | undefined, set: string[]): boolean {
  return !!code && set.indexOf(code) !== -1;
}

/** C1 and, if entered, C2 (deduplicated). */
export function citizenshipsOf(a: {
  citizenship: string;
  secondCitizenship?: string | null;
}): string[] {
  const out: string[] = [];
  if (a.citizenship) out.push(a.citizenship);
  if (a.secondCitizenship && a.secondCitizenship !== a.citizenship) {
    out.push(a.secondCitizenship);
  }
  return out;
}

export function monthIndex(ym: YearMonth): number {
  return ym.year * 12 + (ym.month - 1);
}

export function fromMonthIndex(idx: number): YearMonth {
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** "April 2027" */
export function formatMonth(ym: YearMonth): string {
  return MONTH_NAMES[ym.month - 1] + ' ' + ym.year;
}

/** "2027-04" */
export function toMonthString(ym: YearMonth): string {
  return ym.year + '-' + (ym.month < 10 ? '0' : '') + ym.month;
}

/** "2027-04-01" — the 1st day of the month. */
export function toFirstDayIso(ym: YearMonth): string {
  return toMonthString(ym) + '-01';
}

export function currentMonth(now: Date = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Question P is asked for every resident of TR / ex-YU (any citizenship). */
export function asksLocalPension(residence: string): boolean {
  return inSet(residence, LOCAL_ASK);
}

/** Step C: any citizenship ∈ SIXTY, or citizenship JP while living in JP. */
export function sixtyMonthsApplies(a: {
  citizenship: string;
  secondCitizenship?: string | null;
  residence: string;
}): boolean {
  return sixtyCountryOf(a) !== null;
}

function sixtyCountryOf(a: {
  citizenship: string;
  secondCitizenship?: string | null;
  residence: string;
}): string | null {
  const cits = citizenshipsOf(a);
  for (const c of cits) if (inSet(c, SIXTY)) return c;
  if (cits.indexOf(JP) !== -1 && a.residence === JP) return JP;
  return null;
}

/**
 * Step A1–A5: the tests that read only the countries. Used after step 1
 * (blocked → straight to the result, nothing else asked) and again after a
 * second citizenship is entered on step 2.
 */
export function countryBlock(a: {
  citizenship: string;
  secondCitizenship?: string | null;
  residence: string;
}): BlockReason | null {
  const cits = citizenshipsOf(a);
  const r = a.residence;
  if (cits.some((c) => inSet(c, BLOCK_CIT))) return 'citizenship'; // A1
  if (inSet(r, BLOCK_RES)) return 'residence-eu-uk'; // A2
  if (r === 'IN' && cits.indexOf('IN') === -1) return 'residence-india'; // A3
  if (r === IL && cits.indexOf(IL) !== -1) return 'residence-israel'; // A4
  if (inSet(r, EXYU4) && cits.some((c) => inSet(c, EXYU4))) {
    return 'residence-exyu'; // A5
  }
  return null;
}

/** Step A complete (A1–A6). */
export function blockReasonOf(a: EligibilityAnswers): BlockReason | null {
  const byCountry = countryBlock(a);
  if (byCountry) return byCountry;
  if (asksLocalPension(a.residence) && a.localPension === 'yes-currently') {
    return 'local-insurance'; // A6
  }
  return null;
}

/** Step B. */
export function effectiveLastMonth(a: EligibilityAnswers): {
  month: YearMonth | null;
  fromLocal: boolean;
} {
  const l = a.lastContribution || null;
  if (!l) return { month: null, fromLocal: false };
  if (
    asksLocalPension(a.residence) &&
    a.localPension === 'not-any-more' &&
    a.localPensionEnd &&
    monthIndex(a.localPensionEnd) > monthIndex(l)
  ) {
    return { month: a.localPensionEnd, fromLocal: true };
  }
  return { month: l, fromLocal: false };
}

/** Step D: the 1st of the 25th calendar month after L_eff. */
export function fileFromFor(lEff: YearMonth): YearMonth {
  return fromMonthIndex(monthIndex(lEff) + 25);
}

/** Which step-2 questions are visible for the current answers. */
export function visibleQuestions(a: EligibilityAnswers): {
  localPension: boolean;
  localPensionEnd: boolean;
  germanMonths: boolean;
} {
  const blocked = blockReasonOf(a) !== null;
  const p = asksLocalPension(a.residence) && countryBlock(a) === null;
  return {
    localPension: p,
    localPensionEnd: p && a.localPension === 'not-any-more',
    germanMonths: !blocked && sixtyMonthsApplies(a),
  };
}

/**
 * True when the answers are enough to decide (every visible question is
 * answered). A country block decides on its own.
 */
export function isComplete(a: EligibilityAnswers): boolean {
  if (countryBlock(a)) return true;
  const v = visibleQuestions(a);
  if (v.localPension && !a.localPension) return false;
  if (a.localPension === 'yes-currently' && v.localPension) return true;
  if (!a.lastContribution) return false;
  if (v.localPensionEnd && !a.localPensionEnd) return false;
  if (v.germanMonths && !a.germanMonths) return false;
  return true;
}

/** Steps A–D. Call only when `isComplete(a)`. */
export function decide(
  a: EligibilityAnswers,
  now: Date = new Date()
): EligibilityDecision {
  const sixtyCountry = sixtyCountryOf(a);
  const base = {
    sixtyApplies: sixtyCountry !== null,
    sixtyCountry,
  };
  const eff = effectiveLastMonth(a);
  const fileFrom = eff.month ? fileFromFor(eff.month) : null;
  const block = blockReasonOf(a);
  if (block) {
    return {
      ...base,
      result: 'NOT_NOW',
      blockReason: block,
      effectiveLast: eff.month,
      effectiveFromLocal: eff.fromLocal,
      fileFrom,
    };
  }
  if (sixtyCountry && a.germanMonths === '60plus') {
    return {
      ...base,
      result: 'NOT_NOW',
      blockReason: 'sixty-months',
      effectiveLast: eff.month,
      effectiveFromLocal: eff.fromLocal,
      fileFrom,
    };
  }
  if (!fileFrom) {
    throw new Error('decide(): last contribution month missing');
  }
  const due = monthIndex(currentMonth(now)) >= monthIndex(fileFrom);
  return {
    ...base,
    result: due ? 'PROCEED' : 'PROCEED_FROM_DATE',
    blockReason: null,
    effectiveLast: eff.month,
    effectiveFromLocal: eff.fromLocal,
    fileFrom,
  };
}

// § 4 result copy (exact wording)

export const RESULT_COPY = {
  proceed: {
    title: 'Proceed to your refund claim',
    body: 'Based on your answers, your case fits our standard filing criteria. Create your account to continue — we review every case individually before anything is filed.',
    button: 'Create my account',
  },
  proceedFromDate: {
    title: (m: string) => `Proceed to your refund claim — filing from ${m}`,
    intro: (m: string) =>
      `A refund application can be filed 24 full calendar months after your last mandatory contribution — in your case from ${m}.`,
    laterContributions: (r: string) =>
      `Your later contributions in ${r} count for this date.`,
    outro:
      'You can create your account now — we prepare everything, file on the first possible date, and about two months before, we confirm with you that nothing has changed. Or let us remind you when the date is near.',
    primary: 'Create my account now',
    secondary: 'Remind me, no account yet',
    optIn: (m: string) => `Email me about two months before ${m}`,
    send: 'Send',
    done: (m: string) => `Done — we write to you about two months before ${m}.`,
  },
  notNow: {
    title: 'This claim can currently not be filed with Germany Pension Refund',
    closing: 'Think your situation is different? Ask us for a free review.',
    reviewDone:
      'Thank you — your details are on their way to our team. We reply personally by email.',
  },
} as const;

/** The NOT_NOW reason line. `countryName` resolves ISO codes for display. */
export function reasonLine(
  reason: BlockReason,
  d: { residence: string; sixtyCountry: string | null },
  countryName: (code: string) => string
): string {
  switch (reason) {
    case 'citizenship':
      return 'We file contribution refunds only for applicants who hold no German, EU, EEA, Swiss or UK citizenship.';
    case 'residence-eu-uk':
      return 'We file contribution refunds only for applicants living outside the EU and the United Kingdom.';
    case 'residence-india':
      return 'For applicants living in India, we file only for Indian citizens.';
    case 'residence-israel':
      return 'For Israeli citizens, we do not file while they live in Israel.';
    case 'residence-exyu':
      return 'For citizens of Bosnia and Herzegovina, Kosovo, Montenegro and Serbia, we do not file while they live in one of these four countries.';
    case 'local-insurance':
      return `We do not file while you pay into the state pension system of ${countryName(d.residence)}. The 24-month period starts when those contributions end — check again then.`;
    case 'sixty-months':
      return `With 60 or more German contribution months, citizens of ${countryName(d.sixtyCountry || '')} keep their German pension entitlement for retirement age; we do not file contribution refunds in this case.`;
  }
}

// § 1 question copy

export const QUESTION_COPY = {
  citizenship: 'Citizenship',
  residence: 'Country of residence',
  secondCitizenshipLink: '+ I hold a second citizenship',
  secondCitizenship: 'Second citizenship',
  secondCitizenshipHint: 'Every citizenship you hold counts.',
  lastContribution: 'Last month of mandatory German pension contributions',
  lastContributionHint:
    'Employment, Arbeitslosengeld I or a child-raising period — whichever ended last.',
  localPension: (r: string) =>
    `Do you pay into the state pension system of ${r}?`,
  localPensionOptions: [
    {
      value: 'no' as const,
      label: 'No — I have not paid into it since my time in Germany',
    },
    { value: 'yes-currently' as const, label: 'Yes — currently' },
    { value: 'not-any-more' as const, label: 'Not any more' },
  ],
  localPensionEnd: 'Last month of those contributions',
  localPensionHintXK:
    "Kosovo's individual pension fund (Trust/KPST) does not count — answer No if that is your only contribution.",
  germanMonths: 'How many months of German pension contributions do you have?',
  germanMonthsOptions: [
    { value: 'lt60' as const, label: 'Fewer than 60 months (under 5 years)' },
    {
      value: '60plus' as const,
      label: '60 months or more (5 years or more)',
    },
  ],
  germanMonthsHint:
    'Any month with at least one insured day counts; months with Arbeitslosengeld I and child-raising months count too.',
  attestation: 'I hold no German, EU, EEA, Swiss or UK citizenship.',
} as const;
