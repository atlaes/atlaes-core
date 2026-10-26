/**
 * `/rentenbeitragserstattung` — the German hub. Copy verbatim from
 * GPR_DraftC_Hub_Content_Handoff_2026-09-04.md v1.3.3 (7 Sep 2026), page
 * copy PASS (Sol review 3). German number formats as written in the handoff
 * (11.571,66 €, 9,75 %, 76,3 %); the quarterly values (Appendix A: M-04,
 * M-17, TM-01/M-12/M-19/M-20, M-15/M-16, M-14) are literal here because the
 * token store carries only the English renderings — refresh 2026-11-24 must
 * touch this file. Links: www URLs as site paths, the de. URLs of the
 * handoff as the same-path pages of this platform (/download,
 * /refund-calculator, /pricing).
 */
import type { Block, FaqItem, RichText } from '@/content/types';
import { EXTERNAL, FUNNEL_ENTRY } from '@/content/registries/links';

export const PATH = '/rentenbeitragserstattung';

const V0900 = '/v0900-formular';
const V0901 = '/v0901-pension-refund-form-english';
const SSN = '/post/german-social-security-number';
const GUIDE = '/post/how-to-get-a-german-pension-refund';
const WIDOW = '/post/german-widow-pension';
const OFFICE = '/post/which-german-pension-office-handles-your-claim';
const PROCESSING = '/german-pension-refund-processing-time';
const DOWNLOADS = '/download';
const CALCULATOR = '/refund-calculator';
const PRICING = '/pricing';
const TURKEY = '/turkey';

export const HUB_META = {
  title: 'Rentenbeitragserstattung nach dem Wegzug aus Deutschland (2026)',
  description:
    'Rentenbeitragserstattung nach dem Wegzug aus Deutschland: drei Voraussetzungen, 24-Monats-Wartefrist, Checkliste vor dem Wegzug – und wie viel zurückkommt.',
};

/** Schema headline = title minus „(2026)“; also breadcrumb item 2. */
export const HUB_HEADLINE =
  'Rentenbeitragserstattung nach dem Wegzug aus Deutschland';

export const HUB_H1 =
  'Rentenbeiträge zurückbekommen, wenn Sie Deutschland verlassen: Wer die Beitragserstattung erhält – und wann';

/** Publish date (the handoff leaves both dates to the build). */
export const HUB_DATES = { published: '2026-09-28', modified: '2026-09-28' };

export const HUB_IMAGE =
  'https://static.wixstatic.com/media/da88a8_eeadb28f689f4702b5a53c1ff8bab97d~mv2.png';

export const HUB_HERO: Block[] = [
  {
    t: 'p',
    x: 'Kurz erklärt: Wer Deutschland verlässt, kann sich die selbst gezahlten Rentenbeiträge unter drei Voraussetzungen von der Deutschen Rentenversicherung (DRV) erstatten lassen. Erstens: Sie besitzen keine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit – auch nicht als zweite; ein solcher Pass blockiert diesen Erstattungsweg, selbst wenn Sie ihn nie benutzen. Zweitens: Sie leben außerhalb der EU und des Vereinigten Königreichs (zusätzliche Wohnsitzregeln gelten für Indien, Israel, Bosnien und Herzegowina, den Kosovo, Montenegro und Serbien – siehe unten). Drittens: Seit Ihrem letzten Pflichtbeitrag zur Rentenversicherung – in Deutschland, einem EU-Staat, dem Vereinigten Königreich, der Türkei, Bosnien und Herzegowina, dem Kosovo, Montenegro, Nordmazedonien oder Serbien – sind 24 volle Kalendermonate vergangen; der Antrag ist frühestens am 1. Tag des 25. Monats möglich. Erstattet wird der Arbeitnehmeranteil Ihrer Pflichtbeiträge – der Arbeitgeberanteil bleibt im System. Für Staatsangehörige der USA, Indiens, Kanadas, Australiens, Brasiliens, Südkoreas, der Philippinen, Albaniens, Moldaus, Nordmazedoniens und Uruguays – sowie für japanische Staatsangehörige, anerkannte Flüchtlinge und Staatenlose, solange sie in Japan leben – kommt eine Grenze hinzu: Die Erstattung vor der Regelaltersgrenze ist nur mit höchstens 59 deutschen Beitragsmonaten möglich; ab 60 Monaten haben diese Staatsangehörigen stattdessen Anspruch auf eine deutsche Rente ab der Regelaltersgrenze. Für jede andere Staatsangehörigkeit gibt es keine Monatsgrenze.',
    sp: [
      { k: 'b', x: 'Kurz erklärt:' },
      { k: 'b', x: 'Erstens:' },
      { k: 'b', x: 'Zweitens:' },
      { k: 'b', x: 'Drittens:' },
      { k: 'b', x: 'Arbeitnehmeranteil' },
    ],
  },
  {
    t: 'p',
    x: 'Sie sind deutsche Staatsangehörige oder deutscher Staatsangehöriger? Allein wegen des Wegzugs können Sie sich Ihre Beiträge vor der Regelaltersgrenze grundsätzlich nicht erstatten lassen. Das gilt grundsätzlich auch für Bürgerinnen und Bürger der EU, des EWR, der Schweiz und des Vereinigten Königreichs. Die Beiträge bleiben in Ihrem Versicherungskonto; eine später erworbene Rente wird auch ins Ausland gezahlt. Eine Ausnahme kann für Personen gelten, die dauerhaft versicherungsfrei oder von der Versicherungspflicht befreit sind und die allgemeine Wartezeit von fünf Jahren nicht erfüllen – insbesondere bestimmte Beamtinnen und Beamte, Richterinnen und Richter sowie Berufssoldatinnen und Berufssoldaten. An der Regelaltersgrenze ist eine Erstattung möglich, wenn die allgemeine Wartezeit nicht erfüllt ist (Formular V0900 im Inland, V0901 aus dem Ausland). Diese Ausnahme und die Erstattung an der Regelaltersgrenze erklärt unsere Anleitung zum Formular V0900.',
    sp: [
      {
        k: 'b',
        x: 'Sie sind deutsche Staatsangehörige oder deutscher Staatsangehöriger?',
      },
      { k: 'a', x: 'Anleitung zum Formular V0900', href: V0900 },
    ],
  },
];

/** ID-02-DE + no-advice sentence (blockquote in the handoff). */
export const HUB_DISCLAIMER =
  'Germany Pension Refund ist ein privater Dienstleister. Wir sind nicht Teil der Deutschen Rentenversicherung und weder mit ihr noch mit einer anderen Behörde verbunden. Den Antrag stellen Sie direkt bei der Deutschen Rentenversicherung; die Antragstellung dort ist kostenlos. Diese Anleitung ist eine allgemeine Information, keine Rechts- oder Steuerberatung.';

export const HUB_JUMP_LABEL = 'Direkt zu';
export const HUB_JUMP = [
  { href: '#checkliste', label: 'Checkliste vor dem Wegzug' },
  { href: '#wartefrist', label: 'Wartefrist' },
  { href: '#60-monate', label: '60-Monats-Grenze' },
  { href: '#wohnsitz', label: 'Wohnsitzregeln' },
  { href: '#auszahlung', label: 'Auszahlung und Höhe' },
  { href: '#hinterbliebene', label: 'Hinterbliebene' },
  { href: '#service', label: 'Selbst beantragen oder mit uns' },
  { href: '#faq', label: 'Häufige Fragen' },
];

