/**
 * Zahlungserklärung (payment instruction) — platform brief 2026-09-16,
 * templates D (German, authoritative) and E (English translation, below
 * it in the same PDF). One signature event for the combined document.
 *
 * Positions: 1 ATLAES amount to the ATLAES IBAN with the invoice number
 * as Verwendungszweck; 2 Vividius fee retained (omitted in the
 * small-refund variant, sections renumbered); 3 remaining amount with the
 * selected route sentence A/B/C and only the banking fields that route
 * needs. Footer: timestamp and document ID.
 *
 * `buildZahlungserklaerungText` is pure (unit tested); `render…` draws it
 * with pdf-lib and embeds the drawn signature.
 */

import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { A4 } from '../claim-pdf/constants';
import { wrapText } from '../claim-pdf/text-layout';
import {
  computeFeeSplit,
  type FeeConfig,
  type FeeSplit,
} from '../drv-pack/fee';

export type PayoutRoute = 'A' | 'B' | 'C';

export interface RecipientAccount {
  accountHolder: string;
  bank: string;
  /** IBAN or local account number. */
  accountNumber: string;
  bic?: string | null;
  /** Routing number / IFSC / sort code / BSB, where the route requires it. */
  routingLabel?: string | null;
  routingValue?: string | null;
  currency: string; // ISO 4217
}

export interface ZahlungserklaerungInput {
  firstName: string;
  lastName: string;
  aktenzeichen: string;
  amountReceivedEur: number;
  invoiceNumber: string;
  atlaesIban: string;
  route: PayoutRoute;
  account: RecipientAccount;
  /** Calendar date shown after "Datum:" (client's signing date). */
  date: Date;
  /** Signature timestamp for the footer. */
  signedAt: Date;
  documentId: string;
  feeConfig?: FeeConfig;
}

export interface ZeSection {
  heading?: string;
  lines: string[];
}

export interface ZahlungserklaerungText {
  split: FeeSplit;
  german: ZeSection[];
  english: ZeSection[];
}

