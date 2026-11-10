import { describe, expect, it } from 'vitest';
import {
  countryBlock,
  decide,
  formatMonth,
  isComplete,
  reasonLine,
  visibleQuestions,
  type EligibilityAnswers,
  type GermanMonthsAnswer,
  type LocalPensionAnswer,
} from './eligibility-rules';

/** Brief § 9: today = 10 Nov 2026. */
const NOW = new Date(2026, 10, 10);

function ym(s: string) {
  const [m, y] = s.split('/').map(Number);
  return { year: y, month: m };
}

interface Case {
  n: number;
  cit: string;
  res: string;
  l: string;
  p?: LocalPensionAnswer;
  pEnd?: string;
  m?: GermanMonthsAnswer;
  /** expected: is question M asked? */
  mAsked: boolean;
  /** expected: is question P asked? */
  pAsked: boolean;
  result: 'PROCEED' | 'PROCEED_FROM_DATE' | 'NOT_NOW';
  reason?: string;
  fileFrom?: string;
  fromLocal?: boolean;
}

// Section 9 acceptance cases. "C1 / C2" → cit "BR/IT".
const CASES: Case[] = [
  {
    n: 1,
    cit: 'US',
    res: 'US',
    l: '03/2024',
    m: 'lt60',
    mAsked: true,
    pAsked: false,
    result: 'PROCEED',
    fileFrom: 'April 2026',
  },
  {
    n: 2,
    cit: 'US',
    res: 'US',
    l: '03/2025',
    m: 'lt60',
    mAsked: true,
    pAsked: false,
    result: 'PROCEED_FROM_DATE',
    fileFrom: 'April 2027',
  },
  {
    n: 3,
    cit: 'US',
    res: 'US',
    l: '03/2024',
    m: '60plus',
    mAsked: true,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'sixty-months',
  },
  {
    n: 4,
    cit: 'CN',
    res: 'CN',
    l: '06/2020',
    mAsked: false,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 5,
    cit: 'TR',
    res: 'TR',
    l: '03/2024',
    p: 'no',
    mAsked: false,
    pAsked: true,
    result: 'PROCEED',
  },
  {
    n: 6,
    cit: 'TR',
    res: 'TR',
    l: '03/2024',
    p: 'yes-currently',
    mAsked: false,
    pAsked: true,
    result: 'NOT_NOW',
    reason: 'local-insurance',
  },
  {
    n: 7,
    cit: 'TR',
    res: 'TR',
    l: '03/2024',
    p: 'not-any-more',
    pEnd: '06/2025',
    mAsked: false,
    pAsked: true,
    result: 'PROCEED_FROM_DATE',
    fileFrom: 'July 2027',
    fromLocal: true,
  },
  {
    n: 8,
    cit: 'PK',
    res: 'TR',
    l: '03/2024',
    p: 'no',
    mAsked: false,
    pAsked: true,
    result: 'PROCEED',
  },
  {
    n: 9,
    cit: 'PK',
    res: 'RS',
    l: '03/2024',
    p: 'yes-currently',
    mAsked: false,
    pAsked: true,
    result: 'NOT_NOW',
    reason: 'local-insurance',
  },
  {
    n: 10,
    cit: 'RS',
    res: 'RS',
    l: '03/2024',
    p: 'no',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'residence-exyu',
  },
  {
    n: 11,
    cit: 'RS',
    res: 'AE',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 12,
    cit: 'RS',
    res: 'AT',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'residence-eu-uk',
  },
  {
    n: 13,
    cit: 'MK',
    res: 'MK',
    l: '03/2024',
    p: 'no',
    m: 'lt60',
    mAsked: true,
    pAsked: true,
    result: 'PROCEED',
  },
  {
    n: 14,
    cit: 'MK',
    res: 'MK',
    l: '03/2024',
    p: 'no',
    m: '60plus',
    mAsked: true,
    pAsked: true,
    result: 'NOT_NOW',
    reason: 'sixty-months',
  },
  {
    n: 15,
    cit: 'IN',
    res: 'IN',
    l: '03/2024',
    m: 'lt60',
    mAsked: true,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 16,
    cit: 'PK',
    res: 'IN',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'residence-india',
  },
  {
    n: 17,
    cit: 'IL',
    res: 'IL',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'residence-israel',
  },
  {
    n: 18,
    cit: 'IL',
    res: 'US',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 19,
    cit: 'JP',
    res: 'JP',
    l: '03/2024',
    m: '60plus',
    mAsked: true,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'sixty-months',
  },
  {
    n: 20,
    cit: 'JP',
    res: 'SG',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 21,
    cit: 'BR/IT',
    res: 'BR',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'citizenship',
  },
  {
    n: 22,
    cit: 'FR',
    res: 'FR',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'citizenship',
  },
  {
    n: 23,
    cit: 'GB',
    res: 'AE',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'citizenship',
  },
  {
    n: 24,
    cit: 'AU',
    res: 'CH',
    l: '03/2024',
    m: 'lt60',
    mAsked: true,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 25,
    cit: 'NG',
    res: 'NO',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 26,
    cit: 'XK',
    res: 'XK',
    l: '03/2024',
    p: 'no',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'residence-exyu',
  },
  {
    n: 27,
    cit: 'CA',
    res: 'MX',
    l: '11/2025',
    m: 'lt60',
    mAsked: true,
    pAsked: false,
    result: 'PROCEED_FROM_DATE',
    fileFrom: 'December 2027',
  },
  {
    n: 28,
    cit: 'US/CA',
    res: 'US',
    l: '03/2024',
    m: '60plus',
    mAsked: true,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'sixty-months',
  },
  {
    n: 29,
    cit: 'AR/UY',
    res: 'AR',
    l: '03/2024',
    m: 'lt60',
    mAsked: true,
    pAsked: false,
    result: 'PROCEED',
  },
  {
    n: 30,
    cit: 'VN',
    res: 'DE',
    l: '03/2024',
    mAsked: false,
    pAsked: false,
    result: 'NOT_NOW',
    reason: 'residence-eu-uk',
  },
];

