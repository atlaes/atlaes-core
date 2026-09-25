/**
 * Small AcroForm helpers shared by the DRV form fillers (pdf-lib).
 *
 * The DRV forms use single "checkbox" fields with several widgets whose
 * on-values are the visible labels ("Erstattung an Versicherte", "nein",
 * "ja", "Weiblich", …). pdf-lib's `PDFCheckBox.check()` only knows the
 * first widget's on-value, so we set `/V` directly to the matching export
 * name — the same approach as `selectButtonExport` in the VBL L203 filler.
 */

import {
  PDFDocument,
  PDFFont,
  PDFForm,
  PDFName,
  PDFPage,
  PDFRef,
  StandardFonts,
} from 'pdf-lib';

export function setTextField(
  form: PDFForm,
  name: string,
  value: string | null | undefined
): void {
  if (value === null || value === undefined) return;
  const field = form.getTextField(name);
  field.setText(value);
}

/** Decoded on-values of every widget of a button field, trimmed. */
export function buttonOnValues(form: PDFForm, name: string): string[] {
  const field = form.getCheckBox(name);
  return field.acroField
    .getWidgets()
    .map((w) => w.getOnValue()?.decodeText().trim())
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
}

/**
 * Selects `exportLabel` (compared trimmed, case-sensitive) on a multi-widget
 * button field. Throws with the available labels when it does not exist.
 */
export function selectButton(
  form: PDFForm,
  name: string,
  exportLabel: string
): void {
  const field = form.getCheckBox(name);
  const widgets = field.acroField.getWidgets();
  const wanted = exportLabel.trim();
  for (const w of widgets) {
    const on = w.getOnValue();
    if (on && on.decodeText().trim() === wanted) {
      field.acroField.dict.set(PDFName.of('V'), on);
      for (const other of widgets) {
        other.dict.set(PDFName.of('AS'), other === w ? on : PDFName.of('Off'));
      }
      return;
    }
  }
  throw new Error(
    `Button "${name}" has no export value "${exportLabel}" (available: ${buttonOnValues(form, name).join(' | ')})`
  );
}

/** Ticks a single-widget checkbox (on-value "ja"). */
export function tick(form: PDFForm, name: string): void {
  const field = form.getCheckBox(name);
  field.check();
}

/**
 * Removes `/Annots` entries that no longer resolve after `flatten()`
 * (multi-widget kids are deleted from the document but not from the page).
 */
export function sweepDanglingAnnots(doc: PDFDocument): void {
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i--) {
      const ref = annots.get(i);
      if (ref instanceof PDFRef && doc.context.lookup(ref) === undefined) {
        annots.remove(i);
      }
    }
  }
}

/** Bakes appearances and flattens the form so the output is print-stable. */
export async function finalizeForm(doc: PDFDocument): Promise<void> {
  const form = doc.getForm();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helv);
  form.flatten();
  sweepDanglingAnnots(doc);
}

/** Rectangle of the first widget of a field (before flatten). */
export function fieldRect(
  form: PDFForm,
  name: string
): { x: number; y: number; width: number; height: number } {
  return form.getField(name).acroField.getWidgets()[0].getRectangle();
}

/**
 * DD.MM.YYYY. A `YYYY-MM-DD` string is a calendar date (read as UTC so it
 * never shifts); a `Date` is a business timestamp and is read in local time,
 * like the cover letter's date line.
 */
export function formatDateDe(d: Date | string): string {
  if (typeof d === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    d = new Date(d);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export interface CombSpec {
  /** Left edge of the first cell (pt, from the left page edge). */
  left: number;
  /** Cell pitch in pt. */
  cell: number;
  /** Baseline measured from the TOP of the page (pt). */
  baselineTop: number;
  size: number;
}

/** Writes one character per comb cell, centred, on a flat (non-AcroForm) page. */
export function drawComb(
  page: PDFPage,
  font: PDFFont,
  text: string,
  spec: CombSpec
): void {
  const y = page.getHeight() - spec.baselineTop;
  [...text].forEach((ch, i) => {
    const w = font.widthOfTextAtSize(ch, spec.size);
    page.drawText(ch, {
      x: spec.left + i * spec.cell + (spec.cell - w) / 2,
      y,
      size: spec.size,
      font,
    });
  });
}

/** DDMMYYYY for the DRV "_trim" comb fields. */
export function formatDateCompactDe(d: Date | string): string {
  return formatDateDe(d).replace(/\./g, '');
}