export const EUR_DE = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const EUR_EN = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function dateDe(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function dateEn(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function stampDe(d: Date): string {
  return `${dateDe(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;
}
function stampEn(d: Date): string {
  return `${dateEn(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Banking lines for the selected route (only the fields that route needs). */
function accountLines(
  acc: RecipientAccount,
  route: PayoutRoute,
  lang: 'de' | 'en'
): string[] {
  const L =
    lang === 'de'
      ? {
          holder: 'Kontoinhaber',
          bank: 'Bank',
          number: 'IBAN/Kontonummer',
          bic: 'SWIFT/BIC',
          currency: 'Kontowährung',
        }
      : {
          holder: 'Account holder',
          bank: 'Bank',
          number: 'IBAN/account number',
          bic: 'SWIFT/BIC',
          currency: 'Account currency',
        };
  const lines = [`${L.holder}: ${acc.accountHolder} · ${L.bank}: ${acc.bank}`];
  const numberLine = [`${L.number}: ${acc.accountNumber}`];
  if (route !== 'A' || acc.bic) numberLine.push(`${L.bic}: ${acc.bic ?? '—'}`);
  lines.push(numberLine.join(' · '));
  if (route !== 'A' && acc.routingLabel && acc.routingValue) {
    lines.push(`${acc.routingLabel}: ${acc.routingValue}`);
  }
  if (route !== 'A') lines.push(`${L.currency}: ${acc.currency}`);
  return lines;
}

function routeSentence(
  route: PayoutRoute,
  currency: string,
  lang: 'de' | 'en'
): string {
  if (lang === 'de') {
    return {
      A: 'Der Restbetrag ist in Euro per SEPA auf das unten angegebene Konto zu überweisen.',
      B: `Ich beauftrage die Auszahlung über SummitFX mit Umrechnung in ${currency} auf das unten angegebene Konto.`,
      C: 'Der Restbetrag ist in Euro per SWIFT auf das unten angegebene Konto zu überweisen. Die Umrechnung in die Kontowährung erfolgt durch die Empfängerbank.',
    }[route];
  }
  return {
    A: 'The remaining amount is to be transferred in euros by SEPA to the account below.',
    B: `I instruct that the payout be made through SummitFX, with conversion into ${currency}, to the account below.`,
    C: 'The remaining amount is to be transferred in euros by SWIFT to the account below. The receiving bank will convert the payment into the account currency.',
  }[route];
}

export function buildZahlungserklaerungText(
  input: ZahlungserklaerungInput
): ZahlungserklaerungText {
  const split = computeFeeSplit(input.amountReceivedEur, input.feeConfig);
  const name = `${input.firstName} ${input.lastName}`;
  const de = (n: number) => EUR_DE.format(n);
  const en = (n: number) => EUR_EN.format(n);
  const small = split.smallRefund;
  const n3 = small ? 2 : 3;

  const german: ZeSection[] = [
    {
      heading: 'Zahlungserklärung',
      lines: [`Name: ${name} · Aktenzeichen Vividius: ${input.aktenzeichen}`],
    },
    {
      lines: [
        'Ich habe Vividius Rechtsanwälte Geldempfangsvollmacht für mein Beitragserstattungsverfahren gegenüber der Deutschen Rentenversicherung erteilt.',
        `Ich weise Vividius Rechtsanwälte an, den von der Deutschen Rentenversicherung bewilligten Erstattungsbetrag von ${de(input.amountReceivedEur)} EUR wie folgt auszuzahlen:`,
      ],
    },
    {
      lines: [
        `1. Überweisung an ATLAES GmbH: ${de(split.atlaesShare)} EUR`,
        `IBAN: ${input.atlaesIban} · Verwendungszweck: ${input.invoiceNumber}`,
      ],
    },
  ];
  if (!small) {
    german.push({
      lines: [
        `2. Vergütung Vividius Rechtsanwälte: ${de(split.lawFirmFee)} EUR einschließlich Umsatzsteuer`,
        'Dieser Betrag ist als Vergütung für die Rechtsdienstleistung von Vividius einzubehalten.',
      ],
    });
  }
  german.push(
    {
      lines: [
        `${n3}. Auszahlung des Restbetrags: ${de(split.clientAmount)} EUR`,
        routeSentence(input.route, input.account.currency, 'de'),
      ],
    },
    {
      heading: 'Empfängerkonto',
      lines: accountLines(input.account, input.route, 'de'),
    },
    {
      lines: [
        `Datum: ${dateDe(input.date)} · Unterschrift:`,
        `Elektronisch unterzeichnet im Kundenportal von Germany Pension Refund (ATLAES GmbH) am ${stampDe(input.signedAt)} · Dokument-ID ${input.documentId}`,
      ],
    }
  );

  const english: ZeSection[] = [
    {
      heading: 'Payment instruction',
      lines: [`Name: ${name} · Vividius file number: ${input.aktenzeichen}`],
    },
    {
      lines: [
        'I have authorised Vividius Rechtsanwälte to receive payments on my behalf in my contribution refund procedure with Deutsche Rentenversicherung.',
        `I instruct Vividius Rechtsanwälte to pay out the refund of EUR ${en(input.amountReceivedEur)} approved by Deutsche Rentenversicherung as follows:`,
      ],
    },
    {
      lines: [
        `1. Transfer to ATLAES GmbH: EUR ${en(split.atlaesShare)}`,
        `IBAN: ${input.atlaesIban} · Payment reference: ${input.invoiceNumber}`,
      ],
    },
  ];
  if (!small) {
    english.push({
      lines: [
        `2. Payment to Vividius Rechtsanwälte: EUR ${en(split.lawFirmFee)} including VAT`,
        'This amount is to be retained by Vividius as payment for its legal service.',
      ],
    });
  }
  english.push(
    {
      lines: [
        `${n3}. Payout of the remaining amount: EUR ${en(split.clientAmount)}`,
        routeSentence(input.route, input.account.currency, 'en'),
      ],
    },
    {
      heading: 'Recipient account',
      lines: accountLines(input.account, input.route, 'en'),
    },
    {
      lines: [
        `Date: ${dateEn(input.date)} · Signature:`,
        `Signed electronically in the Germany Pension Refund client portal (ATLAES GmbH) on ${stampEn(input.signedAt)} · Document ID ${input.documentId}`,
      ],
    }
  );

  return { split, german, english };
}

export const TRANSLATION_LABEL =
  'English translation — the German version is authoritative.';

const ZE = {
  margin: 52,
  size: 10,
  small: 8,
  lh: 12.5,
  headingSize: 14,
} as const;

/** Renders D + E into `doc` (new pages as needed), embedding the drawn signature after "Unterschrift:". */
export async function renderZahlungserklaerung(
  doc: PDFDocument,
  input: ZahlungserklaerungInput,
  signaturePng?: Uint8Array | null
): Promise<ZahlungserklaerungText> {
  const text = buildZahlungserklaerungText(input);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const sig = signaturePng ? await doc.embedPng(signaturePng) : null;
  const maxWidth = A4.width - 2 * ZE.margin;

  let page = doc.addPage([A4.width, A4.height]);
  let y = A4.height - ZE.margin;
  const ensure = (needed: number) => {
    if (y - needed < ZE.margin) {
      page = doc.addPage([A4.width, A4.height]);
      y = A4.height - ZE.margin;
    }
  };
  const put = (t: string, f: PDFFont, size: number) => {
    for (const line of wrapText(t, f, size, maxWidth)) {
      ensure(ZE.lh);
      page.drawText(line, { x: ZE.margin, y: y - size, size, font: f });
      y -= ZE.lh;
    }
  };
  const block = (sections: ZeSection[]) => {
    for (const s of sections) {
      if (s.heading) {
        ensure(ZE.headingSize + 8);
        const isTitle = s === sections[0];
        put(s.heading, bold, isTitle ? ZE.headingSize : ZE.size);
        if (isTitle) y -= 4;
      }
      for (const line of s.lines) {
        const isSignatureLine = /(Unterschrift|Signature):$/.test(line);
        const isFooter =
          line.startsWith('Elektronisch') ||
          line.startsWith('Signed electronically');
        put(
          line,
          isFooter ? font : line.match(/^\d\. /) ? bold : font,
          isFooter ? ZE.small : ZE.size
        );
        if (isSignatureLine && sig) {
          const h = 36;
          ensure(h + 6);
          page.drawImage(sig, {
            x: ZE.margin,
            y: y - h,
            width: sig.width * (h / sig.height),
            height: h,
          });
          y -= h + 6;
        } else if (isSignatureLine) {
          y -= 30;
        }
      }
      y -= 8;
    }
  };

  block(text.german);
  ensure(40);
  y -= 6;
  page.drawLine({
    start: { x: ZE.margin, y },
    end: { x: A4.width - ZE.margin, y },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 14;
  put(TRANSLATION_LABEL, font, ZE.small);
  y -= 6;
  block(text.english);
  return text;
}
