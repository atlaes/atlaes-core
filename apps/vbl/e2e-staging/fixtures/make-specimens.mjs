#!/usr/bin/env node
/**
 * Generates the synthetic specimen documents the staging e2e suite uploads.
 *
 *   node e2e-staging/fixtures/make-specimens.mjs        (from apps/vbl)
 *
 * Nothing here is a real person's document. Every page carries a large
 * "SPECIMEN" watermark, names are obviously fake ("SPECIMEN, ERIKA") and
 * the passport numbers are made up. The passport data pages follow the
 * ICAO 9303 TD3 layout with a machine-readable zone whose check digits are
 * computed below, so OCR (and the MRZ-reading prompt) can parse them.
 *
 * Output (committed next to this script):
 *   passport-<code>.png / .pdf   one per specimen nationality
 *   vbl-statement.pdf            VBL insurance statement (calculator upload path)
 *   vddb-statement.pdf           VddB statement (stage upload path)
 *   drv-refund-decision.pdf      DRV refund decision (bAV cash-out, route A)
 *   health-insurance-certificate.pdf
 *                                health insurance certificate (bAV cash-out)
 *   specimens.json               the data printed on each file plus its
 *                                OCR text and sha256 — the e2e specs assert
 *                                OCR results against it, and the local
 *                                OCR stub (local runs only) answers from it
 *
 * Never replace these with real identity documents.
 *
 *   node e2e-staging/fixtures/make-specimens.mjs --documents-only
 *
 * regenerates only the bAV letters (DRV decision, health insurance) and
 * keeps the passports and statements, whose PDFs would otherwise change
 * byte-wise on every run.
 */
import { chromium } from '@playwright/test';
import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// ICAO 9303 MRZ (TD3, 2 x 44 characters)
// ---------------------------------------------------------------------------

function charValue(ch) {
  if (ch === '<') return 0;
  if (/[0-9]/.test(ch)) return Number(ch);
  if (/[A-Z]/.test(ch)) return ch.charCodeAt(0) - 55; // A = 10
  throw new Error(`Invalid MRZ character: ${ch}`);
}

export function checkDigit(field) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i += 1) {
    sum += charValue(field[i]) * weights[i % 3];
  }
  return String(sum % 10);
}

function pad(value, length) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9<]/g, '<');
  if (cleaned.length > length) return cleaned.slice(0, length);
  return cleaned + '<'.repeat(length - cleaned.length);
}

function yymmdd(iso) {
  const [y, m, d] = iso.split('-');
  return `${y.slice(2)}${m}${d}`;
}

export function buildMrz(p) {
  const names = `${p.surname.replace(/ /g, '<')}<<${p.givenNames.replace(/ /g, '<')}`;
  const line1 = pad(`P<${p.issuingState}${names}`, 44);

  const number = pad(p.passportNumber, 9);
  const dob = yymmdd(p.dateOfBirth);
  const expiry = yymmdd(p.dateOfExpiry);
  const personal = pad(p.personalNumber ?? '', 14);
  const personalCheck =
    personal === '<'.repeat(14) ? '<' : checkDigit(personal);
  const composite =
    number +
    checkDigit(number) +
    dob +
    checkDigit(dob) +
    expiry +
    checkDigit(expiry) +
    personal +
    personalCheck;
  const line2 =
    number +
    checkDigit(number) +
    pad(p.nationality, 3) +
    dob +
    checkDigit(dob) +
    p.sex +
    expiry +
    checkDigit(expiry) +
    personal +
    personalCheck +
    checkDigit(composite);
  if (line1.length !== 44 || line2.length !== 44) {
    throw new Error('MRZ lines must be 44 characters');
  }
  return [line1, line2];
}

// ---------------------------------------------------------------------------
// Specimen identities (fictional)
// ---------------------------------------------------------------------------

