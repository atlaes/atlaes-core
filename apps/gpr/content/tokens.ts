/**
 * Quarterly value store (Q-marker tokens).
 *
 * Data lives in `tokens.json` so that `scripts/check-q-markers.mjs` can read
 * it without a TypeScript toolchain. This module adds typed accessors:
 *
 *   t('M-04.mean')            → '€11,571.66'
 *   t('M-04.sentence')        → the approved default sentence, slots filled
 *   t('M-04.sentence.hero')   → a named sentence variant
 *   resolveTokens(text)       → replaces every {{…}} reference in a string
 *
 * Every accessor throws on an unknown token, value or sentence so an
 * unresolved token never renders as an empty string.
 */
import data from './tokens.json';

export interface QuarterlyToken {
  label: string;
  dataset: string;
  /** ISO date the value was calculated / checked. */
  asOf: string;
  values: Record<string, string>;
  qualifier: string;
  sentences: { default: string } & Record<string, string>;
}

export type TokenId = keyof typeof data.tokens;

export const NEXT_REFRESH: string = data.nextRefresh;

export const tokens = data.tokens as Record<TokenId, QuarterlyToken>;

export const tokenIds = Object.keys(tokens) as TokenId[];

/** `{{M-04.sentence}}` / `{{M-04.sentence.hero}}` / `{{M-04.mean}}` */
export const TOKEN_REF =
  /\{\{\s*([A-Z]+-\d+)\.([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?\s*\}\}/g;

/** `{M-17.range}` slots inside sentence templates. */
const SLOT = /\{([A-Z]+-\d+)\.([A-Za-z0-9_]+)\}/g;

export class TokenError extends Error {}

/** Built at runtime so the literal never appears in source. */
const Q_MARKER = '[' + 'Q]';

function tokenOrThrow(id: string): QuarterlyToken {
  const tok = (tokens as Record<string, QuarterlyToken | undefined>)[id];
  if (!tok) throw new TokenError(`Unknown quarterly token "${id}"`);
  return tok;
}

function valueOrThrow(id: string, key: string): string {
  const tok = tokenOrThrow(id);
  const v = tok.values[key];
  if (v === undefined || v === '') {
    throw new TokenError(`Token "${id}" has no value "${key}"`);
  }
  return v;
}

function fillSlots(template: string, depth = 0): string {
  if (depth > 5) throw new TokenError('Token slot recursion too deep');
  return template.replace(SLOT, (_m, id: string, key: string) =>
    fillSlots(valueOrThrow(id, key), depth + 1)
  );
}

function sentenceOrThrow(id: string, name = 'default'): string {
  const tok = tokenOrThrow(id);
  const s = tok.sentences[name];
  if (!s) throw new TokenError(`Token "${id}" has no sentence "${name}"`);
  return fillSlots(s);
}

/**
 * Accessor in `'M-04.mean'` / `'M-04.sentence'` / `'M-04.sentence.hero'`
 * form. Returns the value with its slots filled.
 */
export function t(path: string): string {
  const parts = path.split('.');
  const id = parts[0];
  const key = parts[1];
  if (!id || !key) throw new TokenError(`Bad token path "${path}"`);
  if (key === 'sentence') return sentenceOrThrow(id, parts[2] || 'default');
  return valueOrThrow(id, key);
}

/** Metadata for the "as of / next refresh" lines and for datasets. */
export function tokenMeta(id: TokenId): {
  id: TokenId;
  label: string;
  dataset: string;
  asOf: string;
  nextRefresh: string;
} {
  const tok = tokenOrThrow(id);
  return {
    id,
    label: tok.label,
    dataset: tok.dataset,
    asOf: tok.asOf,
    nextRefresh: NEXT_REFRESH,
  };
}

/**
 * Replace every `{{ID.key}}` / `{{ID.sentence[.name]}}` reference in a
 * string. Throws on an unknown reference or on a literal Q marker so it
 * can never reach the page.
 */
export function resolveTokens(text: string): string {
  if (text.indexOf(Q_MARKER) !== -1) {
    throw new TokenError(
      `Literal ${Q_MARKER} marker in content: "${text.slice(0, 80)}"`
    );
  }
  return text.replace(
    TOKEN_REF,
    (_m, id: string, key: string, name: string | undefined) =>
      key === 'sentence'
        ? sentenceOrThrow(id, name || 'default')
        : valueOrThrow(id, key)
  );
}

/** True when the string still contains a `{{…}}` reference. */
export function hasTokenRefs(text: string): boolean {
  TOKEN_REF.lastIndex = 0;
  return TOKEN_REF.test(text);
}
