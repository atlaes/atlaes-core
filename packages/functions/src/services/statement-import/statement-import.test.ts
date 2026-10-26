import { describe, expect, it } from 'vitest';
import {
  readXlsx,
  excelSerialToDate,
  columnIndex,
  decodeXmlEntities,
} from './xlsx';
import { parseCsv, detectDelimiter } from './csv';
import {
  extractRows,
  findHeaderRow,
  headerLabels,
  parseAmount,
  parseStatementDate,
  suggestColumnMap,
  isCompleteMap,
} from './columns';
import { matchStatementLine, type MatchCandidate } from './match';
import { readStatementGrid, statementLineHash, detectFileKind } from './parse';
import { makeXlsx } from './test-zip';

// Sample statement as in Figma 07 (lines 07, 09, 12, 14 are credits).
const STRINGS = [
  'Kontoauszug Anderkonto Vividius', // 0 title row
  'Buchungstag', // 1
  'Valutadatum', // 2
  'Verwendungszweck', // 3
  'Beguenstigter/Zahlungspflichtiger', // 4
  'Betrag', // 5
  'BEITRAGSERSTATTUNG 10 140388 S 501 SHARMA', // 6
  'Deutsche Rentenversicherung Bund', // 7
  'ERSTATTUNG BEITRAEGE', // 8
  'Kontoführung', // 9
];

function sheetXml(): string {
  // Row 1: title; row 3: header; data from row 4. Dates as serials with
  // the built-in date style (s=1); amounts with number style (s=2).
  const serial = (iso: string) =>
    (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) -
      Date.UTC(1899, 11, 30)) /
    86400000;
  return [
    '<row r="1"><c r="A1" t="s"><v>0</v></c></row>',
    '<row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3" t="s"><v>2</v></c><c r="C3" t="s"><v>3</v></c><c r="D3" t="s"><v>4</v></c><c r="E3" t="s"><v>5</v></c></row>',
    `<row r="4"><c r="A4" s="1"><v>${serial('2026-09-18')}</v></c><c r="B4" s="1"><v>${serial('2026-09-18')}</v></c><c r="C4" t="s"><v>6</v></c><c r="D4" t="s"><v>7</v></c><c r="E4" s="2"><v>3038.49</v></c></row>`,
    `<row r="5"><c r="A5" s="1"><v>${serial('2026-09-19')}</v></c><c r="B5" s="1"><v>${serial('2026-09-19')}</v></c><c r="C5" t="s"><v>9</v></c><c r="E5" s="2"><v>-12.5</v></c></row>`,
    `<row r="6"><c r="A6" s="3"><v>${serial('2026-09-21')}</v></c><c r="B6" s="3"><v>${serial('2026-09-21')}</v></c><c r="C6" t="inlineStr"><is><r><t>BEITRAGSERSTATTUNG CHEN MEI </t></r><r><t>23 110591 C 118</t></r></is></c><c r="D6" t="str"><v>DRV Bund &amp; Co</v></c><c r="E6"><v>3305.88</v></c></row>`,
    `<row r="7"><c r="B7" s="1"><v>${serial('2026-09-21')}</v></c><c r="C7" t="s"><v>8</v></c><c r="E7"><v>500</v></c></row>`,
  ].join('');
}

describe('xlsx reader', () => {
  for (const method of [8, 0] as const) {
    it(`reads shared/inline strings, numbers and date cells (zip method ${method})`, () => {
      const grid = readXlsx(makeXlsx(sheetXml(), STRINGS, method));
      expect(grid[0][0]).toBe('Kontoauszug Anderkonto Vividius');
      expect(grid[1]).toEqual([]); // empty row 2 kept as a gap
      expect(grid[2]).toEqual([
        'Buchungstag',
        'Valutadatum',
        'Verwendungszweck',
        'Beguenstigter/Zahlungspflichtiger',
        'Betrag',
      ]);
      expect(grid[3][1]).toBeInstanceOf(Date);
      expect((grid[3][1] as Date).toISOString().slice(0, 10)).toBe(
        '2026-09-18'
      );
      expect(grid[3][4]).toBe(3038.49);
      expect(grid[5][1]).toBeInstanceOf(Date); // custom dd/mm/yyyy format
      expect(grid[5][2]).toBe('BEITRAGSERSTATTUNG CHEN MEI 23 110591 C 118');
      expect(grid[5][3]).toBe('DRV Bund & Co');
      expect(grid[6][0]).toBeNull();
    });
  }

  it('helpers', () => {
    expect(columnIndex('A1')).toBe(0);
    expect(columnIndex('Z9')).toBe(25);
    expect(columnIndex('AB12')).toBe(27);
    expect(excelSerialToDate(46283).toISOString().slice(0, 10)).toBe(
      '2026-09-18'
    );
    expect(decodeXmlEntities('A &amp; B &#252; &#x00E4;')).toBe('A & B ü ä');
  });

  it('rejects non-zip and legacy xls', () => {
    expect(() => readXlsx(Buffer.from('not a zip'))).toThrow(/Invalid file/);
    const xls = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]);
    expect(() => detectFileKind('a.xls', xls)).toThrow(/legacy \.xls/);
  });
});

