import type { BavClaimFields } from './intake-validation';
import type { BavLetterClaimFields, BavLetterOptions } from './context';

/**
 * Specimen bAV case ("Muster 2" of the client's v1.0 spec: Emily Carter,
 * BVV, DRV refund granted) as a claim row. ISO dates and dot-decimal
 * amounts, as stored by Drizzle. Specimen data only.
 */
export const MUSTER_2_CLAIM: BavClaimFields = {
  firstName: 'Emily',
  lastName: 'Carter',
  dateOfBirth: '1986-10-03',
  gender: 'female',
  placeOfBirth: 'Albany, USA',
  passportNumber: 'X12345678',
  currentAddressLine1: '42 Maple Avenue',
  currentAddressLine2: null,
  currentCity: 'Latham',
  currentPostalCode: 'NY 12110',
  currentCountry: 'USA',
  moveOutDate: '2021-03-15',
  salutation: 'frau',
  taxId: '98 765 432 109',
  healthInsuranceEndDate: '2021-03-15',
  employerName: 'Beispielbank AG',
  employmentEndDate: '2021-02-28',
  employerPersonnelNumber: null,
  bavProviderName: 'BVV Versicherungsverein des Bankgewerbes a.G.',
  bavDurchfuehrungsweg: 'Pensionskasse',
  bavContractReferenceLabel: 'Vertrags-Nr.',
  bavContractReference: '1234567-8-9012',
  bavProviderFormTitle: 'Antrag auf Abfindung einer Rentenanwartschaft',
  drvRefundReceived: true,
  drvOffice: 'Deutsche Rentenversicherung Bund',
  drvDecisionDate: '2026-07-02',
  bavStatementType: null,
  bavStatementDate: null,
  bavBenefitForm: null,
  bavBenefitAmount: null,
  bavAddresseeType: 'provider',
  bavRecipientName: 'BVV Versicherungsverein des Bankgewerbes a.G.',
  bavRecipientDepartment: '',
  bavRecipientStreet: 'Straße der Pariser Kommune 8',
  bavRecipientPostalCode: '10243',
  bavRecipientCity: 'Berlin',
  bavRecipientRef: null,
  accountHolderName: 'Emily Carter',
  iban: 'BE19905691823912',
  swiftBic: 'TRWIBEB1XXX',
  bankName: 'Wise Europe SA',
  bankStreet: 'Rue du Trône 100',
  bankCity: 'Brüssel',
  bankPostalCode: '1050',
  bankCountry: 'Belgien',
};

/** The same case with the columns the route × status letters read. */
export const MUSTER_2_LETTER_CLAIM: BavLetterClaimFields = {
  ...MUSTER_2_CLAIM,
  // Leading zeros must survive into the letter.
  bavContractReference: '0012345678',
  bavClaimStatus: null,
  bavApplicationTitle: null,
  bavRecipientCountry: 'Deutschland',
  accountNumber: null,
  bsb: null,
  lawFirmRef: null,
  signatureId: '00000000-0000-0000-0000-000000000001',
};

export const MUSTER_2_DOCUMENTS: BavLetterOptions['documents'] = [
  { role: 'provider_form', fileName: 'bvv-antrag.pdf' },
  { role: 'passport', fileName: 'passport.jpg' },
  { role: 'drv_refund_decision', fileName: 'bescheid.pdf' },
  { role: 'bav_extra', fileName: 'BVV_Zusatzblatt.pdf' },
];

export const MUSTER_2_OPTIONS: BavLetterOptions = {
  route: 'direct',
  letterDate: new Date(2026, 8, 7),
  postalAgent: {
    name: 'Anna Kliem',
    coLine: null,
    street: 'Kaskelstr. 46',
    postalCode: '10317',
    city: 'Berlin',
  },
  lawFirmAccount: null,
  documents: MUSTER_2_DOCUMENTS,
  signatureText: '[Unterschrift]',
};

/** Specimen Anderkonto (the standard test IBAN, not a real account). */
export const TEST_LAW_FIRM_ACCOUNT = {
  iban: 'DE89370400440532013000',
  bic: 'COBADEFFXXX',
  bank: 'Commerzbank',
};

/** Expected DIRECT-VESTED render of the Muster 2 case (owner text 29 Oct 2026). */
export const MUSTER_2_DIRECT_VESTED_EXPECTED = `Emily Carter
42 Maple Avenue
Latham, NY 12110
USA

BVV Versicherungsverein des Bankgewerbes a.G.
Straße der Pariser Kommune 8
10243 Berlin

Latham, 07.09.2026

Antrag auf Abfindung nach § 3 Abs. 3 BetrAVG

Name: Emily Carter, geb. 03.10.1986
Vertrags-Nr.: 0012345678

Sehr geehrte Damen und Herren,

mein Arbeitsverhältnis mit Beispielbank AG endete am 28.02.2021.

Den Erstattungsbescheid der Deutschen Rentenversicherung füge ich bei.

Hiermit verlange ich gemäß § 3 Abs. 3 BetrAVG die Abfindung meiner unverfallbaren Anwartschaft durch einmalige Kapitalzahlung. Die hierfür erforderliche Beitragserstattung ist erfolgt.

Bitte berechnen Sie den Abfindungsbetrag nach § 3 Abs. 5 in Verbindung mit § 4 Abs. 5 BetrAVG und übersenden Sie eine nachvollziehbare Abrechnung sowie die zutreffende steuerliche Bescheinigung.

Bitte überweisen Sie den Auszahlungsbetrag unmittelbar auf mein folgendes Konto:
Kontoinhaber: Emily Carter
Bank: Wise Europe SA
Anschrift der Bank: Rue du Trône 100, 1050 Brüssel, Belgien
IBAN: BE19 9056 9182 3912
BIC: TRWIBEB1XXX

Ich stelle diesen Antrag selbst. Für den Postempfang habe ich Anna Kliem mit der beigefügten Postempfangsvollmacht bevollmächtigt. Bitte senden Sie die Korrespondenz einschließlich Bescheiden an:
Anna Kliem
Kaskelstr. 46
10317 Berlin

Die Vollmacht ist auf den Postempfang beschränkt; eine weitergehende Verfahrensvertretung oder Geldempfangsvollmacht wird nicht erteilt.

Bitte bestätigen Sie den Eingang des Antrags und teilen Sie den voraussichtlichen Auszahlungstermin innerhalb von vier Wochen nach Zugang dieses Schreibens mit.

Mit freundlichen Grüßen

[Unterschrift]
Emily Carter

Anlagen
1. Postempfangsvollmacht
2. Erstattungsbescheid der Deutschen Rentenversicherung vom 02.07.2026
3. Kopie des Reisepasses
4. Antragsformular „Antrag auf Abfindung einer Rentenanwartschaft“
5. BVV Zusatzblatt`;
