import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFRef,
  PDFArray,
  PDFHexString,
  PDFString,
  StandardFonts,
} from 'pdf-lib';
import { loadL203Template } from './assets';
import {
  formatGermanDateCompact,
  countryToIso3,
  splitStreetHouseNumber,
} from './format';

export interface L203Data {
  vblReference: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD (raw claim value)
  placeOfBirth: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  country: string | null;
  iban: string;
  swiftBic: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankCity: string | null;
  ortDatum: string; // "City, DD.MM.YYYY"
  signaturePng: Uint8Array;
}

/**
 * ---------------------------------------------------------------------
 * Step 0 findings (verified against the l203-form.pdf asset with pdf-lib,
 * and cross-checked visually against
 * "/Users/kael/Downloads/VBL Application form data sample.pdf", page 2,
 * which shows 5.1-5.4 all rendered as "nein" and Anlagen filled with
 * "Kopie Ausweisdokument, Postempfangsvollmacht,").
 *
 * 1. Field typing: none of the Optionsfeld1..5 / Bevollmächtigten /
 *    Betreuer button fields have the Radio flag (Ff bit 16 / 0x10000)
 *    set -- `/Ff` is simply absent. pdf-lib's field-type factory
 *    (`createPDFAcroButton`) therefore constructs a `PDFAcroCheckBox`
 *    for every one of them, never a `PDFAcroRadioButton`. Consequently
 *    `form.getRadioGroup(name)` throws `UnexpectedFieldTypeError` for
 *    ALL of Optionsfeld1..5 -- there is no radio group on this template
 *    despite the "ja"/"nein" pair look. We use `form.getCheckBox(name)`
 *    instead everywhere.
 *
 * 2. `PDFCheckBox.check()`/`.uncheck()` are also unusable for the
 *    ja/nein pairs: `PDFAcroCheckBox.setValue()` only accepts the FIRST
 *    widget's on-value (`acroField.getOnValue()`, which reads
 *    `getWidgets()[0]`) or `/Off` -- it throws
 *    `InvalidAcroFieldValueError` for the second widget's on-value
 *    (e.g. "/nein"). We instead set the field dict's `/V` entry
 *    directly to the desired export PDFName (see `selectButtonExport`
 *    below). `PDFForm.flatten()`'s `findWidgetAppearanceRef` looks up
 *    `field.acroField.getValue()` (the `/V` we set) against EACH
 *    widget's own on/off appearance sub-dictionary
 *    (`.get(value) ?? .get('/Off')`), so setting `/V` alone is
 *    sufficient for both widgets to render the correct on/off state --
 *    no per-widget `/AS` bookkeeping is required.
 *
 * 3. Row-to-field mapping (verified by comparing each Optionsfeld's
 *    widget y-rect against the visible question rows on Page 2, and by
 *    literal on-page render comparison against the annotated sample):
 *      - Optionsfeld2 -> question 5.1 ("...beschäftigt?")
 *          "ja" widget (x=259) export /ja, "nein" widget (x=330) /nein
 *      - Optionsfeld3 -> question 5.2 ("...versichert?")
 *          "ja" widget (x=259) export /liegtbei,
 *          "nein" widget (x=330) export /wirdnachgereicht
 *        NOTE: this deviates from the task brief's presumed mapping
 *        (brief assumed Optionsfeld3 -> 'liegtbei' = "nein"/Anlagen
 *        status). Rectangle evidence + visual re-render both show
 *        /liegtbei sits in the LEFT ("ja") column and
 *        /wirdnachgereicht in the RIGHT ("nein") column for question
 *        5.2 -- these export strings are simply this PDF's literal
 *        (mislabeled) ja/nein tokens for that one field, unrelated to
 *        the free-text "Anlagen" line (which is its own plain text
 *        field, `Page2[0].Anlagen[0]`, not a checkbox). Selecting
 *        "nein" for 5.2 therefore requires 'wirdnachgereicht'.
 *      - Optionsfeld4 -> question 5.3 ("Sind die Beiträge erstattet
 *        worden?"): "ja" export /ja, "nein" export /nein.
 *      - Optionsfeld5 -> question 5.4 ("Wurden Sie verbeamtet?"):
 *        "ja" export /ja, "nein" export /2 (confirmed: '2' is the
 *        "nein"-column widget's export value).
 *    All four are set to their "nein" export value below, matching the
 *    annotated sample (5.1-5.4 all "nein").
 *
 * 4. Duplicate/orphaned field objects (pre-existing defect in the
 *    l203-form.pdf asset itself, not introduced by pdf-lib or this
 *    filler): the `/AcroForm/Fields` array in the source PDF points to
 *    a full second copy of every terminal field/widget dict, and NONE
 *    of those copies are listed in any page's `/Annots` array (the
 *    page-attached, actually-rendered widgets are separate objects with
 *    identical `/T`, `/Rect`, and -- critically -- the SAME shared
 *    `/AP` reference). Because `PDFDocument.getForm()` walks
 *    `/AcroForm/Fields`, every `form.getField*()` call operates on
 *    these orphan copies. Filling still visually works (the shared
 *    `/AP` ref means writing an appearance stream for the orphan also
 *    updates what the on-page widget displays), but `form.flatten()`
 *    crashes (`Could not find page for PDFRef`) because it cannot
 *    locate a page for an orphan widget. `repairOrphanFieldTree` fixes
 *    this once, up front, by repointing the AcroForm field tree at the
 *    real on-page widget objects (verified 1:1 by name+order+rect
 *    match) before any filling happens, so all of `getForm()`,
 *    `updateFieldAppearances`, and `flatten()` operate on objects that
 *    are actually attached to a page.
 *
 * 5. A related pdf-lib limitation surfaces once (4) is fixed: for a
 *    checkbox/radio widget whose `/AP/N` is an *indirect* reference to
 *    the on/off appearance sub-dictionary (as opposed to an inline
 *    dictionary), `PDFAnnotation.getNormalAppearance()` returns that
 *    reference un-dereferenced, and `PDFForm.findWidgetAppearanceRef`
 *    only special-cases an INLINE `PDFDict`, not a `PDFRef` pointing at
 *    one. Left alone, `flatten()` tries to draw the sub-dictionary
 *    object itself as an XObject ("wrong type" at render time).
 *    `inlineIndirectButtonAppearances` resolves each such ref into an
 *    inline dict before flattening, which is enough for pdf-lib's own
 *    logic to pick the right on/off appearance per widget.
 * ---------------------------------------------------------------------
 */