export interface HubSection {
  id: string;
  /** Rail label (design element). */
  label: string;
  h2: string;
  blocks: Block[];
}

export const HUB_SECTIONS: HubSection[] = [
  {
    id: 'checkliste',
    label: 'Checkliste',
    h2: 'Vor dem Wegzug: die Checkliste',
    blocks: [
      {
        t: 'p',
        x: 'Der Antrag selbst ist erst nach der Wartefrist möglich – aber die Unterlagen dafür sind in Deutschland leichter zu beschaffen als aus dem Ausland. Sichern Sie diese Dinge, bevor Sie gehen:',
      },
      {
        t: 'ol',
        items: [
          {
            x: 'Versicherungsnummer notieren. Sie steht auf dem Sozialversicherungsausweis, auf Gehaltsabrechnungen, auf der jährlichen Renteninformation und auf jedem Schreiben der DRV (wo Sie sie finden, auf Englisch). Fehlt sie später, helfen wir, sie zu ermitteln oder wiederzubeschaffen – und lässt sie sich nicht finden, kann der Antrag auch über andere Identifikationsmerkmale eingereicht werden, etwa vollständiger Name, Geburtsdatum und letzte Meldeadresse in Deutschland. Ohne Nummer kann die Bearbeitung aber länger dauern.',
            sp: [
              { k: 'b', x: 'Versicherungsnummer notieren.' },
              { k: 'a', x: 'wo Sie sie finden', href: SSN },
            ],
          },
          {
            x: 'Beschäftigungsnachweise aufbewahren. Arbeitsverträge, Gehaltsabrechnungen – mindestens die erste und die letzte jedes Arbeitsverhältnisses – und die jährlichen Meldebescheinigungen zur Sozialversicherung. Sie belegen Zeiten und Beiträge, falls Ihr Versicherungskonto Lücken zeigt, und machen die Schätzung Ihrer Erstattungssumme genauer.',
            sp: [{ k: 'b', x: 'Beschäftigungsnachweise aufbewahren.' }],
          },
          {
            x: 'Versicherungsverlauf – hilfreich, kein Muss. Der offizielle Versicherungsverlauf der DRV zeigt Ihre Beitragsmonate verlässlich; erinnerte Zeiträume sind Schätzungen. Wichtig ist er vor allem, wenn für Ihre Staatsangehörigkeit die 60-Monats-Grenze gilt. Sie können ihn mit Ihrer Versicherungsnummer bei der DRV anfordern. Wer den Antrag selbst stellt, sollte ihn haben; im betreuten Verfahren beschaffen und prüfen wir die relevanten DRV-Kontoinformationen im Rahmen des Verfahrens, soweit erforderlich.',
            sp: [{ k: 'b', x: 'Versicherungsverlauf – hilfreich, kein Muss.' }],
          },
          {
            x: 'Abmelden – und die Abmeldebescheinigung aufheben. Melden Sie sich beim Einwohnermeldeamt ab und bewahren Sie die Abmeldebescheinigung auf: Sie belegt Ihren Wegzug und gehört zu den Unterlagen, nach denen wir für den betreuten Antrag fragen. Schon im Ausland und nie abgemeldet? Die deutsche Abmeldung ist als optionale Zusatzleistung für 50 € inkl. MwSt. erhältlich, fällig zusammen mit der Servicegebühr nach Eingang der Erstattung.',
            sp: [
              {
                k: 'b',
                x: 'Abmelden – und die Abmeldebescheinigung aufheben.',
              },
            ],
          },
          {
            x: 'Erreichbar bleiben. Die DRV schreibt per Brief und auf Deutsch – an die letzte ihr bekannte Adresse. Teilen Sie ihr eine erreichbare Anschrift mit oder richten Sie einen Nachsendeauftrag ein. Im betreuten Verfahren werden Schreiben der Rentenversicherung an einer deutschen Adresse empfangen, Ihnen als Scan weitergeleitet und erklärt; erreicht Sie ein Brief dennoch direkt, leiten Sie ihn einfach an uns weiter.',
            sp: [{ k: 'b', x: 'Erreichbar bleiben.' }],
          },
          {
            x: 'Kein deutsches Konto nötig. Sie müssen Ihr deutsches Bankkonto nicht behalten: Die Erstattung kann auf ein Konto im Ausland gezahlt werden. Im betreuten Verfahren läuft sie über das Anderkonto unserer deutschen Partnerkanzlei; nach Abzug der vereinbarten Gebühr wird der Restbetrag auf das von Ihnen benannte Konto überwiesen. Kontoinhaber-Prüfungen, internationale Sanktionen und Bankbeschränkungen können einschränken, wohin – und in welcher Währung – das Geld gesendet werden kann.',
            sp: [{ k: 'b', x: 'Kein deutsches Konto nötig.' }],
          },
          {
            x: 'Einbürgerung bedenken. Wer vor der Antragstellung eine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit erwirbt, verliert diesen Erstattungsweg wegen Wegzugs – auch neben der bisherigen Staatsangehörigkeit. Die Beiträge sind nicht verloren; sie bleiben im Konto für eine spätere Rente.',
            sp: [{ k: 'b', x: 'Einbürgerung bedenken.' }],
          },
        ],
      },
      {
        t: 'p',
        x: 'Was Sie vermeiden sollten:',
        sp: [{ k: 'b', x: 'Was Sie vermeiden sollten:' }],
      },
      {
        t: 'ul',
        items: [
          {
            x: 'Nicht zu früh beantragen. Ein Antrag vor Ablauf der Wartefrist wird abgelehnt – die Voraussetzungen müssen am Tag der Antragstellung vorliegen – und kann zusätzliche Nachweisforderungen auslösen. Vorbereiten dürfen Sie früher; beantragt wird erst am ersten möglichen Tag.',
            sp: [{ k: 'b', x: 'Nicht zu früh beantragen.' }],
          },
          {
            x: 'Keine neue Pflichtversicherung vor der Antragstellung in Deutschland, einem EU-Staat, dem Vereinigten Königreich, der Türkei, Bosnien und Herzegowina, dem Kosovo, Montenegro, Nordmazedonien oder Serbien: Sie startet die 24 Monate neu (Details unten).',
            sp: [
              {
                k: 'b',
                x: 'Keine neue Pflichtversicherung vor der Antragstellung',
              },
            ],
          },
          {
            x: 'Kein Wohnsitz in der EU oder im Vereinigten Königreich zum Zeitpunkt des Antrags: Er blockiert die Erstattung, solange er besteht. Ein neuer Wohnsitz dort verschiebt den Antrag; ein Besuch – auch in Deutschland – ist unproblematisch.',
            sp: [
              {
                k: 'b',
                x: 'Kein Wohnsitz in der EU oder im Vereinigten Königreich',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'wartefrist',
    label: 'Wartefrist',
    h2: 'Ab wann kann ich beantragen? Die 24-monatige Wartefrist',
    blocks: [
      {
        t: 'p',
        x: 'Frühestens am 1. Tag des 25. Kalendermonats nach Ihrem letzten Pflichtbeitrag. Die Wartefrist beträgt 24 volle Kalendermonate, beginnt nach dem letzten Pflichtbeitrag zur Rentenversicherung und endet mit dem letzten Tag des 24. Kalendermonats. Sie beginnt nicht mit der Abmeldung, nicht mit dem Ausreisetag und nicht mit der letzten Gehaltszahlung; eine Bonuszahlung nach dem Ausscheiden verschiebt den Fristbeginn nicht, solange dadurch kein zusätzlicher Pflichtbeitragsmonat in Ihrem Versicherungskonto entsteht. Beispiel: letzter Pflichtbeitrag im März 2025, Wartefrist April 2025 bis März 2027, Antrag ab 1. April 2027.',
      },
      {
        t: 'p',
        x: 'Maßgeblich ist die Pflichtversicherung zur Rente in Deutschland, einem EU-Staat, dem Vereinigten Königreich, der Türkei, Bosnien und Herzegowina, dem Kosovo, Montenegro, Nordmazedonien oder Serbien. Auch Monate mit Arbeitslosengeld und Kindererziehungszeiten sind Pflichtbeitragszeiten: Beziehen Sie nach dem Ende der Beschäftigung noch Arbeitslosengeld oder endet eine Kindererziehungszeit später, beginnt die Wartefrist erst nach dem letzten dieser Monate. Eine Pflichtversicherung außerhalb der genannten Länder – etwa in den USA, Kanada, Australien, Indien oder Südkorea – berührt die Frist nicht, und der verpflichtende individuelle Pensionsfonds im Kosovo (Trust/KPST) ist ein Sparkonto, keine staatliche Rentenversicherung: Er blockiert die Erstattung nicht und startet die Frist nicht neu.',
      },
      {
        t: 'p',
        x: 'Neue Pflichtversicherung in einem der genannten Länder vor der Antragstellung setzt die Frist zurück: Nach ihrem Ende laufen erneut 24 Kalendermonate – auch dann, wenn die erste Frist bereits abgelaufen war. Ein Minijob zählt nur dann nicht als Pflichtversicherung, wenn er rentenversicherungsfrei ist oder Sie sich von der Versicherungspflicht haben befreien lassen und der Arbeitgeber lediglich Pauschalbeiträge zahlt; ein Minijob mit eigenem Rentenbeitrag ist dagegen Pflichtversicherung. Eine Beschäftigung, die erst nach der Antragstellung beginnt, schadet nicht, wenn die Voraussetzungen am Antragstag vorlagen.',
      },
      {
        t: 'p',
        x: 'Ein Antrag vor Fristablauf wird abgelehnt und kann zusätzliche Nachweisforderungen auslösen; die Vorbereitung darf früher beginnen. Für den Erstantrag besteht keine Ausschlussfrist; Sie können ihn auch Jahre später stellen. Für die Zeit vor der Antragstellung fallen keine Zinsen an. Im betreuten Verfahren vervollständigen wir Ihre Unterlagen schon während der Wartefrist; eingereicht wird über unsere deutsche Partnerkanzlei am ersten möglichen Tag.',
      },
      {
        t: 'p',
        x: 'Keine Wartefrist gilt an der Regelaltersgrenze bei nicht erfüllter allgemeiner Wartezeit von fünf Jahren und für Hinterbliebene.',
      },
      {
        t: 'p',
        x: 'Wartefrist-Rechner: Der Rechner findet das genaue Datum, ab dem Ihr Antrag erstmals gestellt werden kann.',
        sp: [{ k: 'b', x: 'Wartefrist-Rechner:' }],
      },
    ],
  },
  {
    id: '60-monate',
    label: '60-Monats-Grenze',
    h2: 'Gilt die 60-Monats-Grenze für mich? Erstattung nach fünf Jahren',
    blocks: [
      {
        t: 'p',
        x: 'Ob eine Monatsgrenze gilt, entscheidet Ihre Staatsangehörigkeit – nicht die Zahl der Jahre allein. Staatsangehörige der USA, Indiens, Kanadas, Australiens, Brasiliens, Südkoreas, der Philippinen, Albaniens, Moldaus, Nordmazedoniens und Uruguays – sowie japanische Staatsangehörige, anerkannte Flüchtlinge und Staatenlose, solange sie in Japan leben – können die Erstattung vor der Regelaltersgrenze nur mit höchstens 59 deutschen Beitragsmonaten erhalten; ab 60 Monaten haben diese Staatsangehörigen stattdessen Anspruch auf eine deutsche Rente ab der Regelaltersgrenze, die auch ins Ausland gezahlt wird. Japanische Staatsangehörige außerhalb Japans unterliegen keiner Grenze. Für jede andere Staatsangehörigkeit gibt es keine Monatsgrenze: Türkische, chilenische, marokkanische, tunesische, israelische, bosnische, kosovarische, montenegrinische und serbische Staatsangehörige – und Staatsangehörige aller übrigen Länder, etwa China oder Mexiko – können sich auch 60, 100 oder 200 Beitragsmonate erstatten lassen, sobald die allgemeinen Voraussetzungen erfüllt sind. Für sie ist die Erstattung dann eine Entweder-oder-Entscheidung: Sie zahlt den gesamten erstattungsfähigen Betrag aus und löst das Versicherungsverhältnis auf; eine spätere deutsche Rente aus diesen Monaten gibt es nicht mehr.',
      },
      {
        t: 'p',
        x: 'Zwei Fünf-Jahres-Begriffe, die nicht verwechselt werden dürfen: Die 60-Monats-Grenze ist eine Abkommensregel für die oben genannten Staatsangehörigkeiten und gilt vor der Regelaltersgrenze. Die allgemeine Wartezeit von fünf Jahren (ebenfalls 60 Monate) gilt für alle und entscheidet an der Regelaltersgrenze – und für Hinterbliebene –, ob eine Rente oder eine Erstattung in Betracht kommt.',
        sp: [
          { k: 'b', x: '60-Monats-Grenze' },
          { k: 'b', x: 'allgemeine Wartezeit' },
        ],
      },
      {
        t: 'p',
        x: 'So zählen die Monate: Ein einziger versicherter Tag in einem Kalendermonat zählt als voller Monat. Zur 60-Monats-Grenze zählen nur deutsche Monate – Versicherungszeiten im Heimatland, etwa im indischen EPF oder in der US-Sozialversicherung, zählen nicht mit. Angerechnet werden Monate mit Arbeitslosengeld und Kindererziehungszeiten (36 Kalendermonate pro Kind bei Geburten ab 1992, für frühere Geburten weniger; Feststellung über das Formular V0800); Berücksichtigungszeiten bis zum 10. Geburtstag des Kindes zählen nicht, und ein Monat mit Arbeit und Kindererziehung zugleich zählt einmal. Verlässlich ist nur der offizielle Versicherungsverlauf. Wer einer der genannten Staatsangehörigkeiten angehört und nahe an 60 Monaten liegt, sollte ihn kennen, bevor er plant: Ab dem 60. Monat gibt es für diese Staatsangehörigen statt der Erstattung die Rente ab der Regelaltersgrenze. Alle Regeln im Detail: der vollständige Leitfaden 2026 (auf Englisch).',
        sp: [{ k: 'a', x: 'der vollständige Leitfaden 2026', href: GUIDE }],
      },
    ],
  },
  {
    id: 'wohnsitz',
    label: 'Wohnsitz',
    h2: 'Wo Sie leben, entscheidet mit: die Wohnsitzregeln',
    blocks: [
      {
        t: 'p',
        x: 'Die Erstattung setzt einen Wohnsitz außerhalb der EU und des Vereinigten Königreichs voraus; Norwegen, Island, Liechtenstein und die Schweiz sind unschädlich, sofern Sie nicht deren Staatsangehörigkeit besitzen. Drei Sonderregeln kommen hinzu: Ein Wohnsitz in Indien blockiert die Erstattung für alle Staatsangehörigkeiten außer der indischen. Israelische Staatsangehörige und dort anerkannte Flüchtlinge erhalten keine Erstattung vor der Regelaltersgrenze, solange sie in Israel leben. Staatsangehörige Bosnien und Herzegowinas, des Kosovo, Montenegros und Serbiens erhalten sie nicht, solange sie in einem dieser vier Staaten leben; ein Wohnsitz in Nordmazedonien blockiert sie dagegen nicht. Für alle anderen Staatsangehörigkeiten spielt der Wohnort außerhalb der EU und des Vereinigten Königreichs keine Rolle. Außerhalb der EU und des Vereinigten Königreichs blockiert eine Pflichtversicherung zur Rente nur in der Türkei, in Nordmazedonien und in den vier genannten Staaten – solange sie läuft – und startet die 24-monatige Wartefrist neu. Lokale Systeme anderswo – Social Security, CPP, Superannuation, NPS, SSS, INSS, AFP, CNSS, Bituach Leumi – blockieren nie und starten nichts neu. Anerkannte Flüchtlinge und Staatenlose werden wie Staatsangehörige ihres Wohnsitzlandes behandelt.',
        sp: [
          { k: 'b', x: 'Indien' },
          { k: 'b', x: 'Israelische' },
          {
            k: 'b',
            x: 'Bosnien und Herzegowinas, des Kosovo, Montenegros und Serbiens',
          },
        ],
      },
    ],
  },
  {
    id: 'auszahlung',
    label: 'Auszahlung',
    h2: '„Rente auszahlen lassen“ – was beim Wegzug aus Deutschland wirklich geht',
    blocks: [
      {
        t: 'p',
        x: 'Eine Auszahlung der gesetzlichen Altersrente als Einmalbetrag gibt es nicht – auch nicht als Wahlrecht beim Wegzug ins Ausland. Was es gibt, ist die Beitragserstattung nach § 210 SGB VI: die Rückzahlung Ihres Arbeitnehmeranteils, wenn die Voraussetzungen erfüllt sind – keine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit, Wohnsitz außerhalb der EU und des Vereinigten Königreichs, abgelaufene 24-monatige Wartefrist. Wer nach „Rente auszahlen lassen“, „Rentenrückzahlung“ oder „Rückerstattung der Rentenversicherung für Ausländer“ sucht, meint fast immer diese Erstattung. Für deutsche, EU-, EWR-, Schweizer und britische Staatsangehörige gibt es sie allein wegen des Wegzugs vor der Regelaltersgrenze grundsätzlich nicht – Ausnahme: dauerhaft versicherungsfreie oder befreite Personen ohne erfüllte allgemeine Wartezeit (siehe oben); ihre Beiträge bleiben im Konto, und die Rente wird später auch ins Ausland gezahlt. Wer die allgemeine Wartezeit erfüllt und sich nicht erstatten lässt – bei den Staatsangehörigkeiten mit 60-Monats-Grenze ab 60 Monaten zwingend –, erhält an der Regelaltersgrenze eine monatliche Rente, keine Einmalzahlung. Eine Einmalzahlung kann es dagegen aus einer betrieblichen Altersversorgung geben: Nach einer durchgeführten Beitragserstattung kann eine unverfallbare Betriebsrenten-Anwartschaft abgefunden werden (§ 3 Abs. 3 BetrAVG). Auf Wunsch prüfen wir nach erfolgreicher Erstattung gesondert, ob eine solche Abfindung in Ihrem Fall möglich ist – ein eigener Service mit eigener Vereinbarung, nicht Teil der Erstattungsgebühr; anders als die Beitragserstattung kann die Abfindung im Wohnsitzland und gegebenenfalls in Deutschland steuerpflichtig sein.',
        sp: [{ k: 'b', x: 'Beitragserstattung' }],
      },
      { t: 'h3', x: 'Wie viel kommt zurück?' },
      {
        t: 'p',
        x: 'Erstattet wird der Arbeitnehmeranteil Ihrer Pflichtbeiträge – seit 2018 sind das 9,3 % des Bruttogehalts bis zur monatlichen Beitragsbemessungsgrenze (8.450 € im Jahr 2026, 8.050 € im Jahr 2025); auf Gehalt oberhalb der Grenze wurden keine Beiträge einbehalten. Der Arbeitgeberanteil bleibt im System. Freiwillige Beiträge und Pflichtbeiträge von Selbstständigen werden gesetzlich nur zur Hälfte erstattet. Rechenbeispiel (vereinfacht): 36 Beitragsmonate seit 2018 mit 4.000 € Bruttogehalt ergeben 36 × 4.000 € × 9,3 % = 13.392 €. Hat die Rentenversicherung früher eine Leistung für Sie finanziert – etwa eine Rehabilitation –, sind nur die danach gezahlten Beiträge erstattungsfähig; die Erstattung löst trotzdem das gesamte Versicherungsverhältnis auf. Über unsere dokumentierten, abgeschlossenen und ausgezahlten Fälle über alle Nationalitäten hinweg lag die durchschnittliche Erstattung bei 11.571,66 € und der Median bei 10.327,10 € (Stand der Berechnung: 24. August 2026) – aktenkundig: abgeschlossene Erstattungen von unter 200 € bis über 53.000 €. Die Auszahlung erfolgt ohne deutschen Steuerabzug – das deutsche Recht stellt Beitragserstattungen steuerfrei; Ihr Wohnsitzland kann das anders behandeln, und Steuerberatung leisten wir nicht. Ihre eigene Zahl: Unser Erstattungsrechner (Rechner auf Englisch) rechnet mit dem tatsächlichen Arbeitnehmer-Beitragssatz und der Beitragsbemessungsgrenze jedes Jahres seit 1975 – einschließlich DM-Zeiten und der Ost-West-Unterschiede – statt mit einem pauschalen Prozentsatz; die Berechnung selbst läuft in Ihrem Browser.',
        sp: [{ k: 'a', x: 'Erstattungsrechner', href: CALCULATOR }],
      },
    ],
  },
  {
    id: 'hinterbliebene',
    label: 'Hinterbliebene',
    h2: 'Beitragserstattung für Hinterbliebene',
    blocks: [
      {
        t: 'p',
        x: 'Stirbt eine versicherte Person und besteht wegen nicht erfüllter – auch nicht als erfüllt geltender oder vorzeitig erfüllter – allgemeiner Wartezeit kein Anspruch auf eine Rente wegen Todes, kann eine Beitragserstattung für die gesetzlich berechtigten Hinterbliebenen in Betracht kommen; bei dieser Prüfung zählen auch ausländische Versicherungszeiten mit, die nach Europarecht oder einem Sozialversicherungsabkommen zusammengerechnet werden. Anspruchsberechtigt sind Ehe- oder Lebenspartner sowie Waisen, sofern deren persönliche Voraussetzungen erfüllt sind (in der Regel bis zum 18. Geburtstag, in Schul- oder Berufsausbildung bis zum 27.). Für Halbwaisen gilt zusätzlich, dass kein anspruchsberechtigter Ehe- oder Lebenspartner vorhanden sein darf; Vollwaisen können auch neben einem Partner anspruchsberechtigt sein. Eine 24-monatige Wartefrist gilt nicht. Der Erstattungsanspruch kann grundsätzlich vier Jahre nach Ablauf des Todesjahres verjähren. Erfüllt das Konto die Wartezeit, kommt stattdessen eine Witwen-, Witwer- oder Waisenrente in Betracht – beide Wege erklärt unser Ratgeber zur deutschen Witwenrente (auf Englisch). Eine betreute Hinterbliebenen-Erstattung läuft zu denselben Konditionen wie die Erstattung eigener Beiträge; die Beantragung einer Witwen- oder Witwerrente selbst gehört nicht zu unserem Angebot.',
        sp: [{ k: 'a', x: 'Ratgeber zur deutschen Witwenrente', href: WIDOW }],
      },
    ],
  },
  {
    id: 'service',
    label: 'Service',
    h2: 'Selbst beantragen – oder mit uns',
    blocks: [
      {
        t: 'p',
        x: 'Selbst beantragen. Den Antrag können Sie selbst und kostenlos bei der Deutschen Rentenversicherung stellen. Aus dem Ausland ist das Formular V0901 maßgeblich (türkische Staatsangehörige: das zweisprachige Formular E5816), dazu die Zahlungserklärung A1310 für die Auszahlung; V0900 gilt nur für Antragsteller, die in Deutschland leben. Der Antrag aus dem Ausland läuft auf dem Papierweg, weil einfache E-Mail aus Identitätsgründen nicht als Antragsweg akzeptiert wird; die Bestätigung Ihrer persönlichen Daten erfolgt auf dem Formular selbst – das Formular reist also zur bestätigenden Stelle. Zuständig ist je nach Versicherungskonto und Staatsangehörigkeit ein bestimmter Rentenversicherungsträger; ein falsch adressierter Antrag wird weitergeleitet, und das kostet Wochen. Hilfen: unsere V0901-Anleitung (auf Englisch), das Formularverzeichnis mit allen offiziellen DRV-Downloads und der Artikel zum zuständigen Rentenversicherungsträger mit Träger-Finder (auf Englisch).',
        sp: [
          { k: 'b', x: 'Selbst beantragen.' },
          { k: 'b', x: 'V0901' },
          { k: 'b', x: 'E5816' },
          { k: 'b', x: 'A1310' },
          { k: 'a', x: 'V0901-Anleitung', href: V0901 },
          {
            k: 'a',
            x: 'Formularverzeichnis mit allen offiziellen DRV-Downloads',
            href: DOWNLOADS,
          },
          {
            k: 'a',
            x: 'Artikel zum zuständigen Rentenversicherungsträger mit Träger-Finder',
            href: OFFICE,
          },
        ],
      },
      {
        t: 'p',
        x: 'Mit uns. Wir prüfen Ihren Anspruch vorab, bereiten Antrags- und Zahlungsunterlagen aus Ihren Angaben vor und ermitteln den voraussichtlich zuständigen Rentenversicherungsträger; eingereicht wird der Antrag über unsere deutsche Partnerkanzlei am ersten möglichen Tag nach Ablauf der Wartefrist. Behördenpost wird an einer deutschen Adresse empfangen und Ihnen erklärt, bekannte Antwort- und Widerspruchsfristen werden im vereinbarten Rahmen überwacht, und Sie erhalten während des laufenden Antrags mindestens alle vier Wochen ein Status-Update – auch dann, wenn das ehrliche Update „noch keine Neuigkeiten“ lautet. Für die meisten Kundinnen und Kunden läuft ihr Teil des Verfahrens digital. Ein Dokument braucht in der Regel einen zusätzlichen Bestätigungsschritt: die Bestätigung Ihrer persönlichen Daten und Unterschrift auf einer einzelnen Seite, die wir für Sie vorbereiten. Je nach Fall kann die Bestätigung digital oder durch einen Notar beziehungsweise eine andere vom zuständigen Rentenversicherungsträger akzeptierte Stelle erfolgen; etwaige lokale Beglaubigungskosten tragen Sie. Ist die DRV Oldenburg-Bremen für Ihre Erstattung zuständig, bereiten wir Vollmacht und Zahlungserklärung vor und bitten Sie, uns die unterschriebenen Originale zu schicken – eine eng begrenzte Ausnahme, nicht die Regel.',
        sp: [{ k: 'b', x: 'Mit uns.' }],
      },
      {
        t: 'p',
        x: 'Wie lange es dauert. Mehr als drei Viertel unserer 300 zuletzt abgeschlossenen Erstattungen erreichten das Anderkonto unserer deutschen Partnerkanzlei innerhalb von drei Monaten – 229 von 300 (76,3 %) innerhalb von 90 Tagen nach vollständiger Einreichung, bei einem Median von rund 41 Tagen; 93,3 % erreichten es innerhalb von sechs Monaten (alle Daten und die Methodik, auf Englisch). Das sind unsere dokumentierten abgeschlossenen Fälle, keine Zusage für einen neuen Antrag: Die Dauer im Einzelfall variiert, das Tempo bestimmt der zuständige Rentenversicherungsträger. Das deutsche Recht kann ab dem siebten Kalendermonat nach Eingang eines vollständigen Antrags 4 % Zinsen pro Jahr vorsehen.',
        sp: [
          { k: 'b', x: 'Wie lange es dauert.' },
          { k: 'a', x: 'alle Daten und die Methodik', href: PROCESSING },
        ],
      },
      {
        t: 'p',
        x: 'Die Gebühr. 9,75 % des Erstattungsbetrags, gedeckelt bei 2.500 € inklusive MwSt. – ohne Vorauszahlung und ohne Mindestgebühr. Sie zahlen erst, nachdem Ihre Erstattung auf dem Anderkonto eingegangen ist; bringt der betreute Antrag keine Erstattung, fällt keine Kernservice-Gebühr an. Die Gebühr deckt den vereinbarten administrativen Rahmen einschließlich der Unterstützung unserer Partnerkanzlei innerhalb dieses Rahmens; eine gesonderte Vertretung in Widerspruchs-, Klage- oder Gerichtsverfahren ist nicht automatisch enthalten. Wir leisten administrative Unterstützung – keine Rechtsdienstleistungen, Rechtsberatung oder Vertretung; regulierte rechtliche Unterstützung innerhalb des vereinbarten Rahmens leistet eine externe deutsche Kanzlei. Versandkosten an uns, örtliche Beglaubigungskosten und außergewöhnliche Kurierkosten tragen Sie, sofern nicht ausdrücklich anders vereinbart.',
        sp: [
          { k: 'b', x: 'Die Gebühr.' },
          { k: 'a', x: '9,75 % des Erstattungsbetrags', href: PRICING },
        ],
      },
    ],
  },
];

/** Trust line in the service block (M-15/M-16 compact form, M-14). */
export const HUB_TRUST: RichText = {
  x: 'Über 4,9/5 auf ProvenExpert aus mehr als 1.250 Bewertungen · Unsere aktuell dokumentierten Fälle belegen mehr als 22 Millionen Euro erstattete Beiträge seit November 2022. Der Start dauert weniger als eine Minute.',
  sp: [{ k: 'a', x: 'ProvenExpert', href: EXTERNAL.provenExpert }],
};

export const HUB_CTA = {
  check: { label: 'Anspruch prüfen', href: CALCULATOR },
  start: { label: 'Erstattung starten', href: FUNNEL_ENTRY },
};

export const HUB_FAQ_H2 = 'Häufige Fragen';

export interface HubFaq {
  q: string;
  /** Visible answer. */
  blocks: Block[];
  /** Plain text of the answer (schema mirror). */
  a: string;
  /** Q8 (Türkei) and Q9 (Gebühr) are visible-only (Appendix B.1). */
  inSchema: boolean;
}

export const HUB_FAQ: HubFaq[] = [
  {
    q: 'Bekomme ich meine Rentenbeiträge nach fünf Jahren Beitragszahlung noch zurück?',
    a: 'Das entscheidet Ihre Staatsangehörigkeit, nicht die Zahl der Jahre allein. Staatsangehörige der USA, Indiens, Kanadas, Australiens, Brasiliens, Südkoreas, der Philippinen, Albaniens, Moldaus, Nordmazedoniens und Uruguays – sowie japanische Staatsangehörige, anerkannte Flüchtlinge und Staatenlose, solange sie in Japan leben – erhalten die Erstattung vor der Regelaltersgrenze nur mit höchstens 59 deutschen Beitragsmonaten; ab 60 Monaten haben sie stattdessen Anspruch auf eine deutsche Rente ab der Regelaltersgrenze. Für jede andere Staatsangehörigkeit gibt es keine Monatsgrenze: Die Erstattung bleibt mit 60 und mehr Monaten möglich, sobald die allgemeinen Voraussetzungen erfüllt sind – sie löst dann das Versicherungsverhältnis auf. Deutsche, EU-, EWR-, Schweizer und britische Staatsangehörige erhalten allein wegen des Wegzugs vor der Regelaltersgrenze grundsätzlich keine Erstattung – unabhängig von der Zahl der Monate; die Ausnahme für dauerhaft versicherungsfreie oder befreite Personen ohne erfüllte allgemeine Wartezeit erklärt unsere Anleitung zum Formular V0900.',
    blocks: [
      {
        t: 'p',
        x: 'Das entscheidet Ihre Staatsangehörigkeit, nicht die Zahl der Jahre allein. Staatsangehörige der USA, Indiens, Kanadas, Australiens, Brasiliens, Südkoreas, der Philippinen, Albaniens, Moldaus, Nordmazedoniens und Uruguays – sowie japanische Staatsangehörige, anerkannte Flüchtlinge und Staatenlose, solange sie in Japan leben – erhalten die Erstattung vor der Regelaltersgrenze nur mit höchstens 59 deutschen Beitragsmonaten; ab 60 Monaten haben sie stattdessen Anspruch auf eine deutsche Rente ab der Regelaltersgrenze. Für jede andere Staatsangehörigkeit gibt es keine Monatsgrenze: Die Erstattung bleibt mit 60 und mehr Monaten möglich, sobald die allgemeinen Voraussetzungen erfüllt sind – sie löst dann das Versicherungsverhältnis auf. Deutsche, EU-, EWR-, Schweizer und britische Staatsangehörige erhalten allein wegen des Wegzugs vor der Regelaltersgrenze grundsätzlich keine Erstattung – unabhängig von der Zahl der Monate; die Ausnahme für dauerhaft versicherungsfreie oder befreite Personen ohne erfüllte allgemeine Wartezeit erklärt unsere Anleitung zum Formular V0900.',
        sp: [{ k: 'a', x: 'Anleitung zum Formular V0900', href: V0900 }],
      },
    ],
    inSchema: true,
  },
  {
    q: 'Ab wann kann ich beantragen – und was setzt die Wartefrist zurück?',
    a: 'Frühestens am 1. Tag des 25. Kalendermonats nach Ihrem letzten Pflichtbeitrag; die Frist läuft ab dem letzten Beitragsmonat, nicht ab Abmeldung oder Ausreise. Zurückgesetzt wird sie durch jede neue Pflichtversicherung zur Rente in Deutschland, einem EU-Staat, dem Vereinigten Königreich, der Türkei, Bosnien und Herzegowina, dem Kosovo, Montenegro, Nordmazedonien oder Serbien vor der Antragstellung – danach laufen erneut 24 Monate. Monate mit Arbeitslosengeld und Kindererziehungszeiten zählen als Pflichtbeitragszeiten und verschieben den Fristbeginn; ein rentenversicherungsfreier oder von der Versicherungspflicht befreiter Minijob mit Pauschalbeiträgen des Arbeitgebers zählt nicht. Eine Beschäftigung, die erst nach der Antragstellung beginnt, schadet nicht, wenn die Voraussetzungen am Antragstag vorlagen.',
    blocks: [
      {
        t: 'p',
        x: 'Frühestens am 1. Tag des 25. Kalendermonats nach Ihrem letzten Pflichtbeitrag; die Frist läuft ab dem letzten Beitragsmonat, nicht ab Abmeldung oder Ausreise. Zurückgesetzt wird sie durch jede neue Pflichtversicherung zur Rente in Deutschland, einem EU-Staat, dem Vereinigten Königreich, der Türkei, Bosnien und Herzegowina, dem Kosovo, Montenegro, Nordmazedonien oder Serbien vor der Antragstellung – danach laufen erneut 24 Monate. Monate mit Arbeitslosengeld und Kindererziehungszeiten zählen als Pflichtbeitragszeiten und verschieben den Fristbeginn; ein rentenversicherungsfreier oder von der Versicherungspflicht befreiter Minijob mit Pauschalbeiträgen des Arbeitgebers zählt nicht. Eine Beschäftigung, die erst nach der Antragstellung beginnt, schadet nicht, wenn die Voraussetzungen am Antragstag vorlagen.',
      },
    ],
    inSchema: true,
  },
  {
    q: 'Zählen Kindererziehungszeiten und Monate mit Arbeitslosengeld?',
    a: 'Ja, in beide Richtungen. Sie sind Pflichtbeitragszeiten: Sie zählen zur 60-Monats-Grenze der betroffenen Staatsangehörigkeiten mit, und die 24-monatige Wartefrist beginnt erst nach dem letzten dieser Monate. Kindererziehungszeiten umfassen 36 Kalendermonate pro Kind bei Geburten ab 1992 (für frühere Geburten weniger) und setzen in der Regel die Erziehung in Deutschland voraus – nach dem Wegzug laufen sie meist nicht weiter; festgestellt werden sie über das Formular V0800. Bei gemeinsamer Erziehung können Eltern die Zuordnung der Kindererziehungszeit übereinstimmend erklären – für künftige Monate und höchstens zwei Kalendermonate rückwirkend; die Zuordnung entscheidet, in wessen Konto die Monate zählen. Berücksichtigungszeiten bis zum 10. Geburtstag des Kindes zählen nicht, und ein Monat mit Arbeit und Kindererziehung zugleich zählt einmal.',
    blocks: [
      {
        t: 'p',
        x: 'Ja, in beide Richtungen. Sie sind Pflichtbeitragszeiten: Sie zählen zur 60-Monats-Grenze der betroffenen Staatsangehörigkeiten mit, und die 24-monatige Wartefrist beginnt erst nach dem letzten dieser Monate. Kindererziehungszeiten umfassen 36 Kalendermonate pro Kind bei Geburten ab 1992 (für frühere Geburten weniger) und setzen in der Regel die Erziehung in Deutschland voraus – nach dem Wegzug laufen sie meist nicht weiter; festgestellt werden sie über das Formular V0800. Bei gemeinsamer Erziehung können Eltern die Zuordnung der Kindererziehungszeit übereinstimmend erklären – für künftige Monate und höchstens zwei Kalendermonate rückwirkend; die Zuordnung entscheidet, in wessen Konto die Monate zählen. Berücksichtigungszeiten bis zum 10. Geburtstag des Kindes zählen nicht, und ein Monat mit Arbeit und Kindererziehung zugleich zählt einmal.',
      },
    ],
    inSchema: true,
  },
  {
    q: 'Kann ich nach der Erstattung nach Deutschland zurückkehren?',
    a: 'Ja. Die Erstattung schließt Ihr bisheriges Versicherungskonto ab; wer später wieder in Deutschland arbeitet, begründet mit neuen Beitragszeiten neue Anwartschaften – die erstatteten Zeiten leben nicht wieder auf. Entscheidend ist der Tag der Antragstellung: Bestand an diesem Tag ein Erstattungsanspruch, blockiert ein danach begründeter Wohnsitz in Deutschland oder einem anderen EU-Staat die Erstattung nicht – auch nicht während des laufenden Verfahrens; dasselbe gilt für eine Beschäftigung, die erst nach der Antragstellung beginnt. Vor der Antragstellung ist es umgekehrt: Ein Wohnsitz in Deutschland oder einem anderen EU-Staat blockiert die Erstattung, solange er besteht, und eine neue Pflichtversicherung startet die Wartefrist neu.',
    blocks: [
      {
        t: 'p',
        x: 'Ja. Die Erstattung schließt Ihr bisheriges Versicherungskonto ab; wer später wieder in Deutschland arbeitet, begründet mit neuen Beitragszeiten neue Anwartschaften – die erstatteten Zeiten leben nicht wieder auf. Entscheidend ist der Tag der Antragstellung: Bestand an diesem Tag ein Erstattungsanspruch, blockiert ein danach begründeter Wohnsitz in Deutschland oder einem anderen EU-Staat die Erstattung nicht – auch nicht während des laufenden Verfahrens; dasselbe gilt für eine Beschäftigung, die erst nach der Antragstellung beginnt. Vor der Antragstellung ist es umgekehrt: Ein Wohnsitz in Deutschland oder einem anderen EU-Staat blockiert die Erstattung, solange er besteht, und eine neue Pflichtversicherung startet die Wartefrist neu.',
      },
    ],
    inSchema: true,
  },
  {
    q: 'V0900 oder V0901 – welches Formular brauche ich?',
    a: 'Wer im Ausland lebt, verwendet V0901 – Antrag auf Beitragserstattung bei Aufenthalt im Ausland (türkische Staatsangehörige: E5816). V0900 ist das Formular für Antragsteller, die in Deutschland leben – dauerhaft versicherungsfreie oder befreite Personen, Personen an der Regelaltersgrenze ohne erfüllte Wartezeit und Hinterbliebene. Unsere Anleitungen: V0901 (auf Englisch) und V0900.',
    // Two paragraphs so the link spans "V0901"/"V0900" resolve to the guide
    // mentions and not to the first occurrence in the sentence before.
    blocks: [
      {
        t: 'p',
        x: 'Wer im Ausland lebt, verwendet V0901 – Antrag auf Beitragserstattung bei Aufenthalt im Ausland (türkische Staatsangehörige: E5816). V0900 ist das Formular für Antragsteller, die in Deutschland leben – dauerhaft versicherungsfreie oder befreite Personen, Personen an der Regelaltersgrenze ohne erfüllte Wartezeit und Hinterbliebene.',
      },
      {
        t: 'p',
        x: 'Unsere Anleitungen: V0901 (auf Englisch) und V0900.',
        sp: [
          { k: 'a', x: 'V0901', href: V0901 },
          { k: 'a', x: 'V0900', href: V0900 },
        ],
      },
    ],
    inSchema: true,
  },
  {
    q: 'Ich habe zwei Staatsangehörigkeiten oder lasse mich einbürgern – was gilt?',
    a: 'Jede Staatsangehörigkeit zählt. Eine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit schließt die Erstattung wegen Wegzugs aus – auch als zweiter Pass, auch wenn Sie ihn nie benutzen; vor der Regelaltersgrenze bleibt dann grundsätzlich nur die Ausnahme für dauerhaft versicherungsfreie oder befreite Personen ohne erfüllte allgemeine Wartezeit (siehe oben). Wer vor der Antragstellung eine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit erwirbt, verliert diesen Erstattungsweg; die Beiträge bleiben dann im Konto für eine spätere Rente. Anerkannte Flüchtlinge und Staatenlose werden wie Staatsangehörige ihres Wohnsitzlandes behandelt.',
    blocks: [
      {
        t: 'p',
        x: 'Jede Staatsangehörigkeit zählt. Eine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit schließt die Erstattung wegen Wegzugs aus – auch als zweiter Pass, auch wenn Sie ihn nie benutzen; vor der Regelaltersgrenze bleibt dann grundsätzlich nur die Ausnahme für dauerhaft versicherungsfreie oder befreite Personen ohne erfüllte allgemeine Wartezeit (siehe oben). Wer vor der Antragstellung eine deutsche, EU-, EWR-, Schweizer oder britische Staatsangehörigkeit erwirbt, verliert diesen Erstattungsweg; die Beiträge bleiben dann im Konto für eine spätere Rente. Anerkannte Flüchtlinge und Staatenlose werden wie Staatsangehörige ihres Wohnsitzlandes behandelt.',
      },
    ],
    inSchema: true,
  },
  {
    q: 'Ich ziehe in ein anderes EU-Land, in die Schweiz oder nach Norwegen – geht die Erstattung?',
    a: 'Ein Wohnsitz in der EU oder im Vereinigten Königreich blockiert die Erstattung, solange er besteht, und eine dortige Pflichtversicherung startet die 24-monatige Wartefrist nach ihrem Ende neu. Ein Wohnsitz in der Schweiz, Norwegen, Island oder Liechtenstein ist dagegen unschädlich, sofern Sie nicht deren Staatsangehörigkeit besitzen. Für Personen aus der hier behandelten Zielgruppe – also ohne deutsche, EU-, EWR-, schweizerische oder britische Staatsangehörigkeit – startet eine Pflichtversicherung in der Schweiz, Norwegen, Island oder Liechtenstein die Wartefrist grundsätzlich nicht neu. Sonderfälle des persönlichen Geltungsbereichs des Europarechts müssen individuell geprüft werden. Erst wenn Sie außerhalb der EU und des Vereinigten Königreichs leben und die Wartefrist abgelaufen ist, kann der Antrag gestellt werden.',
    blocks: [
      {
        t: 'p',
        x: 'Ein Wohnsitz in der EU oder im Vereinigten Königreich blockiert die Erstattung, solange er besteht, und eine dortige Pflichtversicherung startet die 24-monatige Wartefrist nach ihrem Ende neu. Ein Wohnsitz in der Schweiz, Norwegen, Island oder Liechtenstein ist dagegen unschädlich, sofern Sie nicht deren Staatsangehörigkeit besitzen. Für Personen aus der hier behandelten Zielgruppe – also ohne deutsche, EU-, EWR-, schweizerische oder britische Staatsangehörigkeit – startet eine Pflichtversicherung in der Schweiz, Norwegen, Island oder Liechtenstein die Wartefrist grundsätzlich nicht neu. Sonderfälle des persönlichen Geltungsbereichs des Europarechts müssen individuell geprüft werden. Erst wenn Sie außerhalb der EU und des Vereinigten Königreichs leben und die Wartefrist abgelaufen ist, kann der Antrag gestellt werden.',
      },
    ],
    inSchema: true,
  },
  {
    q: 'Ich kehre in die Türkei oder nach Serbien, Bosnien und Herzegowina, in den Kosovo oder nach Montenegro zurück – was gilt?',
    a: 'Türkische Staatsangehörige haben keine 60-Monats-Grenze, und ein Wohnsitz in der Türkei blockiert nicht – aber eine laufende türkische Pflichtversicherung (SGK) setzt den Anspruch aus, und die Wartefrist beginnt erst nach ihrem Ende. Staatsangehörige Serbiens, Bosnien und Herzegowinas, des Kosovo und Montenegros erhalten vor der Regelaltersgrenze keine Erstattung, solange sie in einem dieser vier Staaten leben; von außerhalb gilt für sie keine Monatsgrenze. Nordmazedonische Staatsangehörige unterliegen der 60-Monats-Grenze, ein Wohnsitz in Nordmazedonien blockiert sie aber nicht. Für alle gilt: Eine Pflichtversicherung in der Türkei oder einem der ex-jugoslawischen Staaten blockiert, solange sie läuft, und startet die Wartefrist neu – der Pensionsfonds Trust/KPST im Kosovo ausgenommen. Mehr auf unserer Türkei-Seite (auf Englisch).',
    blocks: [
      {
        t: 'p',
        x: 'Türkische Staatsangehörige haben keine 60-Monats-Grenze, und ein Wohnsitz in der Türkei blockiert nicht – aber eine laufende türkische Pflichtversicherung (SGK) setzt den Anspruch aus, und die Wartefrist beginnt erst nach ihrem Ende. Staatsangehörige Serbiens, Bosnien und Herzegowinas, des Kosovo und Montenegros erhalten vor der Regelaltersgrenze keine Erstattung, solange sie in einem dieser vier Staaten leben; von außerhalb gilt für sie keine Monatsgrenze. Nordmazedonische Staatsangehörige unterliegen der 60-Monats-Grenze, ein Wohnsitz in Nordmazedonien blockiert sie aber nicht. Für alle gilt: Eine Pflichtversicherung in der Türkei oder einem der ex-jugoslawischen Staaten blockiert, solange sie läuft, und startet die Wartefrist neu – der Pensionsfonds Trust/KPST im Kosovo ausgenommen. Mehr auf unserer Türkei-Seite (auf Englisch).',
        sp: [{ k: 'a', x: 'Türkei-Seite', href: TURKEY }],
      },
    ],
    inSchema: false,
  },
  {
    q: 'Was kostet der betreute Antrag?',
    a: '9,75 % des Erstattungsbetrags, gedeckelt bei 2.500 € inklusive MwSt. – ohne Vorauszahlung und ohne Mindestgebühr, fällig erst nach Eingang Ihrer Erstattung; bringt der betreute Antrag keine Erstattung, fällt keine Kernservice-Gebühr an. Enthalten ist der vereinbarte administrative Rahmen einschließlich der Unterstützung unserer Partnerkanzlei innerhalb dieses Rahmens; eine gesonderte Vertretung in Widerspruchs-, Klage- oder Gerichtsverfahren ist nicht automatisch enthalten. Den Antrag selbst zu stellen ist kostenlos.',
    blocks: [
      {
        t: 'p',
        x: '9,75 % des Erstattungsbetrags, gedeckelt bei 2.500 € inklusive MwSt. – ohne Vorauszahlung und ohne Mindestgebühr, fällig erst nach Eingang Ihrer Erstattung; bringt der betreute Antrag keine Erstattung, fällt keine Kernservice-Gebühr an. Enthalten ist der vereinbarte administrative Rahmen einschließlich der Unterstützung unserer Partnerkanzlei innerhalb dieses Rahmens; eine gesonderte Vertretung in Widerspruchs-, Klage- oder Gerichtsverfahren ist nicht automatisch enthalten. Den Antrag selbst zu stellen ist kostenlos.',
      },
    ],
    inSchema: false,
  },
];

/** The 7 schema questions (Appendix B.1 entry 2), in visible order. */
export const HUB_FAQ_SCHEMA: FaqItem[] = HUB_FAQ.map((f) => ({
  q: f.q,
  a: f.a,
  inSchema: f.inSchema,
}));

export const HUB_CLOSE = {
  text: 'Bereit? Der Start dauert weniger als eine Minute – Sie zahlen erst, wenn Ihre Erstattung eingegangen ist.',
};

export const HUB_FOOTER = {
  org: 'Germany Pension Refund – betrieben von der ATLAES GmbH, Berlin. Wir sind ein privater Dienstleister und nicht Teil der Deutschen Rentenversicherung oder einer anderen Behörde.',
  sources:
    'Quellen: § 210 SGB VI (Beitragserstattung) und die Gemeinsamen Rechtlichen Anweisungen der Deutschen Rentenversicherung zu § 210 SGB VI (Wartefrist) · § 56 SGB VI (Kindererziehungszeiten) · § 45 SGB I (Verjährung) · § 3 Abs. 3 BetrAVG · § 3 Nr. 3b EStG · Sozialversicherungsabkommen der Bundesrepublik Deutschland · DRV-Formulare V0901, E5816, A1310, V0900 und V0800.',
  /** Build note 2: set to the publish date. */
  checked: 'Zuletzt geprüft: 28. September 2026',
};
