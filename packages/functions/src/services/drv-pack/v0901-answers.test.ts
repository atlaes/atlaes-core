import { describe, expect, it } from 'vitest';
import {
  applyV0901Answers,
  sanitizeV0901Overrides,
  v0901AnswersSchema,
  v0901AnswerViews,
} from './v0901-answers';
import { v0901DefaultsFor } from './pack';
import { sampleClient } from './fixtures';
import { resolveCarrier } from './resolve-carrier';

describe('V0901 answer overrides', () => {
  it('stores only deviations from the defaults; null resets', () => {
    const a = applyV0901Answers(null, {
      foreignContributions: true,
      insuranceRecordIssued: true, // equals the default → not stored
    });
    expect(a).toEqual({ foreignContributions: true });
    const b = applyV0901Answers(a, { germanBenefitsReceived: true });
    expect(b).toEqual({
      foreignContributions: true,
      germanBenefitsReceived: true,
    });
    expect(
      applyV0901Answers(b, {
        foreignContributions: null,
        germanBenefitsReceived: null,
      })
    ).toBeNull();
  });

  it('accepts only the editable questions with boolean or null', () => {
    const ok = (body: unknown) => v0901AnswersSchema.safeParse(body).success;
    expect(ok({ foreignContributions: true })).toBe(true);
    expect(ok({ foreignContributions: null })).toBe(true);
    expect(ok({ foreignContributions: 'ja' })).toBe(false);
    // 7 (divorce) is not one of the editable questions.
    expect(ok({ divorceProceedings: true })).toBe(false);
  });

  it('views show default, override and the effective answer', () => {
    const views = v0901AnswerViews({ currentlyInsuredAbroad: true });
    const q63 = views.find((v) => v.key === 'currentlyInsuredAbroad')!;
    expect(q63).toMatchObject({
      number: '6.3',
      defaultValue: false,
      override: true,
      effective: true,
    });
    expect(views.map((v) => v.number)).toEqual([
      '5.1',
      '5.1',
      '6.1',
      '6.3',
      '8.1',
    ]);
  });

  it('sanitize drops unknown keys and non-booleans', () => {
    expect(
      sanitizeV0901Overrides({
        foreignContributions: true,
        divorceProceedings: true,
        foo: 1,
        germanBenefitsReceived: 'ja',
      })
    ).toEqual({ foreignContributions: true });
    expect(sanitizeV0901Overrides(null)).toBeUndefined();
  });

  it('the pack uses the case overrides; explicit pack defaults win', () => {
    const resolution = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: sampleClient.vsnr,
      citizenship: 'IN',
      residence: 'IN',
    });
    const base = {
      aktenzeichen: '06152-26',
      date: new Date(2026, 9, 20),
      resolution,
      client: {
        ...sampleClient,
        v0901Answers: { foreignContributions: true },
      },
    };
    expect(v0901DefaultsFor(base)).toEqual({ foreignContributions: true });
    expect(
      v0901DefaultsFor({
        ...base,
        v0901Defaults: { foreignContributions: false },
      })
    ).toEqual({ foreignContributions: false });
  });
});
