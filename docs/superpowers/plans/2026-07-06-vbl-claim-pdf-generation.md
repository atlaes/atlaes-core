# VBL Combined Claim PDF Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a VBL claim is submitted, generate ONE lettershop-ready DIN-A4 PDF containing: (1) cover letter with DIN 5008 Typ B window-envelope address placement, (2) filled official L203 claim form, (3) generated Power-of-Attorney (Postempfangsvollmacht) letter, (4) user's passport copy normalized to A4, (5) the PoA holder's ID copy — store it in S3, record `pdfS3Key` on the claim, and expose download endpoints + a dashboard download button.

**Architecture:** A new `packages/functions/src/services/claim-pdf/` module built on **pdf-lib** (pure JS — no headless browser; backend runs on ECS Fargate). A pure assembly function `assembleClaimPdf(input)` takes claim data + document buffers and returns PDF bytes (fully unit-testable without DB/S3). A thin `ClaimPdfService.generateAndStoreForClaim()` wrapper fetches claim/documents/signature, calls the assembler, uploads to S3, and writes `pdfS3Key`. Generation is hooked into the existing `submitClaim` flow and exposed via two new routes.

**Tech Stack:** pdf-lib (^1.17.1), Hono, Drizzle, Vitest (real Postgres), existing `@aws-sdk/client-s3` wrapper in `src/utils/s3.ts`.

## Global Constraints

- All commands run from `packages/functions/` unless stated otherwise. Repo root: the current worktree root.
- Prettier: single quotes, trailing commas (es5), semicolons, 2-space indent, 80 char width.
- Services are static classes (mirror `ClaimsApplicationService` in `src/services/claims-application.ts`). Routes use `authMiddleware` + `zValidator`. Multi-table writes use `db.transaction`.
- Tests: Vitest, real Postgres (Docker must be up: `pnpm docker:up` from repo root), sequential. Use `createTestUser`/`generateTestToken` from `src/test/helpers.ts` and `createTestApp` for routes.
- **Every page of the final PDF must be DIN A4** (595.28 × 841.89 pt = 210 × 297 mm). Lettershop (onlinebrief24.de SFTP) rejects/mangles anything else; one letter per PDF file.
- **Cover letter address block placement is sacred** — it must land in the DIN 5008 Typ B window zone. Reference coordinates (measured from the lettershop-approved `Cover Letter VBL.doc` rendered to PDF, A4, origin top-left, in pt): recipient line 1 "VBL. Kundenservice" at x=68.3, top-of-text y=166.2; recipient line 2 "76240 Karlsruhe" at x=68.3, top-of-text y=193.8. Font Helvetica 11 pt. Do not "improve" these values.
- The PoA holder (Bevollmächtigte) is fixed for every claim: **Anna Katharina Charlotte Kliem (geb. Böckers), geboren am 06.05.1983 in Münster Westfalen, Kaskelstraße 46, 10317 Berlin, E-Mail assistenz.kliem@gmail.com**. Keep in ONE constants file.
- German umlauts/ß appear in text AND in L203 field names (e.g. `Straße[0]`, `Länderkennz[0]`, `Bevollmächtigten[0]`). Use pdf-lib `StandardFonts.Helvetica` (WinAnsi covers German). Source files are UTF-8.
- All dates rendered as `DD.MM.YYYY` (German format).
- Do NOT build SFTP delivery — that is Phase 7 (out of scope). Only make the PDF compliant with its constraints (A4, single letter).

## Source documents (external inputs, on this machine)

| File | Role |
|---|---|
| `/Users/kael/Downloads/Refund claim VBL - L203.pdf` | Blank official form. 3 pages A4. Pure AcroForm, **no XFA**, `NeedAppearances=true`. Copied into repo as template asset (Task 1). |
| `/Users/kael/Downloads/ID Power of Attorney.pdf` | PoA holder's ID copy, 1 page, already A4. Copied into repo as static asset (Task 1). |
| `/Users/kael/Downloads/VBL Application form data sample.pdf` | Annotated sample showing which L203 fields get which values (visual QA reference only, not committed). |
| `/Users/kael/Downloads/Sizing_Coverletter_DIN_5008_Typ_B.pdf` | Lettershop sizing sheet (visual QA reference only). |

### L203 AcroForm field inventory (verified with pypdf)

Text fields (`/Tx`), full names all prefixed `topmostSubform[0].Page1[0].` unless noted:
`versicherungsnummer[0]`, `Name[0]`, `Vorname[0]`, `geburtsdatum[0]`, `Titel[0]`, `Geburtsname[0]`, `Geburtsort[0]`, `Straße[0]`, `Hausnr[0]`, `PLZ[0]`, `Wohnort[0]`, `Länderkennz[0]`, `Telefon[0]`, `IBAN[0]`, `BIC[0]`, `Kontoinhaber[0]`, `geldinstitut[0]`, and on Page2: `topmostSubform[0].Page2[0].ort_datum[0]`, `topmostSubform[0].Page2[0].Anlagen[0]`.

Buttons: `Page1.Optionsfeld1[0]` (states `/Frau`,`/Herr`) — section 3 salutation, leave Off; `Page1.Bevollmächtigten[0]`, `Page1.Betreuer[0]` (checkboxes, leave Off — sample says sections 3+4 stay empty); `Page2.Optionsfeld2[0]` (`/ja`,`/nein`), `Page2.Optionsfeld3[0]` (`/liegtbei`,`/wirdnachgereicht`), `Page2.Optionsfeld4[0]` (`/ja`,`/nein`), `Page2.Optionsfeld5[0]` (`/ja`,`/2` — `/2` is the "nein" export).

Per the annotated sample: questions 5.1–5.4 are all answered **nein**; the "Kopie Ausweisdokument" question gets **liegt bei**. Task 5 Step 1 verifies which Optionsfeld belongs to which question by dumping widget rectangles before trusting this mapping.

### Claim → template placeholder mapping

