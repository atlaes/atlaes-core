/**
 * Return channel, pure part: read a DRV letter's OCR text and decide where
 * it belongs. No I/O; the service supplies the text and the firm's cases.
 *
 *  - extractLetterFields: VSNR(s), the firm's Aktenzeichen (12345-YY), the
 *    addressee name and the letter date.
 *  - classifyLetter: refund decision / request for documents / rejection /
 *    other, by simple keyword rules. A hint for ATLAES, never a trigger.
 *  - matchLetter: one confident match (VSNR + name of one case, or the AZ
 *    of one case) or a reason for the reconciliation queue. A name alone
 *    never matches.
 */

import type {
  LetterExtraction,
  LetterMatchMethod,
  LetterMatchReason,
  LetterType,
} from '../../drizzle/schema/law-firm-letters';
import {
  compact,
  containsName,
  normalizeText,
} from '../statement-import/match';

// 2-digit area + 6-digit birth date + birth-name initial + 2-digit serial
// + check digit; usually printed "65 170839 J 003" or run together.
const VSNR_PATTERN = /\b(\d{2})\s{0,2}(\d{6})\s{0,2}([A-Z])\s{0,2}(\d{2})\s?(\d)\b/g;
const AZ_PATTERN = /\b(\d{5}-\d{2})\b/g;

const MONTHS: Record<string, number> = {
  januar: 1,
  jaenner: 1,
  februar: 2,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
};

