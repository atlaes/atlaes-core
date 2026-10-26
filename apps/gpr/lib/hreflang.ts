/**
 * Language alternates for Next.js `metadata.alternates`.
 *
 * The EN site is `www.`, the German view is `de.` (same path). Only pages
 * with a German view (the DE hub, /download, /faqs …) emit hreflang pairs;
 * `x-default` is always the EN URL. EN-only pages get a canonical only.
 */
import type { Metadata } from 'next';
import { DE_SITE_URL, SITE_URL } from '@/content/registries/links';

/** Paths that exist only in English; `de.` requests bounce to `www` (middleware). */
export const EN_ONLY_PATHS: string[] = ['/phoebe', '/refundsib'];

export interface AlternatesInput {
  path: string;
  /** Path of the German view when it differs from `path`. */
  dePath?: string;
  /** Set when a German view exists. */
  hasDe?: boolean;
}

export function pageAlternates(
  input: AlternatesInput
): NonNullable<Metadata['alternates']> {
  const en = SITE_URL + input.path;
  if (!input.hasDe) return { canonical: en };
  const de = DE_SITE_URL + (input.dePath || input.path);
  return {
    canonical: en,
    languages: { en, de, 'x-default': en },
  };
}