| Placeholder | Source (`claimsTable`, `src/drizzle/schema/claims.ts`) |
|---|---|
| `{{first_name}}` / `{{last_name}}` | `firstName` / `lastName` |
| `{{date_of_birth}}` | `dateOfBirth` → `DD.MM.YYYY` |
| `{{place_of_birth}}` | `placeOfBirth` |
| `{{street_address}}` | `currentAddressLine1` (+ `, ${currentAddressLine2}` if set) |
| `{{postal_code}}` / `{{city}}` | `currentPostalCode` / `currentCity` |
| `{{vbl_reference}}` | `svNummer` (the VBL onboarding "Membership" step stores the VBL-Versicherungsnummer here — see `apps/vbl/lib/onboarding-api.ts` `// Membership`) |
| `{{signing_place}}` | `currentCity` |
| `{{date_today}}` | generation date → `DD.MM.YYYY` |
| `{{signature_user}}` | PNG from `shared.signatures.signatureData` (base64, may carry `data:image/png;base64,` prefix — strip it) via `claim.signatureId` |

L203 extras: `geburtsdatum` = `DDMMYYYY` (no dots); `Länderkennz` = ISO-3166 alpha-3 from `currentCountry` (helper in Task 2); `IBAN`/`BIC` = `iban`/`swiftBic`; `Kontoinhaber` = `accountHolderName` only when ≠ `"{firstName} {lastName}"`; `geldinstitut` = `bankName` + `, ${bankCity}` if set; `ort_datum` = `"{currentCity}, {DD.MM.YYYY}"`; `Anlagen` = `"Kopie Ausweisdokument, Postempfangsvollmacht"`; `Telefon`, `Titel`, `Geburtsname` stay empty (not captured by onboarding).

## File Structure

```
packages/functions/
  src/assets/vbl/l203-form.pdf            # blank L203 (copied from Downloads)
  src/assets/vbl/poa-holder-id.pdf        # Anna Kliem ID copy (copied from Downloads)
  src/services/claim-pdf/
    constants.ts        # PoA holder data, A4 dims, mm(), layout constants
    format.ts           # formatGermanDate, formatGermanDateCompact, countryToIso3, splitStreetHouseNumber
    assets.ts           # loadL203Template(), loadPoaHolderId() (dual-path __dirname pattern)
    text-layout.ts      # wrapText() word-wrapper for pdf-lib fonts
    cover-letter.ts     # buildCoverLetterPlan() (pure) + renderCoverLetter()
    poa-letter.ts       # renderPoaLetter()
    l203-form.ts        # fillL203() — fill fields, stamp signature, flatten
    normalize-a4.ts     # imageToA4Page(), appendPdfNormalizedToA4()
    assemble.ts         # assembleClaimPdf(input) — pure merge of all 5 parts
    index.ts            # ClaimPdfService (DB/S3 orchestration)
    *.test.ts           # co-located tests per module
  build.js              # + cpSync src/assets → dist/assets
  src/utils/s3.ts       # + downloadFile(key)
  src/routes/claims.ts  # + POST /:id/generate-pdf, GET /:id/pdf; submitClaim hook
apps/vbl/
  lib/onboarding-api.ts               # + generateClaimPdf(), getClaimPdfUrl()
  app/dashboard/claims/[id]/page.tsx  # + "Download claim PDF" button
```

---

### Task 1: Dependency, template assets, asset loader

**Files:**
- Modify: `packages/functions/package.json` (add `pdf-lib`)
- Modify: `packages/functions/build.js` (external + asset copy)
- Create: `packages/functions/src/assets/vbl/l203-form.pdf`, `packages/functions/src/assets/vbl/poa-holder-id.pdf`
- Create: `packages/functions/src/services/claim-pdf/assets.ts`
- Test: `packages/functions/src/services/claim-pdf/assets.test.ts`

**Interfaces:**
- Produces: `loadL203Template(): Buffer`, `loadPoaHolderId(): Buffer` from `./assets`.

- [ ] **Step 1: Install pdf-lib and copy assets**

```bash
cd packages/functions
pnpm add pdf-lib
mkdir -p src/assets/vbl
cp "/Users/kael/Downloads/Refund claim VBL - L203.pdf" src/assets/vbl/l203-form.pdf
cp "/Users/kael/Downloads/ID Power of Attorney.pdf" src/assets/vbl/poa-holder-id.pdf
```

- [ ] **Step 2: Wire build.js.** In `packages/functions/build.js`, add `--external:pdf-lib` to the esbuild externals list (match the existing `--external:` style), and next to the existing `src/data` → `dist/data` copy add:

```js
fs.cpSync('src/assets', 'dist/assets', { recursive: true });
```

- [ ] **Step 3: Write failing test** `src/services/claim-pdf/assets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadL203Template, loadPoaHolderId } from './assets';

describe('claim-pdf assets', () => {
  it('loads the blank L203 form with 3 A4 pages and AcroForm fields', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    expect(doc.getPageCount()).toBe(3);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.3, 0);
    expect(height).toBeCloseTo(841.9, 0);
    const names = doc.getForm().getFields().map((f) => f.getName());
    expect(names).toContain('topmostSubform[0].Page1[0].versicherungsnummer[0]');
  });

  it('loads the PoA holder ID as a 1-page A4 PDF', async () => {
    const doc = await PDFDocument.load(loadPoaHolderId());
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.2, 0);
    expect(height).toBeCloseTo(841.8, 0);
  });
});
```

- [ ] **Step 4: Run to verify failure** — `pnpm vitest run src/services/claim-pdf/assets.test.ts` → FAIL (module not found).

- [ ] **Step 5: Implement** `src/services/claim-pdf/assets.ts` mirroring the dual-path pattern of `vbl-calculation.ts:453`:

```ts
import fs from 'fs';
import path from 'path';

function resolveAsset(fileName: string): string {
  // Bundled: dist/index.js + dist/assets/vbl/*  → __dirname === dist/
  let assetPath = path.join(__dirname, 'assets', 'vbl', fileName);
  if (!fs.existsSync(assetPath)) {
    // Dev/tsx & vitest: src/services/claim-pdf → src/assets/vbl
    assetPath = path.join(__dirname, '..', '..', 'assets', 'vbl', fileName);
  }
  return assetPath;
}

export function loadL203Template(): Buffer {
  return fs.readFileSync(resolveAsset('l203-form.pdf'));
}

export function loadPoaHolderId(): Buffer {
  return fs.readFileSync(resolveAsset('poa-holder-id.pdf'));
}
```

