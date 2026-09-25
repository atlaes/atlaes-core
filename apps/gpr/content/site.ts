/**
 * Site-wide constants and the header/footer configuration, built from the
 * Homepage Build Sheet (8 Sep 2026): global header, footer link groups,
 * organisation data. Copy here is verbatim from the sheet.
 */
import { EXTERNAL, SITE_URL } from './registries/links';

export const ORG = {
  name: 'Germany Pension Refund',
  legalName: 'ATLAES GmbH',
  vatId: 'DE352845957',
  url: SITE_URL + '/',
  email: 'refund@germanypensionrefund.com',
  phone: '+49 30 49957826',
  phoneE164: '+49-30-49957826',
  address: {
    street: 'Kaskelstr. 46',
    postalCode: '10317',
    city: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
  },
  /** Company founding year (never swap with the service start). */
  foundingDate: '2022',
  /** Service start; WebSite datePublished. */
  serviceSince: '2015',
  description:
    'Germany Pension Refund manages German statutory pension contribution refunds for people who have left Germany — success-based, supporting clients worldwide in English since 2015. The service is operated by ATLAES GmbH, Berlin, and is private: we are not part of or affiliated with Deutsche Rentenversicherung or any German government authority.',
  /** Swap to the platform-hosted logo file at launch (build sheet). */
  logoUrl:
    'https://static.wixstatic.com/media/da88a8_eeadb28f689f4702b5a53c1ff8bab97d~mv2.png',
  sameAs: [
    EXTERNAL.linkedin,
    EXTERNAL.instagram,
    EXTERNAL.facebook,
    EXTERNAL.youtube,
    EXTERNAL.x,
    EXTERNAL.provenExpert,
    EXTERNAL.trustpilot,
    EXTERNAL.googleShare,
    EXTERNAL.googleKg,
    EXTERNAL.atlaes,
  ],
} as const;

export const REVIEWER = {
  id: SITE_URL + '/#johannes-kuehn',
  name: 'Johannes Kühn',
  jobTitle: 'Founder, Germany Pension Refund',
  url: SITE_URL + '/about-us',
} as const;

/** ID-02 — visible disclaimer, verbatim. */
export const DISCLAIMER_ID02 =
  'Germany Pension Refund is a private service operated by ATLAES GmbH. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may also apply directly to Deutsche Rentenversicherung without using our service.';

export const TOOLS_NOTE =
  'The information on GermanyPensionRefund.com is for general information only. The calculators and tools on this website are provided for your information and to illustrate scenarios. The results should not be taken as a substitute for professional advice.';

export interface NavItem {
  label: string;
  href: string;
  /** Marks the "Rules by Country" dropdown. */
  dropdown?: 'countries';
}

/** Main navigation, build-sheet order and labels. */
export const HEADER_NAV: NavItem[] = [
  { label: 'Claim Refund', href: '/get-your-refund' },
  { label: 'Refund Guide', href: '/post/how-to-get-a-german-pension-refund' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Refund Calculator', href: '/refund-calculator' },
  {
    label: 'Rules by Country',
    href: '/other-countries',
    dropdown: 'countries',
  },
  { label: 'FAQ', href: '/faqs' },
  { label: 'About Us', href: '/about-us' },
  { label: 'News', href: '/blog' },
];

export interface FooterLink {
  label: string;
  href: string;
}

export const FOOTER_SERVICE: FooterLink[] = [
  { label: 'Claim Refund', href: '/get-your-refund' },
  { label: 'Eligibility', href: '/post/how-to-get-a-german-pension-refund' },
  { label: 'Refund Calculator', href: '/refund-calculator' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Testimonials', href: '/testimonials' },
  {
    label: 'Processing Times & Data',
    href: '/german-pension-refund-processing-time',
  },
  { label: 'About Us', href: '/about-us' },
  { label: 'FAQ', href: '/faqs' },
  { label: 'News', href: '/blog' },
  { label: 'Contact Us', href: '/contact-us' },
];

export const FOOTER_FORMS: FooterLink[] = [
  { label: 'Downloads — official DRV forms', href: '/download' },
  {
    label: 'V0901 form guide (English)',
    href: '/v0901-pension-refund-form-english',
  },
  { label: 'V0900-Formular erklärt (Deutsch)', href: '/v0900-formular' },
  {
    label: 'Rentenbeitragserstattung — German hub',
    href: '/rentenbeitragserstattung',
  },
  {
    label: 'A1310 payment-declaration guide',
    href: '/a1310-payment-declaration',
  },
  { label: 'V0100 account-clarification guide', href: '/v0100-form' },
  {
    label: 'V0800 child-raising-periods guide',
    href: '/v0800-child-raising-periods',
  },
];

export const FOOTER_LEGAL: FooterLink[] = [
  { label: 'Legal Notice', href: '/legalnoticedisclaimer' },
  // Build rule 9: privacy links point at /legalnoticedisclaimer until the
  // dedicated privacy page exists.
  { label: 'Privacy Policy', href: '/legalnoticedisclaimer' },
  { label: 'Data Access & Deletion Request (GDPR)', href: '/data-request' },
];

export const FOOTER_SOCIAL: FooterLink[] = [
  { label: 'LinkedIn', href: EXTERNAL.linkedin },
  { label: 'Facebook', href: EXTERNAL.facebook },
  { label: 'X', href: EXTERNAL.x },
  { label: 'YouTube', href: EXTERNAL.youtube },
  { label: 'Instagram', href: EXTERNAL.instagram },
  { label: 'Email', href: 'mailto:' + ORG.email },
];

export const FOOTER_COUNTRY_FOOTNOTE =
  '† These four entries all link to one combined page — /former-yugoslavia. North Macedonia keeps its own page.';

export const COPYRIGHT = '© 2026 Germany Pension Refund';
