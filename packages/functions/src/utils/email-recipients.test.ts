import { describe, expect, it } from 'vitest';
import { splitRecipients } from './email-recipients';

describe('splitRecipients', () => {
  it('keeps a single address as one entry', () => {
    expect(splitRecipients('ops@atlaes.de')).toEqual(['ops@atlaes.de']);
  });

  it('splits comma and semicolon lists and trims spaces', () => {
    expect(splitRecipients(' a@atlaes.de, b@gmail.com ;c@gmail.com ')).toEqual([
      'a@atlaes.de',
      'b@gmail.com',
      'c@gmail.com',
    ]);
  });

  it('drops empty parts and case-insensitive duplicates', () => {
    expect(splitRecipients('a@atlaes.de,, A@atlaes.de,')).toEqual([
      'a@atlaes.de',
    ]);
    expect(splitRecipients('')).toEqual([]);
  });
});