- [ ] **Step 6: Run tests** → PASS. Also run `pnpm build` and check `dist/assets/vbl/` contains both PDFs.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(claim-pdf): add pdf-lib, L203/PoA-ID template assets and loader"`

---

### Task 2: Constants, formatting helpers, text layout

**Files:**
- Create: `src/services/claim-pdf/constants.ts`, `src/services/claim-pdf/format.ts`, `src/services/claim-pdf/text-layout.ts`
- Test: `src/services/claim-pdf/format.test.ts`, `src/services/claim-pdf/text-layout.test.ts`

**Interfaces (produced, used by Tasks 3–7):**
- `A4 = { width: 595.28, height: 841.89 }`, `mm(v: number): number` (v × 72 / 25.4), `POA_HOLDER` const object, `COVER_LAYOUT` const object.
- `formatGermanDate(d: Date | string): string` → `06.07.2026`; `formatGermanDateCompact(d): string` → `06072026` (DDMMYYYY); `countryToIso3(country: string | null): string`; `splitStreetHouseNumber(line: string): { street: string; houseNumber: string }`.
- `wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[]`.

- [ ] **Step 1: Write failing tests** `format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  formatGermanDate,
  formatGermanDateCompact,
  countryToIso3,
  splitStreetHouseNumber,
} from './format';

describe('format helpers', () => {
  it('formats German dates', () => {
    expect(formatGermanDate('1990-03-05')).toBe('05.03.1990');
    expect(formatGermanDate(new Date(2026, 6, 6))).toBe('06.07.2026');
  });
  it('formats compact DDMMYYYY for L203 comb field', () => {
    expect(formatGermanDateCompact('1990-03-05')).toBe('05031990');
  });
  it('maps countries to ISO alpha-3', () => {
    expect(countryToIso3('Philippines')).toBe('PHL');
    expect(countryToIso3('Australia')).toBe('AUS');
    expect(countryToIso3('AUS')).toBe('AUS'); // pass-through
    expect(countryToIso3('Atlantis')).toBe(''); // unknown → empty, form stays blank
    expect(countryToIso3(null)).toBe('');
  });
  it('splits street and house number', () => {
    expect(splitStreetHouseNumber('Kaskelstraße 46')).toEqual({
      street: 'Kaskelstraße',
      houseNumber: '46',
    });
    expect(splitStreetHouseNumber('123 Main Street')).toEqual({
      street: '123 Main Street',
      houseNumber: '',
    }); // leading-number formats stay intact in street
    expect(splitStreetHouseNumber('Musterweg 12a')).toEqual({
      street: 'Musterweg',
      houseNumber: '12a',
    });
  });
});
```

`text-layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { wrapText } from './text-layout';

describe('wrapText', () => {
  it('wraps long text into lines that fit maxWidth', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const text =
      'Hiermit erteile ich die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten.';
    const lines = wrapText(text, font, 11, 200);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 11)).toBeLessThanOrEqual(200);
    }
    expect(lines.join(' ')).toBe(text);
  });
  it('keeps explicit newlines', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(wrapText('a\nb', font, 11, 500)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run** `pnpm vitest run src/services/claim-pdf/format.test.ts src/services/claim-pdf/text-layout.test.ts` → FAIL.

- [ ] **Step 3: Implement.** `constants.ts`:

```ts
export const A4 = { width: 595.28, height: 841.89 } as const;

export const mm = (v: number): number => (v * 72) / 25.4;

/** Fixed recipient of all correspondence power-of-attorney mail. */
export const POA_HOLDER = {
  salutation: 'Frau',
  fullName: 'Anna Katharina Charlotte Kliem',
  nameWithBirthName: 'Anna Katharina Charlotte Kliem, geb. Böckers',
  birthDate: '06.05.1983',
  birthPlace: 'Münster Westfalen',
  street: 'Kaskelstraße 46',
  postalCodeCity: '10317 Berlin',
  country: 'Deutschland',
  email: 'assistenz.kliem@gmail.com',
} as const;

/**
 * Cover-letter geometry measured from the lettershop-approved reference
 * (Cover Letter VBL.doc rendered to PDF). Origin: TOP-left, values in pt.
 * The recipient block MUST stay inside the DIN 5008 Typ B window zone —
 * do not change without re-validating with the lettershop sizing sheet.
 */
export const COVER_LAYOUT = {
  marginLeft: 68.3,
  fontSize: 11,
  lineHeight: 13.8,
  recipient: { x: 68.3, firstLineTop: 166.2, secondLineTop: 193.8 },
  dateLine: { x: 312.25, top: 288.9 },
  subjectTop: 315.5,
  bodyTop: 356.9,
  signatureImageHeight: 40,
} as const;
```

`format.ts` — implement the four helpers. `countryToIso3`: uppercase-trim input; if it already matches `/^[A-Z]{3}$/` return it; otherwise look up a lowercase-keyed map covering at least: philippines, australia, germany, austria, switzerland, united states/usa, united kingdom/uk/great britain, canada, new zealand, india, france, italy, spain, netherlands, poland, turkey, brazil, china, japan, south korea, indonesia, vietnam, thailand, malaysia, singapore; return `''` when unknown (never guess). `splitStreetHouseNumber`: regex `/^(.+?)\s+(\d+\s*[a-zA-Z]?(?:[-/]\d+\w?)?)$/` → groups (street, houseNumber); no match → `{ street: line, houseNumber: '' }`. `formatGermanDate`: accept `Date` or `YYYY-MM-DD` string (construct via `new Date(y, m-1, d)` for strings to avoid TZ shifts).

`text-layout.ts`:

```ts
import type { PDFFont } from 'pdf-lib';

