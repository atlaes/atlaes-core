/**
 * Internal link registry with "ship dark" flags.
 *
 * `live: true` only when the route exists in this repo (a page under
 * `apps/gpr/app/`, a redirect in `next.config.js`, or a funnel route).
 * Pages that other streams build (/how-it-works, /a1310-payment-declaration,
 * /download, /post/…) are `live: false` here and are flipped by the stream
 * that adds the route — a rendered dead link fails review, so `SmartLink`
 * renders plain text until then.
 *
 * Country pages are not listed here; `isLiveHref()` consults the country
 * registry for them.
 */
import { COUNTRIES, countryIsLive } from './countries';

export interface LinkTarget {
  path: string;
  label: string;
  live: boolean;
  /** Why the flag is what it is. */
  note?: string;
}

export const SITE_URL = 'https://www.germanypensionrefund.com';
export const DE_SITE_URL = 'https://de.germanypensionrefund.com';

/** Entry of the intake flow. `/get-your-refund` 301s here (next.config.js). */
export const FUNNEL_ENTRY = '/check/3-step';

export const LINKS: Record<string, LinkTarget> = {
  // --- flow entries -----------------------------------------------------
  '/get-your-refund': {
    path: '/get-your-refund',
    label: 'Claim Refund',
    live: true,
    note: '301 → FUNNEL_ENTRY in next.config.js, query preserved',
  },
  '/refund-calculator': {
    path: '/refund-calculator',
    label: 'Refund Calculator',
    live: true,
    note: 'redirects to the existing /calculator until the marketing calculator page is built (next.config.js)',
  },
  '/check/3-step': {
    path: '/check/3-step',
    label: 'Check my eligibility',
    live: true,
    note: 'existing funnel route',
  },
  '/calculator': {
    path: '/calculator',
    label: 'Refund Calculator',
    live: true,
    note: 'existing funnel route',
  },
  '/auth': {
    path: '/auth',
    label: 'Log in',
    live: true,
    note: 'existing funnel route',
  },
  // --- marketing pages (Stream D) ----------------------------------------
  '/': {
    path: '/',
    label: 'Home',
    live: true,
    note: 'marketing homepage: app/(marketing)/page.tsx',
  },
  '/how-it-works': {
    path: '/how-it-works',
    label: 'How It Works',
    live: true,
    note: 'app/(marketing)/how-it-works/page.tsx',
  },
  '/pricing': {
    path: '/pricing',
    label: 'Pricing',
    live: false,
    note: 'no route in repo yet',
  },
  '/testimonials': {
    path: '/testimonials',
    label: 'Testimonials',
    live: false,
    note: 'no route in repo yet',
  },
  '/faqs': {
    path: '/faqs',
    label: 'FAQ',
    live: false,
    note: 'no route in repo yet',
  },
  '/about-us': {
    path: '/about-us',
    label: 'About Us',
    live: false,
    note: 'no route in repo yet',
  },
  '/blog': {
    path: '/blog',
    label: 'News',
    live: false,
    note: 'no route in repo yet',
  },
  '/contact-us': {
    path: '/contact-us',
    label: 'Contact Us',
    live: false,
    note: 'no route in repo yet',
  },
  '/legalnoticedisclaimer': {
    path: '/legalnoticedisclaimer',
    label: 'Legal Notice',
    live: false,
    note: 'no route in repo yet',
  },
  '/data-request': {
    path: '/data-request',
    label: 'Data Access & Deletion Request (GDPR)',
    live: false,
    note: 'no route in repo yet',
  },
  '/privacy-policy': {
    path: '/privacy-policy',
    label: 'Privacy Policy',
    live: false,
    note: 'build rule 9: privacy links → /legalnoticedisclaimer until this exists',
  },
  // --- guides, downloads, articles (Stream C) ----------------------------
  '/post/how-to-get-a-german-pension-refund': {
    path: '/post/how-to-get-a-german-pension-refund',
    label: 'Refund Guide',
    live: false,
    note: 'Stream C — flip when the post route exists',
  },
  '/post/which-german-pension-office-handles-your-claim': {
    path: '/post/which-german-pension-office-handles-your-claim',
    label: 'Which German pension office handles your claim',
    live: false,
    note: 'Stream C',
  },
  '/post/german-social-security-number': {
    path: '/post/german-social-security-number',
    label: 'German social security number',
    live: false,
    note: 'Stream C',
  },
  '/post/german-pension-refund-waiting-period': {
    path: '/post/german-pension-refund-waiting-period',
    label: 'Waiting period',
    live: false,
    note: 'Stream C',
  },
  '/post/brexit': {
    path: '/post/brexit',
    label: 'Brexit',
    live: false,
    note: 'Stream C',
  },
  '/post/german-widow-pension': {
    path: '/post/german-widow-pension',
    label: 'German widow pension',
    live: false,
    note: 'linked from country pages; no route in repo',
  },
  '/german-pension-refund-processing-time': {
    path: '/german-pension-refund-processing-time',
    label: 'Processing Times & Data',
    live: false,
    note: 'Stream C',
  },
  '/download': {
    path: '/download',
    label: 'Downloads — official DRV forms',
    live: false,
    note: 'Stream C',
  },
  '/v0901-pension-refund-form-english': {
    path: '/v0901-pension-refund-form-english',
    label: 'V0901 form guide (English)',
    live: false,
    note: 'Stream C',
  },
  '/v0900-formular': {
    path: '/v0900-formular',
    label: 'V0900-Formular erklärt (Deutsch)',
    live: false,
    note: 'Stream C',
  },
  '/v0100-form': {
    path: '/v0100-form',
    label: 'V0100 account-clarification guide',
    live: false,
    note: 'Stream C (build sheet lists /v0100-account-clarification; live slug wins)',
  },
  '/v0800-child-raising-periods': {
    path: '/v0800-child-raising-periods',
    label: 'V0800 child-raising-periods guide',
    live: false,
    note: 'Stream C',
  },
  '/a1310-payment-declaration': {
    path: '/a1310-payment-declaration',
    label: 'A1310 payment-declaration guide',
    live: false,
    note: 'Stream C — ship dark until the route exists',
  },
  '/rentenbeitragserstattung': {
    path: '/rentenbeitragserstattung',
    label: 'Rentenbeitragserstattung — German hub',
    live: false,
    note: 'DE hub is live on Wix; no route in repo yet',
  },
  '/phoebe': {
    path: '/phoebe',
    label: 'Phoebe',
    live: false,
    note: 'EN_ONLY partner landing; no route yet',
  },
  '/refundsib': {
    path: '/refundsib',
    label: 'Settle in Berlin',
    live: false,
    note: 'EN_ONLY partner landing; no route yet',
  },
};

