'use client';

/**
 * First-touch attribution (Homepage Build Sheet, build rule 8 / flow
 * behaviour 6): `utm_*`, `gclid`, `fbclid`, `via`, the page referrer and
 * the landing page are captured on the first visit and kept for 90 days in
 * a cookie and in localStorage. `getAttribution()` returns the record so
 * lead and claim creation can send it (camelCase keys = the lead endpoint's
 * `leadPayloadSchema`). `<AttributionCapture />` is the client component
 * marketing pages mount to run the capture.
 */
import { useEffect } from 'react';
import Cookies from 'js-cookie';

export const ATTRIBUTION_KEY = 'gpr_attribution';
export const ATTRIBUTION_DAYS = 90;

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  via?: string;
  /** `document.referrer` of the first visit (external referrers only). */
  referrer?: string;
  /** Path + query of the first page seen. */
  landingPage?: string;
  /** ISO timestamp of the capture. */
  capturedAt: string;
}

/** Query-string key → attribution field. */
const PARAM_FIELDS: Array<[string, keyof Attribution]> = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_term', 'utmTerm'],
  ['utm_content', 'utmContent'],
  ['gclid', 'gclid'],
  ['fbclid', 'fbclid'],
  ['via', 'via'],
];

/** The query keys that travel with in-site hand-offs (hero card → funnel). */
export const ATTRIBUTION_QUERY_KEYS: string[] = PARAM_FIELDS.map((p) => p[0]);

const MAX_PARAM = 255;
const MAX_URL = 500;

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** Pure: read the attribution params out of a query string. */
export function parseAttributionParams(search: string): Partial<Attribution> {
  const params = new URLSearchParams(
    search.charAt(0) === '?' ? search.slice(1) : search
  );
  const out: Partial<Attribution> = {};
  PARAM_FIELDS.forEach(([key, field]) => {
    const v = params.get(key);
    if (v) out[field] = clip(v.trim(), MAX_PARAM);
  });
  return out;
}

/** Pure: the attribution params as query pairs (`utm_source=…`). */
export function attributionToQuery(
  a: Partial<Attribution> | null | undefined
): URLSearchParams {
  const params = new URLSearchParams();
  if (!a) return params;
  PARAM_FIELDS.forEach(([key, field]) => {
    const v = a[field];
    if (v) params.set(key, v);
  });
  return params;
}

/** True when the referrer is another site (not this origin). */
function isExternalReferrer(referrer: string, origin: string): boolean {
  if (!referrer) return false;
  return referrer.indexOf(origin) !== 0;
}

function parseStored(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Attribution;
    return parsed && typeof parsed === 'object' && parsed.capturedAt
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function readLocalStorage(): Attribution | null {
  try {
    return parseStored(window.localStorage.getItem(ATTRIBUTION_KEY));
  } catch {
    return null;
  }
}

function readCookie(): Attribution | null {
  try {
    return parseStored(Cookies.get(ATTRIBUTION_KEY));
  } catch {
    return null;
  }
}

function persist(a: Attribution): void {
  const raw = JSON.stringify(a);
  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, raw);
  } catch {
    /* storage blocked — the cookie still carries it */
  }
  try {
    Cookies.set(ATTRIBUTION_KEY, raw, {
      expires: ATTRIBUTION_DAYS,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:',
      path: '/',
    });
  } catch {
    /* cookies blocked — localStorage still carries it */
  }
}

/** The stored first-touch record, or null before any capture. */
export function getAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  return readLocalStorage() || readCookie();
}

/**
 * Capture on first visit. An existing record wins (first touch); when only
 * one store still has it, the other is refilled so both expire together.
 */
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  const existing = readLocalStorage() || readCookie();
  if (existing) {
    persist(existing);
    return existing;
  }
  const loc = window.location;
  const referrer = typeof document !== 'undefined' ? document.referrer : '';
  const record: Attribution = {
    ...parseAttributionParams(loc.search),
    landingPage: clip(loc.pathname + loc.search, MAX_URL),
    capturedAt: new Date().toISOString(),
  };
  if (isExternalReferrer(referrer, loc.origin)) {
    record.referrer = clip(referrer, MAX_URL);
  }
  persist(record);
  return record;
}

/**
 * Attribution params for an in-site hand-off: the current URL's params win,
 * the stored first-touch record fills the gaps.
 */
export function handoffAttributionQuery(search: string): URLSearchParams {
  const current = parseAttributionParams(search);
  const stored = getAttribution();
  const merged: Partial<Attribution> = { ...(stored || {}), ...current };
  return attributionToQuery(merged);
}

/** Mount once per marketing page; renders nothing. */
export function AttributionCapture(): null {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
