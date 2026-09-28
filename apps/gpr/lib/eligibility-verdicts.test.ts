import { describe, expect, it } from 'vitest';
import {
  VERDICT_ORDER,
  evaluateEligibility,
  localPensionHint,
  needsLocalPensionQuestion,
  type EligibilityInput,
} from './eligibility-verdicts';

const NOW = new Date(2026, 8, 28);

function input(over: Partial<EligibilityInput>): EligibilityInput {
  return {
    citizenship: 'NG',
    residence: 'NG',
    lastYear: 2023,
    lastMonth: 6,
    contributionMonths: 30,
    paysLocalPension: null,
    now: NOW,
    ...over,
  };
}

describe('the nine verdicts in evaluation order', () => {
  it('lists nine codes', () => {
    expect(VERDICT_ORDER).toEqual([
      'eu-citizen',
      'eu-resident',
      'local-pension',
      'ex-yu-resident',
      'india-resident',
      'israel-resident',
      'sixty-months',
      'waiting-period',
      'eligible',
    ]);
  });

  it('1 eu-citizen: EU, EEA, CH and UK passports block regardless of residence', () => {
    ['FR', 'NO', 'CH', 'GB'].forEach((cit) => {
      const v = evaluateEligibility(
        input({ citizenship: cit, residence: 'US' })
      );
      expect(v.code).toBe('eu-citizen');
      expect(v.status).toBe('no');
      expect(v.title).toBe('Not eligible for a refund');
    });
  });

  it('2 eu-resident: living in the EU or the UK blocks', () => {
    expect(evaluateEligibility(input({ residence: 'DE' })).code).toBe(
      'eu-resident'
    );
    expect(evaluateEligibility(input({ residence: 'GB' })).title).toBe(
      'Not eligible while living in the EU or UK'
    );
    // EEA / CH residence is not on the list
    expect(evaluateEligibility(input({ residence: 'NO' })).code).toBe(
      'eligible'
    );
  });

  it('3 local-pension: TR / ex-YU residence + paying local state pension', () => {
    const v = evaluateEligibility(
      input({ residence: 'TR', citizenship: 'TR', paysLocalPension: 'yes' })
    );
    expect(v.code).toBe('local-pension');
    const no = evaluateEligibility(
      input({ residence: 'TR', citizenship: 'TR', paysLocalPension: 'no' })
    );
    expect(no.code).toBe('eligible');
    // XK residence: question asked, Trust/KPST hint
    expect(needsLocalPensionQuestion('XK')).toBe(true);
    expect(localPensionHint('XK')).toContain('Trust/KPST');
    expect(needsLocalPensionQuestion('US')).toBe(false);
  });

  it('4 ex-yu-resident: BA/XK/ME/RS citizens in any of the four states (not MK)', () => {
    const v = evaluateEligibility(
      input({ citizenship: 'RS', residence: 'BA', paysLocalPension: 'no' })
    );
    expect(v.code).toBe('ex-yu-resident');
    const mk = evaluateEligibility(
      input({ citizenship: 'MK', residence: 'MK', paysLocalPension: 'no' })
    );
    expect(mk.code).toBe('eligible');
    const rsInMk = evaluateEligibility(
      input({ citizenship: 'RS', residence: 'MK', paysLocalPension: 'no' })
    );
    expect(rsInMk.code).toBe('eligible');
  });

  it('5 india-resident: non-Indian citizens living in India', () => {
    expect(
      evaluateEligibility(input({ citizenship: 'NG', residence: 'IN' })).code
    ).toBe('india-resident');
    expect(
      evaluateEligibility(input({ citizenship: 'IN', residence: 'IN' })).code
    ).toBe('eligible');
  });

  it('6 israel-resident: Israeli citizens living in Israel', () => {
    expect(
      evaluateEligibility(input({ citizenship: 'IL', residence: 'IL' })).code
    ).toBe('israel-resident');
    expect(
      evaluateEligibility(input({ citizenship: 'IL', residence: 'US' })).code
    ).toBe('eligible');
  });

  it('7 sixty-months: contracting states at 60+, Japan only in Japan', () => {
    const us = evaluateEligibility(
      input({ citizenship: 'US', residence: 'US', contributionMonths: 60 })
    );
    expect(us.code).toBe('sixty-months');
    expect(us.body).not.toContain('Japan');
    const us59 = evaluateEligibility(
      input({ citizenship: 'US', residence: 'US', contributionMonths: 59 })
    );
    expect(us59.code).toBe('eligible');
    const jpHome = evaluateEligibility(
      input({ citizenship: 'JP', residence: 'JP', contributionMonths: 60 })
    );
    expect(jpHome.code).toBe('sixty-months');
    expect(jpHome.body).toContain('applies while you live in Japan');
    const jpAbroad = evaluateEligibility(
      input({ citizenship: 'JP', residence: 'US', contributionMonths: 60 })
    );
    expect(jpAbroad.code).toBe('eligible');
    // Turkish / Chinese citizens: no month limit
    expect(
      evaluateEligibility(
        input({ citizenship: 'CN', residence: 'CN', contributionMonths: 200 })
      ).code
    ).toBe('eligible');
  });

  it('8 waiting-period: fewer than 24 months since the last contribution', () => {
    const v = evaluateEligibility(input({ lastYear: 2025, lastMonth: 3 }));
    expect(v.code).toBe('waiting-period');
    expect(v.status).toBe('warn');
    expect(v.eligibleSoon).toBe(true);
    expect(v.canApplyFrom).toEqual({
      year: 2027,
      month: 4,
      label: 'April 2027',
    });
    expect(v.body).toContain('in your case from April 2027');
  });

  it('9 eligible', () => {
    const v = evaluateEligibility(input({}));
    expect(v.code).toBe('eligible');
    expect(v.status).toBe('ok');
    expect(v.months).toBe(30);
    expect(v.title).toBe('Good news — you appear to be eligible for a refund!');
  });

  it('earlier rules win over later ones', () => {
    // EU citizen with 100 months in India: rule 1, not 5 or 7
    expect(
      evaluateEligibility(
        input({ citizenship: 'FR', residence: 'IN', contributionMonths: 100 })
      ).code
    ).toBe('eu-citizen');
    // Indian citizen, 60 months, still in the waiting period: rule 7 before 8
    expect(
      evaluateEligibility(
        input({
          citizenship: 'IN',
          residence: 'AE',
          contributionMonths: 60,
          lastYear: 2026,
          lastMonth: 1,
        })
      ).code
    ).toBe('sixty-months');
  });
});