export const EXTERNAL = {
  provenExpert: 'https://www.provenexpert.com/germany-pension-refund/',
  provenExpertEn: 'https://www.provenexpert.com/en-us/germany-pension-refund/',
  linkedin: 'https://www.linkedin.com/company/germany-pension-refund',
  instagram: 'https://www.instagram.com/germanypensionrefund/',
  facebook: 'https://www.facebook.com/germanypensionrefund/',
  youtube: 'https://www.youtube.com/channel/UCgDGTV6NorRnQNRCkQDFWXw',
  x: 'https://x.com/PensionRefund',
  trustpilot: 'https://www.trustpilot.com/review/germanypensionrefund.com',
  googleShare: 'https://share.google/cEkYFGVAozOvSsJ5s',
  googleKg:
    'https://www.google.com/search?kgmid=/g/11fsv_bl2n&q=Germany+Pension+Refund',
  atlaes: 'https://atlaes.de/',
} as const;

/** Strip the site origin so registry look-ups work on absolute copy links. */
export function toSitePath(href: string): string {
  if (href.indexOf(SITE_URL) === 0) return href.slice(SITE_URL.length) || '/';
  return href;
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) && href.indexOf(SITE_URL) !== 0;
}

/**
 * Whether an internal href may render as a link. Hash-only and mailto/tel
 * links are always live; unknown internal paths are dark by default.
 */
export function isLiveHref(href: string): boolean {
  if (isExternalHref(href)) return true;
  if (/^(#|mailto:|tel:)/.test(href)) return true;
  const path = toSitePath(href).split('#')[0].split('?')[0];
  const entry = LINKS[path];
  if (entry) return entry.live;
  const slug = path.replace(/^\//, '');
  const country = COUNTRIES.find((c) => c.slug === slug);
  if (country) return countryIsLive(country);
  return false;
}

export function linkLabel(path: string): string {
  const entry = LINKS[path];
  return entry ? entry.label : path;
}
