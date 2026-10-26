import { describe, expect, it } from 'vitest';
import {
  compileTemplate,
  renderTemplate,
  TemplateRenderError,
  TemplateSyntaxError,
} from './template-engine';

const render = (src: string, ctx: Record<string, unknown> = {}) =>
  renderTemplate(src, ctx as never).text;

describe('placeholders', () => {
  it('inserts values verbatim', () => {
    expect(
      render('Name: {{name}}, geb. {{dob}}', { name: 'A', dob: 'B' })
    ).toBe('Name: A, geb. B');
  });

  it('renders numbers and booleans as strings', () => {
    expect(render('{{n}} {{b}}', { n: 5, b: true })).toBe('5 true');
  });

  it('reports undefined and null fields as missing and renders them empty', () => {
    const result = renderTemplate('a{{x}}b{{y}}c{{z}}', {
      x: undefined,
      y: null,
      z: '',
    });
    expect(result.text).toBe('abc');
    expect(result.missing).toEqual(['x', 'y']);
  });

  it('throws in strict mode when fields are missing', () => {
    expect(() => renderTemplate('{{x}}', {}, { strict: true })).toThrow(
      TemplateRenderError
    );
  });

  it('rejects malformed placeholders', () => {
    expect(() => compileTemplate('{{bad name}}')).toThrow(TemplateSyntaxError);
  });
});

describe('gender tokens', () => {
  it('picks the masculine form for m and the feminine form for f', () => {
    const src = 'wir {{g:unseren Mandanten|unsere Mandantin}} vertreten';
    expect(render(src, { client_gender: 'm' })).toBe(
      'wir unseren Mandanten vertreten'
    );
    expect(render(src, { client_gender: 'f' })).toBe(
      'wir unsere Mandantin vertreten'
    );
  });

  it('reports client_gender as missing when it is not m or f', () => {
    const result = renderTemplate('{{g:Herrn|Frau}}X', {
      client_gender: 'other',
    });
    expect(result.text).toBe('X');
    expect(result.missing).toEqual(['client_gender']);
  });

  it('rejects a gender token without a separator', () => {
    expect(() => compileTemplate('{{g:Herr}}')).toThrow(TemplateSyntaxError);
  });
});

describe('conditionals', () => {
  it('evaluates truthiness of strings, booleans, numbers', () => {
    const src = '[[IF x]]yes[[ELSE]]no[[/IF]]';
    expect(render(src, { x: 'a' })).toBe('yes');
    expect(render(src, { x: '' })).toBe('no');
    expect(render(src, { x: '   ' })).toBe('no');
    expect(render(src, { x: true })).toBe('yes');
    expect(render(src, { x: false })).toBe('no');
    expect(render(src, { x: 0 })).toBe('no');
    expect(render(src, { x: 1 })).toBe('yes');
    expect(render(src, {})).toBe('no');
  });

  it('supports not, ==, in, and, or with and binding tighter than or', () => {
    const ctx = { a: 'x', b: 'y', c: '', d: 'Pensionskasse' };
    expect(render('[[IF not c]]1[[/IF]]', ctx)).toBe('1');
    expect(render('[[IF not a]]1[[ELSE]]2[[/IF]]', ctx)).toBe('2');
    expect(render('[[IF a == x]]1[[/IF]]', ctx)).toBe('1');
    expect(render('[[IF a == y]]1[[ELSE]]2[[/IF]]', ctx)).toBe('2');
    expect(
      render(
        '[[IF d in (Direktversicherung, Pensionskasse, Pensionsfonds)]]1[[/IF]]',
        ctx
      )
    ).toBe('1');
    expect(
      render(
        '[[IF d in (Direktzusage, Unterstützungskasse)]]1[[ELSE]]2[[/IF]]',
        ctx
      )
    ).toBe('2');
    expect(render('[[IF a == x and b == y]]1[[/IF]]', ctx)).toBe('1');
    expect(render('[[IF a == x and c]]1[[ELSE]]2[[/IF]]', ctx)).toBe('2');
    expect(render('[[IF c or b]]1[[/IF]]', ctx)).toBe('1');
    // "c or (a and b)" → true; "(c or a) and c" would be false.
    expect(render('[[IF c or a and b]]1[[ELSE]]2[[/IF]]', ctx)).toBe('1');
    expect(render('[[IF (c or a) and c]]1[[ELSE]]2[[/IF]]', ctx)).toBe('2');
  });

  it('compares == against the string form of the value', () => {
    expect(render('[[IF flag == true]]1[[/IF]]', { flag: true })).toBe('1');
    expect(render('[[IF n == 3]]1[[/IF]]', { n: 3 })).toBe('1');
  });

  it('nests blocks and else branches', () => {
    const src =
      '[[IF p]]outer [[IF q]]q[[ELSE]]not-q[[IF r]] r[[/IF]][[/IF]].[[ELSE]]none[[/IF]]';
    expect(render(src, { p: true, q: true })).toBe('outer q.');
    expect(render(src, { p: true, q: false, r: true })).toBe('outer not-q r.');
    expect(render(src, { p: false })).toBe('none');
  });

  it('rejects unbalanced blocks', () => {
    expect(() => compileTemplate('[[IF x]]a')).toThrow(TemplateSyntaxError);
    expect(() => compileTemplate('a[[/IF]]')).toThrow(TemplateSyntaxError);
    expect(() => compileTemplate('[[ELSE]]a')).toThrow(TemplateSyntaxError);
    expect(() => compileTemplate('[[ANLAGEN]]a')).toThrow(TemplateSyntaxError);
    expect(() => compileTemplate('[[IF a ==]]x[[/IF]]')).toThrow(
      TemplateSyntaxError
    );
    expect(() => compileTemplate('[[IF a in ()]]x[[/IF]]')).toThrow(
      TemplateSyntaxError
    );
  });
});