describe('csv reader', () => {
  it('parses semicolon CSV with quotes, embedded delimiters and newlines', () => {
    const csv =
      '﻿"Buchungstag";"Valutadatum";"Verwendungszweck";"Betrag"\r\n' +
      '"18.09.26";"18.09.26";"BEITRAGSERSTATTUNG; 10 140388 S 501 ""SHARMA""";"3.038,49"\r\n' +
      '"19.09.26";"19.09.26";"zwei\nZeilen";"-12,50"\r\n\r\n';
    expect(detectDelimiter(csv)).toBe(';');
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1][2]).toBe('BEITRAGSERSTATTUNG; 10 140388 S 501 "SHARMA"');
    expect(rows[2][2]).toBe('zwei\nZeilen');
  });

  it('decodes Windows-1252 bytes (Sparkasse exports)', () => {
    const buf = Buffer.from(
      'Verwendungszweck;Betrag\nR\xfcckzahlung;1,00\n',
      'latin1'
    );
    const rows = parseCsv(buf);
    expect(rows[1][0]).toBe('Rückzahlung');
  });

  it('comma and tab delimiters', () => {
    expect(parseCsv('a,b\n1,"2,5"\n')).toEqual([
      ['a', 'b'],
      ['1', '2,5'],
    ]);
    expect(parseCsv('a\tb\n1\t2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('column mapping', () => {
  it('finds the header row below a title block and suggests a map', () => {
    const grid = readXlsx(makeXlsx(sheetXml(), STRINGS));
    const h = findHeaderRow(grid);
    expect(h).toBe(2);
    const headers = headerLabels(grid[h]);
    const map = suggestColumnMap(headers);
    expect(map).toEqual({
      valueDate: 'Valutadatum',
      amount: 'Betrag',
      reference: 'Verwendungszweck',
      payer: 'Beguenstigter/Zahlungspflichtiger',
    });
    expect(isCompleteMap(map)).toBe(true);
  });

  it('prefers the remembered mapping when its columns exist', () => {
    const headers = ['Buchungstag', 'Valutadatum', 'Text', 'Betrag'];
    const map = suggestColumnMap(headers, {
      valueDate: 'Buchungstag',
      amount: 'Betrag',
      reference: 'Text',
      payer: null,
    });
    expect(map.valueDate).toBe('Buchungstag');
    expect(map.reference).toBe('Text');
  });

  it('extracts rows with the chosen map', () => {
    const grid = readXlsx(makeXlsx(sheetXml(), STRINGS));
    const parsed = extractRows(grid, {
      valueDate: 'Valutadatum',
      amount: 'Betrag',
      reference: 'Verwendungszweck',
      payer: 'Beguenstigter/Zahlungspflichtiger',
    });
    expect(parsed.rows.map((r) => [r.line, r.valueDate, r.amount])).toEqual([
      [1, '2026-09-18', 3038.49],
      [2, '2026-09-19', -12.5],
      [3, '2026-09-21', 3305.88],
      [4, '2026-09-21', 500],
    ]);
    expect(parsed.rows[0].payer).toBe('Deutsche Rentenversicherung Bund');
    expect(() =>
      extractRows(grid, {
        valueDate: 'X',
        amount: 'Betrag',
        reference: 'Y',
        payer: null,
      })
    ).toThrow(/value date, payment reference/);
  });

  it('parses amounts in German and English notation', () => {
    expect(parseAmount('3.038,49')).toBe(3038.49);
    expect(parseAmount('29.601,90 EUR')).toBe(29601.9);
    expect(parseAmount('-12,00')).toBe(-12);
    expect(parseAmount('12,00-')).toBe(-12);
    expect(parseAmount('1.234,00 S')).toBe(-1234);
    expect(parseAmount('1.234,00 H')).toBe(1234);
    expect(parseAmount('3,038.49')).toBe(3038.49);
    expect(parseAmount('3305.88')).toBe(3305.88);
    expect(parseAmount('3.038')).toBe(3038);
    expect(parseAmount('€ 1 234,56')).toBe(1234.56);
    expect(parseAmount(3305.88)).toBe(3305.88);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('parses dates', () => {
    expect(parseStatementDate('18.09.2026')).toBe('2026-09-18');
    expect(parseStatementDate('18.09.26')).toBe('2026-09-18');
    expect(parseStatementDate('2026-09-18')).toBe('2026-09-18');
    expect(parseStatementDate('18/09/2026')).toBe('2026-09-18');
    expect(parseStatementDate(46283)).toBe('2026-09-18');
    expect(parseStatementDate('32.13.2026')).toBeNull();
    expect(parseStatementDate(new Date('2026-09-21T00:00:00Z'))).toBe(
      '2026-09-21'
    );
  });

  it('reads a CSV statement end to end', () => {
    const csv = Buffer.from(
      'Buchungstag;Valutadatum;Verwendungszweck;Beguenstigter/Zahlungspflichtiger;Betrag;Waehrung\n' +
        '19.09.26;19.09.26;ERSTATTUNG 45 020790 O 213 OKAFOR JOSEPH;Deutsche Rentenversicherung;29.601,90;EUR\n',
      'utf8'
    );
    const { kind, grid } = readStatementGrid('Umsaetze.csv', csv);
    expect(kind).toBe('csv');
    const headers = headerLabels(grid[findHeaderRow(grid)]);
    const map = suggestColumnMap(headers);
    const { rows } = extractRows(grid, map as never);
    expect(rows[0]).toMatchObject({ valueDate: '2026-09-19', amount: 29601.9 });
  });
});

describe('matching', () => {
  const cases: MatchCandidate[] = [
    {
      claimId: 'sharma',
      firstName: 'Anita',
      lastName: 'Sharma',
      vsnr: '10140388S501',
    },
    {
      claimId: 'okafor',
      firstName: 'Joseph',
      lastName: 'Okafor',
      vsnr: '45 020790 O 213',
    },
    {
      claimId: 'chen',
      firstName: 'Mei',
      lastName: 'Chen',
      vsnr: '23110591C118',
    },
    { claimId: 'mueller', firstName: 'Jörg', lastName: 'Müller', vsnr: null },
    { claimId: 'mueller2', firstName: 'Anna', lastName: 'Müller', vsnr: null },
  ];

  it('VSNR + name (spaced or compact VSNR)', () => {
    expect(
      matchStatementLine('BEITRAGSERSTATTUNG 10 140388 S 501 SHARMA', cases)
    ).toEqual({
      claimId: 'sharma',
      reason: 'vsnr+name',
      suggestions: [],
    });
    expect(
      matchStatementLine('ERSTATTUNG 45020790O213 OKAFOR JOSEPH', cases).claimId
    ).toBe('okafor');
    expect(
      matchStatementLine('BEITRAGSERSTATTUNG CHEN MEI 23 110591 C 118', cases)
        .claimId
    ).toBe('chen');
  });

  it('VSNR alone matches; name in the payer column counts', () => {
    expect(matchStatementLine('RV 23 110591 C 118', cases)).toMatchObject({
      claimId: 'chen',
      reason: 'vsnr',
    });
    expect(
      matchStatementLine('RV 23 110591 C 118', cases, 'Mei Chen')
    ).toMatchObject({ reason: 'vsnr+name' });
  });

  it('name only → reconciliation with suggestion (umlauts folded)', () => {
    expect(matchStatementLine('ERSTATTUNG JOERG MUELLER', cases)).toEqual({
      claimId: null,
      reason: 'name_only',
      suggestions: ['mueller'],
    });
  });

  it('ambiguous and none', () => {
    const dup = [
      ...cases,
      {
        claimId: 'chen2',
        firstName: 'Wei',
        lastName: 'Li',
        vsnr: '23110591C118',
      },
    ];
    expect(matchStatementLine('RV 23110591C118', dup)).toMatchObject({
      claimId: null,
      reason: 'ambiguous',
    });
    expect(matchStatementLine('RV 23110591C118 CHEN', dup)).toMatchObject({
      claimId: 'chen',
    });
    expect(matchStatementLine('ERSTATTUNG BEITRAEGE', cases)).toEqual({
      claimId: null,
      reason: 'none',
      suggestions: [],
    });
  });

  it('does not match a last name inside another word', () => {
    expect(matchStatementLine('CHENNAI MEI TRANSFER', cases).reason).toBe(
      'none'
    );
  });
});

describe('dedupe hash', () => {
  it('is stable across whitespace/case and firm-scoped', () => {
    const a = statementLineHash('f1', {
      valueDate: '2026-09-18',
      amount: 3038.49,
      reference: 'X  y',
      payer: 'drv',
    });
    const b = statementLineHash('f1', {
      valueDate: '2026-09-18',
      amount: 3038.49,
      reference: 'x y',
      payer: 'DRV',
    });
    const c = statementLineHash('f2', {
      valueDate: '2026-09-18',
      amount: 3038.49,
      reference: 'x y',
      payer: 'DRV',
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
