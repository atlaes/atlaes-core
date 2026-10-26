/**
 * 24-month waiting-period math and copy, ported from
 * `gpr-waiting-period-calculator-v1.2.html` (10 Sep 2026). LOGIC: last
 * insured month + 24 full calendar months → apply from the 1st of the 25th
 * month. The German strings render the same rules with the wording of the
 * German hub (`/rentenbeitragserstattung`, Wartefrist section) and the
 * verdict fragments recorded in the hub handoff's widget E2E.
 */

export type WidgetLang = 'en' | 'de';

export type WaitingStatus = 'not-started' | 'complete' | 'pending';

export interface WaitingPeriodResult {
  status: WaitingStatus;
  /** Month index (year * 12 + month - 1) of the first possible filing month. */
  applyIndex: number;
  applyYear: number;
  /** 1–12 */
  applyMonth: number;
  /** Last month of the waiting period (the 24th month). */
  endYear: number;
  endMonth: number;
  /** Months until the first possible filing month (pending only). */
  remainingMonths: number;
}

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function fromIndex(idx: number): { year: number; month: number } {
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/**
 * `lastYear`/`lastMonth` = the last month of compulsory pension insurance.
 * `now` is injectable for tests.
 */
export function computeWaitingPeriod(
  lastYear: number,
  lastMonth: number,
  now: Date = new Date()
): WaitingPeriodResult {
  const last = monthIndex(lastYear, lastMonth);
  const nowIdx = monthIndex(now.getFullYear(), now.getMonth() + 1);
  // 24 full months after the last insured month, apply from the 1st of the next
  const applyIndex = last + 25;
  const apply = fromIndex(applyIndex);
  const end = fromIndex(applyIndex - 1);
  let status: WaitingStatus;
  if (last >= nowIdx) status = 'not-started';
  else if (nowIdx >= applyIndex) status = 'complete';
  else status = 'pending';
  return {
    status,
    applyIndex,
    applyYear: apply.year,
    applyMonth: apply.month,
    endYear: end.year,
    endMonth: end.month,
    remainingMonths: Math.max(0, applyIndex - nowIdx),
  };
}

export const MONTHS: Record<WidgetLang, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
};

/** "1 April 2027" / "1. April 2027" */
export function formatApplyDate(
  lang: WidgetLang,
  year: number,
  month: number
): string {
  const m = MONTHS[lang][month - 1];
  return lang === 'de' ? `1. ${m} ${year}` : `1 ${m} ${year}`;
}

/** "March 2027" / "März 2027" */
export function formatMonthYear(
  lang: WidgetLang,
  year: number,
  month: number
): string {
  return `${MONTHS[lang][month - 1]} ${year}`;
}

export interface WaitingVerdictCopy {
  title: string;
  /** Large line (complete / pending only). */
  big?: string;
  /** Body paragraph; `{date}` slots already filled. */
  body: string;
  notes: string[];
}

export interface WaitingPeriodStrings {
  heading: string;
  intro: string;
  label: string;
  hint: string;
  monthLabel: string;
  yearLabel: string;
  calculate: string;
  reset: string;
  cta: string;
  footnote: string;
  verdict: (r: WaitingPeriodResult) => WaitingVerdictCopy;
}