const PASSPORTS = [
  {
    code: 'uto',
    issuingState: 'UTO',
    nationality: 'UTO',
    countryName: 'UTOPIA',
    nationalityName: 'UTOPIAN',
    surname: 'SPECIMEN',
    givenNames: 'ERIKA',
    sex: 'F',
    dateOfBirth: '1990-08-12',
    placeOfBirth: 'UTOPIA CITY',
    dateOfIssue: '2021-03-01',
    dateOfExpiry: '2031-02-28',
    passportNumber: 'L01X00T47',
  },
  {
    code: 'ind',
    issuingState: 'IND',
    nationality: 'IND',
    countryName: 'REPUBLIC OF INDIA (SPECIMEN)',
    nationalityName: 'INDIAN',
    surname: 'SPECIMEN',
    givenNames: 'ASHA',
    sex: 'F',
    dateOfBirth: '1988-02-29',
    placeOfBirth: 'SAMPLE TOWN',
    dateOfIssue: '2020-06-15',
    dateOfExpiry: '2030-06-14',
    passportNumber: 'Z0000001',
  },
  {
    code: 'phl',
    issuingState: 'PHL',
    nationality: 'PHL',
    countryName: 'REPUBLIC OF THE PHILIPPINES (SPECIMEN)',
    nationalityName: 'FILIPINO',
    surname: 'SPECIMEN',
    givenNames: 'JUAN',
    sex: 'M',
    dateOfBirth: '1985-11-03',
    placeOfBirth: 'SAMPLE CITY',
    dateOfIssue: '2022-01-10',
    dateOfExpiry: '2032-01-09',
    passportNumber: 'P0000000A',
  },
];

function displayDate(iso) {
  const [y, m, d] = iso.split('-');
  const mon = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ][Number(m) - 1];
  return `${d} ${mon} ${y}`;
}