const RADIO_SELECTIONS: Record<string, string> = {
  'topmostSubform[0].Page2[0].Optionsfeld2[0]': 'nein',
  'topmostSubform[0].Page2[0].Optionsfeld3[0]': 'wirdnachgereicht',
  'topmostSubform[0].Page2[0].Optionsfeld4[0]': 'nein',
  'topmostSubform[0].Page2[0].Optionsfeld5[0]': '2',
};

const ANLAGEN_TEXT = 'Kopie Ausweisdokument, Postempfangsvollmacht';

/**
 * Selects an export value on a button field (checkbox-typed on this
 * template; see Step-0 note above for why `.check()`/`.select()` can't
 * be used) by writing directly to the field dict's `/V` entry. This
 * bypasses `PDFAcroCheckBox.setValue()`'s single-on-value validation,
 * which would otherwise reject every export value except the first
 * widget's.
 *
 * Because the direct `/V` write skips pdf-lib's own validation, we
 * independently validate `exportValue` against the field's actual
 * widget on-values first: a typo'd export value would otherwise be
 * written to `/V` without error, and at flatten time every widget's
 * `/V` lookup would fall through to its `/Off` appearance -- silently
 * rendering the field blank on the printed/mailed form.
 */
export function selectButtonExport(
  form: ReturnType<PDFDocument['getForm']>,
  fieldName: string,
  exportValue: string
): void {
  try {
    const field = form.getCheckBox(fieldName);
    const onValues = field.acroField
      .getWidgets()
      .map((widget) => widget.getOnValue()?.asString())
      .filter((v): v is string => v !== undefined);

    if (!onValues.includes(`/${exportValue}`)) {
      throw new Error(
        `Export value "${exportValue}" is not a valid on-value for ` +
          `button field "${fieldName}". Available on-values: ` +
          `${onValues.join(', ') || '(none found)'}`
      );
    }

    field.acroField.dict.set(PDFName.of('V'), PDFName.of(exportValue));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to select "${exportValue}" on button field "${fieldName}": ${message}`
    );
  }
}

/**
 * Repairs the duplicate/orphaned AcroForm field-tree defect described in
 * finding (4) above: repoints every top-level field (and every kid of a
 * multi-widget field) at the on-page widget object with the same name,
 * order, and rectangle, in place of the orphan copy that
 * `/AcroForm/Fields` originally referenced.
 */
function repairOrphanFieldTree(doc: PDFDocument): void {
  const context = doc.context;
  const acroFormRef = doc.catalog.get(PDFName.of('AcroForm'));
  const acroForm = context.lookup(acroFormRef as PDFRef) as PDFDict;
  const fieldsArr = acroForm.get(PDFName.of('Fields')) as PDFArray;

  const getFieldName = (dict: PDFDict): string | undefined => {
    const t = dict.get(PDFName.of('T'));
    if (t instanceof PDFHexString || t instanceof PDFString) {
      return t.decodeText();
    }
    const parentRef = dict.get(PDFName.of('Parent'));
    if (!parentRef) return undefined;
    const parentDict = context.lookup(parentRef as PDFRef) as
      | PDFDict
      | undefined;
    if (!parentDict) return undefined;
    return getFieldName(parentDict);
  };

  // Map field name -> on-page widget refs, in the order they appear in
  // each page's /Annots (matches the orphan tree's Kids order 1:1).
  const onPageByName = new Map<string, PDFRef[]>();
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const ref = annots.get(i);
      if (!(ref instanceof PDFRef)) continue;
      const dict = context.lookup(ref) as PDFDict | undefined;
      if (!dict) continue;
      const name = getFieldName(dict);
      if (!name) continue;
      if (!onPageByName.has(name)) onPageByName.set(name, []);
      onPageByName.get(name)!.push(ref);
    }
  }

  for (let i = 0; i < fieldsArr.size(); i++) {
    const fieldRef = fieldsArr.get(i);
    if (!(fieldRef instanceof PDFRef)) continue;
    const fieldDict = context.lookup(fieldRef) as PDFDict | undefined;
    if (!fieldDict) continue;
    const name = getFieldName(fieldDict);
    if (!name) continue;
    const onPageRefs = onPageByName.get(name);
    if (!onPageRefs || onPageRefs.length === 0) continue;

    const kids = fieldDict.get(PDFName.of('Kids')) as PDFArray | undefined;
    if (kids) {
      for (let k = 0; k < kids.size(); k++) {
        const onPageKidRef = onPageRefs[k];
        if (!onPageKidRef) continue;
        const onPageKidDict = context.lookup(onPageKidRef) as PDFDict;
        onPageKidDict.set(PDFName.of('Parent'), fieldRef);
        kids.set(k, onPageKidRef);
      }
    } else {
      fieldsArr.set(i, onPageRefs[0]);
    }
  }
}

/**
 * Resolves an indirect `/AP/N` reference into an inline dictionary for
 * every widget of every field, working around the pdf-lib limitation
 * described in finding (5) above. No-op for widgets whose `/AP/N` is
 * already inline or is a direct appearance stream.
 */
function inlineIndirectButtonAppearances(doc: PDFDocument): void {
  const form = doc.getForm();
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const apRefOrDict = widget.dict.get(PDFName.of('AP'));
      const apDict = doc.context.lookup(apRefOrDict as PDFRef) as
        | PDFDict
        | undefined;
      if (!(apDict instanceof PDFDict)) continue;
      const n = apDict.get(PDFName.of('N'));
      if (n instanceof PDFRef) {
        const resolved = doc.context.lookup(n);
        if (resolved instanceof PDFDict) {
          apDict.set(PDFName.of('N'), resolved);
        }
      }
    }
  }
}

/**
 * Removes any leftover `/Annots` entries that no longer resolve to a
 * live object. `PDFForm.flatten()`'s own `removeField()` step only
 * removes each field's *appearance* ref and the top-level field ref
 * from the page -- for multi-widget (checkbox/radio) fields, the
 * per-widget kid refs it deletes from the document are never stripped
 * out of the page's `/Annots` array, which otherwise leaves dangling
 * references in the saved PDF.
 */
function sweepDanglingAnnots(doc: PDFDocument): void {
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

/**
 * Resolves the L203 "Straße"/"Hausnr" pair from the claim's address lines.
 *
 * The L203 form has separate street-name and house-number fields, but the
 * claim data model stores a free-form `currentAddressLine1` (+ optional
 * `currentAddressLine2`). We first try to split a house number out of
 * line 1 (handles both "Kaskelstraße 46" and "111 Abbey Road"). If line 1
 * has no detectable house number and line 2 looks like a plausible house
 * number (short, digit-led, e.g. "111" or "12a"), we use line 2 as the
 * Hausnr — this covers UK/US claimants who split the number into line 2.
 */
export function resolveStreetAndHouseNumber(
  addressLine1: string,
  addressLine2?: string | null
): { street: string; houseNumber: string } {
  const primary = splitStreetHouseNumber(addressLine1);
  if (primary.houseNumber) return primary;

  const line2 = addressLine2?.trim();
  if (line2 && isPlausibleHouseNumber(line2)) {
    return { street: primary.street, houseNumber: line2 };
  }

  return primary;
}

/**
 * A plausible standalone house number: short and digit-led, optionally
 * with a trailing letter or a simple range/suffix (e.g. "111", "12a",
 * "12-14", "12/3"). Deliberately strict so a real address line ("Flat 2,
 * Baker House") isn't mistaken for a house number.
 */
function isPlausibleHouseNumber(value: string): boolean {
  return /^\d+\s*[a-zA-Z]?(?:[-/]\d+\w?)?$/.test(value.trim());
}

/** Fills every mapped L203 AcroForm field on `doc` in place (pre-flatten). */
export function fillL203Fields(doc: PDFDocument, data: L203Data): void {
  repairOrphanFieldTree(doc);

  const form = doc.getForm();
  const setText = (name: string, value: string) =>
    form.getTextField(`topmostSubform[0].Page1[0].${name}[0]`).setText(value);

  const { street, houseNumber } = resolveStreetAndHouseNumber(
    data.addressLine1,
    data.addressLine2
  );

  setText('versicherungsnummer', data.vblReference);
  setText('Name', data.lastName);
  setText('Vorname', data.firstName);
  setText('geburtsdatum', formatGermanDateCompact(data.dateOfBirth));
  setText('Geburtsort', data.placeOfBirth);
  setText('Straße', street);
  setText('Hausnr', houseNumber);
  setText('PLZ', data.postalCode);
  setText('Wohnort', data.city);
  setText('Länderkennz', countryToIso3(data.country));
  setText('IBAN', data.iban);
  setText('BIC', data.swiftBic ?? '');

  const claimantName = `${data.firstName} ${data.lastName}`.trim();
  const isOwnAccount =
    !data.accountHolderName ||
    data.accountHolderName.trim().toLowerCase() === claimantName.toLowerCase();
  setText('Kontoinhaber', isOwnAccount ? '' : data.accountHolderName!);

  const bankLine = [data.bankName, data.bankCity].filter(Boolean).join(', ');
  setText('geldinstitut', bankLine);

  form
    .getTextField('topmostSubform[0].Page2[0].ort_datum[0]')
    .setText(data.ortDatum);
  form
    .getTextField('topmostSubform[0].Page2[0].Anlagen[0]')
    .setText(ANLAGEN_TEXT);

  for (const [fieldName, exportValue] of Object.entries(RADIO_SELECTIONS)) {
    selectButtonExport(form, fieldName, exportValue);
  }

  inlineIndirectButtonAppearances(doc);
}

/**
 * Builds the fully filled, flattened, signature-stamped L203 PDF from
 * scratch: loads the blank template, fills every mapped field, stamps
 * the signature image next to the "Ort, Datum" field on page 2, bakes
 * in appearance streams, and flattens the AcroForm.
 */
export async function fillL203(data: L203Data): Promise<PDFDocument> {
  const doc = await PDFDocument.load(loadL203Template());
  fillL203Fields(doc, data);

  const form = doc.getForm();
  const ortDatumField = form.getTextField(
    'topmostSubform[0].Page2[0].ort_datum[0]'
  );
  // Read the widget rect BEFORE flatten() -- flatten() removes the
  // field, so its geometry must be captured while it still exists.
  const rect = ortDatumField.acroField.getWidgets()[0].getRectangle();

  const signatureImage = await doc.embedPng(data.signaturePng);
  const signatureHeight = 35;
  const signatureScale = signatureHeight / signatureImage.height;
  const signatureWidth = signatureImage.width * signatureScale;
  const page2 = doc.getPages()[1];
  page2.drawImage(signatureImage, {
    x: rect.x + rect.width + 30,
    y: rect.y - 5,
    width: signatureWidth,
    height: signatureHeight,
  });

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helv);
  form.flatten();
  sweepDanglingAnnots(doc);

  return doc;
}
