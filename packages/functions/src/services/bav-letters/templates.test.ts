import { describe, expect, it } from 'vitest';
import { buildBavLetterPlan, type BavLetterClaimFields } from './context';
import {
  MUSTER_2_DIRECT_VESTED_EXPECTED,
  MUSTER_2_LETTER_CLAIM,
  MUSTER_2_OPTIONS,
  TEST_LAW_FIRM_ACCOUNT,
} from './muster-2.fixture';
import {
  BAV_COVER_TEMPLATE_IDS,
  BAV_TEMPLATE_IDS,
  getBavTemplate,
  loadBavTemplateSource,
} from './templates';

const LEFTOVER_TOKEN = /\{\{|\}\}|\[\[|\]\]/;

const nonVested = (o: Partial<BavLetterClaimFields> = {}) => ({
  ...MUSTER_2_LETTER_CLAIM,
  bavClaimStatus: 'non_vested',
  bavApplicationTitle: 'Antrag auf Beitragserstattung',
  ...o,
});

function planFor(
  route: 'direct' | 'law_firm',
  status: 'vested' | 'non_vested'
) {
  return buildBavLetterPlan(
    status === 'vested'
      ? { ...MUSTER_2_LETTER_CLAIM, lawFirmRef: '06152-26' }
      : nonVested({ lawFirmRef: '06152-26' }),
    {
      ...MUSTER_2_OPTIONS,
      route,
      lawFirmAccount: route === 'law_firm' ? TEST_LAW_FIRM_ACCOUNT : null,
    }
  );
}

describe('bAV template assets', () => {
  it('loads and compiles all six templates', () => {
    for (const id of BAV_TEMPLATE_IDS) {
      expect(loadBavTemplateSource(id).length).toBeGreaterThan(100);
      expect(() => getBavTemplate(id)).not.toThrow();
    }
  });

  it('renders every route × status letter and its authority without gaps', () => {
    for (const route of ['direct', 'law_firm'] as const) {
      for (const status of ['vested', 'non_vested'] as const) {
        const plan = planFor(route, status);
        expect(plan.issues, `${route}/${status}`).toEqual([]);
        for (const id of [plan.templateId!, plan.authority]) {
          const { text, missing } = getBavTemplate(id).render(plan.context);
          expect(missing, id).toEqual([]);
          expect(text, id).not.toMatch(LEFTOVER_TOKEN);
          expect(text, id).not.toMatch(/\n\s*\n\s*\n/);
        }
      }
    }
  });

  it('no longer carries a hardcoded postal agent address or e-mail', () => {
    for (const id of BAV_TEMPLATE_IDS) {
      const src = loadBavTemplateSource(id);
      expect(src, id).not.toMatch(/Kliem|Kaskel|assistenz|@gmail/);
    }
  });
});

describe('DIRECT-VESTED (Muster 2)', () => {
  it('matches the owner text exactly, with the decision date fixed in', () => {
    const plan = buildBavLetterPlan(MUSTER_2_LETTER_CLAIM, MUSTER_2_OPTIONS);
    expect(plan.templateId).toBe('DIRECT-VESTED');
    const { text, missing } = getBavTemplate('DIRECT-VESTED').render(
      plan.context
    );
    expect(missing).toEqual([]);
    expect(text).toBe(MUSTER_2_DIRECT_VESTED_EXPECTED);
  });

  it('prints the postal agent from the settings', () => {
    const plan = buildBavLetterPlan(MUSTER_2_LETTER_CLAIM, {
      ...MUSTER_2_OPTIONS,
      postalAgent: {
        name: 'Max Muster',
        coLine: 'c/o Beispiel GmbH',
        street: 'Musterweg 1',
        postalCode: '12345',
        city: 'Musterstadt',
      },
    });
    const { text } = getBavTemplate('DIRECT-VESTED').render(plan.context);
    expect(text).toContain(
      'habe ich Max Muster mit der beigefügten Postempfangsvollmacht bevollmächtigt. Bitte senden Sie die Korrespondenz einschließlich Bescheiden an:\nMax Muster\nc/o Beispiel GmbH\nMusterweg 1\n12345 Musterstadt\n'
    );
    const pev = getBavTemplate('PEV').render(plan.context).text;
    expect(pev).toContain('Max Muster\nc/o Beispiel GmbH\nMusterweg 1');
    expect(pev).toContain('Max Muster darf diese Post öffnen');
  });
});

