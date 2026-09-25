/**
 * German guide-capture copy, verbatim from gpr-lead-endpoint-v7.3.gs
 * (GUIDES config + ID02 disclaimers). Do not reword.
 */
import type { GuideKey } from '../config';

export const ID02_DE_GUIDE =
  'Germany Pension Refund ist ein privater Dienstleister. Wir sind nicht Teil der Deutschen Rentenversicherung und weder mit ihr noch mit einer anderen Behörde verbunden; den Antrag stellen Sie direkt bei der Deutschen Rentenversicherung, die Antragstellung dort ist kostenlos.';

export const ID02_DE_OPTION =
  'Germany Pension Refund ist ein privater Dienstleister. Wir sind nicht Teil der Deutschen Rentenversicherung und weder mit ihr noch mit einer anderen Behörde verbunden. Sie können Ihren Antrag auch ohne unseren Service direkt bei der Deutschen Rentenversicherung stellen; die Rentenversicherung erhebt keine Antragsgebühr.';

export interface GuideCopy {
  subject: string;
  withPdf: string;
  withoutPdf: string;
  requestedWhat: string;
  disclaimer: string;
  teamSubject: string;
  reminderSubject: string;
  reminderBody: (
    applyLabel: string,
    urls: { pageUrl: string; siteUrl: string; senderName: string }
  ) => string;
}

export const GUIDE_COPY: Record<GuideKey, GuideCopy> = {
  v0900: {
    subject: 'Ihre V0900-Anleitung als PDF',
    withPdf:
      'im Anhang finden Sie die komplette V0900-Anleitung als PDF, inklusive der Checkliste aller Unterlagen.',
    withoutPdf:
      'die komplette V0900-Anleitung inklusive Checkliste finden Sie hier: ',
    requestedWhat: 'die Anleitung',
    disclaimer: ID02_DE_GUIDE,
    teamSubject: 'V0900-Leitfaden angefordert',
    reminderSubject: 'Erinnerung: Ihre Wartefrist endet bald',
    reminderBody: (applyLabel, { pageUrl, senderName }) =>
      'Guten Tag,\n\nSie hatten um diese Erinnerung gebeten: Nach Ihren Angaben ist Ihre 24-monatige Wartefrist voraussichtlich ab dem ' +
      applyLabel +
      ' erfüllt — ab diesem Tag kann der V0900-Antrag gestellt werden, sofern die übrigen Voraussetzungen weiterhin erfüllt sind.\n\n' +
      'Die Anleitung: ' +
      pageUrl +
      '\n\nFreundliche Grüße\n' +
      senderName,
  },
  wegzug: {
    subject: 'Ihre Checkliste für den Wegzug als PDF',
    withPdf:
      'im Anhang finden Sie die Checkliste vor dem Wegzug als PDF — mit den Wartefrist-Regeln und den Unterlagen, die Sie noch in Deutschland sichern sollten.',
    withoutPdf:
      'die Checkliste vor dem Wegzug mit den Wartefrist-Regeln finden Sie hier: ',
    requestedWhat: 'die Checkliste',
    disclaimer: ID02_DE_OPTION,
    teamSubject: 'Wegzugs-Checkliste angefordert',
    reminderSubject: 'Erinnerung: Ihre Wartefrist endet bald',
    reminderBody: (applyLabel, { pageUrl, siteUrl, senderName }) =>
      'Guten Tag,\n\nSie hatten um diese Erinnerung gebeten: Nach Ihren Angaben ist Ihre 24-monatige Wartefrist voraussichtlich ab dem ' +
      applyLabel +
      ' erfüllt — ab diesem Tag kann der Antrag auf Beitragserstattung aus dem Ausland gestellt werden, sofern die übrigen Voraussetzungen weiterhin erfüllt sind ' +
      '(Staatsangehörigkeit, Wohnsitz außerhalb der EU und des Vereinigten Königreichs, keine neue Pflichtversicherung seit Ihrem letzten Beitrag).\n\n' +
      'Alle Regeln und die Checkliste: ' +
      pageUrl +
      '\n\n' +
      'Wenn Sie möchten, bereiten wir alles für Sie vor; eingereicht wird der Antrag über unsere deutsche Partnerkanzlei am ersten möglichen Tag. ' +
      'Sie zahlen erst, wenn Ihre Erstattung eingegangen ist — 9,75 % des Erstattungsbetrags, gedeckelt bei 2.500 € inklusive MwSt., ohne Vorauszahlung und ohne Mindestgebühr (' +
      siteUrl +
      '/pricing).\n' +
      'Start: ' +
      siteUrl +
      '/get-your-refund\n\n' +
      ID02_DE_OPTION +
      '\n\nFreundliche Grüße\n' +
      senderName,
  },
};
