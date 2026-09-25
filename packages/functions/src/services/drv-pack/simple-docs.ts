/**
 * Generated single-page documents of the DRV pack:
 *  - Vollmacht (PoA) to Vividius, German text + English declaration
 *    (text from PoA.pdf, 21 Sep 2026)
 *  - Willenserklärung zur Beitragserstattung (reply form 60+ months,
 *    from "Reply form 60+ months.docx") — option 1 ticked
 *  - Rückantwort (official reply slip, vector template) — VSNR, place/date
 *    and the client's signature overlaid; the "pursue claim" box is
 *    already ticked on the template
 */

import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { A4 } from '../claim-pdf/constants';
import { wrapText } from '../claim-pdf/text-layout';
import { loadGprAsset } from './assets';
import { drawComb, formatDateDe } from './acroform';
import { VIVIDIUS } from './cover-letter';
import { compactVsnr, formatVsnr } from './register';

interface Writer {
  line: (
    text: string,
    opts?: { bold?: boolean; size?: number; x?: number }
  ) => void;
  para: (
    text: string,
    opts?: { bold?: boolean; size?: number; indent?: number }
  ) => void;
  blank: (n?: number) => void;
  image: (
    img: {
      width: number;
      height: number;
      draw: (x: number, y: number, w: number, h: number) => void;
    },
    height: number
  ) => void;
  cursor: () => number;
}

function writer(
  page: ReturnType<PDFDocument['addPage']>,
  font: PDFFont,
  bold: PDFFont,
  margin = 70,
  startTop = 80
): Writer {
  const maxWidth = A4.width - 2 * margin;
  let cursor = startTop;
  const lh = (size: number) => size * 1.35;
  const put = (text: string, size: number, b: boolean, x: number) => {
    const f = b ? bold : font;
    page.drawText(text, {
      x,
      y: A4.height - cursor - f.heightAtSize(size, { descender: false }),
      size,
      font: f,
    });
  };
  return {
    line: (text, o = {}) => {
      const size = o.size ?? 11;
      put(text, size, o.bold ?? false, o.x ?? margin);
      cursor += lh(size);
    },
    para: (text, o = {}) => {
      const size = o.size ?? 11;
      const indent = o.indent ?? 0;
      for (const l of wrapText(
        text,
        o.bold ? bold : font,
        size,
        maxWidth - indent
      )) {
        put(l, size, o.bold ?? false, margin + indent);
        cursor += lh(size);
      }
    },
    blank: (n = 1) => {
      cursor += lh(11) * n;
    },
    image: (img, height) => {
      const w = img.width * (height / img.height);
      img.draw(margin, A4.height - cursor - height, w, height);
      cursor += height + 4;
    },
    cursor: () => cursor,
  };
}

export interface PoaData {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  passportNumber: string;
  date: Date;
  clientSignaturePng?: Uint8Array | null;
}

export async function renderPoa(
  doc: PDFDocument,
  data: PoaData
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4.width, A4.height]);
  const w = writer(page, font, bold);
  const name = `${data.firstName} ${data.lastName}`;

  w.line('Vollmacht', { bold: true, size: 16 });
  w.blank();
  w.line('Den');
  w.line('Vividius Rechtsanwälten');
  w.line(`Vertretungsberechtigte Anwältin: ${VIVIDIUS.lawyer}`);
  w.line(VIVIDIUS.street);
  w.line(`${VIVIDIUS.postalCode} ${VIVIDIUS.city}`);
  w.blank();
  w.line('wird von');
  w.blank();
  w.line(`${name},`);
  w.line(`geb. am ${formatDateDe(data.dateOfBirth)}`);
  w.line(`Pass-Nr.: ${data.passportNumber}`);
  w.blank();
  w.line('in Sachen');
  w.line('Vertretung gegenüber der Deutschen Rentenversicherung', {
    bold: true,
  });
  w.line('Vollmacht erteilt.', { bold: true });
  w.blank();
  w.para(
    'Diese Vollmacht erstreckt sich insbesondere auf folgende Befugnisse:'
  );
  w.blank();
  for (const b of [
    'Antragstellung und Vornahme von sonstigen Rechtshandlungen,',
    'Abgabe und Entgegennahme von Willenserklärungen',
    'Entgegennahme von Geld (insbesondere gem. Zahlungserklärung A1313)',
    'Entgegennahme von Zustellungen,',
    'Einlegung und Rücknahme von Rechtsmitteln sowie Verzicht auf solche,',
    'Gerichtliche Vertretung in allen Instanzen',
    'Beseitigung eines Rechtsstreits durch Vergleich, Verzicht oder Anerkenntnis.',
    'Empfangnahme von Zustellungen, die auch an die Partei unmittelbar zulässig sind. Diese Zustellungen haben an den Bevollmächtigten zu erfolgen.',
  ]) {
    w.para(`·  ${b}`, { indent: 8 });
  }
  w.blank();
  w.para(
    'Mit der Erteilung dieser Vollmacht widerrufe ich sämtliche von mir in dieser Angelegenheit zuvor erteilten Vollmachten.',
    { bold: true }
  );
  w.blank(2);
  w.line('Declaration by claimant', { bold: true });
  w.para(
    'I understand that receiving a refund of my pension contributions permanently ends my previous insurance relationship. As a result, all pension rights and entitlements earned before the refund are cancelled. This includes all credited periods, such as contribution periods, substitute periods, and other credited or accounted periods.',
    { size: 10 }
  );
  w.para(
    'This cancellation also applies to periods for which contributions cannot be refunded, for example periods spent raising children, compulsory military service or alternative civilian service, as well as periods credited before or in connection with medical, psychological, or vocational rehabilitation measures intended to support reintegration into working life.',
    { size: 10 }
  );
  w.blank(2);
  if (data.clientSignaturePng) {
    const img = await doc.embedPng(data.clientSignaturePng);
    w.image(
      {
        width: img.width,
        height: img.height,
        draw: (x, y, ww, hh) =>
          page.drawImage(img, { x, y, width: ww, height: hh }),
      },
      40
    );
  } else {
    w.blank(3);
  }
  w.line(formatDateDe(data.date));
  w.line(name);
}

