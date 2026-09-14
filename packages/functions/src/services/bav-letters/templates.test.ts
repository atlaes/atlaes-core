import { describe, expect, it } from 'vitest';
import { LAW_FIRM } from './constants';
import { MUSTER_2, MUSTER_2_A_DIRECT_EXPECTED } from './muster-2.fixture';
import type { TemplateContext } from './template-engine';
import {
  BAV_TEMPLATE_IDS,
  getBavTemplate,
  loadBavTemplateSource,
} from './templates';

/** Extra placeholders the LAW variants and the powers of attorney need. */
const LAW_EXTRAS: TemplateContext = {
  law_firm_letterhead: '',
  law_firm_city: LAW_FIRM.city,
  law_firm_ref: '2026/0815-KC',
  law_firm_name: LAW_FIRM.name,
  law_firm_iban: 'DE02 1001 0010 0000 0000 01',
  law_firm_bic: 'PBNKDEFFXXX',
  law_firm_bank: 'Postbank',
  lawyer_name: LAW_FIRM.lawyerName,
  lawyer_title: LAW_FIRM.lawyerTitle,
  client_birthplace: 'Albany, USA',
  client_passport_number: 'X12345678',
  pev_start_date: '07.09.2026',
  threshold_pension: '59,33',
  threshold_capital: '7.119,00',
};

const ROUTE_B_EXTRAS: TemplateContext = {
  route: 'B',
  statement_type: 'Standmitteilung',
  statement_date: '31.12.2025',
  benefit_form: 'pension',
  benefit_amount: '41,20',
  last_statement_enclosed: true,
};

const full = (overrides: TemplateContext = {}): TemplateContext => ({
  ...MUSTER_2,
  ...LAW_EXTRAS,
  ...overrides,
});

const LEFTOVER_TOKEN = /\{\{|\}\}|\[\[|\]\]/;

describe('bAV template assets', () => {
  it('loads and compiles all six templates', () => {
    for (const id of BAV_TEMPLATE_IDS) {
      expect(loadBavTemplateSource(id).length).toBeGreaterThan(100);
      expect(() => getBavTemplate(id)).not.toThrow();
    }
  });

  it('renders every template with a full context without leftovers or missing fields', () => {
    const ctx = full(ROUTE_B_EXTRAS);
    for (const id of BAV_TEMPLATE_IDS) {
      const { text, missing } = getBavTemplate(id).render(ctx);
      expect(missing, id).toEqual([]);
      expect(text, id).not.toMatch(LEFTOVER_TOKEN);
    }
  });
});

describe('Muster 2 (A-DIRECT)', () => {
  it('matches the hand-derived reference render exactly', () => {
    const { text, missing } = getBavTemplate('A-DIRECT').render(MUSTER_2);
    expect(missing).toEqual([]);
    expect(text).toBe(MUSTER_2_A_DIRECT_EXPECTED);
  });

  it('adds the copy line and the copy clause when send_copy is set', () => {
    const { text } = getBavTemplate('A-DIRECT').render({
      ...MUSTER_2,
      employer_consent_enclosed: false,
      send_copy: true,
      copy_recipient_name: 'Beispielbank AG',
    });
    expect(text).toContain(
      'bitte ich Sie, diese unmittelbar bei Beispielbank AG einzuholen; Beispielbank AG erhält eine Kopie dieses Schreibens. Der Arbeitgeber ist im Fall des § 3 Abs. 3 BetrAVG zur Abfindung verpflichtet.'
    );
    expect(text).toContain('\nKopie an: Beispielbank AG\n\nAnlagen');
  });

  it('switches to the employer wording when the employer is the addressee', () => {
    const { text } = getBavTemplate('A-DIRECT').render({
      ...MUSTER_2,
      addressee_type: 'employer',
      recipient_name: 'Beispielbank AG',
      recipient_department: 'Personalabteilung – Betriebliche Altersversorgung',
      employer_personnel_number: '4711',
    });
    expect(text).toContain(
      'Beispielbank AG\nPersonalabteilung – Betriebliche Altersversorgung\nStraße der Pariser Kommune 8'
    );
    expect(text).toContain(
      'Personalnummer: 4711\nVertrags-Nr.: 1234567-8-9012\n\nSehr geehrte'
    );
    expect(text).not.toContain('Ehemaliger Arbeitgeber:');
    expect(text).not.toContain('Soweit Sie für die Durchführung');
    expect(text).toContain(
      'Ich bitte Sie, die Abfindung gegenüber BVV Versicherungsverein des Bankgewerbes a.G. freizugeben und die Auszahlung zu veranlassen.'
    );
  });

  it('uses the Barwert sentence for Direktzusage and drops the provider clause', () => {
    const { text } = getBavTemplate('A-DIRECT').render({
      ...MUSTER_2,
      addressee_type: 'employer',
      durchfuehrungsweg: 'Direktzusage',
      provider_name: '',
      contract_reference: '',
    });
    expect(text).toContain('Altersversorgung (Direktzusage).');
    expect(text).toContain(
      'und entspricht dem Barwert der nach § 2 BetrAVG bemessenen künftigen Versorgungsleistung.'
    );
    expect(text).not.toContain('gebildeten Kapital');
    expect(text).not.toContain('freizugeben');
  });

  it('falls back to the "not available" tax sentence and omits the account-holder line', () => {
    const { text } = getBavTemplate('A-DIRECT').render({
      ...MUSTER_2,
      tax_id: '',
      account_holder: 'John Carter',
      account_holder_is_client: false,
      bank_address: '',
      client_email: '',
    });
    expect(text).toContain(
      'Meine steuerliche Identifikationsnummer liegt mir derzeit nicht vor.'
    );
    expect(text).toContain('Kontoinhaber: John Carter\n');
    expect(text).toContain('Bank: Wise Europe SA\n\nSteuerliche Hinweise');
    expect(text).not.toContain('Das Konto lautet auf meinen Namen.');
    expect(text).toContain('an Frau Kliem gerichtet werden.\n');
    expect(text).toMatch(
      /^Emily Carter\n42 Maple Avenue\nLatham, NY 12110\nUSA\n\nBVV/
    );
  });
});

