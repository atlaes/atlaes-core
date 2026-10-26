import { describe, expect, it } from 'vitest';
import { resolveCarrier } from './resolve-carrier';

describe('resolveCarrier — six-rule order', () => {
  it('1. KBS history wins over everything', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      everInsuredWithKbs: true,
      vsnr: '53 190454 B 051',
      citizenship: 'AU',
      residence: 'AU',
    });
    expect(r.carrier).toBe('KBS');
    expect(r.rule).toBe('kbs_history');
    expect(r.entry?.mailingAddress).toEqual([
      'Rentenversicherung',
      '45060 Essen',
    ]);
  });

  it('1b. a KBS-issued number means KBS', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '80 010180 M 123',
      citizenship: 'IN',
      residence: 'AE',
    });
    expect(r.carrier).toBe('KBS');
    expect(r.rule).toBe('kbs_prefix');
  });

  it('2. Bund last carrier, and Bund prefix when the office is unknown', () => {
    expect(
      resolveCarrier({
        lastOffice: 'BUND',
        vsnr: null,
        citizenship: 'US',
        residence: 'US',
      }).rule
    ).toBe('bund_last_carrier');
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '53 190454 B 051',
      citizenship: 'AU',
      residence: 'AU',
    });
    expect(r.carrier).toBe('BUND');
    expect(r.rule).toBe('bund_prefix');
  });

  it('3. citizenship liaison office (Australia → Oldenburg-Bremen, Verbindungsstelle)', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '28 190454 B 051',
      citizenship: 'AU',
      residence: 'AU',
    });
    expect(r.carrier).toBe('OLB');
    expect(r.rule).toBe('citizenship_liaison');
    expect(r.viaLiaison).toBe(true);
    expect(r.liaisonCountryDe).toBe('Australien');
    expect(r.entry?.mailingAddress).toEqual([
      'Hauptverwaltung',
      '26112 Oldenburg',
    ]);
    expect(r.multiConnection).toBe(false);
  });

  it('3b. prefix Standort is kept when it belongs to the liaison carrier', () => {
    // Greek citizen → BW; prefix 24 → BW Karlsruhe (Standort route wins)
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '24 010180 A 001',
      citizenship: 'GR',
      residence: 'AE',
    });
    expect(r.carrier).toBe('BW');
    expect(r.entry?.mailingAddress).toEqual(['76122 Karlsruhe']);
  });

  it('flags multi-connection cases', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: null,
      citizenship: 'IN',
      residence: 'AU',
    });
    expect(r.carrier).toBe('NORD');
    expect(r.multiConnection).toBe(true);
    expect(r.notes.join(' ')).toMatch(/confirm before filing/);
  });

  it('4. residence liaison office when the citizenship has none', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: null,
      citizenship: 'NG',
      residence: 'AU',
    });
    expect(r.carrier).toBe('OLB');
    expect(r.rule).toBe('residence_liaison');
    expect(r.liaisonCountry).toBe('AU');
  });

  it('5. account-holding regional carrier from the prefix', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '13 160894 M 123',
      citizenship: 'NG',
      residence: 'AE',
    });
    expect(r.carrier).toBe('RHL');
    expect(r.rule).toBe('account_carrier_prefix');
    expect(r.viaLiaison).toBe(false);
  });

  it('5b. known last office beats the prefix district', () => {
    const r = resolveCarrier({
      lastOffice: 'HE',
      vsnr: '13 160894 M 123',
      citizenship: 'NG',
      residence: 'AE',
    });
    expect(r.carrier).toBe('HE');
    expect(r.rule).toBe('account_carrier');
  });

  it('6. unresolved when nothing matches', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: null,
      citizenship: 'NG',
      residence: 'AE',
    });
    expect(r.carrier).toBeNull();
    expect(r.rule).toBe('unresolved');
  });

  it('marks implausible prefixes and does not route on them', () => {
    const r = resolveCarrier({
      lastOffice: 'UNKNOWN',
      vsnr: '40 000000 A 000',
      citizenship: 'NG',
      residence: 'AE',
    });
    expect(r.implausiblePrefix).toBe(true);
    expect(r.rule).toBe('unresolved');
  });
});