describe('line handling', () => {
  it('drops a line that consists solely of a conditional resolving to empty', () => {
    const src = 'Name: X\n[[IF pn]]Personalnummer: {{pn}}[[/IF]]\nRef: Y';
    expect(render(src, { pn: '' })).toBe('Name: X\nRef: Y');
    expect(render(src, { pn: '42' })).toBe(
      'Name: X\nPersonalnummer: 42\nRef: Y'
    );
  });

  it('drops such a line at the end of the template too', () => {
    expect(render('A\n[[IF x]]B[[/IF]]', {})).toBe('A');
    expect(render('A\n[[IF x]]B[[/IF]]', { x: 1 })).toBe('A\nB');
  });

  it('keeps an inline conditional in the middle of a line as-is', () => {
    const src = 'Bank: {{bank}}[[IF addr]], {{addr}}[[/IF]]\nNext';
    expect(render(src, { bank: 'B' })).toBe('Bank: B\nNext');
    expect(render(src, { bank: 'B', addr: 'A' })).toBe('Bank: B, A\nNext');
  });

  it('lets standalone block tags consume their own line break', () => {
    const src = [
      'Konto:',
      '[[IF law]]',
      'Inhaber: Kanzlei',
      '[[ELSE]]',
      'Inhaber: {{holder}}',
      '[[IF own]]Eigenes Konto.[[/IF]]',
      '[[/IF]]',
      '',
      'Steuern',
    ].join('\n');
    expect(render(src, { law: true })).toBe(
      'Konto:\nInhaber: Kanzlei\n\nSteuern'
    );
    expect(render(src, { holder: 'H', own: true })).toBe(
      'Konto:\nInhaber: H\nEigenes Konto.\n\nSteuern'
    );
    expect(render(src, { holder: 'H', own: false })).toBe(
      'Konto:\nInhaber: H\n\nSteuern'
    );
  });

  it('handles two consecutive line-owning conditionals where one is empty', () => {
    const src =
      'Intro\n\n[[IF a]]Line A[[/IF]]\n[[IF b]]Line B[[/IF]]\n\nOutro';
    expect(render(src, { a: true })).toBe('Intro\n\nLine A\n\nOutro');
    expect(render(src, { b: true })).toBe('Intro\n\nLine B\n\nOutro');
    expect(render(src, {})).toBe('Intro\n\nOutro');
  });

  it('collapses runs of empty lines, trims trailing spaces and outer blank lines', () => {
    expect(render('\n\nA   \n\n\n\nB\t\n\n')).toBe('A\n\nB');
  });

  it('normalizes CRLF input', () => {
    expect(render('A\r\n[[IF x]]B[[/IF]]\r\nC', {})).toBe('A\nC');
  });
});

describe('Anlagen block', () => {
  it('numbers every surviving non-empty line in order', () => {
    const src = [
      'Anlagen',
      '[[ANLAGEN]]',
      'Vollmacht (Original)',
      '[[IF form]]Antragsformular „{{title}}“[[/IF]]',
      '[[IF consent]]Zustimmungserklärung[[/IF]]',
      'Kopie Reisepass',
      '[[/ANLAGEN]]',
    ].join('\n');
    expect(render(src, { form: true, title: 'T' })).toBe(
      'Anlagen\n1. Vollmacht (Original)\n2. Antragsformular „T“\n3. Kopie Reisepass'
    );
    expect(render(src, {})).toBe(
      'Anlagen\n1. Vollmacht (Original)\n2. Kopie Reisepass'
    );
  });

  it('renders nothing for an Anlagen block with no surviving lines', () => {
    expect(
      render('X\n[[ANLAGEN]]\n[[IF a]]A[[/IF]]\n[[/ANLAGEN]]\nY', {})
    ).toBe('X\nY');
  });
});

describe('compileTemplate', () => {
  it('can render the same compiled template with different contexts', () => {
    const t = compileTemplate('{{g:Herr|Frau}} {{name}}');
    expect(t.render({ client_gender: 'm', name: 'A' }).text).toBe('Herr A');
    expect(t.render({ client_gender: 'f', name: 'B' }).text).toBe('Frau B');
  });
});
