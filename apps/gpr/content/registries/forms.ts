/**
 * DRV forms registry — feeds /download (EN + DE), each guide's "official
 * downloads" block and the CollectionPage ItemList. Version/Stand labels
 * are quarterly values (re-checked on the 2026-11-24 sweep); the linked
 * official page always shows the current version.
 *
 * `drvSlug` is only set where the DRV file name was verified in a handoff
 * (V0901 DE/EN, A1310 DE/EN, DE/ES, DE/PT). Every other edition links to
 * the DRV form search until its file name is verified once at go-live —
 * `formEditionUrl()` handles both cases.
 */

export type FormLang =
  | 'de-en'
  | 'de-fr'
  | 'de-es'
  | 'de-it'
  | 'de-pt'
  | 'de-el-tr'
  | 'de-tr'
  | 'de';

export interface FormEdition {
  lang: FormLang;
  /** Human label for the language pair. */
  langLabel: string;
  /** DRV file name under the `_pdf/` path; null = not yet verified. */
  drvSlug: string | null;
  /** DRV "Version" number where DRV prints one. */
  version?: string;
  /** DRV "Stand" date, DD.MM.YYYY as printed on the form. */
  stand: string;
  note?: string;
}

export interface FormEntry {
  number: string;
  /** Official German title as printed by DRV. */
  title: string;
  /** English gloss used on the downloads page. */
  titleEn: string;
  group: 'refund-claim' | 'payment' | 'supporting';
  editions: FormEdition[];
  /** Site guide slug (without leading slash) when a guide page exists. */
  guideSlug?: string;
  /** ISO date of the last verification against the official DRV list. */
  verifiedOn: string;
  /** Former form numbers this one replaces. */
  replaces?: string[];
  /** Companion DRV guides (V0810/V0811, V0910, E5817). */
  companions?: string;
}

export const DRV_PDF_BASE =
  'https://www.deutsche-rentenversicherung.de/SharedDocs/Formulare/DE/_pdf/';

/** DRV form search — fallback target for editions without a verified slug. */
export const DRV_FORM_SEARCH =
  'https://www.deutsche-rentenversicherung.de/DRV/DE/Online-Services/Formulare-und-Antraege/formulare-und-antraege_node.html';

export const DRV_EANTRAG = 'https://www.eantrag.drv.info/';

export function formEditionUrl(edition: FormEdition): string {
  return edition.drvSlug ? DRV_PDF_BASE + edition.drvSlug : DRV_FORM_SEARCH;
}

