import { describe, expect, it } from 'vitest';
import {
  classifyLetter,
  extractLetterDate,
  extractLetterFields,
  extractName,
  matchLetter,
  type LetterCandidate,
} from './extract';
import { SPECIMEN_LETTERS } from './specimens';

// Specimen OCR texts (invented people, published example numbers only).
//   pnpm vitest run src/services/law-firm-letters/extract.test.ts

const cand = (
  p: Partial<LetterCandidate> & { claimId: string }
): LetterCandidate => ({
  firstName: null,
  lastName: null,
  birthName: null,
  vsnr: null,
  svNummer: null,
  lawFirmRef: null,
  ...p,
});

const SHARMA = cand({
  claimId: 'c-sharma',
  firstName: 'Anita',
  lastName: 'Sharma',
  vsnr: '10 140388 S 501',
  lawFirmRef: '06152-26',
});
const OKAFOR = cand({
  claimId: 'c-okafor',
  firstName: 'Joseph',
  lastName: 'Okafor',
  vsnr: '45020790O213',
  lawFirmRef: '06160-26',
});
const SHARMA_2 = cand({
  claimId: 'c-sharma-2',
  firstName: 'Anita',
  lastName: 'Sharma',
  vsnr: '23110591C118',
});

describe('extractLetterFields', () => {
  it('reads VSNR (spaced or not), AZ, addressee and letter date', () => {
    const f = extractLetterFields(SPECIMEN_LETTERS.refundDecision.text);
    expect(f.vsnr).toEqual(['10140388S501']);
    expect(f.az).toEqual(['06152-26']);
    expect(f.name).toBe('Anita Sharma');
    expect(f.letterDate).toBe('2026-10-02');
  });

  it('reads a run-together VSNR and a written-out month', () => {
    const f = extractLetterFields(SPECIMEN_LETTERS.documentRequest.text);
    expect(f.vsnr).toEqual(['45020790O213']);
    expect(f.letterDate).toBe('2026-09-14');
  });

  it('ignores a birth date when looking for the letter date', () => {
    expect(
      extractLetterDate('Versicherte: Max Muster, geboren 17.08.1939\n')
    ).toBeNull();
    expect(extractLetterDate('Berlin, den 3.11.2026\ngeb. 01.01.1980')).toBe(
      '2026-11-03'
    );
  });

  it('finds a labelled name', () => {
    expect(extractName('Versicherter: Joseph Okafor\nText')).toBe(
      'Joseph Okafor'
    );
    expect(extractName('Herrn Joseph Okafor\n')).toBe('Joseph Okafor');
    expect(extractName('Nothing here')).toBeNull();
  });
});

describe('classifyLetter', () => {
  it.each([
    ['refundDecision', 'refund_decision'],
    ['documentRequest', 'document_request'],
    ['rejection', 'rejection'],
    ['other', 'other'],
  ] as const)('%s → %s', (key, type) => {
    expect(classifyLetter(SPECIMEN_LETTERS[key].text)).toBe(type);
  });

  it('a rejection that mentions the refund is still a rejection', () => {
    expect(
      classifyLetter(
        'Bescheid über die Beitragserstattung\nIhr Antrag wird abgelehnt.'
      )
    ).toBe('rejection');
  });
});

describe('matchLetter', () => {
  const m = (text: string, cs: LetterCandidate[]) =>
    matchLetter(text, extractLetterFields(text), cs);

  it('VSNR + name of exactly one case → matched', () => {
    const r = m('Versicherungsnummer 10 140388 S 501\nFrau Anita Sharma', [
      SHARMA,
      OKAFOR,
    ]);
    expect(r).toMatchObject({ claimId: 'c-sharma', method: 'vsnr_name' });
  });

  it('the firm AZ of exactly one case → matched', () => {
    const r = m('Ihr Zeichen: 06160-26', [SHARMA, OKAFOR]);
    expect(r).toMatchObject({ claimId: 'c-okafor', method: 'az' });
  });

  it('a name alone never matches', () => {
    const r = m('Sehr geehrte Frau Anita Sharma,', [SHARMA, OKAFOR]);
    expect(r).toEqual({
      claimId: null,
      method: null,
      reason: 'name_only',
      candidates: ['c-sharma'],
    });
  });

  it('VSNR without the name → queue with the case as a suggestion', () => {
    const r = m('VSNR 45 020790 O 213', [SHARMA, OKAFOR]);
    expect(r).toMatchObject({
      claimId: null,
      reason: 'vsnr_without_name',
      candidates: ['c-okafor'],
    });
  });

  it('two cases with the same name → ambiguous', () => {
    const r = m('Frau Anita Sharma', [SHARMA, SHARMA_2]);
    expect(r.reason).toBe('ambiguous');
    expect(r.candidates.sort()).toEqual(['c-sharma', 'c-sharma-2']);
  });

  it('AZ and VSNR of different cases → conflict', () => {
    const r = m('Ihr Zeichen 06152-26\nVSNR 45020790O213 Joseph Okafor', [
      SHARMA,
      OKAFOR,
    ]);
    expect(r.reason).toBe('conflict');
    expect(r.claimId).toBeNull();
  });

  it('nothing → none; cases of other firms are never candidates', () => {
    expect(m('Sehr geehrte Damen und Herren', [SHARMA]).reason).toBe('none');
    expect(m('VSNR 10 140388 S 501 Anita Sharma', []).reason).toBe('none');
  });

  it('matches the specimen refund decision to its case', () => {
    const r = m(SPECIMEN_LETTERS.refundDecision.text, [SHARMA, OKAFOR]);
    expect(r.claimId).toBe('c-sharma');
  });
});