// MRZ filler characters are '<', which would otherwise open HTML tags.
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function passportHtml(p, mrz) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; }
  .page { position: relative; width: 1000px; height: 700px; box-sizing: border-box;
    padding: 36px 44px; background: linear-gradient(135deg, #eef3f8, #dfe8f1);
    border: 2px solid #8aa0b6; overflow: hidden; }
  .title { font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #1d3557; }
  .sub { font-size: 14px; color: #1d3557; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: 230px 1fr; gap: 28px; }
  .photo { width: 230px; height: 290px; background: #c9d3dd; border: 1px solid #8aa0b6;
    display: flex; align-items: center; justify-content: center; color: #56677a;
    font-size: 15px; text-align: center; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 26px; }
  .f label { display: block; font-size: 11px; color: #4a5a6a; text-transform: uppercase; }
  .f div { font-size: 20px; font-weight: bold; color: #111; }
  .mrz { position: absolute; left: 44px; right: 44px; bottom: 34px;
    font-family: 'OCR B', 'OCR-B', 'Courier New', monospace; font-size: 27px;
    letter-spacing: 1.6px; line-height: 44px; color: #000; background: #fff;
    padding: 6px 10px; white-space: pre; }
  .wm { position: absolute; top: 230px; left: -40px; width: 1100px; text-align: center;
    transform: rotate(-18deg); font-size: 150px; font-weight: 900;
    color: rgba(200, 0, 0, 0.18); letter-spacing: 16px; pointer-events: none; }
  </style></head><body><div class="page">
  <div class="title">PASSPORT / PASSEPORT — ${p.countryName}</div>
  <div class="sub">SPECIMEN — NOT A VALID TRAVEL DOCUMENT — FOR SOFTWARE TESTING ONLY</div>
  <div class="grid">
    <div class="photo">NO PHOTO<br>SPECIMEN</div>
    <div class="fields">
      <div class="f"><label>Type</label><div>P</div></div>
      <div class="f"><label>Issuing state</label><div>${p.issuingState}</div></div>
      <div class="f"><label>Passport No.</label><div>${p.passportNumber}</div></div>
      <div class="f"><label>Nationality</label><div>${p.nationalityName}</div></div>
      <div class="f"><label>Surname</label><div>${p.surname}</div></div>
      <div class="f"><label>Given names</label><div>${p.givenNames}</div></div>
      <div class="f"><label>Date of birth</label><div>${displayDate(p.dateOfBirth)}</div></div>
      <div class="f"><label>Sex</label><div>${p.sex}</div></div>
      <div class="f"><label>Place of birth</label><div>${p.placeOfBirth}</div></div>
      <div class="f"><label>Date of issue</label><div>${displayDate(p.dateOfIssue)}</div></div>
      <div class="f"><label>Date of expiry</label><div>${displayDate(p.dateOfExpiry)}</div></div>
      <div class="f"><label>Authority</label><div>SPECIMEN OFFICE</div></div>
    </div>
  </div>
  <div class="wm">SPECIMEN</div>
  <div class="mrz">${escapeHtml(mrz[0])}\n${escapeHtml(mrz[1])}</div>
  </div></body></html>`;
}

function passportOcrText(p, mrz) {
  return [
    `# PASSPORT / PASSEPORT — ${p.countryName}`,
    'SPECIMEN — NOT A VALID TRAVEL DOCUMENT — FOR SOFTWARE TESTING ONLY',
    'Type: P',
    `Issuing state: ${p.issuingState}`,
    `Passport No.: ${p.passportNumber}`,
    `Nationality: ${p.nationalityName}`,
    `Surname: ${p.surname}`,
    `Given names: ${p.givenNames}`,
    `Date of birth: ${displayDate(p.dateOfBirth)}`,
    `Sex: ${p.sex}`,
    `Place of birth: ${p.placeOfBirth}`,
    `Date of issue: ${displayDate(p.dateOfIssue)}`,
    `Date of expiry: ${displayDate(p.dateOfExpiry)}`,
    'SPECIMEN',
    mrz[0],
    mrz[1],
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Pension statements (fictional, for the calculator upload path)
// ---------------------------------------------------------------------------

const STATEMENTS = [
  {
    file: 'vbl-statement.pdf',
    provider: 'VBL',
    institution:
      'Versorgungsanstalt des Bundes und der Länder (VBL) — SPECIMEN',
    plan: 'VBLklassik',
    federalState: 'Bavaria',
    federalStateDe: 'Bayern',
    start: { month: 'January', year: '2020', de: '01.01.2020' },
    end: { month: 'December', year: '2021', de: '31.12.2021' },
    salary: '3500',
  },
  {
    file: 'vddb-statement.pdf',
    provider: 'VddB',
    institution: 'Versorgungsanstalt der deutschen Bühnen (VddB) — SPECIMEN',
    plan: null,
    federalState: 'Bavaria',
    federalStateDe: 'Bayern',
    start: { month: 'January', year: '2019', de: '01.01.2019' },
    end: { month: 'December', year: '2020', de: '31.12.2020' },
    salary: '4200',
  },
];

function statementLines(s) {
  return [
    s.institution,
    'Versicherungsnachweis / Statement of insurance — SPECIMEN',
    'Versicherte Person: SPECIMEN, ERIKA (fictional)',
    'Versicherungsnummer: 0000000000 (SPECIMEN)',
    ...(s.plan ? [`Tarif: ${s.plan}`] : []),
    `Arbeitgeber (Sitz): Musterbetrieb, ${s.federalStateDe}`,
    `Pflichtversicherung vom ${s.start.de} bis ${s.end.de}`,
    `Ende des Arbeitsverhältnisses: ${s.end.de}`,
    `Durchschnittliches zusatzversorgungspflichtiges Entgelt: ${s.salary} EUR monatlich`,
    'SPECIMEN — FOR SOFTWARE TESTING ONLY',
  ];
}

function statementHtml(s, body) {
  const lines = body ? [s.institution, ...body] : statementLines(s);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
  .page { position: relative; padding: 60px 70px; min-height: 1000px; }
  h1 { font-size: 22px; } p { font-size: 17px; line-height: 1.6; margin: 6px 0; }
  .wm { position: absolute; top: 380px; left: 0; width: 100%; text-align: center;
    transform: rotate(-25deg); font-size: 140px; font-weight: 900;
    color: rgba(200, 0, 0, 0.16); letter-spacing: 14px; }
  </style></head><body><div class="page">
  <h1>${lines[0]}</h1>
  ${lines
    .slice(1)
    .map((l) => `<p>${l}</p>`)
    .join('\n')}
  <div class="wm">SPECIMEN</div>
  </div></body></html>`;
}

// ---------------------------------------------------------------------------
// bAV cash-out letters (fictional): the DRV refund decision of route A and a
// health insurance certificate. Addressed to the PHL specimen (JUAN).
// ---------------------------------------------------------------------------

const DOCUMENTS = [
  {
    key: 'drvRefundDecision',
    file: 'drv-refund-decision.pdf',
    issuer: 'Deutsche Rentenversicherung Bund',
    drvOffice: 'Deutsche Rentenversicherung Bund',
    decisionDate: '2025-03-14',
    lines: [
      'Deutsche Rentenversicherung Bund',
      'SPECIMEN — FOR SOFTWARE TESTING ONLY — NOT A REAL DECISION',
      'Datum: 14.03.2025',
      'Versicherungsnummer: 00 000000 S 000 (SPECIMEN)',
      'Herrn JUAN SPECIMEN, 1 Specimen Street, 1000 Sample City, Philippines',
      'Bescheid über die Erstattung der Beiträge zur gesetzlichen Rentenversicherung',
      'Sehr geehrter Herr SPECIMEN,',
      'auf Ihren Antrag werden Ihnen die zur gesetzlichen Rentenversicherung gezahlten Beiträge nach § 210 SGB VI erstattet.',
      'Der Erstattungsbetrag von 4.200,00 EUR wird auf das von Ihnen angegebene Konto überwiesen.',
      'Mit der Erstattung ist das bisherige Versicherungsverhältnis aufgelöst.',
      'SPECIMEN — FOR SOFTWARE TESTING ONLY',
    ],
  },
  {
    key: 'healthInsurance',
    file: 'health-insurance-certificate.pdf',
    issuer: 'SPECIMEN Krankenkasse (fictional)',
    type: 'statutory',
    providerName: 'SPECIMEN Krankenkasse',
    insuredSince: { month: 'July', year: '2016', de: '01.07.2016' },
    insuranceNumber: 'X000000000',
    lines: [
      'SPECIMEN Krankenkasse (fictional) — gesetzliche Krankenversicherung',
      'SPECIMEN — FOR SOFTWARE TESTING ONLY — NOT A REAL CERTIFICATE',
      'Musterstraße 1, 10115 Berlin',
      'Versicherungsbescheinigung / Certificate of health insurance',
      'Versicherte Person: SPECIMEN, JUAN (fictional), geboren am 03.11.1985 in SAMPLE CITY',
      'Krankenversichertennummer: X000000000',
      'Art der Versicherung: gesetzlich pflichtversichert (statutory)',
      'Versichert seit: 01.07.2016',
      'Versichert bis: 15.07.2024',
      'SPECIMEN — FOR SOFTWARE TESTING ONLY',
    ],
  },
];

// ---------------------------------------------------------------------------

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function writeDocuments(page, manifest) {
  await page.setViewportSize({ width: 900, height: 1200 });
  manifest.documents = {};
  for (const d of DOCUMENTS) {
    await page.setContent(
      statementHtml({ institution: d.lines[0] }, d.lines.slice(1))
    );
    const pdf = join(OUT, d.file);
    await page.pdf({ path: pdf, format: 'A4', printBackground: true });
    const { lines, key, ...data } = d;
    manifest.documents[key] = {
      ...data,
      ocrText: lines.join('\n'),
      sha256: sha256(pdf),
    };
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 700 },
  });
  const documentsOnly = process.argv.includes('--documents-only');
  if (documentsOnly) {
    const manifest = JSON.parse(
      readFileSync(join(OUT, 'specimens.json'), 'utf8')
    );
    await writeDocuments(page, manifest);
    await browser.close();
    writeFileSync(
      join(OUT, 'specimens.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    console.log(`Wrote ${DOCUMENTS.length} bAV documents to ${OUT}`);
    return;
  }
  const manifest = { passports: {}, statements: {} };

  for (const p of PASSPORTS) {
    const mrz = buildMrz(p);
    await page.setContent(passportHtml(p, mrz));
    const png = join(OUT, `passport-${p.code}.png`);
    const pdf = join(OUT, `passport-${p.code}.pdf`);
    await page.locator('.page').screenshot({ path: png });
    await page.pdf({
      path: pdf,
      width: '1000px',
      height: '700px',
      printBackground: true,
    });
    manifest.passports[p.code] = {
      ...p,
      mrz,
      ocrText: passportOcrText(p, mrz),
      files: {
        png: { name: `passport-${p.code}.png`, sha256: sha256(png) },
        pdf: { name: `passport-${p.code}.pdf`, sha256: sha256(pdf) },
      },
    };
  }

  await page.setViewportSize({ width: 900, height: 1200 });
  for (const s of STATEMENTS) {
    await page.setContent(statementHtml(s));
    const pdf = join(OUT, s.file);
    await page.pdf({ path: pdf, format: 'A4', printBackground: true });
    manifest.statements[s.provider] = {
      ...s,
      ocrText: statementLines(s).join('\n'),
      sha256: sha256(pdf),
    };
  }
  await writeDocuments(page, manifest);

  await browser.close();
  writeFileSync(
    join(OUT, 'specimens.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  console.log(
    `Wrote ${PASSPORTS.length} passports, ${STATEMENTS.length} statements ` +
      `and ${DOCUMENTS.length} bAV documents to ${OUT}`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