describe('A-LAW', () => {
  it('renders the law-firm header, Anderkonto and enclosure order', () => {
    const { text, missing } = getBavTemplate('A-LAW').render(
      full({ payout_target: 'law_firm', client_gender: 'm' })
    );
    expect(missing).toEqual([]);
    expect(text).toMatch(
      /^BVV Versicherungsverein des Bankgewerbes a\.G\.\nStraße der Pariser Kommune 8\n10243 Berlin\n\nBerlin, den 07\.09\.2026\nUnser Zeichen: 2026\/0815-KC\n\nAntrag/
    );
    expect(text).toContain(
      'zeigen wir an, dass wir Herrn Emily Carter anwaltlich vertreten.'
    );
    expect(text).toContain(
      'Kontoinhaber: Vividius Rechtsanwälte – Anderkonto\nIBAN: DE02 1001 0010 0000 0000 01\nBIC: PBNKDEFFXXX\nBank: Postbank\nVerwendungszweck: 2026/0815-KC – Emily Carter\n\nSteuerliche Hinweise'
    );
    expect(text).toContain(
      'Steuerliche Identifikationsnummer: 98 765 432 109.'
    );
    expect(text).toContain(
      'Mit freundlichen Grüßen\n\nKatja Chudoba\nRechtsanwältin\n\nAnlagen'
    );
    expect(text).toContain(
      'Anlagen\n1. Vollmacht (Original)\n2. Erstattungsbescheid der Deutschen Rentenversicherung vom 02.07.2026 (Kopie)\n3. Kopie Reisepass unseres Mandanten\n4. Antragsformular „Antrag auf Abfindung einer Rentenanwartschaft“ (ausgefüllt und unterschrieben)\n5. Zustimmungserklärung des ehemaligen Arbeitgebers\n6. Nachweis der Krankenversicherung in den USA'
    );
  });

  it('pays out to the client account when payout_target is client', () => {
    const { text } = getBavTemplate('A-LAW').render(full());
    expect(text).toContain(
      'Kontoinhaber: Emily Carter\nIBAN: BE19 9056 9182 3912\nBIC: TRWIBEB1XXX\nBank: Wise Europe SA, Rue du Trône 100, 1050 Brüssel, Belgien\nDas Konto lautet auf den Namen unserer Mandantin.\n\nSteuerliche'
    );
    expect(text).not.toContain('Anderkonto');
  });

  it('renders "Ihr Zeichen" only when a recipient reference exists', () => {
    expect(getBavTemplate('A-LAW').render(full()).text).not.toContain(
      'Ihr Zeichen'
    );
    expect(
      getBavTemplate('A-LAW').render(full({ recipient_ref: 'BVV-99' })).text
    ).toContain('Unser Zeichen: 2026/0815-KC\nIhr Zeichen: BVV-99\n\nAntrag');
  });
});