export interface WillenserklaerungData {
  vsnr: string;
  city: string; // client's place of signing
  date: Date;
  /** true = "Die Beitragserstattung soll dennoch erfolgen." (option 1) */
  pursueRefund?: boolean;
  clientSignaturePng?: Uint8Array | null;
}

export async function renderWillenserklaerung(
  doc: PDFDocument,
  data: WillenserklaerungData
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4.width, A4.height]);
  const w = writer(page, font, bold);
  const pursue = data.pursueRefund ?? true;
  const box = (on: boolean) => (on ? '[X]' : '[  ]');

  w.line(`Versicherungsnummer: ${formatVsnr(data.vsnr)}`);
  w.blank();
  w.line('Willenserklärung zur Beitragserstattung', { bold: true, size: 14 });
  w.blank();
  w.para(
    `${box(pursue)}  Mir ist bekannt, dass ich nach dem derzeit geltenden Recht die Wartezeit von 60 Monaten für einen Anspruch auf Regelaltersrente erfüllt habe. Die Beitragserstattung soll dennoch erfolgen.`
  );
  w.blank();
  w.para(
    `${box(!pursue)}  Da ich nach dem derzeit geltenden Recht die Wartezeit von 60 Monaten für einen Anspruch auf Regelaltersrente erfüllt habe, nehme ich meinen Antrag auf Beitragserstattung zurück. Die Beitragserstattung soll - zurzeit - nicht erfolgen.`
  );
  w.blank(3);
  if (data.clientSignaturePng) {
    const img = await doc.embedPng(data.clientSignaturePng);
    w.image(
      {
        width: img.width,
        height: img.height,
        draw: (x, y, ww, hh) =>
          page.drawImage(img, { x, y, width: ww, height: hh }),
      },
      40
    );
  } else {
    w.blank(3);
  }
  w.line('____________________________________________________________');
  w.line(
    `${data.city}, ${formatDateDe(data.date)}                                   eigenhändige Unterschrift vom Versicherten`,
    { size: 9 }
  );
}

export interface RueckantwortData {
  vsnr: string;
  city: string;
  date: Date;
  clientSignaturePng?: Uint8Array | null;
}

/**
 * Overlay positions on rueckantwort.pdf (612×792 pt), top-origin. The VSNR
 * comb has 12 cells of 11.83 pt starting at x 114.2 under the label row.
 */
export const RUECKANTWORT_LAYOUT = {
  vsnrComb: { left: 114.2, cell: 11.83, baselineTop: 87, size: 8 },
  placeDate: { x: 112, yTop: 440, size: 10 },
  signature: { x: 350, yTop: 412, height: 28 },
} as const;

export async function appendRueckantwort(
  doc: PDFDocument,
  data: RueckantwortData
): Promise<void> {
  const tpl = await PDFDocument.load(loadGprAsset('rueckantwort'));
  const [page] = await doc.copyPages(tpl, [0]);
  doc.addPage(page);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const h = page.getHeight();
  const put = (text: string, p: { x: number; yTop: number; size: number }) =>
    page.drawText(text, {
      x: p.x,
      y: h - p.yTop - font.heightAtSize(p.size, { descender: false }),
      size: p.size,
      font,
    });
  drawComb(page, font, compactVsnr(data.vsnr), RUECKANTWORT_LAYOUT.vsnrComb);
  put(
    `${data.city}, ${formatDateDe(data.date)}`,
    RUECKANTWORT_LAYOUT.placeDate
  );
  if (data.clientSignaturePng) {
    const img = await doc.embedPng(data.clientSignaturePng);
    const s = RUECKANTWORT_LAYOUT.signature;
    page.drawImage(img, {
      x: s.x,
      y: h - s.yTop - s.height,
      width: img.width * (s.height / img.height),
      height: s.height,
    });
  }
}
