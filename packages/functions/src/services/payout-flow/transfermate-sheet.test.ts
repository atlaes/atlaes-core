import { describe, expect, it } from 'vitest';
import {
  countryCode,
  TRANSFERMATE_SHEET_HEADER,
  transferMateSheetCsv,
  transferMateSheetRow,
  type TransferMateSheetInput,
} from './transfermate-sheet';

const client: TransferMateSheetInput['client'] = {
  firstName: 'Ana',
  lastName: 'Gómez',
  dateOfBirth: '1984-03-07',
  addressLine1: 'Calle 10 # 5-20',
  addressLine2: null,
  postalCode: '050001',
  city: 'Medellín',
  country: 'Colombia',
};

describe('TransferMate sheet row', () => {
  it('fills columns A–Y in sheet order', () => {
    const row = transferMateSheetRow({
      amountEur: 4256.5,
      account: {
        accountHolder: 'Ana Gómez',
        bank: 'Bancolombia',
        country: 'CO',
        currency: 'COP',
        accountNumber: '00123456789',
        bic: 'COLOCOBM',
      },
      client,
    });
    expect(row).toHaveLength(25);
    expect(TRANSFERMATE_SHEET_HEADER).toHaveLength(25);
    expect(row[0]).toBe('4256.50');
    expect(row[2]).toBe('00123456789');
    expect(row[5]).toBe('COP');
    expect(row[8]).toBe('TransferMate');
    expect(row[12]).toBe('');
    expect(row[13]).toBe('Individual');
    expect(row[14]).toBe('Professinal services');
    expect(row[15]).toBe('CO');
    expect(row[16]).toBe('');
    expect(row[17]).toBe('07.03.1984');
    expect(row[18]).toBe('Calle 10 # 5-20, 050001 Medellín');
    expect(row[24]).toBe('');
  });

  it('notes the client when the account holder differs', () => {
    const row = transferMateSheetRow({
      amountEur: 100,
      account: {
        accountHolder: 'Luis Pérez',
        bank: 'B',
        country: 'CO',
        currency: 'COP',
        accountNumber: '1',
      },
      client,
    });
    expect(row[12]).toBe('Client name: Ana Gómez');
  });

  it('INR residency and IFSC; CAD transit/institution split; USD ABA', () => {
    const inr = transferMateSheetRow({
      amountEur: 1,
      account: {
        accountHolder: 'Ana Gómez',
        bank: 'SBI',
        country: 'IN',
        currency: 'INR',
        accountNumber: '0001',
        routingLabel: 'IFSC',
        routingValue: 'SBIN0001234',
      },
      client: { ...client, country: 'India' },
    });
    expect(inr[16]).toBe('Resident');
    expect(inr[19]).toBe('SBIN0001234');
    const nonRes = transferMateSheetRow({
      amountEur: 1,
      account: {
        ...(inr as never),
        accountHolder: 'Ana Gómez',
        bank: 'SBI',
        country: 'IN',
        currency: 'INR',
        accountNumber: '1',
      },
      client,
    });
    expect(nonRes[16]).toBe('Non-Resident');
    const cad = transferMateSheetRow({
      amountEur: 1,
      account: {
        accountHolder: 'Ana Gómez',
        bank: 'RBC',
        country: 'CA',
        currency: 'CAD',
        accountNumber: '1',
        routingLabel: 'Transit/Institution',
        routingValue: '01234-003',
      },
      client,
    });
    expect(cad[22]).toBe('01234');
    expect(cad[23]).toBe('003');
    const usd = transferMateSheetRow({
      amountEur: 1,
      account: {
        accountHolder: 'Ana Gómez',
        bank: 'Chase',
        country: 'US',
        currency: 'USD',
        accountNumber: '1',
        routingLabel: 'Routing number',
        routingValue: '021000021',
      },
      client,
    });
    expect(usd[21]).toBe('021000021');
  });

  it('country names map to ISO codes', () => {
    expect(countryCode('Colombia')).toBe('CO');
    expect(countryCode('united states')).toBe('US');
    expect(countryCode('br')).toBe('BR');
    expect(countryCode('Atlantis')).toBe('');
  });

  it('CSV quotes commas', () => {
    const csv = transferMateSheetCsv([['a,b', 'c']]);
    expect(csv.split('\r\n')[1]).toBe('"a,b",c');
  });
});