/** Greedy word-wrap; preserves explicit \n breaks. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}
```

- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(claim-pdf): layout constants and German formatting helpers"`

---

### Task 3: Cover letter generator (DIN 5008 Typ B)

**Files:**
- Create: `src/services/claim-pdf/cover-letter.ts`
- Test: `src/services/claim-pdf/cover-letter.test.ts`

**Interfaces:**
- Consumes: `COVER_LAYOUT`, `POA_HOLDER`, `A4`, `wrapText`, `formatGermanDate`.
- Produces: `buildCoverLetterPlan(data: CoverLetterData, font: PDFFont, boldFont: PDFFont): DrawOp[]` (pure — testable) and `renderCoverLetter(doc: PDFDocument, data: CoverLetterData): Promise<void>` (adds one A4 page to `doc`).

```ts
export interface CoverLetterData {
  firstName: string;
  lastName: string;
  vblReference: string;
  signingPlace: string;
  dateToday: string; // pre-formatted DD.MM.YYYY
  signaturePng: Uint8Array;
}
export type DrawOp =
  | { kind: 'text'; text: string; x: number; yTop: number; size: number; bold?: boolean }
  | { kind: 'signature'; x: number; yTop: number; height: number };
```

`yTop` = distance from the TOP of the page (converted to pdf-lib bottom-origin only inside `renderCoverLetter`: `y = A4.height - yTop - size`). Keeping the plan top-origin lets tests assert directly against the measured reference values.

**Letter content (verbatim from the approved template, placeholders substituted):**

```
VBL. Kundenservice          ← recipient line 1 (x 68.3, yTop 166.2)
76240 Karlsruhe             ← recipient line 2 (x 68.3, yTop 193.8)

{signingPlace}, den {dateToday}                    ← right block (x 312.25, yTop 288.9)

Antrag auf Beitragserstattung – Versicherungsnummer {vblReference}   ← bold, yTop 315.5

Sehr geehrte Damen und Herren,
Im Anhang übersende ich Ihnen Dokumente zur Durchführung meiner Beitragserstattung.

Bitte senden Sie den Erstattungsbescheid per Post an die Postempfangs-Bevollmächtigte

Frau Anna Katharina Charlotte Kliem
Kaskelstraße 46
10317 Berlin
Deutschland

oder per E-Mail an assistenz.kliem@gmail.com.

Mit freundlichen Grüßen

[signature image, height 40pt]
{firstName} {lastName}

Anhang:
Antrag auf Beitragserstattung
Kopie Reisepass (Vollmachtgeber)
Postempfangsvollmacht
Kopie Personalausweis der Bevollmächtigten (Anna Katharina Charlotte Kliem)
```

Body starts at `COVER_LAYOUT.bodyTop`, advances by `lineHeight` per line (blank lines advance too); wrap body paragraphs at `maxWidth = A4.width - 2 * COVER_LAYOUT.marginLeft`. The PoA-holder address block and Anhang list come from `POA_HOLDER`, not string literals.

- [ ] **Step 1: Write failing test** — assert the plan pins the address block to the measured reference:

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buildCoverLetterPlan, renderCoverLetter } from './cover-letter';

const data = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  vblReference: 'AB12334567',
  signingPlace: 'Manila',
  dateToday: '06.07.2026',
  signaturePng: new Uint8Array(), // not used by plan builder
};

describe('cover letter', () => {
  it('places the recipient address exactly at the lettershop-approved window position', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const plan = buildCoverLetterPlan(data, font, bold);
    const line1 = plan.find((op) => op.kind === 'text' && op.text === 'VBL. Kundenservice');
    const line2 = plan.find((op) => op.kind === 'text' && op.text === '76240 Karlsruhe');
    expect(line1).toMatchObject({ x: 68.3, yTop: 166.2, size: 11 });
    expect(line2).toMatchObject({ x: 68.3, yTop: 193.8, size: 11 });
  });

  it('substitutes placeholders and lists all 4 attachments', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const texts = buildCoverLetterPlan(data, font, bold)
      .filter((op): op is Extract<typeof op, { kind: 'text' }> => op.kind === 'text')
      .map((op) => op.text);
    expect(texts).toContain('Manila, den 06.07.2026');
    expect(texts.some((t) => t.includes('Versicherungsnummer AB12334567'))).toBe(true);
    expect(texts).toContain('Antrag auf Beitragserstattung');
    expect(texts).toContain('Kopie Reisepass (Vollmachtgeber)');
    expect(texts).toContain('Postempfangsvollmacht');
    expect(texts.some((t) => t.startsWith('Kopie Personalausweis der Bevollmächtigten'))).toBe(true);
  });

  it('renders a single A4 page without throwing', async () => {
    const doc = await PDFDocument.create();
    // 1x1 transparent PNG
    const png = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
      (c) => c.charCodeAt(0)
    );
    await renderCoverLetter(doc, { ...data, signaturePng: png });
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `cover-letter.ts` per the content spec above (`buildCoverLetterPlan` emits `DrawOp[]` walking a cursor down from `bodyTop`; the signature op sits between "Mit freundlichen Grüßen" and the name line; `renderCoverLetter` adds page `[A4.width, A4.height]`, embeds fonts + `doc.embedPng(data.signaturePng)`, executes ops, scales signature to `height: 40` preserving aspect ratio). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(claim-pdf): DIN 5008 Typ B cover letter generator"`

---

### Task 4: Power-of-Attorney (Postempfangsvollmacht) letter

**Files:**
- Create: `src/services/claim-pdf/poa-letter.ts`
- Test: `src/services/claim-pdf/poa-letter.test.ts`

**Interfaces:**
- Produces: `renderPoaLetter(doc: PDFDocument, data: PoaLetterData): Promise<void>` — appends 1–2 A4 pages.

```ts
export interface PoaLetterData {
  firstName: string; lastName: string;
  streetAddress: string; postalCode: string; city: string;
  dateOfBirth: string;   // DD.MM.YYYY
  placeOfBirth: string;
  vblReference: string;
  dateToday: string;     // DD.MM.YYYY
  signaturePng: Uint8Array;
}
```

**Full letter text** (from `Power of Attorney Correspondence VBL.docx`; `{x}` = substitution; layout: title bold 13pt, body 11pt Helvetica, margins 68.3pt left/right, start yTop 80pt, lineHeight 13.8, blank line between blocks, bullets rendered as `• ` with hanging indent 12pt, wrap at maxWidth):

> **Empfangsvollmacht für Post der Versorgungsanstalt des Bundes und der Länder (VBL)**
>
> Vollmachtgeber: Vorname: {firstName} Nachname: {lastName} Anschrift: {streetAddress}, {postalCode} {city} Geburtsdatum: {dateOfBirth} Geburtsort: {placeOfBirth} VBL-Versicherungsnummer / Aktenzeichen: {vblReference}
>
> Bevollmächtigte: Vorname: Anna Katharina Charlotte Nachname: Kliem (geb. Böckers) Anschrift: Kaskelstraße 46, 10317 Berlin
>
> Hiermit erteile ich, {firstName} {lastName}, geboren am {dateOfBirth} in {placeOfBirth} und wohnhaft in {streetAddress}, {postalCode} {city} (nachfolgend „Vollmachtgeber" genannt), der Anna Katharina Charlotte Kliem, geb. Böckers, geboren am 06.05.1983 in Münster Westfalen und wohnhaft in Kaskelstraße 46, 10317 Berlin (nachfolgend „Bevollmächtigte" genannt), die Vollmacht, alle Post der VBL in meinem Namen entgegenzunehmen und zu verwalten sowie die im Zusammenhang mit meinem Beitragserstattungsverfahren erforderliche Korrespondenz mit der VBL zu führen.
>
> Umfang der Vollmacht: Die Bevollmächtigte ist berechtigt, folgende Handlungen in meinem Namen vorzunehmen:
> - Annahme von Postsendungen: Entgegennahme von Briefen, Paketen und sonstigen Postsendungen der VBL.
> - Unterschrift bei Annahme: Unterzeichnung von Empfangsbestätigungen und Zustellnachweisen.
> - Verwaltung der Post: Öffnen und Sortieren der Post sowie Weiterleitung an mich.
> - Abholung von Postsendungen: Abholung von Postsendungen bei der Poststelle oder einem Paketdienst.
> - Korrespondenz: Führen der notwendigen Korrespondenz und Kommunikation mit der VBL im Zusammenhang mit meinem Beitragserstattungsverfahren.
>
> Diese Vollmacht ist ab dem {dateToday} gültig und bleibt bis zum Abschluss des Beitragserstattungsverfahrens bzw. bis auf schriftlichen Widerruf durch den Vollmachtgeber bestehen. Anschließend soll alle Post wieder direkt an den Vollmachtgeber zugestellt werden.
>
> {city}, {dateToday}    [signature image h=40pt]
> Unterschrift des Vollmachtgebers ({firstName} {lastName})

Implementation note: keep a `cursor` in top-origin pt; if `cursor > A4.height - 120` before the signature block, add a new A4 page and reset cursor to 80 (guarantees signature never clips). Build the Bevollmächtigte strings from `POA_HOLDER`.

- [ ] **Step 1: Write failing test** — render with sample data (reuse the 1×1 PNG from Task 3's test), assert: page count is 1 for typical data; page size A4; and extract text via `page.doc` is not feasible with pdf-lib, so instead assert structure indirectly: export a pure `buildPoaText(data): string` from the module and test placeholder substitution on it (contains `Juan Dela Cruz`, `06.07.2026`, `AB12334567`, `Kaskelstraße 46`, no remaining `{{`). Then `renderPoaLetter` smoke-test (A4, ≥1 page, no throw).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(claim-pdf): Postempfangsvollmacht letter generator"`

---

### Task 5: L203 form filler

**Files:**
- Create: `src/services/claim-pdf/l203-form.ts`
- Test: `src/services/claim-pdf/l203-form.test.ts`

**Interfaces:**
- Consumes: `loadL203Template`, `formatGermanDateCompact`, `countryToIso3`, `splitStreetHouseNumber`.
- Produces: `fillL203(data: L203Data): Promise<PDFDocument>` — returns a **flattened** 3-page document; and internal (exported for tests) `fillL203Fields(doc: PDFDocument, data: L203Data): void` operating pre-flatten.

```ts
export interface L203Data {
  vblReference: string;
  firstName: string; lastName: string;
  dateOfBirth: string;        // YYYY-MM-DD (raw claim value)
  placeOfBirth: string;
  addressLine1: string; postalCode: string; city: string; country: string | null;
  iban: string; swiftBic: string | null;
  accountHolderName: string | null; bankName: string | null; bankCity: string | null;
  ortDatum: string;           // "City, DD.MM.YYYY"
  signaturePng: Uint8Array;
}
```

- [ ] **Step 0: Verify the radio mapping (exploration, no commit).** Write a throwaway script (run with `pnpm tsx`) that loads the template, and for each `Optionsfeld2..5` button field prints its widget rectangles + page. Cross-check against the annotated sample (`/Users/kael/Downloads/VBL Application form data sample.pdf`, page 2: 5.1–5.4 all "nein"; "Kopie Ausweisdokument … liegt bei"). Confirm/adjust the mapping used in Step 3 (`Optionsfeld2→nein`, `Optionsfeld3→liegtbei`, `Optionsfeld4→nein`, `Optionsfeld5→'2'`). Record the verified mapping in a comment in `l203-form.ts`.

- [ ] **Step 1: Write failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadL203Template } from './assets';
import { fillL203, fillL203Fields } from './l203-form';

const PNG_1X1 = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0)
);

const data = {
  vblReference: 'AB12334567',
  firstName: 'Juan', lastName: 'Dela Cruz',
  dateOfBirth: '1990-03-05', placeOfBirth: 'Manila',
  addressLine1: 'Mabini Street 12', postalCode: '1000', city: 'Manila',
  country: 'Philippines',
  iban: 'DE89370400440532013000', swiftBic: 'COBADEFFXXX',
  accountHolderName: null, bankName: 'Commerzbank', bankCity: 'Berlin',
  ortDatum: 'Manila, 06.07.2026',
  signaturePng: PNG_1X1,
};

describe('L203 form filling', () => {
  it('fills all mapped fields (pre-flatten)', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    fillL203Fields(doc, data);
    const form = doc.getForm();
    const get = (n: string) =>
      form.getTextField(`topmostSubform[0].Page1[0].${n}[0]`).getText();
    expect(get('versicherungsnummer')).toBe('AB12334567');
    expect(get('Name')).toBe('Dela Cruz');
    expect(get('Vorname')).toBe('Juan');
    expect(get('geburtsdatum')).toBe('05031990');
    expect(get('Geburtsort')).toBe('Manila');
    expect(get('Straße')).toBe('Mabini Street'); // house number split off
    expect(get('Hausnr')).toBe('12');
    expect(get('PLZ')).toBe('1000');
    expect(get('Wohnort')).toBe('Manila');
    expect(get('Länderkennz')).toBe('PHL');
    expect(get('IBAN')).toBe('DE89370400440532013000');
    expect(get('BIC')).toBe('COBADEFFXXX');
    expect(get('geldinstitut')).toBe('Commerzbank, Berlin');
    expect(
      form.getTextField('topmostSubform[0].Page2[0].ort_datum[0]').getText()
    ).toBe('Manila, 06.07.2026');
    expect(
      form.getTextField('topmostSubform[0].Page2[0].Anlagen[0]').getText()
    ).toBe('Kopie Ausweisdokument, Postempfangsvollmacht');
    expect(
      form.getRadioGroup('topmostSubform[0].Page2[0].Optionsfeld2[0]').getSelected()
    ).toBe('nein');
  });

  it('produces a flattened 3-page A4 document with no remaining form fields', async () => {
    const doc = await fillL203(data);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getForm().getFields().length).toBe(0);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.3, 0);
      expect(page.getHeight()).toBeCloseTo(841.9, 0);
    }
  });

  it('leaves Kontoinhaber empty when account holder equals the claimant', async () => {
    const doc = await PDFDocument.load(loadL203Template());
    fillL203Fields(doc, { ...data, accountHolderName: 'Juan Dela Cruz' });
    expect(
      doc.getForm().getTextField('topmostSubform[0].Page1[0].Kontoinhaber[0]').getText() ?? ''
    ).toBe('');
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `l203-form.ts`:
  - `fillL203Fields`: set every text field per the mapping table (Global section). Radio groups: `form.getRadioGroup(...).select('nein')` etc. per Step-0-verified mapping; checkboxes `Bevollmächtigten`/`Betreuer`/`Optionsfeld1` untouched. Wrap each radio select in try/catch that rethrows with the field name for debuggability.
  - `fillL203`: load template → `fillL203Fields` → stamp signature: read the `ort_datum` widget rect (`field.acroField.getWidgets()[0].getRectangle()`), embed PNG on page index 1 at `x = rect.x + rect.width + 30`, `y = rect.y - 5`, height 35pt aspect-scaled (right of Ort/Datum under the "Unterschrift" column) → `const helv = await doc.embedFont(StandardFonts.Helvetica); form.updateFieldAppearances(helv); form.flatten();` → return doc.
- [ ] **Step 4: Run** → PASS. Also write the filled sample once to the scratchpad and eyeball it against the annotated sample PDF (documented in Task 9 anyway).
- [ ] **Step 5: Commit** — `git commit -m "feat(claim-pdf): L203 AcroForm filler with signature stamp and flatten"`

---

### Task 6: A4 normalization for passports and appended PDFs

**Files:**
- Create: `src/services/claim-pdf/normalize-a4.ts`
- Test: `src/services/claim-pdf/normalize-a4.test.ts`

**Interfaces:**
- Produces:
  - `appendImageAsA4Page(doc: PDFDocument, image: Uint8Array, mime: 'image/jpeg' | 'image/png' | 'image/jpg'): Promise<void>` — new A4 page, image scaled to fit inside 15mm margins, centered.
  - `appendPdfNormalizedToA4(doc: PDFDocument, pdfBytes: Uint8Array): Promise<void>` — for each source page: if within ±6pt of A4 portrait, `copyPages` verbatim; otherwise `embedPage` and draw scaled-to-fit + centered on a fresh A4 page.

- [ ] **Step 1: Write failing test** — build fixture PDFs in-test with pdf-lib (a US-Letter page 612×792, an A5 page 420×595, an exact-A4 page) plus the 1×1 PNG; assert: every output page is A4 ±0.5pt; A4 input page count preserved; image path adds exactly 1 page.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (use `Math.min(maxW / w, maxH / h)` scaling; `maxW = A4.width - 2*mm(15)`; center: `x = (A4.width - w*scale)/2`). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(claim-pdf): A4 normalization for uploaded passports"`

---

### Task 7: Pure assembler + orchestrating service + S3 download util

**Files:**
- Create: `src/services/claim-pdf/assemble.ts`, `src/services/claim-pdf/index.ts`
- Modify: `src/utils/s3.ts` (add `downloadFile`)
- Test: `src/services/claim-pdf/assemble.test.ts`, `src/services/claim-pdf/index.test.ts`

**Interfaces:**
- `assembleClaimPdf(input: ClaimPdfInput): Promise<Uint8Array>` (pure — no DB/S3):

```ts
export interface ClaimPdfInput {
  claim: {
    firstName: string; lastName: string;
    dateOfBirth: string; placeOfBirth: string;
    currentAddressLine1: string; currentAddressLine2: string | null;
    currentCity: string; currentPostalCode: string; currentCountry: string | null;
    svNummer: string;
    iban: string; swiftBic: string | null;
    accountHolderName: string | null; bankName: string | null; bankCity: string | null;
  };
  signaturePng: Uint8Array;
  passport: { bytes: Uint8Array; fileType: string }; // pdf or image
  now?: Date; // injectable for tests
}
```

- `ClaimPdfService` (static class): `generateAndStoreForClaim(claimId: string, userId: string): Promise<{ pdfS3Key: string }>` and `getRequiredFieldErrors(claim): string[]`.
- `downloadFile(key: string): Promise<Buffer>` in `src/utils/s3.ts` (GetObjectCommand → `Body.transformToByteArray()`; throws in local dev when bucket env is absent, same guard style as `uploadFile`).

**Assembly order (fixed):** 1 cover letter → 2 L203 (3 pages) → 3 PoA letter → 4 user passport (normalized) → 5 PoA-holder ID. Merge: create `PDFDocument`, render cover into it, then `copyPages` from the flattened L203 doc, render PoA, then normalize-append passport (branch on `fileType === 'application/pdf'` vs image), then `copyPages` of the PoA-holder ID asset.

**Service flow** (`generateAndStoreForClaim`):
1. `ClaimsApplicationService.getClaim(claimId, userId)` — not found → throw `Claim not found`.
2. `getRequiredFieldErrors(claim)` — required: firstName, lastName, dateOfBirth, placeOfBirth, currentAddressLine1, currentCity, currentPostalCode, svNummer, iban, signatureId, plus a claim document with role `passport`. Non-empty → throw `Cannot generate PDF, missing: ...` (route maps to 400).
3. Load signature row (`shared.signatures` by `claim.signatureId`), strip optional `data:image/*;base64,` prefix from `signatureData`, decode base64. If the signature is JPEG (`signatureData` prefix `data:image/jpeg`), decode accordingly and pass through — cover/PoA/L203 renderers receive PNG bytes today; keep PNG-only and throw a clear error otherwise (signatures route stores PNG).
4. Query `claimDocuments` join `documents` for role `passport`; `downloadFile(document.s3Key)`.
5. `assembleClaimPdf(...)` → bytes.
6. `uploadFile(pdfKey, Buffer.from(bytes), 'application/pdf')` with `pdfKey = claims/${claimId}/vbl-claim-package-${Date.now()}.pdf` (timestamp keeps regenerations unique — lettershop requires unique names).
7. `db.transaction`: update claim `pdfS3Key` + `updatedAt`; insert audit log row following the exact pattern used in `ClaimsApplicationService.submitClaim` (`src/services/claims-application.ts:874`).
8. Return `{ pdfS3Key: pdfKey }`.

- [ ] **Step 1: Write failing assembler test** (`assemble.test.ts`): feed fixture claim data + 1×1 PNG signature + a passport as (a) small PNG image and (b) a non-A4 PDF built in-test; assert output loads with `PDFDocument.load`, page count = 1 + 3 + 1 + 1 + 1 = 7 (single-page PoA, single-page passport), every page A4, and `doc.getForm().getFields().length === 0`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement `assemble.ts`.** **Step 4: Run** → PASS. **Step 5: Commit** — `git commit -m "feat(claim-pdf): pure claim package assembler"`.
- [ ] **Step 6: Write failing service test** (`index.test.ts`, real Postgres): create test user + claim with all required fields + signature row (reuse fixtures from `src/test/fixtures.ts`) + a `documents` row with role `passport`; stub S3: `vi.spyOn(s3, 'downloadFile').mockResolvedValue(<png buffer>)` and `vi.spyOn(s3, 'uploadFile').mockResolvedValue(undefined)`; call `generateAndStoreForClaim`; assert returned key matches `/^claims\/.+\/vbl-claim-package-\d+\.pdf$/`, uploadFile received `application/pdf` + parseable bytes, and the claim row now has `pdfS3Key`. Second test: claim missing `iban` → rejects with `missing`.
- [ ] **Step 7: Run** → FAIL. **Step 8: Implement `index.ts` + `downloadFile`.** **Step 9: Run** → PASS; also `pnpm type-check`.
- [ ] **Step 10: Commit** — `git commit -m "feat(claim-pdf): ClaimPdfService orchestration with S3 storage"`

---

### Task 8: Routes + submit hook + VBL dashboard button

**Files:**
- Modify: `src/routes/claims.ts` (two new routes), `src/services/claims-application.ts` (submit hook)
- Modify: `apps/vbl/lib/onboarding-api.ts`, `apps/vbl/app/dashboard/claims/[id]/page.tsx`
- Test: extend `src/routes/claims.test.ts`

**Interfaces:**
- `POST /api/claims/:id/generate-pdf` → 200 `{ success: true, data: { pdfS3Key, downloadUrl } }` (calls `ClaimPdfService.generateAndStoreForClaim`, then `getPresignedUrl`); 400 on `missing`-prefixed errors, 404 not found.
- `GET /api/claims/:id/pdf` → 200 `{ success: true, data: { downloadUrl } }` when `pdfS3Key` set; 404 `PDF not generated yet` otherwise.
- Submit hook: in `ClaimsApplicationService.submitClaim`, after successful status flip, call `ClaimPdfService.generateAndStoreForClaim(claimId, userId)` inside try/catch — **log an error and continue on failure** (submission must not be rolled back by PDF issues; PDF can be regenerated via POST route). Add a `logger.warn` with claimId on failure.
- Frontend `apps/vbl/lib/onboarding-api.ts` (follow the file's existing fetch-wrapper style): `generateClaimPdf(claimId): Promise<{ pdfS3Key: string; downloadUrl: string }>`, `getClaimPdfUrl(claimId): Promise<string>`.
- Dashboard page: in the claim detail header/actions area, when claim status is `submitted`/`processing`/`completed`, render a `Download claim PDF` button → `getClaimPdfUrl` → `window.open(url, '_blank')`; on 404 fall back to calling `generateClaimPdf` (covers legacy claims submitted before this feature). Follow the page's existing button styling (Tailwind classes used by its existing actions).

- [ ] **Step 1: Write failing route tests** in `src/routes/claims.test.ts` (follow existing patterns: `createTestApp(claims)`, auth header via `generateTestToken`): (a) GET pdf before generation → 404; (b) mock `ClaimPdfService.generateAndStoreForClaim` (`vi.spyOn`) to return a key + mock `getPresignedUrl` → POST generate-pdf → 200 with `downloadUrl`; (c) POST on another user's claim → 404.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement routes + submit hook + frontend.** **Step 4: Run route tests + full suite** `pnpm test:run` → PASS; `pnpm type-check` from repo root for both packages; `pnpm lint`.
- [ ] **Step 5: Commit** — `git commit -m "feat(claim-pdf): generation/download routes, submit hook, dashboard download button"`

---

### Task 9: End-to-end QA harness + lettershop-placement verification

**Files:**
- Create: `packages/functions/scripts/preview-claim-pdf.ts` (dev-only script, committed)

**What it does:** builds a full sample package via `assembleClaimPdf` with realistic fixture data (name with umlauts — e.g. `Jürgen Groß` — long address, Philippine address for Länderkennz, sample passport rendered in-script as a colored rectangle PNG via pdf-lib) and writes `claim-pdf-preview.pdf` to the path given as argv[1].

- [ ] **Step 1: Write the script** (plain tsx script, no test framework; `pnpm tsx scripts/preview-claim-pdf.ts /tmp/claim-pdf-preview.pdf`).
- [ ] **Step 2: Generate and verify address placement mechanically.** Run the script, then verify with poppler (available on this machine):

```bash
pnpm tsx scripts/preview-claim-pdf.ts "$SCRATCHPAD/claim-pdf-preview.pdf"
pdftotext -bbox -f 1 -l 1 "$SCRATCHPAD/claim-pdf-preview.pdf" - | grep -E "Kundenservice|Karlsruhe"
```

Expected: `Kundenservice` word box `xMin≈98`, `yMin≈166±2`; `76240` box `xMin≈68.3±1`, `yMin≈193.8±2` (matches the approved reference letter within 2pt). If out of tolerance, fix `COVER_LAYOUT`, not the assertion.

- [ ] **Step 3: Page-format check:**

```bash
pdfinfo -f 1 -l 99 "$SCRATCHPAD/claim-pdf-preview.pdf" | grep "Page.*size"
```

Expected: every page `595.28 x 841.89 pts (A4)`.

- [ ] **Step 4: Visual check.** Open the preview PDF and compare page-by-page against `/Users/kael/Downloads/VBL Application form data sample.pdf` (L203 pages: same fields populated, radios 5.1–5.4 = nein, signature next to Ort/Datum) and the DIN sizing sheet (address inside window zone). Record findings in the task report.
- [ ] **Step 5: Commit** — `git commit -m "chore(claim-pdf): add preview/QA script for claim package generation"`

---

### Task 10: Lettershop SFTP delivery (onlinebrief24.de) with safe test mode

Added mid-execution at the user's request: credentials were provided and live in the git-ignored root `.env` (`LETTERSHOP_SFTP_HOST/PORT/USER/PASSWORD`, `LETTERSHOP_SFTP_PRIVATE_KEY_PATH`, `LETTERSHOP_MODE`). **NEVER commit credentials** — reference env vars only.

**Files:**
- Modify: `packages/functions/package.json` (add `ssh2-sftp-client` + `@types/ssh2-sftp-client` dev type), `packages/functions/build.js` (`--external:ssh2-sftp-client`)
- Modify: `packages/functions/src/utils/env.ts` (new optional env vars, Zod-validated)
- Create: `packages/functions/src/services/lettershop.ts`
- Modify: `packages/functions/src/services/claims-application.ts` (submit hook, after PDF generation)
- Test: `packages/functions/src/services/lettershop.test.ts`

**Interfaces:**
- `LettershopService.buildFilename(claimId: string, mode: 'test' | 'live'): string`
- `LettershopService.sendClaimPdf(claimId: string, pdfBytes: Uint8Array, userId: string): Promise<{ submissionId: string } | null>` — returns null when mode is `off`/unconfigured.

**Vendor facts (from "SFTP Schnittstelle Dokumentation 5.0", 26.02.2025):**
- Host `api.onlinebrief24.de`, port 22, SFTP/SSH; user = registered e-mail lowercase; upload dir `/upload/api`. Password auth now; public-key auth once the RSA-2048 SSH2 key is registered with support.
- Filecode filename: 13-digit parameter string + `-` + unique name + `.pdf`. Allowed chars: `A-Z a-z 0-9 . - _ #`.
- Parameter positions: 1 print (0=s/w, 1=color), 2 mode (0=simplex, 1=duplex), 3 envelope (0=DIN lang auto→C4 above 8 sheets, 1=C4), 4 zone (0=auto, 1=national DE, 3=international), 5 registered mail (0=none, 1=Einwurf, 2=Standard), 6 payment slip (0=none), 7–13 reserve, always `0`.
- **Live parameter code: `1001000000000`** (color, simplex, DIN-lang auto, national — recipient is VBL Karlsruhe, Germany; no registered mail initially). This matches the doc's own example code.
- **There is NO vendor test flag.** The vendor-documented test method: upload a file whose filename deliberately fails validation → system e-mails an error to the registered address, letter is NOT produced and NOT billed, but connectivity + processing are proven. Test-mode filename: `TESTMODE-vbl-claim-{claimId}-{Date.now()}.pdf` (no 13-digit prefix → guaranteed rejection).
- Live filename: `1001000000000-vbl-claim-{claimId}-{Date.now()}.pdf` (unique names required; identical names within ~10 min overwrite each other).
- One letter per PDF; DIN A4 only (already guaranteed by Tasks 3–7).

**Behavior:**
- Mode from `env.LETTERSHOP_MODE` (`'test' | 'live' | 'off'`, default `'test'`). If credentials/host missing → behave as `'off'` (return null, `logger.warn`), mirroring the s3 util's local-dev no-op guard style.
- `sendClaimPdf`: connect via `ssh2-sftp-client` (auth: `privateKey` from `LETTERSHOP_SFTP_PRIVATE_KEY_PATH` if file exists, else `password`), `put` the PDF buffer to `/upload/api/{filename}`, disconnect in `finally`. On success: update claim `lettershopSubmissionId = filename` + audit log entry (`db.transaction`, mirror the audit pattern in `ClaimsApplicationService.submitClaim`). On error: log + rethrow.
- Submit hook: in `ClaimsApplicationService.submitClaim`, inside the existing post-submit PDF try/catch (Task 8), after `generateAndStoreForClaim` succeeds, call `LettershopService.sendClaimPdf(...)` with the generated bytes (have `generateAndStoreForClaim` return `{ pdfS3Key, bytes }` or re-download; prefer returning bytes to avoid an S3 round-trip). Lettershop failure must not fail submission (same warn-and-continue contract as PDF failure).
- TDD: unit-test `buildFilename` (both modes: exact prefix, allowed-chars regex `/^[A-Za-z0-9.\-_#]+\.pdf$/`, uniqueness via timestamp) and `sendClaimPdf` in `off` mode (returns null, no connection attempt). For the SFTP call itself, mock `ssh2-sftp-client` (vi.mock) and assert `put` called with `/upload/api/{filename}` and correct auth config shape; do NOT open real connections in CI.
- Manual verification step (run once, controller does this — NOT the implementer): with `LETTERSHOP_MODE=test` and real creds from `.env`, run a script that uploads a tiny valid A4 PDF under the TESTMODE filename and confirm the vendor error e-mail arrives at the registered address. Document the result in the task report.

- [ ] Steps: TDD as usual (failing tests → implement → pass → commit `feat(lettershop): SFTP delivery service with vendor-safe test mode`).

---

## Deferred (explicitly out of scope)

- `Telefon`, `Titel`, `Geburtsname` on L203 (data not captured in onboarding).
- Admin regenerate UI; email notifications.
- Switching lettershop auth to key-only + removing password (after onlinebrief24 confirms key registration).
