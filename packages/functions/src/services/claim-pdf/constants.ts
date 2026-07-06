export const A4 = { width: 595.28, height: 841.89 } as const;

export const mm = (v: number): number => (v * 72) / 25.4;

/** Fixed recipient of all correspondence power-of-attorney mail. */
export const POA_HOLDER = {
  salutation: 'Frau',
  fullName: 'Anna Katharina Charlotte Kliem',
  nameWithBirthName: 'Anna Katharina Charlotte Kliem, geb. Böckers',
  birthDate: '06.05.1983',
  birthPlace: 'Münster Westfalen',
  street: 'Kaskelstraße 46',
  postalCodeCity: '10317 Berlin',
  country: 'Deutschland',
  email: 'assistenz.kliem@gmail.com',
} as const;

/**
 * Cover-letter geometry measured from the lettershop-approved reference
 * (Cover Letter VBL.doc rendered to PDF). Origin: TOP-left, values in pt.
 * The recipient block MUST stay inside the DIN 5008 Typ B window zone —
 * do not change without re-validating with the lettershop sizing sheet.
 */
export const COVER_LAYOUT = {
  marginLeft: 68.3,
  fontSize: 11,
  lineHeight: 13.8,
  recipient: { x: 68.3, firstLineTop: 166.2, secondLineTop: 193.8 },
  dateLine: { x: 312.25, top: 288.9 },
  subjectTop: 315.5,
  bodyTop: 356.9,
  signatureImageHeight: 40,
} as const;