export const FORMS: FormEntry[] = [
  {
    number: 'V0901',
    title: 'Antrag auf Beitragserstattung bei Aufenthalt im Ausland',
    titleEn: 'Refund claim, residence outside Germany',
    group: 'refund-claim',
    guideSlug: 'v0901-pension-refund-form-english',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de-en',
        langLabel: 'German/English',
        drvSlug: 'V0901_englisch.pdf',
        version: '21',
        stand: '28.11.2023',
      },
      {
        lang: 'de-fr',
        langLabel: 'German/French',
        drvSlug: null,
        stand: '28.11.2023',
        note: 'until recently numbered V0902',
      },
      {
        lang: 'de-es',
        langLabel: 'German/Spanish',
        drvSlug: null,
        stand: '31.05.2024',
      },
      {
        lang: 'de-it',
        langLabel: 'German/Italian',
        drvSlug: null,
        stand: '31.05.2024',
      },
    ],
    replaces: ['V0902'],
  },
  {
    number: 'V0900',
    title: 'Antrag auf Beitragserstattung bei Aufenthalt im Inland',
    titleEn: 'Refund claim, residence in Germany',
    group: 'refund-claim',
    guideSlug: 'v0900-formular',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de',
        langLabel: 'German',
        drvSlug: null,
        version: '26',
        stand: '02.03.2026',
      },
    ],
    companions:
      'V0910 (Stand 02.03.2026) — DRV guide to the V0900 claim; DRV also offers the online eAntrag',
  },
  {
    number: 'V0910',
    title: 'Erläuterungen zum Antrag bei Aufenthalt im Inland',
    titleEn: 'DRV guide to the V0900 claim',
    group: 'refund-claim',
    verifiedOn: '2026-08-27',
    editions: [
      { lang: 'de', langLabel: 'German', drvSlug: null, stand: '02.03.2026' },
    ],
  },
  {
    number: 'E5816',
    title:
      'Antrag auf Beitragserstattung für türkische Staatsangehörige bei Aufenthalt im Ausland (deutsch/türkisch)',
    titleEn: 'Refund claim for Turkish citizens abroad',
    group: 'refund-claim',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de-tr',
        langLabel: 'German/Turkish',
        drvSlug: null,
        stand: '10.12.2020',
      },
    ],
    replaces: ['A5800'],
  },
  {
    number: 'E5817',
    title: 'Erläuterungen zu E5816 (deutsch/türkisch)',
    titleEn: 'DRV guide to the Turkish claim form',
    group: 'refund-claim',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de-tr',
        langLabel: 'German/Turkish',
        drvSlug: null,
        stand: '01.02.2018',
      },
    ],
  },
  {
    number: 'A1310',
    title: 'Zahlungserklärung für alle Länder (nicht für Italien)',
    titleEn: 'Payment declaration, all countries except Italy',
    group: 'payment',
    guideSlug: 'a1310-payment-declaration',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de-en',
        langLabel: 'German/English',
        drvSlug: 'A1310en.pdf',
        stand: '01.07.2026',
      },
      {
        lang: 'de-fr',
        langLabel: 'German/French',
        drvSlug: null,
        stand: '01.07.2026',
      },
      {
        lang: 'de-es',
        langLabel: 'German/Spanish',
        drvSlug: 'A1310sp',
        stand: '01.07.2026',
      },
      {
        lang: 'de-pt',
        langLabel: 'German/Portuguese',
        drvSlug: 'A1310po',
        stand: '01.07.2026',
      },
      {
        lang: 'de-el-tr',
        langLabel: 'German/Greek/Turkish',
        drvSlug: null,
        stand: '01.07.2025',
        note: 'trilingual',
      },
    ],
    replaces: ['A1312', 'A1313', 'A3863', 'A1310sp (old)', 'A1310gr (old)'],
  },
  {
    number: 'A1311',
    title: 'Zahlungserklärung Italien (deutsch/italienisch)',
    titleEn: 'Payment declaration, Italy',
    group: 'payment',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de-it',
        langLabel: 'German/Italian',
        drvSlug: null,
        stand: '02.05.2025',
      },
    ],
  },
  {
    number: 'R0985',
    title: 'Angaben zum Zahlungsweg',
    titleEn: 'Payment-route details (bank connection)',
    group: 'payment',
    verifiedOn: '2026-08-27',
    editions: [
      { lang: 'de', langLabel: 'German', drvSlug: null, stand: '01.07.2025' },
    ],
  },
  {
    number: 'V0100',
    title: 'Antrag auf Kontenklärung',
    titleEn: 'Account clarification (Kontenklärung)',
    group: 'supporting',
    guideSlug: 'v0100-form',
    verifiedOn: '2026-08-27',
    editions: [
      {
        lang: 'de',
        langLabel: 'German',
        drvSlug: null,
        version: '21',
        stand: '02.03.2026',
      },
    ],
  },
  {
    number: 'V0800',
    title:
      'Antrag auf Feststellung von Kindererziehungszeiten / Berücksichtigungszeiten wegen Kindererziehung',
    titleEn: 'Application to establish child-raising periods',
    group: 'supporting',
    guideSlug: 'v0800-child-raising-periods',
    verifiedOn: '2026-08-27',
    editions: [
      { lang: 'de', langLabel: 'German', drvSlug: null, stand: '29.04.2026' },
    ],
    companions:
      'V0810 (Stand 29.04.2026) for the application and V0811 (Stand 26.06.2019) for the supplementary child-raising questionnaire',
  },
];

export function findForm(number: string): FormEntry | undefined {
  return FORMS.find((f) => f.number === number);
}

/** Flat list in the downloads-page order (17 entries, one per edition). */
export function formEditionList(): Array<{
  form: FormEntry;
  edition: FormEdition;
  position: number;
}> {
  const out: Array<{
    form: FormEntry;
    edition: FormEdition;
    position: number;
  }> = [];
  FORMS.forEach((form) => {
    form.editions.forEach((edition) => {
      out.push({ form, edition, position: out.length + 1 });
    });
  });
  return out;
}
