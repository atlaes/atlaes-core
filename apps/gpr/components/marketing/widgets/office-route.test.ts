import { describe, expect, it } from 'vitest';
import { findOffice, resolveWithoutNumber } from './office-routing';
import {
  previewRoute,
  resultRoute,
  resultStep,
  type RouteInput,
} from './office-route';

const base: RouteInput = {
  lastOffice: '',
  citizenship: '',
  residence: '',
  prefix: null,
};

describe('previewRoute', () => {
  it('stays idle until the last office is known', () => {
    expect(previewRoute(base)).toEqual(Array(6).fill('idle'));
  });
  it('stops at KBS / Bund straight away', () => {
    expect(previewRoute({ ...base, lastOffice: 'KBS' })[0]).toBe('match');
    expect(previewRoute({ ...base, lastOffice: 'BUND' }).slice(0, 3)).toEqual([
      'passed',
      'match',
      'idle',
    ]);
  });
  it('lights up step by step as answers are given', () => {
    const lo = { ...base, lastOffice: 'NORD' as const };
    expect(previewRoute(lo).slice(0, 3)).toEqual(['passed', 'passed', 'idle']);
    const cit = { ...lo, citizenship: 'NG' };
    expect(previewRoute(cit).slice(0, 4)).toEqual([
      'passed',
      'passed',
      'passed',
      'idle',
    ]);
    expect(previewRoute({ ...cit, residence: 'AE' })).toEqual([
      'passed',
      'passed',
      'passed',
      'passed',
      'match',
      'idle',
    ]);
  });
  it('waits for a plausible prefix when the office is unknown', () => {
    const u = { ...base, lastOffice: 'UNKNOWN' as const };
    expect(previewRoute(u)[0]).toBe('idle');
    expect(previewRoute({ ...u, prefix: 99 })[0]).toBe('idle');
    expect(previewRoute({ ...u, prefix: 81 })[0]).toBe('match');
    expect(previewRoute({ ...u, prefix: 65 })[1]).toBe('match');
  });
});

describe('preview and result agree for complete answers', () => {
  const offices = ['KBS', 'BUND', 'NORD', 'BW', 'UNKNOWN'] as const;
  const countries = ['US', 'NG', 'IN', 'UA', 'AE', 'TR'];
  const prefixes = [13, 81, 65, 24, 28];
  it('matches findOffice for every combination', () => {
    for (const lastOffice of offices) {
      for (const citizenship of countries) {
        for (const residence of countries) {
          for (const prefix of lastOffice === 'UNKNOWN' ? prefixes : [null]) {
            const input: RouteInput = {
              lastOffice,
              citizenship,
              residence,
              prefix,
            };
            const step = resultStep(
              input,
              findOffice({ lastOffice, citizenship, residence, prefix })
            );
            expect(previewRoute(input).indexOf('match')).toBe(step);
          }
        }
      }
    }
  });
});

describe('resultStep / resultRoute', () => {
  it('maps the no-number path', () => {
    const input = { ...base, lastOffice: 'UNKNOWN' as const };
    const a = { ...input, citizenship: 'US', residence: 'NG' };
    expect(resultStep(a, resolveWithoutNumber('US', 'NG'))).toBe(2);
    const b = { ...input, citizenship: 'NG', residence: 'US' };
    expect(resultStep(b, resolveWithoutNumber('NG', 'US'))).toBe(3);
    const c = { ...input, citizenship: 'NG', residence: 'AE' };
    expect(resultStep(c, resolveWithoutNumber('NG', 'AE'))).toBe(5);
    expect(resultRoute(5, true)).toEqual([
      'skipped',
      'skipped',
      'passed',
      'passed',
      'skipped',
      'match',
    ]);
  });
  it('gives no step for an implausible prefix', () => {
    const input: RouteInput = {
      lastOffice: 'UNKNOWN',
      citizenship: 'US',
      residence: 'US',
      prefix: 99,
    };
    expect(resultStep(input, findOffice(input))).toBeNull();
    expect(resultRoute(null, false)).toEqual(Array(6).fill('idle'));
  });
});