describe('DIRECT-NON_VESTED', () => {
  it('uses the configured application title and no employment or DRV lines', () => {
    const plan = buildBavLetterPlan(nonVested(), MUSTER_2_OPTIONS);
    expect(plan.templateId).toBe('DIRECT-NON_VESTED');
    const { text } = getBavTemplate('DIRECT-NON_VESTED').render(plan.context);
    expect(text).toContain('\n\nAntrag auf Beitragserstattung\n\nName: Emily');
    expect(text).toContain(
      'hiermit beantrage ich die einmalige Auszahlung des nach den für meine Versorgung geltenden Regelungen erstattungsfähigen Betrags.'
    );
    expect(text).not.toContain('Arbeitsverhältnis');
    expect(text).not.toContain('§ 3 Abs. 3');
  });
});

describe('law-firm letters', () => {
  it('carry the sender line, Per beA, the AZ, the Anderkonto and the lawyer', () => {
    const plan = planFor('law_firm', 'vested');
    expect(plan.templateId).toBe('LAW-VESTED');
    const { text } = getBavTemplate('LAW-VESTED').render(plan.context);
    expect(text.split('\n').slice(0, 7)).toEqual([
      'Vividius · Gneisenaustraße 115 · 10961 Berlin',
      'BVV Versicherungsverein des Bankgewerbes a.G.',
      'Straße der Pariser Kommune 8',
      '10243 Berlin',
      '',
      'Per beA',
      '',
    ]);
    expect(text).toContain('Berlin, den 07.09.2026\nUnser Zeichen: 06152-26');
    expect(text).toContain(
      'Kanzleikonto:\nKontoinhaber: Vividius Rechtsanwälte – Anderkonto\nBank: Commerzbank\nIBAN: DE89 3704 0044 0532 0130 00\nBIC: COBADEFFXXX'
    );
    expect(text).toContain(
      'Mit freundlichen Grüßen\n\nKatja Chudoba\nRechtsanwältin'
    );
    expect(text).toContain('1. Vollmacht\n2. Erstattungsbescheid');
    expect(text).not.toContain('Emily Carter\n42 Maple');
  });

  it('omits the "Unser Zeichen" line until the firm has saved the AZ', () => {
    const plan = buildBavLetterPlan(
      { ...MUSTER_2_LETTER_CLAIM, lawFirmRef: null },
      {
        ...MUSTER_2_OPTIONS,
        route: 'law_firm',
        lawFirmAccount: TEST_LAW_FIRM_ACCOUNT,
      }
    );
    expect(plan.issues).toEqual([
      expect.objectContaining({ field: 'law_firm_az', blocking: false }),
    ]);
    const { text, missing } = getBavTemplate('LAW-VESTED').render(plan.context);
    expect(missing).toEqual([]);
    expect(text).not.toContain('Unser Zeichen');
  });

  it('the Vollmacht names the procedure, recipient and reference', () => {
    const plan = planFor('law_firm', 'non_vested');
    const { text } = getBavTemplate('VOLL').render(plan.context);
    expect(text).toContain(
      'Für das Verfahren „Antrag auf Beitragserstattung“ bei BVV Versicherungsverein des Bankgewerbes a.G. (betriebliche Altersversorgung aus dem Arbeitsverhältnis mit Beispielbank AG)'
    );
    expect(text).toContain(
      'wohnhaft 42 Maple Avenue, Latham, NY 12110, USA,\nVertrags-Nr.: 0012345678,\nbevollmächtige die\n\nVividius Rechtsanwälte\nZuständige Rechtsanwältin: Katja Chudoba\nGneisenaustr. 115\n10961 Berlin'
    );
    expect(text).toContain('Latham, 07.09.2026\n\n[Unterschrift]');
  });
});

describe('cover template ids', () => {
  it('has exactly the four route × status letters', () => {
    expect(BAV_COVER_TEMPLATE_IDS).toEqual([
      'DIRECT-VESTED',
      'DIRECT-NON_VESTED',
      'LAW-VESTED',
      'LAW-NON_VESTED',
    ]);
  });
});