/** Lower case, umlauts spelled out, whitespace collapsed. */
export function foldText(s: string): string {
  return s
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const pad = (n: number) => String(n).padStart(2, '0');

function isoDate(d: number, m: number, y: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// "12.09.2026", "12. September 2026" (folded text)
const DATE_IN_TEXT =
  /(\d{1,2})\.\s?(?:(\d{1,2})\.\s?(\d{4}|\d{2})\b|\s?([a-z]+)\s+(\d{4})\b)/g;

function datesIn(folded: string): Array<{ iso: string; index: number }> {
  const out: Array<{ iso: string; index: number }> = [];
  for (const m of folded.matchAll(DATE_IN_TEXT)) {
    const d = Number(m[1]);
    let iso: string | null = null;
    if (m[2]) iso = isoDate(d, Number(m[2]), Number(m[3]));
    else if (m[4] && MONTHS[m[4]]) iso = isoDate(d, MONTHS[m[4]], Number(m[5]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  return out;
}

/**
 * The letter date: a labelled "Datum", else "<Ort>, den <date>", else the
 * first date near the top that is not a birth date.
 */
export function extractLetterDate(text: string): string | null {
  const folded = foldText(text);
  const all = datesIn(folded);
  if (!all.length) return null;
  const labelled = all.find((d) =>
    /datum\W{0,6}$/.test(folded.slice(Math.max(0, d.index - 12), d.index))
  );
  if (labelled) return labelled.iso;
  const placed = all.find((d) =>
    /[a-z], (den )?$/.test(folded.slice(Math.max(0, d.index - 8), d.index))
  );
  if (placed) return placed.iso;
  const top = all.find(
    (d) =>
      d.index < 2000 &&
      !/geb(oren|\.|urtsdatum)/.test(
        folded.slice(Math.max(0, d.index - 20), d.index)
      )
  );
  return top?.iso ?? null;
}

/** Addressee or labelled insured person ("Herrn\nAnita Sharma"). */
export function extractName(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[*#_|]/g, '').trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const labelled =
      /^(?:versicherte[rn]?|name der versicherten person|name)\s*:\s*(.{3,80})$/i.exec(
        lines[i]
      );
    if (labelled) return labelled[1].trim();
    if (/^(herrn?|frau)$/i.test(lines[i]) && lines[i + 1]) {
      const next = lines[i + 1];
      if (/^[A-Za-zÀ-ÿ' .-]{3,80}$/.test(next)) return next;
    }
    const inline = /^(?:herrn?|frau)\s+([A-Za-zÀ-ÿ' .-]{3,80})$/i.exec(
      lines[i]
    );
    if (inline) return inline[1].trim();
  }
  return null;
}

export function extractLetterFields(text: string): LetterExtraction {
  const vsnr = new Set<string>();
  for (const m of text.toUpperCase().matchAll(VSNR_PATTERN)) {
    vsnr.add(`${m[1]}${m[2]}${m[3]}${m[4]}${m[5]}`);
  }
  const az = new Set<string>();
  for (const m of text.matchAll(AZ_PATTERN)) az.add(m[1]);
  return {
    vsnr: [...vsnr],
    az: [...az],
    name: extractName(text),
    letterDate: extractLetterDate(text),
  };
}

const REJECTION =
  /\babgelehnt\b|\bablehnung\b|\blehnen wir\b.{0,60}\bab\b|nicht (ent)?sprochen werden|kein(en)? anspruch auf (eine )?(beitrags)?erstattung|nicht erstattet werden|erstattung (ist|kommt) nicht (moeglich|in betracht)/;
const REFUND_DECISION =
  /bescheid (ueber|zur|zu ihrem antrag auf) (die )?(beitrags)?erstattung|erstattungsbescheid|beitragserstattung\s*-?\s*bescheid|erstatten wir ihnen|erstattungsbetrag/;
const DOCUMENT_REQUEST =
  /bitte (senden|reichen|schicken|uebersenden|legen) sie|benoetigen wir|fehlende unterlagen|unterlagen fehlen|\brueckfrage\b|\banforderung\b|reichen sie .{0,60}\bein\b|bitten wir (sie )?um (die )?(uebersendung|zusendung|vorlage)/;

export function classifyLetter(text: string): LetterType {
  const t = foldText(text);
  if (REJECTION.test(t)) return 'rejection';
  if (REFUND_DECISION.test(t)) return 'refund_decision';
  if (DOCUMENT_REQUEST.test(t)) return 'document_request';
  return 'other';
}

export interface LetterCandidate {
  claimId: string;
  firstName: string | null;
  lastName: string | null;
  birthName: string | null;
  vsnr: string | null;
  svNummer: string | null;
  lawFirmRef: string | null;
}

export interface LetterMatch {
  claimId: string | null;
  method: LetterMatchMethod | null;
  reason: LetterMatchReason;
  /** Cases ATLAES should look at first (queue only). */
  candidates: string[];
}

const caseVsnr = (c: LetterCandidate) =>
  [c.vsnr, c.svNummer]
    .map((v) => (v ? compact(v) : ''))
    .filter((v) => v.length >= 10);

export function matchLetter(
  text: string,
  fields: LetterExtraction,
  candidates: LetterCandidate[]
): LetterMatch {
  const norm = normalizeText(text);
  const compactText = compact(text);
  const ids = (cs: LetterCandidate[]) => cs.map((c) => c.claimId);
  const nameFits = (c: LetterCandidate) =>
    containsName(norm, c.lastName) || containsName(norm, c.birthName);

  const byAz = candidates.filter(
    (c) => !!c.lawFirmRef && fields.az.includes(c.lawFirmRef.trim())
  );
  const byVsnr = candidates.filter((c) =>
    caseVsnr(c).some((v) => compactText.includes(v))
  );

  if (byAz.length === 1) {
    const az = byAz[0];
    if (byVsnr.length && !byVsnr.some((c) => c.claimId === az.claimId)) {
      return {
        claimId: null,
        method: null,
        reason: 'conflict',
        candidates: ids([az, ...byVsnr]),
      };
    }
    return { claimId: az.claimId, method: 'az', reason: 'az', candidates: [] };
  }
  if (byAz.length > 1) {
    return {
      claimId: null,
      method: null,
      reason: 'ambiguous',
      candidates: ids(byAz),
    };
  }

  const vsnrName = byVsnr.filter(nameFits);
  if (vsnrName.length === 1) {
    return {
      claimId: vsnrName[0].claimId,
      method: 'vsnr_name',
      reason: 'vsnr_name',
      candidates: [],
    };
  }
  if (byVsnr.length > 1) {
    return {
      claimId: null,
      method: null,
      reason: 'ambiguous',
      candidates: ids(vsnrName.length ? vsnrName : byVsnr),
    };
  }
  if (byVsnr.length === 1) {
    return {
      claimId: null,
      method: null,
      reason: 'vsnr_without_name',
      candidates: ids(byVsnr),
    };
  }

  const byName = candidates.filter(
    (c) => nameFits(c) && containsName(norm, c.firstName)
  );
  if (byName.length) {
    return {
      claimId: null,
      method: null,
      reason: byName.length === 1 ? 'name_only' : 'ambiguous',
      candidates: ids(byName),
    };
  }
  return { claimId: null, method: null, reason: 'none', candidates: [] };
}

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  refund_decision: 'Refund decision',
  document_request: 'Request for documents',
  rejection: 'Rejection',
  other: 'Other letter',
};

export const MATCH_REASON_LABELS: Record<LetterMatchReason, string> = {
  vsnr_name: 'VSNR and name',
  az: 'Aktenzeichen',
  vsnr_without_name: 'VSNR found, but the client name is not in the letter',
  name_only: 'Only the client name fits — needs confirmation',
  ambiguous: 'Several cases fit',
  conflict: 'Aktenzeichen and VSNR point at different cases',
  none: 'No VSNR, Aktenzeichen or client name found',
  ocr_failed: 'The file could not be read',
};
