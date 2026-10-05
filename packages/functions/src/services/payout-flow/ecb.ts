/**
 * Daily ECB euro reference rates (mid-market reference for route option 2,
 * brief Part 2 §3). Cached in memory for 6 hours; returns null when the
 * feed is unreachable so the caller can withhold option 2.
 */

import { logger } from '../../utils/logger';
import type { ReferenceRate } from './providers';

const ECB_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const TTL_MS = 6 * 60 * 60 * 1000;

let cache: { at: number; date: string; rates: Record<string, number> } | null =
  null;

/** Parses the ECB daily XML into { date, rates }. Pure. */
export function parseEcbDailyXml(
  xml: string
): { date: string; rates: Record<string, number> } | null {
  const date = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1];
  if (!date) return null;
  const rates: Record<string, number> = {};
  const re = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const n = Number(m[2]);
    if (Number.isFinite(n) && n > 0) rates[m[1]] = n;
  }
  return Object.keys(rates).length ? { date, rates } : null;
}

export async function ecbReferenceRate(
  currency: string
): Promise<ReferenceRate | null> {
  const c = currency.toUpperCase();
  if (c === 'EUR')
    return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  if (!cache || Date.now() - cache.at > TTL_MS) {
    try {
      const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`ECB feed HTTP ${res.status}`);
      const parsed = parseEcbDailyXml(await res.text());
      if (!parsed) throw new Error('ECB feed unparseable');
      cache = { at: Date.now(), ...parsed };
    } catch (error) {
      logger.warn('ECB reference rate unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (!cache) return null;
    }
  }
  const rate = cache.rates[c];
  return rate ? { rate, date: cache.date } : null;
}
