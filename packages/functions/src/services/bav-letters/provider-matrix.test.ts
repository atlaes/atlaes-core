import { describe, expect, it } from 'vitest';
import {
  providerAddressPatch,
  providerMatches,
  type BavProviderInput,
  type ClaimRecipientFields,
} from './provider-matrix';

const allianz: BavProviderInput = {
  name: 'Allianz Lebensversicherungs-AG',
  defaultAddresseeType: 'provider',
  department: 'Abteilung bAV',
  street: 'Reinsburgstraße 19',
  postalCode: '70178',
  city: 'Stuttgart',
  country: 'Deutschland',
  requiresBankAddress: false,
};

const emptyClaim: ClaimRecipientFields = {
  bavProviderName: 'allianz lebensversicherungs-ag',
  bavAddresseeType: null,
  bavRecipientName: null,
  bavRecipientDepartment: null,
  bavRecipientStreet: null,
  bavRecipientPostalCode: null,
  bavRecipientCity: null,
};

describe('providerMatches', () => {
  it('matches case-insensitively and ignores extra whitespace', () => {
    expect(providerMatches(allianz, 'ALLIANZ  Lebensversicherungs-AG ')).toBe(
      true
    );
    expect(providerMatches(allianz, 'Allianz')).toBe(false);
    expect(providerMatches(allianz, null)).toBe(false);
    expect(providerMatches(allianz, '  ')).toBe(false);
  });
});

describe('providerAddressPatch', () => {
  it('fills an empty recipient block from the matrix', () => {
    expect(providerAddressPatch(emptyClaim, allianz)).toEqual({
      bavAddresseeType: 'provider',
      bavRecipientName: 'Allianz Lebensversicherungs-AG',
      bavRecipientDepartment: 'Abteilung bAV',
      bavRecipientStreet: 'Reinsburgstraße 19',
      bavRecipientPostalCode: '70178',
      bavRecipientCity: 'Stuttgart',
    });
  });

  it('keeps a name and department the claim already has', () => {
    const patch = providerAddressPatch(
      {
        ...emptyClaim,
        bavAddresseeType: 'provider',
        bavRecipientName: 'Allianz Leben',
        bavRecipientDepartment: 'Kundenservice',
      },
      allianz
    );
    expect(patch).toEqual({
      bavRecipientStreet: 'Reinsburgstraße 19',
      bavRecipientPostalCode: '70178',
      bavRecipientCity: 'Stuttgart',
    });
  });

  it('never overwrites an address ops or the client entered', () => {
    expect(
      providerAddressPatch(
        { ...emptyClaim, bavRecipientCity: 'München' },
        allianz
      )
    ).toBeNull();
    expect(
      providerAddressPatch(
        { ...emptyClaim, bavRecipientStreet: 'Königinstraße 28' },
        allianz
      )
    ).toBeNull();
  });

  it('does nothing when the provider does not match or has no address', () => {
    expect(
      providerAddressPatch({ ...emptyClaim, bavProviderName: 'BVV' }, allianz)
    ).toBeNull();
    expect(
      providerAddressPatch(emptyClaim, { ...allianz, street: null })
    ).toBeNull();
  });

  it('leaves employer-addressed letters alone', () => {
    expect(
      providerAddressPatch(
        { ...emptyClaim, bavAddresseeType: 'employer' },
        allianz
      )
    ).toBeNull();
    expect(
      providerAddressPatch(emptyClaim, {
        ...allianz,
        defaultAddresseeType: 'employer',
      })
    ).toBeNull();
  });
});