const EN: WaitingPeriodStrings = {
  heading: 'When can I apply? The 24-month waiting period',
  intro:
    'Find the exact date from which you can submit your refund application.',
  label:
    'Your last month working under mandatory pension insurance in Germany, the EU, the UK, Türkiye, or an ex-Yugoslav state (Bosnia and Herzegovina, Kosovo, Montenegro, North Macedonia, Serbia)',
  hint: 'Count months receiving German unemployment benefit (Arbeitslosengeld, ALG I) and child-raising periods (Kindererziehungszeiten) too — they normally count as compulsory-contribution months. A bonus paid out after you left does not move the start of the waiting period, as long as it does not create an additional compulsory-contribution month in your insurance record; Kosovo’s mandatory individual pension fund (Trust/KPST) does not count as mandatory insurance. Working in any of the countries above restarts the clock — that’s why the question covers all of them, not just Germany.',
  monthLabel: 'Month',
  yearLabel: 'Year',
  calculate: 'Calculate my application date',
  reset: '← Start over',
  cta: 'Prepare my claim with Germany Pension Refund',
  footnote:
    'The 24-month waiting period runs from your last relevant mandatory-insurance month (§210 SGB VI). Starting new mandatory insurance in the countries listed above before you apply restarts it. Exceptions: the waiting period does not apply to a refund at German retirement age when the five-year qualifying period is not met, or to survivors’ refunds. This is not legal advice.',
  verdict: (r) => {
    const apply = formatApplyDate('en', r.applyYear, r.applyMonth);
    const clock =
      'The clock runs from your last insured month — not from the date you deregistered or left the country, and not from when your employer transferred the final payroll.';
    if (r.status === 'not-started') {
      return {
        title: 'Your waiting period hasn’t started yet',
        body: `You selected the current month or a future month. The 24 months only start counting after your last insured month has ended. Once it has, your earliest application date will be ${apply} — provided you don’t work under mandatory insurance in the countries above in the meantime.`,
        notes: [clock],
      };
    }
    if (r.status === 'complete') {
      return {
        title: 'Good news — your waiting period is complete',
        big: 'You can apply now',
        body: `Your 24-month waiting period ended and you have been able to apply since ${apply} — provided you haven’t worked under mandatory insurance in Germany, the EU, the UK, Türkiye or an ex-Yugoslav state since. If you have, the clock restarted from that last insured month.`,
        notes: [
          'There is no exclusion period for a first application — you can file it years later. But no interest accrues for the time before the application.',
          clock,
        ],
      };
    }
    const n = r.remainingMonths;
    return {
      title: `Almost there — ${n} ${n === 1 ? 'month' : 'months'} to go`,
      big: `You can apply from ${apply}`,
      body: `The 24-month waiting period runs through the end of ${formatMonthYear('en', r.endYear, r.endMonth)}. Use the waiting time to prepare: get your insurance record (Versicherungsverlauf), collect payslips and your deregistration certificate, and have the application ready to send on day one.`,
      notes: [
        'We recommend filing once the waiting period has ended — filing early does not shorten it and can lead to additional confirmation requests from the pension office. Use the last weeks to prepare.',
        'Careful with new jobs: starting mandatory insurance in Germany, the EU, the UK, Türkiye or an ex-Yugoslav state before you apply restarts your 24 months from that insurance’s end.',
        clock,
      ],
    };
  },
};

const DE_COUNTRIES =
  'Deutschland, einem EU-Staat, dem Vereinigten Königreich, der Türkei, Bosnien und Herzegowina, dem Kosovo, Montenegro, Nordmazedonien oder Serbien';

