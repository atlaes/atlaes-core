/**
 * /legalnoticedisclaimer copy — verbatim from the Legal Notice Page Content
 * Handoff (27 Aug 2026, modernization draft). Impressum facts are final;
 * the four Vividius-gated items are kept exactly as marked and rendered
 * with a visible "pending legal review" note (never omitted). The privacy
 * notice lives on its own page (/privacy-policy) and is linked once.
 * Schema: WebPage + BreadcrumbList, welded to the Organization stub.
 */
import type { Block, RichText } from '@/content/types';

export const PATH = '/legalnoticedisclaimer';

export const LEGAL_META = {
  title: 'Legal Notice (Impressum) & Disclaimer | Germany Pension Refund',
  description:
    'Legal notice (Impressum) of GermanyPensionRefund.com: ATLAES GmbH, Berlin — registration, VAT ID, contact and responsibility details, plus site disclaimer.',
};

export const LEGAL_H1 = 'Legal Notice (Impressum)';

/** An item flagged `[LEGAL REVIEW n: …]` in the handoff, kept verbatim. */
export interface LegalReviewItem {
  n: number;
  text: string;
}

export const LEGAL_REVIEW_LABEL = 'Pending legal review (Vividius)';

export const LEGAL_PROVIDER = {
  h2: 'Provider identification (§ 5 DDG)',
  lead: 'This website, GermanyPensionRefund.com, is operated by:',
  address: ['ATLAES GmbH', 'Kaskelstraße 46', '10317 Berlin', 'Germany'],
  contact: [
    { label: 'Phone: ', value: '+49 30 49957826', href: 'tel:+493049957826' },
    {
      label: 'Email: ',
      value: 'refund@germanypensionrefund.com',
      href: 'mailto:refund@germanypensionrefund.com',
    },
  ],
  facts: [
    'Register court: Amtsgericht Berlin (Charlottenburg) · Register number: HRB 242004',
    'Managing directors: Johannes Kühn and Anna Kliem',
    'VAT identification number (§ 27a UStG): DE352845957',
    'Business identification number: DE352845957-00001',
  ],
  blocks: [
    {
      t: 'p',
      x: 'Germany Pension Refund is the service brand of ATLAES GmbH — running since 2015, operated by the GmbH since its incorporation in 2022. More about the company and the people behind it: About us.',
      sp: [{ k: 'a', x: 'About us', href: '/about-us' }],
    },
    {
      t: 'p',
      x: 'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
      sp: [
        {
          k: 'b',
          x: 'Germany Pension Refund is a private service. We are not part of or affiliated with Deutsche Rentenversicherung or any German government authority. You may apply directly to Deutsche Rentenversicherung without using our service; the pension office charges no application fee.',
        },
      ],
    },
  ] as Block[],
  review: [
    {
      n: 1,
      text: 'responsible for editorial content under § 18 Abs. 2 MStV — add "Verantwortlich für den Inhalt: Johannes Kühn, address as above" if Vividius considers the site\'s editorial content in scope.',
    },
    {
      n: 2,
      text: 'consumer dispute resolution — § 36 VSBG requires a statement on whether ATLAES GmbH participates in dispute resolution before a consumer arbitration board; add the standard participation/non-participation sentence Vividius prefers, and check whether an EU ODR-platform reference is still required in its current form.',
    },
  ] as LegalReviewItem[],
  privacy: {
    x: 'Privacy policy: Privacy Policy',
    sp: [{ k: 'a', x: 'Privacy Policy', href: '/privacy-policy' }],
  } as RichText,
};

export interface LegalDisclaimerPart {
  id: string;
  h3: string;
  blocks: Block[];
  review?: LegalReviewItem;
}

export const LEGAL_DISCLAIMER = {
  h2: 'Disclaimer',
  /** Page-level note (UI, not copy) explaining the draft status. */
  draftNote:
    'The wording of this Disclaimer section is a modernization draft pending sign-off by Vividius. The provider identification above is final.',
  parts: [
    {
      id: 'content-of-this-website',
      h3: 'Content of this website',
      blocks: [
        {
          t: 'p',
          x: 'The content of this website is prepared with care and updated regularly; figures and dates are published with their source and calculation date where they change over time. Nevertheless, we cannot guarantee that every page is complete, correct and current at every moment. The information here is general information about German pension contribution refunds — it is not legal or tax advice, and it does not replace advice on your individual case.',
        },
      ],
      review: {
        n: 3,
        text: 'liability limitation — replace the previous "liability claims against the author are generally excluded" boilerplate with the limitation formula Vividius prefers; the old text\'s blanket exclusion is broader than German law allows and reads as dated.',
      },
    },
    {
      id: 'calculators-and-tools',
      h3: 'Calculators and tools',
      blocks: [
        {
          t: 'p',
          x: 'The calculators and tools on this website provide preliminary, simplified indications based on the information you enter. They are provided for your information and should not be taken as a substitute for professional advice; your actual eligibility and refund are determined by the responsible pension office on the basis of your official insurance record.',
        },
      ],
    },
    {
      id: 'external-links',
      h3: 'External links',
      blocks: [
        {
          t: 'p',
          x: 'This website links to external websites, including official pages of Deutsche Rentenversicherung. We review external links when we set them; we have no influence on the current and future content of external sites, and their operators remain responsible for them. If we become aware that a linked page contains unlawful content, we will remove the link.',
        },
      ],
      review: {
        n: 4,
        text: 'confirm this replaces the 1998-style "we distance ourselves from all contents of all linked pages" formula — that clause has no protective effect and signals template text.',
      },
    },
    {
      id: 'copyright',
      h3: 'Copyright',
      blocks: [
        {
          t: 'p',
          x: 'The content and works created by the site operator are subject to German copyright law. Reproduction, editing, distribution and any kind of use outside the limits of copyright require the written consent of ATLAES GmbH. Downloads and copies of this site for private, non-commercial use are permitted. Official forms linked on this site are documents of Deutsche Rentenversicherung and are obtained from their official source.',
        },
      ],
    },
  ] as LegalDisclaimerPart[],
};

/** Appendix B WebPage description — carries the imprint facts verbatim. */
export const LEGAL_SCHEMA_DESCRIPTION =
  'Legal notice (Impressum) of GermanyPensionRefund.com: operated by ATLAES GmbH, Kaskelstraße 46, 10317 Berlin — register HRB 242004 (Berlin Charlottenburg), VAT ID DE352845957, managing directors Johannes Kühn and Anna Kliem.';

export const LEGAL_BREADCRUMB_NAME = 'Legal Notice & Disclaimer';
