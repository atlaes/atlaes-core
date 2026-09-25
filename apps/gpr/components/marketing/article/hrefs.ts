/**
 * Href resolution for the generated guide/article data. The build script
 * writes registry references instead of URLs so the forms registry stays the
 * single source of truth for the official DRV links:
 *
 *   drv:<form>[:<lang>]  → formEditionUrl() of that edition (or the DRV form
 *                          search when the edition is not in the registry)
 *   eantrag:             → the DRV online application
 */
import {
  DRV_EANTRAG,
  DRV_FORM_SEARCH,
  findForm,
  formEditionUrl,
} from '@/content/registries/forms';

export function resolveHref(href: string): string {
  if (href === 'eantrag:') return DRV_EANTRAG;
  if (href.indexOf('drv:') === 0) {
    const parts = href.slice(4).split(':');
    const form = findForm(parts[0]);
    if (!form) return DRV_FORM_SEARCH;
    const edition = parts[1]
      ? form.editions.find((e) => e.lang === parts[1])
      : form.editions[0];
    return edition ? formEditionUrl(edition) : DRV_FORM_SEARCH;
  }
  return href;
}