const DE: WaitingPeriodStrings = {
  heading: 'Ab wann kann ich beantragen? Die 24-monatige Wartefrist',
  intro:
    'Der Rechner findet das genaue Datum, ab dem Ihr Antrag erstmals gestellt werden kann.',
  label: `Ihr letzter Monat mit Pflichtversicherung zur Rente in ${DE_COUNTRIES}`,
  hint: 'Auch Monate mit Arbeitslosengeld und Kindererziehungszeiten sind Pflichtbeitragszeiten: Beziehen Sie nach dem Ende der Beschäftigung noch Arbeitslosengeld oder endet eine Kindererziehungszeit später, beginnt die Wartefrist erst nach dem letzten dieser Monate. Eine Bonuszahlung nach dem Ausscheiden verschiebt den Fristbeginn nicht, solange dadurch kein zusätzlicher Pflichtbeitragsmonat in Ihrem Versicherungskonto entsteht; der verpflichtende individuelle Pensionsfonds im Kosovo (Trust/KPST) ist ein Sparkonto, keine staatliche Rentenversicherung. Eine neue Pflichtversicherung in einem der genannten Länder vor der Antragstellung setzt die Frist zurück – deshalb fragt der Rechner nach allen diesen Ländern, nicht nur nach Deutschland.',
  monthLabel: 'Monat',
  yearLabel: 'Jahr',
  calculate: 'Antragsdatum berechnen',
  reset: '← Neu beginnen',
  cta: 'Antrag mit Germany Pension Refund vorbereiten',
  footnote:
    'Die 24-monatige Wartefrist läuft ab Ihrem letzten maßgeblichen Pflichtversicherungsmonat (§ 210 SGB VI). Eine neue Pflichtversicherung in den genannten Ländern vor der Antragstellung setzt sie zurück. Keine Wartefrist gilt an der Regelaltersgrenze bei nicht erfüllter allgemeiner Wartezeit von fünf Jahren und für Hinterbliebene. Diese Berechnung ist eine allgemeine Information, keine Rechtsberatung.',
  verdict: (r) => {
    const apply = formatApplyDate('de', r.applyYear, r.applyMonth);
    const clock =
      'Die Frist beginnt nach dem letzten Pflichtbeitragsmonat – nicht mit der Abmeldung, nicht mit dem Ausreisetag und nicht mit der letzten Gehaltszahlung.';
    if (r.status === 'not-started') {
      return {
        title: 'Ihre Wartefrist hat noch nicht begonnen',
        body: `Sie haben den laufenden oder einen künftigen Monat gewählt. Die 24 Monate zählen erst, wenn Ihr letzter Pflichtversicherungsmonat beendet ist. Danach ist Ihr Antrag frühestens am ${apply} möglich – sofern Sie bis dahin in den genannten Ländern keine neue Pflichtversicherung beginnen.`,
        notes: [clock],
      };
    }
    if (r.status === 'complete') {
      return {
        title: 'Gute Nachricht – Ihre Wartefrist ist abgelaufen',
        big: 'Sie können jetzt beantragen',
        body: `Ihre 24-monatige Wartefrist ist abgelaufen; der Antrag ist seit dem ${apply} möglich – sofern Sie seitdem in ${DE_COUNTRIES} keine neue Pflichtversicherung hatten. Andernfalls läuft die Frist nach deren Ende neu.`,
        notes: [
          'Für den Erstantrag besteht keine Ausschlussfrist — Sie können ihn auch Jahre später stellen. Für die Zeit vor der Antragstellung fallen aber keine Zinsen an.',
          clock,
        ],
      };
    }
    const n = r.remainingMonths;
    return {
      title: `Fast geschafft – noch ${n} ${n === 1 ? 'Monat' : 'Monate'}`,
      big: `Antrag möglich ab ${apply}`,
      body: `Die 24-monatige Wartefrist läuft bis Ende ${formatMonthYear('de', r.endYear, r.endMonth)}. Nutzen Sie die Wartezeit zur Vorbereitung: Versicherungsverlauf anfordern, Gehaltsabrechnungen und Abmeldebescheinigung zusammenstellen – und den Antrag am ersten möglichen Tag einreichen.`,
      notes: [
        'Ein Antrag vor Fristablauf wird abgelehnt und kann zusätzliche Nachweisforderungen auslösen; die Vorbereitung darf früher beginnen.',
        `Vorsicht bei neuen Beschäftigungen: Eine neue Pflichtversicherung in ${DE_COUNTRIES} vor der Antragstellung setzt die Frist zurück – nach ihrem Ende laufen erneut 24 Kalendermonate.`,
        clock,
      ],
    };
  },
};

export const WAITING_PERIOD_STRINGS: Record<WidgetLang, WaitingPeriodStrings> =
  { en: EN, de: DE };
