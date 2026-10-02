import { describe, expect, it } from 'vitest';
import { formatFigure, parseFigure } from './countUpFormat';

describe('CountUp figure parsing', () => {
  const cases = [
    '€11,572',
    '76.3% within 30 days',
    '4.98/5',
    '1.234,56 €',
    '12',
    '0,5 %',
    '2,000,000+',
  ];
  it.each(cases)('round-trips %s at the final value', (text) => {
    const f = parseFigure(text);
    expect(f).not.toBeNull();
    expect(formatFigure(f!, f!.value)).toBe(text);
  });

  it('keeps formatting on intermediate values', () => {
    const f = parseFigure('€11,572')!;
    expect(formatFigure(f, 0)).toBe('€0');
    expect(formatFigure(f, 1234.4)).toBe('€1,234');
    const p = parseFigure('76.3% within 30 days')!;
    expect(formatFigure(p, 0)).toBe('0.0% within 30 days');
    const r = parseFigure('4.98/5')!;
    expect(formatFigure(r, 2.5)).toBe('2.50/5');
  });

  it('returns null without digits', () => {
    expect(parseFigure('n/a')).toBeNull();
  });
});
