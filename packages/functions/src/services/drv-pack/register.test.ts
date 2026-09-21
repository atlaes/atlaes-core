import { describe, expect, it } from 'vitest';
import {
  CARRIER_NAMES,
  PREFIX_REGISTER,
  compactVsnr,
  formatVsnr,
  isPlausiblePrefix,
  mailingEntryForPrefix,
  prefixCarrier,
  recipientLines,
  vsnrPrefix,
} from './register';

describe('register — VSNR helpers', () => {
  it('extracts the prefix in any spacing', () => {
    expect(vsnrPrefix('53 190454 B 051')).toBe(53);
    expect(vsnrPrefix('65160393H507')).toBe(65);
    expect(vsnrPrefix('')).toBeNull();
    expect(vsnrPrefix(null)).toBeNull();
  });

  it('formats as on record', () => {
    expect(formatVsnr('53190454b051')).toBe('53 190454 B 051');
    expect(compactVsnr('53 190454 B 051')).toBe('53190454B051');
    expect(formatVsnr('not-a-vsnr')).toBe('not-a-vsnr');
  });
});

describe('register — prefix rules (owner rulings 15 Sep 2026)', () => {
  it('routes KBS and Bund ranges', () => {
    for (const p of [38, 39, 80, 85, 89]) expect(prefixCarrier(p)).toBe('KBS');
    for (const p of [40, 53, 65, 79]) expect(prefixCarrier(p)).toBe('BUND');
  });

  it('routes regional districts to the register entries', () => {
    expect(prefixCarrier(2)).toBe('NORD');
    expect(prefixCarrier(29)).toBe('BSH');
    expect(prefixCarrier(24)).toBe('BW');
    expect(prefixCarrier(99)).toBeNull();
  });

  it('uses the Postanschrift, not the street address', () => {
    expect(recipientLines(mailingEntryForPrefix(10)!)).toEqual([
      'Deutsche Rentenversicherung Braunschweig-Hannover',
      '30875 Laatzen',
    ]);
    expect(recipientLines(mailingEntryForPrefix(3)!)).toEqual([
      'Deutsche Rentenversicherung Mitteldeutschland',
      'Kranichfelder Straße 3',
      '99097 Erfurt',
    ]);
    expect(recipientLines(mailingEntryForPrefix(85)!)).toEqual([
      'Deutsche Rentenversicherung Knappschaft-Bahn-See',
      'Rentenversicherung',
      '45060 Essen',
    ]);
    expect(recipientLines(mailingEntryForPrefix(53)!)).toEqual([
      'Deutsche Rentenversicherung Bund',
      'Abt. Internationales',
      '10704 Berlin',
    ]);
    expect(mailingEntryForPrefix(23)!.mailingAddress).toEqual(['70429 Stuttgart']);
    expect(mailingEntryForPrefix(24)!.mailingAddress).toEqual(['76122 Karlsruhe']);
    expect(mailingEntryForPrefix(18)!.email).toBe('service@drv-nordbayern.de');
    expect(mailingEntryForPrefix(23)!.email).toBe('post@drv-bw.de');
  });

  it('plausibility follows the VKVV ranges', () => {
    expect(isPlausiblePrefix(13)).toBe(true);
    expect(isPlausiblePrefix(53)).toBe(true); // 13 + 40
    expect(isPlausiblePrefix(40)).toBe(false); // Riester look-alike
    expect(isPlausiblePrefix(87)).toBe(false); // not allocated
    expect(isPlausiblePrefix(5)).toBe(false);
    expect(isPlausiblePrefix(null)).toBe(false);
  });

  it('every register entry has a full carrier name', () => {
    for (const entry of Object.values(PREFIX_REGISTER)) {
      expect(CARRIER_NAMES[entry.carrier]).toMatch(/^Deutsche Rentenversicherung /);
      expect(entry.email).toContain('@');
      expect(entry.mailingAddress.length).toBeGreaterThan(0);
    }
  });
});