describe('B templates', () => {
  it('B-DIRECT: pension benefit form cites the monthly threshold', () => {
    const { text, missing } = getBavTemplate('B-DIRECT').render(
      full(ROUTE_B_EXTRAS)
    );
    expect(missing).toEqual([]);
    expect(text).toContain(
      'Nach der mir vorliegenden Standmitteilung vom 31.12.2025 beträgt der Monatsbetrag der bei Erreichen der vorgesehenen Altersgrenze zu erwartenden laufenden Leistung 41,20 EUR. Die Anwartschaft übersteigt damit nicht die Grenze des § 3 Abs. 2 Satz 1 BetrAVG von 1,5 Prozent der monatlichen Bezugsgröße nach § 18 SGB IV (im Jahr 2026: 59,33 EUR monatlich).'
    );
    expect(text).toContain(
      'Anlagen\n1. Standmitteilung vom 31.12.2025 (Kopie)\n2. Postempfangsvollmacht (Original)\n3. Kopie Reisepass\n'
    );
    expect(text).toContain(
      'Ich habe Deutschland zum 15.03.2021 dauerhaft verlassen und lebe in den USA.'
    );
  });

  it('B-LAW: capital benefit form cites the capital threshold', () => {
    const { text, missing } = getBavTemplate('B-LAW').render(
      full({
        ...ROUTE_B_EXTRAS,
        benefit_form: 'capital',
        benefit_amount: '6.500,00',
        statement_type: 'Versicherungsschein',
      })
    );
    expect(missing).toEqual([]);
    expect(text).toContain(
      'zu erwartende Kapitalleistung 6.500,00 EUR. Die Anwartschaft übersteigt damit nicht die Grenze des § 3 Abs. 2 Satz 1 BetrAVG von achtzehn Zehnteln der monatlichen Bezugsgröße nach § 18 SGB IV (im Jahr 2026: 7.119,00 EUR).'
    );
    expect(text).toContain(
      'Anlagen\n1. Vollmacht (Original)\n2. Versicherungsschein vom 31.12.2025 (Kopie)\n3. Kopie Reisepass unserer Mandantin\n'
    );
    expect(text).toContain(
      'Soweit Sie für die Durchführung der Abfindung die Zustimmung des ehemaligen Arbeitgebers benötigen, ist diese beigefügt.'
    );
  });

  it('B-LAW: unknown benefit form asks the provider to determine the value', () => {
    const { text } = getBavTemplate('B-LAW').render(
      full({ ...ROUTE_B_EXTRAS, benefit_form: 'unknown', benefit_amount: '' })
    );
    expect(text).toContain(
      '(im Jahr 2026: 59,33 EUR monatlich bzw. 7.119,00 EUR). Wir bitten um Prüfung und Mitteilung des maßgeblichen Wertes.'
    );
    expect(text).not.toContain('Standmitteilung vom 31.12.2025 beträgt');
  });
});

describe('powers of attorney', () => {
  it('PEV inflects Vollmachtgeber/in and lists the case identifiers', () => {
    const f = getBavTemplate('PEV').render(full()).text;
    expect(f).toContain(
      'Korrespondenzpartner: BVV Versicherungsverein des Bankgewerbes a.G., Berlin\nVertrags-Nr.: 1234567-8-9012\n\nVollmachtgeberin:\nName: Emily Carter\nGeburtsdatum, Geburtsort: 03.10.1986, Albany, USA\nAnschrift: 42 Maple Avenue, Latham, NY 12110, USA'
    );
    expect(f).toContain('(nachfolgend „Vollmachtgeberin“)');
    expect(f).toContain(
      'wieder unmittelbar an die Vollmachtgeberin zuzustellen.'
    );
    expect(f).toContain(
      'Diese Vollmacht gilt ab dem 07.09.2026 bis auf Widerruf'
    );
    expect(f).toContain('Unterschrift Vollmachtgeberin');

    const m = getBavTemplate('PEV').render(full({ client_gender: 'm' })).text;
    expect(m).toContain('\nVollmachtgeber:\nName: Emily Carter');
    expect(m).toContain(
      'wieder unmittelbar an den Vollmachtgeber zuzustellen.'
    );
  });

  it('VOLL names the matter with provider and contract reference', () => {
    const { text, missing } = getBavTemplate('VOLL').render(full());
    expect(missing).toEqual([]);
    expect(text).toContain(
      'wird von\n\nFrau\nEmily Carter,\ngeb. am 03.10.1986,\nPass-Nr.: X12345678,\nwohnhaft 42 Maple Avenue, Latham, NY 12110, USA\n\nin Sachen\n\nAbfindung der betrieblichen Altersversorgung aus dem Arbeitsverhältnis mit Beispielbank AG (durchgeführt über BVV Versicherungsverein des Bankgewerbes a.G., Vertrags-Nr. 1234567-8-9012) – Vertretung gegenüber'
    );
    expect(text).toMatch(
      /Latham, den 07\.09\.2026\n\n\[Unterschrift\]\nEmily Carter$/
    );
  });

  it('VOLL omits the provider clause for a Direktzusage', () => {
    const { text } = getBavTemplate('VOLL').render(
      full({ durchfuehrungsweg: 'Direktzusage', provider_name: '' })
    );
    expect(text).toContain('mit Beispielbank AG – Vertretung gegenüber');
  });
});