function answersFor(c: Case): EligibilityAnswers {
  const [c1, c2] = c.cit.split('/');
  const a: EligibilityAnswers = {
    citizenship: c1,
    secondCitizenship: c2 || null,
    residence: c.res,
  };
  // Questions are only answered when the flow shows them.
  if (countryBlock(a)) return a;
  a.lastContribution = ym(c.l);
  if (visibleQuestions(a).localPension) a.localPension = c.p ?? null;
  if (a.localPension === 'not-any-more' && c.pEnd) {
    a.localPensionEnd = ym(c.pEnd);
  }
  if (visibleQuestions(a).germanMonths) a.germanMonths = c.m ?? null;
  return a;
}

describe('GPR-ELIG-2026-11-10 acceptance cases (brief § 9)', () => {
  for (const c of CASES) {
    it(`#${c.n} ${c.cit} in ${c.res} → ${c.result}${c.reason ? ' ' + c.reason : ''}`, () => {
      const a = answersFor(c);
      const blockedAtStep1 = countryBlock(a) !== null;
      const v = visibleQuestions(a);
      // P and M are asked only where the brief says so.
      expect(!blockedAtStep1 && v.localPension).toBe(c.pAsked);
      expect(!blockedAtStep1 && v.germanMonths).toBe(c.mAsked);
      expect(isComplete(a)).toBe(true);
      const d = decide(a, NOW);
      expect(d.result).toBe(c.result);
      expect(d.blockReason).toBe(c.reason ?? null);
      if (c.fileFrom) expect(formatMonth(d.fileFrom!)).toBe(c.fileFrom);
      expect(d.effectiveFromLocal).toBe(!!c.fromLocal);
    });
  }
});

describe('question visibility', () => {
  it('asks no 60-month question for non-SIXTY citizens', () => {
    expect(
      visibleQuestions({ citizenship: 'CN', residence: 'CN' }).germanMonths
    ).toBe(false);
  });

  it('a second citizenship in SIXTY turns the 60-month question on', () => {
    expect(
      visibleQuestions({
        citizenship: 'AR',
        secondCitizenship: 'UY',
        residence: 'AR',
      }).germanMonths
    ).toBe(true);
  });

  it('a blocking second citizenship blocks (Step A re-run)', () => {
    expect(
      countryBlock({
        citizenship: 'BR',
        secondCitizenship: 'IT',
        residence: 'BR',
      })
    ).toBe('citizenship');
  });

  it('hides M once P = "Yes — currently" blocks', () => {
    const v = visibleQuestions({
      citizenship: 'MK',
      residence: 'MK',
      localPension: 'yes-currently',
    });
    expect(v.germanMonths).toBe(false);
  });

  it('asks the end month only for "Not any more"', () => {
    expect(
      visibleQuestions({
        citizenship: 'TR',
        residence: 'TR',
        localPension: 'not-any-more',
      }).localPensionEnd
    ).toBe(true);
  });

  it('an earlier local end month does not move L_eff', () => {
    const d = decide(
      {
        citizenship: 'TR',
        residence: 'TR',
        lastContribution: { year: 2025, month: 3 },
        localPension: 'not-any-more',
        localPensionEnd: { year: 2020, month: 1 },
      },
      NOW
    );
    expect(d.effectiveFromLocal).toBe(false);
    expect(formatMonth(d.fileFrom!)).toBe('April 2027');
  });

  it('the filing month itself counts as reached', () => {
    // 10/2024 + 25 → November 2026 = this month → PROCEED
    const d = decide(
      {
        citizenship: 'CN',
        residence: 'CN',
        lastContribution: { year: 2024, month: 10 },
      },
      NOW
    );
    expect(d.result).toBe('PROCEED');
  });
});

describe('reason lines', () => {
  const name = (c: string) =>
    ({ US: 'United States', TR: 'Türkiye', JP: 'Japan' })[c] ?? c;
  it('names the 60-month citizenship', () => {
    expect(
      reasonLine('sixty-months', { residence: 'US', sixtyCountry: 'US' }, name)
    ).toBe(
      'With 60 or more German contribution months, citizens of United States keep their German pension entitlement for retirement age; we do not file contribution refunds in this case.'
    );
  });
  it('names the residence for local insurance', () => {
    expect(
      reasonLine(
        'local-insurance',
        { residence: 'TR', sixtyCountry: null },
        name
      )
    ).toContain('state pension system of Türkiye.');
  });
});
